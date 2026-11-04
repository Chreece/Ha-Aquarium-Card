/**
 * HA Aquarium Card — dependency-free Home Assistant dashboard card.
 * Copyright (c) 2026 HA Aquarium Card contributors. MIT licensed.
 */
const AQUARIUM_CARD_VERSION = "0.1.0";
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
  :host { display: block; color: var(--primary-text-color); }
  ha-card { background: transparent; border: 0; box-shadow: none; overflow: visible; }
  .collection { display: grid; gap: 16px; }
  .tank { position: relative; min-height: 306px; isolation: isolate; overflow: hidden; border-radius: 24px;
    background: #093044; color: #fff; box-shadow: 0 16px 35px rgba(4, 22, 35, .20);
    border: 1px solid rgba(130, 205, 222, .26); }
  .tank-photo { position: absolute; inset: 0; z-index: -2; background-size: cover; background-position: center;
    background-repeat: no-repeat; background-color: #083046; transform: scale(1.005); }
  .tank::before { content: ''; position: absolute; inset: 0; z-index: -1; pointer-events: none;
    background: linear-gradient(180deg, rgba(0, 20, 34, .76) 0%, rgba(2, 25, 42, .13) 36%, rgba(3, 29, 43, .39) 54%, rgba(1, 18, 33, .92) 100%); }
  .contents { padding: 20px; min-height: 266px; display: flex; flex-direction: column; justify-content: space-between; gap: 22px; }
  .head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
  .identity { min-width: 0; }
  .eyebrow { font-size: 10px; font-weight: 700; letter-spacing: .19em; text-transform: uppercase; color: #9fece6; margin-bottom: 5px; }
  .title { margin: 0; font-weight: 730; font-size: clamp(21px, 4vw, 28px); line-height: 1.15;
    overflow-wrap: anywhere; text-shadow: 0 2px 12px rgba(0, 0, 0, .32); }
  .status-line { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; max-width: 48%; }
  .status-pill { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 650;
    padding: 8px 10px; border: 1px solid rgba(255,255,255,.23); border-radius: 100px;
    background: rgba(5, 35, 49, .52); backdrop-filter: blur(11px); -webkit-backdrop-filter: blur(11px); }
  .status-pill .dot { width: 7px; height: 7px; border-radius: 100%; background: #7ce7c9; box-shadow: 0 0 10px #3ce2bd; }
  .status-pill.offline .dot { background: #aeb6bc; box-shadow: none; }
  .status-pill.warning { background: rgba(91, 34, 31, .82); color: #fff2e9; border-color: rgba(255, 178, 140, .57); cursor: pointer; }
  .status-pill.warning ha-icon { --mdc-icon-size: 16px; color: #ffb18c; }
  .status-pill:focus-visible, button.metric:focus-visible { outline: 2px solid #ecffef; outline-offset: 3px; }
  .readings { display: grid; grid-template-columns: repeat(auto-fit, minmax(111px, 1fr)); gap: 9px; width: 100%; }
  button.metric { color: #fff; font: inherit; min-width: 0; min-height: 88px; padding: 12px 12px 11px;
    background: rgba(7, 38, 53, .72); border: 1px solid rgba(183, 235, 240, .19);
    border-radius: 16px; text-align: left; cursor: pointer; display: flex; flex-direction: column; gap: 7px;
    backdrop-filter: blur(13px); -webkit-backdrop-filter: blur(13px); transition: background .16s ease, transform .16s ease; }
  button.metric:hover { background: rgba(18, 68, 84, .87); transform: translateY(-2px); }
  .metric-top { display: flex; align-items: center; gap: 7px; min-width: 0; width: 100%; }
  .metric-top ha-icon { --mdc-icon-size: 18px; flex: 0 0 auto; color: var(--reading-color, #88e5e8); }
  .metric-label { font-size: 11px; font-weight: 560; opacity: .84; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .metric-value { display: flex; gap: 5px; min-width: 0; max-width: 100%; align-items: baseline;
    font-size: 21px; line-height: 1.05; font-weight: 720; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .metric-value .value-text { overflow: hidden; text-overflow: ellipsis; }
  .metric-value .unit { font-size: 12px; color: #d0e5ed; font-weight: 540; }
  .metric-detail { margin-top: -3px; font-size: 11px; white-space: nowrap; overflow: hidden;
    text-overflow: ellipsis; color: #c6e6e5; }
  .metric.off { --reading-color: #aec7d0 !important; background: rgba(13, 34, 42, .61); }
  .metric.alert { background: rgba(98, 37, 36, .79); border-color: rgba(255, 169, 133, .67); --reading-color: #ff9b8e !important; }
  .metric.unavailable { opacity: .65; }
  .swatch { width: 8px; height: 8px; border-radius: 50%; border: 1px solid rgba(255, 255, 255, .68); flex: 0 0 auto; }
  .empty { align-self: flex-start; padding: 11px 14px; border-radius: 13px; background: rgba(6, 35, 51, .75);
    font-size: 12px; line-height: 1.5; max-width: 360px; color: #e4f5f6; }
  @media (max-width: 520px) {
    .tank { border-radius: 20px; min-height: 345px; }
    .contents { padding: 15px; min-height: 315px; gap: 55px; }
    .title { font-size: 22px; }
    .readings { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; }
    button.metric { min-height: 68px; padding: 10px; gap: 5px; }
    .metric-value { font-size: 18px; }
    .status-pill { font-size: 10px; padding: 7px 9px; }
  }
  @media (prefers-reduced-motion: reduce) { button.metric { transition: none; } }
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
  return /^(sensor|binary_sensor|light|switch|fan|climate|number|datetime|button|select|input_boolean|input_number)\./.test(id);
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
    if (domain === "datetime" && has(/last.?feed|last.?fed|letzte/)) push("feeder", 145);
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
        image: definition.image || config.image, entities: subset, overrides: definition.entities || {},
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
          image: config.image, entities: [], overrides: {},
        });
      }
      group.get(key).entities.push({ ...entry, priority: direct ? 65 : matchArea ? 20 : 5 });
    }
    if (!group.size) group.set("empty", { name: match, image: config.image, entities: [], overrides: {} });
  }
  return [...group.values()].map((tank) => {
    const selections = {};
    for (const category of [...CATEGORY_ORDER, "leak"]) {
      selections[category] = scoreWinner(tank.entities, category, tank.overrides[category], hass);
    }
    return { ...tank, selections };
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
  _metricButton(category, entry, warnings, entries) {
    const p = presentation(category, entry, this._hass, warnings);
    if (category === "feeder" && entityDomain(entry.id) !== "datetime") {
      const last = entries.find((candidate) => entityDomain(candidate.id) === "datetime" &&
        /last.?feed|last.?fed/.test(textFor(candidate)) && validState(candidate.state));
      const ago = last && shortRelative(last.state.state, this._hass.locale?.language || this._hass.language);
      if (ago) p.detail = "Last fed " + ago;
    }
    const classes = ["metric", p.off ? "off" : "", p.alert ? "alert" : "", !p.available ? "unavailable" : ""].filter(Boolean).join(" ");
    const button = make("button", classes);
    button.type = "button";
    button.style.setProperty("--reading-color", p.color);
    button.title = (entry.state.attributes.friendly_name || entry.id) + " · Open entity";
    button.setAttribute("aria-label", p.label + ": " + p.value + (p.unit ? " " + p.unit : "") + ". Open entity details");
    const top = make("div", "metric-top");
    const icon = make("ha-icon");
    icon.setAttribute("icon", p.icon);
    top.append(icon, make("span", "metric-label", p.label));
    if (category === "light" && p.available && !p.off) {
      const dot = make("span", "swatch");
      dot.style.background = p.color;
      top.append(dot);
    }
    const row = make("div", "metric-value");
    row.append(make("span", "value-text", p.value));
    if (p.unit) row.append(make("span", "unit", p.unit));
    button.append(top, row);
    if (p.detail) button.append(make("div", "metric-detail", p.detail));
    button.addEventListener("click", () => this._moreInfo(entry.id));
    return button;
  }
  _tankElement(tank) {
    for (const entry of tank.entities) this._renderedIds.add(entry.id);
    const section = make("section", "tank");
    const photo = make("div", "tank-photo");
    const image = safeImage(tank.image);
    photo.style.backgroundImage = "url(" + JSON.stringify(image) + ")";
    section.append(photo);
    const main = make("div", "contents");
    const header = make("div", "head");
    const identity = make("div", "identity");
    identity.append(make("div", "eyebrow", "AQUATIC OVERVIEW"), make("h2", "title", tank.name));
    header.append(identity);
    const status = make("div", "status-line");
    const warnings = warningEntities(tank.entities);
    for (const warning of warnings.slice(0, 2)) {
      const alert = make("button", "status-pill warning");
      alert.type = "button";
      const icon = make("ha-icon");
      icon.setAttribute("icon", "mdi:alert-circle-outline");
      alert.append(icon, make("span", null, warning.state.attributes.friendly_name || "Aquarium alert"));
      alert.title = "View " + warning.id;
      alert.addEventListener("click", () => this._moreInfo(warning.id));
      status.append(alert);
    }
    const live = make("span", "status-pill" + (this._hass.connected === false ? " offline" : ""));
    live.append(make("span", "dot"), make("span", null, this._hass.connected === false ? "Offline" : tank.entities.length ? "Live" : "No data"));
    status.append(live);
    header.append(status);
    main.append(header);
    const readings = make("div", "readings");
    const requestedMax = Number(this._config.max_metrics);
    const maximum = Number.isFinite(requestedMax) ? Math.min(8, Math.max(2, Math.round(requestedMax))) : 5;
    let shown = 0;
    for (const key of CATEGORY_ORDER) {
      const entry = tank.selections[key];
      if (!entry || shown >= maximum) continue;
      readings.append(this._metricButton(key, entry, warnings, tank.entities));
      this._renderedIds.add(entry.id);
      shown += 1;
    }
    if (!shown) readings.append(make("div", "empty", tank.entities.length ?
      "No supported aquarium overview sensors were found. Map entities in the card configuration." :
      "No aquarium entities found. Assign the Aquarium label or choose an aquarium area in the card editor."));
    main.append(readings);
    section.append(main);
    return section;
  }
  _render() {
    if (!this._hass || !this._collection) return;
    const aquariums = this._discover();
    this._tankCount = aquariums.length;
    this._renderedIds = new Set();
    this._collection.replaceChildren(...aquariums.map((tank) => this._tankElement(tank)));
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
    description: "Photo-first, auto-discovered aquarium overview for one or multiple tanks",
    documentationURL: "https://github.com/Chreece/Ha-Aquarium-Card",
    preview: true,
  });
}
console.info("%c HA Aquarium Card " + AQUARIUM_CARD_VERSION + " ", "color:#0d3448;background:#8de3e8;font-weight:bold");

// Pure helpers are exported for offline tests. This does not add a runtime dependency.
export { discoverAquariums, metricCandidates, presentation, warningEntities, safeImage, validState };