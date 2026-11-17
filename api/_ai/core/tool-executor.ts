import type {
  AgentDefinition,
  AiToolName,
  AuthenticatedCaller,
  ModelToolDefinition,
} from './types';
import { isToolAuthorizedForAgent } from './permissions';
import { supabaseRest } from './supabase-server';
import {
  resolveIdeoraDestination,
  type VerifiedNavigationAction,
} from '../navigation/registry';

async function logToolCall(params: {
  runId: string;
  userId: string;
  toolName: AiToolName;
  status: 'success' | 'denied' | 'error';
  inputSummary: Record<string, unknown>;
  outputSummary: Record<string, unknown>;
}): Promise<void> {
  await supabaseRest({
    path: 'ai_tool_calls',
    method: 'POST',
    useServiceRole: true,
    body: {
      run_id: params.runId,
      user_id: params.userId,
      tool_name: params.toolName,
      status: params.status,
      input_summary: params.inputSummary,
      output_summary: params.outputSummary,
    },
  }).catch((err) => {
    console.error('[IDEORA AI] Failed to log tool call:', err);
  });
}

export async function executeAgentTools(params: {
  runId: string;
  caller: AuthenticatedCaller;
  agent: AgentDefinition;
  ideaId?: string | null;
}): Promise<Record<string, unknown>> {
  const toolData: Record<string, unknown> = {};

  if (params.ideaId && params.agent.allowedTools.includes('get_user_idea')) {
    const authorized = isToolAuthorizedForAgent(
      params.caller,
      params.agent,
      'get_user_idea'
    );
    if (!authorized) {
      await logToolCall({
        runId: params.runId,
        userId: params.caller.userId,
        toolName: 'get_user_idea',
        status: 'denied',
        inputSummary: { ideaId: params.ideaId },
        outputSummary: { reason: 'Tool not authorized' },
      });
    } else {
      try {
        const rows = await supabaseRest<Array<Record<string, unknown>>>({
          path: `ideas?id=eq.${encodeURIComponent(
            params.ideaId
          )}&creator_id=eq.${encodeURIComponent(
            params.caller.userId
          )}&select=id,title,summary,description,category,collaboration_type,status,tags,roles_needed:idea_roles_needed(role_title,category,spots_available,description)&limit=1`,
          accessToken: params.caller.accessToken,
        });

        const idea = rows?.[0] || null;
        if (idea) {
          toolData.userIdea = idea;
        }
        await logToolCall({
          runId: params.runId,
          userId: params.caller.userId,
          toolName: 'get_user_idea',
          status: 'success',
          inputSummary: { ideaId: params.ideaId },
          outputSummary: { found: Boolean(idea) },
        });
      } catch (err) {
        await logToolCall({
          runId: params.runId,
          userId: params.caller.userId,
          toolName: 'get_user_idea',
          status: 'error',
          inputSummary: { ideaId: params.ideaId },
          outputSummary: { error: (err as Error).message },
        });
      }
    }
  }

  if (params.agent.allowedTools.includes('get_platform_analytics')) {
    const authorized = isToolAuthorizedForAgent(
      params.caller,
      params.agent,
      'get_platform_analytics'
    );
    if (!authorized) {
      await logToolCall({
        runId: params.runId,
        userId: params.caller.userId,
        toolName: 'get_platform_analytics',
        status: 'denied',
        inputSummary: {},
        outputSummary: { reason: 'Admin role required' },
      });
    } else {
      const snapshot = await supabaseRest<Record<string, unknown>>({
        path: 'rpc/admin_get_ai_analytics_snapshot',
        method: 'POST',
        body: {},
        accessToken: params.caller.accessToken,
      });
      toolData.platformAnalytics = snapshot;

      await logToolCall({
        runId: params.runId,
        userId: params.caller.userId,
        toolName: 'get_platform_analytics',
        status: 'success',
        inputSummary: {},
        outputSummary: { generated_at: snapshot?.generated_at ?? null },
      });
    }
  }

  return toolData;
}

export function getAgentToolDefinitions(
  caller: AuthenticatedCaller,
  agent: AgentDefinition
): ModelToolDefinition[] {
  const tools: ModelToolDefinition[] = [];

  if (agent.allowedTools.includes('navigate_to_ideora_page')) {
    tools.push({
      name: 'navigate_to_ideora_page',
      description:
        'Validate an official Ideora destination ID so the UI shows a clickable navigation card.',
      parameters: {
        type: 'object',
        properties: {
          destination: {
            type: 'string',
            description:
              'Destination ID (e.g. publish_idea, explore, people, dashboard, my_ideas, incoming_requests, sent_applications, projects, messages, notifications, profile, settings, feedback, ora_workspace, about, privacy, terms).',
          },
        },
        required: ['destination'],
      },
    });
  }

  if (agent.allowedTools.includes('get_user_workspace_context')) {
    tools.push({
      name: 'get_user_workspace_context',
      description:
        'Retrieve limited, authorized context about the current user: profile completeness, idea counts (published/drafts), pending collaboration requests, and unread message count. Call only when relevant to the user question.',
      parameters: {
        type: 'object',
        properties: {},
      },
    });
  }

  if (agent.allowedTools.includes('find_matching_builders_for_idea')) {
    tools.push({
      name: 'find_matching_builders_for_idea',
      description:
        'Find real, discoverable Ideora builders whose skills, preferred roles, and interests match an idea, role title, or list of required skills. Omit optional fields if not needed.',
      parameters: {
        type: 'object',
        properties: {
          ideaId: {
            type: ['string', 'null'],
            description: 'Optional ID of the caller’s idea to match open roles for.',
          },
          roleQuery: {
            type: ['string', 'null'],
            description: 'Optional target role title or specialty (e.g. "Unity Developer", "UI/UX Designer").',
          },
          skills: {
            type: ['array', 'null'],
            items: { type: 'string' },
            description: 'Optional list of desired skills or technologies (e.g. ["TypeScript", "React"]).',
          },
        },
      },
    });
  }

  if (agent.allowedTools.includes('find_matching_projects_for_user')) {
    tools.push({
      name: 'find_matching_projects_for_user',
      description:
        'Find published Ideora ideas with open collaboration roles matching the current user’s profile skills, interests, and preferred roles (or optional explicit skills/category). Omit optional fields if not needed.',
      parameters: {
        type: 'object',
        properties: {
          skills: {
            type: ['array', 'null'],
            items: { type: 'string' },
            description: 'Optional skills to match against open roles if overriding or supplementing profile skills.',
          },
          category: {
            type: ['string', 'null'],
            description: 'Optional project category filter (e.g. "Fintech", "Gaming", "AI").',
          },
        },
      },
    });
  }

  return tools;
}

export async function executeNavigationTool(params: {
  runId: string;
  caller: AuthenticatedCaller;
  agent: AgentDefinition;
  destination: string;
}): Promise<{
  approved: boolean;
  action?: VerifiedNavigationAction;
  message?: string;
}> {
  const authorized = isToolAuthorizedForAgent(
    params.caller,
    params.agent,
    'navigate_to_ideora_page'
  );

  if (!authorized) {
    await logToolCall({
      runId: params.runId,
      userId: params.caller.userId,
      toolName: 'navigate_to_ideora_page',
      status: 'denied',
      inputSummary: { destination: params.destination },
      outputSummary: { reason: 'Tool not authorized' },
    });
    return { approved: false, message: 'Navigation tool is not authorized for this agent.' };
  }

  const resolution = resolveIdeoraDestination({
    destination: params.destination,
    caller: params.caller,
  });

  if (!resolution.approved) {
    await logToolCall({
      runId: params.runId,
      userId: params.caller.userId,
      toolName: 'navigate_to_ideora_page',
      status: resolution.reason === 'unauthorized' ? 'denied' : 'error',
      inputSummary: { destination: params.destination },
      outputSummary: { reason: resolution.reason },
    });
    return { approved: false, message: resolution.message };
  }

  await logToolCall({
    runId: params.runId,
    userId: params.caller.userId,
    toolName: 'navigate_to_ideora_page',
    status: 'success',
    inputSummary: { destination: params.destination },
    outputSummary: { id: resolution.action.id, path: resolution.action.path },
  });

  return { approved: true, action: resolution.action };
}

export async function executeUserWorkspaceContextTool(params: {
  runId: string;
  caller: AuthenticatedCaller;
  agent: AgentDefinition;
}): Promise<Record<string, unknown>> {
  const authorized = isToolAuthorizedForAgent(
    params.caller,
    params.agent,
    'get_user_workspace_context'
  );
  if (!authorized) {
    await logToolCall({
      runId: params.runId,
      userId: params.caller.userId,
      toolName: 'get_user_workspace_context',
      status: 'denied',
      inputSummary: {},
      outputSummary: { reason: 'Tool not authorized' },
    });
    return { error: 'Tool not authorized' };
  }

  try {
    const uid = encodeURIComponent(params.caller.userId);
    const [profiles, ideas, requests, unreadMessages] = await Promise.all([
      supabaseRest<
        Array<{
          bio: string | null;
          skills: string[] | null;
          avatar_url: string | null;
          is_discoverable: boolean | null;
          role: string;
        }>
      >({
        path: `profiles?id=eq.${uid}&select=bio,skills,avatar_url,is_discoverable,role&limit=1`,
        accessToken: params.caller.accessToken,
      }),
      supabaseRest<Array<{ id: string; status: string }>>({
        path: `ideas?creator_id=eq.${uid}&deleted_at=is.null&select=id,status`,
        accessToken: params.caller.accessToken,
      }),
      supabaseRest<
        Array<{
          id: string;
          status: string;
          requester_id: string;
          recipient_id: string | null;
          idea: { creator_id: string } | null;
        }>
      >({
        path: `collaboration_requests?select=id,status,requester_id,recipient_id,idea:ideas(creator_id)`,
        accessToken: params.caller.accessToken,
      }),
      supabaseRest<Array<{ id: string }>>({
        path: `messages?sender_id=neq.${uid}&read_at=is.null&deleted_at=is.null&select=id`,
        accessToken: params.caller.accessToken,
      }),
    ]);

    const profileRow = profiles?.[0];
    const publishedIdeasCount = (ideas || []).filter((i) => i.status !== 'draft').length;
    const draftIdeasCount = (ideas || []).filter((i) => i.status === 'draft').length;

    const sentRequests = (requests || []).filter(
      (r) => r.requester_id === params.caller.userId
    );
    const incomingRequests = (requests || []).filter(
      (r) =>
        r.requester_id !== params.caller.userId &&
        (r.recipient_id === params.caller.userId ||
          r.idea?.creator_id === params.caller.userId)
    );

    const context = {
      role: params.caller.role,
      profileCompleted: Boolean(
        profileRow?.bio?.trim() &&
          Array.isArray(profileRow?.skills) &&
          profileRow.skills.length > 0
      ),
      hasAvatar: Boolean(profileRow?.avatar_url),
      isDiscoverable: Boolean(profileRow?.is_discoverable ?? true),
      publishedIdeasCount,
      draftIdeasCount,
      pendingIncomingRequestsCount: incomingRequests.filter(
        (r) => r.status === 'pending'
      ).length,
      pendingSentApplicationsCount: sentRequests.filter(
        (r) => r.status === 'pending'
      ).length,
      acceptedCollaborationsCount: [...sentRequests, ...incomingRequests].filter(
        (r) => r.status === 'accepted'
      ).length,
      unreadMessagesCount: (unreadMessages || []).length,
    };

    await logToolCall({
      runId: params.runId,
      userId: params.caller.userId,
      toolName: 'get_user_workspace_context',
      status: 'success',
      inputSummary: {},
      outputSummary: {
        publishedIdeasCount: context.publishedIdeasCount,
        unreadMessagesCount: context.unreadMessagesCount,
      },
    });

    return context;
  } catch (err) {
    await logToolCall({
      runId: params.runId,
      userId: params.caller.userId,
      toolName: 'get_user_workspace_context',
      status: 'error',
      inputSummary: {},
      outputSummary: { error: (err as Error).message },
    });
    return { error: 'Unable to retrieve workspace context right now.' };
  }
}

function tokenizeMatchTerms(values: string[]): Set<string> {
  const tokens = new Set<string>();
  for (const raw of values) {
    const norm = raw.trim().toLowerCase().replace(/[_/]+/g, ' ').replace(/\s+/g, ' ');
    if (!norm) continue;
    tokens.add(norm);
    for (const part of norm.split(/[\s,-]+/)) {
      if (part.length >= 2) tokens.add(part);
    }
  }
  return tokens;
}

function findOverlappingTerms(source: string[], targetTokens: Set<string>): string[] {
  const matched: string[] = [];
  const seen = new Set<string>();
  for (const item of source) {
    const norm = item.trim().toLowerCase();
    if (!norm || seen.has(norm)) continue;
    const itemTokens = tokenizeMatchTerms([item]);
    for (const tok of itemTokens) {
      if (targetTokens.has(tok)) {
        seen.add(norm);
        matched.push(item.trim());
        break;
      }
    }
  }
  return matched;
}

export async function executeFindMatchingBuildersTool(params: {
  runId: string;
  caller: AuthenticatedCaller;
  agent: AgentDefinition;
  ideaId?: string;
  roleQuery?: string;
  skills?: string[];
}): Promise<Record<string, unknown>> {
  const authorized = isToolAuthorizedForAgent(
    params.caller,
    params.agent,
    'find_matching_builders_for_idea'
  );
  if (!authorized) {
    await logToolCall({
      runId: params.runId,
      userId: params.caller.userId,
      toolName: 'find_matching_builders_for_idea',
      status: 'denied',
      inputSummary: { ideaId: params.ideaId ?? null },
      outputSummary: { reason: 'Tool not authorized' },
    });
    return { error: 'Tool not authorized' };
  }

  try {
    const targetTerms: string[] = [];
    if (params.roleQuery?.trim()) targetTerms.push(params.roleQuery.trim());
    if (Array.isArray(params.skills)) {
      targetTerms.push(...params.skills.filter((s) => typeof s === 'string' && s.trim()));
    }

    let ideaTitle: string | null = null;
    if (params.ideaId) {
      const ideaRows = await supabaseRest<
        Array<{
          id: string;
          title: string;
          category: string;
          tags: string[] | null;
          roles_needed?: Array<{
            role_title: string;
            category: string;
            spots_available: number;
            spots_filled: number;
            description: string | null;
          }>;
        }>
      >({
        path: `ideas?id=eq.${encodeURIComponent(
          params.ideaId
        )}&creator_id=eq.${encodeURIComponent(
          params.caller.userId
        )}&select=id,title,category,tags,roles_needed:idea_roles_needed(role_title,category,spots_available,spots_filled,description)&limit=1`,
        accessToken: params.caller.accessToken,
      });
      const idea = ideaRows?.[0];
      if (idea) {
        ideaTitle = idea.title;
        targetTerms.push(idea.category, ...(idea.tags || []));
        for (const r of idea.roles_needed || []) {
          if ((r.spots_filled ?? 0) < (r.spots_available ?? 1)) {
            targetTerms.push(r.role_title, r.category);
            if (r.description) targetTerms.push(r.description);
          }
        }
      }
    }

    const people = await supabaseRest<
      Array<{
        id: string;
        username: string;
        full_name: string;
        role: string;
        bio: string | null;
        skills: string[] | null;
        interests: string[] | null;
        preferred_roles: string[] | null;
        looking_to_contribute: string | null;
        is_discoverable: boolean;
      }>
    >({
      path: 'rpc/search_discoverable_people',
      method: 'POST',
      body: { p_limit: 50, p_offset: 0 },
      accessToken: params.caller.accessToken,
    });

    const targetTokens = tokenizeMatchTerms(targetTerms);
    const ranked = (people || [])
      .filter((p) => p.is_discoverable && p.id !== params.caller.userId)
      .map((p) => {
        const skills = p.skills || [];
        const interests = p.interests || [];
        const preferredRoles = p.preferred_roles || [];
        if (skills.length === 0 && interests.length === 0 && preferredRoles.length === 0) {
          return null;
        }

        const matchedSkills =
          targetTokens.size > 0 ? findOverlappingTerms(skills, targetTokens) : skills.slice(0, 3);
        const matchedRoles =
          targetTokens.size > 0 ? findOverlappingTerms(preferredRoles, targetTokens) : [];
        const matchedInterests =
          targetTokens.size > 0 ? findOverlappingTerms(interests, targetTokens) : [];

        const totalHits = matchedSkills.length + matchedRoles.length + matchedInterests.length;
        if (targetTokens.size > 0 && totalHits === 0) return null;

        const score =
          matchedSkills.length * 25 +
          matchedRoles.length * 22 +
          matchedInterests.length * 14 +
          (p.looking_to_contribute?.trim() ? 6 : 0);

        const distinctGroups =
          (matchedSkills.length > 0 ? 1 : 0) +
          (matchedRoles.length > 0 ? 1 : 0) +
          (matchedInterests.length > 0 ? 1 : 0);

        const tier =
          (matchedSkills.length > 0 || matchedRoles.length > 0) &&
          distinctGroups >= 2 &&
          totalHits >= 2
            ? 'Strong match'
            : matchedSkills.length > 0 || matchedRoles.length > 0 || totalHits >= 2
              ? 'Good match'
              : 'Relevant';

        const reasons: string[] = [];
        if (matchedSkills.length > 0) {
          reasons.push(`Matching skills: ${matchedSkills.slice(0, 3).join(', ')}`);
        }
        if (matchedRoles.length > 0) {
          reasons.push(`Preferred role aligns: ${matchedRoles.slice(0, 2).join(', ')}`);
        }
        if (matchedInterests.length > 0) {
          reasons.push(`Shared interest: ${matchedInterests.slice(0, 2).join(', ')}`);
        }
        if (p.looking_to_contribute?.trim()) {
          reasons.push('Actively looking to contribute');
        }

        return {
          fullName: p.full_name || p.username,
          username: p.username,
          profilePath: p.username ? `/profile/${p.username}` : '/people',
          role: p.role,
          bio: p.bio,
          tier,
          reasons,
          skills: skills.slice(0, 6),
          interests: interests.slice(0, 4),
          preferredRoles: preferredRoles.slice(0, 3),
          lookingToContribute: p.looking_to_contribute,
          _score: score,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b._score - a._score)
      .slice(0, 5)
      .map(({ _score: _, ...rest }) => rest);

    await logToolCall({
      runId: params.runId,
      userId: params.caller.userId,
      toolName: 'find_matching_builders_for_idea',
      status: 'success',
      inputSummary: { ideaId: params.ideaId ?? null, roleQuery: params.roleQuery ?? null },
      outputSummary: { matchCount: ranked.length },
    });

    return {
      ideaTitle,
      matches: ranked,
      matchPagePath: '/match',
    };
  } catch (err) {
    await logToolCall({
      runId: params.runId,
      userId: params.caller.userId,
      toolName: 'find_matching_builders_for_idea',
      status: 'error',
      inputSummary: { ideaId: params.ideaId ?? null },
      outputSummary: { error: (err as Error).message },
    });
    return { error: 'Unable to search matching builders right now.' };
  }
}

export async function executeFindMatchingProjectsTool(params: {
  runId: string;
  caller: AuthenticatedCaller;
  agent: AgentDefinition;
  skills?: string[];
  category?: string;
}): Promise<Record<string, unknown>> {
  const authorized = isToolAuthorizedForAgent(
    params.caller,
    params.agent,
    'find_matching_projects_for_user'
  );
  if (!authorized) {
    await logToolCall({
      runId: params.runId,
      userId: params.caller.userId,
      toolName: 'find_matching_projects_for_user',
      status: 'denied',
      inputSummary: {},
      outputSummary: { reason: 'Tool not authorized' },
    });
    return { error: 'Tool not authorized' };
  }

  try {
    const uid = encodeURIComponent(params.caller.userId);
    const [profiles, ideas] = await Promise.all([
      supabaseRest<
        Array<{
          skills: string[] | null;
          interests: string[] | null;
          preferred_roles: string[] | null;
        }>
      >({
        path: `profiles?id=eq.${uid}&select=skills,interests,preferred_roles&limit=1`,
        accessToken: params.caller.accessToken,
      }),
      supabaseRest<
        Array<{
          id: string;
          creator_id: string;
          title: string;
          slug: string;
          summary: string;
          category: string;
          collaboration_type: string;
          status: string;
          tags: string[] | null;
          roles_needed?: Array<{
            role_title: string;
            category: string;
            spots_available: number;
            spots_filled: number;
            description: string | null;
          }>;
        }>
      >({
        path: 'ideas?status=neq.draft&status=neq.archived&deleted_at=is.null&select=id,creator_id,title,slug,summary,category,collaboration_type,status,tags,roles_needed:idea_roles_needed(role_title,category,spots_available,spots_filled,description)&order=created_at.desc&limit=40',
        accessToken: params.caller.accessToken,
      }),
    ]);

    const profileRow = profiles?.[0];
    const explicitSkills = Array.isArray(params.skills)
      ? params.skills.filter((s) => typeof s === 'string' && s.trim())
      : [];
    const userSkills = Array.from(
      new Set([...(profileRow?.skills || []), ...explicitSkills])
    );
    const userInterests = profileRow?.interests || [];
    const userPreferredRoles = profileRow?.preferred_roles || [];

    if (
      userSkills.length === 0 &&
      userInterests.length === 0 &&
      userPreferredRoles.length === 0
    ) {
      await logToolCall({
        runId: params.runId,
        userId: params.caller.userId,
        toolName: 'find_matching_projects_for_user',
        status: 'success',
        inputSummary: { category: params.category ?? null },
        outputSummary: { profileIncomplete: true, matchCount: 0 },
      });
      return {
        profileIncomplete: true,
        matches: [],
        settingsPath: '/settings',
        matchPagePath: '/match',
      };
    }

    const skillAndRoleTokens = tokenizeMatchTerms([...userSkills, ...userPreferredRoles]);
    const interestTokens = tokenizeMatchTerms(userInterests);
    const categoryFilter = params.category?.trim().toLowerCase();

    const ranked = (ideas || [])
      .filter((i) => i.creator_id !== params.caller.userId)
      .filter((i) => !categoryFilter || i.category.toLowerCase().includes(categoryFilter))
      .map((idea) => {
        const openRoles = (idea.roles_needed || []).filter(
          (r) => (r.spots_filled ?? 0) < (r.spots_available ?? 1)
        );
        let bestRoleTitle: string | null = null;
        let bestRoleSpotsRemaining = 0;
        let bestRoleDescription: string | null = null;
        let bestRoleScore = 0;

        for (const r of openRoles) {
          const hits = findOverlappingTerms(
            [r.role_title, r.category, ...(r.description ? [r.description] : [])],
            skillAndRoleTokens
          );
          if (hits.length * 25 > bestRoleScore) {
            bestRoleScore = hits.length * 25;
            bestRoleTitle = r.role_title;
            bestRoleSpotsRemaining = Math.max(
              0,
              (r.spots_available ?? 1) - (r.spots_filled ?? 0)
            );
            bestRoleDescription = r.description;
          }
        }

        const otherOpenRoles = openRoles
          .filter((r) => r.role_title !== bestRoleTitle)
          .map((r) => r.role_title)
          .slice(0, 3);

        const ideaTags = [idea.category, ...(idea.tags || [])];
        const matchedSkills = findOverlappingTerms(ideaTags, skillAndRoleTokens);
        const matchedInterests = findOverlappingTerms(ideaTags, interestTokens);
        const totalHits =
          (bestRoleScore > 0 ? 1 : 0) + matchedSkills.length + matchedInterests.length;
        if (totalHits === 0) return null;

        const score =
          bestRoleScore + matchedSkills.length * 14 + matchedInterests.length * 16;
        const distinctGroups =
          (bestRoleScore > 0 || matchedSkills.length > 0 ? 1 : 0) +
          (matchedInterests.length > 0 ? 1 : 0);

        const tier =
          bestRoleScore > 0 && distinctGroups >= 2 && totalHits >= 2
            ? 'Strong match'
            : bestRoleScore > 0 || totalHits >= 2
              ? 'Good match'
              : 'Relevant';

        const reasons: string[] = [];
        if (bestRoleTitle) reasons.push(`Open role fit: ${bestRoleTitle}`);
        if (matchedSkills.length > 0) {
          reasons.push(`Matched keywords: ${matchedSkills.slice(0, 3).join(', ')}`);
        }
        if (matchedInterests.length > 0) {
          reasons.push(`Shared interest: ${matchedInterests.slice(0, 2).join(', ')}`);
        }

        return {
          title: idea.title,
          slug: idea.slug,
          ideaPath: `/ideas/${idea.slug}`,
          summary: idea.summary,
          category: idea.category,
          collaborationType: idea.collaboration_type,
          status: idea.status,
          bestOpenRole: bestRoleTitle,
          bestOpenRoleDescription: bestRoleDescription,
          spotsRemaining: bestRoleSpotsRemaining,
          otherOpenRoles,
          tier,
          reasons,
          _score: score,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b._score - a._score)
      .slice(0, 5)
      .map(({ _score: _, ...rest }) => rest);

    await logToolCall({
      runId: params.runId,
      userId: params.caller.userId,
      toolName: 'find_matching_projects_for_user',
      status: 'success',
      inputSummary: { category: params.category ?? null },
      outputSummary: { matchCount: ranked.length },
    });

    return {
      profileIncomplete: false,
      matches: ranked,
      matchPagePath: '/match',
    };
  } catch (err) {
    await logToolCall({
      runId: params.runId,
      userId: params.caller.userId,
      toolName: 'find_matching_projects_for_user',
      status: 'error',
      inputSummary: {},
      outputSummary: { error: (err as Error).message },
    });
    return { error: 'Unable to search matching projects right now.' };
  }
}

