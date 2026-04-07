/* =====================================================
   research.js — Carte de suivi des biens en recherche
   ===================================================== */

/* ---- Couleurs par statut ---- */
const STATUS_CONFIG = {
  'to-visit':  { color: '#2563eb', label: 'À visiter' },
  'visited':   { color: '#16a34a', label: 'Visitée' },
  'abandoned': { color: '#9ca3af', label: 'Abandonnée' },
};

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
    return (typeof SITE_NAMES !== 'undefined' && SITE_NAMES[host]) || host;
  } catch (_) {
    return entry.url;
  }
}

/* ---- Marqueurs ---- */
function buildPopup(p) {
  const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG['to-visit'];
  const urls = getUrls(p);
  const photo = p.image ? `<a href="${p.image}" target="_blank" rel="noopener noreferrer"><img class="rp-photo" src="${p.image}" alt="Photo du bien"></a>` : '';
  const links = urls.length
    ? `<div class="rp-links">${urls.map(e => `<a class="rp-site-link" href="${e.url}" target="_blank" rel="noopener noreferrer">${resolveSiteName(e)}</a>`).join('<span class="rp-sep"> · </span>')}</div>`
    : '';
  const approxNote = p.approximate ? `<p class="rp-approx">📍 Localisation approximative</p>` : '';
  return `
    <div class="research-popup">
      ${photo}
      <p class="rp-label">${p.label || p.address}</p>
      <p class="rp-address">${p.label ? p.address : ''}</p>
      ${approxNote}
      <span class="rp-status" style="background:${cfg.color}">${cfg.label}</span>
      ${links}
    </div>`;
}

const approxIcon = L.icon({
  iconUrl: 'img/marker-approx.svg',
  shadowUrl: 'img/marker-approx-shadow.svg',
  iconSize: [30, 40],
  shadowSize: [40, 20],
  iconAnchor: [15, 40],
  shadowAnchor: [12, 20],
  popupAnchor: [0, -36],
});

(PROPERTIES || []).forEach(p => {
  const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG['to-visit'];

  const marker = p.approximate
    ? L.marker([p.lat, p.lng], { icon: approxIcon })
    : L.circleMarker([p.lat, p.lng], {
        radius: 10,
        fillColor: cfg.color,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85,
      });

  marker.addTo(map).bindPopup(buildPopup(p), { maxWidth: 260 });
});

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
      <img src="img/marker-approx.svg" class="rl-approx-icon" alt="">
      <span class="rl-text">Localisation approximative</span>
    </div>`;
  return div;
};

legend.addTo(map);

/* ---- Panneau latéral (toggle) ---- */
const panel      = document.getElementById('side-panel');
const toggleBtn  = document.getElementById('panel-toggle');
const closeBtn   = document.getElementById('panel-close');
const listEl     = document.getElementById('property-list');

function renderList() {
  if (!PROPERTIES || PROPERTIES.length === 0) {
    listEl.innerHTML = '<p class="pl-empty">Aucun bien enregistré.</p>';
    return;
  }
  listEl.innerHTML = PROPERTIES.map((p, i) => {
    const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG['to-visit'];
    return `
      <div class="pl-item" data-idx="${i}">
        <span class="pl-dot" style="background:${cfg.color}"></span>
        <div class="pl-info">
          <p class="pl-name">${p.label || p.address}</p>
          <p class="pl-addr">${p.label ? p.address : ''}</p>
          <span class="pl-status">${cfg.label}</span>
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

toggleBtn.addEventListener('click', () => panel.classList.toggle('open'));
closeBtn.addEventListener('click',  () => panel.classList.remove('open'));

renderList();
