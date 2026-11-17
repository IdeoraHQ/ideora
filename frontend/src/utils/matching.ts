import type {
  DiscoverablePerson,
  Idea,
  IdeaRoleNeeded,
  UserProfile,
} from '../types/index.js';

export type MatchTier = 'Strong match' | 'Good match' | 'Relevant';

export interface ProfileCompleteness {
  isIncomplete: boolean;
  hasAnySignals: boolean;
  missingFields: Array<'skills' | 'interests' | 'preferred_roles'>;
}

export interface BuilderProfileSignals {
  id: string;
  skills?: string[] | null;
  interests?: string[] | null;
  preferred_roles?: string[] | null;
  looking_to_contribute?: string | null;
  bio?: string | null;
  role?: string | null;
  is_discoverable?: boolean;
}

export interface BuilderMatchResult {
  builder: DiscoverablePerson;
  score: number;
  tier: MatchTier;
  reasons: string[];
  matchedSkills: string[];
  matchedInterests: string[];
  matchedRoleSignals: string[];
}

export interface IdeaMatchResult {
  idea: Idea;
  bestRole: IdeaRoleNeeded | null;
  score: number;
  tier: MatchTier;
  reasons: string[];
  matchedSkills: string[];
  matchedInterests: string[];
}

const DOMAIN_SYNONYMS: Record<string, string[]> = {
  frontend: ['front-end', 'front end', 'react', 'typescript', 'javascript', 'vue', 'nextjs', 'css'],
  backend: ['back-end', 'back end', 'nodejs', 'node', 'postgres', 'postgresql', 'python', 'api', 'sql', 'supabase'],
  fullstack: ['full-stack', 'full stack'],
  design: ['ui/ux', 'ui', 'ux', 'product design', 'figma', 'designer'],
  product: ['product manager', 'pm', 'product management', 'business analyst'],
  ai: ['ai/ml', 'ml', 'machine learning', 'llm', 'data science', 'artificial intelligence'],
  marketing: ['growth', 'seo', 'content', 'community', 'distribution'],
  game: ['unity', 'unreal', 'game design', 'game dev', 'gamedev', 'game development'],
};

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[_/]+/g, ' ').replace(/\s+/g, ' ');
}

function expandTokens(values: string[]): Set<string> {
  const tokens = new Set<string>();
  for (const raw of values) {
    const norm = normalizeToken(raw);
    if (!norm) continue;
    tokens.add(norm);
    for (const part of norm.split(/[\s,-]+/)) {
      if (part.length >= 2) tokens.add(part);
    }
    for (const [canonical, aliases] of Object.entries(DOMAIN_SYNONYMS)) {
      if (norm === canonical || aliases.includes(norm)) {
        tokens.add(canonical);
        for (const alias of aliases) tokens.add(alias);
      }
    }
  }
  return tokens;
}

function findDirectMatches(source: string[], targetTokens: Set<string>): string[] {
  const matched: string[] = [];
  const seen = new Set<string>();

  for (const item of source) {
    const norm = normalizeToken(item);
    if (!norm || seen.has(norm)) continue;

    const itemTokens = expandTokens([item]);
    let hits = false;
    for (const tok of itemTokens) {
      if (targetTokens.has(tok)) {
        hits = true;
        break;
      }
    }

    if (hits) {
      seen.add(norm);
      matched.push(item.trim());
    }
  }

  return matched;
}

export function isRoleOpen(role: IdeaRoleNeeded): boolean {
  return (role.spots_filled ?? 0) < (role.spots_available ?? 1);
}

export function assessBuilderProfileCompleteness(
  profile: BuilderProfileSignals | null | undefined
): ProfileCompleteness {
  const skills = (profile?.skills || []).filter((s) => s.trim().length > 0);
  const interests = (profile?.interests || []).filter((i) => i.trim().length > 0);
  const preferredRoles = (profile?.preferred_roles || []).filter(
    (r) => r.trim().length > 0
  );

  const missingFields: Array<'skills' | 'interests' | 'preferred_roles'> = [];
  if (skills.length === 0) missingFields.push('skills');
  if (interests.length === 0) missingFields.push('interests');
  if (preferredRoles.length === 0) missingFields.push('preferred_roles');

  const hasAnySignals =
    skills.length > 0 || interests.length > 0 || preferredRoles.length > 0;

  return {
    isIncomplete: !hasAnySignals,
    hasAnySignals,
    missingFields,
  };
}

function deriveTier(params: {
  distinctSignalGroups: number;
  hasSkillOrRoleMatch: boolean;
  totalDirectHits: number;
}): MatchTier {
  if (
    params.hasSkillOrRoleMatch &&
    params.distinctSignalGroups >= 2 &&
    params.totalDirectHits >= 2
  ) {
    return 'Strong match';
  }
  if (params.hasSkillOrRoleMatch || params.totalDirectHits >= 2) {
    return 'Good match';
  }
  return 'Relevant';
}

/**
 * Deterministically rank discoverable builders for a specific idea and open role.
 * Excludes undiscoverable profiles and the idea creator.
 * Returns only builders with at least one verified skill, role, or interest match.
 */
export function rankBuildersForRole(
  idea: Idea,
  role: IdeaRoleNeeded | null,
  builders: DiscoverablePerson[]
): BuilderMatchResult[] {
  const roleInputs = role
    ? [role.role_title, role.category, ...(role.description ? [role.description] : [])]
    : [];
  const roleTokens = expandTokens(roleInputs);
  const ideaTagTokens = expandTokens([idea.category, ...(idea.tags || [])]);
  const combinedRoleAndTagTokens = new Set([...roleTokens, ...ideaTagTokens]);

  const results: BuilderMatchResult[] = [];

  for (const builder of builders) {
    if (!builder.is_discoverable) continue;
    if (builder.id === idea.creator_id) continue;

    const completeness = assessBuilderProfileCompleteness(builder);
    if (completeness.isIncomplete) continue;

    const builderSkills = builder.skills || [];
    const builderInterests = builder.interests || [];
    const builderPreferredRoles = builder.preferred_roles || [];

    const matchedSkillsForRole = findDirectMatches(
      builderSkills,
      role ? roleTokens : combinedRoleAndTagTokens
    );
    const matchedSkillsForIdea = findDirectMatches(builderSkills, ideaTagTokens);
    const matchedSkills = Array.from(
      new Set([...matchedSkillsForRole, ...matchedSkillsForIdea])
    );

    const matchedRoleSignals = findDirectMatches(
      builderPreferredRoles,
      role ? roleTokens : combinedRoleAndTagTokens
    );

    const matchedInterests = findDirectMatches(builderInterests, ideaTagTokens);

    const totalDirectHits =
      matchedSkills.length + matchedRoleSignals.length + matchedInterests.length;

    if (totalDirectHits === 0) continue;

    let score = 0;
    score += matchedSkillsForRole.length * 25;
    score += matchedRoleSignals.length * 22;
    score += matchedSkillsForIdea.length * 12;
    score += matchedInterests.length * 14;

    const hasIntent = Boolean(builder.looking_to_contribute?.trim());
    if (hasIntent) score += 6;
    if (builder.bio?.trim()) score += 4;

    const distinctGroups =
      (matchedSkills.length > 0 ? 1 : 0) +
      (matchedRoleSignals.length > 0 ? 1 : 0) +
      (matchedInterests.length > 0 ? 1 : 0);

    const tier = deriveTier({
      distinctSignalGroups: distinctGroups,
      hasSkillOrRoleMatch:
        matchedSkillsForRole.length > 0 || matchedRoleSignals.length > 0,
      totalDirectHits,
    });

    const reasons: string[] = [];
    if (matchedSkills.length > 0) {
      reasons.push(`Matching skills: ${matchedSkills.slice(0, 3).join(', ')}`);
    }
    if (matchedRoleSignals.length > 0) {
      reasons.push(
        `Preferred role aligns: ${matchedRoleSignals.slice(0, 2).join(', ')}`
      );
    }
    if (matchedInterests.length > 0) {
      reasons.push(`Shared interest: ${matchedInterests.slice(0, 2).join(', ')}`);
    }
    if (hasIntent) {
      reasons.push('Actively looking to contribute');
    }

    results.push({
      builder,
      score,
      tier,
      reasons,
      matchedSkills,
      matchedInterests,
      matchedRoleSignals,
    });
  }

  return results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (a.builder.full_name || a.builder.username).localeCompare(
      b.builder.full_name || b.builder.username
    );
  });
}

/**
 * Deterministically rank published ideas & their open roles for a builder profile.
 * Excludes the builder's own ideas, drafts, and archived ideas.
 */
export function rankIdeasForBuilder(
  builder: Pick<
    UserProfile,
    'id' | 'skills' | 'interests' | 'preferred_roles' | 'looking_to_contribute'
  >,
  ideas: Idea[]
): IdeaMatchResult[] {
  const completeness = assessBuilderProfileCompleteness(builder);
  if (completeness.isIncomplete) {
    return [];
  }

  const builderSkills = builder.skills || [];
  const builderInterests = builder.interests || [];
  const builderPreferredRoles = builder.preferred_roles || [];

  const builderSkillTokens = expandTokens(builderSkills);
  const builderRoleTokens = expandTokens(builderPreferredRoles);
  const allBuilderSkillAndRoleTokens = new Set([
    ...builderSkillTokens,
    ...builderRoleTokens,
  ]);

  const results: IdeaMatchResult[] = [];

  for (const idea of ideas) {
    if (idea.creator_id === builder.id) continue;
    if (idea.status === 'draft' || idea.status === 'archived') continue;

    const openRoles = (idea.rolesNeeded || []).filter(isRoleOpen);
    const ideaTagsAndCategory = [idea.category, ...(idea.tags || [])];

    let bestRole: IdeaRoleNeeded | null = null;
    let bestRoleScore = -1;
    let bestRoleMatchedSkills: string[] = [];

    for (const role of openRoles) {
      const roleKeywords = [
        role.role_title,
        role.category,
        ...(role.description ? [role.description] : []),
      ];
      const matchedFromRole = findDirectMatches(
        roleKeywords,
        allBuilderSkillAndRoleTokens
      );
      const roleScore = matchedFromRole.length * 25;
      if (roleScore > bestRoleScore) {
        bestRoleScore = roleScore;
        bestRole = role;
        bestRoleMatchedSkills = matchedFromRole;
      }
    }

    const matchedIdeaSkills = findDirectMatches(
      builderSkills,
      expandTokens(ideaTagsAndCategory)
    );
    const matchedInterests = findDirectMatches(
      builderInterests,
      expandTokens(ideaTagsAndCategory)
    );
    const matchedPreferredRoles = bestRole
      ? findDirectMatches(
          builderPreferredRoles,
          expandTokens([bestRole.role_title, bestRole.category])
        )
      : [];

    const combinedSkills = Array.from(
      new Set([...bestRoleMatchedSkills, ...matchedIdeaSkills])
    );

    const totalDirectHits =
      combinedSkills.length +
      matchedInterests.length +
      matchedPreferredRoles.length;

    if (totalDirectHits === 0) continue;

    let score = 0;
    if (bestRoleScore > 0) score += bestRoleScore;
    score += matchedIdeaSkills.length * 14;
    score += matchedInterests.length * 16;
    score += matchedPreferredRoles.length * 20;
    if (idea.status === 'seeking_collaborators' && openRoles.length > 0) {
      score += 8;
    }

    const distinctGroups =
      (combinedSkills.length > 0 ? 1 : 0) +
      (matchedInterests.length > 0 ? 1 : 0) +
      (matchedPreferredRoles.length > 0 ? 1 : 0);

    const tier = deriveTier({
      distinctSignalGroups: distinctGroups,
      hasSkillOrRoleMatch:
        bestRoleScore > 0 || matchedPreferredRoles.length > 0 || matchedIdeaSkills.length > 0,
      totalDirectHits,
    });

    const reasons: string[] = [];
    if (bestRole && (bestRoleScore > 0 || matchedPreferredRoles.length > 0)) {
      reasons.push(`Open role fit: ${bestRole.role_title}`);
    }
    if (combinedSkills.length > 0) {
      reasons.push(`Matched skills: ${combinedSkills.slice(0, 3).join(', ')}`);
    }
    if (matchedInterests.length > 0) {
      reasons.push(`Shared interest: ${matchedInterests.slice(0, 2).join(', ')}`);
    }

    results.push({
      idea,
      bestRole,
      score,
      tier,
      reasons,
      matchedSkills: combinedSkills,
      matchedInterests,
    });
  }

  return results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.idea.upvotes_count ?? 0) - (a.idea.upvotes_count ?? 0);
  });
}
