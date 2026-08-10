/**
 * Lightweight, session-only battle statistics telemetry.
 *
 * Hot-path rules:
 * - statistics are incremented when an event happens (no history rescans)
 * - only party members are retained (enemy instances never accumulate)
 * - DOM work is requested only while the Statistics tab is visible
 */

const STAT_RENDER_INTERVAL = 800;

const now = () => globalThis.performance?.now?.() ?? Date.now();

const escapeHtml = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const compactNumber = value => {
  const amount = Math.max(0, Math.floor(Number(value) || 0));
  if (amount < 10000) return amount.toLocaleString('ja-JP');
  if (amount < 100000000) return `${(amount / 10000).toFixed(amount < 100000 ? 1 : 0)}万`;
  return `${(amount / 100000000).toFixed(amount < 1000000000 ? 1 : 0)}億`;
};

const entityName = entity => entity?.name || entity?.displayName || '不明';
const isPartyEntity = entity => Boolean(entity?.hp);
const entityKey = entity => {
  if (!entity) return 'system';
  return `party:${entity.id || entity.elementId || entityName(entity)}`;
};

const normalizeSkill = skill => ({
  id: skill?.id || 'other',
  name: skill?.name || 'その他の効果',
  type: skill?.type === 'passive' || skill?.isPassive ? 'passive' : (skill?.type || 'active'),
  icon: skill?.icon || (skill?.id === 'normal_attack' ? 'swords' : 'auto_awesome')
});

const recordAmount = (metric, prefix, amount) => {
  metric[prefix] += amount;
};

const recordActivation = metric => {
  metric.activations += 1;
};

export class BattleTelemetry {
  constructor({ onChange = null } = {}) {
    this.startedAt = now();
    this.actorStats = new Map();
    this.recentSkillEvents = new Map();
    this.onChange = onChange;
  }

  elapsedMs() {
    return Math.max(0, now() - this.startedAt);
  }

  _notify() {
    this.onChange?.();
  }

  _ensureActor(entity) {
    if (!entity || !isPartyEntity(entity)) return null;
    const key = entityKey(entity);
    let stat = this.actorStats.get(key);
    if (!stat) {
      stat = {
        key,
        entityId: entity.id || entity.uniqueId || entity.elementId,
        name: entityName(entity),
        isParty: isPartyEntity(entity),
        actions: 0,
        damageDealt: 0,
        damageDealtEvents: 0,
        maxDamageDealt: 0,
        damageTaken: 0,
        damageTakenEvents: 0,
        maxDamageTaken: 0,
        healingDone: 0,
        healingDoneEvents: 0,
        maxHealingDone: 0,
        healingReceived: 0,
        healingReceivedEvents: 0,
        maxHealingReceived: 0,
        mpRestored: 0,
        mpRestoredEvents: 0,
        maxMpRestored: 0,
        prevented: 0,
        preventedEvents: 0,
        maxPrevented: 0,
        skills: new Map()
      };
      this.actorStats.set(key, stat);
    } else if (stat.name !== entityName(entity)) {
      stat.name = entityName(entity);
    }
    return stat;
  }

  _ensureSkill(stat, skill) {
    if (!stat) return null;
    const normalized = normalizeSkill(skill);
    let metric = stat.skills.get(normalized.id);
    if (!metric) {
      metric = {
        ...normalized,
        activations: 0,
        damage: 0,
        healing: 0,
        mpRestored: 0,
        prevented: 0
      };
      stat.skills.set(normalized.id, metric);
    }
    return metric;
  }

  recordAction(actor, skill) {
    if (!actor || !isPartyEntity(actor)) return;
    const normalized = normalizeSkill(skill);
    const stat = this._ensureActor(actor);
    const metric = this._ensureSkill(stat, normalized);
    stat.actions += 1;
    const eventTime = now();
    recordActivation(metric);
    this.recentSkillEvents.set(`${stat.key}:${normalized.id}`, eventTime);
    this._notify();
  }

  recordEffect(actor, skill) {
    if (!actor || !isPartyEntity(actor)) return false;
    const normalized = normalizeSkill(skill);
    const stat = this._ensureActor(actor);
    const signature = `${stat.key}:${normalized.id}`;
    const eventTime = now();
    // executeSkill records the active skill immediately before its label popup.
    if (eventTime - (this.recentSkillEvents.get(signature) || -Infinity) < 80) return false;
    const metric = this._ensureSkill(stat, normalized);
    recordActivation(metric);
    this.recentSkillEvents.set(signature, eventTime);
    this._notify();
    return true;
  }

  recordDamage(source, target, amount, skill) {
    const dealt = Math.max(0, Math.floor(Number(amount) || 0));
    if (!target || dealt <= 0) return;
    let changed = false;
    const targetStat = isPartyEntity(target) ? this._ensureActor(target) : null;
    if (targetStat) {
      targetStat.damageTaken += dealt;
      targetStat.damageTakenEvents += 1;
      targetStat.maxDamageTaken = Math.max(targetStat.maxDamageTaken, dealt);
      changed = true;
    }

    if (source && isPartyEntity(source)) {
      const sourceStat = this._ensureActor(source);
      sourceStat.damageDealt += dealt;
      sourceStat.damageDealtEvents += 1;
      sourceStat.maxDamageDealt = Math.max(sourceStat.maxDamageDealt, dealt);
      recordAmount(this._ensureSkill(sourceStat, skill), 'damage', dealt);
      changed = true;
    }
    if (changed) this._notify();
  }

  recordRecovery(source, target, amount, skill, resource = 'hp') {
    const restored = Math.max(0, Math.floor(Number(amount) || 0));
    if (!target || restored <= 0) return;
    const targetStat = isPartyEntity(target) ? this._ensureActor(target) : null;
    const sourceEntity = source && isPartyEntity(source) ? source : (targetStat ? target : null);
    const sourceStat = sourceEntity ? this._ensureActor(sourceEntity) : null;
    const metric = sourceStat ? this._ensureSkill(sourceStat, skill) : null;
    if (!targetStat && !sourceStat) return;

    if (resource === 'mp') {
      if (sourceStat) {
        sourceStat.mpRestored += restored;
        sourceStat.mpRestoredEvents += 1;
        sourceStat.maxMpRestored = Math.max(sourceStat.maxMpRestored, restored);
      }
      if (metric) recordAmount(metric, 'mpRestored', restored);
    } else {
      if (sourceStat) {
        sourceStat.healingDone += restored;
        sourceStat.healingDoneEvents += 1;
        sourceStat.maxHealingDone = Math.max(sourceStat.maxHealingDone, restored);
      }
      if (targetStat) {
        targetStat.healingReceived += restored;
        targetStat.healingReceivedEvents += 1;
        targetStat.maxHealingReceived = Math.max(targetStat.maxHealingReceived, restored);
      }
      if (metric) recordAmount(metric, 'healing', restored);
    }
    this._notify();
  }

  recordPrevented(provider, target, amount, skill) {
    const prevented = Math.max(0, Math.floor(Number(amount) || 0));
    if (!target || prevented <= 0) return;
    const providerEntity = provider || target;
    const stat = this._ensureActor(providerEntity);
    if (!stat) return;
    stat.prevented += prevented;
    stat.preventedEvents += 1;
    stat.maxPrevented = Math.max(stat.maxPrevented, prevented);
    recordAmount(this._ensureSkill(stat, skill), 'prevented', prevented);
    this._notify();
  }

  getPartyStats(party = []) {
    party.forEach(entity => this._ensureActor(entity));
    const order = new Map(party.map((entity, index) => [entityKey(entity), index]));
    return [...this.actorStats.values()]
      .sort((a, b) => (order.get(a.key) ?? 999) - (order.get(b.key) ?? 999));
  }

  getTotals(party = []) {
    return this.getPartyStats(party).reduce((total, stat) => {
      total.damageDealt += stat.damageDealt;
      total.damageTaken += stat.damageTaken;
      total.healingDone += stat.healingDone;
      total.prevented += stat.prevented;
      return total;
    }, { damageDealt: 0, damageTaken: 0, healingDone: 0, prevented: 0 });
  }
}

export function findBattleEntity(manager, elementId) {
  if (!elementId) return null;
  for (const entity of manager.party || []) {
    if (entity.elementId === elementId) return entity;
  }
  for (const entity of manager.enemies || []) {
    if (entity.elementId === elementId) return entity;
  }
  return null;
}

export function resolveBattleSkill(manager, actor, actionName, options = {}) {
  if (options.telemetrySkill) return normalizeSkill(options.telemetrySkill);
  if (options.telemetrySkillId && actor?._skillCache) {
    const found = actor._skillCache.get(options.telemetrySkillId);
    if (found?.def) return normalizeSkill(found.def);
  }
  if (actor?._skillCache && actionName) {
    for (const [id, data] of actor._skillCache.entries()) {
      if (data?.def?.name === actionName || id === actionName) return normalizeSkill(data.def);
    }
  }
  if (actionName && actionName !== '攻撃' && !options.damageType) {
    return normalizeSkill({ id: `action:${actionName}`, name: actionName, type: 'effect' });
  }
  if ((options.damageType === 'skill' || options.damageType === 'ability') && actor?._lastBattleTelemetrySkill) {
    return normalizeSkill(actor._lastBattleTelemetrySkill);
  }
  return normalizeSkill({
    id: options.damageType ? `action:${actionName || options.damageType}` : 'normal_attack',
    name: actionName || (options.damageType ? '特殊効果' : '通常攻撃'),
    type: options.damageType === 'ability' ? 'passive' : 'active'
  });
}

export function captureBattleActionLabel(manager, elementId, actionName) {
  const actor = findBattleEntity(manager, elementId);
  if (!actor || !actionName || actionName === '攻撃') return;
  const skill = resolveBattleSkill(manager, actor, actionName);
  const capturedAt = now();
  manager._battleTelemetryEffect = { actor, skill, capturedAt };
  if (isPartyEntity(actor) && skill.id.startsWith('action:')) return;
  manager.battleTelemetry?.recordEffect(actor, skill);
}

export function captureBattlePopup(manager, elementId, value) {
  const target = findBattleEntity(manager, elementId);
  if (!target) return;
  const text = String(value ?? '');
  const capturedAt = now();
  const contexts = [manager._battleTelemetryEffect, manager._battleTelemetryAction]
    .filter(context => context && capturedAt - context.capturedAt < 1800)
    .sort((a, b) => b.capturedAt - a.capturedAt);
  const freshContext = contexts[0] || null;

  const barrier = text.match(/^(?:BARRIER|GAIA)\s*\+([\d,]+)/i);
  if (barrier) {
    target._battleBarrierMetric = freshContext
      ? { actor: freshContext.actor, skill: freshContext.skill }
      : { actor: target, skill: normalizeSkill({ id: 'barrier', name: 'バリア', type: 'active' }) };
    return;
  }

  const recovery = text.match(/^\+([\d,]+)(?:\s*(MP))?$/i);
  if (!recovery) return;
  const amount = Number(recovery[1].replaceAll(',', ''));
  const resource = recovery[2] ? 'mp' : 'hp';
  const source = freshContext?.actor || target;
  const skill = freshContext?.skill || { id: resource === 'mp' ? 'mp_recovery' : 'hp_recovery', name: resource === 'mp' ? 'MP回復' : 'HP回復' };
  manager.battleTelemetry?.recordRecovery(source, target, amount, skill, resource);
}

const ratePerMinute = (count, elapsedMs) => count / Math.max(elapsedMs / 60000, 1 / 60);
const formatDecimal = value => Number(value || 0).toFixed(value >= 100 ? 0 : 1);
const formatSeconds = milliseconds => {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return '—';
  const seconds = milliseconds / 1000;
  return seconds >= 60 ? `${formatDecimal(seconds / 60)}分` : `${formatDecimal(seconds)}秒`;
};
const formatPercent = value => `${Math.max(0, Number(value) || 0).toFixed(1)}%`;

function getJobDisplay(manager, stat) {
  const character = (manager.party || []).find(member => entityKey(member) === stat.key);
  const jobId = character?.jobId || character?.job || 'norvice';
  const job = manager.jobDefinitions?.[jobId];
  return {
    image: job?.image || `./assets/job/job_${jobId}.webp`,
    name: job?.name || jobId
  };
}

function getCurrentSkillEffect(manager, stat, metric) {
  const character = (manager.party || []).find(member => entityKey(member) === stat.key);
  const skillCache = character?._skillCache;
  let cached = skillCache?.get?.(metric.id) || null;
  if (!cached && skillCache?.values) {
    for (const candidate of skillCache.values()) {
      if (candidate?.def?.name === metric.name) {
        cached = candidate;
        break;
      }
    }
  }

  let description = '';
  if (cached?.def?.getDescription && cached.levelConfig) {
    try {
      description = cached.def.getDescription(cached.levelConfig);
    } catch { /* Fall back to the static or generic description below. */ }
  }
  description ||= cached?.def?.description || '';
  if (!description) {
    if (metric.id === 'normal_attack') description = '敵単体に通常の物理攻撃を行う。';
    else if (metric.id === 'hp_recovery') description = '味方のHPを回復する。';
    else if (metric.id === 'mp_recovery') description = '味方のMPを回復する。';
    else if (metric.id === 'barrier') description = '味方へのダメージを防ぐバリアを付与する。';
    else description = `戦闘中に発生した「${metric.name}」の効果。`;
  }

  return {
    description,
    level: Number(cached?.level) > 0 ? Math.floor(Number(cached.level)) : null
  };
}

function renderJobIcon(manager, stat, sizeClass = 'h-9 w-9') {
  const job = getJobDisplay(manager, stat);
  return `<div class="relative flex ${sizeClass} shrink-0 items-center justify-center overflow-hidden rounded-lg border border-violet-400/30 bg-violet-950/60 p-0.5">
    <img src="${escapeHtml(job.image)}" alt="${escapeHtml(job.name)}" class="h-full w-full object-contain drop-shadow-[0_0_5px_rgba(167,139,250,.5)]" onerror="this.style.display='none'">
  </div>`;
}

function renderCharacterTabs(manager, stats, selectedKey) {
  return `<div class="grid shrink-0 grid-cols-4 gap-1" role="tablist" aria-label="キャラクター統計">
    ${stats.map((stat, index) => {
      const selected = stat.key === selectedKey;
      return `<button type="button" role="tab" data-battle-stat-character="${index}" aria-selected="${selected}" class="flex min-w-0 flex-col items-center gap-1 rounded-lg border px-1 py-1.5 transition-colors ${selected ? 'border-cyan-300/80 bg-cyan-500/25 text-white shadow-[0_0_10px_rgba(34,211,238,.2)]' : 'border-slate-600/70 bg-slate-950/60 text-slate-300'}">
        ${renderJobIcon(manager, stat, 'h-8 w-8')}
        <span class="w-full truncate text-[10px] font-black">${escapeHtml(stat.name)}</span>
      </button>`;
    }).join('')}
  </div>`;
}

function renderOverviewCell(label, value, detail, color, icon) {
  return `<div class="min-w-0 rounded-lg border border-slate-600/55 bg-slate-950/70 px-1.5 py-2 text-center">
    <div class="flex items-center justify-center gap-0.5 truncate text-[10px] font-bold text-slate-300"><span class="material-symbols-outlined text-slate-400" style="font-size:12px">${icon}</span>${label}</div>
    <div class="mt-1 truncate text-[15px] font-black leading-none ${color}">${value}</div>
    <div class="mt-1 truncate text-[9px] font-medium text-slate-400">${detail}</div>
  </div>`;
}

function renderCharacterOverview(manager, stat, elapsedMs) {
  const job = getJobDisplay(manager, stat);
  const cells = [
    ['与ダメージ', compactNumber(stat.damageDealt), `${formatDecimal(stat.damageDealt / Math.max(1, elapsedMs / 1000))}/秒`, 'text-rose-300', 'swords'],
    ['最大ダメージ', compactNumber(stat.maxDamageDealt), `${stat.damageDealtEvents} Hit`, 'text-red-300', 'bolt'],
    ['被ダメージ', compactNumber(stat.damageTaken), `最大 ${compactNumber(stat.maxDamageTaken)}`, 'text-orange-300', 'heart_broken'],
    ['HP回復', compactNumber(stat.healingDone), `${formatDecimal(stat.healingDone / Math.max(1, elapsedMs / 1000))}/秒`, 'text-emerald-300', 'healing'],
    ['被回復', compactNumber(stat.healingReceived), `最大 ${compactNumber(stat.maxHealingReceived)}`, 'text-green-200', 'favorite'],
    ['ダメージ軽減', compactNumber(stat.prevented), `最大 ${compactNumber(stat.maxPrevented)}`, 'text-cyan-300', 'shield'],
    ['MP回復', compactNumber(stat.mpRestored), `最大 ${compactNumber(stat.maxMpRestored)}`, 'text-sky-300', 'water_drop'],
    ['行動回数', `${stat.actions}回`, `${formatDecimal(ratePerMinute(stat.actions, elapsedMs))}/分`, 'text-violet-300', 'directions_run']
  ];
  return `<section class="rounded-xl border border-slate-600/70 bg-slate-950/70 p-2.5">
    <div class="flex items-center gap-2">
      ${renderJobIcon(manager, stat, 'h-11 w-11')}
      <div class="min-w-0 flex-1"><h2 class="truncate text-[14px] font-black text-white">${escapeHtml(stat.name)}</h2><p class="truncate text-[10px] font-bold text-violet-200">${escapeHtml(job.name)}</p></div>
      <div class="text-right"><div class="text-[9px] font-bold text-slate-400">計測時間</div><div class="font-mono text-[11px] font-bold text-slate-200">${formatSeconds(elapsedMs)}</div></div>
    </div>
    <div class="mt-2.5 grid grid-cols-4 gap-1.5">${cells.map(cell => renderOverviewCell(...cell)).join('')}</div>
  </section>`;
}

function renderContributionCell(label, value, share, icon, color, barColor) {
  const width = Math.min(100, Math.max(0, Number(share) || 0));
  return `<div class="min-w-0 rounded-lg border border-white/[0.08] bg-black/30 px-2 py-1.5">
    <div class="flex items-center gap-1 text-[9px] font-bold text-slate-300"><span class="material-symbols-outlined ${color}" style="font-size:12px">${icon}</span>${label}<span class="ml-auto font-mono text-[9px] text-amber-200">${formatPercent(width)}</span></div>
    <div class="mt-1 flex items-end justify-between gap-2"><span class="truncate text-[14px] font-black leading-none ${color}">${compactNumber(value)}</span><span class="shrink-0 text-[8px] text-slate-400">キャラ内貢献</span></div>
    <div class="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-800"><div class="h-full rounded-full ${barColor}" style="width:${width.toFixed(1)}%"></div></div>
  </div>`;
}

function renderSkillMetric(metric, stat, effect) {
  const contributions = [];
  if (metric.damage > 0) contributions.push(['与ダメージ', metric.damage, metric.damage / Math.max(1, stat.damageDealt) * 100, 'swords', 'text-rose-200', 'bg-rose-400']);
  if (metric.healing > 0) contributions.push(['HP回復', metric.healing, metric.healing / Math.max(1, stat.healingDone) * 100, 'healing', 'text-emerald-200', 'bg-emerald-400']);
  if (metric.mpRestored > 0) contributions.push(['MP回復', metric.mpRestored, metric.mpRestored / Math.max(1, stat.mpRestored) * 100, 'water_drop', 'text-sky-200', 'bg-sky-400']);
  if (metric.prevented > 0) contributions.push(['ダメージ軽減', metric.prevented, metric.prevented / Math.max(1, stat.prevented) * 100, 'shield', 'text-cyan-200', 'bg-cyan-400']);

  const icon = String(metric.icon || '').includes('/') ? 'auto_awesome' : metric.icon;
  return `<article class="rounded-xl border border-slate-600/70 bg-slate-950/70 p-2.5">
    <div class="flex items-center gap-2">
      <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-black/30"><span class="material-symbols-outlined ${metric.type === 'passive' ? 'text-cyan-200' : 'text-violet-200'}" style="font-size:18px">${escapeHtml(icon)}</span></div>
      <div class="min-w-0 flex-1"><h3 class="truncate text-[12px] font-black text-white">${escapeHtml(metric.name)}</h3><span class="text-[9px] font-bold ${metric.type === 'passive' ? 'text-cyan-300' : 'text-violet-300'}">${metric.type === 'passive' ? 'PASSIVE SKILL' : 'ACTIVE SKILL'}</span></div>
      <div class="shrink-0 rounded-md border border-violet-700/40 bg-violet-950/40 px-2 py-1 text-[10px] font-black text-violet-200">${metric.activations}回発動</div>
    </div>
    <div class="mt-2 rounded-lg border border-cyan-800/35 bg-cyan-950/20 px-2 py-1.5">
      <div class="flex items-center gap-1 text-[9px] font-black text-cyan-200"><span class="material-symbols-outlined" style="font-size:12px">info</span>現在の効果${effect.level ? `<span class="ml-auto rounded bg-cyan-950/70 px-1.5 py-0.5 font-mono text-[9px] text-cyan-100">Lv.${effect.level}</span>` : ''}</div>
      <p class="mt-1 text-[11px] font-medium leading-relaxed text-slate-200">${escapeHtml(effect.description)}</p>
    </div>
    <div class="mt-2 flex items-center gap-1 text-[10px] font-black text-slate-200"><span class="material-symbols-outlined text-amber-300" style="font-size:13px">military_tech</span>戦闘への貢献</div>
    ${contributions.length
      ? `<div class="mt-1.5 grid grid-cols-2 gap-1.5">${contributions.map(item => renderContributionCell(...item)).join('')}</div>`
      : '<div class="mt-1.5 rounded-lg border border-dashed border-slate-600/60 bg-black/20 px-2 py-2 text-center text-[10px] text-slate-400">直接集計できるダメージ・回復・軽減効果はありません</div>'}
  </article>`;
}

function renderStatistics(manager) {
  const telemetry = manager.battleTelemetry;
  const elapsedMs = telemetry.elapsedMs();
  const stats = telemetry.getPartyStats(manager.party);
  const selected = stats.find(stat => stat.key === manager.battleStatisticsCharacterKey) || stats[0];
  if (!selected) return '<div class="flex h-full items-center justify-center text-[10px] text-slate-500">パーティーが存在しません</div>';
  manager.battleStatisticsCharacterKey = selected.key;

  const skills = [...selected.skills.values()].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'passive' ? 1 : -1;
    return (b.damage + b.healing + b.prevented + b.mpRestored) - (a.damage + a.healing + a.prevented + a.mpRestored)
      || b.activations - a.activations;
  });
  return `${renderCharacterTabs(manager, stats, selected.key)}
    <div class="mt-1.5 min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain pr-0.5 custom-scrollbar" data-battle-statistics-list>
      ${renderCharacterOverview(manager, selected, elapsedMs)}
      <div class="flex items-center gap-1 px-0.5 pt-1 text-[11px] font-black text-slate-200"><span class="material-symbols-outlined text-slate-300" style="font-size:14px">query_stats</span>スキル詳細 <span class="ml-auto text-[10px] font-medium text-slate-400">${skills.length}件</span></div>
      ${skills.length ? skills.map(metric => renderSkillMetric(
        metric,
        selected,
        getCurrentSkillEffect(manager, selected, metric)
      )).join('') : '<div class="rounded-xl border border-slate-600/60 bg-slate-950/70 py-6 text-center text-[11px] text-slate-400">まだスキルデータがありません</div>'}
    </div>`;
}

export function renderBattleStatisticsTab(manager, force = false) {
  const container = manager.elements?.tabContent;
  if (!container || manager.currentTab !== 'stats') return;
  const previousScroll = manager._battleStatisticsResetScroll
    ? 0
    : (container.querySelector('[data-battle-statistics-list]')?.scrollTop || 0);
  manager._battleStatisticsResetScroll = false;
  const lastRender = Number(container.dataset.lastBattleStatisticsRender || 0);
  if (!force && now() - lastRender < STAT_RENDER_INTERVAL) return;

  container.dataset.lastBattleStatisticsRender = String(now());
  container.innerHTML = `<div class="flex h-full min-h-0 flex-col" data-battle-statistics-root>
    ${renderStatistics(manager)}
  </div>`;

  const list = container.querySelector('[data-battle-statistics-list]');
  if (list && previousScroll > 0) list.scrollTop = previousScroll;
  container.querySelectorAll('[data-battle-stat-character]').forEach(button => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.battleStatCharacter);
      const stats = manager.battleTelemetry.getPartyStats(manager.party);
      if (!stats[index] || stats[index].key === manager.battleStatisticsCharacterKey) return;
      manager.battleStatisticsCharacterKey = stats[index].key;
      manager._battleStatisticsResetScroll = true;
      renderBattleStatisticsTab(manager, true);
    });
  });
}

export function scheduleBattleStatisticsRender(manager) {
  if (manager.currentTab !== 'stats' || document.hidden || manager.isTabInteracting) return;
  if (manager._battleStatisticsRenderTimer) return;
  manager._battleStatisticsRenderTimer = window.setTimeout(() => {
    manager._battleStatisticsRenderTimer = null;
    if (manager.currentTab === 'stats' && manager.container?.isConnected) {
      renderBattleStatisticsTab(manager);
    }
  }, STAT_RENDER_INTERVAL);
}

export function cleanupBattleStatistics(manager) {
  if (manager._battleStatisticsRenderTimer) {
    clearTimeout(manager._battleStatisticsRenderTimer);
    manager._battleStatisticsRenderTimer = null;
  }
}
