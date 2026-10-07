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
