// Offline test of the cargo cleanup with a fake database and fake storage — touches nothing real.
// Run: node functions/cleanup.test.js
process.env.CARGO_CLEANUP_TEST = '1';
const assert = require('assert');
const { cleanDelivered } = require('./index.js');
const D = 864e5, NOW = Date.UTC(2027, 0, 10);
const docs = {
  old:       { client: 'Old delivered', done: true, deliveredAt: NOW - 100 * D },      // → removed
  edge89:    { client: 'Delivered 89 days ago', done: true, deliveredAt: NOW - 89 * D }, // kept
  recent:    { client: 'Recent delivered', done: true, deliveredAt: NOW - 5 * D },     // kept
  open:      { client: 'Still on the list', done: false, createdAt: NOW - 200 * D },   // kept
  standby:   { client: 'Standby', done: false, standby: true, createdAt: NOW - 300 * D }, // kept
  trashed:   { client: 'Deleted with trash', done: true, deleted: true, deliveredAt: NOW - 200 * D }, // kept (left alone)
  noDate:    { client: 'Delivered, no date', done: true },                             // kept
  reopened:  { client: 'Reopened meanwhile', done: true, deliveredAt: NOW - 120 * D },  // reopened between query and removal → kept
};
const files = { old: ['label_1.jpg', 'label_1_thumb.jpg'], edge89: ['a.jpg'], open: ['b.jpg'], reopened: ['c.jpg'] };
const deletedDocs = [], deletedFiles = [];
const ref = id => ({
  get: async () => { if (id === 'reopened') docs.reopened = { ...docs.reopened, done: false, deliveredAt: null }; return { exists: !!docs[id], data: () => docs[id] }; },
  delete: async () => { deletedDocs.push(id); delete docs[id]; },
});
const db = { collection: () => ({ where: (f, op, val) => ({ get: async () => {
  const hits = Object.entries(docs).filter(([, v]) => v[f] === val).map(([id, v]) => ({ id, data: () => ({ ...v }), ref: ref(id) }));
  return { size: hits.length, docs: hits };
} }) }) };
const bucket = { getFiles: async ({ prefix }) => { const id = prefix.split('/')[1]; return [(files[id] || []).map(n => ({ delete: async () => deletedFiles.push(prefix + n) }))]; } };

(async () => {
  const r = await cleanDelivered(db, bucket, NOW, () => {});
  assert.deepStrictEqual(deletedDocs, ['old'], 'only the piece delivered 100 days ago is removed');
  assert.deepStrictEqual(deletedFiles.sort(), ['cargo/old/label_1.jpg', 'cargo/old/label_1_thumb.jpg'], 'only its photos are removed');
  assert.ok(docs.edge89 && docs.recent && docs.open && docs.standby && docs.trashed && docs.noDate && docs.reopened, 'everything else is kept');
  assert.strictEqual(r.removed, 1); assert.strictEqual(r.photos, 2);
  console.log('PASS — removed:', deletedDocs, '| photos:', deletedFiles.length, '| kept: 89-day, recent, open, standby, trashed, no-date, reopened');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
