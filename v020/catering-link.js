/* Brigade V020 — CAT01: from the Tripleseat menu to the kitchen, without guessing.
   Pure functions, no data access, no writes. Loaded by the PWA (window.CateringLink) and by Node tests.

   What it decides
   - which Tripleseat lines are dishes, which are beverages, which are the package line ("menu for … ×45");
   - which Brigade recipes are CANDIDATES for a dish, by name only. A candidate is never a link:
     the screen always says "to confirm". No portions are derived from guests or package quantities. */
(function (root) {
  'use strict';

  const BEVERAGE_SECTION = /bever|drink|\bbar\b|wine|cocktail|bevand/i;
  const PACKAGE_LINE = /^(menu\b|package\b|pacchetto\b)|\bmenu for\b/i;
  // headings and notes inside the Food section: "Main Course Pick 1", "Regular", "can be served in the Cheese Wheel"
  const NOTE_LINE = /\bpick\s*\d+\b|^(regular|beverages?|wedding menu:?|sides|desserts?|appetizers?)$|^can be served\b/i;
  const DRINK_LINE = /^(water|iced tea|tea|coffee|soda|wines?|beers?)\b/i;
  const STOP = new Set(['with', 'and', 'the', 'for', 'plus', 'add', 'alla', 'all', 'con', 'nel', 'nella', 'del', 'della', 'di', 'in', 'on', 'or', 'of', 'a', 'e', 'x', 'buffet', 'mini', 'like', 'style', 'half', 'served', 'wheel', 'tossed', 'shredded', 'sliced', 'bed']);
  // words that alone do not identify a dish (a pasta shape, a protein, a generic course)
  const GENERIC = new Set(['penne', 'pasta', 'spaghetti', 'fettuccine', 'chicken', 'beef', 'salad', 'sauce', 'catering', 'cheese', 'board', 'tomato', 'tomatoes',
    'italian', 'oil', 'basil', 'oregano', 'lemon', 'cream', 'creamy', 'truffle', 'mushrooms', 'balsamic', 'glaze', 'roasted', 'grated', 'mozzarella', 'potatoes']);
  // same word in another language or spelling — never a different ingredient
  const SAME = { parmigiana: 'parmesan', parmigiano: 'parmesan', cantalupe: 'melone', cantaloupe: 'melone', melon: 'melone', tiramisù: 'tiramisu', lasagne: 'lasagna' };

  function tokens(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .split(/[^a-z0-9]+/).filter(Boolean).map(w => SAME[w] || w)
      .filter(w => w.length >= 3 && !STOP.has(w));
  }

  /* menu = { lines: [{ section, name, details, quantity }] } as returned by ts_event_menus_kitchen */
  function kitchenDishes(menu) {
    const out = { dishes: [], packages: [], beverages: [], notes: [] };
    ((menu && menu.lines) || []).forEach(l => {
      const name = String(l.name || '').trim();
      if (!name) return;
      if (BEVERAGE_SECTION.test(l.section || '') || DRINK_LINE.test(name)) { out.beverages.push(l); return; }
      if (NOTE_LINE.test(name)) { out.notes.push(l); return; }
      if (PACKAGE_LINE.test(name)) { out.packages.push(l); return; }
      out.dishes.push({ name, details: l.details || '', section: l.section || '', quantity: l.quantity == null || l.quantity === '' ? null : l.quantity });
    });
    return out;
  }

  /* recipes = [{ id, title, menu_group }]; returns up to `max` candidates, best first.
     Rule: at least one shared word is specific (not a pasta shape, protein or single ingredient), and either
     the recipe title is entirely contained in the dish name, or the shared words cover half of both names. */
  function candidates(dishName, recipes, max) {
    const d = new Set(tokens(dishName));
    if (!d.size) return [];
    const out = [];
    (recipes || []).forEach(r => {
      const t = [...new Set(tokens(r.title))];
      if (!t.length) return;
      const hit = t.filter(w => d.has(w));
      if (!hit.length || !hit.some(w => !GENERIC.has(w))) return;
      const score = hit.length / t.length, cover = hit.length / d.size;
      if (!(score >= 0.99 || (score >= 0.5 && cover >= 0.5))) return;
      out.push({ id: r.id, title: r.title, menu_group: r.menu_group || null, score: Math.round(score * 100) / 100, words: hit });
    });
    out.sort((a, b) => b.score - a.score || b.words.length - a.words.length || a.title.localeCompare(b.title));
    return out.slice(0, max || 3);
  }

  const API = { kitchenDishes, candidates, tokens };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') root.CateringLink = API;
})(typeof window !== 'undefined' ? window : this);
