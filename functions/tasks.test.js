// Offline test of the one-time task cleanup with a fake database — touches nothing real.
// Run: node functions/tasks.test.js
process.env.CARGO_CLEANUP_TEST = '1';
const assert = require('assert');
const { cleanDoneOneTime } = require('./index.js');
const D = 864e5, NOW = Date.UTC(2026, 9, 25, 8);
const docs = {
  doneOld:     { task: 'Move plywood', frequency: 'none', lastDoneAt: NOW - 3 * D },     // → removed
  doneNoFreq:  { task: 'Old task without frequency', lastDoneAt: NOW - 10 * D },          // → removed (blank = one-time)
  done1Day:    { task: 'Done yesterday', frequency: 'none', lastDoneAt: NOW - 1 * D },   // kept (under 2 days)
  done47h:     { task: 'Done 47 hours ago', frequency: 'none', lastDoneAt: NOW - 47 * 36e5 }, // kept
  notDone:     { task: 'Bring tyres', frequency: 'none', lastDoneAt: null },              // kept
  daily:       { task: 'Daily walkaround', frequency: 'daily', lastDoneAt: NOW - 30 * D }, // kept
  weekly:      { task: 'Weekly vacuum', frequency: 'weekly', lastDoneAt: NOW - 30 * D },  // kept
  monthly:     { task: 'Monthly fridge', frequency: 'monthly', lastDoneAt: NOW - 90 * D }, // kept
  trashed:     { task: 'Deleted with trash', frequency: 'none', deleted: true, lastDoneAt: NOW - 30 * D }, // kept (left alone)
  madeWeekly:  { task: 'Changed to weekly meanwhile', frequency: 'none', lastDoneAt: NOW - 5 * D }, // changed between list and removal → kept
};
const deleted = [];
const ref = id => ({
  get: async () => { if (id === 'madeWeekly') docs.madeWeekly = { ...docs.madeWeekly, frequency: 'weekly' }; return { exists: !!docs[id], data: () => docs[id] }; },
  delete: async () => { deleted.push(id); delete docs[id]; },
});
const db = { collection: () => ({ get: async () => {
  const hits = Object.entries(docs).map(([id, v]) => ({ id, data: () => ({ ...v }), ref: ref(id) }));
  return { size: hits.length, docs: hits };
} }) };

(async () => {
  const r = await cleanDoneOneTime(db, NOW, () => {});
  assert.deepStrictEqual(deleted.sort(), ['doneNoFreq', 'doneOld'], 'only one-time tasks done more than 2 days ago are removed');
  assert.ok(['done1Day', 'done47h', 'notDone', 'daily', 'weekly', 'monthly', 'trashed', 'madeWeekly'].every(k => docs[k]), 'everything else is kept');
  assert.strictEqual(r.removed, 2); assert.strictEqual(r.checked, 10);
  console.log('PASS — removed:', deleted, '| kept: done 1 day / 47 h ago, not done, daily, weekly, monthly, trashed, changed to weekly');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
