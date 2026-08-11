import { JOBS } from '../../jobs/index.js';
import { resolveJobSkillLevelConfig } from '../../utils/job-skill-potency.js';
import { STANDARD_JOB_GAUGES } from './job-gauge-system.js';

const makeStandardResourceDefinition = gauge => Object.freeze({
  label: gauge.label,
  icon: gauge.icon,
  description: gauge.description,
  valueField: gauge.field,
  fixedMax: gauge.max,
  initial: gauge.initial ?? 0,
  continuous: gauge.max > 10,
  panelClass: 'border-amber-400/35 bg-gradient-to-r from-amber-950/70 via-slate-950/55 to-cyan-950/45',
  textClass: 'text-amber-100',
  mutedClass: 'text-amber-300/60',
  slotClass: 'border-amber-300/25 bg-slate-950/80',
  filledClass: 'border-amber-100 bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.75)]'
});

const STANDARD_JOB_RESOURCE_DEFINITIONS = Object.freeze(Object.fromEntries(
  Object.entries(STANDARD_JOB_GAUGES).map(([jobId, gauge]) => [jobId, makeStandardResourceDefinition(gauge)])
));

/**
 * Battle resources that belong to a specific current job.
 *
 * Keeping the presentation metadata here makes adding another job resource a
 * single, explicit change instead of spreading job checks throughout the HUD.
 */
const JOB_RESOURCE_DEFINITIONS = Object.freeze({
  ...STANDARD_JOB_RESOURCE_DEFINITIONS,
  entertainer: Object.freeze({
    label: '舞台熱',
    icon: 'theater_comedy',
    valueField: '_entertainerHype',
    skillId: 'showstopper',
    maxField: 'maxHype',
    panelClass: 'border-fuchsia-400/35 bg-gradient-to-r from-fuchsia-950/70 via-purple-950/45 to-slate-950/70',
    textClass: 'text-fuchsia-200',
    mutedClass: 'text-fuchsia-300/60',
    slotClass: 'border-fuchsia-300/30 bg-fuchsia-950/80',
    filledClass: 'border-fuchsia-200 bg-fuchsia-400 shadow-[0_0_5px_rgba(232,121,249,0.8)]'
  }),
  mana_conductor: Object.freeze({
    label: '共鳴',
    icon: 'hub',
    valueField: '_conductorHarmony',
    skillId: 'conductor_core',
    maxField: 'maxHarmony',
    panelClass: 'border-violet-400/35 bg-gradient-to-r from-violet-950/70 via-indigo-950/45 to-slate-950/70',
    textClass: 'text-violet-200',
    mutedClass: 'text-violet-300/60',
    slotClass: 'border-violet-300/30 bg-violet-950/80',
    filledClass: 'border-violet-200 bg-violet-400 shadow-[0_0_5px_rgba(167,139,250,0.8)]'
  }),
  slime_singer: Object.freeze({
    label: '音符',
    fullLabel: 'ぷるぷる音符',
    icon: 'music_note',
    valueField: '_slimeSingerNotes',
    skillId: 'resonant_gel',
    maxField: 'maxNotes',
    panelClass: 'border-cyan-400/35 bg-gradient-to-r from-cyan-950/70 via-sky-950/45 to-slate-950/70',
    textClass: 'text-cyan-200',
    mutedClass: 'text-cyan-300/60',
    slotClass: 'border-cyan-300/30 bg-cyan-950/80',
    filledClass: 'border-cyan-100 bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.8)]'
  }),
  dragoon: Object.freeze({
    label: '竜気',
    icon: 'air',
    valueField: '_dragoonSpirit',
    skillId: 'dragon_heart',
    maxField: 'maxDragonSpirit',
    panelClass: 'border-sky-400/35 bg-gradient-to-r from-sky-950/70 via-blue-950/45 to-slate-950/70',
    textClass: 'text-sky-200',
    mutedClass: 'text-sky-300/60',
    slotClass: 'border-sky-300/30 bg-sky-950/80',
    filledClass: 'border-sky-100 bg-sky-400 shadow-[0_0_5px_rgba(56,189,248,0.8)]'
  }),
  shinra_sage: Object.freeze({
    label: '三界印',
    icon: 'nature',
    valueField: '_shinraSigils',
    values: Object.freeze([
      Object.freeze({ id: 'grass', label: '草' }),
      Object.freeze({ id: 'wind', label: '風' }),
      Object.freeze({ id: 'earth', label: '土' })
    ]),
    panelClass: 'border-emerald-400/35 bg-gradient-to-r from-emerald-950/70 via-lime-950/35 to-slate-950/70',
    textClass: 'text-emerald-200',
    mutedClass: 'text-emerald-300/60',
    slotClass: 'border-emerald-300/30 bg-emerald-950/80',
    filledClass: 'border-lime-100 bg-emerald-400 text-emerald-950 shadow-[0_0_5px_rgba(52,211,153,0.8)]'
  }),
  soul_reaper: Object.freeze({
    label: '亡骸',
    icon: 'skull',
    valueField: '_soulReaperCorpses',
    fixedMax: 5,
    panelClass: 'border-cyan-300/35 bg-gradient-to-r from-violet-950/75 via-slate-950/55 to-cyan-950/60',
    textClass: 'text-cyan-100',
    mutedClass: 'text-violet-300/60',
    slotClass: 'border-violet-300/30 bg-slate-950/80',
    filledClass: 'border-cyan-100 bg-violet-500 shadow-[0_0_6px_rgba(34,211,238,0.85)]'
  })
});

function getCurrentSkillConfig(entity, definition) {
  const jobId = entity?.jobId || entity?.job;
  if (!jobId || !definition.skillId) return null;

  const cached = entity?._skillCache?.get?.(definition.skillId);
  if (cached?.levelConfig && cached.jobId === jobId && !cached.isInherited) {
    return cached.levelConfig;
  }

  const level = Number(entity?.jobSkills?.[jobId]?.[definition.skillId]) || 0;
  if (level <= 0) return null;
  const skillDef = JOBS[jobId]?.skills?.find(skill => skill.id === definition.skillId);
  return resolveJobSkillLevelConfig(skillDef, level, 'current');
}

const normalizeCount = value => Math.max(0, Math.floor(Number(value) || 0));

export function getJobResourceState(entity) {
  const jobId = entity?.jobId || entity?.job;
  const definition = JOB_RESOURCE_DEFINITIONS[jobId];
  if (!definition) return null;

  if (definition.values) {
    const rawValues = Array.isArray(entity?.[definition.valueField]) ? entity[definition.valueField] : [];
    const activeValues = new Set(rawValues.filter(value => definition.values.some(slot => slot.id === value)));
    const slots = definition.values.map(slot => ({ ...slot, filled: activeValues.has(slot.id) }));
    return {
      jobId,
      definition,
      current: slots.filter(slot => slot.filled).length,
      max: slots.length,
      unlocked: true,
      slots
    };
  }

  const levelConfig = getCurrentSkillConfig(entity, definition);
  const max = normalizeCount(definition.fixedMax || levelConfig?.[definition.maxField]);
  const current = Math.min(max, normalizeCount(entity?.[definition.valueField] ?? definition.initial));
  return {
    jobId,
    definition,
    current,
    max,
    unlocked: max > 0,
    fillPercent: max > 0 ? Math.min(100, current / max * 100) : 0,
    slots: definition.continuous ? [] : Array.from({ length: max }, (_, index) => ({
      id: String(index + 1),
      label: '',
      filled: index < current
    }))
  };
}

export function getJobResourceSignature(state) {
  if (!state) return '';
  return `${state.jobId}:${state.unlocked ? 1 : 0}:${state.current}/${state.max}:${state.fillPercent || 0}:${state.slots.map(slot => slot.filled ? 1 : 0).join('')}`;
}

export function renderJobResourceContentHtml(state) {
  if (!state) return '';
  const { definition, current, max, unlocked, slots, fillPercent = 0 } = state;
  const accessibleLabel = definition.fullLabel || definition.label;
  const valueText = unlocked ? `${current}/${max}` : '未開放';
  const columnCount = Math.max(1, slots.length);

  return `
    <div class="relative z-10 flex h-full min-w-0 items-center gap-0.5 leading-none">
      <span class="material-symbols-outlined shrink-0 ${definition.textClass} drop-shadow-[0_0_4px_currentColor]" style="font-size: 9px; font-variation-settings: 'FILL' 1">${definition.icon}</span>
      <span class="max-w-[24px] shrink-0 truncate text-[7px] font-black tracking-tight ${definition.textClass}">${definition.label}</span>
      ${unlocked && definition.continuous ? `
        <div class="relative h-[7px] min-w-[8px] flex-1 overflow-hidden rounded-[2px] border ${definition.slotClass}" aria-hidden="true">
          <span class="absolute inset-y-0 left-0 ${definition.filledClass}" style="width:${fillPercent}%"></span>
        </div>
      ` : unlocked ? `
        <div class="grid min-w-[8px] flex-1 gap-px" style="grid-template-columns: repeat(${columnCount}, minmax(0, 1fr));" aria-hidden="true">
          ${slots.map(slot => `
            <span data-job-resource-slot="${slot.id}" data-resource-filled="${slot.filled ? 'true' : 'false'}" class="flex h-[7px] min-w-0 items-center justify-center rounded-[2px] border text-[5px] font-black leading-none ${slot.filled ? definition.filledClass : definition.slotClass}">${slot.label}</span>
          `).join('')}
        </div>
      ` : `
        <span class="h-px min-w-[6px] flex-1 bg-gradient-to-r from-transparent via-slate-600/40 to-transparent" aria-hidden="true"></span>
      `}
      <span data-job-resource-value class="shrink-0 text-[7px] font-black tabular-nums tracking-tighter ${unlocked ? definition.textClass : definition.mutedClass}">${valueText}</span>
      <span class="sr-only">${accessibleLabel} ${valueText}</span>
    </div>
  `;
}

export function renderJobResourceHtml(entity) {
  const state = getJobResourceState(entity);
  if (!state) {
    return `
      <div class="job-resource-shell relative flex h-[18px] shrink-0 items-center overflow-hidden rounded-[4px] border border-white/[0.04] bg-slate-950/20 px-1"
           data-job-resource-shell data-has-job-resource="false" aria-hidden="true">
        <span class="h-px flex-1 bg-gradient-to-r from-transparent via-slate-600/20 to-slate-700/10"></span>
        <span class="mx-1 h-1 w-1 rotate-45 rounded-[1px] border border-slate-600/25 bg-slate-800/30"></span>
        <span class="h-px flex-1 bg-gradient-to-l from-transparent via-slate-600/20 to-slate-700/10"></span>
      </div>
    `;
  }
  const accessibleLabel = state.definition.fullLabel || state.definition.label;
  return `
    <div class="job-resource-shell job-resource-container relative h-[18px] shrink-0 overflow-hidden rounded-[4px] border px-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${state.definition.panelClass}"
         data-job-resource-shell
         data-has-job-resource="true"
         data-job-resource="${state.jobId}"
         data-resource-signature="${getJobResourceSignature(state)}"
         title="${state.definition.description || accessibleLabel}"
         role="status"
         aria-label="${accessibleLabel} ${state.unlocked ? `${state.current}/${state.max}` : '未開放'}">
      <span class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" aria-hidden="true"></span>
      ${renderJobResourceContentHtml(state)}
    </div>
  `;
}
