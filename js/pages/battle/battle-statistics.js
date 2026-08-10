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
  type: skill?.type === 'passive' || skill?.isPassive ? 'passive' : (skill?.type || 'active')
});

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
        damageTaken: 0,
        healingDone: 0,
        healingReceived: 0,
        mpRestored: 0,
        prevented: 0,
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
    metric.activations += 1;
    this.recentSkillEvents.set(`${stat.key}:${normalized.id}`, now());
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
    metric.activations += 1;
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
      changed = true;
    }

    if (source && isPartyEntity(source)) {
      const sourceStat = this._ensureActor(source);
      sourceStat.damageDealt += dealt;
      this._ensureSkill(sourceStat, skill).damage += dealt;
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
      if (sourceStat) sourceStat.mpRestored += restored;
      if (metric) metric.mpRestored += restored;
    } else {
      if (sourceStat) sourceStat.healingDone += restored;
      if (targetStat) targetStat.healingReceived += restored;
      if (metric) metric.healing += restored;
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
    this._ensureSkill(stat, skill).prevented += prevented;
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

function renderSummary(telemetry, party) {
  const totals = telemetry.getTotals(party);
  const items = [
    ['与ダメ', totals.damageDealt, 'text-rose-200', 'swords'],
    ['被ダメ', totals.damageTaken, 'text-orange-200', 'heart_broken'],
    ['回復', totals.healingDone, 'text-emerald-200', 'healing'],
    ['軽減', totals.prevented, 'text-cyan-200', 'shield']
  ];
  return `<div class="grid grid-cols-4 gap-1">${items.map(([label, value, color, icon]) => `
    <div class="rounded-lg border border-white/10 bg-black/25 px-1 py-1.5 text-center">
      <div class="flex items-center justify-center gap-0.5 text-[9px] text-slate-400"><span class="material-symbols-outlined" style="font-size:11px">${icon}</span>${label}</div>
      <div class="mt-0.5 truncate text-[11px] font-black ${color}">${compactNumber(value)}</div>
    </div>`).join('')}</div>`;
}

function renderSkillMetric(metric, elapsedMinutes) {
  const perMinute = metric.activations / Math.max(elapsedMinutes, 1 / 60);
  const values = [];
  if (metric.damage) values.push(`<span class="text-rose-300">与 ${compactNumber(metric.damage)}</span>`);
  if (metric.healing) values.push(`<span class="text-emerald-300">回 ${compactNumber(metric.healing)}</span>`);
  if (metric.mpRestored) values.push(`<span class="text-sky-300">MP ${compactNumber(metric.mpRestored)}</span>`);
  if (metric.prevented) values.push(`<span class="text-cyan-300">軽 ${compactNumber(metric.prevented)}</span>`);
  return `<div class="border-t border-white/[0.06] py-1.5 first:border-t-0">
    <div class="flex items-center gap-1">
      <span class="rounded px-1 py-0.5 text-[8px] ${metric.type === 'passive' ? 'bg-cyan-950/70 text-cyan-300' : 'bg-violet-950/70 text-violet-300'}">${metric.type === 'passive' ? 'PASSIVE' : 'ACTIVE'}</span>
      <span class="min-w-0 flex-1 truncate text-[10px] font-bold text-slate-200">${escapeHtml(metric.name)}</span>
      <span class="whitespace-nowrap text-[9px] text-slate-400">${metric.activations}回 <span class="text-slate-600">(${perMinute.toFixed(1)}/分)</span></span>
    </div>
    <div class="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 pl-0.5 text-[9px]">${values.join('') || '<span class="text-slate-600">数値効果なし</span>'}</div>
  </div>`;
}

function renderJobIcon(manager, stat) {
  const character = (manager.party || []).find(member => entityKey(member) === stat.key);
  const jobId = character?.jobId || character?.job || 'norvice';
  const job = manager.jobDefinitions?.[jobId];
  const image = job?.image || `./assets/job/job_${jobId}.webp`;
  const icon = job?.icon && !String(job.icon).includes('/') ? job.icon : 'person';
  const label = job?.name || jobId;
  return `<div class="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-violet-400/30 bg-violet-950/60 p-0.5">
    <span class="material-symbols-outlined hidden text-xl text-violet-200">${escapeHtml(icon)}</span>
    <img src="${escapeHtml(image)}" alt="${escapeHtml(label)}" class="h-full w-full object-contain drop-shadow-[0_0_5px_rgba(167,139,250,.5)]" onerror="this.style.display='none';this.previousElementSibling.classList.remove('hidden')">
  </div>`;
}

function renderStatistics(manager) {
  const telemetry = manager.battleTelemetry;
  const elapsedMinutes = telemetry.elapsedMs() / 60000;
  return `<div class="mt-1.5 min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain pr-0.5 custom-scrollbar" data-battle-statistics-list>
    ${telemetry.getPartyStats(manager.party).map(stat => {
      const skills = [...stat.skills.values()]
        .sort((a, b) => (b.damage + b.healing + b.prevented + b.mpRestored) - (a.damage + a.healing + a.prevented + a.mpRestored) || b.activations - a.activations);
      return `<section class="rounded-xl border border-slate-700/60 bg-slate-950/55 p-2">
        <div class="flex items-center gap-2">
          ${renderJobIcon(manager, stat)}
          <div class="min-w-0 flex-1"><h3 class="truncate text-[11px] font-black text-white">${escapeHtml(stat.name)}</h3><p class="text-[8px] text-slate-500">行動 ${stat.actions}回</p></div>
          <div class="grid grid-cols-2 gap-x-2 gap-y-0.5 text-right text-[8px]">
            <span class="text-rose-300">与 ${compactNumber(stat.damageDealt)}</span><span class="text-orange-300">被 ${compactNumber(stat.damageTaken)}</span>
            <span class="text-emerald-300">回 ${compactNumber(stat.healingDone)}</span><span class="text-cyan-300">軽 ${compactNumber(stat.prevented)}</span>
          </div>
        </div>
        <div class="mt-1.5">${skills.length ? skills.map(metric => renderSkillMetric(metric, elapsedMinutes)).join('') : '<div class="border-t border-white/[0.06] py-2 text-center text-[9px] text-slate-600">まだスキルデータがありません</div>'}</div>
      </section>`;
    }).join('')}
  </div>`;
}

export function renderBattleStatisticsTab(manager, force = false) {
  const container = manager.elements?.tabContent;
  if (!container || manager.currentTab !== 'stats') return;
  const previousScroll = container.querySelector('[data-battle-statistics-list]')?.scrollTop || 0;
  const lastRender = Number(container.dataset.lastBattleStatisticsRender || 0);
  if (!force && now() - lastRender < STAT_RENDER_INTERVAL) return;

  container.dataset.lastBattleStatisticsRender = String(now());
  container.innerHTML = `<div class="flex h-full min-h-0 flex-col" data-battle-statistics-root>
    ${renderSummary(manager.battleTelemetry, manager.party)}
    ${renderStatistics(manager)}
  </div>`;

  const list = container.querySelector('[data-battle-statistics-list]');
  if (list && previousScroll > 0) list.scrollTop = previousScroll;
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
