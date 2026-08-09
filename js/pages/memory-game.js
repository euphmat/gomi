/**
 * ホームタウンから遊べる、CPU対戦型の神経衰弱ゲーム。
 * 難易度ごとに盤面・カード画像・CPUの記憶力・Prism報酬が変化する。
 */
import { GameDB } from '../data/database.js';
import { MONSTERS } from '../definitions/monsters.js';
import { FISH } from '../definitions/fish.js';
import { MATERIALS } from '../definitions/materials.js';
import { formatNumber } from '../utils/format.js';
import { playSoundEffect } from '../utils/sound-effects.js';
import { getTreasureEffect } from '../data/treasure-manager.js';
import {
  MEMORY_MAX_LEVEL,
  MEMORY_SKILL_BRANCHES,
  canUnlockMemorySkill,
  getMemoryLevel,
  getMemoryLevelStartXp,
  getMemorySkillEffects,
  getMemorySkillPoints,
  loadMemoryProgress,
  recordMemoryGameResult,
  unlockMemorySkill,
} from '../data/memory-game-progression.js';

const PLAYABLE_FISH = FISH.filter(fish => fish.id !== 'zeus_cetus');
const CARD_PALETTE_CACHE = new Map();

const DIFFICULTIES = {
  easy: {
    id: 'easy', label: 'EASY', pairs: 6, columns: 4, reward: 1, skillReward: 1,
    category: 'モンスター', icon: 'pets', accent: 'emerald', memoryRate: 0.28,
    pool: MONSTERS,
  },
  normal: {
    id: 'normal', label: 'NORMAL', pairs: 8, columns: 4, reward: 3, skillReward: 1,
    category: '魚', icon: 'set_meal', accent: 'sky', memoryRate: 0.62,
    // 画像アセットがまだ用意されていない定義は、絵柄抽選から除外する。
    pool: PLAYABLE_FISH,
  },
  hard: {
    id: 'hard', label: 'HARD', pairs: 10, columns: 5, reward: 5, skillReward: 2,
    category: 'アイテム素材', icon: 'category', accent: 'rose', memoryRate: 0.95,
    pool: MATERIALS,
  },
  very_hard: {
    id: 'very_hard', label: 'VERY HARD', pairs: 12, columns: 6, reward: 10, skillReward: 3,
    category: 'モンスター・魚・素材', icon: 'skull', accent: 'violet', memoryRate: 1,
    mixedPools: [
      { prefix: 'monster', pool: MONSTERS, count: 4 },
      { prefix: 'fish', pool: PLAYABLE_FISH, count: 4 },
      { prefix: 'material', pool: MATERIALS, count: 4 },
    ],
  },
};

// スキルON時は、補助効果とのバランスを取った専用報酬を使う。
const getDifficultyReward = (config, skillsEnabled) => (
  skillsEnabled ? (config.skillReward ?? config.reward) : config.reward
);

const ACCENT_CLASSES = {
  emerald: 'border-emerald-400/40 from-emerald-500/20 to-emerald-950/35 text-emerald-200',
  sky: 'border-sky-400/40 from-sky-500/20 to-sky-950/35 text-sky-200',
  rose: 'border-rose-400/40 from-rose-500/20 to-rose-950/35 text-rose-200',
  violet: 'border-violet-300/55 from-violet-500/30 via-fuchsia-950/35 to-slate-950 text-violet-100 shadow-[0_0_22px_rgba(139,92,246,.16)]',
};

const SKILL_BRANCH_COLORS = {
  cyan: '34,211,238',
  amber: '251,191,36',
  violet: '167,139,250',
};

const shuffle = (items) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const dailyWinKey = difficultyId => `memoryGameLastWin:${difficultyId}`;

/** プレイヤーが残りをすべて取っても勝てない状態か判定する。 */
function getDecidedNonWinOutcome(game) {
  const foundPairs = game.scores.player + game.scores.cpu;
  const remainingPairs = Math.max(0, game.config.pairs - foundPairs);
  const maximumPlayerScore = game.scores.player + remainingPairs;

  if (remainingPairs === 0 && game.scores.player === game.scores.cpu) return 'draw';
  if (game.scores.cpu > maximumPlayerScore) return 'lose';
  if (game.scores.cpu === maximumPlayerScore) return 'draw_or_lose';
  return null;
}

const mixColor = (color, target, amount) => color.map((channel, index) => (
  Math.round(channel + (target[index] - channel) * amount)
));

/** 画像を小さく描画し、頻出度と彩度からカード背景用の主要色を求める。 */
function extractCardPalette(image) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 24;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const buckets = new Map();
    let fallback = [0, 0, 0];
    let fallbackCount = 0;

    for (let offset = 0; offset < pixels.length; offset += 4) {
      const alpha = pixels[offset + 3];
      if (alpha < 64) continue;
      const red = pixels[offset];
      const green = pixels[offset + 1];
      const blue = pixels[offset + 2];
      const brightest = Math.max(red, green, blue);
      const darkest = Math.min(red, green, blue);
      const saturation = brightest - darkest;
      fallback[0] += red;
      fallback[1] += green;
      fallback[2] += blue;
      fallbackCount += 1;

      // 白い余白とほぼ黒い影は、絵柄そのものの色より優先しない。
      if ((brightest > 238 && saturation < 18) || brightest < 18) continue;
      const key = `${red >> 5}-${green >> 5}-${blue >> 5}`;
      const bucket = buckets.get(key) || { count: 0, red: 0, green: 0, blue: 0, saturation: 0 };
      bucket.count += 1;
      bucket.red += red;
      bucket.green += green;
      bucket.blue += blue;
      bucket.saturation += saturation;
      buckets.set(key, bucket);
    }

    let winner = null;
    let winnerScore = -1;
    buckets.forEach(bucket => {
      const averageSaturation = bucket.saturation / bucket.count;
      const score = bucket.count * (0.75 + averageSaturation / 255);
      if (score > winnerScore) {
        winner = bucket;
        winnerScore = score;
      }
    });

    let base;
    if (winner) {
      base = [winner.red, winner.green, winner.blue].map(value => Math.round(value / winner.count));
    } else if (fallbackCount) {
      base = fallback.map(value => Math.round(value / fallbackCount));
    } else {
      base = [71, 85, 105];
    }

    return {
      light: mixColor(base, [255, 255, 255], 0.38),
      base: mixColor(base, [30, 41, 59], 0.12),
      dark: mixColor(base, [2, 6, 23], 0.62),
    };
  } catch (error) {
    console.warn('[MemoryGame] Could not extract card color.', error);
    return null;
  }
}

function applyExtractedCardColors(container) {
  const applyPalette = (image) => {
    if (!image.naturalWidth || !image.naturalHeight) return;
    const source = image.currentSrc || image.src;
    let palette = CARD_PALETTE_CACHE.get(source);
    if (!palette) {
      palette = extractCardPalette(image);
      if (palette) CARD_PALETTE_CACHE.set(source, palette);
    }
    if (!palette) return;

    container.querySelectorAll('[data-card-image]').forEach(candidate => {
      if ((candidate.currentSrc || candidate.src) !== source) return;
      const front = candidate.closest('[data-card-front]');
      if (!front) return;
      const light = palette.light.join(',');
      const base = palette.base.join(',');
      const dark = palette.dark.join(',');
      front.style.background = `radial-gradient(circle at 50% 22%, rgba(${light},.98), rgba(${base},.96) 58%, rgb(${dark}))`;
      front.style.borderColor = `rgba(${light},.82)`;
    });
  };

  container.querySelectorAll('[data-card-image]').forEach(image => {
    if (image.complete) applyPalette(image);
    else image.addEventListener('load', () => applyPalette(image), { once: true });
  });
}

function selectCardItems(config) {
  if (config.mixedPools) {
    return shuffle(config.mixedPools.flatMap(({ prefix, pool, count }) => (
      shuffle(pool).slice(0, count).map(item => ({ ...item, pairId: `${prefix}:${item.id}` }))
    )));
  }
  return shuffle(config.pool).slice(0, config.pairs).map(item => ({ ...item, pairId: item.id }));
}

const pageStyles = () => `
  <style>
    .memory-card { position:relative; perspective:700px; -webkit-tap-highlight-color:transparent; }
    .memory-card-inner { position:relative; width:100%; height:100%; transform-style:preserve-3d; transition:transform .38s cubic-bezier(.2,.75,.25,1); }
    .memory-card.is-flipped .memory-card-inner { transform:rotateY(180deg); }
    .memory-card-face { position:absolute; inset:0; overflow:hidden; border-radius:.65rem; backface-visibility:hidden; -webkit-backface-visibility:hidden; }
    .memory-card-front { transform:rotateY(180deg); }
    .memory-card.is-matched { animation:memory-match .55s ease-out both; }
    .memory-card.is-hint { z-index:2; animation:memory-hint .7s ease-in-out 2; }
    .memory-card.is-hint .memory-card-face:first-child { border-color:rgba(103,232,249,.98); box-shadow:0 0 18px 5px rgba(34,211,238,.72), inset 0 0 16px rgba(255,255,255,.28); }
    .memory-card.is-skill-hint { z-index:3; animation:memory-hint .7s ease-in-out infinite; }
    .memory-card.is-skill-hint .memory-card-face:first-child { border-color:rgba(253,230,138,.98); box-shadow:0 0 20px 6px rgba(245,158,11,.78), inset 0 0 16px rgba(255,255,255,.3); }
    .memory-card.is-clairvoyant:not(.is-flipped):not(.is-matched) { z-index:1; }
    .memory-card.is-clairvoyant:not(.is-flipped):not(.is-matched) .memory-card-face:first-child { border-color:rgba(103,232,249,.95); box-shadow:0 0 16px 3px rgba(34,211,238,.5), inset 0 0 18px rgba(129,230,217,.3); animation:memory-clairvoyance-aura 1.8s ease-in-out infinite; }
    .memory-card.is-clairvoyant:not(.is-flipped):not(.is-matched) [data-clairvoyant-vision] { display:flex; animation:memory-clairvoyance-vision .7s ease-out both; }
    .memory-card.is-skill-target { z-index:4; animation:memory-skill-target 1.15s ease-in-out infinite; }
    .memory-card.is-skill-target .memory-card-front { border-color:rgba(253,230,138,.98); box-shadow:0 0 20px 6px rgba(245,158,11,.72),inset 0 0 16px rgba(255,255,255,.24); }
    .memory-skill-target-badge { position:absolute; z-index:5; top:-6px; left:50%; display:none; min-width:max-content; transform:translateX(-50%); align-items:center; gap:2px; border:1px solid rgba(254,243,199,.9); border-radius:999px; padding:2px 6px; color:#451a03; background:linear-gradient(135deg,#fef3c7,#f59e0b); box-shadow:0 0 12px rgba(245,158,11,.85); font-size:8px; font-weight:900; line-height:1; }
    .memory-card.is-skill-target > .memory-skill-target-badge { display:flex; }
    .memory-skill-target-badge .material-symbols-outlined { font-size:11px; }
    .memory-skill-charge.is-ready { border-color:rgba(251,191,36,.75); background:rgba(245,158,11,.24); color:#fef3c7; box-shadow:0 0 12px rgba(245,158,11,.42); animation:memory-skill-charge-ready 1.15s ease-in-out infinite; }
    .memory-card:disabled { opacity:1; }
    .memory-card.is-skill-blocked:disabled:not(.is-matched) { opacity:.18; filter:grayscale(1); }
    @keyframes memory-match { 50% { transform:scale(1.08); filter:brightness(1.35); } 100% { transform:scale(1); filter:brightness(1); } }
    @keyframes memory-hint { 0%,100% { transform:scale(1); filter:brightness(1); } 50% { transform:scale(1.09); filter:brightness(1.55); } }
    @keyframes memory-clairvoyance-aura { 0%,100% { filter:brightness(1); } 50% { filter:brightness(1.28); } }
    @keyframes memory-clairvoyance-vision { from { opacity:0; transform:scale(.72); filter:blur(7px); } to { opacity:1; transform:scale(1); filter:blur(0); } }
    @keyframes memory-skill-target { 0%,100% { transform:scale(1); filter:brightness(1); } 50% { transform:scale(1.045); filter:brightness(1.3); } }
    @keyframes memory-skill-charge-ready { 0%,100% { filter:brightness(1); } 50% { filter:brightness(1.3); } }
    @keyframes memory-result-in { from { opacity:0; transform:translateY(10px) scale(.96); } to { opacity:1; transform:translateY(0) scale(1); } }
    @keyframes memory-coin-toss {
      0% { transform:translate(-50%,calc(-50% + 72px)) rotateX(-18deg) rotateY(0deg) scale(.72); }
      48% { transform:translate(-50%,calc(-50% - 92px)) rotateX(16deg) rotateY(990deg) scale(1.08); }
      100% { transform:translate(-50%,-50%) rotateX(0deg) rotateY(var(--coin-end)) scale(1); }
    }
    @keyframes memory-coin-shadow {
      0%,100% { opacity:.72; transform:scale(1); }
      48% { opacity:.18; transform:scale(.45); }
    }
    @keyframes memory-coin-result-in { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:translateY(0); } }
    .memory-result { animation:memory-result-in .28s ease-out both; }
    .memory-coin { animation:memory-coin-toss 1.45s cubic-bezier(.2,.72,.25,1) both; transform-style:preserve-3d; }
    .memory-coin-face { backface-visibility:hidden; -webkit-backface-visibility:hidden; }
    .memory-coin-face.is-back { transform:rotateY(180deg); }
    .memory-coin-shadow { animation:memory-coin-shadow 1.45s ease-in-out both; }
    .memory-coin-result { animation:memory-coin-result-in .3s ease-out both; }
    .memory-skill-tree-scroll { overflow-x:hidden; }
    .memory-skill-tree-canvas { width:100%; max-width:100%; padding:2px 10px 10px; }
    .memory-tree-root { position:relative; display:flex; width:min(100%,240px); min-height:58px; margin:0 auto; align-items:center; justify-content:center; gap:9px; border:1.5px solid rgba(103,232,249,.6); border-radius:14px; padding:8px 12px; background:radial-gradient(circle at 50% 10%,rgba(34,211,238,.3),rgba(15,23,42,.96) 65%); box-shadow:0 0 16px rgba(34,211,238,.2),inset 0 0 10px rgba(34,211,238,.08); }
    .memory-tree-root > .material-symbols-outlined { font-size:28px; }
    .memory-tree-root-copy { min-width:0; text-align:left; }
    .memory-tree-trunk { width:2px; height:14px; margin:0 auto; background:linear-gradient(rgba(103,232,249,.75),rgba(148,163,184,.45)); }
    .memory-tree-fork { display:none; position:relative; width:66.666%; height:16px; margin:0 auto; border-top:2px solid rgba(148,163,184,.38); }
    .memory-tree-fork span { position:absolute; top:-2px; width:2px; height:18px; background:linear-gradient(rgba(148,163,184,.42),rgba(148,163,184,.2)); }
    .memory-tree-fork span:nth-child(1) { left:0; }
    .memory-tree-fork span:nth-child(2) { left:50%; transform:translateX(-50%); }
    .memory-tree-fork span:nth-child(3) { right:0; }
    .memory-branch-tabs { position:relative; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:6px; margin-bottom:12px; }
    .memory-branch-tab { --branch-rgb:34,211,238; display:flex; min-width:0; min-height:56px; flex-direction:column; align-items:center; justify-content:center; gap:2px; border:1px solid rgba(100,116,139,.34); border-radius:12px; padding:6px 3px; color:#64748b; background:rgba(15,23,42,.86); }
    .memory-branch-tab .material-symbols-outlined { font-size:21px; }
    .memory-branch-tab.is-active { border-color:rgba(var(--branch-rgb),.7); color:rgb(var(--branch-rgb)); background:linear-gradient(160deg,rgba(var(--branch-rgb),.22),rgba(15,23,42,.96) 70%); box-shadow:0 0 12px rgba(var(--branch-rgb),.13),inset 0 1px rgba(255,255,255,.06); }
    .memory-branch-tab:focus-visible { outline:2px solid rgb(var(--branch-rgb)); outline-offset:2px; }
    .memory-tree-branches { display:block; }
    .memory-skill-branch { --branch-rgb:34,211,238; min-width:0; }
    .memory-skill-branch:not(.is-active) { display:none; }
    .memory-branch-head { display:flex; min-height:58px; align-items:center; gap:10px; border:1.5px solid rgba(var(--branch-rgb),.48); border-radius:12px; padding:9px 11px; background:linear-gradient(145deg,rgba(var(--branch-rgb),.2),rgba(15,23,42,.94) 70%); box-shadow:0 0 10px rgba(var(--branch-rgb),.12); text-align:left; }
    .memory-branch-head > .material-symbols-outlined { flex:0 0 auto; color:rgb(var(--branch-rgb)); font-size:25px; }
    .memory-branch-connector { width:2px; height:12px; margin:0 auto; background:rgba(var(--branch-rgb),.38); }
    .memory-skill-path { position:relative; display:flex; flex-direction:column; padding-left:25px; }
    .memory-skill-path::before { content:''; position:absolute; left:9px; top:0; bottom:20px; width:2px; background:linear-gradient(rgba(var(--branch-rgb),.52),rgba(var(--branch-rgb),.16)); }
    .memory-skill-node { position:relative; }
    .memory-skill-node + .memory-skill-node { margin-top:10px; }
    .memory-skill-node::before { content:''; position:absolute; left:-16px; top:50%; width:16px; height:2px; background:rgba(var(--branch-rgb),.42); }
    .memory-skill-node::after { content:''; position:absolute; z-index:1; left:-20px; top:calc(50% - 5px); width:10px; height:10px; border:2px solid rgba(var(--branch-rgb),.7); border-radius:999px; background:#0f172a; box-shadow:0 0 7px rgba(var(--branch-rgb),.28); }
    .memory-tree-skill { position:relative; display:grid; width:100%; min-height:108px; grid-template-columns:42px minmax(0,1fr); align-items:center; gap:10px; border:1.5px solid rgba(100,116,139,.36); border-radius:12px; padding:10px; color:#94a3b8; background:linear-gradient(160deg,rgba(30,41,59,.96),rgba(2,6,23,.98)); box-shadow:inset 0 1px rgba(255,255,255,.04); text-align:left; }
    .memory-tree-skill.is-learned { border-color:rgba(var(--branch-rgb),.5); color:#e2e8f0; background:linear-gradient(155deg,rgba(var(--branch-rgb),.18),rgba(15,23,42,.98) 68%); box-shadow:0 0 10px rgba(var(--branch-rgb),.1),inset 0 1px rgba(255,255,255,.08); }
    .memory-tree-skill.can-unlock { border-color:rgba(var(--branch-rgb),.9); color:white; box-shadow:0 0 14px rgba(var(--branch-rgb),.28),inset 0 0 10px rgba(var(--branch-rgb),.1); animation:memory-skill-ready 1.7s ease-in-out infinite; }
    .memory-tree-skill.is-max { border-color:rgba(52,211,153,.65); box-shadow:0 0 10px rgba(52,211,153,.15); }
    .memory-tree-skill:disabled { opacity:1; }
    .memory-skill-orb { display:flex; width:42px; height:42px; align-items:center; justify-content:center; border:1.5px solid rgba(100,116,139,.6); border-radius:999px; color:#64748b; background:#0f172a; box-shadow:0 2px 6px rgba(0,0,0,.45); }
    .memory-skill-orb .material-symbols-outlined { font-size:21px; }
    .is-learned .memory-skill-orb,.can-unlock .memory-skill-orb { border-color:rgba(var(--branch-rgb),.8); color:rgb(var(--branch-rgb)); background:rgb(15,23,42); box-shadow:0 0 8px rgba(var(--branch-rgb),.28); }
    .is-max .memory-skill-orb { border-color:rgba(52,211,153,.8); color:#6ee7b7; }
    .memory-skill-content { display:flex; min-width:0; height:100%; flex-direction:column; justify-content:center; }
    .memory-skill-title-row { display:flex; align-items:center; justify-content:space-between; gap:8px; }
    .memory-skill-name { min-width:0; color:white; font-size:12px; font-weight:900; line-height:1.25; }
    .memory-skill-rank { flex:0 0 auto; font-size:9px; font-weight:900; letter-spacing:.06em; }
    .memory-rank-dots { display:flex; justify-content:flex-start; gap:3px; margin-top:4px; }
    .memory-rank-dot { width:6px; height:6px; border:1px solid rgba(148,163,184,.45); border-radius:999px; background:#0f172a; }
    .memory-rank-dot.is-filled { border-color:rgba(var(--branch-rgb),.9); background:rgb(var(--branch-rgb)); box-shadow:0 0 4px rgba(var(--branch-rgb),.65); }
    .memory-skill-description { margin-top:6px; color:#cbd5e1; font-size:10px; line-height:1.45; }
    .memory-skill-next { margin-top:2px; color:#94a3b8; font-size:9px; line-height:1.4; }
    .memory-tree-status { margin-top:7px; width:100%; border-top:1px solid rgba(148,163,184,.14); padding-top:6px; font-size:9px; font-weight:900; }
    .memory-tree-status .material-symbols-outlined { font-size:12px; }
    @media (min-width:640px) {
      .memory-skill-tree-canvas { padding-inline:2px; }
      .memory-tree-root { width:104px; min-height:54px; flex-direction:column; gap:0; padding:4px; text-align:center; }
      .memory-tree-root > .material-symbols-outlined { font-size:30px; }
      .memory-tree-root-copy { text-align:center; }
      .memory-tree-fork { display:block; }
      .memory-branch-tabs { display:none; }
      .memory-tree-branches { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; align-items:start; }
      .memory-skill-branch:not(.is-active) { display:block; }
      .memory-branch-head { min-height:58px; justify-content:center; gap:5px; padding:6px; text-align:left; }
      .memory-branch-head > .material-symbols-outlined { font-size:20px; }
      .memory-skill-path { padding-left:0; }
      .memory-skill-path::before { display:none; }
      .memory-skill-node + .memory-skill-node { margin-top:14px; }
      .memory-skill-node::after { display:none; }
      .memory-skill-node::before { left:50%; top:auto; bottom:100%; width:2px; height:14px; transform:translateX(-50%); background:rgba(var(--branch-rgb),.38); }
      .memory-skill-node:first-child::before { display:none; }
      .memory-tree-skill { display:flex; min-height:132px; flex-direction:column; gap:0; padding:17px 6px 6px; text-align:center; }
      .memory-skill-orb { position:absolute; top:-11px; left:50%; width:26px; height:26px; transform:translateX(-50%); }
      .memory-skill-orb .material-symbols-outlined { font-size:16px; }
      .memory-skill-content { width:100%; align-items:center; }
      .memory-skill-title-row { width:100%; flex-direction:column; justify-content:center; gap:1px; }
      .memory-skill-name { width:100%; overflow:hidden; font-size:10px; text-overflow:ellipsis; white-space:nowrap; }
      .memory-skill-rank { font-size:8px; }
      .memory-rank-dots { justify-content:center; gap:2px; margin-top:3px; }
      .memory-rank-dot { width:5px; height:5px; }
      .memory-skill-description { margin-top:5px; font-size:8px; line-height:1.35; }
      .memory-skill-next { font-size:7px; line-height:1.3; }
      .memory-tree-status { margin-top:auto; padding-top:4px; font-size:8px; }
      .memory-tree-status .material-symbols-outlined { font-size:11px; }
    }
    @media (max-width:360px) {
      .memory-skill-tree-canvas { padding-inline:7px; }
      .memory-branch-tab { min-height:52px; }
      .memory-branch-tab .material-symbols-outlined { font-size:19px; }
      .memory-tree-skill { grid-template-columns:38px minmax(0,1fr); gap:8px; padding:9px; }
      .memory-skill-orb { width:38px; height:38px; }
    }
    @keyframes memory-skill-ready { 0%,100% { filter:brightness(1); } 50% { filter:brightness(1.18); } }
    @media (prefers-reduced-motion: reduce) {
      .memory-card-inner { transition:none; }
      .memory-card.is-matched, .memory-card.is-hint, .memory-card.is-skill-hint, .memory-card.is-clairvoyant:not(.is-flipped):not(.is-matched) .memory-card-face:first-child, .memory-card.is-clairvoyant:not(.is-flipped):not(.is-matched) [data-clairvoyant-vision], .memory-card.is-skill-target, .memory-skill-charge.is-ready, .memory-result { animation:none; }
      .memory-coin, .memory-coin-shadow { animation-duration:.01ms; }
      .memory-coin-result { animation:none; }
      .memory-tree-skill.can-unlock { animation:none; }
    }
  </style>
`;

function difficultyCard(config, cleared, skillsEnabled) {
  const reward = getDifficultyReward(config, skillsEnabled);
  return `
    <button data-difficulty="${config.id}"
            ${cleared ? 'disabled aria-disabled="true"' : ''}
            class="flex min-h-[92px] items-center gap-3 rounded-2xl border bg-gradient-to-br p-3 text-left shadow-lg active:scale-[.98] ${cleared ? 'border-slate-700 from-slate-900/70 to-slate-950 text-slate-500 opacity-65' : ACCENT_CLASSES[config.accent]}">
      <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-black/25">
        <span class="material-symbols-outlined text-2xl">${cleared ? 'check_circle' : config.icon}</span>
      </span>
      <span class="min-w-0 flex-1">
        <span class="block text-sm font-black tracking-[.16em] ${cleared ? 'text-slate-400' : 'text-white'}">${config.label}</span>
        <span class="mt-0.5 block text-[10px] text-slate-300">${config.category} ・ ${config.pairs}ペア</span>
        <span class="mt-1 flex items-center gap-1 text-[10px] font-black ${cleared ? 'text-emerald-400' : 'text-fuchsia-200'}"><span class="material-symbols-outlined text-[14px]">${cleared ? 'event_busy' : 'diamond'}</span>${cleared ? '本日はクリア済み' : `勝利報酬 ${reward} Prism`}</span>
      </span>
      <span class="material-symbols-outlined text-white/45">${cleared ? 'lock_clock' : 'chevron_right'}</span>
    </button>
  `;
}

function skillModePanel(enabled, hasLearnedSkills) {
  return `
    <section class="mb-3 rounded-2xl border ${enabled ? 'border-cyan-300/30 bg-cyan-950/25' : 'border-slate-600/40 bg-slate-950/65'} p-3 shadow-lg" aria-labelledby="memory-skill-mode-title">
      <div class="flex items-center gap-3">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${enabled ? 'border-cyan-300/30 bg-cyan-500/10 text-cyan-200' : 'border-slate-600 bg-slate-800/60 text-slate-500'}"><span class="material-symbols-outlined">${enabled ? 'neurology' : 'do_not_disturb_on'}</span></span>
        <span class="min-w-0 flex-1">
          <span id="memory-skill-mode-title" class="block text-xs font-black text-white">神経衰弱スキル</span>
          <span class="mt-0.5 block text-[9px] leading-relaxed text-slate-400">${enabled ? '習得済みスキルを使用します。ON用の勝利報酬が適用されます。' : '習得済みスキルを使わず、通常の勝利報酬で遊びます。'}</span>
          ${!hasLearnedSkills ? '<span class="mt-0.5 block text-[8px] text-amber-300/80">習得済みスキルはまだありません。</span>' : ''}
        </span>
        <span class="grid shrink-0 grid-cols-2 rounded-xl border border-white/10 bg-black/25 p-1" role="group" aria-label="神経衰弱スキルの使用設定">
          <button type="button" data-skill-mode="on" aria-pressed="${enabled}" class="rounded-lg px-2.5 py-1.5 text-[9px] font-black ${enabled ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-500'}">ON</button>
          <button type="button" data-skill-mode="off" aria-pressed="${!enabled}" class="rounded-lg px-2.5 py-1.5 text-[9px] font-black ${enabled ? 'text-slate-500' : 'bg-slate-600 text-white shadow-md'}">OFF</button>
        </span>
      </div>
    </section>
  `;
}

function getMemoryLevelView(progress) {
  const level = getMemoryLevel(progress.xp);
  const levelStart = getMemoryLevelStartXp(level);
  const levelEnd = level >= MEMORY_MAX_LEVEL ? levelStart : getMemoryLevelStartXp(level + 1);
  const current = level >= MEMORY_MAX_LEVEL ? levelStart : progress.xp;
  const percent = level >= MEMORY_MAX_LEVEL
    ? 100
    : Math.max(0, Math.min(100, ((current - levelStart) / (levelEnd - levelStart)) * 100));
  return { level, levelStart, levelEnd, current, percent };
}

function memoryLevelPanel(progress) {
  const view = getMemoryLevelView(progress);
  const skillPoints = getMemorySkillPoints(progress);
  return `
    <section class="mb-3 rounded-2xl border border-cyan-300/20 bg-gradient-to-r from-cyan-950/35 via-slate-950/80 to-violet-950/35 p-3 shadow-lg">
      <div class="flex items-center gap-3">
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-500/10"><span class="material-symbols-outlined text-2xl text-cyan-200">neurology</span></span>
        <div class="min-w-0 flex-1">
          <div class="flex items-end justify-between gap-2"><span class="text-sm font-black text-white">神経衰弱 LV.${view.level}</span><span class="text-[9px] font-black text-violet-200">SP ${skillPoints}</span></div>
          <div class="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-800"><div class="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400" style="width:${view.percent}%"></div></div>
          <div class="mt-1 flex justify-between text-[8px] text-slate-400"><span>${progress.gamesPlayed}戦 ${progress.wins}勝</span><span>${view.level >= MEMORY_MAX_LEVEL ? 'MAX' : `${view.current - view.levelStart} / ${view.levelEnd - view.levelStart} EXP`}</span></div>
        </div>
        <button data-skill-tree class="flex h-10 shrink-0 items-center gap-1 rounded-xl border border-violet-300/30 bg-violet-500/15 px-2.5 text-[9px] font-black text-violet-100" aria-label="神経衰弱スキルツリーを開く"><span class="material-symbols-outlined text-lg">account_tree</span>スキル</button>
      </div>
    </section>
  `;
}

function skillNodeHtml(skill, progress) {
  const rank = progress.skillRanks[skill.id] || 0;
  const availability = canUnlockMemorySkill(progress, skill.id);
  const isMax = rank >= skill.maxRank;
  const currentDescription = rank > 0 ? skill.ranks[rank - 1] : skill.ranks[0];
  const nextDescription = !isMax ? skill.ranks[rank] : '';
  const stateClass = isMax ? 'is-learned is-max' : availability.ok ? `${rank ? 'is-learned ' : ''}can-unlock` : rank ? 'is-learned' : 'is-locked';
  return `
    <div class="memory-skill-node">
      <button data-unlock-skill="${skill.id}" ${availability.ok ? '' : 'disabled aria-disabled="true"'} class="memory-tree-skill ${stateClass} active:scale-[.98]" aria-label="${skill.name} Rank ${rank}/${skill.maxRank}。${availability.ok ? `${skill.cost} SPで習得可能` : availability.reason}">
        <span class="memory-skill-orb"><span class="material-symbols-outlined">${isMax ? 'check' : skill.icon}</span></span>
        <span class="memory-skill-content">
          <span class="memory-skill-title-row">
            <span class="memory-skill-name">${skill.name}</span>
            <span class="memory-skill-rank">RANK ${rank}/${skill.maxRank}</span>
          </span>
          <span class="memory-rank-dots" aria-hidden="true">${Array.from({ length: skill.maxRank }, (_, index) => `<span class="memory-rank-dot ${index < rank ? 'is-filled' : ''}"></span>`).join('')}</span>
          <span class="memory-skill-description">${rank ? currentDescription : `効果: ${currentDescription}`}</span>
          ${rank && nextDescription ? `<span class="memory-skill-next">次: ${nextDescription}</span>` : ''}
          <span class="memory-tree-status ${isMax ? 'text-emerald-300' : availability.ok ? 'text-white' : 'text-slate-500'}"><span class="material-symbols-outlined align-middle">${isMax ? 'verified' : availability.ok ? 'add_circle' : 'lock'}</span> ${isMax ? 'MASTERED' : availability.ok ? `${skill.cost} SPで習得` : availability.reason}</span>
        </span>
      </button>
    </div>
  `;
}

export function renderMemoryGamePage() {
  const container = document.createElement('div');
  container.className = 'relative min-h-full overflow-hidden bg-[#080916] text-white';
  container.dataset.memoryGamePage = 'true';

  let game = null;
  let disposed = false;
  let selectRenderId = 0;
  let dailyWins = new Set();
  let memoryProgress = null;
  let skillsEnabled = true;
  let activeSkillBranchId = MEMORY_SKILL_BRANCHES[0]?.id || '';
  let startingGame = false;
  const timers = new Set();

  const later = (fn, delay) => {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      if (!disposed) fn();
    }, delay);
    timers.add(timer);
    return timer;
  };

  const clearTimers = () => {
    timers.forEach(timer => window.clearTimeout(timer));
    timers.clear();
  };

  const renderDailyLoadError = () => {
    container.innerHTML = `
      ${pageStyles()}
      <div class="mx-auto flex min-h-[360px] max-w-sm flex-col items-center justify-center p-5 text-center">
        <span class="material-symbols-outlined text-5xl text-amber-300">sync_problem</span>
        <h1 class="mt-2 text-base font-black">プレイ状況を確認できません</h1>
        <p class="mt-2 text-[10px] leading-relaxed text-slate-400">日次クリア状況を確認できないため、ゲームを開始できませんでした。</p>
        <button data-reload-daily class="mt-4 w-full rounded-xl border border-amber-300/40 bg-amber-500/15 py-2.5 text-xs font-black text-amber-100">もう一度読み込む</button>
        <button data-home class="mt-2 w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-black text-slate-300">ホームタウンへ戻る</button>
      </div>
    `;
  };

  const renderSelect = async () => {
    clearTimers();
    game = null;
    const renderId = ++selectRenderId;
    container.innerHTML = `
      ${pageStyles()}
      <div class="flex min-h-[320px] items-center justify-center text-xs font-black text-slate-500">
        <span class="animate-pulse">本日のプレイ状況を確認中…</span>
      </div>
    `;

    const dateKey = getLocalDateKey();
    try {
      const [states, progress] = await Promise.all([
        Promise.all(Object.values(DIFFICULTIES).map(async config => ({
          id: config.id,
          cleared: (await GameDB.getGameState(dailyWinKey(config.id))) === dateKey,
        }))),
        loadMemoryProgress(),
      ]);
      dailyWins = new Set(states.filter(state => state.cleared).map(state => state.id));
      memoryProgress = progress;
    } catch (error) {
      console.error('[MemoryGame] Failed to load daily wins.', error);
      if (!disposed && renderId === selectRenderId) renderDailyLoadError();
      return;
    }
    if (disposed || renderId !== selectRenderId) return;

    container.innerHTML = `
      ${pageStyles()}
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_5%,rgba(244,63,94,.16),transparent_35%),radial-gradient(circle_at_90%_28%,rgba(79,70,229,.18),transparent_38%)]"></div>
      <div class="relative z-10 mx-auto max-w-lg p-2.5 pb-5">
        <header class="mb-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/75 p-2.5 shadow-xl backdrop-blur-md">
          <button data-home class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300" aria-label="ホームタウンへ戻る"><span class="material-symbols-outlined">arrow_back</span></button>
          <span class="relative flex h-11 w-14 shrink-0 items-center justify-center" aria-hidden="true">
            <span class="absolute h-9 w-7 -translate-x-2 -rotate-12 rounded-md border-2 border-white/80 bg-gradient-to-br from-rose-500 to-red-900"></span>
            <span class="absolute h-9 w-7 translate-x-2 rotate-12 rounded-md border-2 border-white/90 bg-gradient-to-br from-indigo-500 to-blue-950"></span>
            <span class="material-symbols-outlined relative text-2xl text-white">playing_cards</span>
          </span>
          <span class="min-w-0"><span class="block text-[9px] font-black tracking-[.24em] text-rose-300">CARD BATTLE</span><h1 class="text-lg font-black leading-tight">神経衰弱</h1><span class="text-[9px] text-slate-400">CPUより多くのペアを集めよう</span></span>
        </header>

        <section class="mb-3 rounded-2xl border border-amber-300/20 bg-amber-950/15 px-3 py-2.5 text-[10px] leading-relaxed text-slate-300">
          <div class="mb-1 flex items-center gap-1 font-black text-amber-200"><span class="material-symbols-outlined text-base">lightbulb</span>遊び方</div>
          同じ画像を2枚揃えると1ポイント。揃えた側は続けてカードをめくり、すべてのペアを取るか、途中で敗北または引き分けが確定した時点でゲーム終了です。
          <div class="mt-1.5 border-t border-amber-300/10 pt-1.5 text-amber-100/80">勝利した難易度は翌日までプレイできません。</div>
        </section>

        ${memoryLevelPanel(memoryProgress)}

        ${skillModePanel(skillsEnabled, Object.values(memoryProgress.skillRanks).some(Boolean))}

        <div class="grid gap-2" aria-label="難易度を選択">
          ${Object.values(DIFFICULTIES).map(config => difficultyCard(config, dailyWins.has(config.id), skillsEnabled)).join('')}
        </div>
      </div>
    `;
  };

  const renderSkillTree = async (notice = '') => {
    clearTimers();
    game = null;
    try {
      memoryProgress = await loadMemoryProgress();
    } catch (error) {
      console.error('[MemoryGame] Failed to load progression.', error);
      renderDailyLoadError();
      return;
    }
    if (disposed) return;
    const view = getMemoryLevelView(memoryProgress);
    const skillPoints = getMemorySkillPoints(memoryProgress);
    container.innerHTML = `
      ${pageStyles()}
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,.15),transparent_36%),radial-gradient(circle_at_90%_55%,rgba(139,92,246,.14),transparent_42%)]"></div>
      <div class="relative z-10 mx-auto max-w-md sm:max-w-lg p-2 pb-6">
        <header class="mb-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/80 p-2.5 shadow-xl">
          <button data-skill-back class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300" aria-label="難易度選択へ戻る"><span class="material-symbols-outlined">arrow_back</span></button>
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-500/10"><span class="material-symbols-outlined text-2xl text-cyan-200">account_tree</span></span>
          <div class="min-w-0 flex-1"><div class="text-[9px] font-black tracking-[.2em] text-cyan-300">MEMORY SKILL TREE</div><h1 class="text-base font-black">神経衰弱スキル</h1><div class="text-[9px] text-slate-400">LVアップごとに1 SP獲得</div></div>
          <div class="rounded-xl border border-violet-300/30 bg-violet-500/10 px-3 py-2 text-center"><div class="text-[8px] text-violet-300">SKILL POINT</div><div class="text-lg font-black text-white">${skillPoints}</div></div>
        </header>

        <section class="mb-3 rounded-2xl border border-white/10 bg-slate-950/70 p-3">
          <div class="flex items-center justify-between"><span class="text-sm font-black">LV.${view.level}</span><span class="text-[9px] text-slate-400">${memoryProgress.gamesPlayed}戦 / ${memoryProgress.wins}勝 / ${memoryProgress.draws}分 / ${memoryProgress.losses}敗</span></div>
          <div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-800"><div class="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400" style="width:${view.percent}%"></div></div>
          <div class="mt-1 text-right text-[8px] text-slate-400">${view.level >= MEMORY_MAX_LEVEL ? 'MAX LEVEL' : `${view.current - view.levelStart} / ${view.levelEnd - view.levelStart} EXP`}</div>
        </section>

        ${notice ? `<div class="mb-3 rounded-xl border border-emerald-300/25 bg-emerald-500/10 px-3 py-2 text-center text-[10px] font-black text-emerald-200" role="status">${notice}</div>` : ''}

        <section class="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/65 py-3 shadow-xl" aria-label="神経衰弱スキルツリー">
          <div class="mb-2 px-3 text-[8px] font-bold text-slate-400">ROOTから3系統へ分岐</div>
          <div class="memory-skill-tree-scroll px-1 pb-2">
            <div class="memory-skill-tree-canvas">
              <div class="memory-tree-root">
                <span class="material-symbols-outlined text-cyan-200">neurology</span>
                <span class="memory-tree-root-copy">
                  <span class="block text-[10px] font-black text-white">神経衰弱 LV.${view.level}</span>
                  <span class="block text-[8px] font-black text-violet-200">ROOT ・ ${skillPoints} SP</span>
                </span>
              </div>
              <div class="memory-tree-trunk"></div>
              <div class="memory-tree-fork" aria-hidden="true"><span></span><span></span><span></span></div>
              <div class="memory-branch-tabs" role="tablist" aria-label="スキル系統">
                ${MEMORY_SKILL_BRANCHES.map(branch => {
                  const isActive = branch.id === activeSkillBranchId;
                  return `
                    <button type="button" role="tab" data-memory-branch-tab="${branch.id}" aria-selected="${isActive}" aria-controls="memory-branch-${branch.id}" class="memory-branch-tab ${isActive ? 'is-active' : ''}" style="--branch-rgb:${SKILL_BRANCH_COLORS[branch.color] || SKILL_BRANCH_COLORS.cyan}">
                      <span class="material-symbols-outlined">${branch.icon}</span>
                      <span class="truncate text-[10px] font-black text-white">${branch.name}</span>
                    </button>
                  `;
                }).join('')}
              </div>
              <div class="memory-tree-branches">
                ${MEMORY_SKILL_BRANCHES.map(branch => `
                  <section id="memory-branch-${branch.id}" class="memory-skill-branch ${branch.id === activeSkillBranchId ? 'is-active' : ''}" style="--branch-rgb:${SKILL_BRANCH_COLORS[branch.color] || SKILL_BRANCH_COLORS.cyan}" aria-labelledby="memory-branch-title-${branch.id}">
                    <div class="memory-branch-head">
                      <span class="material-symbols-outlined">${branch.icon}</span>
                      <span class="min-w-0"><span id="memory-branch-title-${branch.id}" class="block text-xs font-black text-white">${branch.name}</span><span class="mt-0.5 block text-[9px] leading-relaxed text-slate-400">${branch.description}</span></span>
                    </div>
                    <div class="memory-branch-connector" aria-hidden="true"></div>
                    <div class="memory-skill-path">${branch.skills.map(skill => skillNodeHtml(skill, memoryProgress)).join('')}</div>
                  </section>
                `).join('')}
              </div>
            </div>
          </div>
        </section>
        <p class="mt-3 text-center text-[8px] leading-relaxed text-slate-500">スキルは秘宝とは別枠で常時発動します。現在、SPの振り直しはできません。</p>
      </div>
    `;
  };

  const updateHeaderPrism = (value) => {
    const display = document.getElementById('header-prism-display');
    if (display) display.textContent = formatNumber(value);
    const holder = document.getElementById('header-prism');
    if (holder) holder.setAttribute('aria-label', `プリズム ${formatNumber(value)}`);
  };

  const startGame = async (difficultyId, useSkills = skillsEnabled) => {
    const baseConfig = DIFFICULTIES[difficultyId];
    if (!baseConfig || dailyWins.has(difficultyId) || startingGame) return;
    const config = {
      ...baseConfig,
      reward: getDifficultyReward(baseConfig, useSkills),
    };

    startingGame = true;
    try {
      const dateKey = getLocalDateKey();
      const latestWin = await GameDB.getGameState(dailyWinKey(difficultyId));
      if (latestWin === dateKey) {
        dailyWins.add(difficultyId);
        await renderSelect();
        return;
      }
    } catch (error) {
      console.error('[MemoryGame] Failed to verify daily win.', error);
      renderDailyLoadError();
      return;
    } finally {
      startingGame = false;
    }

    if (disposed) return;
    clearTimers();

    if (!memoryProgress) {
      try {
        memoryProgress = await loadMemoryProgress();
      } catch (error) {
        console.error('[MemoryGame] Failed to load progression.', error);
        renderDailyLoadError();
        return;
      }
    }
    const selectedItems = selectCardItems(config);
    const clairvoyancePercent = getTreasureEffect('memoryClairvoyancePercent');
    const cpuForgetPercent = getTreasureEffect('memoryCpuForgetPercent');
    const hintPercent = getTreasureEffect('memoryHintPercent');
    const skillEffects = getMemorySkillEffects(useSkills ? memoryProgress : null);
    // 先行は成長要素に左右されず、常に公平な50:50とする。
    const firstTurn = Math.random() < 0.5 ? 'player' : 'cpu';
    const cards = shuffle(selectedItems.flatMap((item) => [
      { pairId: item.pairId, name: item.name, image: item.image },
      { pairId: item.pairId, name: item.name, image: item.image },
    ])).map((card, index) => ({ ...card, index }));

    game = {
      config,
      cards,
      matched: new Set(),
      selected: [],
      cpuMemory: new Map(),
      scores: { player: 0, cpu: 0 },
      turn: firstTurn,
      locked: true,
      over: false,
      rewardClaimed: false,
      progressionRecorded: false,
      progressionResult: null,
      progressionFailed: false,
      clairvoyancePercent,
      cpuMemoryRate: Math.max(0, config.memoryRate
        * (1 - cpuForgetPercent / 100)
        * (1 - skillEffects.cpuMemoryPenaltyPercent / 100)),
      hintPercent,
      skillsEnabled: useSkills,
      skillEffects,
      firstCardResetCharges: skillEffects.firstCardResetCharges,
      refocusCharges: skillEffects.refocusCharges,
      doubleCheckCharges: skillEffects.doubleCheckCharges,
      knownMateHintCharges: skillEffects.knownMateHintCharges,
      pairSearchCharges: skillEffects.pairSearchCharges,
      seenCardOrder: [],
      seenPairLabels: new Map(),
      openingVisionIndices: new Set(),
      treasureVisionIndices: new Set(),
      activeSkillHintIndex: null,
      candidateAllowedIndices: null,
    };

    container.innerHTML = `
      ${pageStyles()}
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,.18),transparent_42%)]"></div>
      <div class="relative z-10 mx-auto max-w-xl p-2 pb-5">
        <header class="mb-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/80 p-2 shadow-lg backdrop-blur-md">
          <button data-select class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300" aria-label="難易度選択へ戻る"><span class="material-symbols-outlined">arrow_back</span></button>
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-300/20 bg-indigo-500/15"><span class="material-symbols-outlined text-indigo-200">playing_cards</span></span>
          <div class="min-w-0 flex-1"><div class="text-[9px] font-black tracking-[.2em] text-indigo-300">${config.label}</div><div class="truncate text-xs font-black">${config.category}カード ・ ${config.pairs}ペア</div></div>
          <div class="flex items-center gap-0.5 rounded-lg border border-fuchsia-300/25 bg-fuchsia-500/10 px-2 py-1 text-[9px] font-black text-fuchsia-200"><span class="material-symbols-outlined text-[13px]">diamond</span>${config.reward}</div>
        </header>

        <section class="mb-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/75 p-2 shadow-lg">
          <div data-player-panel class="rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 text-center transition-all">
            <div class="text-[8px] font-black tracking-widest text-cyan-300">YOU</div><div data-player-score class="text-xl font-black tabular-nums">0</div>
          </div>
          <div class="text-center"><div class="text-[8px] text-slate-500">PAIRS</div><div class="text-[10px] font-black text-slate-300"><span data-found-count>0</span> / ${config.pairs}</div></div>
          <div data-cpu-panel class="rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 text-center transition-all">
            <div class="text-[8px] font-black tracking-widest text-rose-300">CPU</div><div data-cpu-score class="text-xl font-black tabular-nums">0</div>
          </div>
        </section>

        <div data-message class="mb-2 flex min-h-8 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-950/25 px-3 text-center text-[10px] font-black text-amber-100" role="status" aria-live="polite">コイントスで先行を決めています…</div>

        ${clairvoyancePercent || cpuForgetPercent || hintPercent ? `<section class="mb-2 flex flex-wrap justify-center gap-1 rounded-xl border border-violet-300/15 bg-violet-950/20 p-1.5" aria-label="発動中の神経衰弱用秘宝">
          ${clairvoyancePercent ? `<span class="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2 py-1 text-[8px] font-black text-cyan-200">千里眼 透視${clairvoyancePercent}%</span>` : ''}
          ${cpuForgetPercent ? `<span class="rounded-full border border-violet-400/25 bg-violet-500/10 px-2 py-1 text-[8px] font-black text-violet-200">CPU記憶力 −${cpuForgetPercent}%</span>` : ''}
          ${hintPercent ? `<span class="rounded-full border border-rose-400/25 bg-rose-500/10 px-2 py-1 text-[8px] font-black text-rose-200">ペアヒント ${hintPercent}%</span>` : ''}
        </section>` : ''}

        ${useSkills && Object.values(memoryProgress.skillRanks).some(Boolean) ? `<section class="mb-2 flex flex-wrap justify-center gap-1 rounded-xl border border-cyan-300/15 bg-cyan-950/15 p-1.5" aria-label="発動中の神経衰弱スキル">
          ${skillEffects.candidateChoiceCount ? `<span class="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2 py-1 text-[8px] font-black text-cyan-200">候補絞り ${skillEffects.candidateChoiceCount}枚</span>` : ''}
          ${skillEffects.knownMateHintCharges ? `<span data-known-hint-status class="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2 py-1 text-[8px] font-black text-cyan-200">ペアナビ ${Number.isFinite(skillEffects.knownMateHintCharges) ? `${skillEffects.knownMateHintCharges}回` : '無制限'}</span>` : ''}
          ${skillEffects.knownPairGuideLimit ? `<span class="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2 py-1 text-[8px] font-black text-cyan-200">完全照合 ${Number.isFinite(skillEffects.knownPairGuideLimit) ? '1組' : '全組'}</span>` : ''}
          ${skillEffects.firstCardResetCharges ? `<span data-first-card-reset-status class="memory-skill-charge rounded-full border border-amber-400/25 bg-amber-500/10 px-2 py-1 text-[8px] font-black text-amber-200">仕切り直し 残り${skillEffects.firstCardResetCharges}回</span>` : ''}
          ${skillEffects.refocusCharges ? `<span class="rounded-full border border-amber-400/25 bg-amber-500/10 px-2 py-1 text-[8px] font-black text-amber-200">再集中 ${skillEffects.refocusCharges}回</span>` : ''}
          ${skillEffects.doubleCheckCharges ? '<span class="rounded-full border border-amber-400/25 bg-amber-500/10 px-2 py-1 text-[8px] font-black text-amber-200">見直し 1回</span>' : ''}
          ${skillEffects.openingVisionCount ? `<span class="rounded-full border border-violet-400/25 bg-violet-500/10 px-2 py-1 text-[8px] font-black text-violet-200">開幕透視 ${skillEffects.openingVisionCount}枚</span>` : ''}
          ${skillEffects.pairSearchCharges ? `<span data-pair-search-status class="rounded-full border border-violet-400/25 bg-violet-500/10 px-2 py-1 text-[8px] font-black text-violet-200">強制サーチ ${skillEffects.pairSearchCharges}回</span>` : ''}
          ${skillEffects.cpuMemoryPenaltyPercent ? `<span class="rounded-full border border-violet-400/25 bg-violet-500/10 px-2 py-1 text-[8px] font-black text-violet-200">CPU記憶 −${skillEffects.cpuMemoryPenaltyPercent}%</span>` : ''}
        </section>` : ''}

        <section data-board class="mx-auto grid w-full gap-1.5" style="grid-template-columns:repeat(${config.columns},minmax(0,1fr));max-width:${config.columns >= 6 ? '520px' : config.columns === 5 ? '470px' : '400px'}" aria-label="神経衰弱のカード">
          ${cards.map(card => `
            <button data-card-index="${card.index}" class="memory-card aspect-[3/4] min-w-0 rounded-[.65rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300" aria-label="伏せられたカード ${card.index + 1}">
              <span class="memory-card-inner block">
                <span class="memory-card-face flex items-center justify-center border-2 border-slate-300/70 bg-[repeating-linear-gradient(135deg,#312e81_0,#312e81_5px,#1e1b4b_5px,#1e1b4b_10px)] shadow-md">
                  <span class="absolute inset-1 rounded-md border border-white/25"></span><span class="material-symbols-outlined text-[clamp(18px,6vw,30px)] text-white/85 drop-shadow">playing_cards</span>
                  <span data-memory-mark class="absolute right-1.5 top-1.5 hidden h-5 min-w-5 items-center justify-center rounded-full border border-amber-100/70 bg-amber-500 px-1 text-[9px] font-black text-slate-950 shadow-[0_0_10px_rgba(251,191,36,.65)]" aria-hidden="true"></span>
                  <span data-clairvoyant-vision class="absolute inset-1 hidden flex-col items-center justify-center overflow-hidden rounded-md border border-cyan-100/70 bg-cyan-950/90 p-0.5 shadow-[inset_0_0_14px_rgba(103,232,249,.6)]" aria-hidden="true">
                    <img src="${card.image}" alt="" class="min-h-0 w-full flex-1 object-contain opacity-80 drop-shadow-[0_0_5px_rgba(165,243,252,.9)]">
                    <span class="block w-full truncate rounded-sm bg-cyan-950/85 px-0.5 py-px text-center text-[clamp(7px,1.8vw,9px)] font-black leading-none text-cyan-50">${card.name}</span>
                  </span>
                </span>
                <span data-card-front class="memory-card-face memory-card-front flex flex-col items-center justify-center border-2 border-slate-400/70 p-1 shadow-md" style="background:linear-gradient(to bottom,#64748b,#1e293b)">
                  <img data-card-image src="${card.image}" alt="" class="min-h-0 w-full flex-1 object-contain drop-shadow-md" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'">
                  <span class="material-symbols-outlined flex-1 place-items-center text-3xl text-slate-500" style="display:none">image</span>
                  <span class="mt-0.5 block w-full rounded-sm bg-slate-950/75 px-0.5 py-0.5 whitespace-normal break-all text-center text-[clamp(8px,2vw,11px)] font-black leading-[1.1] text-white shadow-sm">${card.name}</span>
                </span>
              </span>
              <span class="memory-skill-target-badge" aria-hidden="true"><span class="material-symbols-outlined">undo</span>戻す</span>
            </button>
          `).join('')}
        </section>
      </div>
      <div data-coin-toss class="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="memory-coin-title">
        <section class="w-full max-w-xs rounded-3xl border border-amber-300/35 bg-gradient-to-b from-slate-900 to-slate-950 px-5 py-6 text-center shadow-2xl">
          <div class="text-[9px] font-black tracking-[.3em] text-amber-300">FIRST MOVE</div>
          <h2 id="memory-coin-title" class="mt-1 text-lg font-black">先行を決めます</h2>
          <div class="relative mx-auto mt-5 h-36 w-36 [perspective:700px]" aria-hidden="true">
            <div data-coin class="memory-coin absolute left-1/2 top-1/2 h-24 w-24" style="--coin-end:${firstTurn === 'player' ? '1800deg' : '1980deg'}">
              <div class="memory-coin-face absolute inset-0 flex flex-col items-center justify-center rounded-full border-4 border-yellow-100 bg-gradient-to-br from-yellow-200 via-amber-400 to-yellow-700 text-slate-900 shadow-[inset_0_0_0_4px_rgba(120,53,15,.25),0_0_25px_rgba(251,191,36,.45)]">
                <span class="material-symbols-outlined text-4xl">person</span><span class="text-[9px] font-black">YOU</span>
              </div>
              <div class="memory-coin-face is-back absolute inset-0 flex flex-col items-center justify-center rounded-full border-4 border-rose-100 bg-gradient-to-br from-rose-200 via-rose-400 to-red-800 text-slate-950 shadow-[inset_0_0_0_4px_rgba(127,29,29,.25),0_0_25px_rgba(251,113,133,.45)]">
                <span class="material-symbols-outlined text-4xl">smart_toy</span><span class="text-[9px] font-black">CPU</span>
              </div>
            </div>
            <div class="memory-coin-shadow absolute bottom-2 left-1/2 h-3 w-20 -translate-x-1/2 rounded-full bg-black/70 blur-sm"></div>
          </div>
          <div data-coin-status class="min-h-12 text-xs font-black text-slate-400" role="status" aria-live="assertive">コイントス中…</div>
        </section>
      </div>
    `;
    applyExtractedCardColors(container);
    game.openingVisionIndices = new Set(shuffle(game.cards.map(card => card.index))
      .slice(0, game.skillEffects.openingVisionCount));
    game.openingVisionIndices.forEach(index => rememberForPlayer(index));
    updateMemoryAssists();

    const beginFirstTurn = () => {
      if (!game || game.over) return;
      updateScores();
      if (firstTurn === 'player') {
        game.locked = false;
        setMessage('あなたが先行です。2枚めくってください');
      } else {
        setMessage('CPUが先行です。考えています…', 'rose');
        runCpuTurn();
      }
    };

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    later(() => {
      if (!game || game.over) return;
      const status = container.querySelector('[data-coin-status]');
      if (status) {
        status.className = `memory-coin-result min-h-12 text-base font-black ${firstTurn === 'player' ? 'text-cyan-200' : 'text-rose-200'}`;
        status.innerHTML = firstTurn === 'player'
          ? '<span class="block text-[9px] tracking-[.2em] text-cyan-400">YOU</span>あなたが先行です！'
          : '<span class="block text-[9px] tracking-[.2em] text-rose-400">CPU</span>CPUが先行です！';
      }
      playSoundEffect('confirm');
    }, reducedMotion ? 80 : 1480);

    later(() => {
      if (!game || game.over) return;
      container.querySelector('[data-coin-toss]')?.remove();
      beginFirstTurn();
    }, reducedMotion ? 650 : 2380);
  };

  const cardElement = (index) => container.querySelector(`[data-card-index="${index}"]`);

  const updateSkillTargets = () => {
    if (!game) return;
    container.querySelectorAll('.memory-card.is-skill-target').forEach(element => {
      element.classList.remove('is-skill-target');
      const index = Number(element.dataset.cardIndex);
      if (!Number.isInteger(index) || !game.cards[index]) return;
      element.setAttribute('aria-label', element.classList.contains('is-flipped')
        ? game.cards[index].name
        : element.classList.contains('is-clairvoyant')
          ? `透視中: ${game.cards[index].name}`
          : `伏せられたカード ${index + 1}`);
    });

    const canResetFirstCard = game.turn === 'player'
      && !game.locked
      && game.selected.length === 1
      && game.firstCardResetCharges > 0;
    const resetStatus = container.querySelector('[data-first-card-reset-status]');
    if (resetStatus) {
      resetStatus.textContent = `仕切り直し 残り${game.firstCardResetCharges}回`;
      resetStatus.classList.toggle('is-ready', canResetFirstCard);
      resetStatus.classList.toggle('opacity-50', game.firstCardResetCharges <= 0);
    }
    if (!canResetFirstCard) return;

    const targetIndex = game.selected[0];
    const target = cardElement(targetIndex);
    target?.classList.add('is-skill-target');
    target?.setAttribute('aria-label', `${game.cards[targetIndex].name}。仕切り直しを発動できます`);
  };

  const setMessage = (message, style = 'cyan') => {
    const element = container.querySelector('[data-message]');
    if (!element) return;
    element.textContent = message;
    const styles = {
      cyan: 'border-cyan-300/20 bg-cyan-950/25 text-cyan-100',
      rose: 'border-rose-300/20 bg-rose-950/25 text-rose-100',
      amber: 'border-amber-300/20 bg-amber-950/25 text-amber-100',
      emerald: 'border-emerald-300/20 bg-emerald-950/25 text-emerald-100',
    };
    element.className = `mb-2 flex min-h-8 items-center justify-center rounded-xl border px-3 text-center text-[10px] font-black ${styles[style] || styles.cyan}`;
  };

  const updateScores = () => {
    if (!game) return;
    const playerScore = container.querySelector('[data-player-score]');
    const cpuScore = container.querySelector('[data-cpu-score]');
    const foundCount = container.querySelector('[data-found-count]');
    if (playerScore) playerScore.textContent = game.scores.player;
    if (cpuScore) cpuScore.textContent = game.scores.cpu;
    if (foundCount) foundCount.textContent = game.scores.player + game.scores.cpu;
    const playerPanel = container.querySelector('[data-player-panel]');
    const cpuPanel = container.querySelector('[data-cpu-panel]');
    playerPanel?.classList.toggle('border-cyan-300/40', game.turn === 'player');
    playerPanel?.classList.toggle('bg-cyan-500/10', game.turn === 'player');
    playerPanel?.classList.toggle('shadow-[0_0_16px_rgba(34,211,238,.22)]', game.turn === 'player');
    cpuPanel?.classList.toggle('border-rose-300/40', game.turn === 'cpu');
    cpuPanel?.classList.toggle('bg-rose-500/10', game.turn === 'cpu');
    updateMemoryAssists();
  };

  const rememberCard = (index) => {
    if (!game || game.matched.has(index)) return;
    if (Math.random() < game.cpuMemoryRate) {
      game.cpuMemory.set(index, game.cards[index].pairId);
    }
  };

  const tryTreasureHint = (selectedIndex) => {
    if (!game?.hintPercent || Math.random() * 100 >= game.hintPercent) return;
    const pairId = game.cards[selectedIndex].pairId;
    const mateIndex = game.cards.findIndex((card, index) => (
      index !== selectedIndex && !game.matched.has(index) && card.pairId === pairId
    ));
    if (mateIndex < 0) return;

    const mate = cardElement(mateIndex);
    mate?.classList.add('is-hint');
    setMessage('共鳴の羅針盤がペアの場所を示しています！', 'emerald');
    later(() => mate?.classList.remove('is-hint'), 1500);
  };

  const knownPlayerPairs = () => {
    if (!game) return [];
    const seen = new Set(game.seenCardOrder);
    const byPair = new Map();
    game.cards.forEach((card, index) => {
      if (!seen.has(index) || game.matched.has(index)) return;
      if (!byPair.has(card.pairId)) byPair.set(card.pairId, []);
      byPair.get(card.pairId).push(index);
    });
    return [...byPair.values()].filter(indices => indices.length >= 2);
  };

  /** 習得スキルが覚えた内容を、記憶力不要の視覚情報として盤面へ反映する。 */
  const updateMemoryAssists = () => {
    if (!game) return;
    const vision = new Set([
      ...game.openingVisionIndices,
      ...game.treasureVisionIndices,
    ]);
    const allKnownPairs = knownPlayerPairs();
    const guidedPairs = allKnownPairs.slice(0, game.skillEffects.knownPairGuideLimit);
    const guidedIndices = new Set(guidedPairs.flat());
    if (game.activeSkillHintIndex != null) guidedIndices.add(game.activeSkillHintIndex);

    game.cards.forEach((card, index) => {
      const element = cardElement(index);
      if (!element) return;
      const isAvailable = !game.matched.has(index);
      const showVision = isAvailable && vision.has(index);
      const showGuide = isAvailable && guidedIndices.has(index);
      element.classList.toggle('is-clairvoyant', showVision);
      element.classList.toggle('is-skill-hint', showGuide);
      if (!element.classList.contains('is-flipped')) {
        element.setAttribute('aria-label', showVision
          ? `記録済み: ${card.name}`
          : showGuide
            ? `ペア候補として発光中のカード ${index + 1}`
            : `伏せられたカード ${index + 1}`);
      }

      const pairMark = element.querySelector('[data-memory-mark]');
      const showPairMark = guidedIndices.has(index) && allKnownPairs.some(pair => pair.includes(index));
      if (pairMark) {
        pairMark.textContent = showPairMark ? game.seenPairLabels.get(card.pairId) : '';
        pairMark.classList.toggle('hidden', !showPairMark);
        pairMark.classList.toggle('flex', showPairMark);
      }
    });

    const knownHintStatus = container.querySelector('[data-known-hint-status]');
    if (knownHintStatus) {
      knownHintStatus.textContent = `ペアナビ ${Number.isFinite(game.knownMateHintCharges) ? `残り${game.knownMateHintCharges}回` : '無制限'}`;
      knownHintStatus.classList.toggle('opacity-50', game.knownMateHintCharges <= 0);
    }
    const searchStatus = container.querySelector('[data-pair-search-status]');
    if (searchStatus) {
      searchStatus.textContent = `強制サーチ 残り${game.pairSearchCharges}回`;
      searchStatus.classList.toggle('opacity-50', game.pairSearchCharges <= 0);
    }
  };

  const rememberForPlayer = (index) => {
    if (!game || game.matched.has(index)) return;
    const pairId = game.cards[index].pairId;
    if (!game.seenPairLabels.has(pairId)) {
      const labelIndex = game.seenPairLabels.size;
      game.seenPairLabels.set(pairId, String.fromCharCode(65 + (labelIndex % 26)));
    }
    game.seenCardOrder = game.seenCardOrder.filter(seenIndex => seenIndex !== index);
    game.seenCardOrder.push(index);
    updateMemoryAssists();
  };

  const revealCard = (index) => {
    if (!game) return;
    const element = cardElement(index);
    element?.classList.add('is-flipped');
    element?.setAttribute('aria-label', game.cards[index].name);
    rememberCard(index);
    // CPUがめくったカードもユーザーが見ているため、記憶術の記録対象にする。
    rememberForPlayer(index);
  };

  const hideCards = (indices) => {
    indices.forEach(index => {
      const element = cardElement(index);
      element?.classList.remove('is-flipped');
      element?.setAttribute('aria-label', element?.classList.contains('is-clairvoyant')
        ? `記録済み: ${game.cards[index].name}`
        : `伏せられたカード ${index + 1}`);
    });
    updateMemoryAssists();
  };

  const tryClairvoyance = (indices) => {
    if (!game?.clairvoyancePercent) return 0;
    let revealedCount = 0;
    indices.forEach(index => {
      const element = cardElement(index);
      if (!element || element.classList.contains('is-clairvoyant') || game.treasureVisionIndices.has(index)) return;
      if (Math.random() * 100 >= game.clairvoyancePercent) return;
      game.treasureVisionIndices.add(index);
      rememberForPlayer(index);
      revealedCount += 1;
    });
    updateMemoryAssists();
    return revealedCount;
  };

  /** 1枚目に対し、既知ペアナビを優先し、なければ強制サーチを消費する。 */
  const trySkillMateHint = (selectedIndex) => {
    if (!game) return false;
    const selected = game.cards[selectedIndex];
    const mateIndex = game.cards.findIndex((card, index) => (
      index !== selectedIndex && !game.matched.has(index) && card.pairId === selected.pairId
    ));
    if (mateIndex < 0) return false;

    const alreadyGuided = knownPlayerPairs()
      .slice(0, game.skillEffects.knownPairGuideLimit)
      .some(pair => pair.includes(selectedIndex) && pair.includes(mateIndex));
    if (alreadyGuided) {
      game.activeSkillHintIndex = mateIndex;
      updateMemoryAssists();
      setMessage('完全照合：判明済みの正解ペアが発光しています', 'emerald');
      return true;
    }

    const mateWasSeen = game.seenCardOrder.includes(mateIndex);
    if (mateWasSeen && game.knownMateHintCharges > 0) {
      if (Number.isFinite(game.knownMateHintCharges)) game.knownMateHintCharges -= 1;
      game.activeSkillHintIndex = mateIndex;
      updateMemoryAssists();
      setMessage(`ペアナビ発動！ 正解のカードが発光中${Number.isFinite(game.knownMateHintCharges) ? `（残り${game.knownMateHintCharges}回）` : ''}`, 'emerald');
      return true;
    }
    if (game.pairSearchCharges > 0) {
      game.pairSearchCharges -= 1;
      game.activeSkillHintIndex = mateIndex;
      updateMemoryAssists();
      setMessage(`強制サーチ発動！ 正解のカードが発光中（残り${game.pairSearchCharges}回）`, 'emerald');
      return true;
    }
    return false;
  };

  const availableIndices = (excluded = []) => {
    const excludedSet = new Set(excluded);
    return game.cards.map((_, index) => index).filter(index => !game.matched.has(index) && !excludedSet.has(index));
  };

  const clearCandidateFilter = () => {
    if (!game) return;
    game.candidateAllowedIndices = null;
    game.cards.forEach((_, index) => {
      const element = cardElement(index);
      element?.classList.remove('is-skill-blocked');
      if (element && !game.matched.has(index)) element.disabled = false;
    });
  };

  /** 正解を必ず残しつつ、2枚目として選べるカードをRank別の枚数まで減らす。 */
  const applyCandidateFilter = (selectedIndex, excludedIndices = []) => {
    clearCandidateFilter();
    const limit = game?.skillEffects.candidateChoiceCount || 0;
    if (!limit) return 0;
    const choices = availableIndices([selectedIndex, ...excludedIndices]);
    excludedIndices.forEach(index => {
      if (game.matched.has(index)) return;
      const element = cardElement(index);
      element?.classList.add('is-skill-blocked');
      if (element) element.disabled = true;
    });
    if (choices.length <= limit) return 0;

    const pairId = game.cards[selectedIndex].pairId;
    const mateIndex = choices.find(index => game.cards[index].pairId === pairId);
    if (mateIndex == null) return 0;
    const wrongChoices = shuffle(choices.filter(index => index !== mateIndex));
    game.candidateAllowedIndices = new Set([mateIndex, ...wrongChoices.slice(0, limit - 1)]);
    choices.forEach(index => {
      const blocked = !game.candidateAllowedIndices.has(index);
      const element = cardElement(index);
      element?.classList.toggle('is-skill-blocked', blocked);
      if (element) element.disabled = blocked;
    });
    return game.candidateAllowedIndices.size;
  };

  const knownPairs = () => {
    const byPair = new Map();
    game.cpuMemory.forEach((pairId, index) => {
      if (game.matched.has(index)) return;
      if (!byPair.has(pairId)) byPair.set(pairId, []);
      byPair.get(pairId).push(index);
    });
    return [...byPair.values()].filter(indices => indices.length >= 2);
  };

  const randomChoice = (items) => items[Math.floor(Math.random() * items.length)];

  const chooseCpuFirst = () => {
    const pair = randomChoice(knownPairs());
    if (pair) return pair[0];
    const available = availableIndices();
    const unknown = available.filter(index => !game.cpuMemory.has(index));
    return randomChoice(unknown.length ? unknown : available);
  };

  const chooseCpuSecond = (firstIndex) => {
    const pairId = game.cards[firstIndex].pairId;
    const rememberedMate = [...game.cpuMemory.entries()].find(([index, rememberedPair]) => (
      index !== firstIndex && !game.matched.has(index) && rememberedPair === pairId
    ));
    if (rememberedMate) return rememberedMate[0];
    const available = availableIndices([firstIndex]);
    const unknown = available.filter(index => !game.cpuMemory.has(index));
    return randomChoice(unknown.length ? unknown : available);
  };

  const markMatch = (indices) => {
    indices.forEach(index => {
      game.matched.add(index);
      game.cpuMemory.delete(index);
      const element = cardElement(index);
      element?.classList.add('is-matched');
      if (element) {
        element.disabled = true;
        // 獲得済み札はスキルの有無にかかわらず退色し、未獲得の盤面を見やすくする。
        element.style.opacity = '0.18';
      }
    });
    game.seenCardOrder = game.seenCardOrder.filter(index => !game.matched.has(index));
    game.activeSkillHintIndex = null;
    updateMemoryAssists();
  };

  const claimDailyReward = async () => {
    const result = await GameDB.claimDailyMemoryGameReward(
      getLocalDateKey(),
      game.config.id,
      game.config.reward,
    );
    dailyWins.add(game.config.id);
    updateHeaderPrism(result.prism);
    return result;
  };

  const showResult = (outcome, rewardStatus = 'awarded') => {
    if (!game || disposed) return;
    const isWin = outcome === 'win';
    const isDraw = outcome === 'draw';
    const isDrawOrLose = outcome === 'draw_or_lose';
    const progression = game.progressionResult;
    const leveledUp = progression && progression.level > progression.previousLevel;
    const overlay = document.createElement('div');
    overlay.dataset.result = 'true';
    overlay.className = 'fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-slate-950/85 p-4 backdrop-blur-md';
    overlay.innerHTML = `
      <section class="memory-result w-full max-w-sm rounded-3xl border ${isWin ? 'border-fuchsia-300/50 bg-gradient-to-b from-fuchsia-950 to-slate-950' : 'border-slate-600 bg-gradient-to-b from-slate-900 to-slate-950'} p-5 text-center shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="memory-result-title">
        <span class="material-symbols-outlined text-6xl ${isWin ? 'text-fuchsia-300 drop-shadow-[0_0_20px_rgba(232,121,249,.65)]' : isDraw ? 'text-amber-300' : 'text-slate-400'}">${isWin ? 'emoji_events' : isDraw ? 'handshake' : 'sentiment_dissatisfied'}</span>
        <div class="mt-1 text-[10px] font-black tracking-[.25em] ${isWin ? 'text-fuchsia-300' : 'text-slate-400'}">${isWin ? 'VICTORY' : isDraw ? 'DRAW' : isDrawOrLose ? 'GAME OVER' : 'DEFEAT'}</div>
        <h2 id="memory-result-title" class="mt-1 text-xl font-black">${isWin ? 'CPUに勝利！' : isDraw ? '引き分け' : isDrawOrLose ? '引き分けまたは敗北が確定' : 'CPUの勝利'}</h2>
        <div class="mx-auto mt-3 grid max-w-[220px] grid-cols-3 items-center rounded-2xl border border-white/10 bg-black/25 p-2">
          <div><div class="text-[8px] text-cyan-300">YOU</div><div class="text-xl font-black">${game.scores.player}</div></div><div class="text-xs text-slate-600">―</div><div><div class="text-[8px] text-rose-300">CPU</div><div class="text-xl font-black">${game.scores.cpu}</div></div>
        </div>
        <div class="mt-3 rounded-xl border ${leveledUp ? 'border-cyan-300/40 bg-cyan-500/10' : 'border-violet-300/20 bg-violet-500/10'} px-3 py-2">
          ${progression ? `<div class="flex items-center justify-center gap-1 text-sm font-black text-violet-100"><span class="material-symbols-outlined text-lg">neurology</span>神経衰弱EXP +${progression.xpGained}</div>${leveledUp ? `<div class="mt-1 text-xs font-black text-cyan-200">LEVEL UP! LV.${progression.previousLevel} → LV.${progression.level}</div><div class="mt-0.5 text-[8px] text-cyan-100/70">新しいSPを獲得しました</div>` : `<div class="mt-0.5 text-[8px] text-slate-400">神経衰弱 LV.${progression.level}</div>`}` : '<div class="text-[9px] font-black text-rose-300">EXPを保存できませんでした</div>'}
        </div>
        ${isWin ? `<div class="mt-3 flex items-center justify-center gap-1 rounded-xl border border-fuchsia-300/30 bg-fuchsia-500/10 py-2 text-sm font-black text-fuchsia-100"><span class="material-symbols-outlined text-fuchsia-300">diamond</span>${rewardStatus === 'awarded' ? `${game.config.reward} Prism 獲得！` : rewardStatus === 'already' ? '本日の報酬は受取済み' : '報酬を保存できませんでした'}</div><p class="mt-2 text-[10px] text-slate-400">この難易度は翌日また遊べます。</p>` : '<p class="mt-3 text-[10px] leading-relaxed text-slate-400">勝利するまで何度でも挑戦できます。</p>'}
        <div class="mt-4 grid gap-2">
          ${isWin && rewardStatus === 'failed' ? '<button data-claim-reward class="rounded-xl border border-fuchsia-300/50 bg-fuchsia-600 py-2.5 text-xs font-black">報酬の保存を再試行</button>' : ''}
          ${isWin ? '' : '<button data-retry class="rounded-xl border border-indigo-300/40 bg-indigo-600 py-2.5 text-xs font-black text-white active:scale-[.98]">勝つまで再挑戦</button>'}
          <button data-select class="rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-black text-slate-300 active:scale-[.98]">難易度を選び直す</button>
        </div>
      </section>
    `;
    container.appendChild(overlay);
  };

  const finishGame = async (decidedOutcome = null) => {
    if (!game || game.over) return;
    game.over = true;
    game.locked = true;
    const outcome = decidedOutcome || (game.scores.player > game.scores.cpu ? 'win' : game.scores.player < game.scores.cpu ? 'lose' : 'draw');
    if (!game.progressionRecorded) {
      game.progressionRecorded = true;
      try {
        game.progressionResult = await recordMemoryGameResult({
          difficultyId: game.config.id,
          outcome,
          playerPairs: game.scores.player,
        });
        memoryProgress = game.progressionResult.progress;
      } catch (error) {
        console.error('[MemoryGame] Failed to save progression.', error);
        game.progressionFailed = true;
      }
    }
    let rewardStatus = 'awarded';
    if (outcome === 'win') {
      try {
        const result = await claimDailyReward();
        game.rewardClaimed = true;
        rewardStatus = result.awarded ? 'awarded' : 'already';
        playSoundEffect('victory');
      } catch (error) {
        console.error('[MemoryGame] Failed to award Prism.', error);
        rewardStatus = 'failed';
      }
    } else {
      playSoundEffect('defeat');
    }
    showResult(outcome, rewardStatus);
  };

  const resolvePair = (owner, indices) => {
    if (!game || game.over) return;
    clearCandidateFilter();
    const matched = game.cards[indices[0]].pairId === game.cards[indices[1]].pairId;
    if (matched) {
      markMatch(indices);
      game.scores[owner] += 1;
      game.selected = [];
      updateSkillTargets();
      updateScores();
      setMessage(owner === 'player' ? 'ペア獲得！ 続けてあなたの番です' : 'CPUがペアを獲得。CPUの番が続きます', owner === 'player' ? 'emerald' : 'rose');

      const decidedOutcome = getDecidedNonWinOutcome(game);
      if (decidedOutcome) {
        game.locked = true;
        const isDraw = decidedOutcome === 'draw';
        setMessage(isDraw ? '引き分けが確定しました' : decidedOutcome === 'lose' ? '敗北が確定しました' : '引き分けまたは敗北が確定しました', isDraw ? 'amber' : 'rose');
        later(() => finishGame(decidedOutcome), 650);
        return;
      }

      if (game.matched.size === game.cards.length) {
        later(finishGame, 650);
        return;
      }
      if (owner === 'player') {
        game.locked = false;
      } else {
        later(runCpuTurn, 850);
      }
      return;
    }

    hideCards(indices);
    const clairvoyantCount = owner === 'player' ? tryClairvoyance(indices) : 0;
    game.selected = [];
    game.activeSkillHintIndex = null;
    updateSkillTargets();
    updateMemoryAssists();
    if (owner === 'player') {
      if (game.refocusCharges > 0) {
        game.refocusCharges -= 1;
        game.turn = 'player';
        game.locked = false;
        updateScores();
        setMessage(`再集中が発動！ 手番を維持します（残り${game.refocusCharges}回）`, 'emerald');
        return;
      }
      game.turn = 'cpu';
      game.locked = true;
      updateScores();
      setMessage(clairvoyantCount
        ? `千里眼の水晶が${clairvoyantCount}枚を透視！ CPUが考えています…`
        : 'CPUが考えています…', clairvoyantCount ? 'emerald' : 'rose');
      later(runCpuTurn, 750);
    } else {
      game.turn = 'player';
      game.locked = false;
      updateScores();
      setMessage('あなたの番です。2枚めくってください');
    }
  };

  function runCpuTurn() {
    if (!game || game.over || game.turn !== 'cpu') return;
    game.locked = true;
    const first = chooseCpuFirst();
    if (first == null) return;
    game.selected = [first];
    revealCard(first);
    setMessage('CPUが1枚目をめくりました', 'rose');
    later(() => {
      if (!game || game.over) return;
      const second = chooseCpuSecond(first);
      if (second == null) return;
      game.selected.push(second);
      revealCard(second);
      setMessage('CPUが2枚目をめくりました', 'rose');
      later(() => resolvePair('cpu', [first, second]), 900);
    }, 650);
  }

  const handlePlayerCard = (index) => {
    if (!game || game.over || game.locked || game.turn !== 'player') return;
    if (game.matched.has(index)) return;
    if (game.selected.includes(index)) {
      if (game.selected.length === 1 && game.firstCardResetCharges > 0) {
        game.firstCardResetCharges -= 1;
        game.activeSkillHintIndex = null;
        clearCandidateFilter();
        hideCards([index]);
        game.selected = [];
        updateSkillTargets();
        setMessage(`仕切り直し：1枚目を選び直せます（残り${game.firstCardResetCharges}回）`, 'amber');
      }
      return;
    }
    revealCard(index);
    game.selected.push(index);
    updateSkillTargets();
    if (game.selected.length === 1) {
      const narrowedCount = applyCandidateFilter(index);
      const skillHinted = trySkillMateHint(index);
      if (!skillHinted) {
        setMessage(narrowedCount
          ? `候補絞り：正解を含む${narrowedCount}枚から選んでください`
          : game.firstCardResetCharges > 0
            ? `もう1枚選択／同じカードを押すと仕切り直し（残り${game.firstCardResetCharges}回）`
            : 'もう1枚選んでください');
        tryTreasureHint(index);
      }
      return;
    }
    game.locked = true;
    game.activeSkillHintIndex = null;
    clearCandidateFilter();
    updateMemoryAssists();
    const pair = [...game.selected];
    const isMatch = game.cards[pair[0]].pairId === game.cards[pair[1]].pairId;

    // 正解ペアは2枚目をタップした時点で成立させ、次のカードを即座に
    // 選べるようにする。不一致だけは絵柄を確認できる時間を残す。
    if (isMatch) {
      resolvePair('player', pair);
    } else if (game.doubleCheckCharges > 0) {
      game.doubleCheckCharges -= 1;
      game.locked = true;
      setMessage('見直しが発動！ 2枚目を選び直せます', 'emerald');
      later(() => {
        if (!game || game.over) return;
        hideCards([pair[1]]);
        game.selected = [pair[0]];
        game.locked = false;
        updateSkillTargets();
        applyCandidateFilter(pair[0], [pair[1]]);
        trySkillMateHint(pair[0]);
      }, 550);
    } else {
      later(() => resolvePair('player', pair), 850);
    }
  };

  container.addEventListener('click', async (event) => {
    const homeButton = event.target.closest('[data-home]');
    if (homeButton) {
      window.location.hash = '/status';
      return;
    }

    const skillTreeButton = event.target.closest('[data-skill-tree]');
    if (skillTreeButton) {
      await renderSkillTree();
      return;
    }

    const skillBackButton = event.target.closest('[data-skill-back]');
    if (skillBackButton) {
      await renderSelect();
      return;
    }

    const branchTab = event.target.closest('[data-memory-branch-tab]');
    if (branchTab) {
      const branchId = branchTab.dataset.memoryBranchTab;
      if (!MEMORY_SKILL_BRANCHES.some(branch => branch.id === branchId)) return;
      activeSkillBranchId = branchId;
      container.querySelectorAll('[data-memory-branch-tab]').forEach(tab => {
        const isActive = tab.dataset.memoryBranchTab === branchId;
        tab.classList.toggle('is-active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
      });
      container.querySelectorAll('.memory-skill-branch').forEach(branch => {
        branch.classList.toggle('is-active', branch.id === `memory-branch-${branchId}`);
      });
      return;
    }

    const unlockButton = event.target.closest('[data-unlock-skill]');
    if (unlockButton && !unlockButton.disabled) {
      unlockButton.disabled = true;
      const skillId = unlockButton.dataset.unlockSkill;
      try {
        const skill = MEMORY_SKILL_BRANCHES.flatMap(branch => branch.skills).find(item => item.id === skillId);
        memoryProgress = await unlockMemorySkill(skillId);
        playSoundEffect('confirm');
        await renderSkillTree(`${skill?.name || 'スキル'}を習得しました！`);
      } catch (error) {
        console.error('[MemoryGame] Failed to unlock skill.', error);
        await renderSkillTree(error?.message || 'スキルを習得できませんでした。');
      }
      return;
    }

    const difficultyButton = event.target.closest('[data-difficulty]');
    if (difficultyButton) {
      difficultyButton.disabled = true;
      await startGame(difficultyButton.dataset.difficulty);
      if (difficultyButton.isConnected && !game) difficultyButton.disabled = false;
      return;
    }

    const skillModeButton = event.target.closest('[data-skill-mode]');
    if (skillModeButton) {
      const nextEnabled = skillModeButton.dataset.skillMode === 'on';
      if (skillsEnabled !== nextEnabled) {
        skillsEnabled = nextEnabled;
        await renderSelect();
      }
      return;
    }

    const reloadDailyButton = event.target.closest('[data-reload-daily]');
    if (reloadDailyButton) {
      renderSelect();
      return;
    }

    const cardButton = event.target.closest('[data-card-index]');
    if (cardButton) {
      handlePlayerCard(Number(cardButton.dataset.cardIndex));
      return;
    }

    const selectButton = event.target.closest('[data-select]');
    if (selectButton) {
      container.querySelector('[data-result]')?.remove();
      renderSelect();
      return;
    }

    const retryButton = event.target.closest('[data-retry]');
    if (retryButton && game) {
      const difficultyId = game.config.id;
      const useSkills = game.skillsEnabled;
      retryButton.disabled = true;
      container.querySelector('[data-result]')?.remove();
      await startGame(difficultyId, useSkills);
      return;
    }

    const claimButton = event.target.closest('[data-claim-reward]');
    if (claimButton && game && !game.rewardClaimed) {
      claimButton.disabled = true;
      claimButton.textContent = '保存中…';
      try {
        const result = await claimDailyReward();
        game.rewardClaimed = true;
        container.querySelector('[data-result]')?.remove();
        showResult('win', result.awarded ? 'awarded' : 'already');
      } catch (error) {
        console.error('[MemoryGame] Failed to retry Prism award.', error);
        claimButton.disabled = false;
        claimButton.textContent = '報酬の保存を再試行';
      }
    }
  });

  container.cleanup = () => {
    disposed = true;
    clearTimers();
    container.querySelector('[data-result]')?.remove();
  };

  renderSelect();
  return container;
}
