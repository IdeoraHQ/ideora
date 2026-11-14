import type { Database, CollaborationType, IdeaStatus, UserRole } from './database.types';

export * from './database.types';

export type SkillCategory =
  | 'frontend'
  | 'backend'
  | 'fullstack'
  | 'design'
  | 'product'
  | 'ai'
  | 'marketing';

// Domain model for User Profile
export type UserProfile = Database['public']['Tables']['profiles']['Row'];
export type UpdateProfilePayload = Database['public']['Tables']['profiles']['Update'];

// Domain model for Idea Role Needed
export type IdeaRoleNeeded = Database['public']['Tables']['idea_roles_needed']['Row'];

// Domain model for Idea (with optional relational joins)
export type Idea = Database['public']['Tables']['ideas']['Row'] & {
  author?: UserProfile;
  rolesNeeded?: IdeaRoleNeeded[];
};

// Payload for Idea Submission Form
export interface CreateIdeaPayload {
  title: string;
  summary: string;
  description: string;
  category: string;
  collaboration_type: CollaborationType;
  status?: IdeaStatus;
  tags: string[];
  roles_needed?: Array<{
    role_title: string;
    category: string;
    spots_available: number;
    description?: string;
  }>;
}

// Domain model for Collaboration Request
export type CollaborationRequest = Database['public']['Tables']['collaboration_requests']['Row'] & {
  requester?: UserProfile;
  recipient?: UserProfile | null;
  idea?: Database['public']['Tables']['ideas']['Row'] | null;
  role?: IdeaRoleNeeded | null;
};

export interface SubmitCollaborationPayload {
  idea_id?: string | null;
  role_id?: string;
  recipient_id?: string;
  request_type?: 'idea_based' | 'general';
  purpose?: string;
  skills_offered?: string[];
  message: string;
}

export interface DiscoverablePerson {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  role: UserRole;
  skills: string[];
  interests: string[];
  preferred_roles: string[];
  looking_to_contribute: string | null;
  collaboration_goals: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  is_discoverable: boolean;
  created_at: string;
  published_ideas_count: number;
}

// Domain model for Idea Comment
export type IdeaComment = Database['public']['Tables']['idea_comments']['Row'] & {
  author?: UserProfile;
};

// Domain model for Notification
export type NotificationItem = Database['public']['Tables']['notifications']['Row'] & {
  actor?: UserProfile | null;
  idea?: Pick<Database['public']['Tables']['ideas']['Row'], 'id' | 'title' | 'slug'> | null;
};

// Domain models for Direct Messaging
export type Conversation = Database['public']['Tables']['conversations']['Row'] & {
  idea?: Pick<Database['public']['Tables']['ideas']['Row'], 'id' | 'title' | 'slug' | 'category' | 'status'> | null;
  creator?: UserProfile;
  requester?: UserProfile;
  collaboration_request?: Pick<
    Database['public']['Tables']['collaboration_requests']['Row'],
    'id' | 'status' | 'message' | 'role_id' | 'request_type' | 'purpose'
  > & {
    role?: IdeaRoleNeeded | null;
  };
  last_message?: Database['public']['Tables']['messages']['Row'] | null;
  unread_count?: number;
};

export type Message = Database['public']['Tables']['messages']['Row'] & {
  sender?: UserProfile;
};

// Domain models for Projects Hub & Workspaces
export type ProjectMember = Database['public']['Tables']['project_members']['Row'] & {
  user?: UserProfile;
};

export type Project = Database['public']['Tables']['projects']['Row'] & {
  owner?: UserProfile;
  idea?: Pick<
    Database['public']['Tables']['ideas']['Row'],
    'id' | 'title' | 'slug' | 'summary' | 'category' | 'collaboration_type' | 'status' | 'tags' | 'created_at'
  >;
  members?: ProjectMember[];
};

// Domain models for Admin Control Center & Moderation
export type Report = Database['public']['Tables']['reports']['Row'] & {
  reporter?: UserProfile;
  resolver?: UserProfile | null;
};

export type IdeaModerationHistoryItem =
  Database['public']['Tables']['idea_moderation_history']['Row'] & {
    admin?: UserProfile;
  };

export type AdminAuditLog = Database['public']['Tables']['admin_audit_logs']['Row'] & {
  admin?: UserProfile;
};

export interface AdminPlatformStats {
  total_users: number;
  active_users: number;
  suspended_users: number;
  banned_users: number;
  admin_users: number;
  total_ideas: number;
  published_ideas: number;
  draft_ideas: number;
  flagged_or_removed_ideas: number;
  total_projects: number;
  active_projects: number;
  open_reports: number;
}

// Domain models for Feedback Center & Prompt
export type FeedbackRow = Database['public']['Tables']['feedback']['Row'];
export type UserFeedbackItem = Omit<
  FeedbackRow,
  'internal_notes' | 'reviewed_by' | 'reviewed_at'
>;
export type FeedbackPromptState =
  Database['public']['Tables']['feedback_prompt_state']['Row'];

export type AdminFeedbackSummary =
  Database['public']['Functions']['admin_get_feedback_summary']['Returns'];
export type AdminFeedbackItem =
  Database['public']['Functions']['admin_list_feedback']['Returns'][number];

export interface SubmitFeedbackPayload {
  feedback_type: Database['public']['Enums']['feedback_type'];
  category?: string;
  title: string;
  description: string;
  benefit_or_impact?: string;
  steps_to_reproduce?: string;
  expected_behavior?: string;
  actual_behavior?: string;
  page_url?: string;
  priority?: Database['public']['Enums']['feedback_priority'] | '';
  screenshotFile?: File | null;
}

// Domain models for User Settings & Account Deletion
export type UserSettings = Database['public']['Tables']['user_settings']['Row'];
export type AccountDeletionRequest =
  Database['public']['Tables']['account_deletion_requests']['Row'];
export type PlatformSetting =
  Database['public']['Tables']['platform_settings']['Row'];
