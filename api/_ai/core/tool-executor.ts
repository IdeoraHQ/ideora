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

