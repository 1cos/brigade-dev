const { chromium } = require('/Users/massimilianozubboli/cw-probe/node_modules/playwright');
const OUT = process.argv[2], EV = '7c4b3029-f4c9-4a64-a17d-c2844e54bf06';
(async () => {
  const b = await chromium.launch({ headless: true });
  const pg = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  const writes = [];
  pg.on('request', r => { if (r.url().includes('supabase.co') && r.method() !== 'GET') writes.push(r.method() + ' ' + r.url()); });
  await pg.goto(`http://127.0.0.1:8765/v020/index.html#ev=${EV}&seg=production`);
  await pg.waitForSelector('text=Dishes from Tripleseat', { timeout: 30000 });
  await pg.screenshot({ path: OUT + '/01-production.png' });
  // 1) Beef Lasagna → suggested Lasagna → 6 kg
  await pg.locator('button[data-a="linkDish"][data-dish="Beef Lasagna"]').click();
  await pg.waitForSelector('#sheet:not([hidden]) >> text=Suggested by name');
  await pg.screenshot({ path: OUT + '/02-sheet-suggested.png' });
  await pg.locator('#sheet button[data-a="linkPick"]', { hasText: 'Lasagna' }).first().click();
  await pg.fill('#sheet .lk-qty[data-i="0"]', '6'); await pg.selectOption('#sheet .lk-unit[data-i="0"]', 'kg');
  await pg.screenshot({ path: OUT + '/03-qty.png' });
  // save without qty is refused: try on Tuscan board later
  await pg.locator('#sheet button[data-a="linkSave"]').click();
  // 2) Tuscan Board: composite, search 2 components
  await pg.locator('button[data-a="linkDish"][data-dish^="Tuscan Board"]').click();
  await pg.fill('#linkq', 'brusch'); await pg.waitForTimeout(500);
  await pg.locator('#sheet button[data-a="linkPick"]', { hasText: 'BRUSCHETTA' }).first().click();
  await pg.fill('#linkq', 'melone'); await pg.waitForTimeout(500);
  await pg.locator('#sheet button[data-a="linkPick"]', { hasText: 'MELONE' }).first().click();
  await pg.locator('#sheet button[data-a="linkSave"]').click();          // refused: no quantities
  const stillOpen = await pg.isVisible('#sheet'); 
  await pg.fill('#sheet .lk-qty[data-i="0"]', '1.5'); await pg.selectOption('#sheet .lk-unit[data-i="0"]', 'kg');
  await pg.fill('#sheet .lk-qty[data-i="1"]', '45'); await pg.selectOption('#sheet .lk-unit[data-i="1"]', 'pieces');
  await pg.screenshot({ path: OUT + '/04-composite.png' });
  await pg.locator('#sheet button[data-a="linkSave"]').click();
  await pg.waitForTimeout(400);
  await pg.locator('text=Link summary').scrollIntoViewIfNeeded();
  await pg.screenshot({ path: OUT + '/05-summary.png', fullPage: false });
  // 3) open recipe from the sheet: opens the recipe tab only
  await pg.locator('button[data-a="linkDish"][data-dish="Beef Lasagna"]').click();
  await pg.locator('#sheet button[data-a="openRecipe"]').first().click();
  await pg.waitForTimeout(1500);
  await pg.screenshot({ path: OUT + '/06-open-recipe.png' });
  const sim = await pg.evaluate(() => localStorage.getItem('v020-cat02-sim'));
  console.log(JSON.stringify({ refusedWithoutQty: stillOpen, writesToBrigade: writes, sim: JSON.parse(sim) }, null, 1));
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
