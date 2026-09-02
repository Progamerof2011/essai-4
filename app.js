/* ===================================================================
   Compagnon de mobilité — logique de l'application
   Tout est stocké en local (localStorage). Aucun serveur personnel.
=================================================================== */

const STORE_KEY = 'cm_config_v1';
const CACHE_KEY = 'cm_cache_v1';

const DEFAULT_CONFIG = {
  home: { address: '', station: '', lat: null, lon: null },
  lycee: { name: '', address: '', station: '', lat: null, lon: null },
  legs: {
    homeStation: { minutes: 10, mode: 'walk' },
    stationLycee: { minutes: 10, mode: 'walk' },
  },
  marginBeforeClass: 10,   // jamais < 10
  marginBeforeDeparture: 5, // marge de sécurité supplémentaire pour ne pas être trop juste
  arrivalOverride: null,   // heure choisie manuellement, "HH:MM", remis à zéro chaque jour si non fixé
  pronote: { url: '', token: '' },
  sncf: { key: '' },
  notifications: false,
  onboarded: false,
};

let CONFIG = loadConfig();
let CACHE = loadCache();
let currentMode = 'home'; // 'home' | 'lycee'
let watchTimer = null;

function loadConfig() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return structuredClone(DEFAULT_CONFIG);
    return { ...structuredClone(DEFAULT_CONFIG), ...JSON.parse(raw) };
  } catch (e) { return structuredClone(DEFAULT_CONFIG); }
}
function saveConfig() { localStorage.setItem(STORE_KEY, JSON.stringify(CONFIG)); }

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) { return {}; }
}
function saveCache() { localStorage.setItem(CACHE_KEY, JSON.stringify(CACHE)); }

/* ---------------------------------------------------------------
   Navigation entre écrans
--------------------------------------------------------------- */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.screen === id));
  document.getElementById('tabbar').classList.toggle('hidden', id === 'screen-onboarding');
}

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => showScreen(tab.dataset.screen));
});

/* ---------------------------------------------------------------
   Onboarding
--------------------------------------------------------------- */
document.querySelectorAll('[data-locfor]').forEach(btn => {
  btn.addEventListener('click', () => captureLocation(btn.dataset.locfor, btn));
});

function captureLocation(target, btnEl) {
  if (!navigator.geolocation) { alert('Localisation indisponible sur cet appareil.'); return; }
  btnEl.textContent = '📍 Repérage en cours…';
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    if (target === 'home') { CONFIG.home.lat = latitude; CONFIG.home.lon = longitude; }
    else { CONFIG.lycee.lat = latitude; CONFIG.lycee.lon = longitude; }
    btnEl.textContent = '📍 Position enregistrée ✓';
  }, () => {
    btnEl.textContent = '📍 Utiliser ma position actuelle';
    alert("Impossible de récupérer la position. Tu peux continuer sans, la sélection manuelle du mode fonctionnera toujours.");
  }, { enableHighAccuracy: true, timeout: 8000 });
}

document.getElementById('form-onboarding').addEventListener('submit', e => {
  e.preventDefault();
  CONFIG.home.address = val('ob-home-address');
  CONFIG.home.station = val('ob-home-station');
  CONFIG.lycee.name = val('ob-lycee-name');
  CONFIG.lycee.address = val('ob-lycee-address');
  CONFIG.lycee.station = val('ob-lycee-station');
  CONFIG.legs.homeStation = { minutes: Number(val('ob-time-home-station')), mode: val('ob-mode-home-station') };
  CONFIG.legs.stationLycee = { minutes: Number(val('ob-time-station-lycee')), mode: val('ob-mode-station-lycee') };
  CONFIG.onboarded = true;
  saveConfig();
  fillSettingsForm();
  showScreen('screen-main');
  boot();
});

function val(id) { return document.getElementById(id).value.trim(); }

/* ---------------------------------------------------------------
   Réglages
--------------------------------------------------------------- */
function fillSettingsForm() {
  document.getElementById('st-home-address').value = CONFIG.home.address;
  document.getElementById('st-home-station').value = CONFIG.home.station;
  document.getElementById('st-lycee-name').value = CONFIG.lycee.name;
  document.getElementById('st-lycee-address').value = CONFIG.lycee.address;
  document.getElementById('st-lycee-station').value = CONFIG.lycee.station;
  document.getElementById('st-time-home-station').value = CONFIG.legs.homeStation.minutes;
  document.getElementById('st-mode-home-station').value = CONFIG.legs.homeStation.mode;
  document.getElementById('st-time-station-lycee').value = CONFIG.legs.stationLycee.minutes;
  document.getElementById('st-mode-station-lycee').value = CONFIG.legs.stationLycee.mode;
  document.getElementById('st-margin-class').value = CONFIG.marginBeforeClass;
  document.getElementById('st-margin-departure').value = CONFIG.marginBeforeDeparture;
  document.getElementById('st-pronote-url').value = CONFIG.pronote.url;
  document.getElementById('st-pronote-token').value = CONFIG.pronote.token;
  document.getElementById('st-sncf-key').value = CONFIG.sncf.key;
  document.getElementById('st-notifications').checked = CONFIG.notifications;
}

document.getElementById('form-settings').addEventListener('submit', e => {
  e.preventDefault();
  CONFIG.home.address = val('st-home-address');
  CONFIG.home.station = val('st-home-station');
  CONFIG.lycee.name = val('st-lycee-name');
  CONFIG.lycee.address = val('st-lycee-address');
  CONFIG.lycee.station = val('st-lycee-station');
  CONFIG.legs.homeStation = { minutes: Number(val('st-time-home-station')) || 1, mode: val('st-mode-home-station') };
  CONFIG.legs.stationLycee = { minutes: Number(val('st-time-station-lycee')) || 1, mode: val('st-mode-station-lycee') };
  CONFIG.marginBeforeClass = Math.max(10, Number(val('st-margin-class')) || 10);
  CONFIG.marginBeforeDeparture = Math.max(0, Number(val('st-margin-departure')) || 0);
  CONFIG.pronote.url = val('st-pronote-url');
  CONFIG.pronote.token = val('st-pronote-token');
  CONFIG.sncf.key = val('st-sncf-key');
  CONFIG.notifications = document.getElementById('st-notifications').checked;
  saveConfig();
  if (CONFIG.notifications && 'Notification' in window) Notification.requestPermission();
  showScreen('screen-main');
  refreshAll();
});

document.getElementById('btn-reset').addEventListener('click', () => {
  if (confirm('Effacer toutes les données enregistrées sur ce téléphone ?')) {
    localStorage.removeItem(STORE_KEY);
    localStorage.removeItem(CACHE_KEY);
    location.reload();
  }
});

/* ---------------------------------------------------------------
   Mode Maison / Lycée
--------------------------------------------------------------- */
document.getElementById('mode-home').addEventListener('click', () => setMode('home'));
document.getElementById('mode-lycee').addEventListener('click', () => setMode('lycee'));

function setMode(mode) {
  currentMode = mode;
  document.getElementById('mode-home').classList.toggle('active', mode === 'home');
  document.getElementById('mode-lycee').classList.toggle('active', mode === 'lycee');
  render();
}

async function detectModeFromLocation() {
  if (!navigator.geolocation || CONFIG.home.lat == null || CONFIG.lycee.lat == null) return;
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    const dHome = haversine(latitude, longitude, CONFIG.home.lat, CONFIG.home.lon);
    const dLycee = haversine(latitude, longitude, CONFIG.lycee.lat, CONFIG.lycee.lon);
    setMode(dHome <= dLycee ? 'home' : 'lycee');
  }, () => { /* silencieux : la sélection manuelle reste dispo */ }, { timeout: 6000 });
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

/* ---------------------------------------------------------------
   Pronote — récupération de l'emploi du temps via la passerelle
   Format attendu de la passerelle (GET {url}/schedule?date=YYYY-MM-DD) :
   [{ "start": "09:20", "end": "10:15", "cancelled": false, "subject": "Maths" }, ...]
--------------------------------------------------------------- */
async function fetchSchedule() {
  const today = new Date().toISOString().slice(0, 10);
  if (!CONFIG.pronote.url) return null; // pas de passerelle configurée
  try {
    const res = await fetch(`${CONFIG.pronote.url.replace(/\/$/, '')}/schedule?date=${today}`, {
      headers: CONFIG.pronote.token ? { Authorization: `Bearer ${CONFIG.pronote.token}` } : {},
    });
    if (!res.ok) throw new Error('Réponse passerelle invalide');
    const data = await res.json();
    CACHE.schedule = { data, ts: Date.now(), date: today };
    saveCache();
    return data;
  } catch (e) {
    console.warn('Pronote indisponible, utilisation du cache', e);
    if (CACHE.schedule && CACHE.schedule.date === today) return CACHE.schedule.data;
    return null;
  }
}

function firstRealCourse(schedule) {
  if (!schedule || !schedule.length) return null;
  const real = schedule.filter(c => !c.cancelled).sort((a, b) => a.start.localeCompare(b.start));
  return real[0] || null;
}
function lastRealCourse(schedule) {
  if (!schedule || !schedule.length) return null;
  const real = schedule.filter(c => !c.cancelled).sort((a, b) => a.end.localeCompare(b.end));
  return real[real.length - 1] || null;
}

/* ---------------------------------------------------------------
   SNCF — horaires entre les deux gares configurées
   Documentation : https://numerique.sncf.com/startup/api/
--------------------------------------------------------------- */
async function fetchTrains(fromStationLabel, toStationLabel, aroundISO) {
  if (!CONFIG.sncf.key) return null;
  try {
    const auth = 'Basic ' + btoa(CONFIG.sncf.key + ':');
    const resolve = async label => {
      const r = await fetch(`https://api.sncf.com/v1/coverage/sncf/places?q=${encodeURIComponent(label)}&type[]=stop_area`, { headers: { Authorization: auth } });
      const j = await r.json();
      return j.places && j.places[0] ? j.places[0].id : null;
    };
    const [fromId, toId] = await Promise.all([resolve(fromStationLabel), resolve(toStationLabel)]);
    if (!fromId || !toId) return null;
    const datetime = aroundISO.replace(/[-:]/g, '').slice(0, 15);
    const url = `https://api.sncf.com/v1/coverage/sncf/journeys?from=${fromId}&to=${toId}&datetime=${datetime}&count=8`;
    const res = await fetch(url, { headers: { Authorization: auth } });
    const j = await res.json();
    const journeys = (j.journeys || []).map(jr => {
      const first = jr.sections.find(s => s.type === 'public_transport') || jr.sections[0];
      return {
        depart: toHM(jr.departure_date_time),
        arrivee: toHM(jr.arrival_date_time),
        ligne: first && first.display_informations ? first.display_informations.label : '',
        perturbation: (jr.status && jr.status !== '') ? jr.status : null,
        supprime: jr.status === 'NO_SERVICE',
      };
    });
    CACHE.trains = { data: journeys, ts: Date.now(), from: fromStationLabel, to: toStationLabel };
    saveCache();
    return journeys;
  } catch (e) {
    console.warn('SNCF indisponible, utilisation du cache', e);
    if (CACHE.trains) return CACHE.trains.data;
    return null;
  }
}
function toHM(sncfDatetime) {
  // format SNCF : 20260902T081700
  const h = sncfDatetime.slice(9, 11), m = sncfDatetime.slice(11, 13);
  return `${h}:${m}`;
}

/* ---------------------------------------------------------------
   Météo — Open-Meteo (aucune clé requise)
--------------------------------------------------------------- */
async function fetchWeather() {
  const coords = CONFIG.home.lat != null ? CONFIG.home : null;
  if (!coords) { document.getElementById('weather-line').textContent = ''; return; }
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true`);
    const j = await res.json();
    const w = j.current_weather;
    CACHE.weather = { data: w, ts: Date.now() };
    saveCache();
    renderWeather(w);
  } catch (e) {
    if (CACHE.weather) renderWeather(CACHE.weather.data, true);
  }
}
const WEATHER_ICONS = { rain: '🌧️', clear: '☀️', cloud: '☁️', snow: '❄️' };
function renderWeather(w, stale) {
  if (!w) return;
  const code = w.weathercode;
  let icon = '⛅', label = '';
  if ([0, 1].includes(code)) icon = '☀️';
  else if ([2, 3].includes(code)) icon = '☁️';
  else if (code >= 51 && code <= 67) { icon = '🌧️'; label = ' — ton trajet vers la gare risque d\'être moins agréable'; }
  else if (code >= 71 && code <= 77) icon = '❄️';
  else if (code >= 80) { icon = '🌧️'; label = ' — pense à prévoir un parapluie'; }
  document.getElementById('weather-line').textContent =
    `${icon} Il fait ${Math.round(w.temperature)} °C${label}${stale ? ' (donnée non actualisée)' : ''}`;
}

/* ---------------------------------------------------------------
   Algorithme de sélection des trains
--------------------------------------------------------------- */
function computeArrivalOptions(firstCourseStart, margin) {
  // dernière heure autorisée = firstCourseStart - margin
  const latest = subMinutes(firstCourseStart, margin);
  const options = [subMinutes(latest, 20), subMinutes(latest, 10), latest];
  return { latest, options };
}

function selectRelevantTrains(trains, arrivalWanted, legHomeStation, legStationLycee, safetyMargin) {
  if (!trains) return [];
  const nowPlusLeg = addMinutes(nowHM(), legHomeStation.minutes + safetyMargin);
  return trains
    .filter(t => !t.supprime)
    .filter(t => t.depart >= nowPlusLeg) // atteignable
    .filter(t => addMinutes(t.arrivee, legStationLycee.minutes) <= arrivalWanted) // arrive à temps
    .sort((a, b) => a.arrivee.localeCompare(b.arrivee));
}

function selectRelevantTrainsReturn(trains, earliestDeparture) {
  if (!trains) return [];
  return trains
    .filter(t => !t.supprime)
    .filter(t => t.depart >= earliestDeparture)
    .sort((a, b) => a.depart.localeCompare(b.depart));
}

function bestTrain(candidates) {
  return candidates.length ? candidates[0] : null;
}

/* Helpers horaires "HH:MM" */
function nowHM() { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function pad(n) { return String(n).padStart(2, '0'); }
function toMinutes(hm) { const [h, m] = hm.split(':').map(Number); return h * 60 + m; }
function fromMinutes(mins) { mins = ((mins % 1440) + 1440) % 1440; return `${pad(Math.floor(mins/60))}:${pad(mins%60)}`; }
function addMinutes(hm, n) { return fromMinutes(toMinutes(hm) + n); }
function subMinutes(hm, n) { return fromMinutes(toMinutes(hm) - n); }

/* ---------------------------------------------------------------
   Rendu de l'écran principal
--------------------------------------------------------------- */
async function refreshAll() {
  document.getElementById('clock-text').textContent = nowHM();
  const schedule = await fetchSchedule();
  await fetchWeather();
  render(schedule);
}

let LAST_SCHEDULE = null;

async function render(schedule) {
  if (schedule) LAST_SCHEDULE = schedule;
  schedule = LAST_SCHEDULE;

  const d = new Date();
  document.getElementById('clock-text').textContent = nowHM();
  document.getElementById('greeting-text').textContent = greetingForHour(d.getHours());

  const first = schedule ? firstRealCourse(schedule) : null;
  const last = schedule ? lastRealCourse(schedule) : null;
  document.getElementById('info-first-course').textContent = first ? `${first.start}${first.subject ? ' · ' + first.subject : ''}` : '—';
  document.getElementById('info-last-course').textContent = last ? `${last.end}${last.subject ? ' · ' + last.subject : ''}` : '—';

  const staleBanner = document.getElementById('stale-banner');
  if (!schedule) {
    staleBanner.textContent = "Emploi du temps indisponible pour l'instant — configure la passerelle Pronote dans les réglages, ou vérifie ta connexion.";
    staleBanner.classList.remove('hidden');
  } else if (CACHE.schedule && Date.now() - CACHE.schedule.ts > 1000 * 60 * 30) {
    staleBanner.textContent = `Données non actualisées depuis ${Math.round((Date.now() - CACHE.schedule.ts) / 60000)} min.`;
    staleBanner.classList.remove('hidden');
  } else {
    staleBanner.classList.add('hidden');
  }

  if (currentMode === 'home') await renderHomeMode(first);
  else await renderLyceeMode(last);
}

function greetingForHour(h) {
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

async function renderHomeMode(first) {
  document.getElementById('hero-badge').textContent = 'Trajet du matin';
  const arrivalSection = document.getElementById('arrival-section');
  const heroLead = document.getElementById('hero-lead');
  const heroBlock = document.getElementById('hero-train-block');
  const otherCard = document.getElementById('other-trains-card');

  if (!first) {
    heroLead.textContent = "Impossible de déterminer ton premier cours aujourd'hui.";
    heroBlock.innerHTML = '';
    arrivalSection.classList.add('hidden');
    otherCard.classList.add('hidden');
    return;
  }

  const { latest, options } = computeArrivalOptions(first.start, CONFIG.marginBeforeClass);
  const chosen = CONFIG.arrivalOverride && toMinutes(CONFIG.arrivalOverride) <= toMinutes(latest)
    ? CONFIG.arrivalOverride : latest;

  heroLead.textContent = `Ton premier cours commence à ${first.start}. Tu souhaites arriver au lycée à ${chosen}.`;

  arrivalSection.classList.remove('hidden');
  const optWrap = document.getElementById('arrival-options');
  optWrap.innerHTML = '';
  options.forEach(o => {
    const chip = document.createElement('div');
    chip.className = 'chip' + (o === chosen ? ' selected' : '');
    chip.textContent = o;
    chip.addEventListener('click', () => { CONFIG.arrivalOverride = o; saveConfig(); render(); });
    optWrap.appendChild(chip);
  });

  const trains = await fetchTrains(CONFIG.home.station, CONFIG.lycee.station, new Date().toISOString());
  const candidates = selectRelevantTrains(trains, chosen, CONFIG.legs.homeStation, CONFIG.legs.stationLycee, CONFIG.marginBeforeDeparture);
  const best = bestTrain(candidates);

  const alertBanner = document.getElementById('alert-banner');
  if (trains && trains.some(t => t.supprime)) {
    alertBanner.textContent = '⚠️ Un train a été supprimé, la recommandation a été recalculée.';
    alertBanner.classList.remove('hidden');
  } else if (best && best.perturbation) {
    alertBanner.textContent = `⚠️ Ton train recommandé est perturbé (${best.perturbation}).`;
    alertBanner.classList.remove('hidden');
  } else {
    alertBanner.classList.add('hidden');
  }

  if (!trains) {
    heroBlock.innerHTML = `<p class="train-sub">Horaires des trains indisponibles — configure ta clé API SNCF dans les réglages.</p>`;
    otherCard.classList.add('hidden');
  } else if (!best) {
    heroBlock.innerHTML = `<p class="train-sub">Aucun train ne permet d'arriver à temps pour cette heure d'arrivée. Essaie une heure plus tardive ou vérifie les horaires.</p>`;
    otherCard.classList.add('hidden');
  } else {
    const arriveeLycee = addMinutes(best.arrivee, CONFIG.legs.stationLycee.minutes);
    const marge = toMinutes(chosen) - toMinutes(arriveeLycee);
    heroBlock.innerHTML = `
      <div class="train-row"><span class="train-time">${best.depart}</span><span class="train-sub">${best.ligne || 'train recommandé'}</span></div>
      <div class="train-details">
        Il arrive à ${best.arrivee}.<br>
        Il te faudra environ ${CONFIG.legs.stationLycee.minutes} min pour rejoindre le lycée.<br>
        Tu devrais arriver vers ${arriveeLycee}.
      </div>
      <span class="margin-chip">🕒 Marge : ${marge} min</span>
    `;
    const rest = candidates.slice(1);
    if (rest.length) {
      otherCard.classList.remove('hidden');
      document.getElementById('other-trains-list').innerHTML = rest.map(t =>
        `<div class="t"><span>${t.depart} → ${t.arrivee}</span><span>${t.ligne || ''}</span></div>`).join('');
    } else {
      otherCard.classList.add('hidden');
    }
  }
}

async function renderLyceeMode(last) {
  document.getElementById('hero-badge').textContent = 'Trajet du retour';
  document.getElementById('arrival-section').classList.add('hidden');
  const heroLead = document.getElementById('hero-lead');
  const heroBlock = document.getElementById('hero-train-block');
  const otherCard = document.getElementById('other-trains-card');

  if (!last) {
    heroLead.textContent = "Impossible de déterminer ton dernier cours aujourd'hui.";
    heroBlock.innerHTML = '';
    otherCard.classList.add('hidden');
    return;
  }

  const leaveLycee = addMinutes(last.end, 5); // petite marge pour quitter le lycée
  const earliestDeparture = addMinutes(leaveLycee, CONFIG.legs.stationLycee.minutes);
  heroLead.textContent = `Ton dernier cours se termine à ${last.end}.`;

  const trains = await fetchTrains(CONFIG.lycee.station, CONFIG.home.station, new Date().toISOString());
  const candidates = selectRelevantTrainsReturn(trains, earliestDeparture);
  const best = bestTrain(candidates);

  const alertBanner = document.getElementById('alert-banner');
  if (trains && trains.some(t => t.supprime)) {
    alertBanner.textContent = '⚠️ Un train du retour a été supprimé, la recommandation a été recalculée.';
    alertBanner.classList.remove('hidden');
  } else if (best && best.perturbation) {
    alertBanner.textContent = `⚠️ Ton train du retour est perturbé (${best.perturbation}).`;
    alertBanner.classList.remove('hidden');
  } else {
    alertBanner.classList.add('hidden');
  }

  if (!trains) {
    heroBlock.innerHTML = `<p class="train-sub">Horaires indisponibles — vérifie ta clé API SNCF.</p>`;
    otherCard.classList.add('hidden');
  } else if (!best) {
    heroBlock.innerHTML = `<p class="train-sub">Aucun train trouvé après la fin de tes cours.</p>`;
    otherCard.classList.add('hidden');
  } else {
    const arriveeMaison = addMinutes(best.arrivee, CONFIG.legs.homeStation.minutes);
    heroBlock.innerHTML = `
      <div class="train-row"><span class="train-time">${best.depart}</span><span class="train-sub">${best.ligne || 'train recommandé'}</span></div>
      <div class="train-details">
        Il arrive à ${best.arrivee}.<br>
        Tu devrais être à la maison vers ${arriveeMaison}.
      </div>
    `;
    const rest = candidates.slice(1);
    if (rest.length) {
      otherCard.classList.remove('hidden');
      document.getElementById('other-trains-list').innerHTML = rest.map(t =>
        `<div class="t"><span>${t.depart} → ${t.arrivee}</span><span>${t.ligne || ''}</span></div>`).join('');
    } else {
      otherCard.classList.add('hidden');
    }
  }
}

/* ---------------------------------------------------------------
   Boot
--------------------------------------------------------------- */
document.getElementById('btn-refresh').addEventListener('click', refreshAll);

function boot() {
  if (!CONFIG.onboarded) { showScreen('screen-onboarding'); return; }
  fillSettingsForm();
  showScreen('screen-main');
  setMode('home');
  detectModeFromLocation();
  refreshAll();
  setInterval(() => { document.getElementById('clock-text').textContent = nowHM(); }, 30000);
  if (CONFIG.notifications) setInterval(checkForDisruptions, 5 * 60 * 1000);
}

async function checkForDisruptions() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const from = currentMode === 'home' ? CONFIG.home.station : CONFIG.lycee.station;
  const to = currentMode === 'home' ? CONFIG.lycee.station : CONFIG.home.station;
  const trains = await fetchTrains(from, to, new Date().toISOString());
  if (trains && trains.some(t => t.supprime)) {
    new Notification('Trajet', { body: 'Un train recommandé a été supprimé.' });
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

boot();
