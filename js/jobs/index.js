import { norvice } from './norvice.js';
import { knight } from './knight.js';
import { mage } from './mage.js';
import { priest } from './priest.js';
import { ranger } from './ranger.js';
import { magic_knight } from './magic_knight.js';
import { slime_master } from './slime_master.js';
import { dancer } from './dancer.js';

export const JOB_STAT_GROWTH = {
  [norvice.id]: { hp: [1, 2], mp: [0, 1], atk: [0, 1], def: [0, 1], matk: [0, 1], mdef: [0, 1], spd: [0, 1] },
  [knight.id]: { hp: [2, 4], mp: [0, 1], atk: [0, 2], def: [1, 2], matk: [0, 0], mdef: [0, 2], spd: [0, 1] },
  [mage.id]: { hp: [1, 2], mp: [2, 4], atk: [0, 0], def: [0, 1], matk: [2, 4], mdef: [1, 3], spd: [0, 1] },
  [priest.id]: { hp: [1, 2], mp: [3, 5], atk: [0, 0], def: [0, 1], matk: [1, 2], mdef: [2, 4], spd: [0, 1] },
  [ranger.id]: { hp: [1, 3], mp: [1, 2], atk: [1, 3], def: [1, 2], matk: [0, 1], mdef: [1, 2], spd: [1, 3] },
  [magic_knight.id]: { hp: [2, 3], mp: [1, 3], atk: [1, 2], def: [1, 2], matk: [1, 2], mdef: [1, 2], spd: [0, 1] },
  [slime_master.id]: { hp: [2, 4], mp: [2, 4], atk: [1, 2], def: [1, 2], matk: [1, 3], mdef: [1, 3], spd: [1, 2] },
  [dancer.id]: { hp: [1, 2], mp: [1, 3], atk: [1, 2], def: [0, 1], matk: [1, 2], mdef: [1, 2], spd: [2, 4] }
};

export const JOBS = {
  [norvice.id]: { ...norvice, statGrowth: JOB_STAT_GROWTH[norvice.id] },
  [knight.id]: { ...knight, statGrowth: JOB_STAT_GROWTH[knight.id] },
  [mage.id]: { ...mage, statGrowth: JOB_STAT_GROWTH[mage.id] },
  [priest.id]: { ...priest, statGrowth: JOB_STAT_GROWTH[priest.id] },
  [ranger.id]: { ...ranger, statGrowth: JOB_STAT_GROWTH[ranger.id] },
  [magic_knight.id]: { ...magic_knight, statGrowth: JOB_STAT_GROWTH[magic_knight.id] },
  [slime_master.id]: { ...slime_master, statGrowth: JOB_STAT_GROWTH[slime_master.id] },
  [dancer.id]: { ...dancer, statGrowth: JOB_STAT_GROWTH[dancer.id] }
};
