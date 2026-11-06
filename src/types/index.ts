import type { Database, CollaborationType } from './database.types';

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

// Agreed Payload for Co-founder's Idea Submission Form:
export interface CreateIdeaPayload {
  title: string;
  summary: string;
  description: string;
  category: string;
  collaboration_type: CollaborationType;
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
