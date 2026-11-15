import type { AgentDefinition, AiScope, AiToolName, AuthenticatedCaller } from './types';
import { HttpError } from './supabase-server';

export const MAX_DELEGATION_DEPTH = 1;

export function assertCallerAuthorizedForScope(
  caller: AuthenticatedCaller,
  scope: AiScope
): void {
  if (!caller.isActive) {
    throw new HttpError(403, 'Account is not active.');
  }
  if (scope === 'internal' && !caller.isAdmin) {
    throw new HttpError(403, 'Administrator access is required for Operations AI.');
  }
}

export function assertCallerAuthorizedForAgent(
  caller: AuthenticatedCaller,
  agent: AgentDefinition,
  requestedScope: AiScope
): void {
  assertCallerAuthorizedForScope(caller, requestedScope);

  if (agent.scope !== requestedScope) {
    throw new HttpError(
      403,
      `Agent "${agent.id}" is not available in "${requestedScope}" scope.`
    );
  }

  if (agent.requiredRole === 'admin' && !caller.isAdmin) {
    throw new HttpError(
      403,
      'Unauthorized: this agent is restricted to administrators.'
    );
  }
}

export function isToolAuthorizedForAgent(
  caller: AuthenticatedCaller,
  agent: AgentDefinition,
  toolName: AiToolName
): boolean {
  if (!agent.allowedTools.includes(toolName)) {
    return false;
  }
  if (toolName === 'get_platform_analytics' && !caller.isAdmin) {
    return false;
  }
  return true;
}

