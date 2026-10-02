// Per-base configuration for YAV. Mirrors YKF's baseConfig.js shape exactly —
// see that file's comment for what each field does.
//
// Phase 2 in progress: crew cars are real (single Dodge Caravan). Aircraft
// fleet, address, and PINs are still placeholders pending Phase 2/3 content.
const BASE_CONFIG = {
  baseId: 'yav',
  baseName: 'Skycare YAV',
  baseAddress: 'St. Andrews, MB', // TODO: confirm real address
  companyName: 'Skycare Aviation Services',
  themeColor: '#171310',
  pinCorrect: '0801',  // TODO: placeholder — pick YAV's real PIN
  adminPin: '0001',    // TODO: placeholder — pick YAV's real admin PIN

  firebaseConfig: {
    apiKey: "AIzaSyClm8rZ3hFg4ymhumXiQ73c3aVdk0Htbrk",
    authDomain: "skycare-yav.firebaseapp.com",
    projectId: "skycare-yav",
    storageBucket: "skycare-yav.firebasestorage.app",
    messagingSenderId: "309421655672",
    appId: "1:309421655672:web:47dfdb7d5c7cf4d6dd8f8d"
  },
  vapidPublicKey: "BL-9QbyPlFMPIv8T_C_aeM4MTkv2Mb9ogKZLlQjk9IJeHbCGYNJKlThwgJyqdxbuDdCGQf7dR5sDeNSEyNsgAVA",
  // Matching private key is NOT here — it lives only as the GitHub Actions
  // secret VAPID_PRIVATE_KEY_YAV in the groomers-ykf repo, used by the fleet
  // arrival job (notif/fleet-alert.js) to send YAV's 40 nm CYAV alerts.

  crewCars: [
    {key:'caravan', name:'Dodge Caravan', fuel:'gasoline', color:'#D8CBB0', color2:'#EDE4D0', label:'Minivan', img:'cars/Dodge_caravan_2008_YAV-removebg-preview.png', plate:'HVA 763'},
  ],

  // Shared across all bases -- see bouncie-worker/index.js in the YKF repo
  // for why this isn't a separate per-base Worker.
  bouncieWorkerUrl: 'https://bouncie-proxy.skycare.workers.dev',

  aircraftFleet: {
    metro: [], westwind: [], astra: [],
  }, // TODO: Phase 3 replaces this with the shared registry claim mechanism anyway

  // Explicitly disabled for now, per 2026-08-08 decision — hidden, not deleted,
  // so re-enabling later is a one-line flip, not a rebuild. Absence of a key
  // (or true) means enabled — this is how YKF stays completely unaffected.
  features: {
    fleet: true,            // Fleet tab measured from CYAV (2026-10-01)
    facilityAudits: false,  // no real content yet, and "YKF Base" naming doesn't apply
  },
};
