import { APP_RELEASE_DATE, APP_VERSION, UPDATE_LOG } from '../definitions/update-log.js';

const CATEGORY_RULES = [
  { id: 'cloud', label: 'データ保存', icon: 'cloud_sync', tone: 'sky', words: ['クラウド', 'Firebase', 'Firestore', 'ログイン', 'セーブデータ'] },
  { id: 'memory', label: '神経衰弱', icon: 'style', tone: 'fuchsia', words: ['神経衰弱', '記憶術', '勝負術', '盤面術'] },
  { id: 'job', label: 'ジョブ・育成', icon: 'shield_person', tone: 'violet', words: ['職「', '職業', 'ジョブ', 'スキル', 'SP', 'JP', '限界突破', '転職'] },
  { id: 'equipment', label: '装備・ショップ', icon: 'inventory_2', tone: 'amber', words: ['メダル報酬装備', 'メダル」タブ', '装備枠', '最強装備', '武器・防具・アクセサリ'] },
  { id: 'fishing', label: '釣り・魚図鑑', icon: 'phishing', tone: 'cyan', words: ['釣り', '魚', 'ルアー', '釣竿', 'エサ'] },
  { id: 'quest', label: 'クエスト', icon: 'task_alt', tone: 'amber', words: ['クエスト', '報酬', 'Prism'] },
  { id: 'ranch', label: 'モンスター牧場', icon: 'pets', tone: 'emerald', words: ['牧場', '魚餌', '仲間になったモンスター'] },
  { id: 'mine', label: '鉱山', icon: 'diamond', tone: 'orange', words: ['鉱山', '採掘', '魚油'] },
  { id: 'battle', label: 'バトル', icon: 'swords', tone: 'rose', words: ['戦闘', '攻撃', 'ATB', 'ダメージ', '敵', 'メダル', 'HP', 'MP'] },
  { id: 'comfort', label: '画面・操作', icon: 'touch_app', tone: 'indigo', words: ['画面', '表示', 'タップ', 'スクロール', '操作', 'UI', 'モーダル', 'タブ'] },
  { id: 'performance', label: '動作・安定性', icon: 'speed', tone: 'teal', words: ['軽量', '負荷', '安定', 'バッテリー', 'バックグラウンド', '省エネ', 'エラー'] },
];

const CATEGORY_TONES = {
  sky: { icon: 'border-sky-400/35 bg-sky-400/10 text-sky-300', badge: 'border-sky-400/25 bg-sky-400/10 text-sky-200', line: 'bg-sky-400' },
  fuchsia: { icon: 'border-fuchsia-400/35 bg-fuchsia-400/10 text-fuchsia-300', badge: 'border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-200', line: 'bg-fuchsia-400' },
  violet: { icon: 'border-violet-400/35 bg-violet-400/10 text-violet-300', badge: 'border-violet-400/25 bg-violet-400/10 text-violet-200', line: 'bg-violet-400' },
  cyan: { icon: 'border-cyan-400/35 bg-cyan-400/10 text-cyan-300', badge: 'border-cyan-400/25 bg-cyan-400/10 text-cyan-200', line: 'bg-cyan-400' },
  amber: { icon: 'border-amber-400/35 bg-amber-400/10 text-amber-300', badge: 'border-amber-400/25 bg-amber-400/10 text-amber-200', line: 'bg-amber-400' },
  emerald: { icon: 'border-emerald-400/35 bg-emerald-400/10 text-emerald-300', badge: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200', line: 'bg-emerald-400' },
  orange: { icon: 'border-orange-400/35 bg-orange-400/10 text-orange-300', badge: 'border-orange-400/25 bg-orange-400/10 text-orange-200', line: 'bg-orange-400' },
  rose: { icon: 'border-rose-400/35 bg-rose-400/10 text-rose-300', badge: 'border-rose-400/25 bg-rose-400/10 text-rose-200', line: 'bg-rose-400' },
  indigo: { icon: 'border-indigo-400/35 bg-indigo-400/10 text-indigo-300', badge: 'border-indigo-400/25 bg-indigo-400/10 text-indigo-200', line: 'bg-indigo-400' },
  teal: { icon: 'border-teal-400/35 bg-teal-400/10 text-teal-300', badge: 'border-teal-400/25 bg-teal-400/10 text-teal-200', line: 'bg-teal-400' },
  slate: { icon: 'border-slate-500/50 bg-slate-800 text-slate-300', badge: 'border-slate-600 bg-slate-800 text-slate-300', line: 'bg-slate-500' },
};

const CHANGE_TYPES = [
  { label: 'NEW', className: 'bg-emerald-400/15 text-emerald-300', words: ['追加', '登場', '解放'] },
  { label: 'FIX', className: 'bg-rose-400/15 text-rose-300', words: ['修正', 'エラー', '問題'] },
  { label: 'RENEW', className: 'bg-sky-400/15 text-sky-300', words: ['全面改修', '刷新', '再設計'] },
  { label: 'TUNE', className: 'bg-amber-400/15 text-amber-300', words: ['調整', '統一', '補正'] },
  { label: 'BETTER', className: 'bg-violet-400/15 text-violet-300', words: ['改善', '軽量化', '安定化'] },
  { label: 'CHANGE', className: 'bg-slate-400/15 text-slate-300', words: ['変更', '廃止', '削除'] },
];

const FALLBACK_CATEGORY = { id: 'other', label: 'ゲーム全体', icon: 'auto_awesome', tone: 'slate' };

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getCategory(item) {
  const text = String(item || '');
  let best = FALLBACK_CATEGORY;
  let bestScore = 0;
  CATEGORY_RULES.forEach(category => {
    const score = category.words.reduce((total, word) => total + (text.includes(word) ? 1 : 0), 0);
    if (score > bestScore) {
      best = category;
      bestScore = score;
    }
  });
  return best;
}

function getChangeType(item) {
  const text = String(item || '');
  return CHANGE_TYPES.find(type => type.words.some(word => text.includes(word)))
    || { label: 'UPDATE', className: 'bg-white/[.07] text-slate-300' };
}

function getItemTitle(item, category, type) {
  const text = String(item || '');
  const namedJob = text.match(/(?:上位職|最上位職|氷魔法の上位職|超タンク職)「([^」]+)」/);
  if (namedJob) return `新ジョブ「${namedJob[1]}」`;
  if (text.includes('クラウドセーブ')) return 'クラウドセーブが利用可能に';
  if (text.includes('通常攻撃') && text.includes('アニメーション')) return '通常攻撃に専用演出';
  if (text.includes('省エネ画面')) return '省エネ中も状況がひと目で分かる';
  if (text.includes('画面ロック')) return '画面ロックを使いやすく';
  if (text.includes('スペシャルクエスト')) return 'スペシャルクエストを拡張';
  if (text.includes('デイリークエスト')) return 'デイリークエストを更新';
  if (text.includes('釣具工房')) return '釣具工房をアップデート';
  if (text.includes('魚図鑑')) return '魚図鑑の楽しみを拡張';
  if (text.includes('神経衰弱')) return '神経衰弱をアップデート';
  if (text.includes('メダル」タブ')) return 'メダルロードが登場';
  if (text.includes('自動装備ロック')) return '残したい装備をロック';
  if (text.includes('牧場の魚餌')) return '魚餌をまとめて選択';
  const action = {
    NEW: 'に新しい要素', FIX: 'の問題を修正', RENEW: 'を全面リニューアル', TUNE: 'をバランス調整',
    BETTER: 'をもっと快適に', CHANGE: 'の仕組みを整理', UPDATE: 'をアップデート',
  }[type.label];
  return `${category.label}${action}`;
}

function groupEntriesByDate(entries) {
  const dates = [];
  const dateMap = new Map();
  (entries || []).forEach(entry => {
    const date = String(entry?.date || '日付未記入');
    if (!dateMap.has(date)) {
      const group = { date, entries: [] };
      dateMap.set(date, group);
      dates.push(group);
    }
    dateMap.get(date).entries.push(entry || {});
  });
  return dates;
}

function formatDate(date) {
  const match = String(date).match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
  if (!match) return { year: '', short: date, full: date, weekday: '' };
  const parsed = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00`);
  const weekday = ['日', '月', '火', '水', '木', '金', '土'][parsed.getDay()];
  return {
    year: match[1],
    short: `${Number(match[2])}/${Number(match[3])}`,
    full: `${match[1]}年${Number(match[2])}月${Number(match[3])}日`,
    weekday: `${weekday}曜日`,
  };
}

function renderCloudSaveGuide() {
  return `
    <section class="my-4 overflow-hidden rounded-2xl border border-sky-400/25 bg-gradient-to-br from-sky-950/80 via-slate-950 to-violet-950/70" aria-labelledby="cloud-save-guide-title">
      <div class="flex items-start gap-2.5 border-b border-sky-300/10 bg-sky-400/[.06] p-3.5">
        <span class="material-symbols-outlined flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-400/10 text-xl text-sky-300">cloud_done</span>
        <div>
          <p class="text-[8px] font-black tracking-[.16em] text-sky-400">HOW TO SIGN IN</p>
          <h3 id="cloud-save-guide-title" class="mt-0.5 text-xs font-black text-white">サインインから保存まで</h3>
          <p class="mt-1 text-[9px] leading-relaxed text-slate-400">画面右上から、線に沿って進めば利用できます。</p>
        </div>
      </div>

      <div class="p-3.5">
        <div class="grid grid-cols-[1fr_22px_1fr] items-center gap-1.5">
          <div class="rounded-xl border border-slate-600/50 bg-slate-900/80 p-2.5 text-center">
            <span class="material-symbols-outlined text-xl text-slate-200">settings</span>
            <div class="mt-1 text-[9px] font-black text-white"><span class="mr-1 text-slate-500">1</span> 設定</div>
            <div class="mt-0.5 text-[7px] text-slate-500">右上の歯車</div>
          </div>
          <span class="material-symbols-outlined text-center text-base text-sky-500">arrow_forward</span>
          <div class="rounded-xl border border-cyan-500/30 bg-cyan-950/55 p-2.5 text-center">
            <span class="material-symbols-outlined text-xl text-cyan-300">database</span>
            <div class="mt-1 text-[9px] font-black text-cyan-100"><span class="mr-1 text-cyan-500">2</span> データ管理</div>
            <div class="mt-0.5 text-[7px] text-cyan-500/80">下へスクロール</div>
          </div>
        </div>

        <div class="flex justify-end pr-[calc(25%_-_3px)]"><span class="material-symbols-outlined py-1 text-base text-violet-500">south</span></div>

        <div class="rounded-xl border border-violet-500/30 bg-violet-950/45 p-2.5">
          <div class="flex items-center justify-center gap-1 text-[9px] font-black text-violet-100"><span class="text-violet-500">3</span> サインイン方法を選ぶ</div>
          <div class="mt-2 grid grid-cols-[1fr_20px_1fr] items-center gap-1">
            <div class="rounded-lg border border-white/10 bg-black/20 p-2 text-center">
              <span class="material-symbols-outlined text-lg text-slate-300">mail</span>
              <div class="mt-0.5 text-[8px] font-bold text-slate-200">メールアドレス</div>
              <div class="text-[7px] text-slate-500">登録 / ログイン</div>
            </div>
            <div class="text-center text-[8px] font-black text-violet-400">OR</div>
            <div class="rounded-lg border border-white/10 bg-black/20 p-2 text-center">
              <span class="material-symbols-outlined text-lg text-slate-300">account_circle</span>
              <div class="mt-0.5 text-[8px] font-bold text-slate-200">Google</div>
              <div class="text-[7px] text-slate-500">アカウントを選択</div>
            </div>
          </div>
        </div>

        <div class="flex justify-center"><span class="material-symbols-outlined py-1 text-base text-sky-500">south</span></div>

        <div class="grid grid-cols-2 gap-2">
          <div class="rounded-xl border border-sky-500/30 bg-sky-500/10 p-2.5 text-center">
            <span class="material-symbols-outlined text-xl text-sky-300">cloud_upload</span>
            <div class="mt-1 text-[9px] font-black text-sky-100">クラウドへ保存</div>
            <div class="mt-0.5 text-[7px] text-sky-400">この端末 → クラウド</div>
          </div>
          <div class="rounded-xl border border-violet-500/30 bg-violet-500/10 p-2.5 text-center">
            <span class="material-symbols-outlined text-xl text-violet-300">cloud_download</span>
            <div class="mt-1 text-[9px] font-black text-violet-100">クラウドから復元</div>
            <div class="mt-0.5 text-[7px] text-violet-400">クラウド → この端末</div>
          </div>
        </div>
      </div>

      <div class="mx-3.5 mb-3 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[.07] p-2.5 text-[8px] leading-relaxed text-amber-100/75">
        <span class="material-symbols-outlined text-sm text-amber-300">lightbulb</span>
        <span>サインイン中は1日最初の起動時に自動保存。保存・復元はいつでも手動で実行できます。</span>
      </div>
      <div class="px-3.5 pb-3.5">
        <button data-open-cloud-settings type="button" class="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-sky-300/35 bg-gradient-to-r from-sky-600 to-cyan-600 px-3 py-2 text-[10px] font-black text-white shadow-[0_8px_24px_rgba(8,145,178,.22)] active:scale-[.98]">
          <span class="material-symbols-outlined text-base">settings</span>設定を開いて確認
        </button>
      </div>
    </section>`;
}

function renderMedalRoadGuide() {
  const steps = [
    { number: '1', icon: 'military_tech', title: 'メダルを集める', note: '討伐してランクアップ', tone: 'text-rose-300', border: 'border-rose-400/30 bg-rose-400/10' },
    { number: '2', icon: 'toll', title: 'ポイントが貯まる', note: '所持メダルから自動計算', tone: 'text-amber-300', border: 'border-amber-400/30 bg-amber-400/10' },
    { number: '3', icon: 'redeem', title: '装備を受け取る', note: '光る到達報酬をタップ', tone: 'text-emerald-300', border: 'border-emerald-400/30 bg-emerald-400/10' },
  ];
  return `
    <section class="my-4 overflow-hidden rounded-2xl border border-amber-300/25 bg-gradient-to-br from-amber-950/65 via-slate-950 to-violet-950/60" aria-labelledby="medal-road-guide-title">
      <div class="flex items-start gap-2.5 border-b border-amber-200/10 bg-amber-300/[.06] p-3.5">
        <span class="material-symbols-outlined flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-300/30 bg-amber-300/10 text-xl text-amber-300">route</span>
        <div>
          <p class="text-[8px] font-black tracking-[.16em] text-amber-400">NEW FEATURE</p>
          <h3 id="medal-road-guide-title" class="mt-0.5 text-xs font-black text-white">メダルロードは3ステップ</h3>
          <p class="mt-1 text-[9px] leading-relaxed text-slate-400">ショップの「メダル」タブで、集めた実績に応じて伝説装備を受け取れます。</p>
        </div>
      </div>

      <div class="p-3.5">
        <div class="grid grid-cols-[1fr_14px_1fr_14px_1fr] items-stretch gap-1">
          ${steps.map((step, index) => `
            <div class="flex min-w-0 flex-col items-center rounded-xl border ${step.border} px-1.5 py-2.5 text-center">
              <span class="material-symbols-outlined text-xl ${step.tone}">${step.icon}</span>
              <div class="mt-1 text-[8px] font-black leading-tight text-white"><span class="mr-0.5 ${step.tone}">${step.number}</span>${step.title}</div>
              <div class="mt-1 text-[7px] leading-snug text-slate-500">${step.note}</div>
            </div>
            ${index < steps.length - 1 ? '<span class="material-symbols-outlined self-center text-center text-sm text-amber-500">arrow_forward</span>' : ''}
          `).join('')}
        </div>

        <div class="mt-3 grid grid-cols-3 gap-1.5" aria-label="メダルロードの報酬内訳">
          <div class="rounded-lg border border-fuchsia-400/20 bg-fuchsia-400/[.07] px-2 py-1.5 text-center"><span class="material-symbols-outlined text-base text-fuchsia-300">diamond</span><div class="text-[8px] font-black text-fuchsia-100">アクセサリ</div></div>
          <div class="rounded-lg border border-sky-400/20 bg-sky-400/[.07] px-2 py-1.5 text-center"><span class="material-symbols-outlined text-base text-sky-300">shield</span><div class="text-[8px] font-black text-sky-100">防具</div></div>
          <div class="rounded-lg border border-rose-400/20 bg-rose-400/[.07] px-2 py-1.5 text-center"><span class="material-symbols-outlined text-base text-rose-300">swords</span><div class="text-[8px] font-black text-rose-100">武器</div></div>
        </div>
        <p class="mt-1.5 text-center text-[8px] font-bold text-slate-500">17エリア × 3種類 ＝ 全51個</p>
      </div>

      <div class="mx-3.5 mb-3.5 flex items-start gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[.07] p-2.5 text-[8px] leading-relaxed text-emerald-100/80">
        <span class="material-symbols-outlined text-sm text-emerald-300">verified</span>
        <span><strong class="text-emerald-200">ポイントは通貨ではありません。</strong> 報酬を受け取っても減らず、メダルを育てるほど次の報酬へ近づきます。</span>
      </div>
    </section>`;
}

function renderEntryGuide(guide) {
  if (guide === 'cloud-save') return renderCloudSaveGuide();
  if (guide === 'medal-road') return renderMedalRoadGuide();
  return '';
}

function renderItemCard(item) {
  const isPlaceholder = !item || item === '更新内容は現在整理中です。';
  const category = isPlaceholder ? { ...FALLBACK_CATEGORY, label: '記録準備中', icon: 'edit_note' } : getCategory(item);
  const tone = CATEGORY_TONES[category.tone] || CATEGORY_TONES.slate;
  const type = isPlaceholder ? { label: 'DRAFT', className: 'bg-slate-400/15 text-slate-400' } : getChangeType(item);
  const title = isPlaceholder ? '詳細を確認しています' : getItemTitle(item, category, type);
  const description = isPlaceholder ? '内容が未記入の更新も省略せず、確認中の記録として表示しています。' : item;

  return `
    <article class="grid grid-cols-[42px_1fr] items-center gap-2.5 rounded-xl border border-white/[.08] bg-slate-900/65 p-2.5 shadow-[0_5px_18px_rgba(0,0,0,.12)]">
      <div class="flex h-full min-h-10 items-center justify-center">
        <span class="flex h-10 w-10 items-center justify-center rounded-xl border ${tone.icon}">
          <span class="material-symbols-outlined block text-xl leading-none">${category.icon}</span>
        </span>
      </div>
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="rounded border px-1.5 py-0.5 text-[7px] font-black ${tone.badge}">${category.label}</span>
          <span class="rounded px-1.5 py-0.5 font-mono text-[7px] font-black tracking-wider ${type.className}">${type.label}</span>
        </div>
        <h4 class="mt-1.5 text-[10px] font-black leading-snug text-slate-100">${escapeHtml(title)}</h4>
        <p class="mt-1 text-[9px] leading-[1.65] text-slate-400">${escapeHtml(description)}</p>
      </div>
    </article>`;
}

function renderVersionSection(entry, isLast) {
  const items = Array.isArray(entry.items) && entry.items.length ? entry.items : ['更新内容は現在整理中です。'];
  const version = entry.version ? `v${escapeHtml(entry.version)}` : 'version 未記入';
  return `
    <section class="relative pl-7" aria-label="${version} の変更内容">
      ${isLast ? '' : '<div class="absolute left-[9px] top-5 h-[calc(100%+16px)] w-px bg-gradient-to-b from-violet-500/55 to-slate-800"></div>'}
      <div class="absolute left-0 top-0 flex h-5 w-5 items-center justify-center rounded-full border border-violet-400/50 bg-[#10121f] shadow-[0_0_0_4px_rgba(139,92,246,.07)]">
        <span class="h-1.5 w-1.5 rounded-full bg-violet-300"></span>
      </div>
      <div class="flex items-center gap-2">
        <span class="rounded-lg border border-violet-400/25 bg-violet-400/10 px-2 py-1 font-mono text-[9px] font-black text-violet-200">${version}</span>
        <div class="h-px flex-1 bg-white/[.07]"></div>
        <span class="text-[8px] font-bold text-slate-600">${items.length} changes</span>
      </div>
      ${renderEntryGuide(entry.guide)}
      <div class="mt-2.5 space-y-2">${items.map(renderItemCard).join('')}</div>
    </section>`;
}

function renderDayPage(day, dayIndex) {
  const date = formatDate(day.date);
  const versions = day.entries.map(entry => entry.version ? `v${entry.version}` : '未記入').join(' / ');
  return `
    <div class="mx-auto max-w-lg">
      <div class="mb-3 flex items-end justify-between gap-3">
        <div>
          <div class="flex items-baseline gap-2"><h2 class="text-xl font-black tracking-tight text-white">${escapeHtml(date.full)}</h2><span class="text-[9px] font-bold text-slate-500">${escapeHtml(date.weekday)}</span></div>
          <p class="mt-1 font-mono text-[8px] font-bold text-violet-300/70">${escapeHtml(versions)}</p>
        </div>
        ${dayIndex === 0 ? '<span class="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-1 text-[8px] font-black text-emerald-300">LATEST</span>' : ''}
      </div>
      <div class="mt-4 space-y-4">${day.entries.map((entry, index) => renderVersionSection(entry, index === day.entries.length - 1)).join('')}</div>
      <div class="mt-5 flex items-center justify-center gap-2 text-[8px] font-bold text-slate-600"><span class="h-px w-8 bg-slate-800"></span>この日の記録はここまで<span class="h-px w-8 bg-slate-800"></span></div>
    </div>`;
}

export function compareVersions(left, right) {
  const leftParts = String(left || '').split('.').map(part => Number.parseInt(part, 10) || 0);
  const rightParts = String(right || '').split('.').map(part => Number.parseInt(part, 10) || 0);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (difference !== 0) return Math.sign(difference);
  }
  return 0;
}

export async function checkForAvailableUpdate() {
  try {
    const response = await fetch(`./version.json?checkedAt=${Date.now()}`, { cache: 'no-store', credentials: 'same-origin' });
    if (!response.ok) throw new Error(`Version check failed: ${response.status}`);
    const manifest = await response.json();
    const latestVersion = String(manifest.version || '');
    return {
      available: Boolean(latestVersion) && compareVersions(latestVersion, APP_VERSION) > 0,
      currentVersion: APP_VERSION,
      latestVersion: latestVersion || APP_VERSION,
    };
  } catch (error) {
    console.warn('[Update] Could not check the latest version.', error);
    return { available: false, currentVersion: APP_VERSION, latestVersion: APP_VERSION };
  }
}

export function showUpdateLogModal() {
  if (document.getElementById('update-log-modal')) return;
  const days = groupEntriesByDate(UPDATE_LOG);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const activeElement = document.activeElement;
  const overlay = document.createElement('div');
  overlay.id = 'update-log-modal';
  overlay.className = 'fixed inset-0 z-[12000] flex items-center justify-center bg-black/85 p-2 backdrop-blur-md sm:p-4';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'update-log-title');
  overlay.innerHTML = `
    <div data-update-panel class="flex h-[92dvh] max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-[22px] border border-white/10 bg-[#0a0c14] shadow-[0_28px_100px_rgba(0,0,0,.8)] sm:h-[86dvh] sm:max-h-[86dvh]">
      <header class="relative overflow-hidden border-b border-white/10 bg-gradient-to-r from-violet-950/80 via-[#101322] to-cyan-950/55 px-4 pb-3 pt-3.5">
        <div class="pointer-events-none absolute -right-8 -top-12 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl"></div>
        <div class="relative flex items-center gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-violet-400/25 bg-violet-400/10 text-violet-300 shadow-[0_0_24px_rgba(139,92,246,.12)]">
            <span class="material-symbols-outlined block text-xl leading-none">rocket_launch</span>
          </span>
          <div class="min-w-0 flex-1">
            <h2 id="update-log-title" class="text-[15px] font-black text-white">アップデート履歴</h2>
            <p class="mt-0.5 text-[8px] text-slate-500">最新 v${APP_VERSION} ・ ${APP_RELEASE_DATE} ・ 全${days.length}日分</p>
          </div>
          <button data-update-close class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[.06] bg-black/10 text-slate-400 active:scale-95 active:bg-white/10 active:text-white" aria-label="更新記録を閉じる"><span class="material-symbols-outlined text-lg">close</span></button>
        </div>
        <nav data-date-nav class="relative mt-3 flex gap-1.5 overflow-x-auto pb-0.5" aria-label="更新日を選ぶ">
          ${days.map((day, index) => {
            const date = formatDate(day.date);
            return `<button data-date-index="${index}" class="shrink-0 rounded-lg border px-2.5 py-1.5 text-[8px] font-black transition active:scale-95" aria-label="${escapeHtml(date.full)}の更新">${escapeHtml(date.short)}</button>`;
          }).join('')}
        </nav>
      </header>
      <main data-update-page class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-5"></main>
      <footer class="sticky bottom-0 z-10 grid shrink-0 grid-cols-[44px_1fr_44px] items-center gap-2 border-t border-white/10 bg-slate-950/95 p-2.5 backdrop-blur-md">
        <button data-page-prev class="flex h-10 w-11 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-900 text-slate-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-25" aria-label="新しい日付へ"><span class="material-symbols-outlined text-lg">arrow_back</span></button>
        <div class="text-center"><div data-page-indicator class="font-mono text-[9px] font-black text-slate-300"></div><div class="mt-0.5 text-[7px] font-bold tracking-wider text-slate-600">SELECT A DATE ABOVE</div></div>
        <button data-page-next class="flex h-10 w-11 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-900 text-slate-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-25" aria-label="古い日付へ"><span class="material-symbols-outlined text-lg">arrow_forward</span></button>
      </footer>
    </div>`;
  document.body.appendChild(overlay);

  const panel = overlay.querySelector('[data-update-panel]');
  const page = overlay.querySelector('[data-update-page]');
  const indicator = overlay.querySelector('[data-page-indicator]');
  const prev = overlay.querySelector('[data-page-prev]');
  const next = overlay.querySelector('[data-page-next]');
  const dateButtons = [...overlay.querySelectorAll('[data-date-index]')];
  let dayIndex = 0;

  const renderPage = () => {
    const day = days[dayIndex];
    if (!day) {
      page.innerHTML = '<p class="py-12 text-center text-xs text-slate-500">更新記録はまだありません</p>';
      indicator.textContent = '0 / 0';
      prev.disabled = true;
      next.disabled = true;
      return;
    }
    page.innerHTML = renderDayPage(day, dayIndex);
    indicator.textContent = `${dayIndex + 1} / ${days.length} DAYS`;
    prev.disabled = dayIndex === 0;
    next.disabled = dayIndex >= days.length - 1;
    dateButtons.forEach((button, index) => {
      const selected = index === dayIndex;
      button.className = `shrink-0 rounded-lg border px-2.5 py-1.5 text-[8px] font-black transition active:scale-95 ${selected ? 'border-violet-400/45 bg-violet-400/15 text-violet-200' : 'border-white/[.07] bg-black/10 text-slate-500'}`;
      button.setAttribute('aria-current', selected ? 'date' : 'false');
      if (selected) button.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
    });
    page.scrollTop = 0;
  };

  const showDay = index => {
    if (index < 0 || index >= days.length || index === dayIndex) return;
    dayIndex = index;
    renderPage();
  };
  prev.addEventListener('click', () => showDay(dayIndex - 1));
  next.addEventListener('click', () => showDay(dayIndex + 1));
  dateButtons.forEach(button => button.addEventListener('click', () => showDay(Number(button.dataset.dateIndex))));
  renderPage();

  overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reducedMotion ? 1 : 160, easing: 'ease-out' });
  panel.animate(
    [{ opacity: 0, transform: 'translateY(14px) scale(.98)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }],
    { duration: reducedMotion ? 1 : 230, easing: 'cubic-bezier(.16,1,.3,1)' }
  );

  let closing = false;
  const close = () => {
    if (closing) return;
    closing = true;
    document.removeEventListener('keydown', onKeyDown);
    const animation = overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reducedMotion ? 1 : 120, easing: 'ease-out' });
    animation.onfinish = () => {
      overlay.remove();
      if (activeElement instanceof HTMLElement && activeElement.isConnected) activeElement.focus();
    };
  };
  const onKeyDown = event => {
    if (event.key === 'Escape') close();
    if (event.key === 'ArrowLeft') showDay(dayIndex - 1);
    if (event.key === 'ArrowRight') showDay(dayIndex + 1);
  };
  page.addEventListener('click', event => {
    if (!event.target.closest('[data-open-cloud-settings]')) return;
    close();
    window.setTimeout(() => document.getElementById('btn-setting')?.click(), reducedMotion ? 10 : 140);
  });
  overlay.querySelectorAll('[data-update-close]').forEach(button => button.addEventListener('click', close));
  overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
  document.addEventListener('keydown', onKeyDown);
  overlay.querySelector('[data-update-close]')?.focus();
}
