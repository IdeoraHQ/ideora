export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'founder' | 'collaborator' | 'admin';
export type IdeaStatus = 'draft' | 'seeking_collaborators' | 'in_progress' | 'launched' | 'archived';
export type CollaborationType = 'co_founder' | 'contributor' | 'advisor' | 'open_source';
export type RequestStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn';
export type NotificationType =
  | 'collaboration_request'
  | 'request_accepted'
  | 'request_declined'
  | 'new_comment'
  | 'idea_upvoted'
  | 'new_message';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          full_name: string;
          avatar_url: string | null;
          bio: string | null;
          skills: string[];
          github_url: string | null;
          linkedin_url: string | null;
          website_url: string | null;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          full_name: string;
          avatar_url?: string | null;
          bio?: string | null;
          skills?: string[];
          github_url?: string | null;
          linkedin_url?: string | null;
          website_url?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          full_name?: string;
          avatar_url?: string | null;
          bio?: string | null;
          skills?: string[];
          github_url?: string | null;
          linkedin_url?: string | null;
          website_url?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ideas: {
        Row: {
          id: string;
          creator_id: string;
          title: string;
          slug: string;
          summary: string;
          description: string;
          category: string;
          status: IdeaStatus;
          collaboration_type: CollaborationType;
          tags: string[];
          upvotes_count: number;
          collaborators_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          creator_id: string;
          title: string;
          slug: string;
          summary: string;
          description: string;
          category: string;
          status?: IdeaStatus;
          collaboration_type?: CollaborationType;
          tags?: string[];
          upvotes_count?: number;
          collaborators_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          creator_id?: string;
          title?: string;
          slug?: string;
          summary?: string;
          description?: string;
          category?: string;
          status?: IdeaStatus;
          collaboration_type?: CollaborationType;
          tags?: string[];
          upvotes_count?: number;
          collaborators_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      idea_roles_needed: {
        Row: {
          id: string;
          idea_id: string;
          role_title: string;
          category: string;
          spots_available: number;
          spots_filled: number;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          idea_id: string;
          role_title: string;
          category: string;
          spots_available?: number;
          spots_filled?: number;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          idea_id?: string;
          role_title?: string;
          category?: string;
          spots_available?: number;
          spots_filled?: number;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      collaboration_requests: {
        Row: {
          id: string;
          idea_id: string;
          role_id: string | null;
          requester_id: string;
          message: string;
          status: RequestStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          idea_id: string;
          role_id?: string | null;
          requester_id: string;
          message: string;
          status?: RequestStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          idea_id?: string;
          role_id?: string | null;
          requester_id?: string;
          message?: string;
          status?: RequestStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      idea_upvotes: {
        Row: {
          idea_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          idea_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          idea_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      idea_comments: {
        Row: {
          id: string;
          idea_id: string;
          author_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          idea_id: string;
          author_id: string;
          content: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          idea_id?: string;
          author_id?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          actor_id: string | null;
          idea_id: string | null;
          type: NotificationType;
          title: string;
          content: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          actor_id?: string | null;
          idea_id?: string | null;
          type: NotificationType;
          title: string;
          content: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          recipient_id?: string;
          actor_id?: string | null;
          idea_id?: string | null;
          type?: NotificationType;
          title?: string;
          content?: string;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          collaboration_request_id: string;
          idea_id: string;
          creator_id: string;
          requester_id: string;
          created_at: string;
          updated_at: string;
          last_message_at: string;
        };
        Insert: {
          id?: string;
          collaboration_request_id: string;
          idea_id: string;
          creator_id: string;
          requester_id: string;
          created_at?: string;
          updated_at?: string;
          last_message_at?: string;
        };
        Update: {
          id?: string;
          collaboration_request_id?: string;
          idea_id?: string;
          creator_id?: string;
          requester_id?: string;
          created_at?: string;
          updated_at?: string;
          last_message_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'conversations_idea_id_fkey';
            columns: ['idea_id'];
            isOneToOne: false;
            referencedRelation: 'ideas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversations_creator_id_fkey';
            columns: ['creator_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversations_requester_id_fkey';
            columns: ['requester_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversations_collaboration_request_id_fkey';
            columns: ['collaboration_request_id'];
            isOneToOne: true;
            referencedRelation: 'collaboration_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          created_at: string;
          updated_at: string;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          created_at?: string;
          updated_at?: string;
          read_at?: string | null;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          body?: string;
          created_at?: string;
          updated_at?: string;
          read_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_or_create_conversation: {
        Args: {
          p_request_id: string;
        };
        Returns: Database['public']['Tables']['conversations']['Row'];
      };
      mark_conversation_messages_as_read: {
        Args: {
          p_conversation_id: string;
        };
        Returns: number;
      };
      respond_to_collaboration_request: {
        Args: {
          p_request_id: string;
          p_decision: string;
        };
        Returns: {
          success: boolean;
          request_id: string;
          status: string;
        };
      };
      toggle_idea_upvote: {
        Args: {
          p_idea_id: string;
        };
        Returns: {
          upvoted: boolean;
          upvotes_count: number;
        };
      };
    };
    Enums: {
      user_role: UserRole;
      idea_status: IdeaStatus;
      collaboration_type: CollaborationType;
      request_status: RequestStatus;
      notification_type: NotificationType;
    };
  };
}
