export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'founder' | 'collaborator' | 'admin';
export type AccountStatus = 'active' | 'suspended' | 'banned';
export type IdeaStatus = 'draft' | 'seeking_collaborators' | 'in_progress' | 'launched' | 'archived';
export type IdeaModerationStatus = 'approved' | 'pending_review' | 'rejected' | 'removed';
export type CollaborationType = 'co_founder' | 'contributor' | 'advisor' | 'open_source';
export type RequestStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn';
export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived';
export type ProjectMemberRole = 'owner' | 'collaborator';
export type ReportTargetType = 'idea' | 'comment' | 'profile' | 'project';
export type ReportStatus = 'open' | 'investigating' | 'resolved' | 'dismissed';
export type FeedbackType = 'feature_request' | 'bug_report' | 'general_feedback';
export type FeedbackStatus =
  | 'new'
  | 'reviewing'
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'declined';
export type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical';
export type FeedbackPromptStatus = 'eligible' | 'deferred' | 'declined' | 'submitted';
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
          moderation_status: IdeaModerationStatus;
          moderation_reason: string | null;
          moderated_by: string | null;
          moderated_at: string | null;
          deleted_at: string | null;
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
          moderation_status?: IdeaModerationStatus;
          moderation_reason?: string | null;
          moderated_by?: string | null;
          moderated_at?: string | null;
          deleted_at?: string | null;
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
          moderation_status?: IdeaModerationStatus;
          moderation_reason?: string | null;
          moderated_by?: string | null;
          moderated_at?: string | null;
          deleted_at?: string | null;
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
      projects: {
        Row: {
          id: string;
          idea_id: string;
          owner_id: string;
          title: string;
          description: string;
          status: ProjectStatus;
          created_at: string;
          updated_at: string;
          last_activity_at: string;
        };
        Insert: {
          id?: string;
          idea_id: string;
          owner_id: string;
          title: string;
          description: string;
          status?: ProjectStatus;
          created_at?: string;
          updated_at?: string;
          last_activity_at?: string;
        };
        Update: {
          id?: string;
          idea_id?: string;
          owner_id?: string;
          title?: string;
          description?: string;
          status?: ProjectStatus;
          created_at?: string;
          updated_at?: string;
          last_activity_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'projects_idea_id_fkey';
            columns: ['idea_id'];
            isOneToOne: true;
            referencedRelation: 'ideas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'projects_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      project_members: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          collaboration_request_id: string | null;
          role_title: string;
          member_role: ProjectMemberRole;
          joined_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          collaboration_request_id?: string | null;
          role_title?: string;
          member_role?: ProjectMemberRole;
          joined_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          collaboration_request_id?: string | null;
          role_title?: string;
          member_role?: ProjectMemberRole;
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'project_members_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profile_security_status: {
        Row: {
          user_id: string;
          account_status: AccountStatus;
          status_reason: string | null;
          suspended_until: string | null;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      idea_moderation_history: {
        Row: {
          id: string;
          idea_id: string;
          admin_id: string;
          previous_status: IdeaModerationStatus;
          new_status: IdeaModerationStatus;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          idea_id: string;
          admin_id: string;
          previous_status: IdeaModerationStatus;
          new_status: IdeaModerationStatus;
          reason?: string | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          target_type: ReportTargetType;
          target_id: string;
          reason: string;
          details: string | null;
          status: ReportStatus;
          resolution_notes: string | null;
          resolved_by: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          target_type: ReportTargetType;
          target_id: string;
          reason: string;
          details?: string | null;
          status?: ReportStatus;
          resolution_notes?: string | null;
          resolved_by?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: ReportStatus;
          resolution_notes?: string | null;
          resolved_by?: string | null;
          resolved_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      admin_audit_logs: {
        Row: {
          id: string;
          actor_type: 'admin' | 'system';
          admin_id: string | null;
          action: string;
          target_type: string;
          target_id: string | null;
          previous_values: Json | null;
          new_values: Json | null;
          reason: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      feedback: {
        Row: {
          id: string;
          user_id: string;
          feedback_type: FeedbackType;
          category: string | null;
          title: string;
          description: string;
          benefit_or_impact: string | null;
          steps_to_reproduce: string | null;
          expected_behavior: string | null;
          actual_behavior: string | null;
          page_url: string | null;
          priority: FeedbackPriority | null;
          screenshot_path: string | null;
          status: FeedbackStatus;
          admin_response: string | null;
          internal_notes: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          feedback_type: FeedbackType;
          category?: string | null;
          title: string;
          description: string;
          benefit_or_impact?: string | null;
          steps_to_reproduce?: string | null;
          expected_behavior?: string | null;
          actual_behavior?: string | null;
          page_url?: string | null;
          priority?: FeedbackPriority | null;
          screenshot_path?: string | null;
        };
        Update: never;
        Relationships: [];
      };
      feedback_prompt_state: {
        Row: {
          user_id: string;
          session_count: number;
          last_session_recorded_at: string | null;
          active_seconds: number;
          meaningful_actions_count: number;
          last_meaningful_action: string | null;
          prompt_status: FeedbackPromptStatus;
          deferred_until: string | null;
          dismissed_at: string | null;
          submitted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      user_settings: {
        Row: {
          user_id: string;
          notify_collaboration_requests: boolean;
          notify_messages: boolean;
          notify_idea_activity: boolean;
          notify_platform_announcements: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          notify_collaboration_requests?: boolean;
          notify_messages?: boolean;
          notify_idea_activity?: boolean;
          notify_platform_announcements?: boolean;
        };
        Update: {
          notify_collaboration_requests?: boolean;
          notify_messages?: boolean;
          notify_idea_activity?: boolean;
          notify_platform_announcements?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      account_deletion_requests: {
        Row: {
          id: string;
          user_id: string;
          reason: string | null;
          status: 'pending' | 'cancelled' | 'completed';
          requested_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_active_user: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      admin_get_platform_stats: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      admin_list_projects: {
        Args: Record<PropertyKey, never>;
        Returns: Array<{
          id: string;
          idea_id: string;
          owner_id: string;
          owner_username: string;
          owner_full_name: string;
          title: string;
          status: ProjectStatus;
          member_count: number;
          created_at: string;
          last_activity_at: string;
        }>;
      };
      switch_creator_collaborator_role: {
        Args: {
          p_role: UserRole;
        };
        Returns: Database['public']['Tables']['profiles']['Row'];
      };
      soft_delete_own_idea: {
        Args: {
          p_idea_id: string;
        };
        Returns: boolean;
      };
      admin_update_user_role: {
        Args: {
          p_target_user_id: string;
          p_new_role: UserRole;
          p_reason?: string | null;
        };
        Returns: Database['public']['Tables']['profiles']['Row'];
      };
      admin_update_user_status: {
        Args: {
          p_target_user_id: string;
          p_new_status: AccountStatus;
          p_reason?: string | null;
          p_suspended_until?: string | null;
        };
        Returns: Database['public']['Tables']['profile_security_status']['Row'];
      };
      admin_moderate_idea: {
        Args: {
          p_idea_id: string;
          p_moderation_status: IdeaModerationStatus;
          p_reason?: string | null;
        };
        Returns: Database['public']['Tables']['ideas']['Row'];
      };
      admin_resolve_report: {
        Args: {
          p_report_id: string;
          p_new_status: ReportStatus;
          p_resolution_notes?: string | null;
        };
        Returns: Database['public']['Tables']['reports']['Row'];
      };
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
      record_feedback_engagement: {
        Args: {
          p_event_type: 'session_start' | 'heartbeat' | 'meaningful_action';
          p_active_seconds_delta?: number;
          p_action_name?: string | null;
        };
        Returns: Database['public']['Tables']['feedback_prompt_state']['Row'];
      };
      respond_to_feedback_prompt: {
        Args: {
          p_decision: 'defer' | 'decline' | 'opened_feedback';
        };
        Returns: Database['public']['Tables']['feedback_prompt_state']['Row'];
      };
      admin_get_feedback_summary: {
        Args: Record<string, never>;
        Returns: {
          total_submissions: number;
          new_submissions: number;
          reviewing_submissions: number;
          planned_submissions: number;
          in_progress_submissions: number;
          completed_submissions: number;
          declined_submissions: number;
          bug_reports: number;
          feature_requests: number;
          general_feedback: number;
        };
      };
      admin_list_feedback: {
        Args: {
          p_feedback_type?: FeedbackType | null;
          p_status?: FeedbackStatus | null;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: Array<{
          id: string;
          user_id: string;
          submitter_username: string;
          submitter_full_name: string;
          submitter_role: UserRole;
          feedback_type: FeedbackType;
          category: string | null;
          title: string;
          description: string;
          benefit_or_impact: string | null;
          steps_to_reproduce: string | null;
          expected_behavior: string | null;
          actual_behavior: string | null;
          page_url: string | null;
          priority: FeedbackPriority | null;
          screenshot_path: string | null;
          status: FeedbackStatus;
          admin_response: string | null;
          internal_notes: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        }>;
      };
      admin_update_feedback: {
        Args: {
          p_feedback_id: string;
          p_status: FeedbackStatus;
          p_admin_response?: string | null;
          p_internal_notes?: string | null;
        };
        Returns: Database['public']['Tables']['feedback']['Row'];
      };
      request_account_deletion: {
        Args: {
          p_reason?: string | null;
        };
        Returns: Database['public']['Tables']['account_deletion_requests']['Row'];
      };
      cancel_account_deletion_request: {
        Args: Record<string, never>;
        Returns: Database['public']['Tables']['account_deletion_requests']['Row'];
      };
    };
    Enums: {
      user_role: UserRole;
      account_status: AccountStatus;
      idea_status: IdeaStatus;
      idea_moderation_status: IdeaModerationStatus;
      collaboration_type: CollaborationType;
      request_status: RequestStatus;
      project_status: ProjectStatus;
      project_member_role: ProjectMemberRole;
      report_target_type: ReportTargetType;
      report_status: ReportStatus;
      notification_type: NotificationType;
      feedback_type: FeedbackType;
      feedback_status: FeedbackStatus;
      feedback_priority: FeedbackPriority;
      feedback_prompt_status: FeedbackPromptStatus;
    };
  };
}
