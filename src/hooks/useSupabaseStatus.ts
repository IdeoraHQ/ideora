import { useState, useEffect } from 'react';
import { isSupabaseConfigured } from '@/services/supabase/client';

export interface SupabaseStatus {
  isConfigured: boolean;
  checked: boolean;
}

export function useSupabaseStatus(): SupabaseStatus {
  const [status, setStatus] = useState<SupabaseStatus>({
    isConfigured: false,
    checked: false,
  });

  useEffect(() => {
    setStatus({
      isConfigured: isSupabaseConfigured,
      checked: true,
    });
  }, []);

  return status;
}
