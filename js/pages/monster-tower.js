/** ホームタウンから遊べる、全モンスター対応のCPU対戦タワーゲーム。 */
import { GameDB } from '../data/database.js';
import { MONSTERS } from '../definitions/monsters.js';
import {
  TOWER_WORLD,
  addTowerBody,
  chooseCpuPlacement,
  createFallbackCollisionProfile,
  createMonsterCollisionProfile,
  createTowerBody,
  createTowerWorld,
  getDropRange,
  getFallenBodies,
  getMonsterPhysicsTraits,
  getTowerPlacementGuide,
  getTowerMotion,
  normalizeAngle,
  stepTowerWorld,
} from '../data/monster-tower-engine.js';
import {
  TOWN_GAME_REWARDS,
  getLocalDateKey,
  getTownGameRewardStateKey,
} from '../data/town-game-rewards.js';
import { getTreasureEffect, loadTreasureLevels } from '../data/treasure-manager.js';
import { formatNumber } from '../utils/format.js';

const GAME_ID = 'monster-tower';

const DIFFICULTIES = Object.freeze({
  easy: {
    id: 'easy', label: 'EASY', reward: TOWN_GAME_REWARDS.easy,
    candidates: 4, noise: 190, maxRotation: Math.PI / 6,
    stoppers: true,
    description: 'CPUは置き場所にかなり迷う', icon: 'sentiment_satisfied', tone: 'emerald',
  },
  normal: {
    id: 'normal', label: 'NORMAL', reward: TOWN_GAME_REWARDS.normal,
    candidates: 8, noise: 90, maxRotation: Math.PI / 3,
    stoppers: true,
    description: 'CPUは安定する場所を探す', icon: 'smart_toy', tone: 'sky',
  },
  hard: {
    id: 'hard', label: 'HARD', reward: TOWN_GAME_REWARDS.hard,
    candidates: 15, noise: 32, maxRotation: Math.PI / 2,
    stoppers: true,
    description: 'CPUが多数の配置を比較する', icon: 'psychology', tone: 'amber',
  },
  very_hard: {
    id: 'very_hard', label: 'VERY HARD', reward: TOWN_GAME_REWARDS.very_hard,
    candidates: 24, noise: 0, maxRotation: Math.PI,
    exhaustiveSearch: true, positionCount: 15, angleCount: 12,
    simulationFrames: 420, refineCount: 10, refineFrames: 600,
    stoppers: false,
    description: 'CPUが長考し、位置と角度を精密に予測する', icon: 'skull', tone: 'violet',
  },
});

const TONE_CLASSES = {
  emerald: 'border-emerald-400/35 from-emerald-500/20 to-emerald-950/35 text-emerald-200',
  sky: 'border-sky-400/35 from-sky-500/20 to-sky-950/35 text-sky-200',
  amber: 'border-amber-400/35 from-amber-500/20 to-amber-950/35 text-amber-200',
  violet: 'border-violet-400/45 from-violet-500/25 to-fuchsia-950/40 text-violet-100',
};

const IMAGE_CACHE = new Map();
const PROFILE_CACHE = new Map();
const MONSTER_MAP = new Map(MONSTERS.map(monster => [monster.id, monster]));
const FIXED_STEP = 1 / 120;
const MAX_FRAME_DELTA = 1 / 15;

async function waitForMatterRuntime() {
  if (globalThis.Matter?.Engine) return true;
  const script = document.getElementById('matter-js-runtime');
  if (!script || script.dataset.ready === 'error') return false;
  if (script.dataset.ready === 'true') return Boolean(globalThis.Matter?.Engine);
  await new Promise(resolve => {
    const finish = () => resolve();
    script.addEventListener('load', finish, { once: true });
    script.addEventListener('error', finish, { once: true });
    window.setTimeout(finish, 1800);
  });
  return Boolean(globalThis.Matter?.Engine);
}

const shuffle = items => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
};

const getMonsterTargetSize = monster => {
  const hp = Math.max(1, Number(monster?.stats?.hp) || 1);
  return Math.round(Math.min(74, Math.max(54, 54 + Math.max(0, Math.log10(hp) - 2) * 3.2)));
};

function loadMonsterImage(monster) {
  if (IMAGE_CACHE.has(monster.id)) return IMAGE_CACHE.get(monster.id);
  const promise = new Promise(resolve => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => {
      console.warn(`[MonsterTower] Could not load ${monster.image}.`);
      resolve(null);
    };
    image.src = monster.image;
  });
  IMAGE_CACHE.set(monster.id, promise);
  return promise;
}

async function loadMonsterProfile(monster) {
  if (PROFILE_CACHE.has(monster.id)) return PROFILE_CACHE.get(monster.id);
  const promise = (async () => {
    const image = await loadMonsterImage(monster);
    if (!image?.naturalWidth || !image?.naturalHeight) return createFallbackCollisionProfile(1, getMonsterTargetSize(monster));
    try {
      const maxSampleSize = 80;
      const scale = maxSampleSize / Math.max(image.naturalWidth, image.naturalHeight);
      const width = Math.max(12, Math.round(image.naturalWidth * scale));
      const height = Math.max(12, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Canvas context is unavailable.');
      context.drawImage(image, 0, 0, width, height);
      const pixels = context.getImageData(0, 0, width, height).data;
      const alpha = new Uint8Array(width * height);
      for (let source = 3, target = 0; source < pixels.length; source += 4, target += 1) alpha[target] = pixels[source];
      return createMonsterCollisionProfile(alpha, width, height, getMonsterTargetSize(monster));
    } catch (error) {
      console.warn(`[MonsterTower] Could not analyze ${monster.id}.`, error);
      return createFallbackCollisionProfile(image.naturalWidth / image.naturalHeight, getMonsterTargetSize(monster));
    }
  })();
  PROFILE_CACHE.set(monster.id, promise);
  return promise;
}

function difficultyCard(config, claimed) {
  return `
    <button data-difficulty="${config.id}" class="flex min-h-[88px] items-center gap-3 rounded-2xl border bg-gradient-to-br p-3 text-left shadow-lg active:scale-[.98] ${TONE_CLASSES[config.tone]}">
      <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-black/25"><span class="material-symbols-outlined text-2xl">${claimed ? 'check_circle' : config.icon}</span></span>
      <span class="min-w-0 flex-1">
        <span class="block text-sm font-black tracking-[.16em] text-white">${config.label}</span>
        <span class="mt-0.5 block text-[10px] text-slate-300">${config.description}</span>
        <span class="mt-1 flex items-center gap-1 text-[9px] font-black ${claimed ? 'text-emerald-300' : 'text-fuchsia-200'}"><span class="material-symbols-outlined text-[13px]">${claimed ? 'task_alt' : 'diamond'}</span>${claimed ? '本日の報酬は受取済み ・ プレイ可能' : `勝利報酬 ${config.reward} Prism`}</span>
      </span>
      <span class="material-symbols-outlined text-white/45">chevron_right</span>
    </button>`;
}

const pageStyles = () => `
  <style>
    .tower-canvas { display:block; width:100%; max-width:360px; aspect-ratio:9/13; border-radius:1rem; touch-action:none; background:#07111f; box-shadow:0 18px 42px rgba(0,0,0,.48); }
    .tower-result { animation:tower-result-in .28s ease-out both; }
    @keyframes tower-result-in { from { opacity:0; transform:translateY(12px) scale(.95); } to { opacity:1; transform:none; } }
    @media (prefers-reduced-motion:reduce) { .tower-result { animation:none; } }
  </style>`;

export function renderMonsterTowerPage() {
  const container = document.createElement('div');
  container.className = 'relative min-h-full overflow-hidden bg-[#07101d] text-white';
  container.dataset.monsterTowerPage = 'true';

  let game = null;
  let disposed = false;
  let renderId = 0;
  let claimedDifficulties = new Set();
  let animationId = 0;
  let bodySequence = 0;
  const timers = new Set();

  const later = (callback, delay) => {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      if (!disposed) callback();
    }, delay);
    timers.add(timer);
    return timer;
  };

  const clearTimers = () => {
    timers.forEach(timer => window.clearTimeout(timer));
    timers.clear();
  };

  const stopAnimation = () => {
    if (animationId) window.cancelAnimationFrame(animationId);
    animationId = 0;
  };

  const updateHeaderPrism = value => {
    const display = document.getElementById('header-prism-display');
    if (display) display.textContent = formatNumber(value);
    const holder = document.getElementById('header-prism');
    if (holder) holder.setAttribute('aria-label', `プリズム ${formatNumber(value)}`);
  };

  const renderLoadError = () => {
    container.innerHTML = `
      ${pageStyles()}
      <div class="mx-auto flex min-h-[360px] max-w-sm flex-col items-center justify-center p-5 text-center">
        <span class="material-symbols-outlined text-5xl text-amber-300">sync_problem</span>
        <h1 class="mt-2 text-base font-black">プレイ状況を確認できません</h1>
        <p class="mt-2 text-[10px] leading-relaxed text-slate-400">本日の報酬状況を確認できないため、対戦を開始できませんでした。</p>
        <button data-reload class="mt-4 w-full rounded-xl border border-amber-300/40 bg-amber-500/15 py-2.5 text-xs font-black text-amber-100">もう一度読み込む</button>
        <button data-home class="mt-2 w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-black text-slate-300">ホームタウンへ戻る</button>
      </div>`;
  };

  const renderPhysicsError = () => {
    container.innerHTML = `
      ${pageStyles()}
      <div class="mx-auto flex min-h-[360px] max-w-sm flex-col items-center justify-center p-5 text-center">
        <span class="material-symbols-outlined text-5xl text-violet-300">deployed_code_alert</span>
        <h1 class="mt-2 text-base font-black">高精度物理を読み込めません</h1>
        <p class="mt-2 text-[10px] leading-relaxed text-slate-400">画像に沿った当たり判定を保証できないため、モンスタータワーを開始しませんでした。通信状態を確認して再読み込みしてください。</p>
        <button data-reload-app class="mt-4 w-full rounded-xl border border-violet-300/40 bg-violet-500/15 py-2.5 text-xs font-black text-violet-100">ゲームを再読み込み</button>
        <button data-home class="mt-2 w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-black text-slate-300">ホームタウンへ戻る</button>
      </div>`;
  };

  const renderSelect = async () => {
    stopAnimation();
    clearTimers();
    game = null;
    const currentRenderId = ++renderId;
    container.innerHTML = `${pageStyles()}<div class="flex min-h-[320px] items-center justify-center text-xs font-black text-slate-500"><span class="animate-pulse">本日の報酬状況を確認中…</span></div>`;
    try {
      const dateKey = getLocalDateKey();
      const states = await Promise.all(Object.values(DIFFICULTIES).map(async config => ({
        id: config.id,
        claimed: (await GameDB.getGameState(getTownGameRewardStateKey(GAME_ID, config.id))) === dateKey,
      })));
      claimedDifficulties = new Set(states.filter(state => state.claimed).map(state => state.id));
    } catch (error) {
      console.error('[MonsterTower] Failed to load daily rewards.', error);
      if (!disposed && currentRenderId === renderId) renderLoadError();
      return;
    }
    if (disposed || currentRenderId !== renderId) return;

    container.innerHTML = `
      ${pageStyles()}
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_7%,rgba(34,211,238,.15),transparent_34%),radial-gradient(circle_at_88%_25%,rgba(168,85,247,.17),transparent_38%)]"></div>
      <div class="relative z-10 mx-auto max-w-lg p-2.5 pb-5">
        <header class="mb-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/75 p-2.5 shadow-xl backdrop-blur-md">
          <button data-home class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300" aria-label="ホームタウンへ戻る"><span class="material-symbols-outlined">arrow_back</span></button>
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-300/30 bg-gradient-to-br from-cyan-500/20 to-violet-600/25"><span class="material-symbols-outlined text-3xl text-cyan-100">balance</span></span>
          <span class="min-w-0"><span class="block text-[9px] font-black tracking-[.24em] text-cyan-300">MONSTER TOWER BATTLE</span><h1 class="text-lg font-black leading-tight">モンスタータワー</h1><span class="text-[9px] text-slate-400">全${MONSTERS.length}体から抽選 ・ CPUと交互に積もう</span></span>
        </header>

        <section class="mb-3 rounded-2xl border border-cyan-300/20 bg-cyan-950/15 px-3 py-2.5 text-[10px] leading-relaxed text-slate-300">
          <div class="mb-1 flex items-center gap-1 font-black text-cyan-200"><span class="material-symbols-outlined text-base">lightbulb</span>遊び方</div>
          CPUと交互に、同じ塔へモンスターを1体ずつ落とします。位置と角度を決めて落下させ、自分の手番で1体でも台から落とすと敗北です。使用したモンスターは、全種類が一巡するまで重複しません。
          <div class="mt-1.5 border-t border-cyan-300/10 pt-1.5 text-fuchsia-100/85">難易度別報酬はモンスタータワー専用です。各難易度で1日1回受け取れ、受取後も何度でも対戦できます。</div>
        </section>

        <div class="grid gap-2" aria-label="モンスタータワーの難易度を選択">${Object.values(DIFFICULTIES).map(config => difficultyCard(config, claimedDifficulties.has(config.id))).join('')}</div>
      </div>`;
  };

  const setStatus = (message, tone = 'cyan') => {
    const status = container.querySelector('[data-status]');
    if (!status) return;
    const tones = {
      cyan: 'border-cyan-300/25 bg-cyan-950/35 text-cyan-100',
      amber: 'border-amber-300/25 bg-amber-950/35 text-amber-100',
      rose: 'border-rose-300/30 bg-rose-950/40 text-rose-100',
      emerald: 'border-emerald-300/30 bg-emerald-950/35 text-emerald-100',
    };
    status.className = `flex min-h-9 items-center justify-center rounded-xl border px-3 text-center text-[10px] font-black ${tones[tone] || tones.cyan}`;
    status.textContent = message;
  };

  const updateControls = () => {
    if (!game) return;
    const enabled = game.currentOwner === 'player' && !game.placing && !game.loading && !game.over;
    container.querySelectorAll('[data-move],[data-rotate],[data-drop]').forEach(button => { button.disabled = !enabled; });
    const owner = container.querySelector('[data-turn-owner]');
    if (owner) {
      owner.textContent = game.currentOwner === 'player' ? 'あなたの手番' : 'CPUの手番';
      owner.className = `text-xs font-black ${game.currentOwner === 'player' ? 'text-cyan-200' : 'text-amber-200'}`;
    }
    const turn = container.querySelector('[data-turn-count]');
    if (turn) turn.textContent = `${game.turn}手目`;
    const currentName = container.querySelector('[data-current-name]');
    if (currentName) currentName.textContent = game.currentMonster?.name || '読み込み中…';
    const currentPhysics = container.querySelector('[data-current-physics]');
    if (currentPhysics) {
      currentPhysics.textContent = game.currentMonster && game.currentProfile
        ? getMonsterPhysicsTraits(game.currentMonster.id, game.currentProfile).label
        : '形状を解析中';
    }
    const currentImage = container.querySelector('[data-current-image]');
    if (currentImage && game.currentMonster) {
      currentImage.src = game.currentMonster.image;
      currentImage.alt = game.currentMonster.name;
    }
    const next = game.deck[game.deckIndex];
    const nextName = container.querySelector('[data-next-name]');
    if (nextName) nextName.textContent = next?.name || 'デッキ更新';
    const nextImage = container.querySelector('[data-next-image]');
    if (nextImage && next) {
      nextImage.src = next.image;
      nextImage.alt = next.name;
    }
  };

  const drawMonster = (context, body, alpha = 1) => {
    const monster = MONSTER_MAP.get(body.monsterId);
    if (!monster) return;
    context.save();
    context.translate(body.x, body.y);
    context.rotate(body.angle);
    context.globalAlpha = alpha;
    context.shadowColor = body.owner === 'player' ? 'rgba(34,211,238,.6)' : 'rgba(251,191,36,.55)';
    context.shadowBlur = 9;
    const width = body.profile.width;
    const height = body.profile.height;
    // Promise解決済みの画像は対戦単位のMapに保持し、描画ループを同期処理に保つ。
    const readyImage = game?.readyImages?.get(monster.id);
    if (readyImage?.naturalWidth) {
      const crop = body.profile.crop || { x: 0, y: 0, width: 1, height: 1 };
      context.drawImage(
        readyImage,
        crop.x * readyImage.naturalWidth,
        crop.y * readyImage.naturalHeight,
        crop.width * readyImage.naturalWidth,
        crop.height * readyImage.naturalHeight,
        -width / 2,
        -height / 2,
        width,
        height,
      );
    } else {
      context.fillStyle = body.owner === 'player' ? '#22d3ee' : '#fbbf24';
      context.beginPath();
      context.arc(0, 0, Math.min(width, height) * .38, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#07101d';
      context.font = '900 18px sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(monster.name.slice(0, 1), 0, 1);
    }
    context.restore();
  };

  const refreshPlacementGuide = () => {
    if (!game?.towerGuideLevel || game.currentOwner !== 'player' || !game.currentProfile
        || game.placing || game.loading || game.over) {
      if (game) game.placementGuide = null;
      return;
    }
    game.placementGuide = getTowerPlacementGuide(
      game.world,
      game.currentProfile,
      { x: game.previewX, angle: game.previewAngle },
      { monsterId: game.currentMonster?.id, simulationFrames: 180 },
    );
  };

  const drawScene = () => {
    if (!game?.context) return;
    const context = game.context;
    const { width, height, platform } = TOWER_WORLD;
    const background = context.createLinearGradient(0, 0, 0, height);
    background.addColorStop(0, '#071a31');
    background.addColorStop(.62, '#11132b');
    background.addColorStop(1, '#190d22');
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);

    context.fillStyle = 'rgba(255,255,255,.38)';
    for (let index = 0; index < 20; index += 1) {
      const x = (index * 83 + 31) % width;
      const y = (index * 47 + 19) % 330;
      context.fillRect(x, y, index % 3 === 0 ? 1.5 : 1, index % 3 === 0 ? 1.5 : 1);
    }

    context.setLineDash([6, 7]);
    context.strokeStyle = 'rgba(251,113,133,.38)';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(0, TOWER_WORLD.lossY);
    context.lineTo(width, TOWER_WORLD.lossY);
    context.stroke();
    context.setLineDash([]);

    const platformGradient = context.createLinearGradient(platform.x, platform.y, platform.x, platform.y + platform.height);
    platformGradient.addColorStop(0, '#e2e8f0');
    platformGradient.addColorStop(.18, '#64748b');
    platformGradient.addColorStop(1, '#1e293b');
    context.fillStyle = platformGradient;
    context.strokeStyle = '#cbd5e1';
    context.lineWidth = 2;
    context.beginPath();
    if (typeof context.roundRect === 'function') context.roundRect(platform.x, platform.y, platform.width, platform.height, 7);
    else context.rect(platform.x, platform.y, platform.width, platform.height);
    context.fill();
    context.stroke();
    if (game.world.hasStoppers) {
      const stopper = TOWER_WORLD.stopper;
      const stopperGradient = context.createLinearGradient(0, platform.y - stopper.height, 0, platform.y);
      stopperGradient.addColorStop(0, '#f8fafc');
      stopperGradient.addColorStop(.3, '#94a3b8');
      stopperGradient.addColorStop(1, '#334155');
      context.fillStyle = stopperGradient;
      context.strokeStyle = '#cbd5e1';
      context.lineWidth = 1.5;
      [platform.x, platform.x + platform.width - stopper.width].forEach(x => {
        context.beginPath();
        if (typeof context.roundRect === 'function') {
          context.roundRect(x, platform.y - stopper.height, stopper.width, stopper.height + 2, [3, 3, 0, 0]);
        } else {
          context.rect(x, platform.y - stopper.height, stopper.width, stopper.height + 2);
        }
        context.fill();
        context.stroke();
      });
    }
    context.fillStyle = '#0f172a';
    context.fillRect(width / 2 - 18, platform.y + platform.height, 36, height - platform.y - platform.height);

    game.world.bodies.forEach(body => drawMonster(context, body));

    if (!game.placing && !game.loading && !game.over && game.currentProfile && game.currentMonster) {
      context.save();
      context.setLineDash([4, 6]);
      context.strokeStyle = game.currentOwner === 'player' ? 'rgba(103,232,249,.35)' : 'rgba(253,230,138,.32)';
      context.beginPath();
      context.moveTo(game.previewX, 70);
      context.lineTo(game.previewX, platform.y - 5);
      context.stroke();
      context.restore();
      const guide = game.currentOwner === 'player' ? game.placementGuide : null;
      if (guide && game.towerGuideLevel > 0) {
        const guideTone = game.towerGuideLevel >= 3
          ? guide.risk === 'danger' ? '#fb7185' : guide.risk === 'warning' ? '#fbbf24' : '#34d399'
          : '#67e8f9';
        context.save();
        context.strokeStyle = guideTone;
        context.fillStyle = guideTone;
        context.lineWidth = 2;
        context.setLineDash([3, 4]);
        context.beginPath();
        context.moveTo(game.previewX, 72);
        context.lineTo(guide.x, guide.y);
        context.stroke();
        context.setLineDash([]);
        context.beginPath();
        context.arc(guide.x, guide.y, 8, 0, Math.PI * 2);
        context.stroke();
        context.beginPath();
        context.moveTo(guide.x - 12, guide.y);
        context.lineTo(guide.x + 12, guide.y);
        context.moveTo(guide.x, guide.y - 12);
        context.lineTo(guide.x, guide.y + 12);
        context.stroke();
        if (game.towerGuideLevel >= 2) {
          const guideLength = Math.max(22, Math.min(46, game.currentProfile.width * .42));
          const dx = Math.cos(guide.angle) * guideLength;
          const dy = Math.sin(guide.angle) * guideLength;
          context.lineWidth = 3;
          context.beginPath();
          context.moveTo(guide.x - dx, guide.y - dy);
          context.lineTo(guide.x + dx, guide.y + dy);
          context.stroke();
          context.font = '900 10px ui-monospace, monospace';
          context.textAlign = 'center';
          context.fillText(`${Math.round(guide.angle * 180 / Math.PI)}°`, guide.x, Math.max(88, guide.y - 17));
        }
        if (game.towerGuideLevel >= 3) {
          const riskLabel = guide.risk === 'danger' ? '危険' : guide.risk === 'warning' ? '注意' : '安全';
          context.font = '900 11px sans-serif';
          context.textAlign = 'center';
          context.fillText(riskLabel, guide.x, Math.min(platform.y - 8, guide.y + 27));
        }
        context.restore();
      }
      drawMonster(context, {
        monsterId: game.currentMonster.id,
        owner: game.currentOwner,
        profile: game.currentProfile,
        x: game.previewX,
        y: 50,
        angle: game.previewAngle,
      }, .72);
    }
  };

  const claimReward = async () => {
    const result = await GameDB.claimDailyTownGameReward(getLocalDateKey(), GAME_ID, game.config.id, game.config.reward);
    claimedDifficulties.add(game.config.id);
    updateHeaderPrism(result.prism);
    return result;
  };

  const showResult = (isWin, rewardStatus = 'none') => {
    if (!game || disposed) return;
    const overlay = document.createElement('div');
    overlay.dataset.result = 'true';
    overlay.className = 'fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-slate-950/85 p-4 backdrop-blur-md';
    overlay.innerHTML = `
      <section class="tower-result w-full max-w-sm rounded-3xl border ${isWin ? 'border-cyan-300/45 bg-gradient-to-b from-cyan-950 to-slate-950' : 'border-rose-400/40 bg-gradient-to-b from-rose-950 to-slate-950'} p-5 text-center shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="tower-result-title">
        <span class="material-symbols-outlined text-6xl ${isWin ? 'text-cyan-200 drop-shadow-[0_0_20px_rgba(34,211,238,.55)]' : 'text-rose-300'}">${isWin ? 'emoji_events' : 'warning'}</span>
        <div class="mt-1 text-[10px] font-black tracking-[.25em] ${isWin ? 'text-cyan-300' : 'text-rose-300'}">${isWin ? 'YOU WIN' : 'TOWER FALL'}</div>
        <h2 id="tower-result-title" class="mt-1 text-xl font-black">${isWin ? 'CPUが崩しました！' : '塔を崩してしまいました'}</h2>
        <p class="mt-2 text-[10px] text-slate-400">${game.turn}手目 ・ ${game.world.bodies.length}体を使用</p>
        ${isWin ? `<div class="mt-3 flex items-center justify-center gap-1 rounded-xl border border-fuchsia-300/30 bg-fuchsia-500/10 py-2 text-sm font-black text-fuchsia-100"><span class="material-symbols-outlined text-fuchsia-300">diamond</span>${rewardStatus === 'awarded' ? `${game.config.reward} Prism 獲得！` : rewardStatus === 'already' ? '本日の報酬は受取済み' : '報酬を保存できませんでした'}</div>` : '<p class="mt-3 text-[10px] text-slate-400">置く位置や角度を変えて再挑戦できます。</p>'}
        <div class="mt-4 grid gap-2">
          ${isWin && rewardStatus === 'failed' ? '<button data-claim-reward class="rounded-xl border border-fuchsia-300/50 bg-fuchsia-600 py-2.5 text-xs font-black">報酬の保存を再試行</button>' : ''}
          <button data-retry class="rounded-xl border border-cyan-300/35 bg-cyan-700 py-2.5 text-xs font-black text-white">同じ難易度でもう一度</button>
          <button data-select class="rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-black text-slate-300">難易度選択へ戻る</button>
        </div>
      </section>`;
    container.appendChild(overlay);
  };

  const finishGame = async winner => {
    if (!game || game.over) return;
    game.over = true;
    game.winner = winner;
    updateControls();
    const isWin = winner === 'player';
    setStatus(isWin ? 'CPUの手番でモンスターが落下しました！' : 'あなたの手番でモンスターが落下しました', isWin ? 'emerald' : 'rose');
    let rewardStatus = 'none';
    if (isWin) {
      rewardStatus = 'failed';
      try {
        const result = await claimReward();
        game.rewardClaimed = true;
        rewardStatus = result.awarded ? 'awarded' : 'already';
      } catch (error) {
        console.error('[MonsterTower] Failed to award Prism.', error);
      }
    }
    later(() => showResult(isWin, rewardStatus), 650);
  };

  const drawFromDeck = () => {
    if (game.deckIndex >= game.deck.length) {
      game.deck = shuffle(MONSTERS);
      game.deckIndex = 0;
    }
    const monster = game.deck[game.deckIndex];
    game.deckIndex += 1;
    return monster;
  };

  const dropCurrentMonster = () => {
    if (!game || game.placing || game.loading || game.over || !game.currentProfile) return;
    const body = createTowerBody({
      id: `tower-body-${++bodySequence}`,
      monsterId: game.currentMonster.id,
      owner: game.currentOwner,
      profile: game.currentProfile,
      x: game.previewX,
      y: 48,
      angle: game.previewAngle,
    });
    addTowerBody(game.world, body);
    game.lastActor = game.currentOwner;
    game.activeBodyId = body.id;
    game.placementGuide = null;
    game.placing = true;
    game.droppedAt = performance.now();
    game.stableFrames = 0;
    setStatus(`${game.currentMonster.name}を落としました。塔が安定するまで待ちます…`, game.currentOwner === 'player' ? 'cyan' : 'amber');
    updateControls();
  };

  const prepareTurn = async () => {
    if (!game || game.over) return;
    const activeGame = game;
    activeGame.loading = true;
    activeGame.currentMonster = drawFromDeck();
    activeGame.currentProfile = null;
    activeGame.previewAngle = 0;
    activeGame.previewX = TOWER_WORLD.width / 2;
    activeGame.placementGuide = null;
    updateControls();
    setStatus(`${activeGame.currentMonster.name}を召喚中…`, activeGame.currentOwner === 'player' ? 'cyan' : 'amber');
    const [profile, image] = await Promise.all([
      loadMonsterProfile(activeGame.currentMonster),
      loadMonsterImage(activeGame.currentMonster),
    ]);
    if (game !== activeGame || activeGame.over || disposed) return;
    if (image) activeGame.readyImages.set(activeGame.currentMonster.id, image);
    activeGame.currentProfile = profile;
    activeGame.loading = false;
    const range = getDropRange(profile);
    activeGame.previewX = Math.max(range.min, Math.min(range.max, TOWER_WORLD.width / 2));
    refreshPlacementGuide();
    updateControls();
    drawScene();

    const next = activeGame.deck[activeGame.deckIndex];
    if (next) {
      Promise.all([loadMonsterProfile(next), loadMonsterImage(next)]).then(([, nextImage]) => {
        if (game === activeGame && nextImage) activeGame.readyImages.set(next.id, nextImage);
      });
    }

    if (activeGame.currentOwner === 'cpu') {
      setStatus('CPUが落下位置と角度をシミュレーションしています…', 'amber');
      later(() => {
        if (game !== activeGame || activeGame.over || activeGame.currentOwner !== 'cpu' || activeGame.loading) return;
        const placement = chooseCpuPlacement(activeGame.world, activeGame.currentProfile, {
          candidateCount: activeGame.config.candidates,
          maxRotation: activeGame.config.maxRotation,
          noise: activeGame.config.noise,
          exhaustiveSearch: activeGame.config.exhaustiveSearch,
          positionCount: activeGame.config.positionCount,
          angleCount: activeGame.config.angleCount,
          simulationFrames: activeGame.config.simulationFrames,
          refineCount: activeGame.config.refineCount,
          refineFrames: activeGame.config.refineFrames,
          monsterId: activeGame.currentMonster.id,
        });
        activeGame.previewX = placement.x;
        activeGame.previewAngle = placement.angle;
        drawScene();
        setStatus(`CPUは${activeGame.currentMonster.name}の位置を決めました`, 'amber');
        later(dropCurrentMonster, 650);
      }, 350);
    } else {
      setStatus('位置と角度を決めて「落とす」を押してください', 'cyan');
    }
  };

  const advanceTurn = () => {
    if (!game || game.over) return;
    game.world.bodies.forEach(body => {
      body.vx = 0;
      body.vy = 0;
      body.angularVelocity = 0;
    });
    game.placing = false;
    game.turn += 1;
    game.currentOwner = game.lastActor === 'player' ? 'cpu' : 'player';
    prepareTurn();
  };

  const animationLoop = timestamp => {
    if (!game || disposed) return;
    if (!game.lastTimestamp) game.lastTimestamp = timestamp;
    const frameDelta = Math.min(MAX_FRAME_DELTA, Math.max(0, (timestamp - game.lastTimestamp) / 1000));
    game.lastTimestamp = timestamp;
    game.accumulator += frameDelta;
    let steps = 0;
    while (game.accumulator >= FIXED_STEP && steps < 10) {
      if (game.placing && !game.over) stepTowerWorld(game.world, FIXED_STEP, 2);
      game.accumulator -= FIXED_STEP;
      steps += 1;
    }
    drawScene();

    if (game.placing && !game.over) {
      const fallen = getFallenBodies(game.world);
      if (fallen.length) {
        finishGame(game.lastActor === 'player' ? 'cpu' : 'player');
      } else {
        const elapsed = timestamp - game.droppedAt;
        const motion = getTowerMotion(game.world);
        game.stableFrames = elapsed > 450 && motion < 8 ? game.stableFrames + 1 : 0;
        if (game.stableFrames >= 30 || elapsed > 5500) advanceTurn();
      }
    }
    animationId = window.requestAnimationFrame(animationLoop);
  };

  const renderGame = () => {
    container.innerHTML = `
      ${pageStyles()}
      <div class="mx-auto max-w-lg p-2 pb-4">
        <header class="mb-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/80 p-2 shadow-lg">
          <button data-home class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300" aria-label="ホームタウンへ戻る"><span class="material-symbols-outlined">arrow_back</span></button>
          <div class="min-w-0 flex-1"><div class="text-[8px] font-black tracking-[.2em] text-cyan-300">MONSTER TOWER</div><div data-turn-owner class="text-xs font-black text-cyan-200">あなたの手番</div></div>
          <div class="rounded-xl border border-white/10 bg-black/25 px-2.5 py-1.5 text-right"><div data-turn-count class="text-xs font-black">1手目</div><div class="text-[8px] text-slate-500">${game.config.label}</div></div>
        </header>

        <div data-status class="mb-2 flex min-h-9 items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-950/35 px-3 text-center text-[10px] font-black text-cyan-100">対戦を準備しています…</div>
        ${game.towerGuideLevel ? `<div class="mb-2 flex items-center justify-center gap-1 rounded-xl border border-emerald-300/20 bg-emerald-950/25 px-3 py-1.5 text-[9px] font-black text-emerald-100"><span class="material-symbols-outlined text-sm">architecture</span>獣塔の下げ振り Lv.${game.towerGuideLevel}：${game.towerGuideLevel >= 3 ? '着地点・角度・安全度' : game.towerGuideLevel >= 2 ? '着地点・角度' : '着地点'}を予測</div>` : ''}

        <div class="relative mx-auto max-w-[360px]">
          <canvas data-tower-canvas class="tower-canvas" width="360" height="520" aria-label="モンスターを積み上げる対戦フィールド"></canvas>
          <div class="pointer-events-none absolute left-2 top-2 flex max-w-[145px] items-center gap-1.5 rounded-xl border border-cyan-300/25 bg-slate-950/75 p-1.5 backdrop-blur-sm">
            <img data-current-image class="h-9 w-9 shrink-0 object-contain" alt="">
            <span class="min-w-0"><span class="block text-[7px] font-black tracking-wider text-cyan-300">CURRENT</span><span data-current-name class="block truncate text-[9px] font-black">読み込み中…</span><span data-current-physics class="block truncate text-[7px] text-slate-400">形状を解析中</span></span>
          </div>
          <div class="pointer-events-none absolute right-2 top-2 flex max-w-[125px] items-center gap-1 rounded-xl border border-white/10 bg-slate-950/70 p-1 backdrop-blur-sm">
            <img data-next-image class="h-7 w-7 shrink-0 object-contain opacity-75" alt="">
            <span class="min-w-0"><span class="block text-[7px] font-black text-slate-500">NEXT</span><span data-next-name class="block truncate text-[8px] text-slate-300">--</span></span>
          </div>
        </div>

        <div class="mt-2 grid grid-cols-5 gap-1.5">
          <button data-move="-1" class="flex min-h-11 items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-950/35 text-cyan-100 disabled:opacity-25" aria-label="左へ移動"><span class="material-symbols-outlined">arrow_left_alt</span></button>
          <button data-rotate="-1" class="flex min-h-11 items-center justify-center rounded-xl border border-violet-300/25 bg-violet-950/35 text-violet-100 disabled:opacity-25" aria-label="左へ回転"><span class="material-symbols-outlined">rotate_left</span></button>
          <button data-drop class="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-amber-200/50 bg-gradient-to-b from-amber-500 to-orange-700 text-[10px] font-black text-white shadow-lg active:scale-95 disabled:opacity-25"><span class="material-symbols-outlined text-lg">vertical_align_bottom</span>落とす</button>
          <button data-rotate="1" class="flex min-h-11 items-center justify-center rounded-xl border border-violet-300/25 bg-violet-950/35 text-violet-100 disabled:opacity-25" aria-label="右へ回転"><span class="material-symbols-outlined">rotate_right</span></button>
          <button data-move="1" class="flex min-h-11 items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-950/35 text-cyan-100 disabled:opacity-25" aria-label="右へ移動"><span class="material-symbols-outlined">arrow_right_alt</span></button>
        </div>
        <p class="mt-1.5 text-center text-[8px] text-slate-500">フィールドをタッチして落下位置を直接指定できます</p>
      </div>`;

    const canvas = container.querySelector('[data-tower-canvas]');
    game.canvas = canvas;
    game.context = canvas.getContext('2d');
    canvas.addEventListener('pointerdown', event => {
      if (!game || game.currentOwner !== 'player' || game.placing || game.loading || game.over || !game.currentProfile) return;
      event.preventDefault();
      const rectangle = canvas.getBoundingClientRect();
      const x = (event.clientX - rectangle.left) * (TOWER_WORLD.width / rectangle.width);
      const range = getDropRange(game.currentProfile);
      game.previewX = Math.max(range.min, Math.min(range.max, x));
      refreshPlacementGuide();
      drawScene();
    });
  };

  const startGame = async difficultyId => {
    const config = DIFFICULTIES[difficultyId];
    if (!config) return;
    try {
      const [latestClaim] = await Promise.all([
        GameDB.getGameState(getTownGameRewardStateKey(GAME_ID, difficultyId)),
        loadTreasureLevels(),
      ]);
      if (latestClaim === getLocalDateKey()) claimedDifficulties.add(difficultyId);
    } catch (error) {
      console.error('[MonsterTower] Failed to verify daily reward.', error);
      renderLoadError();
      return;
    }
    if (disposed) return;
    const matterReady = await waitForMatterRuntime();
    if (disposed) return;
    if (!matterReady) {
      renderPhysicsError();
      return;
    }
    stopAnimation();
    clearTimers();
    game = {
      config,
      world: createTowerWorld([], { stoppers: config.stoppers }),
      deck: shuffle(MONSTERS),
      deckIndex: 0,
      readyImages: new Map(),
      currentOwner: Math.random() < .5 ? 'player' : 'cpu',
      currentMonster: null,
      currentProfile: null,
      previewX: TOWER_WORLD.width / 2,
      previewAngle: 0,
      towerGuideLevel: getTreasureEffect('towerPlacementGuideLevel'),
      placementGuide: null,
      loading: false,
      placing: false,
      over: false,
      rewardClaimed: false,
      turn: 1,
      stableFrames: 0,
      accumulator: 0,
      lastTimestamp: 0,
    };
    renderGame();
    window.dispatchEvent(new CustomEvent('quest:mini-game-play'));
    updateControls();
    prepareTurn();
    animationId = window.requestAnimationFrame(animationLoop);
  };

  container.addEventListener('click', async event => {
    if (event.target.closest('[data-home]')) {
      window.location.hash = '/status';
      return;
    }
    const difficulty = event.target.closest('[data-difficulty]');
    if (difficulty) {
      difficulty.disabled = true;
      await startGame(difficulty.dataset.difficulty);
      return;
    }
    if (event.target.closest('[data-reload]')) {
      renderSelect();
      return;
    }
    if (event.target.closest('[data-reload-app]')) {
      window.location.reload();
      return;
    }
    const move = event.target.closest('[data-move]');
    if (move && game?.currentOwner === 'player' && !game.placing && !game.loading && game.currentProfile) {
      const range = getDropRange(game.currentProfile);
      game.previewX = Math.max(range.min, Math.min(range.max, game.previewX + Number(move.dataset.move) * 14));
      refreshPlacementGuide();
      drawScene();
      return;
    }
    const rotate = event.target.closest('[data-rotate]');
    if (rotate && game?.currentOwner === 'player' && !game.placing && !game.loading) {
      game.previewAngle = normalizeAngle(game.previewAngle + Number(rotate.dataset.rotate) * Math.PI / 12);
      refreshPlacementGuide();
      drawScene();
      return;
    }
    if (event.target.closest('[data-drop]') && game?.currentOwner === 'player') {
      dropCurrentMonster();
      return;
    }
    if (event.target.closest('[data-select]')) {
      container.querySelector('[data-result]')?.remove();
      renderSelect();
      return;
    }
    const retry = event.target.closest('[data-retry]');
    if (retry && game) {
      const difficultyId = game.config.id;
      retry.disabled = true;
      container.querySelector('[data-result]')?.remove();
      await startGame(difficultyId);
      return;
    }
    const claimButton = event.target.closest('[data-claim-reward]');
    if (claimButton && game && !game.rewardClaimed) {
      claimButton.disabled = true;
      claimButton.textContent = '保存中…';
      try {
        const result = await claimReward();
        game.rewardClaimed = true;
        container.querySelector('[data-result]')?.remove();
        showResult(true, result.awarded ? 'awarded' : 'already');
      } catch (error) {
        console.error('[MonsterTower] Failed to retry Prism award.', error);
        claimButton.disabled = false;
        claimButton.textContent = '報酬の保存を再試行';
      }
    }
  });

  container.cleanup = () => {
    disposed = true;
    stopAnimation();
    clearTimers();
    container.querySelector('[data-result]')?.remove();
  };

  renderSelect();
  return container;
}
