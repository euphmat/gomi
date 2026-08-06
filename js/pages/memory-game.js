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

const PLAYABLE_FISH = FISH.filter(fish => fish.id !== 'zeus_cetus');
const CARD_PALETTE_CACHE = new Map();

const DIFFICULTIES = {
  easy: {
    id: 'easy', label: 'EASY', pairs: 6, columns: 4, reward: 1,
    category: 'モンスター', icon: 'pets', accent: 'emerald', memoryRate: 0.28,
    pool: MONSTERS,
  },
  normal: {
    id: 'normal', label: 'NORMAL', pairs: 8, columns: 4, reward: 3,
    category: '魚', icon: 'set_meal', accent: 'sky', memoryRate: 0.62,
    // 画像アセットがまだ用意されていない定義は、絵柄抽選から除外する。
    pool: PLAYABLE_FISH,
  },
  hard: {
    id: 'hard', label: 'HARD', pairs: 10, columns: 5, reward: 5,
    category: 'アイテム素材', icon: 'category', accent: 'rose', memoryRate: 0.95,
    pool: MATERIALS,
  },
  very_hard: {
    id: 'very_hard', label: 'VERY HARD', pairs: 12, columns: 6, reward: 10,
    category: 'モンスター・魚・素材', icon: 'skull', accent: 'violet', memoryRate: 1,
    mixedPools: [
      { prefix: 'monster', pool: MONSTERS, count: 4 },
      { prefix: 'fish', pool: PLAYABLE_FISH, count: 4 },
      { prefix: 'material', pool: MATERIALS, count: 4 },
    ],
  },
};

const ACCENT_CLASSES = {
  emerald: 'border-emerald-400/40 from-emerald-500/20 to-emerald-950/35 text-emerald-200',
  sky: 'border-sky-400/40 from-sky-500/20 to-sky-950/35 text-sky-200',
  rose: 'border-rose-400/40 from-rose-500/20 to-rose-950/35 text-rose-200',
  violet: 'border-violet-300/55 from-violet-500/30 via-fuchsia-950/35 to-slate-950 text-violet-100 shadow-[0_0_22px_rgba(139,92,246,.16)]',
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

/** プレイヤーの敗北または引き分けが、残りペアに関係なく確定しているか判定する。 */
function getDecidedNonWinOutcome(game) {
  const foundPairs = game.scores.player + game.scores.cpu;
  const remainingPairs = Math.max(0, game.config.pairs - foundPairs);

  if (game.scores.cpu > game.scores.player + remainingPairs) return 'lose';
  if (remainingPairs === 0 && game.scores.player === game.scores.cpu) return 'draw';
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
    .memory-card { perspective: 700px; -webkit-tap-highlight-color: transparent; }
    .memory-card-inner { position:relative; width:100%; height:100%; transform-style:preserve-3d; transition:transform .38s cubic-bezier(.2,.75,.25,1); }
    .memory-card.is-flipped .memory-card-inner { transform:rotateY(180deg); }
    .memory-card-face { position:absolute; inset:0; overflow:hidden; border-radius:.65rem; backface-visibility:hidden; -webkit-backface-visibility:hidden; }
    .memory-card-front { transform:rotateY(180deg); }
    .memory-card.is-matched { animation:memory-match .55s ease-out both; }
    .memory-card.is-hint { z-index:2; animation:memory-hint .7s ease-in-out 2; }
    .memory-card.is-hint .memory-card-face:first-child { border-color:rgba(103,232,249,.98); box-shadow:0 0 18px 5px rgba(34,211,238,.72), inset 0 0 16px rgba(255,255,255,.28); }
    .memory-card.is-clairvoyant:not(.is-flipped):not(.is-matched) { z-index:1; }
    .memory-card.is-clairvoyant:not(.is-flipped):not(.is-matched) .memory-card-face:first-child { border-color:rgba(103,232,249,.95); box-shadow:0 0 16px 3px rgba(34,211,238,.5), inset 0 0 18px rgba(129,230,217,.3); animation:memory-clairvoyance-aura 1.8s ease-in-out infinite; }
    .memory-card.is-clairvoyant:not(.is-flipped):not(.is-matched) [data-clairvoyant-vision] { display:flex; animation:memory-clairvoyance-vision .7s ease-out both; }
    .memory-card:disabled { opacity:1; }
    @keyframes memory-match { 50% { transform:scale(1.08); filter:brightness(1.35); } 100% { transform:scale(1); filter:brightness(1); } }
    @keyframes memory-hint { 0%,100% { transform:scale(1); filter:brightness(1); } 50% { transform:scale(1.09); filter:brightness(1.55); } }
    @keyframes memory-clairvoyance-aura { 0%,100% { filter:brightness(1); } 50% { filter:brightness(1.28); } }
    @keyframes memory-clairvoyance-vision { from { opacity:0; transform:scale(.72); filter:blur(7px); } to { opacity:1; transform:scale(1); filter:blur(0); } }
    @keyframes memory-result-in { from { opacity:0; transform:translateY(10px) scale(.96); } to { opacity:1; transform:translateY(0) scale(1); } }
    .memory-result { animation:memory-result-in .28s ease-out both; }
    @media (prefers-reduced-motion: reduce) { .memory-card-inner { transition:none; } .memory-card.is-matched, .memory-card.is-clairvoyant:not(.is-flipped):not(.is-matched) .memory-card-face:first-child, .memory-card.is-clairvoyant:not(.is-flipped):not(.is-matched) [data-clairvoyant-vision], .memory-result { animation:none; } }
  </style>
`;

function difficultyCard(config, cleared) {
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
        <span class="mt-1 flex items-center gap-1 text-[10px] font-black ${cleared ? 'text-emerald-400' : 'text-fuchsia-200'}"><span class="material-symbols-outlined text-[14px]">${cleared ? 'event_busy' : 'diamond'}</span>${cleared ? '本日はクリア済み' : `勝利報酬 ${config.reward} Prism`}</span>
      </span>
      <span class="material-symbols-outlined text-white/45">${cleared ? 'lock_clock' : 'chevron_right'}</span>
    </button>
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
      const states = await Promise.all(Object.values(DIFFICULTIES).map(async config => ({
        id: config.id,
        cleared: (await GameDB.getGameState(dailyWinKey(config.id))) === dateKey,
      })));
      dailyWins = new Set(states.filter(state => state.cleared).map(state => state.id));
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

        <div class="grid gap-2" aria-label="難易度を選択">
          ${Object.values(DIFFICULTIES).map(config => difficultyCard(config, dailyWins.has(config.id))).join('')}
        </div>
      </div>
    `;
  };

  const updateHeaderPrism = (value) => {
    const display = document.getElementById('header-prism-display');
    if (display) display.textContent = formatNumber(value);
    const holder = document.getElementById('header-prism');
    if (holder) holder.setAttribute('aria-label', `プリズム ${formatNumber(value)}`);
  };

  const startGame = async (difficultyId) => {
    const config = DIFFICULTIES[difficultyId];
    if (!config || dailyWins.has(difficultyId) || startingGame) return;

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

    const selectedItems = selectCardItems(config);
    const clairvoyancePercent = getTreasureEffect('memoryClairvoyancePercent');
    const cpuForgetPercent = getTreasureEffect('memoryCpuForgetPercent');
    const hintPercent = getTreasureEffect('memoryHintPercent');
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
      turn: 'player',
      locked: false,
      over: false,
      rewardClaimed: false,
      clairvoyancePercent,
      cpuMemoryRate: Math.max(0, config.memoryRate * (1 - cpuForgetPercent / 100)),
      hintPercent,
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
          <div data-player-panel class="rounded-xl border border-cyan-300/40 bg-cyan-500/10 px-2 py-1.5 text-center transition-all">
            <div class="text-[8px] font-black tracking-widest text-cyan-300">YOU</div><div data-player-score class="text-xl font-black tabular-nums">0</div>
          </div>
          <div class="text-center"><div class="text-[8px] text-slate-500">PAIRS</div><div class="text-[10px] font-black text-slate-300"><span data-found-count>0</span> / ${config.pairs}</div></div>
          <div data-cpu-panel class="rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 text-center transition-all">
            <div class="text-[8px] font-black tracking-widest text-rose-300">CPU</div><div data-cpu-score class="text-xl font-black tabular-nums">0</div>
          </div>
        </section>

        <div data-message class="mb-2 flex min-h-8 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-950/25 px-3 text-center text-[10px] font-black text-cyan-100" role="status" aria-live="polite">あなたの番です。2枚めくってください</div>

        ${clairvoyancePercent || cpuForgetPercent || hintPercent ? `<section class="mb-2 flex flex-wrap justify-center gap-1 rounded-xl border border-violet-300/15 bg-violet-950/20 p-1.5" aria-label="発動中の神経衰弱用秘宝">
          ${clairvoyancePercent ? `<span class="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2 py-1 text-[8px] font-black text-cyan-200">千里眼 透視${clairvoyancePercent}%</span>` : ''}
          ${cpuForgetPercent ? `<span class="rounded-full border border-violet-400/25 bg-violet-500/10 px-2 py-1 text-[8px] font-black text-violet-200">CPU記憶力 −${cpuForgetPercent}%</span>` : ''}
          ${hintPercent ? `<span class="rounded-full border border-rose-400/25 bg-rose-500/10 px-2 py-1 text-[8px] font-black text-rose-200">ペアヒント ${hintPercent}%</span>` : ''}
        </section>` : ''}

        <section data-board class="mx-auto grid w-full gap-1.5" style="grid-template-columns:repeat(${config.columns},minmax(0,1fr));max-width:${config.columns >= 6 ? '520px' : config.columns === 5 ? '470px' : '400px'}" aria-label="神経衰弱のカード">
          ${cards.map(card => `
            <button data-card-index="${card.index}" class="memory-card aspect-[3/4] min-w-0 rounded-[.65rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300" aria-label="伏せられたカード ${card.index + 1}">
              <span class="memory-card-inner block">
                <span class="memory-card-face flex items-center justify-center border-2 border-slate-300/70 bg-[repeating-linear-gradient(135deg,#312e81_0,#312e81_5px,#1e1b4b_5px,#1e1b4b_10px)] shadow-md">
                  <span class="absolute inset-1 rounded-md border border-white/25"></span><span class="material-symbols-outlined text-[clamp(18px,6vw,30px)] text-white/85 drop-shadow">playing_cards</span>
                  <span data-clairvoyant-vision class="absolute inset-1 hidden flex-col items-center justify-center overflow-hidden rounded-md border border-cyan-100/70 bg-cyan-950/90 p-0.5 shadow-[inset_0_0_14px_rgba(103,232,249,.6)]" aria-hidden="true">
                    <img src="${card.image}" alt="" class="min-h-0 w-full flex-1 object-contain opacity-80 drop-shadow-[0_0_5px_rgba(165,243,252,.9)]">
                    <span class="block w-full truncate rounded-sm bg-cyan-950/85 px-0.5 py-px text-center text-[clamp(5px,1.5vw,8px)] font-black leading-none text-cyan-50">${card.name}</span>
                  </span>
                </span>
                <span data-card-front class="memory-card-face memory-card-front flex flex-col items-center justify-center border-2 border-slate-400/70 p-1 shadow-md" style="background:linear-gradient(to bottom,#64748b,#1e293b)">
                  <img data-card-image src="${card.image}" alt="" class="min-h-0 w-full flex-1 object-contain drop-shadow-md" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'">
                  <span class="material-symbols-outlined flex-1 place-items-center text-3xl text-slate-500" style="display:none">image</span>
                  <span class="mt-0.5 block w-full rounded-sm bg-slate-950/65 px-0.5 py-px whitespace-normal break-all text-center text-[clamp(5px,1.6vw,8px)] font-black leading-[1.08] text-white shadow-sm">${card.name}</span>
                </span>
              </span>
            </button>
          `).join('')}
        </section>
      </div>
    `;
    applyExtractedCardColors(container);
  };

  const cardElement = (index) => container.querySelector(`[data-card-index="${index}"]`);

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
    playerPanel?.classList.toggle('shadow-[0_0_16px_rgba(34,211,238,.22)]', game.turn === 'player');
    cpuPanel?.classList.toggle('border-rose-300/40', game.turn === 'cpu');
    cpuPanel?.classList.toggle('bg-rose-500/10', game.turn === 'cpu');
  };

  const rememberCard = (index) => {
    if (!game || game.matched.has(index)) return;
    if (Math.random() <= game.cpuMemoryRate) {
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

  const revealCard = (index) => {
    if (!game) return;
    const element = cardElement(index);
    element?.classList.add('is-flipped');
    element?.setAttribute('aria-label', game.cards[index].name);
    rememberCard(index);
  };

  const hideCards = (indices) => {
    indices.forEach(index => {
      const element = cardElement(index);
      element?.classList.remove('is-flipped');
      element?.setAttribute('aria-label', element?.classList.contains('is-clairvoyant')
        ? `透視中: ${game.cards[index].name}`
        : `伏せられたカード ${index + 1}`);
    });
  };

  const tryClairvoyance = (indices) => {
    if (!game?.clairvoyancePercent) return 0;
    let revealedCount = 0;
    indices.forEach(index => {
      const element = cardElement(index);
      if (!element || element.classList.contains('is-clairvoyant')) return;
      if (Math.random() * 100 >= game.clairvoyancePercent) return;
      element.classList.add('is-clairvoyant');
      element.setAttribute('aria-label', `透視中: ${game.cards[index].name}`);
      revealedCount += 1;
    });
    return revealedCount;
  };

  const availableIndices = (excluded = []) => {
    const excludedSet = new Set(excluded);
    return game.cards.map((_, index) => index).filter(index => !game.matched.has(index) && !excludedSet.has(index));
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
      if (element) element.disabled = true;
    });
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
    const overlay = document.createElement('div');
    overlay.dataset.result = 'true';
    overlay.className = 'fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md';
    overlay.innerHTML = `
      <section class="memory-result w-full max-w-sm rounded-3xl border ${isWin ? 'border-fuchsia-300/50 bg-gradient-to-b from-fuchsia-950 to-slate-950' : 'border-slate-600 bg-gradient-to-b from-slate-900 to-slate-950'} p-5 text-center shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="memory-result-title">
        <span class="material-symbols-outlined text-6xl ${isWin ? 'text-fuchsia-300 drop-shadow-[0_0_20px_rgba(232,121,249,.65)]' : isDraw ? 'text-amber-300' : 'text-slate-400'}">${isWin ? 'emoji_events' : isDraw ? 'handshake' : 'sentiment_dissatisfied'}</span>
        <div class="mt-1 text-[10px] font-black tracking-[.25em] ${isWin ? 'text-fuchsia-300' : 'text-slate-400'}">${isWin ? 'VICTORY' : isDraw ? 'DRAW' : 'DEFEAT'}</div>
        <h2 id="memory-result-title" class="mt-1 text-xl font-black">${isWin ? 'CPUに勝利！' : isDraw ? '引き分け' : 'CPUの勝利'}</h2>
        <div class="mx-auto mt-3 grid max-w-[220px] grid-cols-3 items-center rounded-2xl border border-white/10 bg-black/25 p-2">
          <div><div class="text-[8px] text-cyan-300">YOU</div><div class="text-xl font-black">${game.scores.player}</div></div><div class="text-xs text-slate-600">―</div><div><div class="text-[8px] text-rose-300">CPU</div><div class="text-xl font-black">${game.scores.cpu}</div></div>
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

  const finishGame = async () => {
    if (!game || game.over) return;
    game.over = true;
    game.locked = true;
    const outcome = game.scores.player > game.scores.cpu ? 'win' : game.scores.player < game.scores.cpu ? 'lose' : 'draw';
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
    const matched = game.cards[indices[0]].pairId === game.cards[indices[1]].pairId;
    if (matched) {
      markMatch(indices);
      game.scores[owner] += 1;
      game.selected = [];
      updateScores();
      setMessage(owner === 'player' ? 'ペア獲得！ 続けてあなたの番です' : 'CPUがペアを獲得。CPUの番が続きます', owner === 'player' ? 'emerald' : 'rose');

      const decidedOutcome = getDecidedNonWinOutcome(game);
      if (decidedOutcome) {
        game.locked = true;
        setMessage(decidedOutcome === 'draw' ? '引き分けが確定しました' : '敗北が確定しました', decidedOutcome === 'draw' ? 'amber' : 'rose');
        later(finishGame, 650);
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
    if (owner === 'player') {
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
    if (game.matched.has(index) || game.selected.includes(index)) return;
    revealCard(index);
    game.selected.push(index);
    if (game.selected.length === 1) {
      setMessage('もう1枚選んでください');
      tryTreasureHint(index);
      return;
    }
    game.locked = true;
    const pair = [...game.selected];
    const isMatch = game.cards[pair[0]].pairId === game.cards[pair[1]].pairId;

    // 正解ペアは2枚目をタップした時点で成立させ、次のカードを即座に
    // 選べるようにする。不一致だけは絵柄を確認できる時間を残す。
    if (isMatch) {
      resolvePair('player', pair);
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

    const difficultyButton = event.target.closest('[data-difficulty]');
    if (difficultyButton) {
      difficultyButton.disabled = true;
      await startGame(difficultyButton.dataset.difficulty);
      if (difficultyButton.isConnected && !game) difficultyButton.disabled = false;
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
      retryButton.disabled = true;
      container.querySelector('[data-result]')?.remove();
      await startGame(difficultyId);
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
