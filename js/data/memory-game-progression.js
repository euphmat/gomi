import { GameDB } from './database.js';

export const MEMORY_PROGRESS_STATE_KEY = 'memoryGameProgress';
export const MEMORY_MAX_LEVEL = 30;

const DIFFICULTY_XP = {
  easy: 10,
  normal: 16,
  hard: 24,
  very_hard: 34,
};

export const MEMORY_SKILL_BRANCHES = [
  {
    id: 'memory',
    name: '記憶術',
    icon: 'psychology',
    color: 'cyan',
    description: '見た絵柄と正解ペアを盤面へ直接記録する',
    skills: [
      {
        // 旧「全景記憶」の習得ランクを失わせないため、保存用IDは維持する。
        id: 'wide_view', name: '絵柄メモ', icon: 'photo_library', maxRank: 3, cost: 1, requiredLevel: 2,
        ranks: ['見た直近4枚は、伏せた後も裏面に絵柄を表示', '見た直近8枚は、伏せた後も裏面に絵柄を表示', '一度見たすべてのカードの裏面に絵柄を表示'],
      },
      {
        id: 'afterimage', name: 'ペアナビ', icon: 'linked_services', maxRank: 3, cost: 1, requiredLevel: 5,
        prerequisite: { id: 'wide_view', rank: 2 },
        ranks: ['1ゲームに2回、1枚目の既知のペアを発光', '1ゲームに4回、1枚目の既知のペアを発光', '回数無制限で、1枚目の既知のペアを発光'],
      },
      {
        id: 'memory_bookmark', name: '完全照合', icon: 'dataset_linked', maxRank: 2, cost: 2, requiredLevel: 11,
        prerequisite: { id: 'afterimage', rank: 2 },
        ranks: ['位置が判明したペアを常に1組、2枚同時に発光', '位置が判明したすべてのペアを常に2枚同時に発光'],
      },
    ],
  },
  {
    id: 'tactics',
    name: '勝負術',
    icon: 'playing_cards',
    color: 'amber',
    description: 'カード選択と手番を立て直す',
    skills: [
      {
        // 旧「先手の構え」の習得ランクを失わせないため、保存用IDは維持する。
        id: 'initiative', name: '仕切り直し', icon: 'backspace', maxRank: 3, cost: 1, requiredLevel: 2,
        ranks: ['1ゲームに1回、選んだ1枚目を伏せ直せる', '1ゲームに2回、選んだ1枚目を伏せ直せる', '1ゲームに3回、選んだ1枚目を伏せ直せる'],
      },
      {
        id: 'refocus', name: '再集中', icon: 'restart_alt', maxRank: 2, cost: 2, requiredLevel: 6,
        prerequisite: { id: 'initiative', rank: 2 },
        ranks: ['1ゲームに1回、不一致でも手番を維持', '1ゲームに2回、不一致でも手番を維持'],
      },
      {
        id: 'double_check', name: '見直し', icon: 'undo', maxRank: 1, cost: 4, requiredLevel: 14,
        prerequisite: { id: 'refocus', rank: 2 },
        ranks: ['1ゲームに1回、不正解の2枚目だけを戻して選び直す'],
      },
    ],
  },
  {
    id: 'growth',
    name: '盤面術',
    icon: 'grid_view',
    color: 'violet',
    description: '透視とCPU妨害で盤面そのものを有利にする',
    skills: [
      {
        id: 'repetition', name: '開幕透視', icon: 'grid_on', maxRank: 3, cost: 1, requiredLevel: 2,
        ranks: ['ゲーム開始時、ランダムな2枚を永続透視', 'ゲーム開始時、ランダムな4枚を永続透視', 'ゲーム開始時、ランダムな6枚を永続透視'],
      },
      {
        id: 'pair_study', name: '強制サーチ', icon: 'travel_explore', maxRank: 3, cost: 1, requiredLevel: 5,
        prerequisite: { id: 'repetition', rank: 1 },
        ranks: ['1ゲームに1回、1枚目の正解ペアを必ず発光', '1ゲームに2回、1枚目の正解ペアを必ず発光', '1ゲームに3回、1枚目の正解ペアを必ず発光'],
      },
      {
        id: 'adversity', name: '思考妨害', icon: 'psychology_alt', maxRank: 2, cost: 1, requiredLevel: 9,
        prerequisite: { id: 'pair_study', rank: 2 },
        ranks: ['CPUがカードを記憶する確率を50%低下', 'CPUはめくったカードの位置を一切記憶できない'],
      },
    ],
  },
];

export const MEMORY_SKILLS = MEMORY_SKILL_BRANCHES.flatMap(branch => branch.skills);
export const MEMORY_SKILL_MAP = new Map(MEMORY_SKILLS.map(skill => [skill.id, skill]));

const EMPTY_PROGRESS = Object.freeze({
  xp: 0,
  gamesPlayed: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  skillRanks: {},
});

let cachedProgress = null;

/** Lv.N から Lv.N+1 に必要なEXP。 */
export function getMemoryXpToNext(level) {
  return 40 + Math.max(0, level - 1) * 20;
}

/** 指定レベルに到達するための累計EXP。 */
export function getMemoryLevelStartXp(level) {
  const steps = Math.max(0, Math.min(MEMORY_MAX_LEVEL, level) - 1);
  return 10 * steps * steps + 30 * steps;
}

export function getMemoryLevel(xp) {
  const safeXp = Math.max(0, Math.floor(Number(xp) || 0));
  let level = 1;
  while (level < MEMORY_MAX_LEVEL && safeXp >= getMemoryLevelStartXp(level + 1)) level += 1;
  return level;
}

function normalizeProgress(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const skillRanks = {};
  for (const skill of MEMORY_SKILLS) {
    const rank = Math.max(0, Math.min(skill.maxRank, Math.floor(Number(source.skillRanks?.[skill.id]) || 0)));
    if (rank > 0) skillRanks[skill.id] = rank;
  }
  return {
    xp: Math.max(0, Math.floor(Number(source.xp) || 0)),
    gamesPlayed: Math.max(0, Math.floor(Number(source.gamesPlayed) || 0)),
    wins: Math.max(0, Math.floor(Number(source.wins) || 0)),
    draws: Math.max(0, Math.floor(Number(source.draws) || 0)),
    losses: Math.max(0, Math.floor(Number(source.losses) || 0)),
    skillRanks,
  };
}

const cloneProgress = progress => ({ ...progress, skillRanks: { ...progress.skillRanks } });

export function getMemorySkillPoints(progress) {
  const normalized = normalizeProgress(progress);
  const earned = getMemoryLevel(normalized.xp) - 1;
  const spent = MEMORY_SKILLS.reduce((total, skill) => (
    total + (normalized.skillRanks[skill.id] || 0) * skill.cost
  ), 0);
  return Math.max(0, earned - spent);
}

export function getMemorySkillEffects(progress) {
  const ranks = normalizeProgress(progress).skillRanks;
  return {
    recordedCardCapacity: [0, 4, 8, Number.POSITIVE_INFINITY][ranks.wide_view || 0],
    knownMateHintCharges: [0, 2, 4, Number.POSITIVE_INFINITY][ranks.afterimage || 0],
    knownPairGuideLimit: [0, 1, Number.POSITIVE_INFINITY][ranks.memory_bookmark || 0],
    firstCardResetCharges: ranks.initiative || 0,
    refocusCharges: ranks.refocus || 0,
    doubleCheckCharges: ranks.double_check || 0,
    openingVisionCount: (ranks.repetition || 0) * 2,
    pairSearchCharges: ranks.pair_study || 0,
    cpuMemoryPenaltyPercent: (ranks.adversity || 0) * 50,
  };
}

export function getMemoryXpReward({ difficultyId, outcome, playerPairs }) {
  const base = DIFFICULTY_XP[difficultyId] || DIFFICULTY_XP.easy;
  const pairXp = Math.max(0, Math.floor(Number(playerPairs) || 0)) * 3;
  const outcomeMultiplier = outcome === 'win' ? 1.5 : outcome === 'draw' ? 1.2 : 1;
  return Math.max(1, Math.round((base + pairXp) * outcomeMultiplier));
}

export async function loadMemoryProgress(force = false) {
  if (!cachedProgress || force) {
    const saved = await GameDB.getGameState(MEMORY_PROGRESS_STATE_KEY);
    cachedProgress = normalizeProgress(saved || EMPTY_PROGRESS);
  }
  return cloneProgress(cachedProgress);
}

export async function recordMemoryGameResult({ difficultyId, outcome, playerPairs }) {
  const progress = await loadMemoryProgress();
  const previousLevel = getMemoryLevel(progress.xp);
  const xpGained = getMemoryXpReward({ difficultyId, outcome, playerPairs });
  const next = {
    ...progress,
    xp: progress.xp + xpGained,
    gamesPlayed: progress.gamesPlayed + 1,
    wins: progress.wins + (outcome === 'win' ? 1 : 0),
    draws: progress.draws + (outcome === 'draw' ? 1 : 0),
    losses: progress.losses + (outcome === 'win' || outcome === 'draw' ? 0 : 1),
  };
  await GameDB.setGameState(MEMORY_PROGRESS_STATE_KEY, next);
  cachedProgress = next;
  return {
    progress: cloneProgress(next),
    xpGained,
    previousLevel,
    level: getMemoryLevel(next.xp),
  };
}

export function canUnlockMemorySkill(progress, skillId) {
  const normalized = normalizeProgress(progress);
  const skill = MEMORY_SKILL_MAP.get(skillId);
  if (!skill) return { ok: false, reason: '存在しないスキルです。' };
  const rank = normalized.skillRanks[skill.id] || 0;
  if (rank >= skill.maxRank) return { ok: false, reason: '最大ランクです。' };
  if (getMemoryLevel(normalized.xp) < skill.requiredLevel) return { ok: false, reason: `LV.${skill.requiredLevel}で解放` };
  if (skill.prerequisite && (normalized.skillRanks[skill.prerequisite.id] || 0) < skill.prerequisite.rank) {
    const required = MEMORY_SKILL_MAP.get(skill.prerequisite.id);
    return { ok: false, reason: `${required?.name || '前提スキル'} Rank ${skill.prerequisite.rank}が必要` };
  }
  if (getMemorySkillPoints(normalized) < skill.cost) return { ok: false, reason: `SPが${skill.cost}必要` };
  return { ok: true, reason: '' };
}

export async function unlockMemorySkill(skillId) {
  const progress = await loadMemoryProgress();
  const availability = canUnlockMemorySkill(progress, skillId);
  if (!availability.ok) throw new Error(availability.reason);
  const next = cloneProgress(progress);
  next.skillRanks[skillId] = (next.skillRanks[skillId] || 0) + 1;
  await GameDB.setGameState(MEMORY_PROGRESS_STATE_KEY, next);
  cachedProgress = next;
  return cloneProgress(next);
}
