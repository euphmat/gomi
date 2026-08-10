import {
  selectAllOwnedRanchFish,
  setRanchFishSelectionAmount
} from '../js/pages/guild-tabs/ranch.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const selected = new Map();

assert(setRanchFishSelectionAmount(selected, 'carp', 1, 6) === 1,
  'a fish tile did not select one fish');
assert(setRanchFishSelectionAmount(selected, 'carp', 2, 6) === 2 && selected.get('carp') === 2,
  'the same fish type could not select multiple fish');
assert(setRanchFishSelectionAmount(selected, 'carp', 99, 6) === 6,
  'fish selection was not capped at the owned amount');
assert(setRanchFishSelectionAmount(selected, 'carp', 0, 6) === 0 && !selected.has('carp'),
  'decreasing the selection to zero did not deselect the fish');

selectAllOwnedRanchFish(selected, [{ id: 'carp' }, { id: 'trout' }, { id: 'empty' }], {
  carp: 6,
  trout: 3,
  empty: 0
});
assert(selected.size === 2 && selected.get('carp') === 6 && selected.get('trout') === 3,
  'select all did not select every owned fish');

console.log('Ranch fish selection tests passed.');
