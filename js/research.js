/* =====================================================
   research.js — Carte de suivi des biens en recherche
   ===================================================== */

import { db } from './firebase-config.js';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { PROPERTIES as FALLBACK_PROPERTIES, SITE_NAMES } from './research-data.js';

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

/* ---- Initialisation de la carte ---- */
const map = L.map('research-map', {
  center: [43.670, 3.890],
  zoom: 13,
  minZoom: 12,
  scrollWheelZoom: true,
  zoomControl: false,
  maxBounds: [
    [43.58, 3.77],
    [43.76, 4.00],
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
let PROPERTIES = [];
let markers    = [];

/* ---- Construction du popup ---- */
function buildPopup(p, idx) {
  const urls     = getUrls(p);
  const photo    = p.image ? `<a href="${p.image}" target="_blank" rel="noopener noreferrer"><img class="rp-photo" src="${p.image}" alt="Photo du bien"></a>` : '';
  const links    = urls.length
    ? `<div class="rp-links">${urls.map(e => `<a class="rp-site-link" href="${e.url}" target="_blank" rel="noopener noreferrer">${resolveSiteName(e)}</a>`).join('<span class="rp-sep"> · </span>')}</div>`
    : '';
  const approxNote = p.approximate ? `<p class="rp-approx">📍 Localisation approximative</p>` : '';
  const cfg        = STATUS_CONFIG[p.status] || STATUS_CONFIG['to-visit'];

  let statusSection;
  if (isAdmin) {
    const buttons = Object.entries(STATUS_CONFIG).map(([key, scfg]) => {
      const active = p.status === key;
      const style  = active
        ? `background:${scfg.color};color:#fff;border-color:${scfg.color}`
        : `border-color:${scfg.color};color:${scfg.color}`;
      return `<button class="rp-status-btn${active ? ' active' : ''}" data-idx="${idx}" data-status="${key}" data-has-date="${scfg.hasDate || false}" style="${style}">${scfg.label}</button>`;
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
    ? `<div class="rp-admin-bar"><button class="rp-edit-btn" data-idx="${idx}">✏️ Modifier</button></div>`
    : '';

  return `
    <div class="research-popup">
      ${photo}
      <p class="rp-label">${p.label || p.address}</p>
      <p class="rp-address">${p.label ? p.address : ''}</p>
      ${approxNote}
      ${statusSection}
      ${links}
      ${adminBar}
    </div>`;
}

/* ---- Icône approximative (pin SVG coloré selon le statut) ---- */
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

/* ---- Fabrique un marqueur Leaflet pour un bien ---- */
function buildMarker(p, idx) {
  const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG['to-visit'];
  const m = p.approximate
    ? L.marker([p.lat, p.lng], { icon: makeApproxIcon(p.status) })
    : L.circleMarker([p.lat, p.lng], {
        radius: 10,
        fillColor: cfg.color,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85,
      });
  m.addTo(map).bindPopup(buildPopup(p, idx), { maxWidth: 280 });
  return m;
}

/* ---- Création initiale de tous les marqueurs ---- */
function createMarkers() {
  markers.forEach(m => map.removeLayer(m));
  markers = PROPERTIES.map((p, i) => buildMarker(p, i));
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

      if (hasDate && datePickerEl) {
        pendingStatus = status;
        dateInputEl.value = PROPERTIES[idx]?.visitDate || '';
        datePickerEl.style.display = '';
      } else {
        if (datePickerEl) datePickerEl.style.display = 'none';
        changeStatus(idx, status, null);
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
        changeStatus(idx, pendingStatus, dateInputEl.value || null);
      }
      datePickerEl.style.display = 'none';
      pendingStatus = null;
    });
  }

  if (isAdmin) {
    const editBtn = popupEl.querySelector('.rp-edit-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => openModal(parseInt(editBtn.dataset.idx)));
    }
  }
}

map.on('popupopen', e => attachPopupListeners(e.popup.getElement()));

/* ---- Changement de statut depuis le popup ---- */
async function changeStatus(idx, newStatus, visitDate) {
  const p = PROPERTIES[idx];
  if (!p) return;
  if (p.status === newStatus && visitDate === undefined) return;

  const update = { status: newStatus };
  if (newStatus === 'planned') {
    update.visitDate = visitDate || null;
  } else {
    update.visitDate = null;
  }

  if (p._id) {
    try {
      await updateDoc(doc(db, 'properties', p._id), update);
    } catch (_) { /* mise à jour locale uniquement si Firestore échoue */ }
  }

  Object.assign(p, update);

  const marker = markers[idx];
  const cfg    = STATUS_CONFIG[newStatus] || STATUS_CONFIG['to-visit'];
  if (p.approximate) {
    marker.setIcon(makeApproxIcon(newStatus));
  } else {
    marker.setStyle({ fillColor: cfg.color });
  }

  marker.setPopupContent(buildPopup(p, idx));
  if (marker.isPopupOpen()) {
    attachPopupListeners(marker.getPopup().getElement());
  }

  applyFilter(activeFilter);
}

/* ---- Légende ---- */
const legend = L.control({ position: 'bottomright' });

legend.onAdd = function () {
  const div = L.DomUtil.create('div', 'research-legend');
  div.innerHTML = Object.entries(STATUS_CONFIG).map(([, cfg]) => `
    <div class="rl-row">
      <span class="rl-dot" style="background:${cfg.color}"></span>
      <span class="rl-text">${cfg.label}</span>
    </div>`).join('') + `
    <div class="rl-row">
      <svg viewBox="0 0 24 32" width="11" height="15" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 8.836 12 20 12 20S24 20.836 24 12C24 5.373 18.627 0 12 0z"
              fill="#64748b" stroke="white" stroke-width="2"/>
        <circle cx="12" cy="12" r="4" fill="white"/>
      </svg>
      <span class="rl-text">Localisation approximative</span>
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
  return m ? m[1].trim() : '';
}

function renderList() {
  if (!PROPERTIES || PROPERTIES.length === 0) {
    listEl.innerHTML = '<p class="pl-empty">Aucun bien enregistré.</p>';
    return;
  }
  const visible = PROPERTIES
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => isVisible(p));

  if (visible.length === 0) {
    listEl.innerHTML = '<p class="pl-empty">Aucun bien pour ce filtre.</p>';
    return;
  }

  listEl.innerHTML = visible.map(({ p, i }) => {
    const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG['to-visit'];
    return `
      <div class="pl-item" data-idx="${i}">
        <span class="pl-dot" style="background:${cfg.color}"></span>
        <div class="pl-info">
          <p class="pl-name">${p.label || p.address}</p>
          <p class="pl-addr">${extractCity(p.address)}</p>
          <span class="pl-status">${statusLabel(p)}</span>
        </div>
        <a class="pl-link" href="${(getUrls(p)[0] || {}).url || '#'}" target="_blank" rel="noopener noreferrer" title="Voir l'annonce">
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
      const p = PROPERTIES[el.dataset.idx];
      map.setView([p.lat, p.lng], 15);
      panel.classList.remove('open');
    });
  });
}

function applyFilter(filter) {
  activeFilter = filter;
  (PROPERTIES || []).forEach((p, i) => {
    if (isVisible(p)) {
      map.addLayer(markers[i]);
    } else {
      map.removeLayer(markers[i]);
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

/* =====================================================
   ADMIN — Modal CRUD
   ===================================================== */

const modalEl    = document.getElementById('prop-modal');
const modalTitle = document.getElementById('prop-modal-title');
const formEl     = document.getElementById('prop-form');
const urlListEl  = document.getElementById('pf-url-list');
const deleteBtn  = document.getElementById('pf-delete');
const fab        = document.getElementById('admin-fab');

let editingIdx    = null;
let placementMode = false;

/* ---- Affiche/cache le champ date selon le statut ---- */
function toggleVisitDateField() {
  const group = document.getElementById('pf-visit-date-group');
  group.style.display = formEl.elements.status.value === 'planned' ? '' : 'none';
}

/* ---- Ouvre la modale ---- */
function openModal(idx = null, latlng = null) {
  editingIdx = idx;
  const isEdit = idx !== null;
  modalTitle.textContent = isEdit ? 'Modifier le bien' : 'Ajouter un bien';
  deleteBtn.hidden = !isEdit;

  formEl.reset();
  urlListEl.innerHTML = '';

  if (isEdit) {
    const p = PROPERTIES[idx];
    formEl.elements.label.value         = p.label || '';
    formEl.elements.address.value       = p.address || '';
    formEl.elements.lat.value           = p.lat;
    formEl.elements.lng.value           = p.lng;
    formEl.elements.image.value         = p.image || '';
    formEl.elements.status.value        = p.status || 'to-visit';
    formEl.elements.visitDate.value     = p.visitDate || '';
    formEl.elements.approximate.checked = !!p.approximate;
    getUrls(p).forEach(e => addUrlInput(e.url));
  } else {
    formEl.elements.status.value = 'to-visit';
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

  const data = {
    label:   els.label.value.trim(),
    address: els.address.value.trim(),
    lat,
    lng,
    status:  els.status.value,
    urls:    collectUrls(),
  };
  if (els.image.value.trim())  data.image = els.image.value.trim();
  if (els.approximate.checked) data.approximate = true;
  if (els.status.value === 'planned' && els.visitDate.value) {
    data.visitDate = els.visitDate.value;
  } else {
    data.visitDate = null;
  }

  const saveBtn = formEl.querySelector('.pf-btn-save');
  saveBtn.disabled = true;

  try {
    if (editingIdx !== null) {
      /* ---- Édition ---- */
      const p = PROPERTIES[editingIdx];
      if (p._id) {
        await updateDoc(doc(db, 'properties', p._id), data);
      }
      const updated = { ...p, ...data };
      PROPERTIES[editingIdx] = updated;
      map.removeLayer(markers[editingIdx]);
      markers[editingIdx] = buildMarker(updated, editingIdx);
    } else {
      /* ---- Ajout ---- */
      const docRef = await addDoc(collection(db, 'properties'), data);
      const newP = { ...data, _id: docRef.id };
      const idx = PROPERTIES.length;
      PROPERTIES.push(newP);
      markers.push(buildMarker(newP, idx));
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
  if (!confirm('Supprimer ce bien définitivement ?')) return;

  const p = PROPERTIES[editingIdx];
  try {
    if (p._id) {
      await deleteDoc(doc(db, 'properties', p._id));
    }
    map.removeLayer(markers[editingIdx]);
    PROPERTIES.splice(editingIdx, 1);
    markers.splice(editingIdx, 1);
    /* Mettre à jour les popups des biens suivants (indices décalés) */
    for (let i = editingIdx; i < markers.length; i++) {
      markers[i].setPopupContent(buildPopup(PROPERTIES[i], i));
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
}

fab.addEventListener('click', () => {
  if (!isAdmin) return;
  placementMode = true;
  map.getContainer().classList.add('placement-mode');
  fab.classList.add('placement-active');
  fab.title = 'Cliquer sur la carte pour placer le bien…';
});

map.on('click', e => {
  if (!placementMode) return;
  placementMode = false;
  map.getContainer().classList.remove('placement-mode');
  fab.classList.remove('placement-active');
  fab.title = 'Ajouter un bien';
  openModal(null, e.latlng);
});

/* ---- Chargement des données (Firestore → fallback JS) ---- */
async function init() {
  listEl.innerHTML = '<p class="pl-empty">Chargement…</p>';
  try {
    const snap = await Promise.race([
      getDocs(collection(db, 'properties')),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
    ]);
    const fetched = [];
    snap.forEach(d => fetched.push({ ...d.data(), _id: d.id }));
    PROPERTIES = fetched.length > 0 ? fetched : FALLBACK_PROPERTIES;
  } catch (_) {
    PROPERTIES = FALLBACK_PROPERTIES;
  }
  createMarkers();
  renderList();
}

init();
