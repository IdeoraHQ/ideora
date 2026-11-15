import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface PresencePayload {
  user_id: string | null;
  online_at: string;
}

interface PresenceContextValue {
  onlineCount: number;
  onlineUserIds: Set<string>;
  isUserOnline: (userId?: string | null) => boolean;
  isConnected: boolean;
}

const PresenceContext = createContext<PresenceContextValue>({
  onlineCount: 0,
  onlineUserIds: new Set<string>(),
  isUserOnline: () => false,
  isConnected: false,
});

function getGuestSessionKey(): string {
  const storageKey = 'ideora_presence_session_id';
  try {
    const existing = window.sessionStorage.getItem(storageKey);
    if (existing) return existing;
    const generated =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? `anon:${crypto.randomUUID()}`
        : `anon:${Math.random().toString(36).slice(2)}-${Date.now()}`;
    window.sessionStorage.setItem(storageKey, generated);
    return generated;
  } catch {
    return `anon:${Math.random().toString(36).slice(2)}-${Date.now()}`;
  }
}

export const PresenceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { profile } = useAuth();
  const [onlineCount, setOnlineCount] = useState<number>(0);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(
    () => new Set<string>()
  );
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const guestKeyRef = useRef<string | null>(null);

  if (!guestKeyRef.current && typeof window !== 'undefined') {
    guestKeyRef.current = getGuestSessionKey();
  }

  const presenceKey = profile?.id
    ? `user:${profile.id}`
    : guestKeyRef.current || 'anon:default';

  useEffect(() => {
    const channel = supabase.channel('ideora:online', {
      config: {
        presence: {
          key: presenceKey,
        },
      },
    });

    const syncPresence = () => {
      const state = channel.presenceState<PresencePayload>();
      const keys = Object.keys(state);
      const userIds = new Set<string>();

      for (const key of keys) {
        const entries = state[key] || [];
        for (const entry of entries) {
          if (entry && typeof entry.user_id === 'string' && entry.user_id) {
            userIds.add(entry.user_id);
          }
        }
      }

      setOnlineCount(keys.length);
      setOnlineUserIds(userIds);
    };

    channel
      .on('presence', { event: 'sync' }, syncPresence)
      .on('presence', { event: 'join' }, syncPresence)
      .on('presence', { event: 'leave' }, syncPresence)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          await channel.track({
            user_id: profile?.id ?? null,
            online_at: new Date().toISOString(),
          });
        } else if (
          status === 'CLOSED' ||
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT'
        ) {
          setIsConnected(false);
        }
      });

    return () => {
      setIsConnected(false);
      void supabase.removeChannel(channel);
    };
  }, [presenceKey, profile?.id]);

  const isUserOnline = useCallback(
    (userId?: string | null) => Boolean(userId && onlineUserIds.has(userId)),
    [onlineUserIds]
  );

  const value = useMemo(
    () => ({
      onlineCount,
      onlineUserIds,
      isUserOnline,
      isConnected,
    }),
    [onlineCount, onlineUserIds, isUserOnline, isConnected]
  );

  return (
    <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>
  );
};

export function usePresence(): PresenceContextValue {
  return useContext(PresenceContext);
}

