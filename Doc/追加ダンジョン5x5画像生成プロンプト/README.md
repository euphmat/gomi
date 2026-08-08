# 追加ダンジョン 5x5画像生成プロンプト一覧

各Markdownファイルを1ファイルずつ外部画像生成AIへ渡してください。生成画像は上段左から右へ、行単位で1〜25番の順です。

- 対象画像: 576件
- プロンプト: 24ファイル
- 25件入りバッチ: 18ファイル
- カテゴリ末尾の部分バッチ: 6ファイル
- 全部分バッチの空マス合計: 24個
- モンスター・素材・各装備カテゴリは、生成品質を安定させるため同じグリッド内で混在させていません。

| プロンプト | 画像数 | カテゴリ | 先頭ID | 末尾ID | 空マス |
| --- | --- | --- | --- | --- | --- |
| [5x5_001_monster.md](5x5_001_monster.md) | 25 | MONSTER | `astral_wisp` | `cloud_gargoyle` | 0 |
| [5x5_002_monster.md](5x5_002_monster.md) | 25 | MONSTER | `thunder_warlock` | `maze_stalker` | 0 |
| [5x5_003_monster.md](5x5_003_monster.md) | 22 | MONSTER | `dusk_lantern` | `singularity_origin` | 3 |
| [5x5_004_material.md](5x5_004_material.md) | 25 | MATERIAL | `mat_astral_wisp_stardust` | `mat_cinder_imp_ash_wing` | 0 |
| [5x5_005_material.md](5x5_005_material.md) | 25 | MATERIAL | `mat_cinder_imp_ember_horn` | `mat_ember_wyvern_wing_claw` | 0 |
| [5x5_006_material.md](5x5_006_material.md) | 25 | MATERIAL | `mat_ember_wyvern_wyvern_gland` | `mat_cloud_gargoyle_storm_eye` | 0 |
| [5x5_007_material.md](5x5_007_material.md) | 25 | MATERIAL | `mat_thunder_warlock_thunder_cloth` | `mat_silver_hare_silver_fur` | 0 |
| [5x5_008_material.md](5x5_008_material.md) | 25 | MATERIAL | `mat_silver_hare_moonstone_claw` | `mat_wind_ram_spiral_horn` | 0 |
| [5x5_009_material.md](5x5_009_material.md) | 25 | MATERIAL | `mat_wind_ram_gale_hoof` | `mat_maze_stalker_directionless_eye` | 0 |
| [5x5_010_material.md](5x5_010_material.md) | 25 | MATERIAL | `mat_dusk_lantern_dusk_glass` | `mat_sand_colossus_hourglass_sand` | 0 |
| [5x5_011_material.md](5x5_011_material.md) | 25 | MATERIAL | `mat_sand_colossus_colossus_sandstone` | `mat_void_jellyfish_formula_tentacle` | 0 |
| [5x5_012_material.md](5x5_012_material.md) | 16 | MATERIAL | `mat_void_jellyfish_void_pearl` | `mat_singularity_origin_origin_zero_core` | 9 |
| [5x5_013_weapon.md](5x5_013_weapon.md) | 25 | WEAPON | `astral_wisp_weapon` | `cloud_gargoyle_weapon` | 0 |
| [5x5_014_weapon.md](5x5_014_weapon.md) | 25 | WEAPON | `thunder_warlock_weapon` | `maze_stalker_weapon` | 0 |
| [5x5_015_weapon.md](5x5_015_weapon.md) | 22 | WEAPON | `dusk_lantern_weapon` | `singularity_origin_weapon` | 3 |
| [5x5_016_armor.md](5x5_016_armor.md) | 25 | ARMOR | `astral_wisp_armor` | `cloud_gargoyle_armor` | 0 |
| [5x5_017_armor.md](5x5_017_armor.md) | 25 | ARMOR | `thunder_warlock_armor` | `maze_stalker_armor` | 0 |
| [5x5_018_armor.md](5x5_018_armor.md) | 22 | ARMOR | `dusk_lantern_armor` | `singularity_origin_armor` | 3 |
| [5x5_019_shield.md](5x5_019_shield.md) | 25 | SHIELD | `astral_wisp_shield` | `cloud_gargoyle_shield` | 0 |
| [5x5_020_shield.md](5x5_020_shield.md) | 25 | SHIELD | `thunder_warlock_shield` | `maze_stalker_shield` | 0 |
| [5x5_021_shield.md](5x5_021_shield.md) | 22 | SHIELD | `dusk_lantern_shield` | `singularity_origin_shield` | 3 |
| [5x5_022_accessory.md](5x5_022_accessory.md) | 25 | ACCESSORY | `astral_wisp_accessory` | `cloud_gargoyle_accessory` | 0 |
| [5x5_023_accessory.md](5x5_023_accessory.md) | 25 | ACCESSORY | `thunder_warlock_accessory` | `maze_stalker_accessory` | 0 |
| [5x5_024_accessory.md](5x5_024_accessory.md) | 22 | ACCESSORY | `dusk_lantern_accessory` | `singularity_origin_accessory` | 3 |

## 切り出し時の注意

- 生成画像を5等分×5等分し、各ファイル内の `SAVE_PATH` に対応させてください。
- IDや名称は生成画像内に描画させず、切り出したファイル名としてのみ使用してください。
- 各カテゴリ末尾バッチの空マスは破棄してください。
