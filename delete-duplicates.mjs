#!/usr/bin/env node
/**
 * delete-duplicates.mjs — Supprime les documents doublons de la collection `properties`
 * Usage : node delete-duplicates.mjs [--dry-run]
 */

const PROJECT = 'immo-rehia';
const API_KEY = 'AIzaSyCw8905RnfKhDB04Tr6k3uw2Ucer5x3D0E';
const BASE    = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const DRY_RUN = process.argv.includes('--dry-run');

const TO_DELETE = [
  { id: '9asF9PpC2wSLWyla5Quf', note: 'Castelnau — doublon to-visit (on garde abandoned)' },
  { id: '9uBK9VTas1f1R1qZk5O1', note: 'Jacou Coubertin — doublon to-visit (on garde abandoned)' },
  { id: 'N5cA125u5kgz0fqxy9dU', note: 'Teyran Figaret — doublon to-visit (on garde visited)' },
  { id: 'Q85tYIejCdOF9Pg0EzIr', note: 'Le Crès Pagnol — doublon to-visit (on garde abandoned)' },
  { id: 'qU9JHFBfHHoJiKqsXEpG', note: 'Prades-le-Lez — doublon 449k (on garde 429k)' },
  { id: 'cBPmBwPUCkttRkLfD2jV', note: 'Le Crès Commerce — doublon identique' },
  { id: 'pDC7BwFOo38BGA334uvk', note: 'Clapiers — doublon identique' },
  { id: 'fMTc7C50QiCVXJGb3Nam', note: 'Saint-Drézéry — doublon identique' },
];

async function run() {
  console.log(`${DRY_RUN ? '[DRY-RUN] ' : ''}Suppression de ${TO_DELETE.length} documents…\n`);

  for (const { id, note } of TO_DELETE) {
    console.log(`  ⏳ ${id}  (${note})`);
    if (DRY_RUN) { console.log('     → ignoré (dry-run)\n'); continue; }

    const res = await fetch(`${BASE}/properties/${id}?key=${API_KEY}`, { method: 'DELETE' });
    if (res.status === 200 || res.status === 204) {
      console.log('     ✅ supprimé\n');
    } else {
      const body = await res.json().catch(() => ({}));
      console.error(`     ❌ erreur ${res.status} :`, body?.error?.message ?? res.statusText, '\n');
    }
  }

  console.log('Terminé.');
}

run().catch(err => { console.error('❌', err.message); process.exit(1); });
