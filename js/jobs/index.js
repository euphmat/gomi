import { norvice } from './norvice.js';
import { knight } from './knight.js';
import { mage } from './mage.js';
import { priest } from './priest.js';
import { ranger } from './ranger.js';

export const JOBS = {
  [norvice.id]: norvice,
  [knight.id]: knight,
  [mage.id]: mage,
  [priest.id]: priest,
  [ranger.id]: ranger
};
