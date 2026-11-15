import type { AgentDefinition, AiAgentId } from './types';
import { ideaDevelopmentAgent } from '../agents/public/idea-development.agent';
import { analyticsAgent } from '../agents/operations/analytics.agent';

const REGISTRY: Record<AiAgentId, AgentDefinition> = {
  idea_development: ideaDevelopmentAgent,
  analytics: analyticsAgent,
};

export function getAgentById(agentId: string): AgentDefinition | null {
  if (agentId === 'idea_development' || agentId === 'analytics') {
    return REGISTRY[agentId];
  }
  return null;
}

export function listAgentsForScope(scope: 'public' | 'internal'): AgentDefinition[] {
  return Object.values(REGISTRY).filter((a) => a.scope === scope);
}

