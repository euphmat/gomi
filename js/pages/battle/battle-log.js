/**
 * Lightweight, session-only battle telemetry.
 *
 * Hot-path rules:
 * - log entries use a fixed-size ring buffer (no unbounded arrays / storage I/O)
 * - statistics are incremented when an event happens (no history rescans)
 * - DOM work is requested only while the Log tab is visible
 */

const DEFAULT_LOG_LIMIT = 180;
const LOG_RENDER_INTERVAL = 500;
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
  if (isPartyEntity(entity)) return `party:${entity.id || entity.elementId || entityName(entity)}`;
  return `enemy:${entity.uniqueId || entity.elementId || entity.id || entityName(entity)}`;
};

const normalizeSkill = skill => ({
  id: skill?.id || 'other',
  name: skill?.name || 'その他の効果',
  type: skill?.type === 'passive' || skill?.isPassive ? 'passive' : (skill?.type || 'active')
});

class FixedRingBuffer {
  constructor(limit) {
    this.limit = Math.max(20, limit || DEFAULT_LOG_LIMIT);
    this.items = new Array(this.limit);
    this.start = 0;
    this.size = 0;
  }

  push(value) {
    const index = (this.start + this.size) % this.limit;
    this.items[index] = value;
    if (this.size < this.limit) {
      this.size += 1;
    } else {
      this.start = (this.start + 1) % this.limit;
    }
  }

  newestFirst() {
    const result = new Array(this.size);
    for (let i = 0; i < this.size; i += 1) {
      result[i] = this.items[(this.start + this.size - 1 - i + this.limit) % this.limit];
    }
    return result;
  }
}

export class BattleTelemetry {
  constructor({ limit = DEFAULT_LOG_LIMIT, onChange = null } = {}) {
    this.startedAt = now();
    this.entries = new FixedRingBuffer(limit);
    this.actorStats = new Map();
    this.recentSkillEvents = new Map();
    this.sequence = 0;
    this.onChange = onChange;
  }

  elapsedMs() {
    return Math.max(0, now() - this.startedAt);
  }

  _notify() {
    this.onChange?.();
  }

  _append(entry) {
    this.entries.push({
      sequence: ++this.sequence,
      elapsedMs: this.elapsedMs(),
      ...entry
    });
    this._notify();
  }

  _ensureActor(entity) {
    if (!entity) return null;
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

  markEncounter(label) {
    this._append({ type: 'encounter', message: label || '戦闘開始' });
  }

  recordAction(actor, skill) {
    if (!actor) return;
    const normalized = normalizeSkill(skill);
    const stat = this._ensureActor(actor);
    const metric = this._ensureSkill(stat, normalized);
    stat.actions += 1;
    metric.activations += 1;
    this.recentSkillEvents.set(`${stat.key}:${normalized.id}`, now());
    this._append({
      type: 'effect',
      actorName: stat.name,
      skillName: normalized.name,
      skillType: normalized.type
    });
  }

  recordEffect(actor, skill) {
    if (!actor) return false;
    const normalized = normalizeSkill(skill);
    const stat = this._ensureActor(actor);
    const signature = `${stat.key}:${normalized.id}`;
    const eventTime = now();
    // executeSkill records the active skill immediately before its label popup.
    if (eventTime - (this.recentSkillEvents.get(signature) || -Infinity) < 80) return false;
    const metric = this._ensureSkill(stat, normalized);
    metric.activations += 1;
    this.recentSkillEvents.set(signature, eventTime);
    this._append({
      type: 'effect',
      actorName: stat.name,
      skillName: normalized.name,
      skillType: normalized.type
    });
    return true;
  }

  recordDamage(source, target, amount, skill) {
    const dealt = Math.max(0, Math.floor(Number(amount) || 0));
    if (!target || dealt <= 0) return;
    const targetStat = this._ensureActor(target);
    targetStat.damageTaken += dealt;

    let sourceStat = null;
    if (source) {
      sourceStat = this._ensureActor(source);
      sourceStat.damageDealt += dealt;
      this._ensureSkill(sourceStat, skill).damage += dealt;
    }

    this._append({
      type: 'damage',
      direction: sourceStat?.isParty ? 'dealt' : (targetStat.isParty ? 'taken' : 'other'),
      actorName: sourceStat?.name || normalizeSkill(skill).name,
      targetName: targetStat.name,
      skillName: normalizeSkill(skill).name,
      amount: dealt
    });
  }

  recordRecovery(source, target, amount, skill, resource = 'hp') {
    const restored = Math.max(0, Math.floor(Number(amount) || 0));
    if (!target || restored <= 0) return;
    const targetStat = this._ensureActor(target);
    const sourceEntity = source || target;
    const sourceStat = this._ensureActor(sourceEntity);
    const metric = this._ensureSkill(sourceStat, skill);

    if (resource === 'mp') {
      sourceStat.mpRestored += restored;
      metric.mpRestored += restored;
    } else {
      sourceStat.healingDone += restored;
      targetStat.healingReceived += restored;
      metric.healing += restored;
    }

    this._append({
      type: resource === 'mp' ? 'mp' : 'heal',
      actorName: sourceStat.name,
      targetName: targetStat.name,
      skillName: normalizeSkill(skill).name,
      amount: restored
    });
  }

  recordPrevented(provider, target, amount, skill) {
    const prevented = Math.max(0, Math.floor(Number(amount) || 0));
    if (!target || prevented <= 0) return;
    const providerEntity = provider || target;
    const stat = this._ensureActor(providerEntity);
    stat.prevented += prevented;
    this._ensureSkill(stat, skill).prevented += prevented;
    this._append({
      type: 'prevent',
      actorName: stat.name,
      targetName: entityName(target),
      skillName: normalizeSkill(skill).name,
      amount: prevented
    });
  }

  getPartyStats(party = []) {
    party.forEach(entity => this._ensureActor(entity));
    const order = new Map(party.map((entity, index) => [entityKey(entity), index]));
    return [...this.actorStats.values()]
      .filter(stat => stat.isParty)
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

function formatElapsed(milliseconds) {
  const totalSeconds = Math.floor(Math.max(0, milliseconds) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
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

function renderLogEntry(entry) {
  if (entry.type === 'encounter') {
    return `<div class="flex items-center gap-2 py-1 text-[9px] text-slate-500"><span class="h-px flex-1 bg-slate-700/70"></span><span>${escapeHtml(entry.message)}</span><span class="h-px flex-1 bg-slate-700/70"></span></div>`;
  }

  const config = {
    damage: { icon: 'swords', color: entry.direction === 'taken' ? 'text-orange-300' : 'text-rose-300', value: `-${compactNumber(entry.amount)}` },
    heal: { icon: 'healing', color: 'text-emerald-300', value: `+${compactNumber(entry.amount)}` },
    mp: { icon: 'water_drop', color: 'text-sky-300', value: `+${compactNumber(entry.amount)} MP` },
    prevent: { icon: 'shield', color: 'text-cyan-300', value: `${compactNumber(entry.amount)} 軽減` },
    effect: { icon: entry.skillType === 'passive' ? 'all_inclusive' : 'auto_awesome', color: 'text-violet-300', value: '発動' }
  }[entry.type] || { icon: 'info', color: 'text-slate-300', value: '' };

  const target = entry.targetName && entry.targetName !== entry.actorName
    ? `<span class="text-slate-500"> → ${escapeHtml(entry.targetName)}</span>`
    : '';
  return `<div class="grid grid-cols-[32px_15px_minmax(0,1fr)_auto] items-center gap-1 border-b border-white/[0.05] py-1.5 text-[10px]">
    <time class="font-mono text-[8px] text-slate-600">${formatElapsed(entry.elapsedMs)}</time>
    <span class="material-symbols-outlined ${config.color}" style="font-size:13px">${config.icon}</span>
    <div class="min-w-0 truncate"><span class="text-slate-200">${escapeHtml(entry.actorName)}</span>${target}<span class="ml-1 text-slate-500">${escapeHtml(entry.skillName || '')}</span></div>
    <strong class="whitespace-nowrap ${config.color}">${config.value}</strong>
  </div>`;
}

function renderEventLog(manager) {
  const telemetry = manager.battleTelemetry;
  const filter = manager.battleLogFilter || 'all';
  const allowed = {
    all: null,
    damage: new Set(['damage']),
    recovery: new Set(['heal', 'mp']),
    effect: new Set(['effect', 'prevent'])
  }[filter];
  const entries = telemetry.entries.newestFirst()
    .filter(entry => !allowed || allowed.has(entry.type))
    .slice(0, 120);
  const filters = [['all', 'すべて'], ['damage', 'ダメージ'], ['recovery', '回復'], ['effect', '効果']];

  return `
    <div class="mt-1.5 flex gap-1" role="group" aria-label="ログ絞り込み">
      ${filters.map(([id, label]) => `<button type="button" data-battle-log-filter="${id}" class="flex-1 rounded-full border px-1.5 py-1 text-[9px] font-bold ${filter === id ? 'border-violet-300/70 bg-violet-500/25 text-violet-100' : 'border-slate-700/70 bg-slate-950/50 text-slate-400'}">${label}</button>`).join('')}
    </div>
    <div class="mt-1 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5 custom-scrollbar" data-battle-log-list>
      ${entries.length ? entries.map(renderLogEntry).join('') : '<div class="flex h-full items-center justify-center text-[10px] text-slate-500">該当するログはまだありません</div>'}
    </div>`;
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

function renderStatistics(manager) {
  const telemetry = manager.battleTelemetry;
  const elapsedMinutes = telemetry.elapsedMs() / 60000;
  return `<div class="mt-1.5 min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain pr-0.5 custom-scrollbar" data-battle-log-list>
    ${telemetry.getPartyStats(manager.party).map(stat => {
      const skills = [...stat.skills.values()]
        .sort((a, b) => (b.damage + b.healing + b.prevented + b.mpRestored) - (a.damage + a.healing + a.prevented + a.mpRestored) || b.activations - a.activations);
      return `<section class="rounded-xl border border-slate-700/60 bg-slate-950/55 p-2">
        <div class="flex items-center gap-2">
          <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-violet-400/30 bg-violet-950/60 text-[11px] font-black text-violet-200">${escapeHtml(stat.name).slice(0, 1)}</div>
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

export function renderBattleLogTab(manager, force = false) {
  const container = manager.elements?.tabContent;
  if (!container || manager.currentTab !== 'log') return;
  const view = manager.battleLogView === 'stats' ? 'stats' : 'events';
  const previousScroll = container.querySelector('[data-battle-log-list]')?.scrollTop || 0;
  const lastRender = Number(container.dataset.lastBattleLogRender || 0);
  const interval = view === 'stats' ? STAT_RENDER_INTERVAL : LOG_RENDER_INTERVAL;
  if (!force && now() - lastRender < interval) return;

  container.dataset.lastBattleLogRender = String(now());
  container.innerHTML = `<div class="flex h-full min-h-0 flex-col" data-battle-log-root>
    ${renderSummary(manager.battleTelemetry, manager.party)}
    <div class="mt-1.5 grid grid-cols-2 rounded-lg border border-slate-700/60 bg-black/25 p-0.5" role="tablist" aria-label="ログ表示">
      <button type="button" role="tab" data-battle-log-view="events" aria-selected="${view === 'events'}" class="rounded-md py-1 text-[10px] font-black ${view === 'events' ? 'bg-violet-500/25 text-violet-100 shadow-sm' : 'text-slate-500'}">戦闘ログ</button>
      <button type="button" role="tab" data-battle-log-view="stats" aria-selected="${view === 'stats'}" class="rounded-md py-1 text-[10px] font-black ${view === 'stats' ? 'bg-cyan-500/20 text-cyan-100 shadow-sm' : 'text-slate-500'}">統計</button>
    </div>
    ${view === 'stats' ? renderStatistics(manager) : renderEventLog(manager)}
  </div>`;

  const list = container.querySelector('[data-battle-log-list]');
  if (list && previousScroll > 0) list.scrollTop = previousScroll;
  container.querySelectorAll('[data-battle-log-view]').forEach(button => {
    button.addEventListener('click', () => {
      manager.battleLogView = button.dataset.battleLogView;
      renderBattleLogTab(manager, true);
    });
  });
  container.querySelectorAll('[data-battle-log-filter]').forEach(button => {
    button.addEventListener('click', () => {
      manager.battleLogFilter = button.dataset.battleLogFilter;
      renderBattleLogTab(manager, true);
    });
  });
}

export function scheduleBattleLogRender(manager) {
  if (manager.currentTab !== 'log' || document.hidden || manager.isTabInteracting) return;
  if (manager._battleLogRenderTimer) return;
  const interval = manager.battleLogView === 'stats' ? STAT_RENDER_INTERVAL : LOG_RENDER_INTERVAL;
  manager._battleLogRenderTimer = window.setTimeout(() => {
    manager._battleLogRenderTimer = null;
    if (manager.currentTab === 'log' && manager.container?.isConnected) {
      renderBattleLogTab(manager);
    }
  }, interval);
}

export function cleanupBattleLog(manager) {
  if (manager._battleLogRenderTimer) {
    clearTimeout(manager._battleLogRenderTimer);
    manager._battleLogRenderTimer = null;
  }
}
