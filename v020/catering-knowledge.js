/* Brigade V020 — CAT03: catering knowledge already decided, turned into SUGGESTIONS for a dish.
   Sources: thread "consuntivi" (Gmail 1a0f318bcdaa146c, 30/09–01/10), CATERING_KNOWLEDGE_CENSUS.md v1.4,
   preventivo/event_plan.py PROFILES. Nothing here is saved: Chef confirms or changes, then saves.
   status 'chef_rule' = Chef stated the rule; 'suggested' = inferred or partly assumed, to confirm.
   Quantities are formulas on the event guests, rounded up (whole pieces up, kg to 2 decimals). */
(function (root) {
  'use strict';
  const up = x => Math.ceil(x - 1e-9);
  const kg = x => Math.ceil(x * 100 - 1e-9) / 100;
  const finger = n => up(n * 1.3);                       // S01: finger food +30%, whole pieces up

  const R = {
    cacioCat:  { id: '475959d6-8558-4a97-907c-39d8fdd60181', title: 'PENNE CACIO E PEPE Catering' },
    grillChk:  { id: '7502f23f-5735-467c-92d3-97b6b153c647', title: 'Grilled Chicken' },
    arrabBuf:  { id: '407c50ee-0e32-41b2-83eb-a582c323d92a', title: 'PENNE ARRABBIATA BUFFET' },
    house:     { id: 'f873aa45-51e3-419c-a589-22070597e575', title: 'House Salad' },
    tiramisu:  { id: '11e63d03-24a4-4ced-8086-43b831f84f72', title: 'Tiramisu' },
    brusch:    { id: 'e911b676-21ff-4e91-84df-d78af1d31ad2', title: 'TOMATO X BRUSCHETTA' },
    caprese:   { id: '8169380a-b05b-49f2-93a1-7289b7c2dfe0', title: 'Caprese' },
    melone:    { id: '837d1b4c-c213-4800-8ef3-390d913bb8df', title: 'PROSCIUTTO E MELONE' },
    chkParm:   { id: '4429c13f-8811-4e50-b9cc-77c8c9128da3', title: 'Chicken Parmesan' },
    lasagna:   { id: 'cc460bbf-5955-4921-b5e3-720efb821232', title: 'Lasagna' },
  };

  /* Each rule: when it applies, which recipe, unit, how much for n guests, why, source. */
  const RULES = [
    { key: 'Q09+Q05', when: t => /cacio e pepe/.test(t) && /chicken|pollo/.test(t), comps: [
      { r: R.cacioCat, unit: 'portions', qty: n => n, status: 'chef_rule', rule: 'Catering recipe for 100, scaled to the guests (Q09)', source: 'Chef 30/09: "Per la versione catering esiste già una ricetta. Usa quella"' },
      { r: R.grillChk, unit: 'kg', qty: n => kg(up(n / 3) * 0.1), status: 'chef_rule', rule: '1 restaurant portion = 100 g cooked = 3 people (Q05); raw = cooked ÷ 0.75', source: 'Chef 30/09–01/10 (yield 75% set by Chef)' } ] },
    { key: 'Q09', when: t => /cacio e pepe/.test(t) && !/chicken|pollo|shrimp/.test(t), comps: [
      { r: R.cacioCat, unit: 'portions', qty: n => n, status: 'chef_rule', rule: 'Catering recipe for 100, scaled to the guests (Q09)', source: 'Chef 30/09: "Per la versione catering esiste già una ricetta. Usa quella"' } ] },
    { key: 'Q10', when: t => /marinara|arrabbiata/.test(t) && /penne|pasta/.test(t), comps: [
      { r: R.arrabBuf, unit: 'portions', qty: n => n, status: 'suggested', rule: '40 g penne + 50 g arrabbiata sauce per person (Q10)', source: 'Chef 30/09 (TEVA, "per questo evento"); Marinara vs Arrabbiata name still open' } ] },
    { key: 'Q14', when: t => /house salad/.test(t), comps: [
      { r: R.house, unit: 'portions', qty: n => up(n / 3), status: 'chef_rule', rule: '1 restaurant portion = 3 people; + Caesar dressing 30 g per person, not in this recipe (Q14)', source: 'Chef 30/09' } ] },
    { key: 'S01+S09', when: t => /mini tiramis|tiramisu shot/.test(t), comps: [
      { r: R.tiramisu, unit: 'portions', qty: n => up(finger(n) / 3), status: 'chef_rule', rule: 'mini = guests × 1.3 rounded up; 1 standard tiramisù = 3 mini (S01, S09)', source: 'Chef 30/09: "1 tiramisù standard Zeno\'s = 3 mini"; no new Mini recipe' } ] },
    { key: 'Q15', when: t => /bruschetta/.test(t) && !/mushroom/.test(t), board: true, comps: [
      { r: R.brusch, unit: 'kg', qty: n => kg(finger(n) * 30 / 1000), status: 'chef_rule', rule: '1 slice per person +30%, 30 g topping per slice (Q15)', source: 'Chef 01/10' } ] },
    { key: 'Q02', when: t => /caprese/.test(t) && !/skewer/.test(t), board: true, comps: [
      { r: R.caprese, unit: 'pieces', qty: n => finger(n), status: 'chef_rule', rule: 'slices: 1 tomato 48.33 g + 1 mozzarella 23.33 g per person, +30% (Q02). Restaurant recipe: slices are not its portions', source: 'Chef 01/10' } ] },
    { key: 'Q26', when: t => /cantal|melon|melone/.test(t) && !/watermelon/.test(t), board: true, comps: [
      { r: R.melone, unit: 'pieces', qty: n => finger(n), status: 'suggested', rule: '1 melon ≈ 50 pieces, 7.5 g Parma per piece (Q26). +30% on melon pieces is an assumption', source: 'Chef 01/10 (Q26); +30% not confirmed' } ] },
  ];

  /* Dishes with no rule: what is known, so Chef is asked only what is really missing. */
  const OPEN = [
    { when: t => /lasagn/.test(t), candidates: [R.lasagna], ask: 'How many guests one Lasagna pan feeds (the recipe makes 6 restaurant portions), and how many pasta sheets.', source: 'Asked on 01/10, not answered' },
    { when: t => /parmigiana|chicken parm/.test(t), candidates: [R.chkParm], ask: 'Brigade has no catering version of Chicken Parmesan: only the restaurant one (240 g, 1 piece). How many grams of raw chicken per person for catering?', source: 'Chef 01/10: "Non creare ora la ricetta Chicken Parmesan"; grams never decided' },
  ];

  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }

  /* text = Tripleseat dish, guests = event guests. Returns { comps, open, board } — nothing saved. */
  function suggest(text, guests) {
    const t = norm(text), n = Number(guests) || 0, comps = [];
    let board = false;
    RULES.forEach(r => {
      if (!r.when(t)) return;
      if (r.board) board = true;
      r.comps.forEach(c => comps.push({ recipe_id: c.r.id, title: c.r.title, unit: c.unit, qty: n ? c.qty(n) : null,
        status: c.status, rule: c.rule, source: c.source, key: r.key }));
    });
    // a board/platter made of several finger rules: the +30% on the whole board was never confirmed for it
    if (board && comps.length > 1) comps.forEach(c => { c.status = 'suggested'; c.rule += ' · board: +30% to confirm'; });
    const open = OPEN.filter(o => o.when(t)).map(o => ({ ask: o.ask, source: o.source, candidates: o.candidates }));
    return { comps, open, board: board && comps.length > 1 };
  }

  /* A rule Chef saved in Brigade (catering_menu_aliases) beats the sources above. */
  function fromAlias(alias, guests, text) {
    const n = Number(guests) || 0, src = text != null ? suggest(text, guests).comps : [];
    return (alias.components || []).map(c => {
      if (c.association_only) {            // Chef confirmed the recipe, not a quantity: quantity stays a suggestion from the sources
        const s = src.find(x => x.recipe_id === c.recipe_id);
        return { recipe_id: c.recipe_id, title: c.title, unit: s ? s.unit : c.unit, qty: s ? s.qty : null, status: 'assoc',
          rule: (s ? s.rule + ' · ' : '') + 'recipe confirmed by Chef, quantity to confirm', source: alias.source };
      }
      const q = c.per_guest != null && n ? (c.unit === 'kg' ? kg(c.per_guest * n) : up(c.per_guest * n)) : c.qty;
      return { recipe_id: c.recipe_id, title: c.title, unit: c.unit, qty: q, status: 'chef_saved',
        rule: c.per_guest != null ? `${c.per_guest.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')} ${c.unit} per guest` : 'same quantity', source: alias.source };
    });
  }

  const API = { suggest, fromAlias, norm, RULES, OPEN };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') root.CateringKnowledge = API;
})(typeof window !== 'undefined' ? window : this);
