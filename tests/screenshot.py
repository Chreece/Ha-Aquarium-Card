"""Preview with local image and frontend scripts in about:blank (no network access)."""
from pathlib import Path
import re
import base64
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parent.parent
fixture = (root/'tests'/'preview.html').read_text()
inline_scripts = re.findall(r'<script[^>]*>(.*?)</script>', fixture, re.S)
page_markup = re.sub(r'<script[^>]*>.*?</script>', '', fixture, flags=re.S)
js = (root/'dist'/'ha-aquarium-card.js').read_text()
photo = base64.b64encode((root/'dist'/'aquarium-default.webp').read_bytes()).decode('ascii')
js = js.replace('new URL("./aquarium-default.webp", import.meta.url).href', '"data:image/webp;base64,' + photo + '"')
js = js[:js.index('// Pure helpers are exported for offline tests.')]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 930, 'height': 1060}, device_scale_factor=1)
    issues = []
    page.on('pageerror', lambda exc: issues.append(str(exc)))
    page.set_content(page_markup)
    page.add_script_tag(content=inline_scripts[0])
    page.add_script_tag(content=js)
    page.add_script_tag(content=inline_scripts[1].replace("import '../dist/ha-aquarium-card.js';", ''))
    page.wait_for_function('window.previewReady === true')
    page.wait_for_timeout(200)
    print('Page errors:', issues)
    print('Card tanks:', page.locator('ha-aquarium-card').evaluate('(e)=>e.shadowRoot.querySelectorAll("section.tank").length'))
    print('Metrics:', page.locator('ha-aquarium-card').evaluate('(e)=>[...e.shadowRoot.querySelectorAll("button.scene-hotspot")].map(x=>x.innerText)'))
    page.locator('ha-aquarium-card').screenshot(path=str(root / 'docs' / 'preview.png'))
    page.locator('ha-aquarium-card').evaluate('(e)=>e.shadowRoot.querySelector("button.temperature-control").click()')
    print('More info opened:', page.evaluate('window.lastOpened'))
    assert page.evaluate('window.lastOpened') == 'sensor.main_temperature'
    print('Alerts after clearing alarm:', page.evaluate('''() => {
      const card = document.querySelector('#card');
      const old = window.mockHass;
      const entity = 'binary_sensor.nano_high_tds';
      card.hass = { ...old, states: { ...old.states, [entity]: { ...old.states[entity], state: 'off' } } };
      return card.shadowRoot.querySelectorAll('button.alarm').length;
    }'''))
    print('Editor add-tank result:', page.evaluate('''() => {
      const editor = document.createElement('ha-aquarium-card-editor');
      document.body.append(editor);
      editor.setConfig({match:'Aquarium'});
      editor.hass = window.mockHass;
      let change = null;
      editor.addEventListener('config-changed', e => { change = e.detail.config });
      const add = [...editor.shadowRoot.querySelectorAll('button')].find(b => b.textContent.includes('Add aquarium'));
      add.click();
      return { tanks: editor.shadowRoot.querySelectorAll('.tank-edit').length,
               changed: !!change && change.aquariums.length === 1 };
    }'''))

    mobile = browser.new_page(viewport={'width': 370, 'height': 900}, device_scale_factor=1)
    mobile.set_content(page_markup)
    mobile.add_script_tag(content=inline_scripts[0])
    mobile.add_script_tag(content=js)
    mobile.add_script_tag(content=inline_scripts[1].replace("import '../dist/ha-aquarium-card.js';", ''))
    mobile.wait_for_function('window.previewReady === true')
    mobile.wait_for_timeout(200)
    mobile.locator('ha-aquarium-card').screenshot(path=str(root / 'docs' / 'mobile.png'))
    print('Mobile overflow:', mobile.evaluate('({doc:document.documentElement.scrollWidth,viewport:window.innerWidth,card:document.querySelector("#card").getBoundingClientRect().width})'))
    browser.close()
