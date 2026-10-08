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
    tagliata:  { id: '36630463-815a-4dff-b00e-fb3ade21ebe4', title: 'Tagliata Alla Griglia Ny Strip' },
    caesar:    { id: 'c556ada2-e337-44f2-9e0f-2cf9331386e0', title: 'CHICKEN CAESAR SALADE' },
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


  /* ===== CAT05 — event plan with the buffet rules Chef confirmed on 07/10 =====
     R1 primi (buffet): half a STANDARD portion per guest for the whole category: each primo = N × 0.5 / K.
     R2 antipasti (buffet with antipasti/primi/secondi): same, split among the antipasti. Not for hors d'oeuvre.
        A composite board is ONE antipasto.
     R3 tagliata: 1 every 4 people, rounded up. Not divided by K.
     R4 lasagna: 1 catering tray (= Brigade "Lasagna", 1 pan, 6 restaurant portions) every 12 × K guests; trays = ceil(N / 12K).
     STANDARD portion = the restaurant portion; Brigade's "Half" recipes are exactly half of it
     (Penne Midnight 120 g penne · Penne Midnight Half 60 g). Catering recipes already have smaller portions
     (PENNE CACIO E PEPE Catering 40 g penne, PENNE ARRABBIATA BUFFET 50 g): standard portions are turned into
     grams of penne first, then into catering portions — never halved twice. */
  const SRC07 = 'Chef 07/10 (email shell lab 1a11919e8398e265)';
  const STD_PENNE_G = 120;                                  // Penne Midnight (restaurant); Half = 60 g
  const BASE_PENNE = 'standard portion = restaurant portion, 120 g penne (Penne Midnight; Half = 60 g) — base reconstructed from Brigade recipes, to confirm';
  const CATS = [
    ['dessert', /tiramis|panna ?cotta|cheesecake|cannoli|\bcake\b|cremino|dessert|gelato|bavarese/],
    ['primo', /penne|\bpasta\b|lasagn|ravioli|risotto|fettuccin|spaghetti|maccheroni|gnocc|tagliatell|rigatoni|orecchiette|paccheri/],
    ['antipasto', /board|bruschetta|caprese|antipast|charcuterie|tagliere|calamari|cantal|melon|taralli|skewer|cheese ball|watermelon|nests? of|arancin/],
    ['salad', /salad|insalata/],
    ['secondo', /chicken|pollo|salmon|salmone|strip|tagliata|steak|filet|branzino|lamb|agnello|tenderloin|scaloppin|piccata|meatballs in/],
  ];
  function category(text) { const t = norm(text); const c = CATS.find(([, re]) => re.test(t)); return c ? c[0] : 'other'; }
  const fix = x => Math.round(x * 1000) / 1000;
  function comp(r, unit, qty, status, rule, source) { return { recipe_id: r.id, title: r.title, unit, qty, status, rule, source }; }

  /* dishes = [{ name }] from the CURRENT Tripleseat menu (titles, drinks, headings already removed); n = guests */
  function plan(dishes, n) {
    n = Number(n) || 0;
    const cats = dishes.map(d => category(d.name));
    const buffet = cats.some(c => c === 'primo' || c === 'secondo');
    const K = c => cats.filter(x => x === c).length;
    const kp = K('primo'), ka = K('antipasto');
    const pickMenu = dishes.some(d => /\bpick\s*\d/i.test(d.name));
    return dishes.map((d, i) => {
      const t = norm(d.name), cat = cats[i], out = { name: d.name, category: cat, service: buffet ? 'buffet' : 'hors_doeuvre', comps: [], questions: [], notes: [] };
      if (!n) { out.questions.push('Guests not set on the event.'); return out; }
      if (pickMenu && (cat === 'primo' || cat === 'antipasto')) out.questions.push('The menu has "Pick N" choices: K counts every option listed — confirm which were chosen.');
      if (cat === 'primo') {
        const std = n * 0.5 / kp, share = `${n} guests × 0.5 ÷ ${kp} ${kp === 1 ? 'primo' : 'primi'} = ${fix(std)} standard portions (R1)`;
        out.share = { rule: 'R1', std: fix(std), k: kp };
        if (/lasagn/.test(t)) {
          const trays = Math.ceil(n / (12 * kp));
          out.comps.push(comp(R.lasagna, 'portions', trays * 6, 'chef_rule', `${trays} catering ${trays === 1 ? 'tray' : 'trays'} = ceil(${n} ÷ (12 × ${kp})) (R4); 1 tray = Brigade "Lasagna", 1 pan of 6 restaurant portions → ${trays * 6} portions`, SRC07 + ': "una teglia per 12 ospiti se è l\'unico primo"'));
        } else if (/cacio e pepe/.test(t)) {
          const g = std * STD_PENNE_G;
          out.comps.push(comp(R.cacioCat, 'portions', Math.ceil(fix(g / 40)), 'chef_rule', `${share} × 120 g = ${fix(g)} g penne ÷ 40 g per catering portion = ${fix(g / 40)} → rounded up. ${BASE_PENNE}`, SRC07 + ' (R1) · recipe: Chef 30/09 and 07/10'));
          if (/chicken|pollo/.test(t)) out.comps.push(comp(R.grillChk, 'kg', kg(up(n / 3) * 0.1), 'chef_rule', `1 restaurant portion = 100 g cooked = 3 people (Q05), kept per guest: NOT divided among the primi. Conflict to check: if the chicken follows this primo's share (1/${kp}), it would be ${kg(up(n / 3) * 0.1 / kp)} kg cooked`, 'Chef 30/09–01/10; confirmed again 07/10'));
        } else if (/marinara|arrabbiata/.test(t) && /penne|pasta/.test(t)) {
          const g = std * STD_PENNE_G;
          out.comps.push(comp(R.arrabBuf, 'portions', Math.ceil(fix(g / 50)), 'chef_rule', `${share} × 120 g = ${fix(g)} g penne ÷ 50 g per buffet portion = ${fix(g / 50)} → rounded up. ${BASE_PENNE}`, SRC07 + ' (R1) · Penne Marinara → PENNE ARRABBIATA BUFFET confirmed by Chef 07/10'));
        } else out.questions.push(`${share}: which Brigade recipe, and what is its standard portion?`);
      } else if (cat === 'antipasto' && buffet) {
        const std = n * 0.5 / ka;
        out.share = { rule: 'R2', std: fix(std), k: ka };
        const share = `${n} guests × 0.5 ÷ ${ka} ${ka === 1 ? 'antipasto' : 'antipasti'} = ${fix(std)} standard portions (R2)`;
        if (/board/.test(t)) out.questions.push(`${share}. The board counts as one antipasto. What is ONE standard portion of this board (e.g. how many bruschetta, caprese slices and melon pieces)? Without it the quantities are not set.`);
        else if (/caprese/.test(t)) out.comps.push(comp(R.caprese, 'portions', Math.ceil(fix(std)), 'chef_rule', `${share}; standard portion = the restaurant Caprese portion (base to confirm)`, SRC07 + ' (R2)'));
        else out.questions.push(`${share}: which recipe, and what is its standard portion?`);
      } else if (cat === 'secondo') {
        if (/tagliata|strip/.test(t)) out.comps.push(comp(R.tagliata, 'portions', up(n / 4), 'chef_rule', `1 tagliata every 4 people, rounded up: ceil(${n} ÷ 4) (R3, S07). Not divided among other mains`, SRC07 + ' (R3)'));
        else if (/parmigiana|chicken parm/.test(t)) out.questions.push(OPEN[1].ask);
        else out.questions.push('No confirmed rule for this main: which recipe and how many grams per person?');
      } else if (cat === 'salad') {
        if (/house salad/.test(t)) out.comps.push(comp(R.house, 'portions', up(n / 3), 'chef_rule', '1 restaurant portion = 3 people (Q14); + Caesar dressing 30 g per person, not in this recipe', 'Chef 30/09'));
        else if (/caesar/.test(t)) out.comps.push(comp(R.caesar, 'portions', up(n / 3), 'chef_rule', '1 restaurant portion (romaine 100 g + parmesan 30 g) = 3 people + Caesar dressing 30 g per person (Q13)', 'Chef 30/09'));
        else out.questions.push('No confirmed rule for this salad.');
      } else {
        const s = suggest(d.name, n);                          // dessert, hors d'oeuvre / finger: the earlier rules
        out.comps = s.comps; s.open.forEach(o => out.questions.push(o.ask));
        if (!s.comps.length && !s.open.length) out.questions.push('No confirmed rule for this dish.');
      }
      return out;
    });
  }

  const API = { suggest, fromAlias, norm, RULES, OPEN, plan, category };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') root.CateringKnowledge = API;
})(typeof window !== 'undefined' ? window : this);
