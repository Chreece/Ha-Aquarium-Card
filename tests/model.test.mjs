import test from 'node:test';
import assert from 'node:assert/strict';

// The module's DOM registration is mocked; tests run without a browser or HA.
globalThis.HTMLElement = class {};
const elements = new Map();
globalThis.customElements = { get: (name) => elements.get(name), define: (name, ctor) => elements.set(name, ctor) };
globalThis.window = { customCards: [] };
const {
  discoverAquariums, metricCandidates, presentation, warningEntities, safeImage, validState,
} = await import('../dist/ha-aquarium-card.js');

const mkState = (id, state, attributes = {}) => ({ entity_id: id, state, attributes });
function example() {
  const states = {
    'sensor.planted_water_temperature': mkState('sensor.planted_water_temperature', '24.7', { friendly_name: 'Aquarium Water Temperature', device_class: 'temperature', unit_of_measurement: '°C' }),
    'sensor.planted_tds': mkState('sensor.planted_tds', '198', { friendly_name: 'Aquarium TDS', unit_of_measurement: 'ppm' }),
    'light.planted_wled': mkState('light.planted_wled', 'on', { friendly_name: 'Aquarium WLED', effect: 'Ocean', rgb_color: [10, 155, 240] }),
    'datetime.fishfeeder_last_feed': mkState('datetime.fishfeeder_last_feed', '2026-11-04T09:00:00Z', { friendly_name: 'Aquarium Fishfeeder Last Feed' }),
    'binary_sensor.planted_high_tds': mkState('binary_sensor.planted_high_tds', 'off', { friendly_name: 'Aquarium High TDS', device_class: 'problem' }),
    'sensor.planted_wifi': mkState('sensor.planted_wifi', '-63', { friendly_name: 'WiFi', device_class: 'signal_strength' }),
    'sensor.nano_temp': mkState('sensor.nano_temp', '26.2', { device_class: 'temperature', unit_of_measurement: '°C' }),
    'switch.nano_pump': mkState('switch.nano_pump', 'on', { friendly_name: 'Nano aquarium filter pump' }),
    'light.living_room': mkState('light.living_room', 'on', { friendly_name: 'Living room light' }),
  };
  const entities = {
    'sensor.planted_water_temperature': { area_id: 'planted', labels: ['aquarium'] },
    'sensor.planted_tds': { area_id: 'planted', labels: ['aquarium'] },
    'light.planted_wled': { area_id: 'planted', labels: ['aquarium'] },
    'datetime.fishfeeder_last_feed': { area_id: 'planted', labels: ['aquarium'] },
    'binary_sensor.planted_high_tds': { area_id: 'planted', labels: ['aquarium'] },
    'sensor.planted_wifi': { area_id: 'planted', labels: ['aquarium'], entity_category: 'diagnostic' },
    'sensor.nano_temp': { area_id: 'office', device_id: 'nano-device' },
    'switch.nano_pump': { area_id: 'office', labels: ['aquarium_nano'] },
    'light.living_room': { area_id: 'living_room', labels: [] },
  };
  return {
    states, entities,
    devices: { 'nano-device': { area_id: 'office', labels: ['aquarium_nano'] } },
    areas: {
      planted: { area_id: 'planted', name: 'Aquarium' },
      office: { area_id: 'office', name: 'Office' },
      living_room: { area_id: 'living_room', name: 'Living room' },
    },
    connected: true,
    config: { unit_system: { temperature: '°C' } },
    locale: { language: 'en' },
  };
}
const labels = new Map([['aquarium', 'Aquarium'], ['aquarium_nano', 'Aquarium Nano']]);

test('detects separate tanks from matching areas and named labels, excluding unrelated entities', () => {
  const tanks = discoverAquariums(example(), { match: 'Aquarium', max_metrics: 5 }, labels);
  assert.equal(tanks.length, 2);
  assert.deepEqual(tanks.map((t) => t.name).sort(), ['Aquarium', 'Aquarium Nano']);
  assert.equal(tanks.find((t) => t.name === 'Aquarium').selections.temperature.id, 'sensor.planted_water_temperature');
  assert.equal(tanks.find((t) => t.name === 'Aquarium Nano').selections.pump.id, 'switch.nano_pump');
  assert.equal(tanks.some((t) => t.entities.some((e) => e.id === 'light.living_room')), false);
  assert.equal(tanks.some((t) => t.entities.some((e) => e.id === 'sensor.planted_wifi')), false);
});

test('discovers feeder last-feed time and light effect including RGB color', () => {
  const hass = example();
  const [tank] = discoverAquariums(hass, { aquariums: [{ area: 'planted', name: 'Planted' }] }, labels);
  assert.equal(tank.selections.feeder.id, 'datetime.fishfeeder_last_feed');
  const p = presentation('light', tank.selections.light, hass, []);
  assert.equal(p.value, 'On');
  assert.equal(p.detail, 'Ocean');
  assert.equal(p.color, 'rgb(10,155,240)');
});

test('manual override wins and does not silently select another tank', () => {
  const hass = example();
  const [tank] = discoverAquariums(hass, {
    aquariums: [{ name: 'Nano', area: 'office', label: 'Aquarium Nano', entities: { temperature: 'sensor.nano_temp' } }],
  }, labels);
  assert.equal(tank.name, 'Nano');
  assert.equal(tank.selections.temperature.id, 'sensor.nano_temp');
  assert.equal(tank.selections.light, null);
});

test('same area can be split by uniquely named aquarium labels', () => {
  const hass = example();
  hass.entities['sensor.planted_water_temperature'].labels = ['aquarium_planted'];
  hass.entities['sensor.planted_tds'].labels = ['aquarium_planted'];
  hass.entities['light.planted_wled'].labels = ['aquarium_other'];
  const names = new Map([...labels, ['aquarium_planted', 'Aquarium Planted'], ['aquarium_other', 'Aquarium Other']]);
  const tanks = discoverAquariums(hass, { match: 'Aquarium' }, names);
  assert(tanks.some((t) => t.name === 'Aquarium Planted'));
  assert(tanks.some((t) => t.name === 'Aquarium Other'));
});

test('alarm stays silent until binary sensor explicitly reports it', () => {
  const hass = example();
  const [tank] = discoverAquariums(hass, { aquariums: [{ area: 'planted' }] }, labels);
  assert.equal(warningEntities(tank.entities).length, 0);
  hass.states['binary_sensor.planted_high_tds'] = mkState('binary_sensor.planted_high_tds', 'on', { friendly_name: 'High TDS', device_class: 'problem' });
  const updated = discoverAquariums(hass, { aquariums: [{ area: 'planted' }] }, labels)[0];
  const warnings = warningEntities(updated.entities);
  assert.equal(warnings.length, 1);
  assert.equal(presentation('tds', updated.selections.tds, hass, warnings).alert, true);
});

test('invalid readings do not pretend to be measurements', () => {
  const hass = example();
  const entity = { id: 'sensor.planted_tds', state: mkState('sensor.planted_tds', 'unavailable', { unit_of_measurement: 'ppm' }) };
  assert.equal(validState(entity.state), false);
  const p = presentation('tds', entity, hass, []);
  assert.equal(p.value, '—');
  assert.equal(p.available, false);
});

test('unmatched setup renders an empty tank without matching all house devices', () => {
  const hass = example();
  hass.areas.planted.name = 'Bedroom';
  for (const entry of Object.values(hass.entities)) entry.labels = [];
  hass.devices['nano-device'].labels = [];
  const tanks = discoverAquariums(hass, { match: 'Reef' }, labels);
  assert.equal(tanks.length, 1);
  assert.equal(tanks[0].entities.length, 0);
});

test('only HA-local or secure HTTPS images are accepted', () => {
  assert.equal(safeImage('/local/aquarium/my.jpg'), '/local/aquarium/my.jpg');
  assert.equal(safeImage('https://example.com/tank.webp'), 'https://example.com/tank.webp');
  assert(!safeImage('javascript:alert(1)').startsWith('javascript:'));
  assert(!safeImage('//evil.com/remote').startsWith('//evil.com'));
});

test('metric selection does not promote diagnostics and recognises physical domains', () => {
  const hass = example();
  const entry = { id: 'sensor.planted_tds', state: hass.states['sensor.planted_tds'], registry: {}, priority: 0 };
  assert(metricCandidates(entry).some((m) => m.category === 'tds'));
  const temp = { id: 'sensor.planted_water_temperature', state: hass.states['sensor.planted_water_temperature'], registry: {}, priority: 0 };
  assert(metricCandidates(temp).some((m) => m.category === 'temperature'));
});

test('sensors with underscore-separated IDs work without a ppm unit', () => {
  const state = mkState('sensor.aquarium_multisensor_tds', '162', { friendly_name: 'Total Dissolved Solids' });
  const metrics = metricCandidates({ id: state.entity_id, state, registry: {}, device: {}, priority: 0 });
  assert(metrics.some((candidate) => candidate.category === 'tds'));
  const ph = mkState('sensor.aquarium_ph', '7.2');
  assert(metricCandidates({ id: ph.entity_id, state: ph, registry: {}, device: {}, priority: 0 })
    .some((candidate) => candidate.category === 'ph'));
});

test('child devices inherit aquarium grouping from labelled parent device', () => {
  const hass = example();
  hass.areas.planted.name = 'Study';
  hass.devices['parent'] = { area_id: 'planted', labels: ['aquarium'] };
  hass.devices['child'] = { area_id: null, parent_device_id: 'parent', labels: [] };
  hass.entities['sensor.planted_tds'] = { device_id: 'child', labels: [] };
  for (const id of Object.keys(hass.entities)) {
    if (id !== 'sensor.planted_tds') hass.entities[id].labels = [];
  }
  const aquariums = discoverAquariums(hass, { match: 'Aquarium' }, labels);
  assert(aquariums.some((tank) => tank.selections.tds?.id === 'sensor.planted_tds'));
});


const { lightRgb, temperatureCondition, waterCondition, feedingCondition, sceneState } =
  await import('../dist/ha-aquarium-card.js');

test('temperature cue is cold, good, or hot only against configured limits', () => {
  const hass=example();
  const cfg={temperature_min:23,temperature_max:26};
  const setTemp=(n)=>{
    hass.states['sensor.planted_water_temperature']=mkState('sensor.planted_water_temperature',String(n),
      {friendly_name:'Aquarium Water Temperature',device_class:'temperature',unit_of_measurement:'°C'});
    return discoverAquariums(hass,{aquariums:[{area:'planted'}]},labels)[0];
  };
  let t=setTemp(24.7);
  assert.equal(temperatureCondition(t.selections.temperature,t,cfg).level,'ok');
  t=setTemp(20.4);
  assert.equal(temperatureCondition(t.selections.temperature,t,cfg).level,'cold');
  t=setTemp(28.4);
  assert.equal(temperatureCondition(t.selections.temperature,t,cfg).level,'hot');
  assert.equal(temperatureCondition(t.selections.temperature,t,{}).level,'unknown');
});

test('per-aquarium temperature limits override global settings',()=>{
  const h=example();
  const t=discoverAquariums(h,{aquariums:[{area:'planted',temperature_min:25,temperature_max:28}]},labels)[0];
  assert.equal(temperatureCondition(t.selections.temperature,t,{temperature_min:23,temperature_max:26}).level,'cold');
  assert.equal(temperatureCondition(t.selections.temperature,{...t,definition:{}},{temperature_min:26,temperature_max:23}).level,'unknown');
});

test('water clarity cue uses tank-defined TDS bands and alarm priority',()=>{
  const h=example();
  const cfg={tds_good_max:200,tds_warn_max:320};
  const get=()=>discoverAquariums(h,{aquariums:[{area:'planted'}]},labels)[0];
  assert.equal(waterCondition(get().selections.tds,[],get(),cfg).level,'good');
  h.states['sensor.planted_tds']=mkState('sensor.planted_tds','275',{unit_of_measurement:'ppm'});
  assert.equal(waterCondition(get().selections.tds,[],get(),cfg).level,'warning');
  h.states['sensor.planted_tds']=mkState('sensor.planted_tds','425',{unit_of_measurement:'ppm'});
  assert.equal(waterCondition(get().selections.tds,[],get(),cfg).level,'bad');
  assert.equal(waterCondition(get().selections.tds,[],get(),{}).level,'unknown');
  const w={id:'binary_sensor.planted_high_tds',state:mkState('binary_sensor.planted_high_tds','on',{friendly_name:'High TDS'}),registry:{}};
  assert.equal(waterCondition(get().selections.tds,[w],get(),cfg).level,'bad');
});

test('feeding flakes last a finite time and an always-on feeder does not count as feeding',()=>{
  const h=example();
  const now=Date.parse('2026-11-04T12:00:00Z');
  h.states['datetime.fishfeeder_last_feed']=mkState('datetime.fishfeeder_last_feed','2026-11-04T11:59:50Z',
    {friendly_name:'Aquarium Fishfeeder Last Feed'});
  const t=discoverAquariums(h,{aquariums:[{area:'planted'}]},labels)[0];
  assert.equal(feedingCondition(t.entities,t.selections.feeder,t,{feeding_duration:30},now).active,true);
  assert.equal(feedingCondition(t.entities,t.selections.feeder,t,{feeding_duration:30},now+30000).active,false);
  const sw={id:'switch.fishfeeder',state:mkState('switch.fishfeeder','on',{friendly_name:'Feeder'}),registry:{}};
  assert.equal(feedingCondition([sw],sw,t,{},now).active,false);
});

test('aquarium light illuminates on its RGB color and darkens when off',()=>{
  const h=example();
  const get=()=>discoverAquariums(h,{aquariums:[{area:'planted'}]},labels)[0];
  const light=sceneState(get(),h,{temperature_min:23,temperature_max:26,tds_good_max:220,tds_warn_max:320});
  assert.equal(light.light.active,true);
  assert.deepEqual(light.light.color,[10,155,240]);
  assert.equal(light.quality.level,'good');
  h.states['light.planted_wled']=mkState('light.planted_wled','off');
  const dark=sceneState(get(),h,{});
  assert.equal(dark.light.active,false);
  assert(dark.light.darkness>0);
  assert.deepEqual(lightRgb({attributes:{rgb_color:[-4,900,120]}}),[0,255,120]);
});
