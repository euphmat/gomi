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
    description: 'カードを覚える時間と手掛かりを増やす',
    skills: [
      {
        id: 'wide_view', name: '全景記憶', icon: 'visibility', maxRank: 3, cost: 1, requiredLevel: 2,
        ranks: ['開始時に全カードを1秒見る', '開始時に全カードを2秒見る', '開始時に全カードを3秒見る'],
      },
      {
        id: 'afterimage', name: '残像保持', icon: 'hourglass_top', maxRank: 3, cost: 1, requiredLevel: 5,
        prerequisite: { id: 'wide_view', rank: 2 },
        ranks: ['不一致カードの確認時間 +0.25秒', '不一致カードの確認時間 +0.50秒', '不一致カードの確認時間 +0.75秒'],
      },
      {
        id: 'memory_bookmark', name: '記憶の栞', icon: 'bookmark', maxRank: 2, cost: 2, requiredLevel: 11,
        prerequisite: { id: 'afterimage', rank: 2 },
        ranks: ['直近3枚の既知カードに同じ絵柄の印を残す', '直近6枚の既知カードに同じ絵柄の印を残す'],
      },
    ],
  },
  {
    id: 'tactics',
    name: '勝負術',
    icon: 'playing_cards',
    color: 'amber',
    description: '先手と手番を操り、失敗を立て直す',
    skills: [
      {
        id: 'initiative', name: '先手の構え', icon: 'flag', maxRank: 3, cost: 1, requiredLevel: 2,
        ranks: ['先行になる確率 60%', '先行になる確率 70%', '先行になる確率 80%'],
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
    name: '鍛錬術',
    icon: 'school',
    color: 'violet',
    description: '対局から得る神経衰弱EXPを増やす',
    skills: [
      {
        id: 'repetition', name: '反復練習', icon: 'autorenew', maxRank: 3, cost: 1, requiredLevel: 2,
        ranks: ['獲得EXP +10%', '獲得EXP +20%', '獲得EXP +30%'],
      },
      {
        id: 'pair_study', name: 'ペア研究', icon: 'join_inner', maxRank: 3, cost: 1, requiredLevel: 5,
        prerequisite: { id: 'repetition', rank: 1 },
        ranks: ['自分で取ったペアのEXP +1', '自分で取ったペアのEXP +2', '自分で取ったペアのEXP +3'],
      },
      {
        id: 'adversity', name: '敗戦分析', icon: 'query_stats', maxRank: 2, cost: 1, requiredLevel: 9,
        prerequisite: { id: 'pair_study', rank: 2 },
        ranks: ['敗北・引き分け時のEXP +15%', '敗北・引き分け時のEXP +30%'],
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
    previewSeconds: ranks.wide_view || 0,
    mismatchDelayMs: (ranks.afterimage || 0) * 250,
    memoryMarkCapacity: (ranks.memory_bookmark || 0) * 3,
    playerFirstChance: 0.5 + (ranks.initiative || 0) * 0.1,
    refocusCharges: ranks.refocus || 0,
    doubleCheckCharges: ranks.double_check || 0,
    xpPercent: (ranks.repetition || 0) * 10,
    pairXpBonus: ranks.pair_study || 0,
    nonWinXpPercent: (ranks.adversity || 0) * 15,
  };
}

export function getMemoryXpReward({ difficultyId, outcome, playerPairs }, progress) {
  const effects = getMemorySkillEffects(progress);
  const base = DIFFICULTY_XP[difficultyId] || DIFFICULTY_XP.easy;
  const pairXp = Math.max(0, Math.floor(Number(playerPairs) || 0)) * (3 + effects.pairXpBonus);
  const outcomeMultiplier = outcome === 'win' ? 1.5 : outcome === 'draw' ? 1.2 : 1;
  const nonWinMultiplier = outcome === 'win' ? 1 : 1 + effects.nonWinXpPercent / 100;
  return Math.max(1, Math.round((base + pairXp) * outcomeMultiplier * nonWinMultiplier * (1 + effects.xpPercent / 100)));
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
  const xpGained = getMemoryXpReward({ difficultyId, outcome, playerPairs }, progress);
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
