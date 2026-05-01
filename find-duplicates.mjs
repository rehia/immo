#!/usr/bin/env node
/**
 * find-duplicates.mjs — Détecte les doublons dans la collection `properties` Firestore
 *
 * Critères de détection (un seul suffit) :
 *   1. Même URL dans les tableaux `urls`
 *   2. Coordonnées GPS à moins de DISTANCE_M mètres
 *   3. Adresse identique (insensible à la casse/espaces)
 *
 * Usage : node find-duplicates.mjs
 */

const PROJECT    = 'immo-rehia';
const API_KEY    = 'AIzaSyCw8905RnfKhDB04Tr6k3uw2Ucer5x3D0E';
const BASE       = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const DISTANCE_M = 100; // seuil GPS en mètres

/* ── Helpers ──────────────────────────────────────────────────── */

function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6_371_000;
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function normalizeAddr(s) {
  return (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/* Convertit un document Firestore REST en objet JS simple */
function fromFirestore(doc) {
  const f = doc.fields || {};
  const get = (field) => {
    const v = f[field];
    if (!v) return undefined;
    if (v.stringValue  !== undefined) return v.stringValue;
    if (v.doubleValue  !== undefined) return v.doubleValue;
    if (v.integerValue !== undefined) return Number(v.integerValue);
    if (v.booleanValue !== undefined) return v.booleanValue;
    if (v.arrayValue) {
      return (v.arrayValue.values || []).map(item => {
        if (item.stringValue !== undefined) return item.stringValue;
        if (item.mapValue) {
          const out = {};
          for (const [k, val] of Object.entries(item.mapValue.fields || {})) {
            out[k] = val.stringValue ?? val.doubleValue ?? val.integerValue ?? val.booleanValue;
          }
          return out;
        }
        return item;
      });
    }
    return undefined;
  };

  return {
    id:      doc.name.split('/').pop(),
    address: get('address'),
    lat:     get('lat'),
    lng:     get('lng'),
    label:   get('label'),
    status:  get('status'),
    urls:    get('urls') || [],
  };
}

/* ── Fetch all properties ─────────────────────────────────────── */

async function fetchProperties() {
  const res  = await fetch(`${BASE}/properties?pageSize=200&key=${API_KEY}`);
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return (data.documents || []).map(fromFirestore);
}

/* ── Duplicate detection ──────────────────────────────────────── */

function findDuplicates(props) {
  const groups = []; // [{reason, ids: [id, id, ...]}]

  // Paires déjà signalées (évite les doublons de doublons)
  const reported = new Set();
  const pairKey  = (a, b) => [a, b].sort().join('|');

  for (let i = 0; i < props.length; i++) {
    for (let j = i + 1; j < props.length; j++) {
      const a = props[i], b = props[j];
      const key = pairKey(a.id, b.id);
      if (reported.has(key)) continue;

      const reasons = [];

      // 1. URL commune
      const urlsA = a.urls.map(u => (u.url || u).toLowerCase());
      const urlsB = b.urls.map(u => (u.url || u).toLowerCase());
      const sharedUrl = urlsA.find(u => urlsB.includes(u));
      if (sharedUrl) reasons.push(`URL identique : ${sharedUrl}`);

      // 2. GPS proche
      if (a.lat && a.lng && b.lat && b.lng) {
        const dist = haversineM(a.lat, a.lng, b.lat, b.lng);
        if (dist < DISTANCE_M) reasons.push(`GPS à ${Math.round(dist)} m`);
      }

      // 3. Adresse identique
      if (a.address && b.address && normalizeAddr(a.address) === normalizeAddr(b.address)) {
        reasons.push('Adresse identique');
      }

      if (reasons.length > 0) {
        reported.add(key);
        groups.push({ reasons, a, b });
      }
    }
  }

  return groups;
}

/* ── Main ─────────────────────────────────────────────────────── */

async function run() {
  console.log('Lecture de Firestore…\n');
  const props = await fetchProperties();
  console.log(`${props.length} bien(s) trouvé(s).\n`);

  const dupes = findDuplicates(props);

  if (dupes.length === 0) {
    console.log('✅ Aucun doublon détecté.');
    return;
  }

  console.log(`⚠️  ${dupes.length} doublon(s) détecté(s) :\n`);
  console.log('─'.repeat(60));

  for (const { reasons, a, b } of dupes) {
    console.log(`\n🔁 DOUBLON (${reasons.join(' + ')})`);
    console.log(`   A [${a.id}] ${a.label || '—'}`);
    console.log(`      adresse : ${a.address || '—'}`);
    console.log(`      statut  : ${a.status || '—'}`);
    console.log(`      urls    : ${a.urls.map(u => u.url || u).join(', ') || '—'}`);
    console.log(`   B [${b.id}] ${b.label || '—'}`);
    console.log(`      adresse : ${b.address || '—'}`);
    console.log(`      statut  : ${b.status || '—'}`);
    console.log(`      urls    : ${b.urls.map(u => u.url || u).join(', ') || '—'}`);
  }

  console.log('\n' + '─'.repeat(60));
  console.log('\nPour supprimer un doublon dans Firebase Console :');
  console.log('  Firestore → properties → <id> → ⋮ → Supprimer le document');
}

run().catch(err => { console.error('❌', err.message); process.exit(1); });
