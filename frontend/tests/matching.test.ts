import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assessBuilderProfileCompleteness,
  rankBuildersForRole,
  rankIdeasForBuilder,
} from '../src/utils/matching.ts';
import type { DiscoverablePerson, Idea, IdeaRoleNeeded } from '../src/types/index.js';

function makeIdea(overrides: Partial<Idea> = {}): Idea {
  return {
    id: 'idea-1',
    creator_id: 'founder-1',
    title: 'Street Basketball Game',
    slug: 'street-basketball-game',
    summary: 'Arcade 3v3 basketball game.',
    description: 'Building an online street basketball game with stylized 3D courts.',
    category: 'Gaming',
    collaboration_type: 'contributor',
    status: 'seeking_collaborators',
    moderation_status: 'approved',
    moderation_reason: null,
    tags: ['Unity', 'C#', '3D'],
    upvotes_count: 10,
    collaborators_count: 0,
    deleted_at: null,
    created_at: '2026-11-10T00:00:00Z',
    updated_at: '2026-11-10T00:00:00Z',
    rolesNeeded: [],
    ...overrides,
  };
}

function makeRole(overrides: Partial<IdeaRoleNeeded> = {}): IdeaRoleNeeded {
  return {
    id: 'role-1',
    idea_id: 'idea-1',
    role_title: 'Unity Developer',
    category: 'fullstack',
    spots_available: 1,
    spots_filled: 0,
    description: 'Gameplay engineering in Unity and C#',
    created_at: '2026-11-10T00:00:00Z',
    ...overrides,
  };
}

function makePerson(overrides: Partial<DiscoverablePerson> = {}): DiscoverablePerson {
  return {
    id: 'builder-1',
    username: 'alex',
    full_name: 'Alex Rivera',
    avatar_url: null,
    bio: 'Game programmer',
    role: 'collaborator',
    skills: ['Unity', 'C#'],
    interests: ['Gaming'],
    preferred_roles: ['Unity Developer'],
    looking_to_contribute: 'Available 10 hrs/week',
    collaboration_goals: 'Ship an indie game',
    github_url: null,
    linkedin_url: null,
    website_url: null,
    is_discoverable: true,
    created_at: '2026-11-01T00:00:00Z',
    published_ideas_count: 1,
    ...overrides,
  };
}

describe('Ideora Match — Deterministic Matching Engine', () => {
  it('ranks matching discoverable builders deterministically with explainable reasons', () => {
    const role = makeRole();
    const idea = makeIdea({ rolesNeeded: [role] });

    const strongBuilder = makePerson({
      id: 'builder-strong',
      full_name: 'Maya Lin',
      skills: ['Unity', 'C#', 'TypeScript'],
      interests: ['Gaming'],
      preferred_roles: ['Unity Developer'],
    });

    const partialBuilder = makePerson({
      id: 'builder-partial',
      full_name: 'Sam Lee',
      skills: ['Python'],
      interests: ['Gaming'],
      preferred_roles: [],
      looking_to_contribute: null,
      bio: null,
    });

    const first = rankBuildersForRole(idea, role, [partialBuilder, strongBuilder]);
    const second = rankBuildersForRole(idea, role, [partialBuilder, strongBuilder]);

    assert.deepEqual(first, second);
    assert.equal(first.length, 2);
    assert.equal(first[0].builder.id, 'builder-strong');
    assert.equal(first[0].tier, 'Strong match');
    assert.ok(
      first[0].reasons.some((r) => r.includes('Unity') && r.includes('C#')),
      'Expected matched skills in reasons'
    );
    assert.ok(
      first[0].reasons.some((r) => r.includes('Preferred role aligns')),
      'Expected preferred role signal in reasons'
    );
    assert.equal(first[1].builder.id, 'builder-partial');
    assert.equal(first[1].tier, 'Relevant');
  });

  it('excludes undiscoverable profiles, the idea creator, and incomplete profiles', () => {
    const role = makeRole();
    const idea = makeIdea({ creator_id: 'founder-1', rolesNeeded: [role] });

    const hiddenBuilder = makePerson({
      id: 'builder-hidden',
      is_discoverable: false,
    });
    const founderSelf = makePerson({
      id: 'founder-1',
      is_discoverable: true,
    });
    const emptyBuilder = makePerson({
      id: 'builder-empty',
      skills: [],
      interests: [],
      preferred_roles: [],
    });

    const matches = rankBuildersForRole(idea, role, [
      hiddenBuilder,
      founderSelf,
      emptyBuilder,
    ]);

    assert.equal(matches.length, 0);
  });

  it('flags incomplete profiles cleanly and returns no misleading project matches', () => {
    const completeness = assessBuilderProfileCompleteness({
      id: 'user-1',
      skills: [],
      interests: [],
      preferred_roles: [],
    });

    assert.equal(completeness.isIncomplete, true);
    assert.equal(completeness.hasAnySignals, false);
    assert.deepEqual(completeness.missingFields, [
      'skills',
      'interests',
      'preferred_roles',
    ]);

    const role = makeRole();
    const idea = makeIdea({ rolesNeeded: [role] });
    const matches = rankIdeasForBuilder(
      {
        id: 'user-1',
        skills: [],
        interests: [],
        preferred_roles: [],
        looking_to_contribute: null,
      },
      [idea]
    );

    assert.equal(matches.length, 0);
  });

  it('matches builders to open roles only and excludes filled roles, drafts, and own ideas', () => {
    const filledRole = makeRole({
      id: 'role-filled',
      role_title: 'Unity Developer',
      spots_available: 1,
      spots_filled: 1,
    });
    const openDesignerRole = makeRole({
      id: 'role-open',
      role_title: 'UI/UX Designer',
      category: 'design',
      description: 'Figma interface design',
      spots_available: 2,
      spots_filled: 1,
    });

    const matchingIdea = makeIdea({
      id: 'idea-open',
      rolesNeeded: [filledRole, openDesignerRole],
    });
    const draftIdea = makeIdea({
      id: 'idea-draft',
      status: 'draft',
      rolesNeeded: [openDesignerRole],
    });
    const ownIdea = makeIdea({
      id: 'idea-own',
      creator_id: 'builder-1',
      rolesNeeded: [openDesignerRole],
    });

    const matches = rankIdeasForBuilder(
      {
        id: 'builder-1',
        skills: ['Figma', 'UI/UX'],
        interests: ['Gaming'],
        preferred_roles: ['UI/UX Designer'],
        looking_to_contribute: 'Weekends',
      },
      [matchingIdea, draftIdea, ownIdea]
    );

    assert.equal(matches.length, 1);
    assert.equal(matches[0].idea.id, 'idea-open');
    assert.equal(matches[0].bestRole?.id, 'role-open');
    assert.equal(matches[0].tier, 'Strong match');
    assert.ok(matches[0].reasons.some((r) => r.includes('UI/UX Designer')));
  });
});

