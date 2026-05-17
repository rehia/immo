/* =====================================================
   research.js — Carte de suivi des biens en recherche
   ===================================================== */

import { db } from './firebase-config.js';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { PROPERTIES as FALLBACK_HOUSES, FALLBACK_TERRAINS, SITE_NAMES } from './research-data.js';

/* ---- Mode admin (clé hashée côté client) ---- */
const ADMIN_HASH = '62e4f7cc7494b4a7829c51460198b2028b7241828d08ec7ad16f07d3b0fa64fa';

async function hashKey(key) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const rawKey = new URLSearchParams(window.location.search).get('key') || '';
const isAdmin = rawKey ? (await hashKey(rawKey) === ADMIN_HASH) : false;

/* ---- Couleurs par statut ---- */
const STATUS_CONFIG = {
  'to-discuss': { color: '#eab308', label: 'À discuter' },
  'to-visit':   { color: '#2563eb', label: 'À visiter' },
  'planned':    { color: '#ea580c', label: 'Visite planifiée', hasDate: true },
  'visited':    { color: '#16a34a', label: 'Visitée' },
  'abandoned':  { color: '#9ca3af', label: 'Abandonnée' },
};

/* ---- Formate une date ISO (2026-04-25) en JJ/MM ---- */
function formatDate(iso) {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

/* ---- Label de statut enrichi (avec date si applicable) ---- */
function statusLabel(p) {
  const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG['to-visit'];
  if (p.status === 'planned' && p.visitDate) return `Visite le ${formatDate(p.visitDate)}`;
  return cfg.label;
}

/* ---- Type d'entité actif ---- */
let activeEntity = new URLSearchParams(window.location.search).get('view') === 'terrains' ? 'terrains' : 'houses';

function getCollectionName() { return activeEntity === 'terrains' ? 'terrains' : 'properties'; }
function getData()    { return activeEntity === 'terrains' ? TERRAINS : HOUSES; }
function getMarkers() { return activeEntity === 'terrains' ? terrainMarkers : houseMarkers; }

/* ---- Initialisation de la carte ---- */
const map = L.map('research-map', {
  center: [43.670, 3.890],
  zoom: 13,
  minZoom: 11,
  scrollWheelZoom: true,
  zoomControl: false,
  maxBounds: [
    [43.45, 3.55],
    [43.85, 4.15],
  ],
  maxBoundsViscosity: 0.85,
});

L.control.zoom({ position: 'topright' }).addTo(map);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
}).addTo(map);

/* ---- Rétrocompatibilité : normalise urls ---- */
function getUrls(p) {
  if (p.urls && p.urls.length) return p.urls;
  if (p.url) return [{ url: p.url }];
  return [];
}

/* ---- Résout le nom d'un site à partir de son URL ---- */
function resolveSiteName(entry) {
  if (entry.site) return entry.site;
  try {
    const host = new URL(entry.url).hostname.replace(/^www\./, '');
    return SITE_NAMES[host] || host;
  } catch (_) {
    return entry.url;
  }
}

/* ---- Filtre actif ---- */
let activeFilter = 'all';

function isVisible(p) {
  switch (activeFilter) {
    case 'to-visit':     return p.status === 'to-visit';
    case 'visited':      return p.status === 'visited';
    case 'no-abandoned': return p.status !== 'abandoned';
    default:             return true;
  }
}

/* ---- Données (assignées après chargement async) ---- */
let HOUSES   = [];
let TERRAINS = [];
let houseMarkers   = [];
let terrainMarkers = [];

/* ---- Construction du popup maison ---- */
function buildPopup(p, idx, entityType) {
  entityType = entityType || activeEntity;
  const urls     = getUrls(p);
  const photo    = p.image ? `<a href="${p.image}" target="_blank" rel="noopener noreferrer"><img class="rp-photo" src="${p.image}" alt="Photo du bien"></a>` : '';
  const links    = urls.length
    ? `<div class="rp-links">${urls.map(e => `<a class="rp-site-link" href="${e.url}" target="_blank" rel="noopener noreferrer">${resolveSiteName(e)}</a>`).join('<span class="rp-sep"> · </span>')}</div>`
    : '';
  const approxNote = p.approximate ? `<p class="rp-approx">📍 Localisation approximative</p>` : '';
  const cfg        = STATUS_CONFIG[p.status] || STATUS_CONFIG['to-visit'];

  /* Infos spécifiques terrain */
  let terrainInfo = '';
  if (entityType === 'terrains') {
    const parts = [];
    if (p.surface) parts.push(`${p.surface.toLocaleString('fr-FR')} m²`);
    if (p.price)   parts.push(`${p.price.toLocaleString('fr-FR')} €`);
    if (p.surface && p.price) parts.push(`${Math.round(p.price / p.surface).toLocaleString('fr-FR')} €/m²`);
    const info = parts.length ? `<p class="rp-terrain-info">${parts.join(' · ')}</p>` : '';
    const viab = p.viabilise != null
      ? `<p class="rp-viabilise">${p.viabilise ? '✅ Viabilisé' : '❌ Non viabilisé'}</p>`
      : '';
    terrainInfo = info + viab;
  }

  const notesBlock = p.notes
    ? `<details class="rp-notes-details">
         <summary class="rp-notes-summary">Notes</summary>
         <p class="rp-notes-content">${p.notes.replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>
       </details>`
    : '';

  let statusSection;
  if (isAdmin) {
    const buttons = Object.entries(STATUS_CONFIG).map(([key, scfg]) => {
      const active = p.status === key;
      const style  = active
        ? `background:${scfg.color};color:#fff;border-color:${scfg.color}`
        : `border-color:${scfg.color};color:${scfg.color}`;
      return `<button class="rp-status-btn${active ? ' active' : ''}" data-idx="${idx}" data-entity="${entityType}" data-status="${key}" data-has-date="${scfg.hasDate || false}" style="${style}">${scfg.label}</button>`;
    }).join('');
    const datePicker = `
      <div class="rp-date-picker" style="display:none">
        <input type="date" class="rp-date-input" value="${p.visitDate || ''}">
        <div class="rp-date-actions">
          <button type="button" class="rp-date-cancel">Annuler</button>
          <button type="button" class="rp-date-confirm">Confirmer</button>
        </div>
      </div>`;
    statusSection = `<div class="rp-status-bar">${buttons}</div>${datePicker}`;
  } else {
    statusSection = `<span class="rp-status" style="background:${cfg.color}">${statusLabel(p)}</span>`;
  }

  const adminBar = isAdmin
    ? `<div class="rp-admin-bar">
         <button class="rp-edit-btn" data-idx="${idx}" data-entity="${entityType}">✏️ Modifier</button>
         <button class="rp-reloc-btn" data-idx="${idx}" data-entity="${entityType}">📍 Relocaliser</button>
       </div>`
    : '';

  return `
    <div class="research-popup">
      ${photo}
      <p class="rp-label">${p.label || p.address}</p>
      ${p.label && p.address ? `<p class="rp-address"><a class="rp-address-link" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address)}" target="_blank" rel="noopener noreferrer"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${p.address}</a></p>` : ''}
      ${terrainInfo}
      ${approxNote}
      ${notesBlock}
      ${statusSection}
      ${links}
      ${adminBar}
    </div>`;
}

/* ---- Icône approximative maison (pin SVG avec cercle blanc) ---- */
function makeApproxIcon(status) {
  const { color } = STATUS_CONFIG[status] || STATUS_CONFIG['to-visit'];
  const svg = `<svg viewBox="0 0 24 32" width="24" height="32" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 8.836 12 20 12 20S24 20.836 24 12C24 5.373 18.627 0 12 0z"
          fill="${color}" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
    <circle cx="12" cy="12" r="4" fill="white"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    iconSize: [24, 32],
    iconAnchor: [12, 32],
    popupAnchor: [0, -32],
    className: 'approx-marker-icon',
  });
}

/* ---- Icône terrain exact (carré coloré) ---- */
function makeTerrainIcon(status) {
  const { color } = STATUS_CONFIG[status] || STATUS_CONFIG['to-visit'];
  const svg = `<svg viewBox="0 0 18 18" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="16" height="16" rx="2" fill="${color}" stroke="white" stroke-width="2"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -12],
    className: 'terrain-marker-icon',
  });
}

/* ---- Icône terrain approximatif (pin SVG avec carré blanc) ---- */
function makeTerrainApproxIcon(status) {
  const { color } = STATUS_CONFIG[status] || STATUS_CONFIG['to-visit'];
  const svg = `<svg viewBox="0 0 24 32" width="24" height="32" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 8.836 12 20 12 20S24 20.836 24 12C24 5.373 18.627 0 12 0z"
          fill="${color}" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
    <rect x="8" y="8" width="8" height="8" rx="1.5" fill="white"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    iconSize: [24, 32],
    iconAnchor: [12, 32],
    popupAnchor: [0, -32],
    className: 'approx-marker-icon',
  });
}

/* ---- Fabrique un marqueur Leaflet pour un bien ---- */
function buildMarker(p, idx, entityType) {
  const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG['to-visit'];
  let m;
  if (entityType === 'terrains') {
    m = p.approximate
      ? L.marker([p.lat, p.lng], { icon: makeTerrainApproxIcon(p.status) })
      : L.marker([p.lat, p.lng], { icon: makeTerrainIcon(p.status) });
  } else {
    m = p.approximate
      ? L.marker([p.lat, p.lng], { icon: makeApproxIcon(p.status) })
      : L.circleMarker([p.lat, p.lng], {
          radius: 10,
          fillColor: cfg.color,
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.85,
        });
  }
  m.addTo(map).bindPopup(buildPopup(p, idx, entityType), { maxWidth: 280 });
  return m;
}

/* ---- Création initiale de tous les marqueurs ---- */
function createMarkers(entityType) {
  const data    = entityType === 'terrains' ? TERRAINS : HOUSES;
  const markers = entityType === 'terrains' ? terrainMarkers : houseMarkers;

  markers.forEach(m => map.removeLayer(m));
  markers.length = 0;

  data.forEach((p, i) => markers.push(buildMarker(p, i, entityType)));

  /* Les marqueurs du type inactif sont masqués */
  if (entityType !== activeEntity) {
    markers.forEach(m => map.removeLayer(m));
  }
}

/* ---- Met à jour l'icône d'un marqueur terrain après changement de statut ---- */
function updateTerrainMarkerIcon(marker, p, newStatus) {
  if (p.approximate) {
    marker.setIcon(makeTerrainApproxIcon(newStatus));
  } else {
    marker.setIcon(makeTerrainIcon(newStatus));
  }
}

/* ---- Listeners dans le popup (statut + admin) ---- */
function attachPopupListeners(popupEl) {
  if (!popupEl) return;

  const datePickerEl  = popupEl.querySelector('.rp-date-picker');
  const dateInputEl   = popupEl.querySelector('.rp-date-input');
  let pendingStatus   = null;

  popupEl.querySelectorAll('.rp-status-btn').forEach(btn => {
    btn.addEventListener('click', evt => {
      evt.stopPropagation();
      const idx      = parseInt(btn.dataset.idx);
      const status   = btn.dataset.status;
      const hasDate  = btn.dataset.hasDate === 'true';
      const entity   = btn.dataset.entity || activeEntity;

      if (hasDate && datePickerEl) {
        pendingStatus = { status, entity };
        const data = entity === 'terrains' ? TERRAINS : HOUSES;
        dateInputEl.value = data[idx]?.visitDate || '';
        datePickerEl.style.display = '';
      } else {
        if (datePickerEl) datePickerEl.style.display = 'none';
        changeStatus(idx, status, null, entity);
      }
    });
  });

  if (datePickerEl) {
    popupEl.querySelector('.rp-date-cancel').addEventListener('click', () => {
      datePickerEl.style.display = 'none';
      pendingStatus = null;
    });

    popupEl.querySelector('.rp-date-confirm').addEventListener('click', () => {
      const statusBtn = popupEl.querySelector('.rp-status-btn[data-status="planned"]');
      const idx = parseInt(statusBtn?.dataset.idx ?? -1);
      if (idx >= 0 && pendingStatus) {
        changeStatus(idx, pendingStatus.status, dateInputEl.value || null, pendingStatus.entity);
      }
      datePickerEl.style.display = 'none';
      pendingStatus = null;
    });
  }

  if (isAdmin) {
    const editBtn = popupEl.querySelector('.rp-edit-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        const entity = editBtn.dataset.entity || activeEntity;
        /* Assure que le bon type est actif avant d'ouvrir la modale */
        if (entity !== activeEntity) switchEntity(entity);
        openModal(parseInt(editBtn.dataset.idx));
      });
    }

    const relocBtn = popupEl.querySelector('.rp-reloc-btn');
    if (relocBtn) {
      relocBtn.addEventListener('click', () => {
        relocatingIdx    = parseInt(relocBtn.dataset.idx);
        relocatingEntity = relocBtn.dataset.entity || activeEntity;
        map.closePopup();
        map.getContainer().classList.add('placement-mode');
        fab.classList.add('placement-active');
        fab.title = 'Cliquer sur la carte pour relocaliser…';
      });
    }
  }
}

map.on('popupopen', e => attachPopupListeners(e.popup.getElement()));

/* ---- Changement de statut depuis le popup ---- */
async function changeStatus(idx, newStatus, visitDate, entityType) {
  entityType = entityType || activeEntity;
  const data    = entityType === 'terrains' ? TERRAINS : HOUSES;
  const markers = entityType === 'terrains' ? terrainMarkers : houseMarkers;

  const p = data[idx];
  if (!p) return;
  if (p.status === newStatus && visitDate === undefined) return;

  const update = { status: newStatus };
  if (newStatus === 'planned') {
    update.visitDate = visitDate || null;
  } else {
    update.visitDate = null;
  }

  const colName = entityType === 'terrains' ? 'terrains' : 'properties';
  if (p._id) {
    try {
      await updateDoc(doc(db, colName, p._id), update);
    } catch (_) { /* mise à jour locale uniquement si Firestore échoue */ }
  }

  Object.assign(p, update);

  const marker = markers[idx];
  const cfg    = STATUS_CONFIG[newStatus] || STATUS_CONFIG['to-visit'];
  if (entityType === 'terrains') {
    updateTerrainMarkerIcon(marker, p, newStatus);
  } else if (p.approximate) {
    marker.setIcon(makeApproxIcon(newStatus));
  } else {
    marker.setStyle({ fillColor: cfg.color });
  }

  marker.setPopupContent(buildPopup(p, idx, entityType));
  if (marker.isPopupOpen()) {
    attachPopupListeners(marker.getPopup().getElement());
  }

  applyFilter(activeFilter);
}

/* ---- Légende ---- */
const legend = L.control({ position: 'bottomright' });

legend.onAdd = function () {
  const div = L.DomUtil.create('div', 'research-legend');
  const statusRows = Object.entries(STATUS_CONFIG).map(([, cfg]) => `
    <div class="rl-row">
      <span class="rl-dot" style="background:${cfg.color}"></span>
      <span class="rl-text">${cfg.label}</span>
    </div>`).join('');

  div.innerHTML = statusRows + `
    <div class="rl-separator"></div>
    <div class="rl-row">
      <svg viewBox="0 0 24 32" width="11" height="15" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 8.836 12 20 12 20S24 20.836 24 12C24 5.373 18.627 0 12 0z"
              fill="#64748b" stroke="white" stroke-width="2"/>
        <circle cx="12" cy="12" r="4" fill="white"/>
      </svg>
      <span class="rl-text">Maison approx.</span>
    </div>
    <div class="rl-row">
      <svg viewBox="0 0 24 32" width="11" height="15" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 8.836 12 20 12 20S24 20.836 24 12C24 5.373 18.627 0 12 0z"
              fill="#64748b" stroke="white" stroke-width="2"/>
        <rect x="8" y="8" width="8" height="8" rx="1.5" fill="white"/>
      </svg>
      <span class="rl-text">Terrain approx.</span>
    </div>
    <div class="rl-row">
      <svg viewBox="0 0 18 18" width="12" height="12" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0">
        <rect x="1" y="1" width="16" height="16" rx="2" fill="#64748b" stroke="white" stroke-width="2"/>
      </svg>
      <span class="rl-text">Terrain localisé</span>
    </div>`;
  return div;
};

legend.addTo(map);

/* ---- Panneau latéral (toggle) ---- */
const panel     = document.getElementById('side-panel');
const toggleBtn = document.getElementById('panel-toggle');
const closeBtn  = document.getElementById('panel-close');
const listEl    = document.getElementById('property-list');

function extractCity(address) {
  const m = address && address.match(/([^,]+?)\s*\(\d{5}\)\s*$/);
  return m ? m[1].trim() : address || '';
}

function renderList() {
  const data = getData();
  if (!data || data.length === 0) {
    const label = activeEntity === 'terrains' ? 'terrain' : 'bien';
    listEl.innerHTML = `<p class="pl-empty">Aucun ${label} enregistré.</p>`;
    return;
  }
  const visible = data
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => isVisible(p));

  if (visible.length === 0) {
    listEl.innerHTML = '<p class="pl-empty">Aucun élément pour ce filtre.</p>';
    return;
  }

  listEl.innerHTML = visible.map(({ p, i }) => {
    const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG['to-visit'];

    let subInfo = '';
    if (activeEntity === 'terrains') {
      const parts = [];
      if (p.surface) parts.push(`${p.surface.toLocaleString('fr-FR')} m²`);
      if (p.viabilise != null) parts.push(p.viabilise ? '✅ viabilisé' : '❌ non viab.');
      subInfo = parts.join(' · ');
    } else {
      subInfo = extractCity(p.address);
    }

    const firstUrl = (getUrls(p)[0] || {}).url || '#';
    return `
      <div class="pl-item" data-idx="${i}">
        <span class="pl-dot${activeEntity === 'terrains' ? ' pl-dot-square' : ''}" style="background:${cfg.color}"></span>
        <div class="pl-info">
          <p class="pl-name">${p.label || p.address}</p>
          <p class="pl-addr">${subInfo}</p>
          <span class="pl-status">${statusLabel(p)}</span>
        </div>
        <a class="pl-link" href="${firstUrl}" target="_blank" rel="noopener noreferrer" title="Voir l'annonce">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
          </svg>
        </a>
      </div>`;
  }).join('');

  listEl.querySelectorAll('.pl-item').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.closest('.pl-link')) return;
      const p = getData()[el.dataset.idx];
      map.setView([p.lat, p.lng], 15);
      panel.classList.remove('open');
    });
  });
}

function applyFilter(filter) {
  activeFilter = filter;
  /* Maisons */
  HOUSES.forEach((p, i) => {
    if (activeEntity === 'houses' && isVisible(p)) {
      map.addLayer(houseMarkers[i]);
    } else {
      if (houseMarkers[i]) map.removeLayer(houseMarkers[i]);
    }
  });
  /* Terrains */
  TERRAINS.forEach((p, i) => {
    if (activeEntity === 'terrains' && isVisible(p)) {
      map.addLayer(terrainMarkers[i]);
    } else {
      if (terrainMarkers[i]) map.removeLayer(terrainMarkers[i]);
    }
  });
  renderList();
}

toggleBtn.addEventListener('click', () => panel.classList.toggle('open'));
closeBtn.addEventListener('click',  () => panel.classList.remove('open'));

document.querySelectorAll('.filter-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyFilter(btn.dataset.filter);
  });
});

/* ---- Basculement de type d'entité ---- */
function switchEntity(entity) {
  if (entity === activeEntity) return;
  activeEntity = entity;

  map.closePopup();

  /* Mise à jour du toggle UI */
  document.querySelectorAll('.entity-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.entity === entity);
  });

  /* Adapte le titre du panneau toggle */
  const spanEl = document.querySelector('#panel-toggle span');
  if (spanEl) spanEl.textContent = entity === 'terrains' ? 'Terrains' : 'Maisons';

  /* Adapte le FAB */
  if (fab) fab.title = entity === 'terrains' ? 'Ajouter un terrain' : 'Ajouter un bien';

  /* Persistance URL */
  const url = new URL(window.location.href);
  if (entity === 'terrains') {
    url.searchParams.set('view', 'terrains');
  } else {
    url.searchParams.delete('view');
  }
  history.replaceState(null, '', url.toString());

  /* Réinitialise le filtre à "Tous" */
  activeFilter = 'all';
  document.querySelectorAll('.filter-chip').forEach(b => b.classList.toggle('active', b.dataset.filter === 'all'));

  applyFilter('all');
}

document.querySelectorAll('.entity-chip').forEach(btn => {
  btn.addEventListener('click', () => switchEntity(btn.dataset.entity));
});

/* Initialise l'état visuel du toggle selon l'URL */
document.querySelectorAll('.entity-chip').forEach(c => {
  c.classList.toggle('active', c.dataset.entity === activeEntity);
});

/* Initialise le texte du bouton panneau */
(function () {
  const spanEl = document.querySelector('#panel-toggle span');
  if (spanEl && activeEntity === 'terrains') spanEl.textContent = 'Terrains';
})();

/* =====================================================
   ADMIN — Modal CRUD
   ===================================================== */

const modalEl    = document.getElementById('prop-modal');
const modalTitle = document.getElementById('prop-modal-title');
const formEl     = document.getElementById('prop-form');
const urlListEl  = document.getElementById('pf-url-list');
const deleteBtn  = document.getElementById('pf-delete');
const fab        = document.getElementById('admin-fab');

let editingIdx     = null;
let placementMode  = false;
let relocatingIdx    = null;
let relocatingEntity = null;

/* ---- Affiche/cache le champ date selon le statut ---- */
function toggleVisitDateField() {
  const group = document.getElementById('pf-visit-date-group');
  group.style.display = formEl.elements.status.value === 'planned' ? '' : 'none';
}

/* ---- Affiche/cache les champs terrain ---- */
function toggleTerrainFields() {
  const terrainFields = document.getElementById('pf-terrain-fields');
  const addrLabel     = document.getElementById('pf-address-label');
  const isT = activeEntity === 'terrains';
  terrainFields.style.display = isT ? '' : 'none';
  if (addrLabel) {
    addrLabel.innerHTML = isT
      ? 'Commune <span class="pf-req">*</span>'
      : 'Adresse <span class="pf-req">*</span>';
  }
  const addrInput = document.getElementById('pf-address');
  if (addrInput) {
    addrInput.placeholder = isT ? 'ex: Jacou (34830)' : 'Rue, Ville (34xxx)';
  }
  const labelInput = document.getElementById('pf-label');
  if (labelInput) {
    labelInput.placeholder = isT ? 'ex: Terrain 450m²' : 'ex: 5p 145m² 650 000€';
  }
}

/* ---- Ouvre la modale ---- */
function openModal(idx = null, latlng = null) {
  editingIdx = idx;
  const isEdit = idx !== null;
  const isTerrain = activeEntity === 'terrains';

  if (isTerrain) {
    modalTitle.textContent = isEdit ? 'Modifier le terrain' : 'Ajouter un terrain';
  } else {
    modalTitle.textContent = isEdit ? 'Modifier le bien' : 'Ajouter un bien';
  }
  deleteBtn.hidden = !isEdit;

  formEl.reset();
  urlListEl.innerHTML = '';
  toggleTerrainFields();

  if (isEdit) {
    const p = getData()[idx];
    formEl.elements.label.value         = p.label || '';
    formEl.elements.address.value       = p.address || '';
    formEl.elements.lat.value           = p.lat;
    formEl.elements.lng.value           = p.lng;
    formEl.elements.image.value         = p.image || '';
    formEl.elements.status.value        = p.status || 'to-visit';
    formEl.elements.visitDate.value     = p.visitDate || '';
    formEl.elements.approximate.checked = !!p.approximate;
    formEl.elements.notes.value          = p.notes || '';
    getUrls(p).forEach(e => addUrlInput(e.url));

    if (isTerrain) {
      if (formEl.elements.surface) formEl.elements.surface.value = p.surface || '';
      if (formEl.elements.price)   formEl.elements.price.value   = p.price   || '';
      if (formEl.elements.viabilise) formEl.elements.viabilise.checked = !!p.viabilise;
    }
  } else {
    formEl.elements.status.value = 'to-visit';
    if (isTerrain) formEl.elements.approximate.checked = true;
    if (latlng) {
      formEl.elements.lat.value = latlng.lat.toFixed(7);
      formEl.elements.lng.value = latlng.lng.toFixed(7);
    }
    addUrlInput('');
  }

  toggleVisitDateField();
  modalEl.hidden = false;
  formEl.elements.label.focus();
}

/* ---- Ferme la modale ---- */
function closeModal() {
  modalEl.hidden = true;
  editingIdx = null;
}

/* ---- Ajoute un champ URL ---- */
function addUrlInput(value = '') {
  const row = document.createElement('div');
  row.className = 'pf-url-row';
  const input = document.createElement('input');
  input.className = 'pf-input pf-url-input';
  input.type = 'text';
  input.placeholder = 'https://…';
  input.value = value;
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'pf-url-remove';
  removeBtn.setAttribute('aria-label', 'Supprimer');
  removeBtn.textContent = '×';
  removeBtn.addEventListener('click', () => row.remove());
  row.appendChild(input);
  row.appendChild(removeBtn);
  urlListEl.appendChild(row);
}

/* ---- Collecte les URLs du formulaire ---- */
function collectUrls() {
  return Array.from(urlListEl.querySelectorAll('.pf-url-input'))
    .map(i => i.value.trim())
    .filter(Boolean)
    .map(url => ({ url }));
}

/* ---- Listeners modale ---- */
document.getElementById('pf-add-url').addEventListener('click', () => addUrlInput(''));
document.getElementById('pf-cancel').addEventListener('click', closeModal);
document.getElementById('prop-modal-overlay').addEventListener('click', closeModal);
document.getElementById('prop-modal-close').addEventListener('click', closeModal);
formEl.elements.status.addEventListener('change', toggleVisitDateField);

/* ---- Enregistrement ---- */
formEl.addEventListener('submit', async e => {
  e.preventDefault();
  const els = formEl.elements;
  const lat = parseFloat(els.lat.value);
  const lng = parseFloat(els.lng.value);
  if (!els.label.value.trim() || !els.address.value.trim() || isNaN(lat) || isNaN(lng)) return;

  const isTerrain = activeEntity === 'terrains';
  const colName   = getCollectionName();
  const data      = getData();
  const markers   = getMarkers();

  const payload = {
    label:   els.label.value.trim(),
    address: els.address.value.trim(),
    lat,
    lng,
    status:  els.status.value,
    urls:    collectUrls(),
  };
  payload.notes = els.notes.value.trim();
  if (els.image.value.trim())    payload.image       = els.image.value.trim();
  payload.approximate = !!els.approximate.checked;
  if (els.status.value === 'planned' && els.visitDate.value) {
    payload.visitDate = els.visitDate.value;
  } else {
    payload.visitDate = null;
  }

  if (isTerrain) {
    const surf = parseFloat(els.surface?.value);
    const pric = parseFloat(els.price?.value);
    if (!isNaN(surf) && surf > 0) payload.surface = surf;
    if (!isNaN(pric) && pric > 0) payload.price   = pric;
    payload.viabilise = !!els.viabilise?.checked;
  }

  const saveBtn = formEl.querySelector('.pf-btn-save');
  saveBtn.disabled = true;

  try {
    if (editingIdx !== null) {
      /* ---- Édition ---- */
      const p = data[editingIdx];
      if (p._id) {
        await updateDoc(doc(db, colName, p._id), payload);
      }
      const updated = { ...p, ...payload };
      data[editingIdx] = updated;
      map.removeLayer(markers[editingIdx]);
      markers[editingIdx] = buildMarker(updated, editingIdx, activeEntity);
    } else {
      /* ---- Ajout ---- */
      const docRef = await addDoc(collection(db, colName), payload);
      const newP = { ...payload, _id: docRef.id };
      const idx  = data.length;
      data.push(newP);
      markers.push(buildMarker(newP, idx, activeEntity));
    }
    applyFilter(activeFilter);
    closeModal();
  } catch (err) {
    console.error(err);
    alert('Erreur lors de l\'enregistrement : ' + err.message);
  } finally {
    saveBtn.disabled = false;
  }
});

/* ---- Suppression ---- */
deleteBtn.addEventListener('click', async () => {
  if (editingIdx === null) return;
  const label = activeEntity === 'terrains' ? 'terrain' : 'bien';
  if (!confirm(`Supprimer ce ${label} définitivement ?`)) return;

  const colName = getCollectionName();
  const data    = getData();
  const markers = getMarkers();
  const p = data[editingIdx];

  try {
    if (p._id) {
      await deleteDoc(doc(db, colName, p._id));
    }
    map.removeLayer(markers[editingIdx]);
    data.splice(editingIdx, 1);
    markers.splice(editingIdx, 1);
    /* Mettre à jour les popups des éléments suivants (indices décalés) */
    for (let i = editingIdx; i < markers.length; i++) {
      markers[i].setPopupContent(buildPopup(data[i], i, activeEntity));
    }
    closeModal();
    renderList();
  } catch (err) {
    alert('Erreur lors de la suppression : ' + err.message);
  }
});

/* ---- FAB + mode placement ---- */
if (isAdmin) {
  fab.style.display = '';
  fab.title = activeEntity === 'terrains' ? 'Ajouter un terrain' : 'Ajouter un bien';
}

fab.addEventListener('click', () => {
  if (!isAdmin) return;
  placementMode = true;
  map.getContainer().classList.add('placement-mode');
  fab.classList.add('placement-active');
  fab.title = 'Cliquer sur la carte pour placer…';
});

map.on('click', async e => {
  if (relocatingIdx !== null) {
    const idx    = relocatingIdx;
    const entity = relocatingEntity;
    relocatingIdx    = null;
    relocatingEntity = null;
    map.getContainer().classList.remove('placement-mode');
    fab.classList.remove('placement-active');
    fab.title = activeEntity === 'terrains' ? 'Ajouter un terrain' : 'Ajouter un bien';

    const data    = entity === 'terrains' ? TERRAINS : HOUSES;
    const markers = entity === 'terrains' ? terrainMarkers : houseMarkers;
    const colName = entity === 'terrains' ? 'terrains' : 'properties';
    const p = data[idx];
    if (!p) return;

    p.lat = e.latlng.lat;
    p.lng = e.latlng.lng;

    if (p._id) {
      try { await updateDoc(doc(db, colName, p._id), { lat: p.lat, lng: p.lng }); }
      catch (_) {}
    }

    map.removeLayer(markers[idx]);
    markers[idx] = buildMarker(p, idx, entity);
    applyFilter(activeFilter);
    return;
  }

  if (!placementMode) return;
  placementMode = false;
  map.getContainer().classList.remove('placement-mode');
  fab.classList.remove('placement-active');
  fab.title = activeEntity === 'terrains' ? 'Ajouter un terrain' : 'Ajouter un bien';
  openModal(null, e.latlng);
});

/* ---- Chargement des données (Firestore → fallback JS) ---- */
async function loadCollection(colName, fallback) {
  try {
    const snap = await Promise.race([
      getDocs(collection(db, colName)),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
    ]);
    const fetched = [];
    snap.forEach(d => fetched.push({ ...d.data(), _id: d.id }));
    return fetched.length > 0 ? fetched : fallback;
  } catch (_) {
    return fallback;
  }
}

async function init() {
  listEl.innerHTML = '<p class="pl-empty">Chargement…</p>';

  const [houses, terrains] = await Promise.all([
    loadCollection('properties', FALLBACK_HOUSES),
    loadCollection('terrains',   FALLBACK_TERRAINS),
  ]);

  HOUSES   = houses;
  TERRAINS = terrains;

  createMarkers('houses');
  createMarkers('terrains');
  applyFilter('all');
}

init();
