# HA Aquarium Card 🐠

A natural, living **multi-aquarium** scene for Home Assistant. See conditions in the water, lighting and feeding animations; tap the symbols to inspect the actual readings.

![Aquarium Card dashboard preview](docs/preview.webp)

## Visual overview (v0.2.0)

- **Light behaves like a lamp.** When an aquarium light is on, a soft cone illuminates the water from the top using the actual HA RGB/HS/white-temperature color and brightness. When the light is off, the aquarium becomes darker; unknown light states remain neutral.
- **Water quality changes the scene.** A good TDS range keeps the aquarium visually clear; warning and high-TDS states progressively tint and haze the water. These are an **illustrative cue**, not optical turbidity measurements: TDS does not scientifically measure cloudiness.
- **Thermometer rather than a number.** A left-side thermometer turns blue for too cold, mint green for inside your defined temperature range, and coral orange for too warm. Without configured limits or an available reading it stays neutral.
- **Feeding lives in the water.** After a `last_feed` time changes (or an explicit feeding-active signal), flakes gently float downward for the configured duration; this ends automatically even if HA does not send another update. A feeder's generic enabled/on switch never implies a feed is taking place.
- **No numerical readouts in the scene.** Tap the lamp, thermometer, water indicator, feeder, or small equipment icons to open the matching Home Assistant more-info dialog and see the underlying values and controls.
- **Warnings stay visible.** A high-TDS alarm, leak, or low-water alarm can surface an explicit clickable warning. Unknown/unavailable readings are not presented as healthy.
- **Auto discovery and multiple tanks.** Matching HA area/device/entity labels and names still work. Each tank can have its own photo and independently configured thresholds.
- **Safe interaction.** The scene never triggers a feed or toggles a physical device on single tap; it only opens HA's native entity dialog.

<!-- ha-marketplace:exclude-start -->
## Install

1. **Home Assistant 2026.11+**: Settings → Marketplace → Custom repositories → add `https://github.com/Chreece/Ha-Aquarium-Card` as **Dashboard**, then install. On older Home Assistant use HACS → Custom repositories → **Dashboard**.
2. Reload the Home Assistant browser tab after installation.
3. Add **Aquarium Card** from the dashboard card picker.

The Marketplace/HACS installs `dist/ha-aquarium-card.js` and the bundled photo into `www/community/Ha-Aquarium-Card/`. On a dashboard that uses YAML resources, add `/local/community/Ha-Aquarium-Card/ha-aquarium-card.js` as a JavaScript module yourself.

**Note:** Custom-repository installation is separate from listing in the public Marketplace search catalog. The public catalog requires acceptance of a submission to `hacs/default`.
<!-- ha-marketplace:exclude-end -->

## Configuration

### Automatic discovery

Just add the card. It uses the word `Aquarium` to discover and group supported entities using HA areas and labels.

```yaml
type: custom:ha-aquarium-card
match: Aquarium
max_metrics: 5
temperature_min: 23 # example; use your species' actual limits
temperature_max: 27 # in the units displayed by the temperature sensor
tds_good_max: 220  # example only; adjust to your specific aquarium
tds_warn_max: 320  # example only; adjust to your specific aquarium
feeding_duration: 90 # seconds of animated flakes after feed
image: /local/aquariums/default.jpg # optional; otherwise use the bundled image
```

The image can be changed from the visual editor. For example, `config/www/aquariums/default.jpg` becomes `/local/aquariums/default.jpg`. HTTPS images are also supported.

### Multiple aquariums

In the card editor, select **Add aquarium** and configure a tank name, area, optional label, and image. Two tanks in the *same* area should have different labels assigned to their relevant devices/entities.

```yaml
type: custom:ha-aquarium-card
match: Aquarium
max_metrics: 5
aquariums:
  - name: Planted aquarium
    area: wohnzimmer
    temperature_min: 22 # optional per-tank override
    temperature_max: 26
    tds_good_max: 180
    tds_warn_max: 280
    feeding_duration: 70
    label: aquarium_planted
    image: /local/aquariums/planted.jpg
    entities:
      light: light.aquarium_wled
      temperature: sensor.aquarium_multisensor_temperature
      tds: sensor.aquarium_multisensor_tds
      feeder: datetime.fishfeeder_last_feed
  - name: Shrimp aquarium
    area: arbeitszimmer
    label: aquarium_shrimp
    image: /local/aquariums/shrimp.jpg
```

`area` can be an area name or ID; `label` can be a label name or ID. If both are set, the card only considers entities matching both criteria, except the explicitly configured metric overrides. Entity override keys are `temperature`, `tds`, `light`, `feeder`, `water_level`, `ph`, `salinity`, `pump`, `heater`, and `leak`.

All ranges are **optional**. Leave them blank to show neutral cues rather than guessing what is healthy for your fish. `temperature_min` / `temperature_max` use the same unit as the source entity's numeric state; `tds_good_max` / `tds_warn_max` are interpreted in ppm. Set both boundaries to activate color/haze classification, and keep `tds_warn_max` above `tds_good_max`. Individual tanks inherit global limits unless explicitly overridden. You can edit these from the card's visual editor under **Water condition ranges & feeding animation** and **Optional per-aquarium ranges**.

The card prioritizes sensor/device characteristics and water-related names, rather than hard-coding specific vendors. For example it recognises `sensor.aquarium_multisensor_temperature`, `binary_sensor.aquarium_multisensor_high_tds`, `datetime.fishfeeder_last_feed`, aquarium WLED lights, and numeric TDS/PPM sensors.

## Compatibility and limitations

- Prepared for HA **2026.11 Marketplace** dashboard resources, and HACS-style installs. Tested with automated local mocks; a live HA instance is not part of the test environment.
- Labels are resolved with the Home Assistant label registry, with fallback to label IDs if a user cannot access the registry. Area/device/entity registries are provided by HA's frontend.
- Distinct area names/labels identify tanks automatically. If two aquariums have the same label *and* live in the same area, give them distinct labels or define each tank manually.
- Sensors without recognizable metadata may require an `entities:` override.
- Actual alarm entities create visible warnings regardless of thresholds; without configured temperature/TDS limits, numeric sensors are considered unclassified, not automatically healthy. Lighting needs a real HA light or recognized lighting switch for its visual effect.

## Developer notes

`dist/ha-aquarium-card.js` is the **ready-to-install** ES module; `dist/aquarium-default.webp` ships beside it. No build step is needed. Run `npm test` (Node 22+) to exercise detection and state presentation, and `npm run check` for syntax validation. The included GitHub Action also checks Marketplace/HACS `plugin` metadata.

## License

MIT.