/* =====================================================
   app.js — Annonce immobilière statique
   =====================================================
   CONTENU À REMPLIR (pour l'agent de contenu) :
   Modifier la section CONFIG ci-dessous.
   ===================================================== */

'use strict';

/* ─────────────────────────────────────────────────────
   CONFIGURATION — Modifier cette section uniquement
   ───────────────────────────────────────────────────── */
const CONFIG = {
  /* --- Photos (URLs des photos de la maison) ---
     Remplacer par les vraies photos.
     Format : tableau de strings URL (JPEG, WebP, etc.)
     Pour les photos locales : './img/photo-01.jpg'     */
  photos: [
    './img/1.jpg',
    './img/2.jpg',
    './img/3.jpg',
    './img/4.jpg',
    './img/5.jpg',
    './img/6.jpg',
    './img/7.jpg',
    './img/8.jpg',
    './img/9.jpg',
    './img/10.jpg',
    './img/11.jpg',
    './img/12.jpg',
    './img/13.jpg',
    './img/14.jpg',
    './img/15.jpg',
    './img/16.jpg',
    './img/17.jpg',
    './img/18.jpg',
  ],

  /* --- Titre de la page --- */
  pageTitle: 'Maison 4 pièces — Jacou (34830) — 419\u202f000\u00a0€',

  /* --- Prix (injecté via JS pour éviter le scraping) --- */
  price: '419\u202f000\u00a0€',
  pricePerSqm: '4\u202f681\u00a0€/m²',

  /* --- Contact (encodé en base64 pour éviter le scraping)
     Pour encoder : btoa("votre texte") dans la console du navigateur
     Les valeurs ci-dessous sont des placeholders.
     phoneEncoded = btoa("06 12 34 56 78")
     emailEncoded = btoa("contact@example.com")         */
  phoneEncoded: 'MDYgMTIgMzQgNTYgNzg=',
  emailEncoded: 'Y29udGFjdEBleGFtcGxlLmNvbQ==',
  ownerName: 'Le propriétaire',

  /* --- Description longue --- */
  description: `
    <p class="mb-4">
      Sur les hauteurs de Jacou, dans le quartier recherché de Bel Air, cette maison
      traversante a de quoi séduire&nbsp;: une vue dégagée sur le Pic Saint Loup depuis
      la terrasse, le jardin et la piscine. Double orientation, lumière généreuse
      et un cadre de vie qui donne envie de rester.
    </p>
    <p class="mb-4">
      Au rez-de-chaussée, le salon-séjour traversant de 24&nbsp;m², baigné de lumière,
      communique avec une cuisine semi-ouverte de 12&nbsp;m², entièrement refaite en 2022.
      Depuis la cuisine, on accède directement à la terrasse et au jardin côté nord.
      WC séparé au rez-de-chaussée.
    </p>
    <p class="mb-4">
      À l'étage, trois chambres de 11 à 12&nbsp;m² — dont deux côté nord avec vue
      sur le Pic — et une salle d'eau soignée&nbsp;: douche italienne XXL, double vasque,
      WC indépendant. L'ensemble de la maison a été rénové ces dernières années.
    </p>
    <p>
      Côté extérieurs, la maison se vit des deux côtés. Au nord&nbsp;: terrasse avec
      pergola et barbecue, jardin paysager et piscine semi-enterrée, face au Pic
      Saint Loup. Au sud&nbsp;: cour fermée avec préau et 3 places de parking. En
      contrebas, un garage de 27&nbsp;m² avec accès indépendant. Jacou, commune dynamique
      aux portes de la garrigue, offre tous les commerces à 3 minutes à pied, le
      tramway et les écoles à 5 minutes, et le collège à un quart d'heure de marche.
    </p>
  `,

  /* --- Atouts --- */
  atouts: [
    { icon: '🌄', text: 'Vue dégagée sur le Pic Saint Loup' },
    { icon: '🏊', text: 'Piscine, terrasse et jardin privatifs' },
    { icon: '🅿️', text: '4 stationnements + garage 27 m²' },
    { icon: '✨', text: 'Cuisine neuve (2022) et maison rénovée' },
    { icon: '🚊', text: 'Tram, commerces et écoles à 5 min à pied' },
  ],

  /* --- Caractéristiques --- */
  characteristics: [
    { icon: '🏠', label: 'Type de bien',               value: 'Maison mitoyenne traversante' },
    { icon: '📐', label: 'Surface habitable',           value: '89,5 m²' },
    { icon: '🌿', label: 'Surface terrain',             value: '341 m²' },
    { icon: '🚪', label: 'Pièces',                      value: '4' },
    { icon: '🛏', label: 'Chambres',                    value: '3' },
    { icon: '🏊', label: 'Piscine',                     value: 'Semi-enterrée' },
    { icon: '🌄', label: 'Vue',                         value: 'Vue imprenable',          highlight: true },
    { icon: '🧭', label: 'Exposition',                  value: 'Double orientation (traversante)' },
    { icon: '🚗', label: 'Garage',                      value: '27 m²' },
    { icon: '🅿️',  label: 'Parking extérieur',         value: '4 places',                highlight: true },
    { icon: '🚿', label: 'Salle d\'eau',                value: 'Douche italienne, double vasque + WC séparé' },
    { icon: '🔥', label: 'Chauffage',                   value: 'Pompe à chaleur air/air + électrique' },
    { icon: '❄️',  label: 'Climatisation',              value: 'Réversible',              highlight: true },
    { icon: '💧', label: 'Eau chaude',                  value: 'Ballon électrique' },
    { icon: '🪟', label: 'Vitrage',                     value: 'Double vitrage PVC' },
    { icon: '🏡', label: 'Volets',                      value: 'Électriques, commande centralisée' },
    { icon: '🌳', label: 'Jardin',                      value: 'Oui — clôturé' },
    { icon: '📅', label: 'Année de construction',       value: '1972' },
    { icon: '🧱', label: 'Isolation',                   value: 'ITE façade nord + toiture (2018)' },
  ],

  /* --- DPE (Diagnostic de Performance Énergétique)
     Classes possibles : 'A' 'B' 'C' 'D' 'E' 'F' 'G'  */
  dpeClass: 'C',
  dpeValue: 116,   /* kWhEP/m²/an */
  gesClass: 'A',
  gesValue: 4,     /* kgCO₂/m²/an */
  energyCostMin: 1010,
  energyCostMax: 1400,
  energyCostYear: 2023,

  /* --- Carte (Leaflet + OpenStreetMap)
     Coordonnées approximatives du quartier (pas l'adresse exacte)  */
  mapLat: 43.657811,
  mapLng: 3.913891,
  mapRadius: 200,   /* mètres */
  mapZoom: 15,
  mapNeighborhood: 'Quartier Bel Air',
  mapCity: 'Jacou (34830)',
};
/* ─────────────────────────────────────────────────────
   FIN DE LA CONFIGURATION
   ───────────────────────────────────────────────────── */


/* =====================================================
   1. PHOTOS — Génération des slides
   ===================================================== */
function buildSlides() {
  const mainWrapper  = document.querySelector('.swiper-main .swiper-wrapper');
  const thumbWrapper = document.querySelector('.swiper-thumbs .swiper-wrapper');

  CONFIG.photos.forEach((url, i) => {
    const alt = `Photo ${i + 1} — ${CONFIG.mapCity}`;

    /* Main slide — fond flouté + image principale contain */
    const mainSlide = document.createElement('div');
    mainSlide.className = 'swiper-slide';
    mainSlide.innerHTML = `
      <div class="slide-bg" style="background-image:url('${url}')"></div>
      <img src="${url}" alt="${alt}" loading="${i === 0 ? 'eager' : 'lazy'}">
    `;
    mainWrapper.appendChild(mainSlide);

    /* Thumb slide */
    const thumbSlide = document.createElement('div');
    thumbSlide.className = 'swiper-slide';
    thumbSlide.innerHTML = `<img src="${url.replace('1200/800', '200/135')}" alt="${alt}" loading="lazy">`;
    thumbWrapper.appendChild(thumbSlide);
  });

  document.getElementById('photo-counter').textContent = `1 / ${CONFIG.photos.length}`;
}


/* =====================================================
   2. SWIPERS
   ===================================================== */
let mainSwiper, thumbsSwiper;

function initSwipers() {
  /* Thumbnails (init first, needed by main) */
  thumbsSwiper = new Swiper('.swiper-thumbs', {
    slidesPerView: 'auto',
    spaceBetween: 8,
    freeMode: true,
    watchSlidesProgress: true,
  });

  /* Main carousel */
  mainSwiper = new Swiper('.swiper-main', {
    slidesPerView: 1,
    spaceBetween: 0,
    thumbs: { swiper: thumbsSwiper },
    navigation: {
      nextEl: '.swiper-main .swiper-button-next',
      prevEl: '.swiper-main .swiper-button-prev',
    },
    on: {
      slideChange() {
        const idx = mainSwiper.activeIndex;
        document.getElementById('photo-counter').textContent =
          `${idx + 1} / ${CONFIG.photos.length}`;
      },
      click() {
        openLightbox(mainSwiper.activeIndex);
      },
    },
  });

  /* Le lightbox Swiper est initialisé à la première ouverture (voir openLightbox)
     car Swiper ne peut pas mesurer un conteneur display:none. */
}


/* =====================================================
   3. LIGHTBOX — implémentation custom (sans Swiper)
   ===================================================== */
let lbIndex = 0;
let lbZoomed = false;

function lbShow(index) {
  lbIndex = ((index % CONFIG.photos.length) + CONFIG.photos.length) % CONFIG.photos.length;
  const img = document.getElementById('lb-img');
  img.src = CONFIG.photos[lbIndex];
  img.alt = `Photo ${lbIndex + 1} — ${CONFIG.mapCity}`;
  document.getElementById('lightbox-counter').textContent =
    `${lbIndex + 1} / ${CONFIG.photos.length}`;
  /* Reset zoom */
  img.style.transform = 'scale(1)';
  img.classList.remove('zoomed');
  lbZoomed = false;
  /* Disable nav buttons at edges */
  document.getElementById('lb-prev').disabled = lbIndex === 0;
  document.getElementById('lb-next').disabled = lbIndex === CONFIG.photos.length - 1;
}

function openLightbox(index = 0) {
  document.getElementById('lightbox').classList.add('open');
  document.body.style.overflow = 'hidden';
  lbShow(index);
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
  document.body.style.overflow = '';
}

function initLightbox() {
  document.getElementById('close-lightbox').addEventListener('click', closeLightbox);
  document.getElementById('open-gallery-btn').addEventListener('click',
    () => openLightbox(mainSwiper.activeIndex));

  document.getElementById('lb-prev').addEventListener('click', () => lbShow(lbIndex - 1));
  document.getElementById('lb-next').addEventListener('click', () => lbShow(lbIndex + 1));

  /* Keyboard */
  document.addEventListener('keydown', (e) => {
    if (!document.getElementById('lightbox').classList.contains('open')) return;
    if (e.key === 'Escape')      closeLightbox();
    if (e.key === 'ArrowLeft')   lbShow(lbIndex - 1);
    if (e.key === 'ArrowRight')  lbShow(lbIndex + 1);
  });

  /* Double-clic pour zoomer / dézoomer */
  document.getElementById('lb-img').addEventListener('dblclick', () => {
    const img = document.getElementById('lb-img');
    lbZoomed = !lbZoomed;
    img.style.transform = lbZoomed ? 'scale(2.2)' : 'scale(1)';
    img.classList.toggle('zoomed', lbZoomed);
  });

  /* Swipe tactile */
  let touchStartX = 0;
  const wrap = document.getElementById('lb-img-wrap');
  wrap.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  wrap.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) dx > 0 ? lbShow(lbIndex - 1) : lbShow(lbIndex + 1);
  });
}


/* =====================================================
   4. CONTENU — Injection via JS (protection anti-scraping)
   ===================================================== */
function injectContent() {
  /* Prix */
  const priceHTML = `
    <div class="price-main" aria-label="Prix de vente">${CONFIG.price}</div>
    <div class="price-sqm">${CONFIG.pricePerSqm} · Vente directe sans frais d'agence</div>
  `;
  document.getElementById('price-display').innerHTML = priceHTML;
  const sidebarPrice = document.getElementById('sidebar-price');
  if (sidebarPrice) sidebarPrice.textContent = CONFIG.price;

  /* Description */
  document.getElementById('description-text').innerHTML = CONFIG.description;

  /* Bouton "Lire la suite" */
  const descEl  = document.getElementById('description-text');
  const fullH   = descEl.scrollHeight;
  if (fullH > 150) {
    descEl.classList.add('desc-collapsed');
    const btn = document.createElement('button');
    btn.className = 'mt-3 text-blue-600 font-semibold text-sm hover:underline';
    btn.textContent = 'Lire la suite ↓';
    let expanded = false;
    btn.addEventListener('click', () => {
      expanded = !expanded;
      descEl.classList.toggle('desc-collapsed', !expanded);
      btn.textContent = expanded ? '← Réduire' : 'Lire la suite ↓';
    });
    descEl.insertAdjacentElement('afterend', btn);
  }

  /* Atouts */
  const atoutsList = document.getElementById('atouts-list');
  CONFIG.atouts.forEach(({ icon, text }) => {
    const li = document.createElement('li');
    li.className = 'atout-item';
    li.innerHTML = `<span class="atout-icon">${icon}</span><span>${text}</span>`;
    atoutsList.appendChild(li);
  });

  /* Caractéristiques */
  const caracGrid = document.getElementById('caracteristiques');
  CONFIG.characteristics.forEach(({ icon, label, value, highlight }) => {
    const item = document.createElement('div');
    item.className = 'carac-item' + (highlight ? ' carac-highlight' : '');
    item.innerHTML = `
      <span class="carac-icon">${icon}</span>
      <div>
        <div class="carac-label">${label}</div>
        <div class="carac-value">${value}</div>
      </div>`;
    caracGrid.appendChild(item);
  });

  /* Titre dynamique */
  document.title = CONFIG.pageTitle;
}


/* =====================================================
   5. DPE / GES SCALES
   ===================================================== */
const DPE_SCALE = [
  { cls: 'A', color: '#009D6B', dpeMax: 70,  gesMax: 6,   label: '≤\u202f70',     gesLabel: '≤\u202f6'   },
  { cls: 'B', color: '#52B863', dpeMax: 110, gesMax: 11,  label: '71–110',   gesLabel: '7–11'   },
  { cls: 'C', color: '#B0D038', dpeMax: 180, gesMax: 30,  label: '111–180',  gesLabel: '12–30'  },
  { cls: 'D', color: '#F4E100', dpeMax: 250, gesMax: 50,  label: '181–250',  gesLabel: '31–50'  },
  { cls: 'E', color: '#F0A83B', dpeMax: 330, gesMax: 70,  label: '251–330',  gesLabel: '51–70'  },
  { cls: 'F', color: '#E5562D', dpeMax: 420, gesMax: 100, label: '331–420',  gesLabel: '71–100' },
  { cls: 'G', color: '#BC1E20', dpeMax: Infinity, gesMax: Infinity, label: '>\u202f420', gesLabel: '>\u202f100' },
];

/* Bar widths: staircase from 42% to 84% */
const DPE_WIDTHS = [42, 49, 56, 63, 70, 77, 84];

function renderScale(containerId, activeClass, value, unit, rangeKey) {
  const container = document.getElementById(containerId);
  const activeRow = DPE_SCALE.find(r => r.cls === activeClass);

  /* Badge lettre en évidence au-dessus du graphe */
  const badge = document.createElement('div');
  badge.className = 'dpe-hero';
  badge.style.backgroundColor = activeRow.color;
  badge.innerHTML = `
    <span class="dpe-hero-letter">${activeClass}</span>
    <span class="dpe-hero-value">${value}&thinsp;<small>${unit}</small></span>
  `;
  container.appendChild(badge);

  /* Barres A→G */
  DPE_SCALE.forEach((row, i) => {
    const isActive = row.cls === activeClass;
    const div = document.createElement('div');
    div.className = 'dpe-row' + (isActive ? ' active' : ' inactive');
    div.style.backgroundColor = isActive ? row.color : '#c8c8c8';
    div.style.width = DPE_WIDTHS[i] + '%';
    div.innerHTML = `
      <span class="dpe-letter">${row.cls}</span>
      <span class="dpe-range">${row[rangeKey]}</span>
      ${isActive ? `<span class="dpe-badge">${value}&thinsp;${unit}</span>` : ''}
    `;
    container.appendChild(div);
  });
}

function initDPE() {
  renderScale('dpe-scale', CONFIG.dpeClass, CONFIG.dpeValue, 'kWh', 'label');
  renderScale('ges-scale', CONFIG.gesClass, CONFIG.gesValue, 'kg', 'gesLabel');

  /* Cost badge */
  document.getElementById('energy-cost').innerHTML =
    `Coût estimé des énergies en ${CONFIG.energyCostYear}&nbsp;: entre
     <strong>${CONFIG.energyCostMin.toLocaleString('fr-FR')}&thinsp;€</strong> et
     <strong>${CONFIG.energyCostMax.toLocaleString('fr-FR')}&thinsp;€</strong>/an
     (valeurs indicatives)`;
}


/* =====================================================
   6. CARTE LEAFLET
   ===================================================== */
function initMap() {
  const map = L.map('map', {
    center: [CONFIG.mapLat, CONFIG.mapLng],
    zoom: CONFIG.mapZoom,
    scrollWheelZoom: false,
    zoomControl: true,
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);

  /* Zone approximative (cercle) */
  L.circle([CONFIG.mapLat, CONFIG.mapLng], {
    radius: CONFIG.mapRadius,
    color: '#2563eb',
    fillColor: '#3b82f6',
    fillOpacity: 0.12,
    weight: 2,
  }).addTo(map);

  /* Popup centré */
  L.popup({ closeButton: false, offset: [0, -4] })
    .setLatLng([CONFIG.mapLat, CONFIG.mapLng])
    .setContent(`<strong>${CONFIG.mapNeighborhood}</strong><br>${CONFIG.mapCity}`)
    .openOn(map);
}


/* =====================================================
   7. CONTACT — Décodage base64 anti-scraping
   ===================================================== */
function buildContactCard(container) {
  const phone = atob(CONFIG.phoneEncoded);
  const email = atob(CONFIG.emailEncoded);
  const tel   = phone.replace(/\s/g, '');

  container.innerHTML = `
    <div class="contact-card space-y-4">
      <div class="flex items-center gap-3 mb-2">
        <div class="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-2xl flex-shrink-0">👤</div>
        <div>
          <div class="font-semibold text-gray-800">${CONFIG.ownerName}</div>
          <div class="text-xs text-gray-500">Particulier vendeur</div>
        </div>
      </div>
      <a href="tel:${tel}"
         class="btn-call flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-semibold transition-colors"
         aria-label="Appeler le vendeur">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
        </svg>
        ${phone}
      </a>
      <a href="mailto:${email}"
         class="btn-email flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-semibold transition-colors border border-slate-200"
         aria-label="Envoyer un email au vendeur">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
        </svg>
        Envoyer un email
      </a>
      <p class="text-xs text-gray-400 text-center">Disponible du lundi au samedi · 9h–19h</p>
    </div>
  `;
}

function initContacts() {
  const desktopContainer = document.getElementById('contact-desktop');
  const mobileContainer  = document.getElementById('contact-mobile');

  if (desktopContainer) buildContactCard(desktopContainer);
  if (mobileContainer)  buildContactCard(mobileContainer);
}


/* =====================================================
   8. INIT — Point d'entrée
   ===================================================== */
document.addEventListener('DOMContentLoaded', () => {
  buildSlides();
  initSwipers();
  initLightbox();
  injectContent();
  initDPE();
  initMap();
  initContacts();
});
