import assert from 'node:assert/strict';
import { filterEquipmentGroups } from '../js/components/equipment-modal.js';

const groups = [
  {
    baseId: 'ordinary_sword',
    representative: { id: 'ordinary_sword_instance', baseId: 'ordinary_sword' },
  },
  {
    baseId: 'medal_slime_calibur',
    representative: { id: 'medal_slime_calibur_instance', baseId: 'medal_slime_calibur' },
  },
];

assert.equal(filterEquipmentGroups(groups, 'all'), groups, 'すべて表示では元の一覧を維持する');
assert.deepEqual(
  filterEquipmentGroups(groups, 'medal').map(group => group.baseId),
  ['medal_slime_calibur'],
  'メダル表示ではメダル報酬装備だけを残す',
);
assert.equal(filterEquipmentGroups([], 'medal').length, 0, '対象がない場合は空の一覧を返す');

console.log('Equipment modal filter tests passed.');
