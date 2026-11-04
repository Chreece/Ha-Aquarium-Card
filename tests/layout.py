"""Browser regressions for transparent scene icons and collision-free hit targets.

Run with: python tests/layout.py (requires Playwright and Chromium).
"""
from pathlib import Path
import base64
import os
import re
import shutil
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
fixture = (ROOT / 'tests/preview.html').read_text()
scripts = re.findall(r'<script[^>]*>(.*?)</script>', fixture, re.S)
markup = re.sub(r'<script[^>]*>.*?</script>', '', fixture, flags=re.S)
source = (ROOT / 'dist/ha-aquarium-card.js').read_text()
photo = base64.b64encode((ROOT / 'dist/aquarium-default.webp').read_bytes()).decode('ascii')
source = source.replace('new URL("./aquarium-default.webp", import.meta.url).href',
                        '"data:image/webp;base64,' + photo + '"')
source = source[:source.index('// Pure helpers are exported for offline tests.')]

# Inspect physical click rectangles, not just CSS positions. Grid children must
# remain separate with long names, multiple warnings, and every equipment slot.
CHECK = r'''card => {
  const failures = [];
  const intersects = (a,b) => Math.min(a.right,b.right)-Math.max(a.left,b.left) > .5 &&
    Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top) > .5;
  for (const tank of card.shadowRoot.querySelectorAll('.tank')) {
    const bounds = tank.getBoundingClientRect();
    const buttons = [...tank.querySelectorAll('button')];
    const elements = [...buttons, tank.querySelector('.heading')];
    for (let i=0;i<elements.length;i++) {
      const a=elements[i], r=a.getBoundingClientRect();
      if (r.left < bounds.left-.5 || r.right > bounds.right+.5 ||
          r.top < bounds.top-.5 || r.bottom > bounds.bottom+.5) failures.push('outside: '+a.className);
      for (const b of elements.slice(i+1)) {
        if (intersects(r,b.getBoundingClientRect())) failures.push('overlap: '+a.className+' / '+b.className);
      }
    }
    for (const button of buttons) {
      const s=getComputedStyle(button), r=button.getBoundingClientRect();
      if (s.backgroundColor !== 'rgba(0, 0, 0, 0)' || s.backgroundImage !== 'none' ||
          s.boxShadow !== 'none' || (s.backdropFilter && s.backdropFilter !== 'none') ||
          ['Top','Bottom','Left','Right'].some(x=>parseFloat(s['border'+x+'Width']) !== 0))
        failures.push('visible icon container: '+button.className);
      if (r.width < 43.5 || r.height < 43.5) failures.push('small click target: '+button.className);
    }
    const f=tank.querySelector('.feeder-control'), q=tank.querySelector('.quality-control');
    if (f && q && q.getBoundingClientRect().top-f.getBoundingClientRect().bottom < 9.5)
      failures.push('insufficient feeder/TDS spacing');
    const footer=tank.querySelector('.scene-footer');
    if (footer && getComputedStyle(footer).backgroundColor !== 'rgba(0, 0, 0, 0)')
      failures.push('footer background');
    const visible = [...tank.querySelectorAll('.scene-hotspot')].map(e=>e.textContent).join(' ');
    if (/\b(?:198|325|24\.7|26\.1)\b/.test(visible)) failures.push('numeric reading on overview');
  }
  return failures;
}'''


def mount(page, width, scenario):
    page.set_content(markup)
    page.add_style_tag(content=f'body{{padding:0}} .shell{{max-width:none;width:{width}px;margin:0}} .page-head{{display:none}}')
    page.add_script_tag(content=scripts[0])
    page.add_script_tag(content=source)
    page.add_script_tag(content=scripts[1].replace("import '../dist/ha-aquarium-card.js';", ''))
    page.wait_for_function('window.previewReady === true')
    if scenario == 'crowded':
        page.evaluate('''() => {
          const h=window.mockHass, card=document.querySelector('#card');
          h.areas.main.name='Aquarium with a very long descriptive name';
          const additional={
            'switch.main_pump':state('switch.main_pump','on',{friendly_name:'Aquarium filter pump'}),
            'climate.main_heater':state('climate.main_heater','heat',{friendly_name:'Aquarium heater',hvac_action:'heating'}),
            'sensor.main_ph':state('sensor.main_ph','7.1',{friendly_name:'Aquarium pH',unit_of_measurement:'pH'}),
            'binary_sensor.main_leak':state('binary_sensor.main_leak','on',{friendly_name:'Aquarium water leak requires attention',device_class:'moisture'}),
            'binary_sensor.main_high_tds':state('binary_sensor.main_high_tds','on',{friendly_name:'Aquarium high TDS warning',device_class:'problem'})
          };
          for (const id of Object.keys(additional)) h.entities[id]={device_id:'main_device',labels:['aquarium']};
          h.states={...h.states,...additional};
          card.setConfig({match:'Aquarium',max_metrics:8,temperature_min:23,temperature_max:26,tds_good_max:220,tds_warn_max:320});
          card.hass={...h};
        }''')
    elif scenario == 'unavailable':
        page.evaluate('''() => {
          const h=window.mockHass;
          document.querySelector('#card').hass={...h, states:Object.fromEntries(Object.entries(h.states)
            .map(([id,s])=>[id,{...s,state:'unavailable'}]))};
        }''')
    page.mouse.move(1400, 5)


def run():
    with sync_playwright() as p:
        executable = os.environ.get('AQUARIUM_CHROMIUM') or shutil.which('chromium') or shutil.which('chromium-browser')
        options={'headless':True,'args':['--no-sandbox']}
        if executable:
            options['executable_path']=executable
        browser=p.chromium.launch(**options)
        checks=0
        errors=[]
        for scenario in ('normal','crowded','unavailable'):
            for width in (240,280,314,360,420,600,850):
                # A wide viewport deliberately tests narrow HA dashboard columns.
                page=browser.new_page(viewport={'width':1440,'height':1400}, reduced_motion='reduce')
                page.on('pageerror',lambda exc:errors.append(str(exc)))
                mount(page,width,scenario)
                card=page.locator('#card')
                assert card.evaluate(CHECK) == [], (scenario,width,card.evaluate(CHECK))
                feeder=card.locator('.feeder-control').first
                quality=card.locator('.quality-control').first
                for button, expected in ((feeder,'datetime.main_feed'),(quality,'sensor.main_tds')):
                    button.hover()
                    assert card.evaluate(CHECK) == [], (scenario,width,'hover',card.evaluate(CHECK))
                    button.click()
                    assert page.evaluate('window.lastOpened') == expected, (scenario,width,expected)
                # A keyboard focus outline remains visible without a filled backdrop.
                quality.focus()
                page.keyboard.press("Tab")
                assert feeder.evaluate("e=>e.matches(':focus-visible')")
                assert feeder.evaluate("e=>getComputedStyle(e).outlineStyle") != 'none'
                assert card.evaluate(CHECK) == [], (scenario,width,'focus')
                checks += 1
                page.close()
        assert not errors, errors
        browser.close()
        print(f'PASS: {checks} responsive scenarios; no overlaps, transparent icons, 44px targets, native click routing and keyboard focus.')


if __name__ == '__main__':
    run()
