(() => {
  "use strict";

  const ZONES = [
    { id: "sunnegga",  name: "Sunnegga",         alt: 2288, lat: 46.0030, lon: 7.7900 },
    { id: "gornergrat", name: "Gornergrat",      alt: 3089, lat: 45.9836, lon: 7.7849 },
    { id: "glacier",   name: "Glacier Paradise", alt: 3883, lat: 45.9396, lon: 7.7300 }
  ];
  const DAYS_AHEAD = 5;      // días adicionales a partir de la fecha elegida
  const MAX_FORECAST = 15;   // límite del pronóstico (Open-Meteo: 16 días)
  const TZ = "Europe/Zurich";
  const REFRESH_MS = 30 * 60 * 1000; // actualización automática cada 30 min

  const $ = (id) => document.getElementById(id);
  const els = {
    tabs: $("tabs"), date: $("date"), lang: $("lang"), status: $("status"),
    hero: $("hero"), days: $("days"), hourly: $("hourly"), updated: $("updated"), table: $("hourlyTable")
  };

  const state = { zone: ZONES[1], start: null, data: null, selected: 0, auto: true, loading: false, token: 0, lastUpdate: 0 };

  /* ---------- Idiomas ---------- */
  const LANGS = {
    es: { locale: "es", name: "Español",
      t: { retry: "Reintentar", updated: "Actualizado a las", from: "Desde", loading: "Cargando…", error: "No se pudo cargar el clima. Revisa tu conexión e inténtalo de nuevo.",
        hourly: "Hora por hora", footer: "Datos: Open-Meteo · Ajustados a la altitud de cada zona", start: "Inicio", min: "mín",
        snow: "Nieve", precip: "Precipitación", windMax: "Viento máx.", gusts: "Ráfagas", humidity: "Humedad media", freezing: "Isoterma 0 °C",
        sky: "Cielo", temp: "Temp. °C", snowCm: "Nieve cm", precipMm: "Precip. mm", wind: "Viento km/h", gustsKmh: "Ráfagas km/h", humPct: "Humedad %",
        snowDay: "cm nieve", daysLabel: "Pronóstico por día", zoneLabel: "Zona de esquí" },
      w: { clear: "Despejado", partly: "Poco nuboso", cloud: "Nublado", fog: "Niebla", drizzle: "Llovizna", rain: "Lluvia", snow: "Nieve", showers: "Chubascos", snowShowers: "Chubascos de nieve", storm: "Tormenta" },
      c: ["N", "NE", "E", "SE", "S", "SO", "O", "NO"] },
    it: { locale: "it", name: "Italiano",
      t: { retry: "Riprova", updated: "Aggiornato alle", from: "Dal", loading: "Caricamento…", error: "Impossibile caricare il meteo. Controlla la connessione e riprova.",
        hourly: "Ora per ora", footer: "Dati: Open-Meteo · Adattati all'altitudine di ogni zona", start: "Inizio", min: "min",
        snow: "Neve", precip: "Precipitazioni", windMax: "Vento max", gusts: "Raffiche", humidity: "Umidità media", freezing: "Isoterma 0 °C",
        sky: "Cielo", temp: "Temp. °C", snowCm: "Neve cm", precipMm: "Precip. mm", wind: "Vento km/h", gustsKmh: "Raffiche km/h", humPct: "Umidità %",
        snowDay: "cm neve", daysLabel: "Previsioni per giorno", zoneLabel: "Zona sciistica" },
      w: { clear: "Sereno", partly: "Poco nuvoloso", cloud: "Nuvoloso", fog: "Nebbia", drizzle: "Pioviggine", rain: "Pioggia", snow: "Neve", showers: "Rovesci", snowShowers: "Rovesci di neve", storm: "Temporale" },
      c: ["N", "NE", "E", "SE", "S", "SO", "O", "NO"] },
    zh: { locale: "zh-CN", name: "中文",
      t: { retry: "重试", updated: "更新于", from: "起始日期", loading: "加载中…", error: "无法加载天气数据，请检查网络后重试。",
        hourly: "逐小时预报", footer: "数据来源：Open-Meteo · 已按各区域海拔校正", start: "起始", min: "最低",
        snow: "降雪", precip: "降水量", windMax: "最大风速", gusts: "阵风", humidity: "平均湿度", freezing: "0 °C 等温线",
        sky: "天气", temp: "气温 °C", snowCm: "降雪 cm", precipMm: "降水 mm", wind: "风速 km/h", gustsKmh: "阵风 km/h", humPct: "湿度 %",
        snowDay: "cm 降雪", daysLabel: "每日预报", zoneLabel: "滑雪区域" },
      w: { clear: "晴", partly: "少云", cloud: "阴", fog: "雾", drizzle: "毛毛雨", rain: "雨", snow: "雪", showers: "阵雨", snowShowers: "阵雪", storm: "雷暴" },
      c: ["北", "东北", "东", "东南", "南", "西南", "西", "西北"] },
    de: { locale: "de", name: "Deutsch",
      t: { retry: "Erneut versuchen", updated: "Aktualisiert um", from: "Ab", loading: "Lädt…", error: "Wetterdaten konnten nicht geladen werden. Prüfe deine Verbindung und versuche es erneut.",
        hourly: "Stündlich", footer: "Daten: Open-Meteo · Auf die Höhe jedes Gebiets angepasst", start: "Start", min: "min",
        snow: "Schnee", precip: "Niederschlag", windMax: "Wind max.", gusts: "Böen", humidity: "Ø Luftfeuchte", freezing: "Nullgradgrenze",
        sky: "Himmel", temp: "Temp. °C", snowCm: "Schnee cm", precipMm: "Niederschl. mm", wind: "Wind km/h", gustsKmh: "Böen km/h", humPct: "Feuchte %",
        snowDay: "cm Schnee", daysLabel: "Tagesvorhersage", zoneLabel: "Skigebiet" },
      w: { clear: "Klar", partly: "Leicht bewölkt", cloud: "Bewölkt", fog: "Nebel", drizzle: "Nieselregen", rain: "Regen", snow: "Schnee", showers: "Schauer", snowShowers: "Schneeschauer", storm: "Gewitter" },
      c: ["N", "NO", "O", "SO", "S", "SW", "W", "NW"] },
    fr: { locale: "fr", name: "Français",
      t: { retry: "Réessayer", updated: "Mis à jour à", from: "À partir du", loading: "Chargement…", error: "Impossible de charger la météo. Vérifie ta connexion et réessaie.",
        hourly: "Heure par heure", footer: "Données : Open-Meteo · Ajustées à l'altitude de chaque zone", start: "Début", min: "min",
        snow: "Neige", precip: "Précipitations", windMax: "Vent max.", gusts: "Rafales", humidity: "Humidité moy.", freezing: "Isotherme 0 °C",
        sky: "Ciel", temp: "Temp. °C", snowCm: "Neige cm", precipMm: "Précip. mm", wind: "Vent km/h", gustsKmh: "Rafales km/h", humPct: "Humidité %",
        snowDay: "cm de neige", daysLabel: "Prévisions par jour", zoneLabel: "Zone de ski" },
      w: { clear: "Dégagé", partly: "Peu nuageux", cloud: "Nuageux", fog: "Brouillard", drizzle: "Bruine", rain: "Pluie", snow: "Neige", showers: "Averses", snowShowers: "Averses de neige", storm: "Orage" },
      c: ["N", "NE", "E", "SE", "S", "SO", "O", "NO"] },
    en: { locale: "en", name: "English",
      t: { retry: "Retry", updated: "Updated at", from: "From", loading: "Loading…", error: "Couldn't load the weather. Check your connection and try again.",
        hourly: "Hourly", footer: "Data: Open-Meteo · Adjusted to each area's altitude", start: "Start", min: "min",
        snow: "Snow", precip: "Precipitation", windMax: "Max wind", gusts: "Gusts", humidity: "Avg. humidity", freezing: "0 °C level",
        sky: "Sky", temp: "Temp. °C", snowCm: "Snow cm", precipMm: "Precip. mm", wind: "Wind km/h", gustsKmh: "Gusts km/h", humPct: "Humidity %",
        snowDay: "cm snow", daysLabel: "Daily forecast", zoneLabel: "Ski area" },
      w: { clear: "Clear", partly: "Partly cloudy", cloud: "Cloudy", fog: "Fog", drizzle: "Drizzle", rain: "Rain", snow: "Snow", showers: "Showers", snowShowers: "Snow showers", storm: "Thunderstorm" },
      c: ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] }
  };

  function detectLang() {
    try { const saved = localStorage.getItem("zermatt-lang"); if (saved && LANGS[saved]) return saved; } catch (e) {}
    const n = (navigator.language || "es").slice(0, 2).toLowerCase();
    return LANGS[n] ? n : "es";
  }

  let lang = detectLang();
  let L = LANGS[lang];
  let WEEKDAY, LONG, SHORT;

  function applyLang(code) {
    lang = code; L = LANGS[code];
    try { localStorage.setItem("zermatt-lang", code); } catch (e) {}
    document.documentElement.lang = L.locale;
    document.title = "Zermatt · " + (code === "zh" ? "山区天气" : "Weather");
    WEEKDAY = new Intl.DateTimeFormat(L.locale, { weekday: "short" });
    LONG = new Intl.DateTimeFormat(L.locale, { weekday: "long", day: "numeric", month: "long" });
    SHORT = new Intl.DateTimeFormat(L.locale, { day: "numeric", month: "short" });
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = L.t[el.dataset.i18n]; });
    els.tabs.setAttribute("aria-label", L.t.zoneLabel);
    els.days.setAttribute("aria-label", L.t.daysLabel);
    els.lang.value = code;
  }

  /* ---------- Utilidades ---------- */
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const fmt = (v, dec = 0) => (v == null ? "–" : Number(v).toFixed(dec));
  const avg = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;

  const compass = (deg) => deg == null ? "" : L.c[Math.round(deg / 45) % 8];

  /* ---------- Códigos de clima WMO ---------- */
  function weatherInfo(code) {
    const w = L.w;
    if (code === 0) return [w.clear, "sun"];
    if (code <= 2) return [w.partly, "partly"];
    if (code === 3) return [w.cloud, "cloud"];
    if (code === 45 || code === 48) return [w.fog, "fog"];
    if (code >= 51 && code <= 57) return [w.drizzle, "rain"];
    if (code >= 61 && code <= 67) return [w.rain, "rain"];
    if (code >= 71 && code <= 77) return [w.snow, "snow"];
    if (code >= 80 && code <= 82) return [w.showers, "rain"];
    if (code === 85 || code === 86) return [w.snowShowers, "snow"];
    if (code >= 95) return [w.storm, "storm"];
    return ["–", "cloud"];
  }

  const ICONS = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    partly: '<circle cx="8" cy="8" r="3"/><path d="M8 2v1M2 8h1M3.8 3.8l.7.7M12.2 3.8l-.7.7"/><path d="M8 19a4 4 0 0 1 .5-8 5 5 0 0 1 9.5 1.5A3.3 3.3 0 0 1 17.5 19z"/>',
    cloud: '<path d="M7 19a4.5 4.5 0 0 1 .6-9 6 6 0 0 1 11.4 1.8A3.6 3.6 0 0 1 18.4 19z"/>',
    fog: '<path d="M7 14a4 4 0 0 1 .5-8 5.5 5.5 0 0 1 10.5 1.5 3 3 0 0 1-.5 6.5z"/><path d="M4 18h16M7 21.5h10"/>',
    rain: '<path d="M7 15a4.5 4.5 0 0 1 .6-9 6 6 0 0 1 11.4 1.8A3.6 3.6 0 0 1 18.4 15z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/>',
    snow: '<path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7"/><path d="M9.5 3.5L12 6l2.5-2.5M9.5 20.5L12 18l2.5 2.5"/>',
    storm: '<path d="M7 14a4.5 4.5 0 0 1 .6-9 6 6 0 0 1 11.4 1.8A3.6 3.6 0 0 1 18.4 14z"/><path d="M12 14l-2.5 4h4L11.5 22"/>'
  };
  const icon = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k]}</svg>`;
  const arrow = (deg) => `<svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(${(deg ?? 0) + 180}deg)" aria-hidden="true"><path d="M12 4v16M6 14l6 6 6-6"/></svg>`;

  /* ---------- Datos ---------- */
  async function load(silent = false) {
    if (silent === true && state.loading) return;
    state.loading = true;
    const token = ++state.token;
    if (silent !== true) setStatus(L.t.loading);
    // Si la fecha era "hoy" y ya cambió el día, avanzar
    const now = new Date();
    if (state.auto && iso(now) !== iso(state.start)) {
      state.start = now;
      els.date.min = iso(now);
      els.date.max = iso(addDays(now, MAX_FORECAST - DAYS_AHEAD));
      els.date.value = iso(now);
    }
    const end = addDays(state.start, DAYS_AHEAD);
    const z = state.zone;
    const params = new URLSearchParams({
      latitude: z.lat, longitude: z.lon, elevation: z.alt,
      timezone: TZ, wind_speed_unit: "kmh",
      start_date: iso(state.start), end_date: iso(end),
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant",
      hourly: "temperature_2m,relative_humidity_2m,precipitation,snowfall,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,freezing_level_height"
    });
    try {
      const keep = silent === true ? state.selected : 0;
      const data = await fetchWithRetry(`https://api.open-meteo.com/v1/forecast?${params}`);
      if (token !== state.token) return; // llegó una petición más reciente
      state.data = data;
      state.selected = Math.min(keep, state.data.daily.time.length - 1);
      state.lastUpdate = Date.now();
      setStatus("");
      render();
    } catch (e) {
      if (token !== state.token) return;
      // En una actualización silenciosa se conservan los datos que ya se ven
      if (silent !== true || !state.data) {
        els.hero.hidden = els.days.hidden = els.hourly.hidden = true;
        setStatus(L.t.error, true, true);
      }
    } finally {
      if (token === state.token) state.loading = false;
    }
  }

  function showUpdated() {
    if (!state.lastUpdate) { els.updated.textContent = ""; return; }
    const time = new Intl.DateTimeFormat(L.locale, { hour: "2-digit", minute: "2-digit" }).format(state.lastUpdate);
    els.updated.textContent = `${L.t.updated} ${time}`;
  }

  // Reintenta automáticamente si el servidor está saturado (503, 429, 5xx)
  async function fetchWithRetry(url, tries = 4) {
    let lastErr;
    for (let n = 0; n < tries; n++) {
      try {
        const res = await fetch(url);
        if (res.ok) return await res.json();
        lastErr = new Error("HTTP " + res.status);
        if (res.status < 500 && res.status !== 429) break; // error del cliente: no insistir
      } catch (e) { lastErr = e; }
      await new Promise((r) => setTimeout(r, 1000 * (n + 1)));
    }
    throw lastErr;
  }

  function setStatus(msg, error = false, retry = false) {
    els.status.textContent = msg;
    if (retry) {
      const b = document.createElement("button");
      b.className = "retry";
      b.textContent = L.t.retry;
      b.addEventListener("click", () => load());
      els.status.append(" ", b);
    }
    els.status.classList.toggle("error", error);
    els.status.hidden = !msg;
  }

  // Horas de un día (índices dentro de hourly)
  function hoursOf(dayIso) {
    const t = state.data.hourly.time;
    const out = [];
    t.forEach((s, i) => { if (s.startsWith(dayIso)) out.push(i); });
    return out;
  }

  /* ---------- Render ---------- */
  function render() {
    renderTabs();
    renderDays();
    renderSelected();
    els.days.hidden = false;
    showUpdated();
  }

  function renderTabs() {
    els.tabs.innerHTML = ZONES.map((z) =>
      `<button class="tab" role="tab" data-id="${z.id}" aria-selected="${z.id === state.zone.id}">${z.name}<small>${z.alt} m</small></button>`
    ).join("");
  }

  function renderDays() {
    const d = state.data.daily;
    els.days.innerHTML = d.time.map((day, i) => {
      const [, kind] = weatherInfo(d.weather_code[i]);
      const date = parse(day);
      return `<button class="day" data-i="${i}" aria-pressed="${i === state.selected}">
        <span class="day-name">${i === 0 ? L.t.start : WEEKDAY.format(date)}</span>
        <span class="day-date">${SHORT.format(date)}</span>
        ${icon(kind)}
        <span class="day-temp">${fmt(d.temperature_2m_max[i])}° <span>${fmt(d.temperature_2m_min[i])}°</span></span>
        <span class="day-meta">
          <span class="s">${fmt(d.snowfall_sum[i], 1)} ${L.t.snowDay}</span>
          <span>${fmt(d.wind_speed_10m_max[i])} km/h</span>
        </span>
      </button>`;
    }).join("");
  }

  function renderSelected() {
    const d = state.data.daily, h = state.data.hourly, i = state.selected;
    const day = d.time[i];
    const idx = hoursOf(day);
    const [label, kind] = weatherInfo(d.weather_code[i]);

    const hum = avg(idx.map((k) => h.relative_humidity_2m[k]).filter((v) => v != null));
    const fl = idx.map((k) => h.freezing_level_height[k]).filter((v) => v != null);
    const freezing = fl.length ? avg(fl) : null;

    els.hero.innerHTML = `
      <div class="hero-head">
        ${icon(kind)}
        <div>
          <div class="hero-temp">${fmt(d.temperature_2m_max[i])}°<span>${L.t.min} ${fmt(d.temperature_2m_min[i])}°</span></div>
          <div class="hero-sub"><b>${label}</b> · ${LONG.format(parse(day))} · ${state.zone.name}, ${state.zone.alt} m</div>
        </div>
      </div>
      <dl class="metrics">
        <div class="metric snow"><dt>${L.t.snow}</dt><dd>${fmt(d.snowfall_sum[i], 1)}<small>cm</small></dd></div>
        <div class="metric"><dt>${L.t.precip}</dt><dd>${fmt(d.precipitation_sum[i], 1)}<small>mm</small></dd></div>
        <div class="metric"><dt>${L.t.windMax}</dt><dd>${arrow(d.wind_direction_10m_dominant[i])}${fmt(d.wind_speed_10m_max[i])}<small>km/h ${compass(d.wind_direction_10m_dominant[i])}</small></dd></div>
        <div class="metric"><dt>${L.t.gusts}</dt><dd>${fmt(d.wind_gusts_10m_max[i])}<small>km/h</small></dd></div>
        <div class="metric"><dt>${L.t.humidity}</dt><dd>${fmt(hum)}<small>%</small></dd></div>
        <div class="metric"><dt>${L.t.freezing}</dt><dd>${fmt(freezing)}<small>m</small></dd></div>
      </dl>`;
    els.hero.hidden = false;

    // Tabla horaria cada 3 h
    const cols = idx.filter((k) => new Date(h.time[k]).getHours() % 3 === 0);
    const row = (label, fn, cls = () => "") =>
      `<tr><th scope="row">${label}</th>${cols.map((k) => `<td class="${cls(k)}">${fn(k)}</td>`).join("")}</tr>`;
    const zero = (v) => (!v ? "zero" : "");

    els.table.innerHTML = `<table>
      <thead><tr><th></th>${cols.map((k) => `<th scope="col">${h.time[k].slice(11, 16)}</th>`).join("")}</tr></thead>
      <tbody>
        ${row(L.t.sky, (k) => icon(weatherInfo(h.weather_code[k])[1]))}
        ${row(L.t.temp, (k) => fmt(h.temperature_2m[k]) + "°")}
        ${row(L.t.snowCm, (k) => fmt(h.snowfall[k], 1), (k) => h.snowfall[k] ? "s" : "zero")}
        ${row(L.t.precipMm, (k) => fmt(h.precipitation[k], 1), (k) => zero(h.precipitation[k]))}
        ${row(L.t.wind, (k) => `${fmt(h.wind_speed_10m[k])} ${compass(h.wind_direction_10m[k])}`)}
        ${row(L.t.gustsKmh, (k) => fmt(h.wind_gusts_10m[k]))}
        ${row(L.t.humPct, (k) => fmt(h.relative_humidity_2m[k]))}
      </tbody></table>`;
    els.hourly.hidden = false;
  }

  /* ---------- Eventos ---------- */
  els.tabs.addEventListener("click", (e) => {
    const b = e.target.closest(".tab");
    if (!b) return;
    state.zone = ZONES.find((z) => z.id === b.dataset.id);
    load();
  });

  els.days.addEventListener("click", (e) => {
    const b = e.target.closest(".day");
    if (!b) return;
    state.selected = Number(b.dataset.i);
    renderDays();
    renderSelected();
  });

  els.lang.addEventListener("change", () => {
    applyLang(els.lang.value);
    if (state.data) render();
    else setStatus(L.t.loading);
  });

  els.date.addEventListener("change", () => {
    if (!els.date.value) return;
    state.start = parse(els.date.value);
    state.auto = els.date.value === iso(new Date());
    load();
  });

  /* ---------- Inicio ---------- */
  applyLang(lang);
  const today = new Date();
  els.date.min = iso(today);
  els.date.max = iso(addDays(today, MAX_FORECAST - DAYS_AHEAD));
  els.date.value = iso(today);
  state.start = today;
  load();

  // Actualización automática mientras la página está abierta
  setInterval(() => load(true), REFRESH_MS);
  // Al volver a la pestaña, actualizar si los datos tienen más de 10 minutos
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && Date.now() - state.lastUpdate > 10 * 60 * 1000) load(true);
  });
})();
