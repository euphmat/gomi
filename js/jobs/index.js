import { norvice } from './norvice.js';
import { knight } from './knight.js';
import { mage } from './mage.js';
import { priest } from './priest.js';
import { ranger } from './ranger.js';
import { magic_knight } from './magic_knight.js';
import { slime_master } from './slime_master.js';
import { dancer } from './dancer.js';
import { bird } from './bird.js';
import { black_knight } from './black_knight.js';
import { paladin } from './paladin.js';
import { poseidon } from './poseidon.js';
import { pyromancer } from './pyromancer.js';
import { assassin } from './assassin.js';

export const JOB_STAT_GROWTH = {
  // HP/MP are weighted at 25% when budgeting growth because equipment grants
  // them in much larger amounts. Standard jobs target 7.5-8.25 weighted
  // points (novice is intentionally lower), and advanced jobs 7.875-8.625.
  // This prevents one job from being the obvious choice for permanent
  // base-stat farming while retaining distinct roles.
  [norvice.id]:      { hp: [1, 3], mp: [1, 3], atk: [0, 2], def: [0, 2], matk: [0, 2], mdef: [0, 2], spd: [1, 1] },
  [knight.id]:       { hp: [2, 4], mp: [0, 2], atk: [1, 2], def: [2, 3], matk: [0, 1], mdef: [0, 2], spd: [1, 1] },
  [mage.id]:         { hp: [1, 3], mp: [3, 4], atk: [0, 1], def: [0, 2], matk: [2, 3], mdef: [1, 2], spd: [1, 1] },
  [priest.id]:       { hp: [1, 3], mp: [3, 4], atk: [0, 1], def: [0, 2], matk: [1, 2], mdef: [2, 3], spd: [1, 1] },
  [ranger.id]:       { hp: [1, 3], mp: [1, 3], atk: [1, 3], def: [1, 2], matk: [0, 1], mdef: [0, 2], spd: [1, 2] },
  [magic_knight.id]: { hp: [2, 3], mp: [1, 3], atk: [1, 2], def: [1, 2], matk: [1, 2], mdef: [1, 2], spd: [1, 1] },
  [slime_master.id]: { hp: [2, 4], mp: [2, 4], atk: [1, 2], def: [1, 2], matk: [1, 2], mdef: [1, 2], spd: [0, 1] },
  [dancer.id]:       { hp: [1, 3], mp: [2, 3], atk: [0, 2], def: [0, 2], matk: [1, 2], mdef: [1, 2], spd: [1, 3] },
  [bird.id]:         { hp: [1, 3], mp: [2, 4], atk: [0, 2], def: [1, 2], matk: [1, 2], mdef: [1, 3], spd: [1, 1] },
  [black_knight.id]: { hp: [3, 5], mp: [1, 2], atk: [2, 3], def: [1, 3], matk: [0, 1], mdef: [0, 2], spd: [1, 1] },
  [paladin.id]:      { hp: [3, 4], mp: [2, 3], atk: [0, 2], def: [1, 3], matk: [0, 2], mdef: [2, 3], spd: [0, 1] },
  [poseidon.id]:     { hp: [2, 4], mp: [3, 4], atk: [0, 1], def: [1, 2], matk: [2, 3], mdef: [1, 3], spd: [0, 1] },
  [pyromancer.id]:   { hp: [1, 3], mp: [3, 5], atk: [0, 0], def: [0, 1], matk: [3, 4], mdef: [1, 2], spd: [1, 2] },
  [assassin.id]:     { hp: [1, 2], mp: [1, 3], atk: [2, 4], def: [0, 1], matk: [0, 1], mdef: [0, 1], spd: [2, 3] }
};

export const JOB_STAT_MULTIPLIER = {
  // Multipliers express the current job's role. Extreme 0.1-3.0 values made
  // equipment either nearly worthless or overwhelmingly efficient, so every
  // role now keeps a usable floor while specialists retain a clear peak.
  [norvice.id]:      { hp: 0.90, mp: 0.90, atk: 0.90, def: 0.90, matk: 0.90, mdef: 0.90, spd: 0.90 },
  [knight.id]:       { hp: 1.70, mp: 0.80, atk: 1.05, def: 1.60, matk: 0.35, mdef: 0.75, spd: 0.80 },
  [mage.id]:         { hp: 0.75, mp: 1.55, atk: 0.35, def: 0.65, matk: 1.75, mdef: 1.25, spd: 0.85 },
  [priest.id]:       { hp: 0.90, mp: 1.45, atk: 0.50, def: 0.90, matk: 1.15, mdef: 1.40, spd: 0.90 },
  [ranger.id]:       { hp: 1.00, mp: 1.00, atk: 1.10, def: 0.90, matk: 0.60, mdef: 0.85, spd: 1.15 },
  [magic_knight.id]: { hp: 1.05, mp: 1.25, atk: 1.15, def: 1.00, matk: 1.25, mdef: 1.00, spd: 0.90 },
  [slime_master.id]: { hp: 1.35, mp: 1.50, atk: 0.85, def: 1.25, matk: 1.05, mdef: 1.20, spd: 0.75 },
  [dancer.id]:       { hp: 0.90, mp: 1.20, atk: 0.70, def: 0.80, matk: 1.15, mdef: 0.90, spd: 1.20 },
  [bird.id]:         { hp: 0.90, mp: 1.40, atk: 0.65, def: 0.90, matk: 1.05, mdef: 1.35, spd: 1.00 },
  [black_knight.id]: { hp: 2.00, mp: 0.60, atk: 1.45, def: 1.10, matk: 0.90, mdef: 0.65, spd: 0.85 },
  [paladin.id]:      { hp: 1.75, mp: 1.20, atk: 0.90, def: 1.35, matk: 0.90, mdef: 1.50, spd: 0.70 },
  [poseidon.id]:     { hp: 1.20, mp: 1.55, atk: 0.65, def: 1.05, matk: 1.65, mdef: 1.40, spd: 0.80 },
  [pyromancer.id]:   { hp: 0.80, mp: 1.65, atk: 0.30, def: 0.70, matk: 1.85, mdef: 1.00, spd: 0.90 },
  [assassin.id]:     { hp: 0.85, mp: 1.00, atk: 1.50, def: 0.75, matk: 0.45, mdef: 0.75, spd: 1.45 }
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
  [bird.id]: { ...bird, statGrowth: JOB_STAT_GROWTH[bird.id], statMultiplier: JOB_STAT_MULTIPLIER[bird.id] },
  [black_knight.id]: { ...black_knight, statGrowth: JOB_STAT_GROWTH[black_knight.id], statMultiplier: JOB_STAT_MULTIPLIER[black_knight.id] },
  [paladin.id]: { ...paladin, statGrowth: JOB_STAT_GROWTH[paladin.id], statMultiplier: JOB_STAT_MULTIPLIER[paladin.id] },
  [poseidon.id]: { ...poseidon, statGrowth: JOB_STAT_GROWTH[poseidon.id], statMultiplier: JOB_STAT_MULTIPLIER[poseidon.id] },
  [pyromancer.id]: { ...pyromancer, statGrowth: JOB_STAT_GROWTH[pyromancer.id], statMultiplier: JOB_STAT_MULTIPLIER[pyromancer.id] },
  [assassin.id]: { ...assassin, statGrowth: JOB_STAT_GROWTH[assassin.id], statMultiplier: JOB_STAT_MULTIPLIER[assassin.id] }
};
