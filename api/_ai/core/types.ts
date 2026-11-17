import type { VerifiedNavigationAction } from '../navigation/registry';

export type AiScope = 'public' | 'internal';

export type AiAgentId = 'idea_development' | 'analytics';

export type AiToolName =
  | 'get_user_idea'
  | 'get_platform_analytics'
  | 'navigate_to_ideora_page'
  | 'get_user_workspace_context'
  | 'find_matching_builders_for_idea'
  | 'find_matching_projects_for_user';

export interface AuthenticatedCaller {
  userId: string;
  accessToken: string;
  role: 'founder' | 'collaborator' | 'admin';
  username: string;
  fullName: string;
  isAdmin: boolean;
  isActive: boolean;
}

export interface AiConversationRecord {
  id: string;
  user_id: string;
  scope: AiScope;
  agent_id: AiAgentId;
  idea_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

export interface AiMessageRecord {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  agent_id: string | null;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AgentDefinition {
  id: AiAgentId;
  name: string;
  description: string;
  scope: AiScope;
  requiredRole?: 'admin';
  allowedTools: AiToolName[];
  buildSystemPrompt: (context: {
    callerName: string;
    caller?: AuthenticatedCaller;
    toolData?: Record<string, unknown>;
  }) => string;
}

export interface ModelMessage {
  role: 'user' | 'model';
  text: string;
}

export interface ModelToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export type ModelToolCallHandler = (
  name: string,
  args: Record<string, unknown>
) => Promise<Record<string, unknown>>;

export interface ModelResponse {
  text: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  navigationActions?: VerifiedNavigationAction[];
}

export interface ModelProvider {
  generate(params: {
    systemPrompt: string;
    messages: ModelMessage[];
    maxOutputTokens?: number;
    temperature?: number;
    tools?: ModelToolDefinition[];
    onToolCall?: ModelToolCallHandler;
  }): Promise<ModelResponse>;
}

export interface UsageAllowance {
  scope: AiScope;
  dailyRequestLimit: number;
  dailyRequestsUsed: number;
  dailyRequestsRemaining: number;
  dailyTokenLimit: number;
  dailyTokensUsed: number;
  dailyTokensRemaining: number;
  rateLimitPerMinute: number;
}

export interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
}

export interface ApiResponse {
  status(code: number): ApiResponse;
  json(payload: unknown): void;
  setHeader(name: string, value: string): void;
  end(): void;
}

