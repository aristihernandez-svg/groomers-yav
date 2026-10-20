// Nightly cleanup for YAV cargo (runs on Google's servers, skycare-yav project).
// A delivered piece shows in Records for 1 month; 90 days after its delivery it is removed for good:
// first its photos (storage, cargo/<id>/), then its record (cargoTracker/<id>).
// Never touched: pieces not delivered (on the list or on standby), pieces reopened, pieces deleted with 🗑
// (those stay hidden in the database). Safety nets: deleted photos are kept 90 days by Google (soft delete),
// and the database has daily backups (14 days) and point-in-time recovery (7 days).
const KEEP_DAYS = 90;
const BUCKET = 'skycare-yav.firebasestorage.app';

// The cleanup itself, given a Firestore db and a storage bucket (kept separate so it can be tested with fakes)
async function cleanDelivered(db, bucket, now, log = console.log) {
  const cutoff = now - KEEP_DAYS * 864e5;
  const isDue = v => !!v && v.done === true && !v.deleted && typeof v.deliveredAt === 'number' && v.deliveredAt < cutoff;
  const snap = await db.collection('cargoTracker').where('done', '==', true).get();
  let removed = 0, photos = 0;
  for (const d of snap.docs) {
    if (!isDue(d.data())) continue;
    // Read it again right before removing: if someone reopened it since, leave it alone
    const fresh = await d.ref.get();
    const v = fresh.exists ? fresh.data() : null;
    if (!isDue(v)) continue;
    const [files] = await bucket.getFiles({ prefix: `cargo/${d.id}/` });
    await Promise.all(files.map(f => f.delete({ ignoreNotFound: true })));
    photos += files.length;
    await d.ref.delete();
    removed++;
    log(`Removed delivered cargo ${d.id} (${v.client || 'no client'} → ${v.destination || '—'}, delivered ${new Date(v.deliveredAt).toISOString().slice(0, 10)}), ${files.length} photo file(s)`);
  }
  log(`cleanDeliveredCargo: ${removed} piece(s) and ${photos} photo file(s) removed; ${snap.size} delivered piece(s) checked`);
  return { removed, photos, checked: snap.size };
}
exports.cleanDelivered = cleanDelivered;

// Only set up the scheduled job when running on Google (not when the test loads this file)
if (!process.env.CARGO_CLEANUP_TEST) {
  const { onSchedule } = require('firebase-functions/v2/scheduler');
  const { logger } = require('firebase-functions');
  const { initializeApp } = require('firebase-admin/app');
  const { getFirestore } = require('firebase-admin/firestore');
  const { getStorage } = require('firebase-admin/storage');
  initializeApp();
  exports.cleanDeliveredCargo = onSchedule({ schedule: 'every day 03:00', timeZone: 'America/Winnipeg', retryCount: 0 },
    () => cleanDelivered(getFirestore(), getStorage().bucket(BUCKET), Date.now(), m => logger.info(m)));
}
