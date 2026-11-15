import type {
  AiAgentId,
  AiConversationRecord,
  AiMessageRecord,
  AiScope,
  AuthenticatedCaller,
} from './types';
import { HttpError, supabaseRest } from './supabase-server';
import { getAgentById } from './agent-registry';
import { assertCallerAuthorizedForAgent } from './permissions';
import { enforceUsageLimits, getCallerUsageSummary, recordUsageEvent } from './usage-manager';
import {
  executeAgentTools,
  executeNavigationTool,
  executeUserWorkspaceContextTool,
  getAgentToolDefinitions,
} from './tool-executor';
import { buildConversationModelMessages } from './context-builder';
import { getModelProvider } from './model-provider';
import {
  resolveIdeoraDestination,
  type VerifiedNavigationAction,
} from '../navigation/registry';

const MAX_MESSAGE_LENGTH = 4000;

export interface OrchestrateChatInput {
  caller: AuthenticatedCaller;
  scope: AiScope;
  agentId: AiAgentId;
  message: string;
  conversationId?: string | null;
  ideaId?: string | null;
}

export async function orchestrateAiChat(input: OrchestrateChatInput) {
  const trimmed = (input.message || '').trim();
  if (!trimmed) {
    throw new HttpError(400, 'Message cannot be empty.');
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new HttpError(
      400,
      `Message exceeds the ${MAX_MESSAGE_LENGTH.toLocaleString()} character limit.`
    );
  }

  const agent = getAgentById(input.agentId);
  if (!agent) {
    throw new HttpError(400, `Unknown AI agent: ${input.agentId}`);
  }

  assertCallerAuthorizedForAgent(input.caller, agent, input.scope);
  await enforceUsageLimits(input.caller, input.scope);

  // 1. Resolve or create conversation (enforcing ownership + scope)
  let conversation: AiConversationRecord | null = null;

  if (input.conversationId) {
    const existing = await supabaseRest<AiConversationRecord[]>({
      path: `ai_conversations?id=eq.${encodeURIComponent(
        input.conversationId
      )}&user_id=eq.${encodeURIComponent(input.caller.userId)}&scope=eq.${
        input.scope
      }&limit=1`,
      accessToken: input.caller.accessToken,
    });
    conversation = existing?.[0] || null;
    if (!conversation) {
      throw new HttpError(404, 'Conversation not found or access denied.');
    }
  } else {
    const titlePreview =
      trimmed.length > 56 ? `${trimmed.slice(0, 56).trim()}...` : trimmed;
    const created = await supabaseRest<AiConversationRecord[]>({
      path: 'ai_conversations',
      method: 'POST',
      accessToken: input.caller.accessToken,
      prefer: 'return=representation',
      body: {
        user_id: input.caller.userId,
        scope: input.scope,
        agent_id: agent.id,
        idea_id: input.scope === 'public' ? input.ideaId || null : null,
        title: titlePreview,
      },
    });
    conversation = created?.[0] || null;
    if (!conversation) {
      throw new HttpError(500, 'Failed to create AI conversation.');
    }
  }

  const effectiveIdeaId = input.ideaId ?? conversation.idea_id;

  // 2. Persist user message
  const insertedUserMsgs = await supabaseRest<AiMessageRecord[]>({
    path: 'ai_messages',
    method: 'POST',
    accessToken: input.caller.accessToken,
    prefer: 'return=representation',
    body: {
      conversation_id: conversation.id,
      user_id: input.caller.userId,
      role: 'user',
      agent_id: agent.id,
      content: trimmed,
    },
  });
  const userMessage = insertedUserMsgs?.[0];

  // 3. Create execution run record
  const startedAt = Date.now();
  const createdRuns = await supabaseRest<Array<{ id: string }>>({
    path: 'ai_runs',
    method: 'POST',
    useServiceRole: true,
    prefer: 'return=representation',
    body: {
      conversation_id: conversation.id,
      user_id: input.caller.userId,
      scope: input.scope,
      agent_id: agent.id,
      status: 'running',
    },
  });
  const runId = createdRuns?.[0]?.id;
  if (!runId) {
    throw new HttpError(500, 'Failed to initialize AI execution run.');
  }

  try {
    // 4. Execute authorized tools (real DB queries only)
    const toolData = await executeAgentTools({
      runId,
      caller: input.caller,
      agent,
      ideaId: effectiveIdeaId,
    });

    // 5. Build conversation context & system prompt
    const modelMessages = await buildConversationModelMessages({
      conversationId: conversation.id,
      accessToken: input.caller.accessToken,
    });

    const systemPrompt = agent.buildSystemPrompt({
      callerName: input.caller.fullName || input.caller.username,
      caller: input.caller,
      toolData,
    });

    // 6. Call server-side ModelProvider with authorized tools
    const provider = getModelProvider();
    const modelTools = getAgentToolDefinitions(input.caller, agent);
    const collectedNavActions: VerifiedNavigationAction[] = [];
    let cachedWorkspaceContext: Record<string, unknown> | null = null;

    const addVerifiedNavAction = (action: VerifiedNavigationAction) => {
      if (!collectedNavActions.some((a) => a.id === action.id)) {
        collectedNavActions.push(action);
      }
    };

    const modelRes = await provider.generate({
      systemPrompt,
      messages: modelMessages,
      maxOutputTokens: input.scope === 'internal' ? 1600 : 1100,
      tools: modelTools,
      onToolCall: async (toolName, args) => {
        if (toolName === 'navigate_to_ideora_page') {
          const destination =
            typeof args.destination === 'string' ? args.destination : '';
          const navResult = await executeNavigationTool({
            runId,
            caller: input.caller,
            agent,
            destination,
          });
          if (navResult.approved && navResult.action) {
            addVerifiedNavAction(navResult.action);
          }
          return navResult;
        }

        if (toolName === 'get_user_workspace_context') {
          if (!cachedWorkspaceContext) {
            cachedWorkspaceContext = await executeUserWorkspaceContextTool({
              runId,
              caller: input.caller,
              agent,
            });
          }
          return cachedWorkspaceContext;
        }

        return { error: `Tool "${toolName}" is not available.` };
      },
    });

    // Provider-independent navigation fallback if model replied without calling tool
    if (
      collectedNavActions.length === 0 &&
      agent.allowedTools.includes('navigate_to_ideora_page') &&
      /\b(where|how do i|how can i|how to|take me|go to|open|navigate|find|check|edit|delete|report|submit|access|view)\b/i.test(
        trimmed
      )
    ) {
      const fallbackNav = resolveIdeoraDestination({
        destination: trimmed,
        caller: input.caller,
      });
      if (fallbackNav.approved) {
        addVerifiedNavAction(fallbackNav.action);
      }
    }

    // 7. Persist assistant response ONLY after successful model completion
    const assistantMetadata: Record<string, unknown> = {
      model: modelRes.model,
      runId,
    };
    if (toolData.platformAnalytics) {
      assistantMetadata.analyticsSnapshot = toolData.platformAnalytics;
    }
    if (collectedNavActions.length > 0) {
      assistantMetadata.navigationActions = collectedNavActions;
    }

    const insertedAssistantMsgs = await supabaseRest<AiMessageRecord[]>({
      path: 'ai_messages',
      method: 'POST',
      accessToken: input.caller.accessToken,
      prefer: 'return=representation',
      body: {
        conversation_id: conversation.id,
        user_id: input.caller.userId,
        role: 'assistant',
        agent_id: agent.id,
        content: modelRes.text,
        metadata: assistantMetadata,
      },
    });

    const assistantMessage = insertedAssistantMsgs?.[0];
    const nowIso = new Date().toISOString();

    await Promise.all([
      supabaseRest({
        path: `ai_conversations?id=eq.${encodeURIComponent(conversation.id)}`,
        method: 'PATCH',
        accessToken: input.caller.accessToken,
        body: {
          last_message_at: nowIso,
          updated_at: nowIso,
          ...(input.ideaId && !conversation.idea_id ? { idea_id: input.ideaId } : {}),
        },
      }),
      supabaseRest({
        path: `ai_runs?id=eq.${encodeURIComponent(runId)}`,
        method: 'PATCH',
        useServiceRole: true,
        body: {
          status: 'completed',
          model: modelRes.model,
          duration_ms: Date.now() - startedAt,
          completed_at: nowIso,
        },
      }),
      recordUsageEvent({
        userId: input.caller.userId,
        runId,
        scope: input.scope,
        agentId: agent.id,
        promptTokens: modelRes.promptTokens,
        completionTokens: modelRes.completionTokens,
        totalTokens: modelRes.totalTokens,
      }),
    ]);

    const usage = await getCallerUsageSummary(input.caller, input.scope);

    return {
      conversation: {
        ...conversation,
        last_message_at: nowIso,
        updated_at: nowIso,
      },
      userMessage,
      assistantMessage,
      usage,
    };
  } catch (err) {
    await supabaseRest({
      path: `ai_runs?id=eq.${encodeURIComponent(runId)}`,
      method: 'PATCH',
      useServiceRole: true,
      body: {
        status: 'failed',
        error_message: (err as Error).message.slice(0, 500),
        duration_ms: Date.now() - startedAt,
        completed_at: new Date().toISOString(),
      },
    }).catch(() => {});

    throw err;
  }
}

