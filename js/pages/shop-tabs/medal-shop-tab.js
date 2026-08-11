import { GameDB } from '../../data/database.js';
import { formatNumber } from '../../utils/format.js';
import {
  MEDAL_SHOP_DUNGEON_REWARDS,
  calculateMedalPoints,
} from '../../definitions/medal-shop-definitions.js';

const TYPE_META = {
  accessory: { color: 'text-fuchsia-300', border: 'border-fuchsia-400/25', glow: 'rgba(232,121,249,.2)' },
  armor: { color: 'text-sky-300', border: 'border-sky-400/25', glow: 'rgba(125,211,252,.2)' },
  weapon: { color: 'text-rose-300', border: 'border-rose-400/25', glow: 'rgba(253,164,175,.2)' },
};

function rewardImage(reward) {
  return `./assets/${reward.type}/${reward.id}.webp`;
}

function createEquipmentInstance(reward) {
  return {
    id: `${reward.id}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    baseId: reward.id,
  };
}

function showClaimCelebration(container, reward) {
  const celebration = document.createElement('div');
  celebration.className = 'absolute inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-6 backdrop-blur-sm';
  celebration.setAttribute('role', 'status');
  celebration.setAttribute('aria-live', 'polite');
  celebration.innerHTML = `
    <div class="relative w-full max-w-xs overflow-hidden rounded-[28px] border border-amber-200/50 bg-gradient-to-b from-amber-950 via-slate-950 to-violet-950 p-5 text-center shadow-[0_0_70px_rgba(251,191,36,.35)]">
      <div class="absolute -left-12 -top-12 h-32 w-32 rounded-full bg-amber-300/20 blur-3xl"></div>
      <div class="absolute -bottom-14 -right-10 h-36 w-36 rounded-full bg-fuchsia-400/20 blur-3xl"></div>
      <div class="relative text-[9px] font-black tracking-[.35em] text-amber-200">MILESTONE COMPLETE</div>
      <div class="relative mx-auto mt-4 flex h-36 w-36 items-center justify-center rounded-3xl border border-amber-200/25 bg-[radial-gradient(circle,rgba(251,191,36,.2),transparent_68%)]">
        <img src="${rewardImage(reward)}" alt="" class="h-32 w-32 object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,.65)]">
      </div>
      <div class="relative mt-3 text-[10px] font-black text-amber-300">${formatNumber(reward.points)}P REWARD</div>
      <div class="relative mt-1 text-base font-black text-white">${reward.name}</div>
      <div class="relative mt-2 text-[10px] font-bold text-emerald-300">装備を獲得しました！</div>
    </div>`;
  container.appendChild(celebration);
  window.setTimeout(() => celebration.remove(), 1400);
}

export async function renderMedalShopTab() {
  const container = document.createElement('div');
  container.className = 'relative flex h-full min-h-0 flex-col overflow-hidden bg-[#080812] text-slate-100';
  container.innerHTML = '<div class="flex h-full items-center justify-center text-xs font-bold text-slate-500">メダルポイントを集計中...</div>';

  const [
    playerMedalsValue,
    claimedValue,
    ownedEquipment,
  ] = await Promise.all([
    GameDB.getGameState('player_medals'),
    GameDB.getGameState('medal_shop_claimed_rewards'),
    GameDB.getAllEquipment(),
  ]);
  const playerMedals = playerMedalsValue || {};
  const points = calculateMedalPoints(playerMedals);
  const storedClaimedCount = Array.isArray(claimedValue) ? new Set(claimedValue).size : 0;
  const claimed = new Set(Array.isArray(claimedValue) ? claimedValue : []);
  const ownedBaseIds = new Set((ownedEquipment || []).map(item => item.baseId || item.id));
  MEDAL_SHOP_DUNGEON_REWARDS.flatMap(dungeon => dungeon.rewards).forEach(reward => {
    if (ownedBaseIds.has(reward.id)) claimed.add(reward.id);
  });
  if (claimed.size > storedClaimedCount) {
    await GameDB.setGameState('medal_shop_claimed_rewards', [...claimed]);
  }

  const allRewards = MEDAL_SHOP_DUNGEON_REWARDS
    .flatMap(dungeon => dungeon.rewards)
    .sort((a, b) => a.points - b.points);
  const maxPoints = allRewards.at(-1)?.points || points || 1;
  let claiming = false;

  const render = () => {
    const claimableRewards = allRewards.filter(reward => !claimed.has(reward.id) && reward.points <= points);
    const nextLockedReward = allRewards.find(reward => !claimed.has(reward.id) && reward.points > points);
    const spotlightReward = claimableRewards[0] || nextLockedReward || allRewards.at(-1);
    const spotlightMeta = TYPE_META[spotlightReward.type];
    const remainingPoints = Math.max(0, (nextLockedReward?.points || maxPoints) - points);
    const nextMilestonePoints = nextLockedReward?.points || maxPoints;
    const milestoneProgress = nextLockedReward
      ? Math.min(100, points / Math.max(1, nextMilestonePoints) * 100)
      : 100;

    container.innerHTML = `
      <header class="relative shrink-0 overflow-hidden border-b border-amber-300/15 bg-[radial-gradient(circle_at_85%_0%,rgba(251,191,36,.18),transparent_38%),linear-gradient(135deg,rgba(69,26,3,.82),rgba(2,6,23,.96)_52%,rgba(46,16,101,.55))] px-3 pb-3 pt-3 shadow-xl">
        <div class="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full border border-amber-200/10"></div>
        <div class="relative flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-2xl text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,.6)]" style="font-variation-settings:'FILL' 1">route</span>
              <div>
                <h2 class="text-sm font-black tracking-wide text-white">伝説装備へのロードマップ</h2>
              </div>
            </div>
          </div>
          <div class="shrink-0 rounded-2xl border border-amber-300/30 bg-black/35 px-3 py-2 text-right shadow-[0_0_22px_rgba(251,191,36,.13)]">
            <div class="text-[10px] font-bold text-amber-100/70">メダルポイント</div>
            <div class="text-xl font-black tabular-nums text-amber-300">${formatNumber(points)}<span class="ml-1 text-[9px]">P</span></div>
          </div>
        </div>

        <div class="relative mt-3 grid grid-cols-[64px_1fr] items-center gap-3 rounded-2xl border ${claimableRewards.length ? 'border-amber-300/35 bg-amber-300/[.08]' : 'border-white/10 bg-black/25'} p-2">
          <div class="relative flex h-16 w-16 items-center justify-center rounded-xl border ${spotlightMeta.border} bg-[radial-gradient(circle,rgba(255,255,255,.12),transparent_70%)]">
            <img src="${rewardImage(spotlightReward)}" alt="${spotlightReward.name}" class="h-[58px] w-[58px] object-contain drop-shadow-[0_7px_9px_rgba(0,0,0,.7)]">
            ${claimableRewards.length ? '<span class="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full border-2 border-amber-100 bg-amber-400"></span>' : ''}
          </div>
          <div class="min-w-0">
            <div class="flex items-center justify-between gap-2">
              <span class="text-[10px] font-black ${claimableRewards.length ? 'text-amber-300' : 'text-cyan-300'}">${claimableRewards.length ? `受け取り可能 ×${claimableRewards.length}` : nextLockedReward ? '次の報酬' : 'すべて達成'}</span>
              <span class="text-[10px] font-black tabular-nums text-white">${formatNumber(spotlightReward.points)}P</span>
            </div>
            <div class="mt-0.5 truncate text-[11px] font-black text-white">${spotlightReward.name}</div>
            <div class="mt-1 flex items-start gap-1.5 text-[10px] font-bold leading-snug text-slate-300"><span class="material-symbols-outlined ${spotlightMeta.color}" style="font-size:14px">auto_awesome</span><span>${spotlightReward.specialEffect.description}</span></div>
            ${nextLockedReward && !claimableRewards.length ? `<div class="mt-1 text-[9px] font-black text-cyan-300">あと ${formatNumber(remainingPoints)}P</div>` : ''}
          </div>
        </div>

        <div class="relative mt-3" aria-label="次の報酬までの進捗">
          <div class="mb-1.5 flex items-end justify-between gap-3">
            <span class="text-[11px] font-black text-slate-300">${nextLockedReward ? '次の報酬まで' : 'すべての報酬に到達'}</span>
            <span class="text-[11px] font-black tabular-nums text-cyan-300">${nextLockedReward ? `${formatNumber(points)} / ${formatNumber(nextMilestonePoints)}P` : 'COMPLETE'}</span>
          </div>
          <div class="h-3 overflow-hidden rounded-full border border-white/10 bg-black/55">
            <div class="relative h-full rounded-full bg-gradient-to-r from-orange-500 via-amber-300 to-fuchsia-300 transition-all duration-500" style="width:${milestoneProgress}%"><span class="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 translate-x-1/2 rounded-full bg-white shadow-[0_0_10px_white]"></span></div>
          </div>
          ${nextLockedReward ? `<div class="mt-1.5 flex items-center justify-between text-[10px] font-bold tabular-nums text-slate-400"><span>${formatNumber(points)}P</span><span>目標 ${formatNumber(nextMilestonePoints)}P</span></div>` : ''}
        </div>
      </header>

      <div data-roadmap-scroll class="no-scrollbar min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,.08),transparent_32%)] px-3 py-4">
        <div class="mx-auto max-w-2xl">
          <div class="mb-3 flex items-end justify-between">
            <h3 class="text-xs font-black text-white">ポイント達成報酬</h3>
          </div>

          <ol class="relative" aria-label="メダルポイント報酬ロードマップ">
            ${allRewards.map((reward, index) => {
              const meta = TYPE_META[reward.type];
              const isClaimed = claimed.has(reward.id);
              const canClaim = points >= reward.points && !isClaimed;
              const isReached = points >= reward.points;
              const isCurrent = spotlightReward.id === reward.id;
              const missing = Math.max(0, reward.points - points);
              const connectorReached = index < allRewards.length - 1 && points >= allRewards[index + 1].points;
              return `
                <li class="relative grid grid-cols-[38px_1fr] gap-2 pb-3" ${isCurrent ? 'data-current-milestone' : ''}>
                  ${index < allRewards.length - 1 ? `<div class="absolute bottom-0 left-[18px] top-8 w-px ${connectorReached ? 'bg-gradient-to-b from-amber-300 to-fuchsia-400' : 'bg-slate-800'}"></div>` : ''}
                  <div class="relative z-10 mt-3 flex h-9 w-9 items-center justify-center rounded-full border-2 ${isClaimed ? 'border-emerald-300 bg-emerald-950 text-emerald-300 shadow-[0_0_14px_rgba(52,211,153,.3)]' : canClaim ? 'animate-pulse border-amber-200 bg-amber-500 text-slate-950 shadow-[0_0_20px_rgba(251,191,36,.6)]' : isReached ? 'border-amber-400 bg-amber-950 text-amber-300' : 'border-slate-700 bg-slate-950 text-slate-600'}">
                    <span class="material-symbols-outlined text-base" style="font-variation-settings:'FILL' 1">${isClaimed ? 'check' : canClaim ? 'redeem' : 'lock'}</span>
                  </div>

                  <article class="relative overflow-hidden rounded-2xl border ${isClaimed ? 'border-emerald-400/20 bg-gradient-to-br from-emerald-950/30 to-slate-950/95' : canClaim ? 'border-amber-300/45 bg-gradient-to-br from-amber-950/55 via-slate-950 to-violet-950/60 shadow-[0_0_25px_rgba(251,191,36,.12)]' : isCurrent ? 'border-cyan-400/30 bg-gradient-to-br from-cyan-950/30 to-slate-950' : 'border-slate-800/80 bg-slate-950/80'} p-2.5">
                    ${isCurrent ? `<div class="absolute right-0 top-0 rounded-bl-xl border-b border-l ${canClaim ? 'border-amber-300/25 bg-amber-300/10 text-amber-300' : 'border-cyan-300/20 bg-cyan-300/10 text-cyan-300'} px-2 py-1 text-[7px] font-black tracking-widest">現在地</div>` : ''}
                    <div class="grid grid-cols-[84px_1fr] gap-2.5">
                      <div class="relative flex h-[84px] w-[84px] items-center justify-center overflow-hidden rounded-xl border ${meta.border} bg-[radial-gradient(circle,rgba(255,255,255,.12),rgba(2,6,23,.15)_68%)]" style="box-shadow:inset 0 0 22px ${meta.glow}">
                        <div class="absolute inset-x-2 bottom-1 h-3 rounded-full bg-black/55 blur-md"></div>
                        <img src="${rewardImage(reward)}" alt="${reward.name}" class="relative h-20 w-20 object-contain drop-shadow-[0_8px_8px_rgba(0,0,0,.75)] transition ${!isReached ? 'grayscale opacity-50' : ''}">
                        ${!isReached ? '<span class="material-symbols-outlined absolute right-1 top-1 rounded-full bg-slate-950/80 p-1 text-[12px] text-slate-500">lock</span>' : ''}
                      </div>

                      <div class="min-w-0 pr-1">
                        <div class="flex items-center gap-1.5">
                          <span class="rounded-full border ${isReached ? 'border-amber-300/25 bg-amber-300/10 text-amber-300' : 'border-slate-700 bg-slate-900 text-slate-500'} px-2 py-0.5 text-[8px] font-black tabular-nums">${formatNumber(reward.points)}P</span>
                        </div>
                        <h4 class="mt-2 break-words text-[13px] font-black leading-snug ${isReached ? 'text-white' : 'text-slate-400'}">${reward.name}</h4>
                      </div>
                    </div>

                    <div class="relative mt-2.5 overflow-hidden rounded-xl border ${isReached ? meta.border : 'border-slate-800'} bg-gradient-to-br ${isReached ? 'from-white/[.08] via-black/35 to-black/55' : 'from-slate-900/70 to-black/45'} px-3 py-3">
                      <div class="absolute -right-5 -top-7 h-20 w-20 rounded-full bg-white/[.04] blur-xl"></div>
                      <div class="relative flex items-start gap-2.5">
                        <span class="material-symbols-outlined flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${isReached ? `${meta.border} bg-white/[.07] ${meta.color}` : 'border-slate-800 bg-slate-900 text-slate-600'} text-[18px]" style="font-variation-settings:'FILL' 1">auto_awesome</span>
                        <div class="min-w-0">
                          <div class="text-[8px] font-black tracking-[.18em] ${isReached ? meta.color : 'text-slate-600'}">UNIQUE EFFECT</div>
                          <p class="mt-1 text-[11px] font-bold leading-[1.65] ${isReached ? 'text-slate-100' : 'text-slate-500'}">${reward.specialEffect.description}</p>
                        </div>
                      </div>
                    </div>

                    <button type="button" data-medal-reward-id="${reward.id}" ${canClaim ? '' : 'disabled'} aria-label="${reward.name}を受け取る" class="mt-2 flex min-h-10 w-full items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[10px] font-black transition-all ${isClaimed ? 'border-emerald-500/20 bg-emerald-950/40 text-emerald-400' : canClaim ? 'border-amber-200/50 bg-gradient-to-r from-orange-600 via-amber-500 to-yellow-400 text-slate-950 shadow-[0_0_18px_rgba(251,191,36,.25)] active:scale-[.98]' : 'border-slate-800 bg-slate-900/60 text-slate-600'}">
                      <span class="material-symbols-outlined text-[15px]">${isClaimed ? 'check_circle' : canClaim ? 'redeem' : 'lock'}</span>
                      ${isClaimed ? '獲得済み' : canClaim ? '到達報酬を受け取る' : `あと ${formatNumber(missing)}P`}
                    </button>
                  </article>
                </li>`;
            }).join('')}
          </ol>

          <div class="ml-[46px] rounded-2xl border border-dashed border-amber-300/25 bg-amber-300/[.04] px-4 py-5 text-center">
            <span class="material-symbols-outlined text-2xl text-amber-300">emoji_events</span>
            <div class="mt-1 text-[10px] font-black text-white">全ロード踏破</div>
            <div class="mt-1 text-[8px] text-slate-500">${formatNumber(maxPoints)}Pで、すべての伝説装備があなたのものに</div>
          </div>
        </div>
      </div>`;

    container.querySelectorAll('[data-medal-reward-id]').forEach(button => {
      button.addEventListener('click', async () => {
        if (claiming || button.disabled) return;
        const rewardId = button.dataset.medalRewardId;
        const reward = allRewards.find(item => item.id === rewardId);
        if (!reward || claimed.has(rewardId) || points < reward.points) return;
        claiming = true;
        button.disabled = true;
        button.innerHTML = '<span class="material-symbols-outlined animate-spin text-[15px]">progress_activity</span>受け取り中...';
        const instance = createEquipmentInstance(reward);
        try {
          await GameDB.putEquipment(instance);
          claimed.add(rewardId);
          await GameDB.setGameState('medal_shop_claimed_rewards', [...claimed]);
          window.dispatchEvent(new CustomEvent('quest:equipment-craft', { detail: { itemId: reward.id, count: 1 } }));
          render();
          showClaimCelebration(container, reward);
        } catch (error) {
          console.error('[MedalShop] Reward claim failed.', error);
          claimed.delete(rewardId);
          try { await GameDB.deleteEquipment(instance.id); } catch (_) { /* best-effort rollback */ }
          button.disabled = false;
          button.textContent = '受け取りに失敗';
        } finally {
          claiming = false;
        }
      });
    });
  };

  render();
  return container;
}
