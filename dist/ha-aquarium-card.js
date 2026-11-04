/**
 * HA Aquarium Card — dependency-free Home Assistant dashboard card.
 * Copyright (c) 2026 HA Aquarium Card contributors. MIT licensed.
 */
const AQUARIUM_CARD_VERSION = "0.2.0";
const DEFAULT_IMAGE = new URL("./aquarium-default.webp", import.meta.url).href;
const INVALID_STATES = new Set(["unknown", "unavailable", "none", "null", ""]);
const CATEGORY_ORDER = ["temperature", "tds", "light", "feeder", "water_level", "ph", "salinity", "pump", "heater"];
const CATEGORY_INFO = {
  temperature: { label: "Temperature", icon: "mdi:thermometer-water", color: "#ffbf72" },
  tds: { label: "TDS", icon: "mdi:water-check", color: "#74e7e9" },
  light: { label: "Lighting", icon: "mdi:lightbulb-on-outline", color: "#ffe394" },
  feeder: { label: "Feeder", icon: "mdi:fish", color: "#ffcb82" },
  water_level: { label: "Water level", icon: "mdi:waves-arrow-up", color: "#7dd7ff" },
  ph: { label: "pH", icon: "mdi:test-tube", color: "#c8adff" },
  salinity: { label: "Salinity", icon: "mdi:water-percent", color: "#93b6ff" },
  pump: { label: "Pump", icon: "mdi:pump", color: "#a3f2d5" },
  heater: { label: "Heating", icon: "mdi:radiator", color: "#ffab83" },
  leak: { label: "Leak", icon: "mdi:water-alert", color: "#ff958d" },
};
const STYLES = `
  :host { display:block; color:var(--primary-text-color); }
  ha-card { display:block; overflow:visible; background:transparent; border:0; box-shadow:none; }
  .collection { display:grid; gap:16px; }
  .tank { position:relative; isolation:isolate; overflow:hidden; min-height:358px; border-radius:24px;
    background:#062a39; color:#f5fffe; border:1px solid rgba(163,231,233,.23);
    box-shadow:0 12px 34px rgba(2,15,24,.23); --light-rgb:142,204,248; --beam-opacity:0;
    --photo-brightness:1; --night-opacity:0; --haze-opacity:0; }
  .photo, .water-haze, .night-shade, .light-beam, .light-surface, .caustics, .scene-vignette,
  .flake-field { position:absolute; inset:0; pointer-events:none; }
  .photo { z-index:0; background-size:cover; background-position:center; background-repeat:no-repeat;
    background-color:#0b3548; filter:brightness(var(--photo-brightness)) saturate(1.09);
    transform:scale(1.012); transition:filter 1.2s ease; }
  .water-haze { z-index:1; opacity:var(--haze-opacity); background:
    radial-gradient(ellipse at 43% 65%,rgba(173,173,126,.76),rgba(143,153,129,.43) 50%,rgba(79,112,107,.20) 100%),
    radial-gradient(circle at 22% 35%,rgba(232,211,156,.23) 0 1px,transparent 2px);
    backdrop-filter:blur(2px) saturate(.75); -webkit-backdrop-filter:blur(2px) saturate(.75);
    transition:opacity 1.1s ease; }
  .tank.quality-bad .water-haze { backdrop-filter:blur(3.2px) saturate(.55); -webkit-backdrop-filter:blur(3.2px) saturate(.55); }
  .night-shade { z-index:2; background:linear-gradient(180deg,rgba(0,12,27,.44),rgba(0,11,27,.66));
    opacity:var(--night-opacity); transition:opacity 1s ease; }
  .light-beam { z-index:3; inset:-7% 8% 0; opacity:var(--beam-opacity);
    background:radial-gradient(ellipse 40% 95% at 50% -8%,rgba(var(--light-rgb),.78),rgba(var(--light-rgb),.20) 52%,transparent 100%);
    mix-blend-mode:screen;
    transition:opacity 1.2s ease,background 1.1s ease; }
  .light-surface { z-index:3; inset:0 12% auto; height:72px; opacity:var(--beam-opacity);
    background:radial-gradient(ellipse at 50% 0%,rgba(var(--light-rgb),.70),transparent 72%);
    filter:blur(14px); transition:opacity .9s ease; }
  .caustics { z-index:4; opacity:calc(var(--beam-opacity) * .35); mix-blend-mode:screen;
    background:repeating-radial-gradient(ellipse at 40% -20%,transparent 0 17px,rgba(var(--light-rgb),.12) 19px 22px,transparent 25px 44px);
    transform:scale(1.15); animation:caustics 15s ease-in-out infinite alternate; }
  .scene-vignette { z-index:5; background:linear-gradient(180deg,rgba(0,16,26,.63),transparent 25%,transparent 64%,rgba(0,17,29,.84) 100%),
    linear-gradient(90deg,rgba(0,14,25,.22),transparent 34%,transparent 70%,rgba(0,14,25,.24)); }
  .flake-field { z-index:6; overflow:hidden; opacity:0; transition:opacity .6s ease; }
  .tank.feeding .flake-field { opacity:1; }
  .flake { position:absolute; top:10%; left:var(--flake-left); width:var(--flake-size); height:calc(var(--flake-size) * .52);
    border-radius:65% 40% 60% 45%; background:#e9ae67; border:1px solid rgba(255,222,170,.35);
    box-shadow:0 1px 7px rgba(235,179,99,.6); opacity:0;
    animation:flake-fall var(--flake-duration) var(--flake-delay) linear infinite; }
  .scene-ui { position:relative; z-index:7; box-sizing:border-box; min-height:358px; padding:19px;
    display:flex; flex-direction:column; justify-content:space-between; gap:12px; }
  .head { display:flex; justify-content:space-between; align-items:start; gap:12px; }
  .heading { min-width:0; }
  .eyebrow { font-size:10px; font-weight:700; letter-spacing:.16em; color:#a4dfe1; text-transform:uppercase; margin-bottom:4px; }
  .title { margin:0; font-size:clamp(20px,3.4vw,28px); font-weight:700; line-height:1.18; overflow-wrap:anywhere;
    text-shadow:0 2px 14px rgba(0,0,0,.6); }
  .connectivity { display:flex; gap:5px; align-items:center; font-size:10px; color:#d9f1f0; margin-top:8px;
    text-shadow:0 1px 9px rgba(0,0,0,.65); }
  .connectivity-dot { width:6px; height:6px; border-radius:50%; background:#6fdec6; box-shadow:0 0 8px #70ffce; }
  .connectivity.offline .connectivity-dot { background:#9aa6ae; box-shadow:none; }
  .alarms { display:flex; flex-direction:column; align-items:flex-end; gap:5px; max-width:58%; }
  .alarm { color:#ffefe7; background:rgba(91,34,23,.81); border:1px solid rgba(255,185,134,.58);
    border-radius:12px; padding:7px 9px; font:600 11px inherit; font-size:11px; cursor:pointer; display:flex;
    align-items:center; gap:6px; text-shadow:0 1px 4px #342322; backdrop-filter:blur(8px); }
  .alarm ha-icon { --mdc-icon-size:17px; color:#ffbe7f; }
  .scene-hotspot { -webkit-tap-highlight-color:transparent; position:absolute; color:#ecfcfc; cursor:pointer; appearance:none;
    font:inherit; background:rgba(4,34,45,.50); backdrop-filter:blur(9px); -webkit-backdrop-filter:blur(9px);
    border:1px solid rgba(213,247,249,.32); border-radius:18px; display:flex; flex-direction:column;
    align-items:center; justify-content:center; gap:3px; padding:8px; box-shadow:0 6px 17px rgba(0,12,23,.18);
    transition:border-color .2s ease,background .2s ease,transform .2s ease; }
  .scene-hotspot:hover { background:rgba(10,65,76,.72); border-color:rgba(221,255,249,.64); transform:translateY(-2px); }
  .scene-hotspot:focus-visible, .alarm:focus-visible, .accessory:focus-visible { outline:3px solid #fff; outline-offset:3px; }
  .scene-hotspot:disabled { cursor:default; }
  .scene-hotspot.unavailable { opacity:.65; }
  .scene-hotspot .spot-label { font-size:9px; text-transform:uppercase; letter-spacing:.115em; font-weight:720; line-height:1.1; }
  .scene-hotspot .spot-condition { font-size:10px; font-weight:630; line-height:1.2; white-space:nowrap; }
  .light-control { top:13px; left:50%; width:51px; min-height:55px; transform:translateX(-50%);
    padding:4px; border-radius:25px; background:rgba(1,27,36,.46); }
  .light-control:hover { transform:translateX(-50%) translateY(1px); }
  .light-control::before { content:''; position:absolute; bottom:100%; left:50%; height:16px; border-left:2px solid rgba(195,237,233,.5); }
  .light-control ha-icon { --mdc-icon-size:26px; color:var(--lamp-color,#c8d6da); filter:drop-shadow(0 0 6px var(--lamp-color,#d3eef4)); }
  .light-control .spot-label { font-size:8px; }
  .light-control.is-off ha-icon { color:#adbbca; filter:none; }
  .feeder-control { top:33%; right:5%; width:69px; min-height:72px; }
  .feeder-control ha-icon { --mdc-icon-size:27px; color:#f4cf92; }
  .feeder-control.is-feeding { border-color:rgba(250,220,142,.95); background:rgba(108,69,27,.65); box-shadow:0 0 27px rgba(255,189,85,.27); }
  .temperature-control { top:48%; left:4%; width:73px; min-height:119px; --level-color:#a4c1c7; }
  .temperature-control.temp-cold { --level-color:#6dc8fd; }
  .temperature-control.temp-ok { --level-color:#76edb5; }
  .temperature-control.temp-hot { --level-color:#ff956e; }
  .temperature-control.temp-unknown { --level-color:#9babb3; }
  .thermometer { position:relative; width:22px; height:60px; margin:0 0 4px; }
  .therm-stem { box-sizing:border-box; position:absolute; top:0; left:5px; width:13px; height:49px; border-radius:12px 12px 5px 5px;
    border:3px solid rgba(229,252,249,.89); background:rgba(3,31,50,.42); overflow:hidden; }
  .therm-level { position:absolute; bottom:-1px; left:2px; right:2px; height:var(--therm-height,50%); border-radius:7px;
    background:var(--level-color); box-shadow:0 0 8px var(--level-color); transition:height .9s ease,background .6s ease; }
  .therm-bulb { position:absolute; bottom:0; left:1px; width:20px; height:20px; border-radius:50%;
    box-sizing:border-box; border:3px solid rgba(229,252,249,.93); background:var(--level-color);
    box-shadow:0 0 10px var(--level-color); }
  .quality-control { top:51%; right:4%; width:79px; min-height:104px; --quality-color:#9bdee3; }
  .quality-control.quality-good { --quality-color:#67ebd2; }
  .quality-control.quality-warning { --quality-color:#f2c16d; }
  .quality-control.quality-bad { --quality-color:#ff9a77; border-color:rgba(255,160,120,.8); }
  .quality-control.quality-unknown { --quality-color:#a2b8c3; }
  .quality-control ha-icon { --mdc-icon-size:35px; color:var(--quality-color); filter:drop-shadow(0 0 9px var(--quality-color)); }
  .water-lines { display:flex; flex-direction:column; gap:3px; align-items:center; margin:0 0 2px; }
  .water-lines span { display:block; width:30px; height:3px; border-radius:15px; background:var(--quality-color); opacity:.85; }
  .water-lines span:nth-child(2) { width:21px; opacity:.62; }
  .scene-footer { align-self:center; margin-top:auto; display:flex; gap:8px; justify-content:center; flex-wrap:wrap;
    padding:7px 9px; border-radius:18px; background:rgba(2,27,40,.32); }
  .accessory { display:flex; align-items:center; justify-content:center; position:relative; width:36px; height:36px;
    background:rgba(5,34,44,.67); color:#cbf3ed; border:1px solid rgba(217,250,253,.27);
    border-radius:50%; cursor:pointer; backdrop-filter:blur(9px); }
  .accessory:hover { background:rgba(22,82,91,.92); }
  .accessory ha-icon { --mdc-icon-size:20px; }
  .accessory.off { color:#8eabb5; opacity:.77; }
  .accessory.alert { color:#ffab80; border-color:#ffb28f; box-shadow:0 0 12px rgba(255,146,89,.34); }
  .accessory.unavailable { color:#8b9aa6; opacity:.65; }
  .accessory .activity-dot { position:absolute; top:0; right:0; width:6px; height:6px; border-radius:50%; background:#74e9bc; }
  .accessory.off .activity-dot, .accessory.unavailable .activity-dot { background:#99adb9; }
  .accessory.alert .activity-dot { background:#ff8766; }
  .empty { align-self:center; max-width:300px; text-align:center; background:rgba(5,30,41,.8); border-radius:14px;
    padding:15px 18px; line-height:1.5; font-size:12px; }
  @keyframes caustics { from { transform:scale(1.12) translate(-1.5%,.5%); } to { transform:scale(1.25) translate(1%,1%); } }
  @keyframes flake-fall { 0% { opacity:0; transform:translate3d(0,0,0) rotate(-20deg); }
    10% { opacity:.95; } 75% { opacity:.8; } 100% { opacity:0; transform:translate3d(var(--flake-drift),240px,0) rotate(190deg); } }
  @media (max-width:520px) {
    .tank { min-height:368px; border-radius:20px; }
    .scene-ui { padding:14px; min-height:368px; }
    .title { font-size:22px; max-width:190px; }
    .light-control { top:10px; left:59%; }
    .feeder-control { top:33%; right:4%; }
    .temperature-control { top:53%; left:3%; }
    .quality-control { top:54%; right:3%; }
    .alarms { max-width:49%; }
    .alarm { padding:6px; font-size:10px; }
    .scene-footer { gap:5px; padding:6px; }
  }
  @media (prefers-reduced-motion:reduce) {
    .caustics { animation:none; }
    .flake { animation:none; opacity:.75; top:28%; }
    .photo,.night-shade,.light-beam,.light-surface,.water-haze,.therm-level,.flake-field { transition:none; }
    .scene-hotspot { transition:none; }
  }
`;

function normalize(value) {
  return String(value ?? "").trim().toLocaleLowerCase();
}
function labelMatch(value, term, names) {
  const query = normalize(term);
  if (!query) return false;
  const key = normalize(value);
  const resolvedName = normalize(names.get(key) || "");
  return key.includes(query) || resolvedName.includes(query);
}
function labelsFor(registry) {
  return Array.isArray(registry?.labels) ? registry.labels : [];
}
function matchAnyLabel(registry, term, names) {
  return labelsFor(registry).some((label) => labelMatch(label, term, names));
}
function validState(state) {
  return !!state && !INVALID_STATES.has(normalize(state.state));
}
function safeImage(input) {
  if (typeof input !== "string" || !input.trim()) return DEFAULT_IMAGE;
  const url = input.trim();
  // Do not allow protocol-relative, javascript:, data:, or file: URLs.
  if ((url.startsWith("/") && !url.startsWith("//")) || /^https:\/\//i.test(url)) return url;
  return DEFAULT_IMAGE;
}
function floatState(state) {
  if (!validState(state)) return null;
  const raw = String(state.state).trim().replace(",", ".");
  return /^[-+]?\d+(?:\.\d+)?$/.test(raw) && Number.isFinite(Number(raw)) ? Number(raw) : null;
}
function stateNumber(state, decimals = 1) {
  const n = floatState(state);
  if (n === null) return null;
  const places = Number.isInteger(n) ? 0 : decimals;
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: places });
}
function entityDomain(id) {
  return String(id).split(".")[0];
}
function isAllowedState(id) {
  return /^(sensor|binary_sensor|light|switch|fan|climate|number|datetime|button|select|input_boolean|input_number|input_datetime)\./.test(id);
}
function textFor(entry) {
  const state = entry.state;
  return normalize([entry.id, state?.attributes?.friendly_name, entry.registry?.name, entry.registry?.original_name,
    entry.device?.name_by_user, entry.device?.name].filter(Boolean).join(" ").replace(/[_.\/-]+/g, " "));
}
function metricCandidates(entry) {
  const domain = entityDomain(entry.id);
  const text = textFor(entry);
  const dc = normalize(entry.state?.attributes?.device_class);
  const unit = normalize(entry.state?.attributes?.unit_of_measurement);
  const result = [];
  const push = (category, score) => result.push({ category, score: score + entry.priority });
  const has = (regex) => regex.test(text);
  const measurement = domain === "sensor" || domain === "number" || domain === "input_number";
  if ((domain === "sensor" && dc === "temperature") || (measurement && has(/\b(temp(?:erature)?|temperatur|θερμοκρασ)\b/i) && /°[cfk]/i.test(unit))) {
    push("temperature", 115 + (has(/water|aquarium|tank|wasser/) ? 18 : 0));
  } else if (domain === "climate" && entry.state?.attributes?.current_temperature !== undefined) {
    push("temperature", 62);
  }
  if (measurement && (has(/\btds\b|total.?dissolved.?solids|\bppm\b/) || (unit === "ppm" && !has(/co2|carbon/)))) {
    push("tds", 125 + (has(/tds/) ? 20 : 0));
  }
  if (domain === "light") push("light", 115 + (has(/aquarium|tank|wled|chihiros/) ? 15 : 0));
  else if (domain === "switch" && has(/light|beleucht|licht|wled|led|rgb/)) push("light", 69);
  const feeder = has(/feeder|fish.?feed|futterautomat|futterspender|\bfeeding\b|\bfuetter/);
  if (feeder) {
    if (["datetime", "input_datetime"].includes(domain) && has(/last.?feed|last.?fed|letzte/)) push("feeder", 145);
    else if (domain === "sensor" && has(/next.?feed|remaining|status|state/)) push("feeder", 180);
    else if (["switch", "binary_sensor", "select"].includes(domain)) push("feeder", 165);
    else if (domain === "button" && has(/feed(?!.*restart)/)) push("feeder", 92);
    else if (measurement && has(/count|portions?/)) push("feeder", 60);
  }
  if (has(/water.?level|wasserstand|tank.?level|fuellstand/)) {
    if (["sensor", "binary_sensor"].includes(domain)) push("water_level", 120);
  }
  if (measurement && (has(/\bph\b|ph.?value|ph.?level|acidit/) || dc === "ph")) push("ph", 105);
  if (measurement && has(/salinity|salinit|salzgehalt|specific.?gravity/)) push("salinity", 105);
  if (["switch", "fan"].includes(domain) && has(/pump|filter|filtration|umwälz|umwalz/)) push("pump", 90);
  if (domain === "climate" || (domain === "switch" && has(/heat|heiz|heater/))) push("heater", domain === "climate" ? 100 : 85);
  if (domain === "binary_sensor" && has(/leak|leckage|water.?leak|flood|high.?tds|low.?water/)) push("leak", 105);
  return result;
}
function scoreWinner(entries, category, manualId, hass) {
  if (typeof manualId === "string" && hass.states[manualId]) {
    const explicit = entries.find((item) => item.id === manualId) || {
      id: manualId, state: hass.states[manualId], registry: hass.entities?.[manualId] || {}, priority: 1000,
    };
    return explicit;
  }
  const candidates = entries.flatMap((entry) => metricCandidates(entry)
    .filter((candidate) => candidate.category === category)
    .map((candidate) => ({ entry, score: candidate.score + (validState(entry.state) ? 15 : -50) })));
  candidates.sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id));
  return candidates[0]?.entry || null;
}
function aquariumIdentity(areaId, labelId) {
  return String(areaId || (labelId ? "label:" + labelId : "aquarium"));
}
function allEntries(hass) {
  const entities = hass?.entities || {};
  const devices = hass?.devices || {};
  return Object.entries(hass?.states || {}).filter(([id]) => isAllowedState(id)).map(([id, state]) => {
    const registry = entities[id] || {};
    const device = devices[registry.device_id] || {};
    const parentDevice = devices[device.parent_device_id] || {};
    const areaId = registry.area_id || device.area_id || parentDevice.area_id || null;
    return { id, state, registry, device, parentDevice, areaId, priority: 0 };
  }).filter((entry) => !entry.registry.disabled_by && !entry.registry.hidden_by &&
    !["config", "diagnostic"].includes(entry.registry.entity_category));
}
function discoverAquariums(hass, config, labelNames) {
  const areaItems = Object.values(hass.areas || {});
  const areas = new Map(areaItems.map((area) => [area.area_id || area.id, area]));
  const entries = allEntries(hass);
  const match = config.match || "Aquarium";
  const explicitTanks = Array.isArray(config.aquariums) ? config.aquariums : [];
  const group = new Map();
  if (explicitTanks.length) {
    explicitTanks.forEach((definition, index) => {
      const areaMatch = normalize(definition.area);
      const area = areaMatch ? areaItems.find((item) => [item.area_id, item.name].some((v) => normalize(v) === areaMatch)) : null;
      const areaId = area?.area_id || (areas.has(definition.area) ? definition.area : null);
      const label = definition.label;
      const subset = entries.filter((entry) => {
        if (areaMatch && entry.areaId !== areaId) return false;
        if (label && !matchAnyLabel(entry.registry, label, labelNames) &&
          !matchAnyLabel(entry.device, label, labelNames) &&
          !matchAnyLabel(entry.parentDevice, label, labelNames) &&
          !matchAnyLabel(areas.get(entry.areaId), label, labelNames)) return false;
        return !!(areaMatch || label);
      });
      const overrides = Object.values(definition.entities || {}).filter((id) => typeof id === "string");
      for (const id of overrides) {
        if (hass.states[id] && !subset.some((e) => e.id === id)) {
          subset.push({ id, state: hass.states[id], registry: hass.entities?.[id] || {}, priority: 1000 });
        }
      }
      group.set("manual:" + index, {
        name: definition.name || area?.name || "Aquarium " + (index + 1),
        image: definition.image || config.image, entities: subset, overrides: definition.entities || {}, definition,
      });
    });
  } else {
    for (const entry of entries) {
      const area = areas.get(entry.areaId);
      const matchArea = area && (labelMatch(area.name, match, labelNames) || matchAnyLabel(area, match, labelNames));
      const direct = matchAnyLabel(entry.registry, match, labelNames) || matchAnyLabel(entry.device, match, labelNames) || matchAnyLabel(entry.parentDevice, match, labelNames);
      // Name fallback makes unlabelled ESPHome helpers discoverable, without pulling in unrelated entities.
      const named = (normalize(entry.id) + " " + normalize(entry.state?.attributes?.friendly_name)).includes(normalize(match)) && metricCandidates(entry).length > 0;
      if (!matchArea && !direct && !named) continue;
      const customLabel = [
        ...labelsFor(entry.registry), ...labelsFor(entry.device), ...labelsFor(entry.parentDevice), ...labelsFor(area),
      ].find((value) => labelMatch(value, match, labelNames) &&
        normalize(labelNames.get(normalize(value)) || value) !== normalize(match));
      const key = customLabel ? "label:" + customLabel : aquariumIdentity(entry.areaId, null);
      if (!group.has(key)) {
        group.set(key, {
          name: customLabel ? (labelNames.get(normalize(customLabel)) || customLabel) : area?.name || match,
          image: config.image, entities: [], overrides: {}, definition: {},
        });
      }
      group.get(key).entities.push({ ...entry, priority: direct ? 65 : matchArea ? 20 : 5 });
    }
    if (!group.size) group.set("empty", { name: match, image: config.image, entities: [], overrides: {}, definition: {} });
  }
  return [...group.entries()].map(([key, tank]) => {
    const selections = {};
    for (const category of [...CATEGORY_ORDER, "leak"]) {
      selections[category] = scoreWinner(tank.entities, category, tank.overrides[category], hass);
    }
    return { ...tank, key, selections };
  });
}
function shortRelative(value, language) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 0 || minutes > 525600) return null;
  const unit = minutes < 60 ? "minute" : minutes < 1440 ? "hour" : "day";
  const n = unit === "minute" ? minutes : unit === "hour" ? Math.floor(minutes / 60) : Math.floor(minutes / 1440);
  try { return new Intl.RelativeTimeFormat(language || "en", { numeric: "auto", style: "short" }).format(-n, unit); }
  catch { return n + (unit === "minute" ? "m" : unit === "hour" ? "h" : "d") + " ago"; }
}
function warningEntities(entries) {
  return entries.filter((entry) => {
    if (entityDomain(entry.id) !== "binary_sensor" || entry.state?.state !== "on") return false;
    const text = textFor(entry);
    return /leak|leckage|flood|high.?tds|low.?water|low.?level|problem|alarm/.test(text) ||
      (entry.state?.attributes?.device_class === "problem" && /water.?level|tds/.test(text));
  });
}
function presentation(category, entry, hass, warnings) {
  const state = entry?.state;
  if (!state) return null;
  const attr = state.attributes || {};
  const available = validState(state);
  const unit = attr.unit_of_measurement || "";
  const label = CATEGORY_INFO[category].label;
  let value = available ? String(state.state) : "—";
  let detail = "";
  let color = CATEGORY_INFO[category].color;
  let alert = false;
  let off = false;
  if (["temperature", "tds", "ph", "salinity", "water_level"].includes(category)) {
    let numeric = stateNumber(state, category === "ph" ? 2 : 1);
    if (category === "temperature" && entityDomain(entry.id) === "climate") {
      const raw = attr.current_temperature;
      const n = raw !== null && raw !== undefined && String(raw).trim() !== "" ? Number(raw) : NaN;
      numeric = Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 1 }) : null;
    }
    if (numeric !== null) value = numeric;
    if (category === "temperature" && !unit && entityDomain(entry.id) === "climate") {
      return { label, icon: CATEGORY_INFO[category].icon, value,
        unit: hass.config?.unit_system?.temperature || "°C", detail, color, off, alert, available };
    }
    if (numeric !== null && category === "tds") detail = "Total dissolved solids";
    if (category === "tds" && warnings.some((e) => /high.?tds/.test(textFor(e)))) alert = true;
    if (category === "water_level" && state.state === "on" && attr.device_class === "problem") alert = true;
    if (category === "water_level" && ["binary_sensor", "input_boolean"].includes(entityDomain(entry.id))) {
      value = available ? state.state === "on" ? (alert ? "Alert" : "Detected") : "Clear" : "—";
    }
    return { label, icon: CATEGORY_INFO[category].icon, value, unit: numeric !== null ? unit : "", detail, color, off, alert, available };
  }
  if (category === "light") {
    off = state.state === "off";
    value = available ? off ? "Off" : state.state === "on" ? "On" : state.state : "—";
    detail = !off && available && attr.effect && attr.effect !== "None" ? String(attr.effect) : "";
    const rgb = attr.rgb_color;
    if (available && !off && Array.isArray(rgb) && rgb.length >= 3 && rgb.slice(0, 3).every((n) => Number.isFinite(Number(n)))) {
      color = "rgb(" + rgb.slice(0, 3).map((n) => Math.min(255, Math.max(0, Number(n)))).join(",") + ")";
    } else if (available && !off && Array.isArray(attr.hs_color)) {
      color = "hsl(" + Number(attr.hs_color[0]) + " 100% 75%)";
    }
  } else if (category === "feeder") {
    const domain = entityDomain(entry.id);
    if (domain === "datetime" || /last.?feed|last.?fed/.test(textFor(entry))) {
      const relative = shortRelative(state.state, hass.locale?.language || hass.language);
      value = available && relative ? "Fed" : available ? "Scheduled" : "—";
      detail = relative || "";
    } else if (domain === "button") {
      value = available ? "Ready" : "—";
      detail = "Open feeder";
    } else if (domain === "sensor" && /next.?feed/.test(textFor(entry))) {
      const relative = shortRelative(state.state, hass.locale?.language || hass.language);
      value = available ? "Scheduled" : "—";
      detail = relative || String(state.state);
    } else {
      value = available ? state.state === "on" ? "Active" : state.state === "off" ? "Idle" : String(state.state) : "—";
    }
    value = String(value).slice(0, 26);
  } else {
    off = state.state === "off";
    value = available ? state.state === "on" ? "On" : state.state === "off" ? "Off" : state.state : "—";
    if (category === "heater" && entityDomain(entry.id) === "climate") {
      const action = attr.hvac_action;
      value = available ? action === "heating" ? "Heating" : action === "idle" ? "Idle" : state.state : "—";
      detail = action && action !== state.state ? action : "";
    }
  }
  return { label, icon: CATEGORY_INFO[category].icon, value, unit: "", detail, color, off, alert, available };
}
/** Colour extraction is limited to numeric light attributes, never HTML/CSS strings from entities. */
function lightRgb(state) {
  const attrs = state?.attributes || {};
  const components = attrs.rgb_color;
  if (Array.isArray(components) && components.length >= 3 && components.slice(0, 3).every((v) => Number.isFinite(Number(v)))) {
    return components.slice(0, 3).map((v) => Math.max(0, Math.min(255, Math.round(Number(v)))));
  }
  if (Array.isArray(attrs.hs_color) && attrs.hs_color.length === 2 && attrs.hs_color.every((v) => Number.isFinite(Number(v)))) {
    const h = (((Number(attrs.hs_color[0]) % 360) + 360) % 360) / 60;
    const s = Math.max(0, Math.min(1, Number(attrs.hs_color[1]) / 100));
    const chroma = s;
    const secondary = chroma * (1 - Math.abs(h % 2 - 1));
    const [r, g, b] = h < 1 ? [chroma, secondary, 0] : h < 2 ? [secondary, chroma, 0] : h < 3 ? [0, chroma, secondary]
      : h < 4 ? [0, secondary, chroma] : h < 5 ? [secondary, 0, chroma] : [chroma, 0, secondary];
    return [r, g, b].map((v) => Math.round(255 * (v + (1 - chroma))));
  }
  const kelvin = Number(attrs.color_temp_kelvin);
  if (Number.isFinite(kelvin) && kelvin >= 1000 && kelvin <= 40000) {
    const k = kelvin / 100;
    const r = k <= 66 ? 255 : 329.698727446 * Math.pow(k - 60, -0.1332047592);
    const g = k <= 66 ? 99.4708025861 * Math.log(k) - 161.1195681661
      : 288.1221695283 * Math.pow(k - 60, -0.0755148492);
    const b = k >= 66 ? 255 : k <= 19 ? 0 : 138.5177312231 * Math.log(k - 10) - 305.0447927307;
    return [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))));
  }
  return [192, 219, 248];
}
function limitSetting(tank, config, key) {
  const own = tank.definition?.[key];
  const inherited = config?.[key];
  const value = own === undefined || own === null || own === "" ? inherited : own;
  return value === null || value === undefined || value === "" || !Number.isFinite(Number(value)) ? null : Number(value);
}
function temperatureCondition(entry, tank, config) {
  if (!entry || !validState(entry.state)) return { level: "unknown", label: "Unavailable", height: 30 };
  const state = entry.state;
  const climateRaw = state.attributes?.current_temperature;
  const raw = entityDomain(entry.id) === "climate"
    ? (climateRaw === null || climateRaw === undefined || climateRaw === "" ? NaN : Number(climateRaw)) : floatState(state);
  if (!Number.isFinite(raw)) return { level: "unknown", label: "Unavailable", height: 30 };
  const min = limitSetting(tank, config, "temperature_min");
  const max = limitSetting(tank, config, "temperature_max");
  if (min === null || max === null || min >= max) return { level: "unknown", label: "Set range", height: 47 };
  if (raw < min) return { level: "cold", label: "Too cold", height: 22 };
  if (raw > max) return { level: "hot", label: "Too warm", height: 83 };
  return { level: "ok", label: "In range", height: 52 };
}
function waterCondition(entry, warnings, tank, config) {
  const highTds = warnings.some((item) => /high.?tds|tds.?high|ppm.?high/i.test(textFor(item)));
  if (highTds) return { level: "bad", label: "High TDS", haze: .70 };
  if (!entry || !validState(entry.state)) return { level: "unknown", label: "Unavailable", haze: 0 };
  const n = floatState(entry.state);
  const goodMax = limitSetting(tank, config, "tds_good_max");
  const warnMax = limitSetting(tank, config, "tds_warn_max");
  if (n === null || goodMax === null || warnMax === null || goodMax < 0 || warnMax <= goodMax) {
    return { level: "unknown", label: "Set range", haze: 0 };
  }
  if (n <= goodMax) return { level: "good", label: "In range", haze: 0 };
  if (n <= warnMax) return { level: "warning", label: "Check TDS", haze: .32 };
  return { level: "bad", label: "High TDS", haze: .70 };
}
function feedingCondition(entries, selected, tank, config, now = Date.now()) {
  const duration = limitSetting(tank, config, "feeding_duration");
  const durationMs = Math.min(600, Math.max(5, duration ?? 90)) * 1000;
  const candidates = selected && !entries.some((e) => e.id === selected.id) ? [...entries, selected] : entries;
  let remainingMs = 0;
  for (const entry of candidates) {
    const text = textFor(entry);
    const state = entry.state;
    if (!validState(state)) continue;
    const domain = entityDomain(entry.id);
    const lastFeed = /last.?feed|last.?fed|letzte.?fütter|letzte.?futter/i.test(text);
    const explicitlyFeeding = /feeding.?active|active.?feeding|dispens(?:ing|e)|f[uü]tterung.?aktiv/i.test(text);
    if (lastFeed && ["datetime", "sensor", "input_datetime", "button"].includes(domain)) {
      const haTimestamp = Number(state.attributes?.timestamp);
      const timestamp = Number.isFinite(haTimestamp) && haTimestamp > 1000000000
        ? haTimestamp * 1000 : Date.parse(state.state);
      if (Number.isFinite(timestamp)) {
        const left = durationMs - (now - timestamp);
        if (left > 0 && left <= durationMs) remainingMs = Math.max(remainingMs, left);
      }
    }
    if (explicitlyFeeding && ["binary_sensor", "switch", "input_boolean", "sensor"].includes(domain) &&
        ["on", "feeding", "dispensing", "active", "running"].includes(normalize(state.state))) {
      const timestamp = Date.parse(state.last_changed || "");
      // Honour a live feeding signal, but never animate indefinitely after the last known activation.
      if (Number.isFinite(timestamp)) {
        const left = durationMs - (now - timestamp);
        if (left > 0 && left <= durationMs) remainingMs = Math.max(remainingMs, left);
      } else {
        remainingMs = Math.max(remainingMs, durationMs);
      }
    }
  }
  return { active: remainingMs > 0, remainingMs };
}
function sceneState(tank, hass, config, now = Date.now()) {
  const warnings = warningEntities(tank.entities);
  const lighting = tank.selections.light?.state;
  const lightActive = !!lighting && validState(lighting) && lighting.state === "on";
  const lightKnown = !!lighting && validState(lighting);
  const rgb = lightRgb(lighting);
  const brightness = Number(lighting?.attributes?.brightness);
  const strength = Number.isFinite(brightness) && brightness >= 0 && brightness <= 255 ? brightness / 255 : .80;
  const temperature = temperatureCondition(tank.selections.temperature, tank, config);
  const quality = waterCondition(tank.selections.tds, warnings, tank, config);
  const feeding = feedingCondition(tank.entities, tank.selections.feeder, tank, config, now);
  return { warnings, temperature, quality, feeding,
    light: { active: lightActive, known: lightKnown, color: rgb, opacity: lightActive ? .38 + .53 * strength : 0,
      darkness: lightKnown && !lightActive ? .64 : 0, photoBrightness: lightKnown ? (lightActive ? .95 + .25 * strength : .64) : 1 },
  };
}

function make(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined && text !== null) el.textContent = text;
  return el;
}

class HAAquariumCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = { match: "Aquarium", max_metrics: 5 };
    this._labels = new Map();
    this._renderedIds = new Set();
    this._previousHass = null;
    this._registrySignature = null;
    this._labelConnection = null;
    this._labelLoading = false;
    this._unsubscribeLabels = null;
    this._feedingTimer = null;
    this._nextFeedingRefresh = Infinity;
    this._stylesheet = make("style", null, STYLES);
    this._frame = make("ha-card");
    this._collection = make("div", "collection");
    this._frame.append(this._collection);
    this.shadowRoot.append(this._stylesheet, this._frame);
  }
  static getStubConfig() { return { match: "Aquarium", max_metrics: 5 }; }
  static getConfigElement() { return document.createElement("ha-aquarium-card-editor"); }
  setConfig(config) {
    if (!config || typeof config !== "object" || Array.isArray(config)) throw new Error("Aquarium Card: invalid configuration");
    this._config = { match: "Aquarium", max_metrics: 5, ...config };
    this._render();
  }
  getCardSize() { return Math.max(3, this._tankCount * 4 || 4); }
  getGridOptions() { return { columns: 12, min_columns: 3, rows: Math.max(3, (this._tankCount || 1) * 3) }; }
  set hass(hass) {
    const previous = this._previousHass;
    const registrySignature = [hass.entities, hass.devices, hass.areas];
    const registryChanged = !this._registrySignature || registrySignature.some((value, i) => value !== this._registrySignature[i]);
    const changed = !previous || registryChanged || previous.connected !== hass.connected ||
      [...this._renderedIds].some((id) => previous.states[id] !== hass.states[id]);
    this._hass = hass;
    this._previousHass = hass;
    this._registrySignature = registrySignature;
    if (hass.connection && hass.connection !== this._labelConnection) {
      this._labelConnection = hass.connection;
      this._subscribeLabels();
    }
    if (changed) this._render();
  }
  connectedCallback() {
    if (this._hass && !this._labelConnection) this._subscribeLabels();
  }
  disconnectedCallback() {
    if (typeof this._unsubscribeLabels === "function") this._unsubscribeLabels();
    this._unsubscribeLabels = null;
    this._labelConnection = null;
    if (this._feedingTimer !== null) { clearTimeout(this._feedingTimer); this._feedingTimer = null; }
  }
  async _subscribeLabels() {
    const connection = this._hass?.connection;
    if (this._unsubscribeLabels) { this._unsubscribeLabels(); this._unsubscribeLabels = null; }
    await this._reloadLabels();
    if (connection && connection === this._hass?.connection && !this._unsubscribeLabels && typeof connection.subscribeEvents === "function") {
      try {
        this._unsubscribeLabels = await connection.subscribeEvents(() => {
          this._reloadLabels();
        }, "label_registry_updated");
      } catch { /* Some users cannot subscribe to registry events; changes show after reload. */ }
    }
  }
  async _reloadLabels() {
    if (!this._hass?.callWS || this._labelLoading) return;
    const connection = this._hass.connection;
    this._labelLoading = true;
    try {
      const labels = await this._hass.callWS({ type: "config/label_registry/list" });
      if (connection !== this._hass?.connection) return;
      this._labels = new Map((Array.isArray(labels) ? labels : []).map((item) =>
        [normalize(item.label_id), item.name]));
      this._render();
    } catch (error) {
      // ID-based label matching and area discovery remain operational without access.
      console.debug("HA Aquarium Card: label registry not accessible", error);
    } finally {
      this._labelLoading = false;
    }
  }
  _discover() { return this._hass ? discoverAquariums(this._hass, this._config, this._labels) : []; }
  _moreInfo(entityId) {
    this.dispatchEvent(new CustomEvent("hass-more-info", {
      detail: { entityId }, bubbles: true, composed: true,
    }));
  }
  _openButton(entry, name, condition, iconName, classes = "") {
    const button = make("button", "scene-hotspot " + classes);
    button.type = "button";
    button.title = name + ": " + condition + ". Open entity details";
    button.setAttribute("aria-label", name + ": " + condition + ". Open entity details");
    button.addEventListener("click", () => this._moreInfo(entry.id));
    if (iconName) {
      const icon = make("ha-icon");
      icon.setAttribute("icon", iconName);
      button.append(icon);
    }
    return button;
  }
  _tankElement(tank) {
    for (const entry of tank.entities) this._renderedIds.add(entry.id);
    for (const entry of Object.values(tank.selections)) if (entry) this._renderedIds.add(entry.id);
    const scene = sceneState(tank, this._hass, this._config);
    if (scene.feeding.active && Number.isFinite(scene.feeding.remainingMs)) {
      this._nextFeedingRefresh = Math.min(this._nextFeedingRefresh, scene.feeding.remainingMs);
    }
    const section = make("section", "tank");
    section.dataset.key = tank.key;
    section.classList.add("quality-" + scene.quality.level);
    if (scene.feeding.active) section.classList.add("feeding");
    if (scene.light.known) section.classList.add(scene.light.active ? "light-on" : "light-off");
    section.style.setProperty("--light-rgb", scene.light.color.join(","));
    section.style.setProperty("--beam-opacity", scene.light.opacity.toFixed(3));
    section.style.setProperty("--photo-brightness", String(scene.light.photoBrightness));
    section.style.setProperty("--night-opacity", String(scene.light.darkness));
    section.style.setProperty("--haze-opacity", String(scene.quality.haze));
    const photo = make("div", "photo");
    photo.style.backgroundImage = "url(" + JSON.stringify(safeImage(tank.image)) + ")";
    section.append(photo, make("div", "water-haze"), make("div", "night-shade"),
      make("div", "light-beam"), make("div", "light-surface"), make("div", "caustics"), make("div", "scene-vignette"));
    const flakes = make("div", "flake-field");
    flakes.setAttribute("aria-hidden", "true");
    if (scene.feeding.active) {
      for (let i = 0; i < 13; i++) {
        const flake = make("span", "flake");
        flake.style.setProperty("--flake-left", (62 + (i * 17 % 23)) + "%");
        flake.style.setProperty("--flake-size", (3 + i % 4) + "px");
        flake.style.setProperty("--flake-duration", (4.3 + i % 5 * .54) + "s");
        flake.style.setProperty("--flake-delay", (-i * .57) + "s");
        flake.style.setProperty("--flake-drift", (-30 + i * 13 % 55) + "px");
        flakes.append(flake);
      }
    }
    section.append(flakes);
    const ui = make("div", "scene-ui");
    const head = make("div", "head");
    const heading = make("div", "heading");
    heading.append(make("div", "eyebrow", "Aquarium"), make("h2", "title", tank.name));
    const connection = make("div", "connectivity" + (this._hass.connected === false ? " offline" : ""));
    connection.append(make("span", "connectivity-dot"), make("span", null, this._hass.connected === false ? "Offline" : tank.entities.length ? "Live conditions" : "No devices found"));
    heading.append(connection);
    head.append(heading);
    const alarms = make("div", "alarms");
    for (const warning of scene.warnings.slice(0, 2)) {
      const alert = make("button", "alarm");
      alert.type = "button";
      const icon = make("ha-icon");
      icon.setAttribute("icon", "mdi:alert-circle-outline");
      alert.append(icon, make("span", null, warning.state?.attributes?.friendly_name || "Aquarium alert"));
      alert.addEventListener("click", () => this._moreInfo(warning.id));
      alert.title = "View " + warning.id;
      alarms.append(alert);
    }
    head.append(alarms);
    ui.append(head);
    const requestedMax = Number(this._config.max_metrics);
    const maximum = Number.isFinite(requestedMax) ? Math.min(8, Math.max(2, Math.round(requestedMax))) : 5;
    const primary = ["light", "temperature", "tds", "feeder"].filter((category) => !!tank.selections[category]).slice(0, maximum);
    const extras = ["water_level", "pump", "heater", "ph", "salinity"].filter((category) => !!tank.selections[category])
      .slice(0, Math.max(0, maximum - primary.length));
    for (const category of primary) {
      const entry = tank.selections[category];
      const p = presentation(category, entry, this._hass, scene.warnings);
      if (category === "light") {
        const label = scene.light.active ? (p.detail ? "On · " + p.detail : "On") : scene.light.known ? "Off" : "Unavailable";
        const lamp = this._openButton(entry, "Lighting", label, "mdi:ceiling-light", "light-control" + (scene.light.active ? "" : " is-off"));
        lamp.style.setProperty("--lamp-color", scene.light.active ? "rgb(" + scene.light.color.join(",") + ")" : "#b0c9d5");
        lamp.append(make("span", "spot-label", "Light"));
        ui.append(lamp);
      } else if (category === "temperature") {
        const level = scene.temperature;
        const thermometer = this._openButton(entry, "Temperature", level.label, null, "temperature-control temp-" + level.level);
        thermometer.style.setProperty("--therm-height", level.height + "%");
        const graphic = make("span", "thermometer");
        const stem = make("span", "therm-stem");
        stem.append(make("span", "therm-level"));
        graphic.append(stem, make("span", "therm-bulb"));
        thermometer.append(graphic, make("span", "spot-label", "Temp"), make("span", "spot-condition", level.label));
        ui.append(thermometer);
      } else if (category === "tds") {
        const level = scene.quality;
        const quality = this._openButton(entry, "TDS", level.label, "mdi:water", "quality-control quality-" + level.level);
        const lines = make("span", "water-lines");
        lines.append(make("span"), make("span"));
        quality.append(lines, make("span", "spot-label", "Water"), make("span", "spot-condition", level.label));
        ui.append(quality);
      } else if (category === "feeder") {
        const label = scene.feeding.active ? "Feeding" : p.available ? "Ready" : "Unavailable";
        const feeder = this._openButton(entry, "Feeder", label, "mdi:food-variant", "feeder-control" + (scene.feeding.active ? " is-feeding" : ""));
        feeder.append(make("span", "spot-label", "Feeder"), make("span", "spot-condition", label));
        ui.append(feeder);
      }
    }
    if (extras.length) {
      const footer = make("div", "scene-footer");
      for (const category of extras) {
        const entry = tank.selections[category];
        const p = presentation(category, entry, this._hass, scene.warnings);
        const badge = make("button", ["accessory", p.off ? "off" : "", p.alert ? "alert" : "", !p.available ? "unavailable" : ""].filter(Boolean).join(" "));
        badge.type = "button";
        badge.title = p.label + ". Open entity details";
        badge.setAttribute("aria-label", p.label + ". Open entity details");
        const icon = make("ha-icon");
        icon.setAttribute("icon", p.icon);
        badge.append(icon);
        if (["pump", "heater"].includes(category)) badge.append(make("span", "activity-dot"));
        badge.addEventListener("click", () => this._moreInfo(entry.id));
        footer.append(badge);
      }
      ui.append(footer);
    }
    if (!primary.length && !extras.length) {
      ui.append(make("div", "empty", tank.entities.length ?
        "No supported aquarium sensors found. Map entities in the card configuration." :
        "Assign the aquarium area or label, or choose entities in the card editor."));
    }
    section.append(ui);
    return section;
  }
  _render() {
    if (!this._hass || !this._collection) return;
    if (this._feedingTimer !== null) { clearTimeout(this._feedingTimer); this._feedingTimer = null; }
    this._nextFeedingRefresh = Infinity;
    const aquariums = this._discover();
    this._tankCount = aquariums.length;
    this._renderedIds = new Set();
    const existing = new Map([...this._collection.querySelectorAll("section.tank")]
      .map((section) => [section.dataset.key, section]));
    const nodes = aquariums.map((tank) => {
      const next = this._tankElement(tank);
      const previous = existing.get(tank.key);
      if (!previous) return next;
      previous.className = next.className;
      for (const property of ["--light-rgb", "--beam-opacity", "--photo-brightness", "--night-opacity", "--haze-opacity"]) {
        previous.style.setProperty(property, next.style.getPropertyValue(property));
      }
      previous.querySelector(".photo").style.backgroundImage = next.querySelector(".photo").style.backgroundImage;
      if (previous.classList.contains("feeding") !== !!previous.querySelector(".flake-field .flake")) {
        previous.querySelector(".flake-field").replaceWith(next.querySelector(".flake-field"));
      }
      previous.querySelector(".scene-ui").replaceWith(next.querySelector(".scene-ui"));
      return previous;
    });
    const currentNodes = [...this._collection.children];
    if (nodes.length !== currentNodes.length || nodes.some((node, i) => node !== currentNodes[i])) {
      this._collection.replaceChildren(...nodes);
    }
    if (Number.isFinite(this._nextFeedingRefresh) && this.isConnected) {
      this._feedingTimer = setTimeout(() => {
        this._feedingTimer = null;
        this._render();
      }, Math.max(50, Math.ceil(this._nextFeedingRefresh) + 30));
    }
  }

}

class HAAquariumCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = { match: "Aquarium", max_metrics: 5 };
    this.shadowRoot.innerHTML = `<style>
      :host { display: block; font-family: var(--paper-font-body1_-_font-family, sans-serif); }
      .editor { display: grid; gap: 14px; padding: 12px 0; }
      label { display: grid; gap: 5px; color: var(--primary-text-color); font-size: 12px; font-weight: 640; }
      input, select { box-sizing: border-box; width: 100%; font: inherit; font-size: 14px; padding: 10px 11px;
        border: 1px solid var(--divider-color, #9aa); border-radius: 10px; background: var(--card-background-color, #fff);
        color: var(--primary-text-color); }
      .two { display: grid; grid-template-columns: repeat(auto-fit, minmax(135px, 1fr)); gap: 10px; }
      .tank-edit { border: 1px solid var(--divider-color, #9aa); padding: 12px; border-radius: 13px;
        display: grid; gap: 10px; }
      .tank-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
      .hint { color: var(--secondary-text-color); font-size: 12px; line-height: 1.4; }
      button { appearance: none; border: 1px solid var(--divider-color, #9aa); padding: 9px 13px; border-radius: 10px;
        background: var(--secondary-background-color, #f4f5f5); color: var(--primary-text-color); font-weight: 650; cursor: pointer; }
      .remove { color: var(--error-color, #c44); }
      details { border:1px solid var(--divider-color,#9aa); border-radius:12px; padding:11px; }
      summary { font-weight:670; cursor:pointer; }
      .settings { margin-top:10px; display:grid; gap:9px; }
      .range-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:10px; }
      .subhint { margin-top:8px; color:var(--secondary-text-color); font-size:11px; line-height:1.4; }
    </style><div class="editor"></div>`;
    this._editor = this.shadowRoot.querySelector(".editor");
  }
  setConfig(config) {
    const next = { match: "Aquarium", max_metrics: 5, ...config };
    const signature = JSON.stringify(next);
    if (this._signature === signature) return;
    this._config = next;
    this._signature = signature;
    this._render();
  }
  set hass(hass) {
    const previous = this._hass;
    this._hass = hass;
    if (!previous || previous.areas !== hass.areas) this._render();
  }
  _emit() {
    this._signature = JSON.stringify(this._config);
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: { ...this._config } }, bubbles: true, composed: true,
    }));
  }
  _field(container, caption, value, onInput, options = null) {
    const label = make("label", null, caption);
    const input = options ? make("select") : make("input");
    if (options) {
      options.forEach(([id, name]) => {
        const option = make("option", null, name);
        option.value = id;
        input.append(option);
      });
    } else {
      input.type = "text";
    }
    input.value = value ?? "";
    input.addEventListener("change", (event) => onInput(event.target.value));
    // Native input events allow instant preview without stealing focus from an active editor field.
    if (!options) input.addEventListener("input", (event) => onInput(event.target.value));
    label.append(input);
    container.append(label);
    return input;
  }
  _render() {
    if (!this._editor) return;
    this._editor.replaceChildren();
    const two = make("div", "two");
    this._field(two, "Area/label match word", this._config.match || "Aquarium", (value) => {
      this._config.match = value;
      this._emit();
    });
    this._field(two, "Maximum readings per aquarium", String(this._config.max_metrics ?? 5), (value) => {
      this._config.max_metrics = Math.min(8, Math.max(2, Number(value) || 5));
      this._emit();
    }, Array.from({ length: 7 }, (_, i) => [String(i + 2), String(i + 2)]));
    this._editor.append(two);
    const conditionSettings = make("details");
    const summary = make("summary", null, "Water condition ranges & feeding animation");
    conditionSettings.append(summary);
    const conditionFields = make("div", "settings");
    const conditions = make("div", "range-grid");
    for (const [key, caption] of [
      ["temperature_min", "Minimum water temperature"], ["temperature_max", "Maximum water temperature"],
      ["tds_good_max", "TDS good up to (ppm)"], ["tds_warn_max", "TDS warning up to (ppm)"],
      ["feeding_duration", "Show flakes for (seconds)"],
    ]) {
      this._field(conditions, caption, this._config[key] ?? "", (value) => {
        this._config[key] = value.trim();
        this._emit();
      });
    }
    conditionFields.append(conditions, make("div", "subhint",
      "Set the temperature range in the same unit as your HA temperature sensor (°C or °F). TDS thresholds depend on your aquarium's inhabitants. Leaving thresholds blank makes the cue neutral, never falsely healthy. A high-TDS alarm remains authoritative."));
    conditionSettings.append(conditionFields);
    this._editor.append(conditionSettings);
    this._field(this._editor, "Default background image URL (optional)", this._config.image || "", (value) => {
      this._config.image = value.trim();
      this._emit();
    });
    this._editor.append(make("div", "hint", "With no manually defined tanks, every matching area appears as a separate aquarium. To make multiple tanks in one area, add individual aquariums below and assign a unique label to each."));
    const tanks = Array.isArray(this._config.aquariums) ? this._config.aquariums : [];
    const areas = Object.values(this._hass?.areas || {});
    tanks.forEach((tank, index) => {
      const block = make("div", "tank-edit");
      const header = make("div", "tank-head");
      header.append(make("strong", null, "Aquarium " + (index + 1)));
      const remove = make("button", "remove", "Remove");
      remove.type = "button";
      remove.addEventListener("click", () => {
        this._config.aquariums = tanks.filter((_, i) => i !== index);
        this._emit(); this._render();
      });
      header.append(remove);
      block.append(header);
      this._field(block, "Display name", tank.name || "", (value) => {
        tank.name = value;
        this._emit();
      });
      const areaOptions = [["", "All areas / label only"], ...areas.map((area) => [area.area_id, area.name])];
      if (tank.area && !areaOptions.some(([id]) => id === tank.area)) areaOptions.push([tank.area, tank.area]);
      this._field(block, "Area", tank.area || "", (value) => { tank.area = value; this._emit(); }, areaOptions);
      this._field(block, "Aquarium label name or ID (optional)", tank.label || "", (value) => { tank.label = value; this._emit(); });
      this._field(block, "Background image URL", tank.image || "", (value) => { tank.image = value; this._emit(); });
      const tankThresholds = make("details");
      tankThresholds.append(make("summary", null, "Optional per-aquarium ranges"));
      const group = make("div", "settings");
      const localRanges = make("div", "range-grid");
      for (const [key, caption] of [
        ["temperature_min", "Minimum temperature"], ["temperature_max", "Maximum temperature"],
        ["tds_good_max", "TDS good max (ppm)"], ["tds_warn_max", "TDS warning max (ppm)"],
        ["feeding_duration", "Flakes duration (seconds)"],
      ]) {
        this._field(localRanges, caption, tank[key] ?? "", (value) => {
          tank[key] = value.trim();
          this._emit();
        });
      }
      group.append(localRanges, make("div", "subhint", "Blank values inherit the global range above."));
      tankThresholds.append(group);
      block.append(tankThresholds);
      this._editor.append(block);
    });
    const add = make("button", null, "+ Add aquarium");
    add.type = "button";
    add.addEventListener("click", () => {
      this._config.aquariums = [...tanks, { name: "Aquarium " + (tanks.length + 1), area: "", label: "", image: "" }];
      this._emit(); this._render();
    });
    this._editor.append(add);
  }
}
if (!customElements.get("ha-aquarium-card")) customElements.define("ha-aquarium-card", HAAquariumCard);
if (!customElements.get("ha-aquarium-card-editor")) customElements.define("ha-aquarium-card-editor", HAAquariumCardEditor);
window.customCards = window.customCards || [];
if (!window.customCards.some((item) => item.type === "ha-aquarium-card")) {
  window.customCards.push({
    type: "ha-aquarium-card", name: "Aquarium Card",
    description: "A living aquarium scene with visual temperature, lighting, feeding and water conditions",
    documentationURL: "https://github.com/Chreece/Ha-Aquarium-Card",
    preview: true,
  });
}
console.info("%c HA Aquarium Card " + AQUARIUM_CARD_VERSION + " ", "color:#0d3448;background:#8de3e8;font-weight:bold");

// Pure helpers are exported for offline tests. This does not add a runtime dependency.
export { discoverAquariums, metricCandidates, presentation, warningEntities, safeImage, validState, lightRgb, temperatureCondition, waterCondition, feedingCondition, sceneState };