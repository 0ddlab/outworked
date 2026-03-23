// Bundled skills — imported as raw strings via Vite's ?raw suffix
import githubRaw from '../basic-skills/github/SKILL.md?raw';
import mcporterRaw from '../basic-skills/mcporter/SKILL.md?raw';

import { AgentSkill } from './types';
import { parseSkill } from './skill-parser';

const BUNDLED_RAW: Record<string, string> = {
  github: githubRaw,
  mcporter: mcporterRaw,
};

let _cache: AgentSkill[] | null = null;

/**
 * Return all bundled skills, parsed from their SKILL.md files.
 * Results are cached after first call.
 */
export function getBundledSkills(): AgentSkill[] {
  if (_cache) return _cache;

  _cache = Object.entries(BUNDLED_RAW).map(([slug, raw]) => {
    const skill = parseSkill(raw);
    // Use a deterministic ID so bundled skills stay stable across reloads
    skill.id = `bundled:${slug}`;
    return skill;
  });

  return _cache;
}

/**
 * Get a single bundled skill by its slug (e.g. "github", "nano-pdf").
 */
export function getBundledSkill(slug: string): AgentSkill | undefined {
  return getBundledSkills().find((s) => s.id === `bundled:${slug}`);
}

/**
 * List available bundled skill slugs.
 */
export function listBundledSlugs(): string[] {
  return Object.keys(BUNDLED_RAW);
}
