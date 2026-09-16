// Shared loader for sittings across all pages.
// Astro's import.meta.glob works only at build time, so this file is imported
// from Astro page frontmatter; do not import it into React components.

import type { Mla, Sitting } from '../types';

const sittingModules = import.meta.glob<{ default: Sitting }>(
  '../../data/sittings/*.json',
  { eager: true },
);

export const allSittings: Sitting[] = Object.values(sittingModules)
  .map(mod => (mod.default ?? (mod as unknown as Sitting)))
  .sort((a, b) => a.date.localeCompare(b.date));

export function sittingByDate(date: string): Sitting | undefined {
  return allSittings.find(s => s.date === date);
}

import mlasJson from '../../data/mlas.json';
export const allMlas: Mla[] = mlasJson as Mla[];

export function mlaById(id: string): Mla | undefined {
  return allMlas.find(m => m.mla_id === id);
}
