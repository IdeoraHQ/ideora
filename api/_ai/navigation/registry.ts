import type { AuthenticatedCaller } from '../core/types';

export interface IdeoraRouteDefinition {
  id: string;
  label: string;
  path: string;
  description: string;
  requiresAuth: boolean;
  requiredRole: 'any' | 'founder' | 'collaborator' | 'admin';
  keywords: string[];
}

export interface VerifiedNavigationAction {
  id: string;
  label: string;
  path: string;
  description: string;
}

export const IDEORA_NAVIGATION_REGISTRY: readonly IdeoraRouteDefinition[] = [
  {
    id: 'home',
    label: 'Home',
    path: '/',
    description: 'Ideora landing page and platform overview.',
    requiresAuth: false,
    requiredRole: 'any',
    keywords: ['home', 'landing', 'start'],
  },
  {
    id: 'explore',
    label: 'Explore Ideas',
    path: '/explore',
    description: 'Browse, search, and filter published ideas across categories and collaboration types.',
    requiresAuth: false,
    requiredRole: 'any',
    keywords: ['explore', 'discover', 'browse ideas', 'search ideas', 'find ideas', 'feed'],
  },
  {
    id: 'people',
    label: 'People & Builders',
    path: '/people',
    description: 'Discover discoverable founders and collaborators by skills, role, and bio.',
    requiresAuth: false,
    requiredRole: 'any',
    keywords: ['people', 'builders', 'collaborators', 'find collaborators', 'find people', 'co-founder', 'talent'],
  },
  {
    id: 'publish_idea',
    label: 'Publish an Idea',
    path: '/ideas/new',
    description: 'Create and publish a new idea or save it as a draft with roles needed and tags.',
    requiresAuth: true,
    requiredRole: 'any',
    keywords: ['publish', 'new idea', 'create idea', 'post idea', 'submit idea', 'draft idea'],
  },
  {
    id: 'dashboard',
    label: 'Workspace Overview',
    path: '/dashboard',
    description: 'Your personal workspace overview showing active collaborations, ideas, and pending requests.',
    requiresAuth: true,
    requiredRole: 'any',
    keywords: ['dashboard', 'overview', 'workspace'],
  },
  {
    id: 'my_ideas',
    label: 'My Ideas',
    path: '/dashboard?tab=ideas',
    description: 'Manage your published ideas and drafts, update statuses, or delete an idea.',
    requiresAuth: true,
    requiredRole: 'any',
    keywords: ['my ideas', 'delete idea', 'manage ideas', 'drafts', 'edit my idea'],
  },
  {
    id: 'incoming_requests',
    label: 'Incoming Collaboration Requests',
    path: '/dashboard?tab=incoming',
    description: 'Review, accept, or decline collaboration applications sent to your ideas.',
    requiresAuth: true,
    requiredRole: 'any',
    keywords: ['incoming requests', 'collaboration requests', 'applicants', 'review requests', 'accept request'],
  },
  {
    id: 'sent_applications',
    label: 'Sent Applications',
    path: '/dashboard?tab=sent',
    description: 'Track collaboration requests you have sent to other founders.',
    requiresAuth: true,
    requiredRole: 'any',
    keywords: ['sent applications', 'my applications', 'applied', 'pending applications'],
  },
  {
    id: 'projects',
    label: 'Projects Hub',
    path: '/projects',
    description: 'Access active collaboration project workspaces, tasks, and team updates.',
    requiresAuth: true,
    requiredRole: 'any',
    keywords: ['projects', 'project workspace', 'milestones', 'tasks'],
  },
  {
    id: 'messages',
    label: 'Messages',
    path: '/messages',
    description: 'Direct messaging with founders and collaborators.',
    requiresAuth: true,
    requiredRole: 'any',
    keywords: ['messages', 'chat', 'dm', 'inbox', 'direct messages', 'conversations'],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    path: '/notifications',
    description: 'View collaboration updates, comments, upvotes, and message notifications.',
    requiresAuth: true,
    requiredRole: 'any',
    keywords: ['notifications', 'alerts', 'activity'],
  },
  {
    id: 'profile',
    label: 'My Profile',
    path: '/profile',
    description: 'View your public builder profile, bio, skills, and change your profile image.',
    requiresAuth: true,
    requiredRole: 'any',
    keywords: ['profile', 'my profile', 'avatar', 'profile image', 'public profile'],
  },
  {
    id: 'settings',
    label: 'Account Settings',
    path: '/settings',
    description: 'Edit your profile details, skills, discoverability, notification preferences, password, theme, or delete your account.',
    requiresAuth: true,
    requiredRole: 'any',
    keywords: ['settings', 'edit profile', 'password', 'theme', 'dark mode', 'notification preferences', 'delete account'],
  },
  {
    id: 'feedback',
    label: 'Feedback Center',
    path: '/feedback',
    description: 'Submit bug reports, feature requests, or general feedback to the Ideora team.',
    requiresAuth: true,
    requiredRole: 'any',
    keywords: ['feedback', 'bug', 'report bug', 'feature request', 'support'],
  },
  {
    id: 'ora_workspace',
    label: 'Ask ORA',
    path: '/ai',
    description: 'Your intelligent companion inside Ideora for idea development and platform guidance.',
    requiresAuth: true,
    requiredRole: 'any',
    keywords: ['ora', 'ask ora', 'ai', 'ai workspace', 'assistant'],
  },
  {
    id: 'about',
    label: 'About Ideora',
    path: '/about',
    description: 'Learn about Ideora’s mission and collaboration model.',
    requiresAuth: false,
    requiredRole: 'any',
    keywords: ['about', 'about ideora'],
  },
  {
    id: 'privacy',
    label: 'Privacy Policy',
    path: '/privacy',
    description: 'Read Ideora’s Privacy Policy.',
    requiresAuth: false,
    requiredRole: 'any',
    keywords: ['privacy', 'privacy policy', 'data policy'],
  },
  {
    id: 'terms',
    label: 'Terms of Service',
    path: '/terms',
    description: 'Read Ideora’s Terms of Service.',
    requiresAuth: false,
    requiredRole: 'any',
    keywords: ['terms', 'terms of service', 'tos'],
  },
  {
    id: 'admin_center',
    label: 'Admin Control Center',
    path: '/admin',
    description: 'Platform moderation, user management, reports, and system administration.',
    requiresAuth: true,
    requiredRole: 'admin',
    keywords: ['admin', 'admin dashboard', 'admin center', 'moderation'],
  },
  {
    id: 'admin_ai',
    label: 'Operations AI Console',
    path: '/admin/ai',
    description: 'Internal Ideora Operations AI analytics console for administrators.',
    requiresAuth: true,
    requiredRole: 'admin',
    keywords: ['admin ai', 'operations ai', 'analytics console'],
  },
];

export type DestinationResolution =
  | {
      approved: true;
      route: IdeoraRouteDefinition;
      action: VerifiedNavigationAction;
    }
  | {
      approved: false;
      reason: 'unknown_destination' | 'unauthorized' | 'inactive_account';
      message: string;
    };

export function resolveIdeoraDestination(params: {
  destination: string;
  caller: AuthenticatedCaller;
}): DestinationResolution {
  if (!params.caller.isActive) {
    return {
      approved: false,
      reason: 'inactive_account',
      message: 'Your account is currently not active.',
    };
  }

  const raw = params.destination.trim().toLowerCase();
  if (!raw) {
    return {
      approved: false,
      reason: 'unknown_destination',
      message: 'No destination was specified.',
    };
  }

  // 1. Exact ID or exact path match
  let match = IDEORA_NAVIGATION_REGISTRY.find(
    (r) => r.id === raw || r.path.toLowerCase() === raw
  );

  // 2. Label or keyword match
  if (!match) {
    match = IDEORA_NAVIGATION_REGISTRY.find(
      (r) =>
        r.label.toLowerCase() === raw ||
        r.keywords.some((kw) => raw.includes(kw) || kw.includes(raw))
    );
  }

  if (!match) {
    return {
      approved: false,
      reason: 'unknown_destination',
      message: `Destination "${params.destination}" does not exist in Ideora.`,
    };
  }

  if (match.requiredRole === 'admin' && !params.caller.isAdmin) {
    return {
      approved: false,
      reason: 'unauthorized',
      message: 'That destination is restricted to Ideora administrators.',
    };
  }

  return {
    approved: true,
    route: match,
    action: {
      id: match.id,
      label: match.label,
      path: match.path,
      description: match.description,
    },
  };
}

export function listAccessibleDestinationIds(caller: AuthenticatedCaller): string[] {
  return IDEORA_NAVIGATION_REGISTRY.filter(
    (r) => r.requiredRole !== 'admin' || caller.isAdmin
  ).map((r) => `${r.id} (${r.path} — ${r.label})`);
}

