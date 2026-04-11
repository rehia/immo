/* =====================================================
   research-data.js — Biens en cours de recherche
   Éditer ce fichier pour ajouter/modifier des biens.

   Statuts possibles :
     'to-visit'  → Bleu  (à visiter)
     'visited'   → Vert  (visitée)
     'abandoned' → Gris  (abandonnée)

   Coordonnées GPS : chercher l'adresse sur OpenStreetMap
   (clic droit → "Afficher l'adresse") ou Google Maps.

   Format urls :
     urls: [
       { site: 'SeLoger', url: 'https://...' },
       { url: 'https://...' },  // site détecté automatiquement
     ]

   image : URL d'une photo (optionnel)
   ===================================================== */

const SITE_NAMES = {
  'leboncoin.fr': 'Le Bon Coin',
  'seloger.com': 'SeLoger',
  'bienici.com': "Bien'ici",
  'ouestfrance-immo.com': 'Ouest-France Immo',
  'pap.fr': 'PAP',
};

const PROPERTIES = [
  {
    address: '415 Chem. de l\'Hirondelle, Castelnau-le-Lez (34170)',
    lat: 43.6466836,
    lng: 3.8902775,
    urls: [
      { url: 'https://www.bienici.com/annonce/vente/castelnau-le-lez/maison/5pieces/netty-company39193zxy-house-134537' },
    ],
    status: 'visited',
    label: '5 pièces 174 m² 609 000€',
    image: 'https://file.bienici.com/photo/netty-company39193zxy-house-134537_img.netty.immo_productcw_company39193zxy_28_VM134537_17746046374_VM134537_54_original.jpg?width=600&height=370&fit=cover',
  },
  {
    address: '18 Rue Bufalebre, Clapiers (34830)',
    lat: 43.6513381,
    lng: 3.887498,
    urls: [
      { url: 'https://www.leboncoin.fr/ad/ventes_immobilieres/3168334296' },
    ],
    status: 'to-visit',
    label: '5p 145m² 650 000€',
    image: 'https://img.leboncoin.fr/api/v1/lbcpb1/images/51/f8/d1/51f8d1aead38ab3ceae24dd6fbac081f113980c0.jpg?rule=ad-large',
  },
  {
    address: '22 Av. Pierre de Coubertin, Jacou (34830)',
    lat: 43.6589092,
    lng: 3.9234497,
    urls: [
      { url: 'https://www.seloger.com/annonces/achat/maison/jacou-34/263699399.htm' },
      { url: 'https://www.bienici.com/annonce/vente-de-prestige/jacou/maison/6pieces/netty-company52586gdp-house-13747' },
    ],
    status: 'to-visit',
    label: 'T6/F6 137.58 m² 585 000 € (parents Estelle)',
    image: 'https://file.bienici.com/photo/netty-company52586gdp-house-13747_img.netty.immo_productw_company52586gdp_8_VM13747_17737407891_VM13747_6_original.jpg?width=2000&height=2000',
  },
  {
    address: 'Saint-Drézéry (34160)',
    lat: 43.7067,
    lng: 3.9567,
    urls: [
      { url: 'https://www.bienici.com/annonce/vente/teyran/maison/6pieces/ag440414-521039147' },
      { url: 'https://www.leboncoin.fr/ad/ventes_immobilieres/3172136866' },
    ],
    status: 'abandoned',
    label: '6 pièces 144 m² 545 000€',
    image: 'https://img.leboncoin.fr/api/v1/lbcpb1/images/gh/4c/9a/gh4c9ab4e410310a5cb91934858d6ef123ce7052.jpg?rule=ad-large',
    approximate: true,
  },
  {
    address: 'Teyran (34820)',
    lat: 43.685500,
    lng: 3.924800,
    urls: [
      { url: 'https://www.seloger.com/annonces/achat/maison/teyran-34/265869537.htm' },
    ],
    status: 'to-visit',
    label: 'Plain pied 140 m2 - 570000€',
    image: 'https://mms.seloger.com/8/2/1/2/8212ae35-a9ed-40bb-9963-2d38c45bcb36.jpg?ci_seal=433c28e790b4a60f2f3c530f0836f390c748b46c&w=1920&func=fit&bg_color=000&org_if_sml=1',
    approximate: true,
  },
];
