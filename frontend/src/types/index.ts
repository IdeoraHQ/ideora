import type { Database, CollaborationType, IdeaStatus } from './database.types';

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
  idea?: Database['public']['Tables']['ideas']['Row'];
  role?: IdeaRoleNeeded | null;
};

export interface SubmitCollaborationPayload {
  idea_id: string;
  role_id?: string;
  message: string;
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
  idea?: Pick<Database['public']['Tables']['ideas']['Row'], 'id' | 'title' | 'slug' | 'category' | 'status'>;
  creator?: UserProfile;
  requester?: UserProfile;
  collaboration_request?: Pick<
    Database['public']['Tables']['collaboration_requests']['Row'],
    'id' | 'status' | 'message' | 'role_id'
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
