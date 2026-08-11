const unique = (id, name, icon, activation, description, sourceSkills, options = {}) => Object.freeze({
  id, name, icon, activation, description,
  sourceSkills: Object.freeze(sourceSkills),
  mode: options.mode || 'automatic',
  unlockSkillId: options.unlockSkillId || null
});

/**
 * Read-only job identity skills. They are deliberately separate from `job.skills`:
 * they cost no SP, cannot be inherited, and do not affect mastery/limit breaks.
 */
export const JOB_GAUGE_UNIQUE_SKILLS = Object.freeze({
  norvice: Object.freeze([unique('novice_inspiration', 'ひらめき', 'lightbulb', '経験MAX時に強撃またはなぎ払い', '経験を全て消費し、対応する攻撃の威力を1.5倍にする。', ['強撃', 'なぎ払い'])]),
  knight: Object.freeze([unique('resolve_bash', '決意の盾撃', 'shield', 'シールドアタック時', '防衛意志を全消費し、1つごとに威力を10%上昇させる。', ['シールドアタック'])]),
  mage: Object.freeze([unique('elemental_chain', '元素連環', 'brightness_7', '異なる属性を3回連携後', '次の火・氷・雷属性魔法の威力を35%上昇させる。', ['火・氷・雷属性魔法'])]),
  priest: Object.freeze([unique('prayer_miracle', '奇跡の祈り', 'flare', '信仰50以上でオールヒール', '信仰50を消費し、消費MPの半分を還元する。', ['オールヒール'])]),
  ranger: Object.freeze([unique('perfect_aim', '完全照準', 'my_location', '照準MAX時に五月雨矢', '照準を全消費し、五月雨矢の威力を1.5倍にする。', ['五月雨矢'])]),
  magic_knight: Object.freeze([unique('spellblade_sync', '魔刃同調', 'swords', '異なる属性剣で同調MAX', '同調を全消費し、次の属性剣の威力を1.5倍にする。', ['フレイムタン', 'アイスブランド', 'サンダースラッシュ'])]),
  slime_master: Object.freeze([unique('giant_slime', '巨大スライム化', 'water_drop', 'スライムハザード時', '質量を全消費し、10ごとに威力を5%上昇させる。', ['スライムハザード'])]),
  dancer: Object.freeze([unique('dance_finale', 'フィナーレ', 'celebration', '異なる舞でステップMAX', '次の舞でステップを全消費し、威力を1.4倍にする。', ['全舞踏スキル'])]),
  bird: Object.freeze([unique('dream_reverberation', '夢幻残響', 'queue_music', '旋律3以上でナイトメア', '旋律を全消費し、1音ごとにナイトメアの威力を6%上昇させる。', ['ナイトメア'])]),
  black_knight: Object.freeze([unique('blood_release', '渇血解放', 'bloodtype', '渇血が規定値以上', '渇血を全消費し、ブラッドセイバーまたはヘルゲートを強化する。', ['ブラッドセイバー', 'ヘルゲート'])]),
  paladin: Object.freeze([unique('holy_seal_release', '聖印解放', 'verified', 'ホーリースマイト時', '聖印を全消費し、1つごとに威力を15%上昇させる。', ['ホーリースマイト'])]),
  poseidon: Object.freeze([unique('high_tide_release', '満潮解放', 'waves', '潮位2以上で大技', '潮位を全消費し、1段階ごとに威力を15%上昇させる。', ['タイダルウェイブ', 'リヴァイアサン・ジャッジメント'])]),
  pyromancer: Object.freeze([unique('furnace_release', '炉心解放', 'mode_heat', 'メテオカタストロフ時', '炉心温度を全消費し、温度に応じて威力を上昇させる。', ['メテオカタストロフ'])]),
  assassin: Object.freeze([unique('execution_aim', '処刑照準', 'gps_fixed', '殺意を蓄積してアサシネイト', '殺意を全消費し、1つごとに威力を12%上昇させる。', ['アサシネイト'])]),
  guardian: Object.freeze([unique('fortress_break', '城壁崩撃', 'fort', 'イージスバッシュ時', '城壁を全消費し、1層ごとに威力を12%上昇させる。', ['イージスバッシュ'])]),
  cryomancer: Object.freeze([unique('crystal_shatter', '氷晶粉砕', 'diamond', 'アブソリュートゼロ時', '氷晶を全消費し、1つごとに威力を8%上昇させる。', ['アブソリュートゼロ'])]),
  magic_archer: Object.freeze([unique('mana_arrow_volley', '魔矢斉射', 'arrow_right_alt', '魔矢を蓄積して大技', '魔矢を全消費し、1本ごとに威力を8%上昇させる。', ['マナバラージ', 'アストラルレイン'])]),
  gunner: Object.freeze([
    unique('tactical_reload_unique', 'タクティカルリロード', 'refresh', '任意のタイミングでコマンド使用', '弾倉を6発まで補充し、次の射撃スキルを強化する。', ['タクティカルリロード'], { mode: 'command', unlockSkillId: 'reload' }),
    unique('full_burst', 'フルバースト', 'blur_on', '6発装填時にバレットストーム', '弾倉を全て消費し、全弾を一斉放出する。', ['バレットストーム'])
  ]),
  plague_doctor: Object.freeze([unique('pathogen_release', '病原解放', 'biotech', '培養を蓄積して大技', '培養を消費し、パンデミックまたは黒死病を強化する。', ['パンデミック', '黒死病'])]),
  entertainer: Object.freeze([unique('grand_finale_unique', 'グランド・フィナーレ', 'theater_comedy', '舞台熱を蓄積して発動', '舞台熱を全消費し、数に応じて全体攻撃を強化する。', ['グランド・フィナーレ'])]),
  mana_conductor: Object.freeze([unique('resonance_release_unique', '共鳴解放', 'hub', '共鳴を蓄積して放出技', '共鳴を消費し、回復・単体攻撃・全体攻撃のいずれかへ変換する。', ['レゾナンス・リチャージ', 'アーケイン・クレッシェンド', 'レゾナンス・ストーム'])]),
  slime_singer: Object.freeze([unique('king_chorus_unique', 'キングスライム大合唱', 'music_note', 'ぷるぷる音符を蓄積して発動', '音符を全消費し、数に応じて大合唱を強化する。', ['キングスライム大合唱'])]),
  dragoon: Object.freeze([unique('dragon_spirit_release_unique', '竜気解放', 'air', '竜気を蓄積して天墜竜槍', '竜気を全消費し、1つごとに天墜竜槍を強化する。', ['天墜竜槍'])]),
  shinra_sage: Object.freeze([unique('three_realms_wheel_unique', '三界輪', 'nature', '草・風・土の三印完成時', '三界印を全消費し、3属性連撃と味方全体回復を発動する。', ['三界輪'])]),
  soul_reaper: Object.freeze([unique('last_funeral_unique', '最後の葬列', 'skull', '亡骸5体を蓄積して発動', '亡骸を全消費し、死霊の葬列による大規模攻撃を行う。', ['最後の葬列'])])
});

export function getJobUniqueSkills(jobId) {
  return JOB_GAUGE_UNIQUE_SKILLS[jobId] || [];
}
