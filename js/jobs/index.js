import { norvice } from './norvice.js';
import { knight } from './knight.js';
import { mage } from './mage.js';
import { priest } from './priest.js';
import { ranger } from './ranger.js';
import { magic_knight } from './magic_knight.js';
import { slime_master } from './slime_master.js';
import { dancer } from './dancer.js';
import { bird } from './bird.js';

export const JOB_STAT_GROWTH = {
  [norvice.id]:      { hp: [1, 2], mp: [0, 1], atk: [0, 1], def: [0, 1], matk: [0, 1], mdef: [0, 1], spd: [0, 1] },
  [knight.id]:       { hp: [2, 4], mp: [0, 1], atk: [0, 2], def: [1, 2], matk: [0, 0], mdef: [0, 2], spd: [0, 1] },
  [mage.id]:         { hp: [1, 2], mp: [2, 4], atk: [0, 0], def: [0, 1], matk: [2, 4], mdef: [1, 3], spd: [0, 1] },
  [priest.id]:       { hp: [1, 2], mp: [3, 5], atk: [0, 0], def: [0, 1], matk: [1, 2], mdef: [2, 4], spd: [0, 1] },
  [ranger.id]:       { hp: [1, 3], mp: [1, 2], atk: [1, 3], def: [1, 2], matk: [0, 1], mdef: [1, 2], spd: [1, 3] },
  [magic_knight.id]: { hp: [2, 3], mp: [1, 3], atk: [1, 2], def: [1, 2], matk: [1, 2], mdef: [1, 2], spd: [0, 1] },
  [slime_master.id]: { hp: [2, 4], mp: [2, 4], atk: [1, 2], def: [1, 2], matk: [1, 3], mdef: [1, 3], spd: [1, 2] },
  [dancer.id]:       { hp: [1, 2], mp: [1, 3], atk: [1, 2], def: [0, 1], matk: [1, 2], mdef: [1, 2], spd: [2, 4] },
  [bird.id]:         { hp: [1, 2], mp: [2, 4], atk: [1, 2], def: [0, 2], matk: [0, 2], mdef: [1, 3], spd: [0, 2] }
};

export const JOB_STAT_MULTIPLIER = {
  [norvice.id]:      { hp: 1.0, mp: 1.0, atk: 1.0, def: 1.0, matk: 1.0, mdef: 1.0, spd: 1.0 },
  [knight.id]:       { hp: 2.0, mp: 0.8, atk: 1.1, def: 1.5, matk: 0.1, mdef: 0.4, spd: 0.9 },
  [mage.id]:         { hp: 0.5, mp: 1.6, atk: 0.1, def: 0.8, matk: 2.0, mdef: 1.2, spd: 0.6 },
  [priest.id]:       { hp: 0.7, mp: 1.5, atk: 0.2, def: 0.8, matk: 1.2, mdef: 1.2, spd: 0.9 },
  [ranger.id]:       { hp: 1.0, mp: 1.0, atk: 1.0, def: 0.9, matk: 0.6, mdef: 0.8, spd: 1.3 },
  [magic_knight.id]: { hp: 0.9, mp: 1.3, atk: 1.0, def: 0.8, matk: 1.2, mdef: 0.9, spd: 0.6 },
  [slime_master.id]: { hp: 1.5, mp: 1.8, atk: 0.7, def: 1.3, matk: 0.8, mdef: 1.1, spd: 0.5 },
  [dancer.id]:       { hp: 0.8, mp: 1.3, atk: 1.0, def: 0.7, matk: 1.3, mdef: 0.7, spd: 1.2 },
  [bird.id]:         { hp: 0.8, mp: 1.5, atk: 0.5, def: 1.0, matk: 0.9, mdef: 1.5, spd: 0.8 }
};

export const JOBS = {
  [norvice.id]: { ...norvice, statGrowth: JOB_STAT_GROWTH[norvice.id], statMultiplier: JOB_STAT_MULTIPLIER[norvice.id] },
  [knight.id]: { ...knight, statGrowth: JOB_STAT_GROWTH[knight.id], statMultiplier: JOB_STAT_MULTIPLIER[knight.id] },
  [mage.id]: { ...mage, statGrowth: JOB_STAT_GROWTH[mage.id], statMultiplier: JOB_STAT_MULTIPLIER[mage.id] },
  [priest.id]: { ...priest, statGrowth: JOB_STAT_GROWTH[priest.id], statMultiplier: JOB_STAT_MULTIPLIER[priest.id] },
  [ranger.id]: { ...ranger, statGrowth: JOB_STAT_GROWTH[ranger.id], statMultiplier: JOB_STAT_MULTIPLIER[ranger.id] },
  [magic_knight.id]: { ...magic_knight, statGrowth: JOB_STAT_GROWTH[magic_knight.id], statMultiplier: JOB_STAT_MULTIPLIER[magic_knight.id] },
  [slime_master.id]: { ...slime_master, statGrowth: JOB_STAT_GROWTH[slime_master.id], statMultiplier: JOB_STAT_MULTIPLIER[slime_master.id] },
  [dancer.id]: { ...dancer, statGrowth: JOB_STAT_GROWTH[dancer.id], statMultiplier: JOB_STAT_MULTIPLIER[dancer.id] },
  [bird.id]: { ...bird, statGrowth: JOB_STAT_GROWTH[bird.id], statMultiplier: JOB_STAT_MULTIPLIER[bird.id] }
};
