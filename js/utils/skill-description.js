const escapeHtml = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const HIGHLIGHT_TOKEN_PATTERN = new RegExp([
  '[+\-\u2212]?\\d+(?:[,.]\\d+)*(?:\\.\\d+)?(?:\\s*(?:%|％|倍|回(?!復)|体|個|ターン|連撃))?',
  '【現職時】|【継承時】',
  '最大HP|最大MP|MATK|MDEF|ATK|DEF|SPD|HP|MP|ATB|魔法攻撃力|魔法防御力|物理攻撃力|物理防御力|攻撃力|防御力|スピード|行動ゲージ',
  '無属性|炎属性|火属性|水属性|氷属性|雷属性|風属性|土属性|草属性|光属性|闇属性',
  '状態異常耐性|状態異常|毒|火傷|麻痺|凍結|睡眠|暗闇|沈黙|呪い|混乱|即死',
  '物理攻撃|魔法攻撃|複合攻撃|回復|蘇生|バリア|軽減|無効化|反撃|追撃|吸収|挑発|庇う|解除|上昇|低下|アップ|ダウン'
].join('|'), 'g');

const TOKEN_THEMES = [
  {
    matches: token => /^[+\-\u2212]?\d/.test(token),
    className: 'skill-desc-value text-amber-200 bg-amber-950/45 border-amber-500/25',
    icon: null
  },
  {
    matches: token => token.startsWith('【'),
    className: 'text-fuchsia-200 bg-fuchsia-950/45 border-fuchsia-500/25',
    icon: 'workspace_premium'
  },
  {
    matches: token => /^(?:最大HP|最大MP|MATK|MDEF|ATK|DEF|SPD|HP|MP|ATB|魔法攻撃力|魔法防御力|物理攻撃力|物理防御力|攻撃力|防御力|スピード|行動ゲージ)$/.test(token),
    className: 'text-cyan-200 bg-cyan-950/45 border-cyan-500/25',
    icon: 'monitoring'
  },
  {
    matches: token => /属性$/.test(token),
    className: 'text-violet-200 bg-violet-950/45 border-violet-500/25',
    icon: 'flare'
  },
  {
    matches: token => /^(?:状態異常耐性|状態異常|毒|火傷|麻痺|凍結|睡眠|暗闇|沈黙|呪い|混乱|即死)$/.test(token),
    className: 'text-rose-200 bg-rose-950/45 border-rose-500/25',
    icon: 'crisis_alert'
  },
  {
    matches: () => true,
    className: 'text-emerald-200 bg-emerald-950/45 border-emerald-500/25',
    icon: 'auto_awesome'
  }
];

/**
 * スキル説明を、安全な HTML に変換しながら数値と重要語を意味別に強調する。
 */
export function formatSkillDescriptionHtml(description) {
  const source = String(description ?? '');
  if (!source) return '<span class="text-slate-500">説明はありません</span>';

  let html = '';
  let cursor = 0;
  for (const match of source.matchAll(HIGHLIGHT_TOKEN_PATTERN)) {
    html += escapeHtml(source.slice(cursor, match.index));
    const token = match[0];
    const theme = TOKEN_THEMES.find(candidate => candidate.matches(token));
    const iconHtml = theme.icon
      ? `<span class="material-symbols-outlined leading-none" style="font-size: 10px; font-variation-settings: 'FILL' 1" aria-hidden="true">${theme.icon}</span>`
      : '';
    html += `<span class="skill-desc-token inline-flex items-center gap-px rounded border px-0.5 font-bold ${theme.className}">${iconHtml}${escapeHtml(token)}</span>`;
    cursor = match.index + token.length;
  }
  html += escapeHtml(source.slice(cursor));
  return html;
}
