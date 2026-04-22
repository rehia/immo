/**
 * firebase-config.js — Configuration Firebase
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  ÉTAPES DE CONFIGURATION                                    │
 * │                                                             │
 * │  1. Aller sur https://console.firebase.google.com           │
 * │  2. Créer un projet (ou sélectionner un existant)           │
 * │  3. Ajouter une app Web : Paramètres > Vos applications >   │
 * │     icône </> → copier l'objet firebaseConfig ci-dessous    │
 * │  4. Activer Firestore : Build > Firestore Database          │
 * │     → région europe-west3 (Francfort)                       │
 * │  5. Règles de sécurité (onglet Règles) :                    │
 * │                                                             │
 * │     rules_version = '2';                                    │
 * │     service cloud.firestore {                               │
 * │       match /databases/{database}/documents {               │
 * │         match /{document=**} {                              │
 * │           allow read: true;                                 │
 * │           allow write: false;                               │
 * │         }                                                   │
 * │       }                                                     │
 * │     }                                                       │
 * │                                                             │
 * │  Note : la config Firebase est publique par nature.         │
 * │  La sécurité est assurée par les règles Firestore, pas      │
 * │  par le secret de ces clés.                                 │
 * │                                                             │
 * │  Note dev : ouvrir via un serveur HTTP (ex: Live Server     │
 * │  VS Code ou `python3 -m http.server`), pas en file://       │
 * └─────────────────────────────────────────────────────────────┘
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore }  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyCw8905RnfKhDB04Tr6k3uw2Ucer5x3D0E",
  authDomain: "immo-rehia.firebaseapp.com",
  projectId: "immo-rehia",
  storageBucket: "immo-rehia.firebasestorage.app",
  messagingSenderId: "141490743954",
  appId: "1:141490743954:web:c8d48d71b9c0fa21c6d44b"
};

export const db = getFirestore(initializeApp(firebaseConfig));
