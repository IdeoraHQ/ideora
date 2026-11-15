import type { AuthenticatedCaller } from '../core/types';

export interface PlatformFeatureDoc {
  name: string;
  purpose: string;
  access: string;
  route: string;
  howToUse: string;
  requirements?: string;
  limitations?: string;
}

export const IDEORA_PLATFORM_FEATURES: readonly PlatformFeatureDoc[] = [
  {
    name: 'Publish an Idea',
    purpose: 'Share a startup, open-source, or product concept and recruit collaborators.',
    access: 'Any signed-in user (Founders and Collaborators).',
    route: '/ideas/new',
    howToUse:
      'Fill in Idea Title, Domain/Category, One-Sentence Elevator Pitch (max 220 chars), Detailed Vision/Problem & Architecture, Collaboration Structure (Co-Founder, Core Contributor, Open Source, or Advisor / Mentor), optional Tech Stack & Topic Tags, and Roles Needed (Role Title, Skill Category, Open Spots, Description). Choose "Save as Draft" or "Publish Idea".',
    requirements: 'Title, Category, Elevator Pitch, Detailed Vision, and Collaboration Structure are required.',
    limitations: 'ORA cannot publish, edit, or delete ideas on your behalf; you submit the form yourself.',
  },
  {
    name: 'Manage, Edit & Delete Ideas',
    purpose: 'Update idea details, change project stage, or delete an idea.',
    access: 'Idea creator only.',
    route: '/dashboard?tab=ideas',
    howToUse:
      'Open My Ideas (/dashboard?tab=ideas) to view drafts and published ideas or delete an idea. To edit title, summary, description, category, collaboration type, or development status (including Archived), open the idea page (/ideas/<slug>) and use "Edit Idea" or "Quick Status Update".',
    limitations: 'Deleting an idea is available in My Ideas (/dashboard?tab=ideas), not on the public idea detail page.',
  },
  {
    name: 'Explore Ideas',
    purpose: 'Discover published ideas, upvote, comment, and apply to open roles.',
    access: 'Public (anyone can browse; signing in is required to upvote, comment, or apply).',
    route: '/explore',
    howToUse:
      'Search and filter ideas by category, collaboration type, or status, then click an idea card to view its full details, open roles, and discussion.',
  },
  {
    name: 'People & Builders Discovery',
    purpose: 'Find founders and collaborators based on skills, bio, and role focus.',
    access: 'Public (anyone can browse; signing in is required to send collaboration requests).',
    route: '/people',
    howToUse:
      'Browse or search discoverable profiles, open a builder’s public profile (/profile/<username>), and send a direct collaboration request if they are open to collaborating.',
    requirements: 'Users appear in People only when their profile discoverability is enabled in Account Settings (/settings).',
  },
  {
    name: 'Collaboration Requests',
    purpose: 'Send applications to join ideas and review incoming requests from builders.',
    access: 'Signed-in users.',
    route: '/dashboard?tab=incoming',
    howToUse:
      'Founders review incoming requests under Collaborations / Incoming Requests (/dashboard?tab=incoming) to accept or decline. Applicants track their applications under Sent Applications (/dashboard?tab=sent).',
  },
  {
    name: 'Projects Hub',
    purpose: 'Collaborate inside active project workspaces once a collaboration is underway.',
    access: 'Signed-in project owners and accepted collaborators.',
    route: '/projects',
    howToUse:
      'Open Projects (/projects) and select a project workspace (/projects/<id>) to coordinate with your team.',
  },
  {
    name: 'Direct Messages',
    purpose: 'Communicate directly with founders and collaborators.',
    access: 'Signed-in participants of an active conversation.',
    route: '/messages',
    howToUse:
      'Open Messages (/messages), filter by All or Unread, search conversations, and chat in real time.',
    limitations:
      'Direct messages currently support text only (no file/image attachments, message editing, or real-time online/typing presence indicators).',
  },
  {
    name: 'My Profile & Avatar',
    purpose: 'View your public builder identity and update your profile photo.',
    access: 'Signed-in users (public profiles can also be viewed at /profile/<username>).',
    route: '/profile',
    howToUse:
      'Visit My Profile (/profile) to view your bio, skills, and published ideas, and upload or change your profile image directly from the profile page.',
  },
  {
    name: 'Account Settings',
    purpose: 'Edit profile fields, skills, discoverability, notifications, password, theme, or delete your account.',
    access: 'Signed-in users.',
    route: '/settings',
    howToUse:
      'Update your Full Name, Username, Bio, Skills, Role Focus, GitHub/LinkedIn/Website links, Discoverability toggle, Notification Preferences, Password (or request a password reset email), Theme (Light/Dark/System), or permanently delete your account.',
    limitations: 'Google OAuth accounts manage Google sign-in via Google; Ideora does not access Gmail or Google Drive.',
  },
  {
    name: 'Notifications',
    purpose: 'Stay updated on collaboration requests, responses, comments, upvotes, and messages.',
    access: 'Signed-in users.',
    route: '/notifications',
    howToUse: 'Open Notifications (/notifications) to view and mark updates as read.',
  },
  {
    name: 'Feedback Center',
    purpose: 'Submit bug reports, feature requests, or general feedback to the Ideora team.',
    access: 'Signed-in users.',
    route: '/feedback',
    howToUse:
      'Choose a feedback type (Feature Request, Bug Report, or General Feedback), describe the issue or suggestion, and submit.',
  },
  {
    name: 'Ask ORA (AI Workspace)',
    purpose: 'Your intelligent companion inside Ideora for idea development, collaborator strategy, and platform navigation.',
    access: 'Signed-in users.',
    route: '/ai',
    howToUse:
      'Start a new conversation or attach one of your existing ideas from the dropdown to get tailored MVP scoping, assumption checks, and direct navigation links.',
    limitations:
      'ORA advises and navigates—it cannot directly publish/edit/delete ideas, send DMs, accept requests, or modify account settings.',
  },
];

export function buildPlatformKnowledgePrompt(caller: AuthenticatedCaller): string {
  const featuresBlock = IDEORA_PLATFORM_FEATURES.map((f) => {
    const extra = [f.requirements, f.limitations].filter(Boolean).join(' ');
    return `- ${f.name} (\`${f.route}\`): ${f.howToUse}${extra ? ` Note: ${extra}` : ''}`;
  }).join('\n');

  const roleGuidance =
    caller.role === 'founder'
      ? 'User role focus: Founder (emphasize publishing ideas, defining roles, reviewing incoming requests, finding builders on People).'
      : caller.role === 'admin'
      ? 'User role: Administrator (full access including /admin and /admin/ai).'
      : 'User role focus: Collaborator (emphasize Explore, completing profile/skills/discoverability, applying to roles, Sent Applications; can also publish ideas).';

  const adminBoundary = caller.isAdmin
    ? ''
    : 'Non-admin user: NEVER reveal admin routes or admin-only features.';

  return [
    'IDEORA PLATFORM KNOWLEDGE (authoritative; do not invent features or URLs):',
    'Auth: Email/Password, Continue with Google, Forgot/Reset password.',
    roleGuidance,
    adminBoundary,
    featuresBlock,
  ]
    .filter(Boolean)
    .join('\n');
}

