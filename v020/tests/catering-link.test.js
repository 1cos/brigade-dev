// CAT01 — node --test v020/tests/
// Fixture: the real Mason Rehearsal menu (Tripleseat #60062987, document 39081121 v1) and real Brigade recipe titles.
const test = require('node:test');
const assert = require('node:assert');
const C = require('../catering-link.js');

const MASON = { lines: [
  { section: 'Beverage', name: 'Water, Iced tea', quantity: null },
  { section: 'Beverage', name: 'Bottle of Cabernet', quantity: null },
  { section: 'Beverage', name: 'Moscow Mule', quantity: null },
  { section: 'Food', name: 'menu for Rehearsal dinner', quantity: 45 },
  { section: 'Food', name: 'Tuscan Board with Bruschetta, caprese and cantalupe/Parma', quantity: null },
  { section: 'Food', name: 'Penne cacio e pepe with chicken', quantity: null },
  { section: 'Food', name: 'Penne Marinara', quantity: null },
  { section: 'Food', name: 'Beef Lasagna', quantity: null },
  { section: 'Food', name: 'Chicken parmigiana', quantity: null },
  { section: 'Food', name: 'House salad', quantity: null },
  { section: 'Food', name: 'Mini Tiramisu', quantity: null },
] };
const R = ['Cacio e Pepe', 'Cacio e Pepe Half', 'CACIO E PEPE SAUCE', 'PENNE CACIO E PEPE Catering', 'Penne Midnight', 'PENNE ARRABBIATA BUFFET',
  'Grilled Chicken', 'Chicken Parmesan', 'Lasagna', 'Lasagna Pan', 'House Salad', 'Tiramisu', 'TIRAMISU NEL SIFONE', 'Caprese', 'CAPRESE SHOT',
  'TOMATO X BRUSCHETTA', 'PROSCIUTTO E MELONE', 'Tuscan Lamb Chops', 'POMODORO SAUCE', 'Spaghetti al Pomodoro', 'BASIL OIL', 'ITALIAN CREAM']
  .map((title, i) => ({ id: 'r' + i, title }));
const names = (dish) => C.candidates(dish, R).map(c => c.title);

test('Mason: 7 dishes, package line apart, drinks left out', () => {
  const k = C.kitchenDishes(MASON);
  assert.deepStrictEqual(k.dishes.map(d => d.name), ['Tuscan Board with Bruschetta, caprese and cantalupe/Parma', 'Penne cacio e pepe with chicken',
    'Penne Marinara', 'Beef Lasagna', 'Chicken parmigiana', 'House salad', 'Mini Tiramisu']);
  assert.strictEqual(k.packages.length, 1);
  assert.strictEqual(k.packages[0].quantity, 45);
  assert.strictEqual(k.beverages.length, 3);
  assert.ok(k.dishes.every(d => d.quantity === null), 'no dish gets a quantity from guests or the package line');
});

test('candidates are by name and never a protein or pasta shape alone', () => {
  assert.deepStrictEqual(names('Penne Marinara'), [], 'Penne Midnight / Arrabbiata are not marinara');
  assert.ok(!names('Penne cacio e pepe with chicken').includes('Grilled Chicken'));
  assert.ok(names('Penne cacio e pepe with chicken').includes('PENNE CACIO E PEPE Catering'));
  assert.deepStrictEqual(names('Chicken parmigiana').slice(0, 1), ['Chicken Parmesan'], 'parmigiana = parmesan (spelling only)');
  assert.deepStrictEqual(names('Beef Lasagna'), ['Lasagna', 'Lasagna Pan']);
  assert.deepStrictEqual(names('Mini Tiramisu'), ['Tiramisu', 'TIRAMISU NEL SIFONE']);
  assert.deepStrictEqual(names('House salad'), ['House Salad']);
  assert.ok(!names('Tuscan Board with Bruschetta, caprese and cantalupe/Parma').includes('Tuscan Lamb Chops'));
});

test('single ingredients do not make a candidate', () => {
  assert.deepStrictEqual(names('Caprese Salad (Mozzarella, Tomato, Basil, Oil and Oregano)'), ['Caprese']);
  assert.deepStrictEqual(names('Italian Charcuterie skewers'), []);
});

test('headings and drinks inside the Food section are not dishes', () => {
  const k = C.kitchenDishes({ lines: [
    { section: 'Food', name: 'Main Course Pick 1' }, { section: 'Food', name: 'Regular' }, { section: 'Food', name: 'can be served in the Cheese Wheel' },
    { section: 'Food', name: 'Water and Iced tea' }, { section: 'Food', name: 'Wines and Beer, from list on consumption' }, { section: 'Food', name: 'Chicken Parmigiana' } ] });
  assert.deepStrictEqual(k.dishes.map(d => d.name), ['Chicken Parmigiana']);
  assert.strictEqual(k.notes.length, 3);
  assert.strictEqual(k.beverages.length, 2);
});

// CAT03 — suggestions from Chef's rules (sources: thread "consuntivi" 30/09–01/10, census v1.4)
const K = require('../catering-knowledge.js');
test('Mason at 45 guests: Chef rules give these quantities, nothing for lasagna/parmigiana', () => {
  const q = (d) => K.suggest(d, 45).comps.map(c => `${c.title}=${c.qty} ${c.unit}/${c.status}`);
  assert.deepStrictEqual(q('Mini Tiramisu'), ['Tiramisu=20 portions/chef_rule']);                 // ceil(ceil(58.5)/3)
  assert.deepStrictEqual(q('House salad'), ['House Salad=15 portions/chef_rule']);                 // 45/3
  assert.deepStrictEqual(q('Penne cacio e pepe with chicken'), ['PENNE CACIO E PEPE Catering=45 portions/chef_rule', 'Grilled Chicken=1.5 kg/chef_rule']);
  assert.deepStrictEqual(q('Penne Marinara'), ['PENNE ARRABBIATA BUFFET=45 portions/suggested']);  // "per questo evento" only
  assert.deepStrictEqual(q('Tuscan Board with Bruschetta, caprese and cantalupe/Parma'),
    ['TOMATO X BRUSCHETTA=1.77 kg/suggested', 'Caprese=59 pieces/suggested', 'PROSCIUTTO E MELONE=59 pieces/suggested']);
  assert.deepStrictEqual(q('Beef Lasagna'), []);
  assert.deepStrictEqual(q('Chicken parmigiana'), []);
  assert.strictEqual(K.suggest('Beef Lasagna', 45).open.length, 1);
  assert.strictEqual(K.suggest('Chicken parmigiana', 45).open.length, 1);
});
test('a rule Chef saved scales by guests and wins over the sources', () => {
  const a = { components: [{ recipe_id: 'r', title: 'Tiramisu', unit: 'portions', per_guest: 20 / 45 }], source: 'V020 · Mason' };
  assert.deepStrictEqual(K.fromAlias(a, 90).map(c => c.qty), [40]);
  assert.strictEqual(K.fromAlias(a, 90)[0].status, 'chef_saved');
});

// CAT05 — buffet rules confirmed by Chef 07/10 (R1 primi, R2 antipasti, R3 tagliata, R4 lasagna)
const MASON7 = ['Tuscan Board with Bruschetta, caprese and cantalupe/Parma', 'Penne cacio e pepe with chicken', 'Penne Marinara', 'Beef Lasagna', 'Chicken parmigiana', 'House salad', 'Mini Tiramisu'].map(name => ({ name }));
const P = (names, n) => K.plan(names.map(name => ({ name })), n);
test('Mason 45 guests: 3 primi, 1 antipasto (the board), categories', () => {
  const p = K.plan(MASON7, 45), by = Object.fromEntries(p.map(x => [x.name, x]));
  assert.deepStrictEqual(p.map(x => x.category), ['antipasto', 'primo', 'primo', 'primo', 'secondo', 'salad', 'dessert']);
  assert.strictEqual(by['Penne Marinara'].share.std, 7.5);                         // 45 × 0.5 ÷ 3
  assert.deepStrictEqual(by['Penne cacio e pepe with chicken'].comps.map(c => [c.title, c.qty, c.unit]),
    [['PENNE CACIO E PEPE Catering', 23, 'portions'], ['Grilled Chicken', 1.5, 'kg']]);   // 7.5 × 120 g = 900 g penne ÷ 40 g = 22.5 → 23
  assert.deepStrictEqual(by['Penne Marinara'].comps.map(c => [c.title, c.qty]), [['PENNE ARRABBIATA BUFFET', 18]]);  // 900 ÷ 50
  assert.deepStrictEqual(by['Beef Lasagna'].comps.map(c => [c.title, c.qty]), [['Lasagna', 12]]);   // ceil(45/36) = 2 trays × 6
  assert.strictEqual(by['Tuscan Board with Bruschetta, caprese and cantalupe/Parma'].share.std, 22.5);  // one antipasto: N/2
  assert.strictEqual(by['Tuscan Board with Bruschetta, caprese and cantalupe/Parma'].comps.length, 0);   // its standard portion is unknown
  assert.ok(by['Tuscan Board with Bruschetta, caprese and cantalupe/Parma'].questions[0].includes('ONE standard portion'));
  assert.strictEqual(by['Chicken parmigiana'].comps.length, 0);
  assert.deepStrictEqual(by['House salad'].comps.map(c => c.qty), [15]);
  assert.deepStrictEqual(by['Mini Tiramisu'].comps.map(c => c.qty), [20]);
});
test('40 guests: primi split 1/2/3, lasagna trays, antipasti split, tagliata not divided', () => {
  assert.strictEqual(P(['Penne Marinara'], 40)[0].share.std, 20);
  assert.deepStrictEqual(P(['Penne Marinara', 'Penne cacio e pepe'], 40).map(x => x.share.std), [10, 10]);
  assert.deepStrictEqual(P(['Penne Marinara', 'Penne cacio e pepe', 'Beef Lasagna'], 40).map(x => x.share.std), [6.667, 6.667, 6.667]);
  const tr = ks => P(['Beef Lasagna', 'Penne Marinara', 'Penne cacio e pepe'].slice(0, ks), 40)[0].comps[0].qty / 6;
  assert.deepStrictEqual([tr(1), tr(2), tr(3)], [4, 2, 2]);                        // ceil(40/12), ceil(40/24), ceil(40/36)
  const a = n => P(['Caprese', 'Tomato Bruschetta', 'Calamari'].slice(0, n).concat(['Penne Marinara']), 40).filter(x => x.category === 'antipasto').map(x => x.share.std);
  assert.deepStrictEqual([a(1), a(2), a(3)], [[20], [10, 10], [6.667, 6.667, 6.667]]);
  assert.deepStrictEqual(P(['NY Strip Tagliata with Arugula', 'Penne Marinara', 'Penne cacio e pepe'], 40)[0].comps.map(c => c.qty), [10]);
});
test('hors d\'oeuvre menu (no primi or secondi): antipasti keep the finger rules, R2 not applied', () => {
  const p = P(['Tomato Bruschetta', 'Caprese skewers', 'Mini Tiramisu'], 40);
  assert.ok(p.every(x => x.service === 'hors_doeuvre' && !x.share));
  assert.deepStrictEqual(p[0].comps.map(c => [c.title, c.qty]), [['TOMATO X BRUSCHETTA', 1.56]]);   // 52 slices × 30 g
});
