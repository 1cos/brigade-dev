// CAT03 end-to-end on an iPhone viewport, with the Brigade WRITE side mocked: nothing real is saved.
// Reads (recipes, events, Tripleseat menu…) are the real ones, read-only. Run: node v020/tests/cat03-flow.cjs <out-dir>
const { chromium } = require('/Users/massimilianozubboli/cw-probe/node_modules/playwright');
const OUT = process.argv[2] || '.', EV = '7c4b3029-f4c9-4a64-a17d-c2844e54bf06', TOKEN = 'T'.repeat(64);
const LINKS = [], ALIASES = [], calls = [], realWrites = [];
const fail = m => { console.error('FAIL', m); process.exitCode = 1; };
(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.route('**/rest/v1/catering_dish_links*', r => r.fulfill({ json: LINKS }));
  await ctx.route('**/rest/v1/catering_menu_aliases*', r => r.fulfill({ json: ALIASES }));
  await ctx.route('**/functions/v1/brigade-login', r => { const p = JSON.parse(r.request().postData() || '{}'); r.fulfill({ json: p.pin === '0000' ? { ok: true, token: TOKEN } : { ok: false } }); });
  await ctx.route('**/functions/v1/catering-links', r => {
    const p = JSON.parse(r.request().postData() || '{}'); calls.push(p.action);
    if (p.brigade_token !== TOKEN) return r.fulfill({ status: 401, json: { ok: false, error: 'session' } });
    if (p.action === 'me') return r.fulfill({ json: { ok: true, user: { name: 'TEST', role: 'admin' }, can_edit: true } });
    if (p.action === 'save') {
      const comps = p.components.map(c => Object.assign({ title: c.recipe_id.slice(0, 8) }, c));
      const i = LINKS.findIndex(l => l.event_id === p.event_id && l.line_key === p.line_key);
      const row = { event_id: p.event_id, line_key: p.line_key, original_text: p.original_text, section: p.section, components: comps, confirmed_by: 'TEST', confirmed_at: new Date().toISOString() };
      if (i >= 0) LINKS[i] = row; else LINKS.push(row);
      if (p.remember) ALIASES.push({ alias_norm: p.original_text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(), alias_text: p.original_text, components: comps.map(c => ({ ...c, per_guest: c.qty / 45 })), source: 'TEST' });
      return r.fulfill({ json: { ok: true, remembered: !!p.remember, payload: p } });
    }
    if (p.action === 'plan') return r.fulfill({ json: { ok: true, cost: { complete: false, subtotal: 12.5, markup: 1.25, total: 13.75, lines: [{ title: 'Tiramisu', portions_charged: 20, semaforo: 'ROSSO', cost: null, non_stimabili: [] }] }, not_costed: [{ title: 'TOMATO X BRUSCHETTA', qty: 2, unit: 'kg', why: 'resa in kg della ricetta non dichiarata' }], shopping: { known: [{ ingredient_id: 'x', name: 'Mascarpone', qty: 1000, unit: 'g' }], unknown: [], no_batches: ['TOMATO X BRUSCHETTA'] } } });
    r.fulfill({ status: 400, json: { ok: false } });
  });
  ctx.on('request', q => { if (/supabase\.co/.test(q.url()) && q.method() !== 'GET' && !/catering-links|brigade-login|rpc\//.test(q.url())) realWrites.push(q.method() + ' ' + q.url()); });
  const pg = await ctx.newPage();
  await pg.goto(`http://127.0.0.1:8765/v020/index.html#ev=${EV}&seg=production`);
  await pg.waitForSelector('text=Dishes from Tripleseat', { timeout: 40000 });
  await pg.screenshot({ path: OUT + '/c3-01-production.png' });
  const txt = await pg.textContent('#main');
  if (!/Tiramisu · 20 portions/.test(txt)) fail('tiramisu suggestion 20 portions missing');
  if (!/Still to decide/.test(txt)) fail('open questions (lasagna / parmigiana) missing');

  // Mini Tiramisu: prefilled Chef rule → Save → PIN → Save
  await pg.click('button[data-a="linkDish"][data-key="food|mini tiramisu"]');
  await pg.waitForSelector('#sheet:not([hidden]) >> text=Recipes for this dish');
  await pg.click('#sheet details.why summary');
  await pg.screenshot({ path: OUT + '/c3-02-sheet-tiramisu.png' });
  await pg.click('#sheet button[data-a="linkSave"]');
  await pg.waitForSelector('text=Sign in with your PIN');
  for (const k of '0000') await pg.click(`#sheet button[data-a="pinKey"][data-k="${k}"]`);
  await pg.waitForSelector('#sheet >> text=Recipes for this dish');
  await pg.click('#sheet button[data-a="linkSave"]');
  await pg.waitForSelector('#sheet', { state: 'hidden' });
  await pg.waitForTimeout(500);
  if (!LINKS.some(l => l.line_key === 'food|mini tiramisu' && l.components[0].qty === 20 && l.components[0].unit === 'portions')) fail('tiramisu not saved as 20 portions');

  // Tuscan Board: 3 suggested components, change bruschetta to 2 kg, remember as rule
  await pg.click('button[data-a="linkDish"][data-key^="food|tuscan board"]');
  await pg.waitForSelector('#sheet >> text=Recipes for this dish');
  const n = await pg.locator('#sheet .lk-qty').count(); if (n !== 3) fail('board should prefill 3 components, got ' + n);
  await pg.fill('#sheet .lk-qty[data-i="0"]', '2');
  await pg.check('#lkrem');
  await pg.screenshot({ path: OUT + '/c3-03-sheet-board.png' });
  await pg.click('#sheet button[data-a="linkSave"]');
  await pg.waitForSelector('#sheet', { state: 'hidden' });
  const board = LINKS.find(l => l.line_key.startsWith('food|tuscan board'));
  if (!board || board.components.length !== 3 || board.components[0].qty !== 2) fail('board not saved with 3 components and 2 kg');
  if (!ALIASES.length) fail('remember did not create a rule');

  // reload: links come back from Brigade (mocked store), not from the device
  await pg.reload(); await pg.waitForSelector('text=Dishes from Tripleseat', { timeout: 40000 });
  const t2 = await pg.textContent('#main');
  if (!/2 of 7 dishes linked/.test(t2)) fail('after reload expected 2 of 7 linked');
  await pg.screenshot({ path: OUT + '/c3-04-after-reload.png', fullPage: true });
  await pg.click('.seg button[data-k="cost"]'); await pg.waitForSelector('text=Dish by dish');
  const t3 = await pg.textContent('#main');
  if (!/Incomplete/.test(t3) || /\$0\.00/.test(t3.split('Totals')[0])) fail('cost must say Incomplete and never $0 for unknown');
  await pg.screenshot({ path: OUT + '/c3-05-cost.png', fullPage: true });
  await pg.click('.seg button[data-k="shopping"]'); await pg.waitForSelector('text=To buy or prepare');
  await pg.screenshot({ path: OUT + '/c3-06-shopping.png' });
  console.log(JSON.stringify({ links: LINKS.length, aliases: ALIASES.length, calls, realWrites }, null, 1));
  if (realWrites.length) fail('real writes to Brigade: ' + realWrites.join(', '));
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
