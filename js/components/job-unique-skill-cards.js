const escapeHtml = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

export function isJobUniqueSkillUnlocked(skill, character, jobId) {
  if (!skill?.unlockSkillId) return true;
  return (Number(character?.jobSkills?.[jobId]?.[skill.unlockSkillId]) || 0) > 0;
}

const renderMechanicsHtml = (skill, { compact = false, summary = false } = {}) => {
  const mechanics = Array.isArray(skill?.mechanics) ? skill.mechanics : [];
  if (!mechanics.length) return '';
  return `<dl class="${summary ? 'mt-1' : 'mt-2 rounded-lg border border-slate-700/55 bg-slate-950/50 p-1.5'} flex flex-col ${compact || summary ? 'gap-1' : 'gap-1.5'}" data-unique-mechanics>
    ${mechanics.map(item => `<div class="grid grid-cols-[${summary ? '48px' : compact ? '52px' : '60px'}_minmax(0,1fr)] gap-1.5 ${summary ? 'text-[8px]' : compact ? 'text-[9px]' : 'text-[10px]'} leading-relaxed">
      <dt class="font-black text-amber-300">${escapeHtml(item.label)}</dt>
      <dd class="font-bold text-slate-300">${escapeHtml(item.text)}</dd>
    </div>`).join('')}
  </dl>`;
};

export function renderJobUniqueSkillCards(job, character = null, { compact = false } = {}) {
  const skills = Array.isArray(job?.uniqueSkills) ? job.uniqueSkills : [];
  if (!skills.length) {
    return '<div class="flex min-h-28 items-center justify-center text-xs text-slate-500">固有スキルはありません</div>';
  }

  return `<div class="job-unique-skill-list flex flex-col ${compact ? 'gap-1.5' : 'gap-2.5'}" data-job-unique-skill-list="${escapeHtml(job.id)}">
    ${skills.map(skill => {
      const unlocked = isJobUniqueSkillUnlocked(skill, character, job.id);
      const modeLabel = skill.mode === 'command' ? 'コマンド' : '自動発動';
      return `
        <article class="job-unique-skill-card relative overflow-hidden rounded-xl border ${unlocked ? 'border-amber-400/40 bg-gradient-to-br from-amber-950/55 via-slate-900/90 to-cyan-950/35' : 'border-slate-700/60 bg-slate-900/70 opacity-70'} ${compact ? 'p-2' : 'p-3'} shadow-lg"
                 data-job-unique-skill="${escapeHtml(skill.id)}" data-unique-unlocked="${unlocked ? 'true' : 'false'}">
          <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,.13),transparent_50%)]"></div>
          <div class="relative z-10 flex items-start ${compact ? 'gap-2' : 'gap-3'}">
            <div class="flex ${compact ? 'h-9 w-9' : 'h-11 w-11'} shrink-0 items-center justify-center rounded-xl border ${unlocked ? 'border-amber-300/50 bg-amber-950/70 text-amber-200' : 'border-slate-600/50 bg-slate-950/70 text-slate-500'} shadow-inner">
              <span class="material-symbols-outlined ${compact ? 'text-[20px]' : 'text-[24px]'}" style="font-variation-settings:'FILL' 1">${escapeHtml(skill.icon)}</span>
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-1.5">
                <h3 class="${compact ? 'text-[12px]' : 'text-[13px]'} font-black tracking-wide ${unlocked ? 'text-amber-50' : 'text-slate-400'}">${escapeHtml(skill.name)}</h3>
                <span class="rounded border border-amber-500/35 bg-amber-950/60 px-1.5 py-px text-[8px] font-black tracking-wider text-amber-200">固有</span>
                <span class="rounded border border-cyan-600/30 bg-cyan-950/45 px-1.5 py-px text-[8px] font-bold text-cyan-200">${modeLabel}</span>
                ${unlocked ? '' : '<span class="rounded border border-slate-600/50 bg-slate-950/70 px-1.5 py-px text-[8px] font-black text-slate-400">未習得</span>'}
              </div>
              <p class="mt-1 ${compact ? 'text-[10px]' : 'text-[11px]'} font-bold leading-relaxed text-slate-200">${escapeHtml(skill.description)}</p>
              <div class="mt-1.5 flex flex-wrap items-center gap-1 text-[9px]">
                <span class="font-black text-amber-300">発動</span>
                <span class="text-slate-300">${escapeHtml(skill.activation)}</span>
              </div>
              <div class="mt-1 flex flex-wrap items-center gap-1">
                <span class="text-[8px] font-black text-cyan-400">連携</span>
                ${skill.sourceSkills.map(source => `<span class="rounded border border-slate-600/50 bg-slate-950/65 px-1.5 py-px text-[8px] font-bold text-slate-300">${escapeHtml(source)}</span>`).join('')}
              </div>
              ${renderMechanicsHtml(skill, { compact })}
            </div>
          </div>
        </article>`;
    }).join('')}
  </div>`;
}

export function renderJobUniqueSkillSummary(job) {
  const skills = Array.isArray(job?.uniqueSkills) ? job.uniqueSkills : [];
  if (!skills.length) return '';

  return `<div class="mt-2 rounded-lg border border-amber-500/20 bg-amber-950/20 px-2 py-1.5" data-job-unique-skill-summary="${escapeHtml(job.id)}">
    <div class="mb-1 flex items-center gap-1 text-[9px] font-black tracking-wider text-amber-300">
      <span class="material-symbols-outlined text-[13px]" style="font-variation-settings:'FILL' 1">stars</span>固有スキル
    </div>
    <div class="flex flex-col gap-1.5">
      ${skills.map(skill => `<div class="min-w-0">
        <div class="flex items-center gap-1.5">
          <span class="material-symbols-outlined shrink-0 text-[13px] text-amber-200" style="font-variation-settings:'FILL' 1">${escapeHtml(skill.icon)}</span>
          <span class="text-[10px] font-black text-amber-50">${escapeHtml(skill.name)}</span>
          <span class="rounded border border-cyan-600/25 bg-cyan-950/40 px-1 py-px text-[7px] font-black text-cyan-200">${skill.mode === 'command' ? 'コマンド' : '自動発動'}</span>
        </div>
        <div class="mt-0.5 pl-[19px] text-[9px] font-bold leading-relaxed text-slate-300">
          <span class="text-amber-300">発動：</span>${escapeHtml(skill.activation)}<span class="mx-1 text-slate-600">/</span>${escapeHtml(skill.description)}
        </div>
        <div class="pl-[19px]">${renderMechanicsHtml(skill, { summary: true })}</div>
      </div>`).join('')}
    </div>
  </div>`;
}
