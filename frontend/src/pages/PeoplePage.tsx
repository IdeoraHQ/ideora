import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Users,
  Sparkles,
  Lightbulb,
  ArrowRight,
  Compass,
  Briefcase,
  X,
  UserPlus,
} from 'lucide-react';
import { SeoHead } from '@/components/seo/SeoHead';
import { CustomSelect } from '@/components/common/CustomSelect';
import { DirectCollaborateModal, DirectCollaborateRecipient } from '@/components/collaborations/DirectCollaborateModal';
import { searchDiscoverablePeople } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { DiscoverablePerson } from '@/types';

const ROLE_FILTER_OPTIONS = [
  { label: 'All Roles', value: '' },
  { label: 'Collaborators / Builders', value: 'collaborator' },
  { label: 'Idea Founders', value: 'founder' },
  { label: 'Frontend Developer', value: 'Frontend' },
  { label: 'Backend Developer', value: 'Backend' },
  { label: 'Full-Stack Developer', value: 'Full-Stack' },
  { label: 'UI/UX Designer', value: 'UI/UX' },
  { label: 'Product Manager', value: 'Product' },
  { label: 'AI / ML Engineer', value: 'AI' },
  { label: 'Co-Founder', value: 'Co-Founder' },
];

const SKILL_FILTER_OPTIONS = [
  { label: 'All Skills', value: '' },
  { label: 'Frontend', value: 'frontend' },
  { label: 'Backend', value: 'backend' },
  { label: 'Fullstack', value: 'fullstack' },
  { label: 'UI/UX Design', value: 'design' },
  { label: 'Product', value: 'product' },
  { label: 'AI / ML', value: 'ai' },
  { label: 'Marketing / Growth', value: 'marketing' },
];

export const PeoplePage: React.FC = () => {
  const { profile, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [people, setPeople] = useState<DiscoverablePerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [interestFilter, setInterestFilter] = useState('');
  const [debouncedInterest, setDebouncedInterest] = useState('');

  const [modalRecipient, setModalRecipient] = useState<DirectCollaborateRecipient | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedInterest(interestFilter.trim()), 250);
    return () => clearTimeout(timer);
  }, [interestFilter]);

  const loadPeople = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchErr } = await searchDiscoverablePeople({
      search: debouncedSearch || undefined,
      skill: skillFilter || undefined,
      role: roleFilter || undefined,
      interest: debouncedInterest || undefined,
      limit: 48,
      offset: 0,
    });

    if (fetchErr) {
      setError(fetchErr.message || 'Unable to load builders right now.');
      setPeople([]);
    } else {
      setPeople(data);
    }
    setLoading(false);
  }, [debouncedSearch, skillFilter, roleFilter, debouncedInterest]);

  useEffect(() => {
    loadPeople();
  }, [loadPeople]);

  const hasActiveFilters = Boolean(search || skillFilter || roleFilter || interestFilter);

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setSkillFilter('');
    setRoleFilter('');
    setInterestFilter('');
    setDebouncedInterest('');
  };

  const handleCollaborateClick = (person: DiscoverablePerson) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setModalRecipient({
      id: person.id,
      full_name: person.full_name,
      username: person.username,
      avatar_url: person.avatar_url,
      skills: person.skills,
      preferred_roles: person.preferred_roles,
    });
  };

  return (
    <>
      <SeoHead
        title="Discover Builders & Collaborators | Ideora"
        description="Find developers, designers, founders, and collaborators on Ideora based on skills, interests, and collaboration goals — even before an idea is published."
        canonicalPath="/people"
      />

      <div className="min-h-screen bg-surface-soft py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-brand-ice px-3 py-1 text-xs font-semibold text-brand-royal">
                <Users className="h-3.5 w-3.5" />
                <span>People Discovery</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-typography-navy font-heading tracking-tight">
                Discover Builders & Collaborators
              </h1>
              <p className="text-sm sm:text-base text-typography-slate">
                Connect with people by skills, interests, and collaboration goals — whether or not they have published an idea yet.
              </p>
            </div>

            {isAuthenticated && (
              <Link
                to="/settings"
                className="inline-flex items-center gap-2 self-start md:self-auto rounded-xl border border-surface-border bg-surface-white px-4 py-2.5 text-xs font-semibold text-typography-navy hover:border-brand-royal/40 hover:bg-surface-light transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5 text-brand-royal" />
                Update Your Collaboration Profile
              </Link>
            )}
          </div>

          {/* Search & Filters */}
          <div className="rounded-2xl border border-surface-border bg-surface-white p-4 sm:p-5 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search by name or username */}
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-typography-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, @username, bio..."
                  aria-label="Search builders by name, username, or bio"
                  className="w-full rounded-xl border border-surface-border bg-surface-soft pl-10 pr-3.5 py-2.5 text-sm text-typography-navy placeholder:text-typography-muted focus:border-brand-royal focus:outline-none focus:ring-2 focus:ring-brand-royal/20"
                />
              </div>

              {/* Skill Filter */}
              <CustomSelect
                options={SKILL_FILTER_OPTIONS}
                value={skillFilter}
                onChange={setSkillFilter}
                placeholder="Filter by skill"
              />

              {/* Role Filter */}
              <CustomSelect
                options={ROLE_FILTER_OPTIONS}
                value={roleFilter}
                onChange={setRoleFilter}
                placeholder="Filter by preferred role"
              />

              {/* Interest Filter */}
              <div className="relative">
                <Compass className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-typography-muted" />
                <input
                  type="text"
                  value={interestFilter}
                  onChange={(e) => setInterestFilter(e.target.value)}
                  placeholder="Interest (e.g., FinTech, AI, EdTech)"
                  aria-label="Filter by area of interest"
                  className="w-full rounded-xl border border-surface-border bg-surface-soft pl-10 pr-3.5 py-2.5 text-sm text-typography-navy placeholder:text-typography-muted focus:border-brand-royal focus:outline-none focus:ring-2 focus:ring-brand-royal/20"
                />
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex items-center justify-between pt-1 text-xs text-typography-muted">
                <span>
                  Showing {people.length} {people.length === 1 ? 'builder' : 'builders'} matching your filters
                </span>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 font-medium text-brand-royal hover:underline"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear filters
                </button>
              </div>
            )}
          </div>

          {/* Content */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-surface-border bg-surface-white p-5 space-y-4 animate-pulse"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-surface-soft" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-32 rounded bg-surface-soft" />
                      <div className="h-3 w-20 rounded bg-surface-soft" />
                    </div>
                  </div>
                  <div className="h-10 rounded bg-surface-soft" />
                  <div className="flex gap-2">
                    <div className="h-6 w-16 rounded-lg bg-surface-soft" />
                    <div className="h-6 w-20 rounded-lg bg-surface-soft" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-functional-error/20 bg-functional-error-light p-8 text-center space-y-3">
              <p className="text-sm font-medium text-functional-error">{error}</p>
              <button
                type="button"
                onClick={loadPeople}
                className="rounded-xl bg-brand-royal px-4 py-2 text-xs font-semibold text-white hover:bg-brand-deep transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : people.length === 0 ? (
            <div className="rounded-2xl border border-surface-border bg-surface-white p-12 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-ice text-brand-royal">
                <Users className="h-6 w-6" />
              </div>
              <h2 className="text-base font-bold text-typography-navy font-heading">
                No builders match those criteria
              </h2>
              <p className="text-sm text-typography-slate max-w-md mx-auto">
                Try broadening your skill, role, or interest filters to discover more collaborators across Ideora.
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-royal px-4 py-2 text-xs font-semibold text-white hover:bg-brand-royal-hover transition-colors"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {people.map((person) => {
                const displayName = person.full_name || person.username || 'Ideora Builder';
                const initials = displayName.charAt(0).toUpperCase();
                const isSelf = profile?.id === person.id;
                const profileHref = person.username ? `/profile/${person.username}` : `/profile/${person.id}`;

                return (
                  <article
                    key={person.id}
                    className="flex flex-col justify-between rounded-2xl border border-surface-border bg-surface-white p-5 shadow-xs hover:border-brand-royal/30 transition-all"
                  >
                    <div className="space-y-4">
                      {/* Identity */}
                      <div className="flex items-start justify-between gap-3">
                        <Link to={profileHref} className="flex items-center gap-3 min-w-0 group">
                          {person.avatar_url ? (
                            <img
                              src={person.avatar_url}
                              alt={displayName}
                              className="h-12 w-12 rounded-full object-cover border border-surface-border shrink-0"
                            />
                          ) : (
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-ice text-brand-royal font-bold text-base">
                              {initials}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h2 className="text-sm font-bold text-typography-navy group-hover:text-brand-royal transition-colors truncate">
                              {displayName}
                            </h2>
                            {person.username && (
                              <p className="text-xs text-typography-muted truncate">
                                @{person.username}
                              </p>
                            )}
                          </div>
                        </Link>

                        {person.published_ideas_count > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-surface-soft border border-surface-border px-2 py-0.5 text-[11px] font-medium text-typography-slate shrink-0">
                            <Lightbulb className="h-3 w-3 text-brand-royal" />
                            {person.published_ideas_count}
                          </span>
                        )}
                      </div>

                      {/* Bio or Looking to Contribute */}
                      {(person.looking_to_contribute || person.bio) && (
                        <p className="text-xs text-typography-slate leading-relaxed line-clamp-3">
                          {person.looking_to_contribute || person.bio}
                        </p>
                      )}

                      {/* Preferred Roles */}
                      {person.preferred_roles && person.preferred_roles.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Briefcase className="h-3 w-3 text-typography-muted shrink-0" />
                          {person.preferred_roles.slice(0, 2).map((role) => (
                            <span
                              key={role}
                              className="rounded-md bg-brand-ice px-2 py-0.5 text-[11px] font-medium text-brand-royal"
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Skills */}
                      {person.skills && person.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {person.skills.slice(0, 4).map((skill) => (
                            <span
                              key={skill}
                              className="rounded-md border border-surface-border bg-surface-soft px-2 py-0.5 text-[11px] font-medium text-typography-navy"
                            >
                              {skill}
                            </span>
                          ))}
                          {person.skills.length > 4 && (
                            <span className="text-[11px] text-typography-muted self-center">
                              +{person.skills.length - 4}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Interests */}
                      {person.interests && person.interests.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-typography-muted">
                          <Compass className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            Interests: {person.interests.slice(0, 3).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-5 pt-4 border-t border-surface-border flex items-center justify-between gap-2">
                      <Link
                        to={profileHref}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-typography-slate hover:text-brand-royal transition-colors"
                      >
                        View Profile
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>

                      {!isSelf && (
                        <button
                          type="button"
                          onClick={() => handleCollaborateClick(person)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-royal px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-deep transition-colors"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          Collaborate
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <DirectCollaborateModal
        isOpen={Boolean(modalRecipient)}
        onClose={() => setModalRecipient(null)}
        recipient={modalRecipient}
      />
    </>
  );
};

