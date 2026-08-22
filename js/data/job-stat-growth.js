export const JOB_GROWTH_STAT_DEFINITIONS = [
  { key: 'hp', label: 'HP', icon: 'favorite', tone: 'red' },
  { key: 'mp', label: 'MP', icon: 'water_drop', tone: 'blue' },
  { key: 'atk', label: 'ATK', icon: 'swords', tone: 'orange' },
  { key: 'def', label: 'DEF', icon: 'shield', tone: 'emerald' },
  { key: 'matk', label: 'MAT', icon: 'auto_fix_high', tone: 'fuchsia' },
  { key: 'mdef', label: 'MDF', icon: 'gpp_maybe', tone: 'indigo' },
  { key: 'spd', label: 'SPD', icon: 'speed', tone: 'amber' },
];

export function normalizeJobGrowthRange(value) {
  const source = Array.isArray(value) ? value : [value, value];
  const first = Math.max(0, Math.floor(Number(source[0]) || 0));
  const second = Math.max(0, Math.floor(Number(source[1]) || 0));
  return first <= second ? [first, second] : [second, first];
}

export function formatJobGrowthRange(value) {
  const [min, max] = normalizeJobGrowthRange(value);
  return min === max ? `+${min}` : `+${min}〜${max}`;
}

export function getJobGrowthStats(job) {
  return JOB_GROWTH_STAT_DEFINITIONS.map(definition => ({
    ...definition,
    range: normalizeJobGrowthRange(job?.statGrowth?.[definition.key]),
    displayValue: formatJobGrowthRange(job?.statGrowth?.[definition.key]),
  }));
}
