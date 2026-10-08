// CAT05 end-to-end on an iPhone viewport. Brigade writes are mocked: nothing real is saved. Reads are real (read-only).
const { chromium } = require('/Users/massimilianozubboli/cw-probe/node_modules/playwright');
const OUT = process.argv[2] || '.', EV = '7c4b3029-f4c9-4a64-a17d-c2844e54bf06', TOKEN = 'T'.repeat(64);
const CACIO = '475959d6-8558-4a97-907c-39d8fdd60181', CHK = '7502f23f-5735-467c-92d3-97b6b153c647';
// like Chef's real save of 08/10 00:38 (made before the new rules): 45 catering portions, no guests recorded
const LINKS = [{ event_id: EV, line_key: 'food|penne cacio e pepe with chicken', original_text: 'Penne cacio e pepe with chicken', section: 'Food', confirmed_by: 'Max', confirmed_at: '2026-10-08T00:38:09Z',
  components: [{ recipe_id: CACIO, title: 'PENNE CACIO E PEPE Catering', unit: 'portions', qty: 45, portions: 45, batches: 0.45, convertible: true, basis: { rule: 'old rule', source: 'Chef 30/09' } },
               { recipe_id: CHK, title: 'Grilled Chicken', unit: 'kg', qty: 1.5, qty_g: 1500, convertible: false, basis: { rule: '1 restaurant portion = 100 g cooked = 3 people (Q05)', source: 'Chef' } }] }];
const ALIASES = [{ alias_norm: 'penne marinara', alias_text: 'Penne Marinara', components: [{ recipe_id: '407c50ee-0e32-41b2-83eb-a582c323d92a', title: 'PENNE ARRABBIATA BUFFET', unit: 'portions', per_guest: null, qty: null, association_only: true }], source: 'Chef email 07/10' }];
const saves = [], realWrites = [];
const fail = m => { console.error('FAIL', m); process.exitCode = 1; };
(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.route('**/rest/v1/catering_dish_links*', r => r.fulfill({ json: LINKS }));
  await ctx.route('**/rest/v1/catering_menu_aliases*', r => r.fulfill({ json: ALIASES }));
  await ctx.route('**/functions/v1/brigade-login', r => { const p = JSON.parse(r.request().postData() || '{}'); r.fulfill({ json: p.pin === '0000' ? { ok: true, token: TOKEN } : { ok: false } }); });
  await ctx.route('**/functions/v1/catering-links', r => {
    const p = JSON.parse(r.request().postData() || '{}');
    if (p.brigade_token !== TOKEN) return r.fulfill({ status: 401, json: { ok: false, error: 'session' } });
    if (p.action === 'me') return r.fulfill({ json: { ok: true, user: { name: 'TEST', role: 'admin' }, can_edit: true } });
    if (p.action === 'save') { saves.push(p); LINKS.push({ event_id: p.event_id, line_key: p.line_key, original_text: p.original_text, section: p.section, confirmed_by: 'TEST', confirmed_at: new Date().toISOString(), components: p.components.map(c => ({ title: c.recipe_id === '11e63d03-24a4-4ced-8086-43b831f84f72' ? 'Tiramisu' : c.recipe_id, ...c })) }); return r.fulfill({ json: { ok: true } }); }
    r.fulfill({ status: 400, json: { ok: false } });
  });
  ctx.on('request', q => { if (/supabase\.co/.test(q.url()) && q.method() !== 'GET' && !/catering-links|brigade-login|rpc\//.test(q.url())) realWrites.push(q.method() + ' ' + q.url()); });
  const pg = await ctx.newPage();
  await pg.goto(`http://127.0.0.1:8765/v020/index.html#ev=${EV}&seg=plan`);
  await pg.waitForSelector('text=Kitchen ·', { timeout: 40000 });
  const t = (await pg.textContent('#main')).replace(/\s+/g, ' ');
  const must = [
    ['1 of 7 confirmed', /Kitchen · 1 of 7 confirmed by Chef/],
    ['categories', /primo · 7\.5 std/i],
    ['saved cacio flagged', /To reconfirm: .*PENNE CACIO E PEPE Catering: rule now 23 portions, saved 45 portions/],
    ['marinara proposal 18 + scaled penne', /PENNE ARRABBIATA BUFFET · 18 portions.*Penne\s*900 g/],
    ['lasagna 2 trays', /Lasagna · 12 portions.*2 catering trays/],
    ['board question', /Missing: 45 guests × 0\.5 ÷ 1 antipasto = 22\.5 standard portions/],
    ['parmigiana question', /no catering version of Chicken Parmesan/],
    ['tiramisu proposal', /Tiramisu · 20 portions/],
  ];
  for (const [k, re] of must) if (!re.test(t)) fail('plan: ' + k);
  await pg.screenshot({ path: OUT + '/c5-01-plan-top.png' });
  await pg.locator('text=To reconfirm').first().scrollIntoViewIfNeeded(); await pg.screenshot({ path: OUT + '/c5-02-reconfirm.png' });
  await pg.locator('text=PENNE ARRABBIATA BUFFET · 18').first().scrollIntoViewIfNeeded(); await pg.screenshot({ path: OUT + '/c5-03-marinara.png' });
  // Chef confirms the tiramisu proposal: PIN, save, guests recorded
  await pg.click('button[data-a="linkDish"][data-key="food|mini tiramisu"]');
  await pg.waitForSelector('#sheet >> text=Recipes for this dish');
  await pg.click('#sheet button[data-a="linkSave"]'); await pg.waitForSelector('text=Sign in with your PIN');
  for (const k of '0000') await pg.click(`#sheet button[data-a="pinKey"][data-k="${k}"]`);
  await pg.waitForSelector('#sheet >> text=Recipes for this dish'); await pg.click('#sheet button[data-a="linkSave"]');
  await pg.waitForSelector('#sheet', { state: 'hidden' }); await pg.waitForTimeout(600);
  const sv = saves.find(s => s.line_key === 'food|mini tiramisu');
  if (!sv || sv.components[0].qty !== 20 || sv.components[0].basis.guests !== 45) fail('tiramisu save must carry qty 20 and guests 45');
  const t2 = (await pg.textContent('#main')).replace(/\s+/g, ' ');
  if (!/Kitchen · 2 of 7 confirmed by Chef/.test(t2)) fail('after save: 2 of 7');
  // Chef's earlier save is never overwritten by the proposal
  if (LINKS[0].components[0].qty !== 45) fail('saved cacio changed');
  console.log(JSON.stringify({ saves: saves.length, realWrites }));
  if (realWrites.length) fail('real writes');
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
