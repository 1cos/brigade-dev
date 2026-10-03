/* Brigade V020 — KITCHEN DEMO (laboratory only).
   Fictitious data, simulated users, simulated actions: nothing is read from or written to Brigade.
   Purpose: show side by side what a cook and Chef would see. It proves the experience, NOT the security:
   in real Brigade every permission still has to be enforced on the server. */
(function () {
'use strict';
const KEY = 'brigade-v020-kitchen-demo';
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sv = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const I = {
  today: sv('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>'),
  rest: sv('<path d="M7 2v20M4 2v6a3 3 0 0 0 6 0V2M17 22V2c-2.5 1-4 4-4 8h4"/>'),
  cat: sv('<path d="M3 17h18M4 17a8 8 0 0 1 16 0M12 9V7M10 7h4M2 20h20"/>'),
  plan: sv('<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 10h18M8 2v4M16 2v4"/>'),
};

/* ---------- fictitious data ---------- */
const USERS = {
  max: { id: 'max', name: 'Max', role: 'admin', station: null, color: 'var(--today)' },
  luca: { id: 'luca', name: 'Luca (demo)', role: 'staff', station: 'Pasta Station', color: 'var(--rest)' },
  sara: { id: 'sara', name: 'Sara (demo)', role: 'staff', station: 'Salad Station', color: 'var(--cat)' },
};
const RECIPES = {
  pom: { title: 'Pomodoro Sauce', batch: '4 L', price: null, fc: null, cost: 9.8,
    comps: [['San Marzano tomatoes', '5.5 kg'], ['Extra virgin olive oil', '250 g'], ['Garlic', '40 g'], ['Basil', '30 g'], ['Salt', '45 g']],
    steps: ['Warm the oil with the garlic, do not brown it.', 'Add the tomatoes crushed by hand, bring to a simmer.', 'Cook 40 min on low heat, stirring.', 'Off the heat add basil and salt. Cool, label, date.'] },
  fet: { title: 'Fresh Fettuccine', batch: '3 kg', cost: 6.1,
    comps: [['00 flour', '1.8 kg'], ['Semolina', '200 g'], ['Eggs', '20 pcs']],
    steps: ['Mix flour and semolina, add eggs.', 'Knead 10 min, rest 30 min covered.', 'Sheet to 1.5 mm and cut 8 mm.', 'Nest 120 g portions on semolina trays.'] },
  rag: { title: 'Ragù alla Bolognese', batch: '6 kg', cost: 38.2,
    comps: [['Ground beef', '3 kg'], ['Pork sausage', '1 kg'], ['Soffritto', '1.2 kg'], ['Red wine', '400 g'], ['Tomato paste', '300 g']],
    steps: ['Brown the meat in batches.', 'Add soffritto, deglaze with wine.', 'Add paste and stock, simmer 3 h.'] },
  dish: { title: 'Tagliatelle al Ragù', price: 24, fc: 23.5, cost: 5.64, batch: '1 portion',
    comps: [['Fresh Fettuccine', '120 g'], ['Ragù alla Bolognese', '180 g'], ['Parmesan', '15 g']],
    steps: ['Cook pasta 2 min.', 'Toss with ragù and a ladle of pasta water.', 'Plate, finish with parmesan.'] },
};
const PREP = [
  { id: 'p1', name: 'Pomodoro Sauce', station: 'Pasta Station', plan: 'Do first', qty: '4 L', stock: '1 L', recipe: 'pom', why: 'Covers less than a day of sales' },
  { id: 'p2', name: 'Fresh Fettuccine', station: 'Pasta Station', plan: 'Prep today', qty: '3 kg', stock: '0.8 kg', recipe: 'fet', why: 'Saturday is busy: 42 covers forecast' },
  { id: 'p3', name: 'Ragù alla Bolognese', station: 'Pasta Station', plan: 'Looks OK', qty: '', stock: '5 kg', recipe: 'rag', why: 'Covers 2 days' },
  { id: 'p4', name: 'Parmesan grated', station: 'Pasta Station', plan: 'Count first', qty: '', stock: 'not counted', why: 'No count since Tuesday' },
  { id: 'p5', name: 'Caesar dressing', station: 'Salad Station', plan: 'Prep today', qty: '2 L', stock: '0.5 L', why: 'Low' },
];
const SHARED = [{ name: 'Closing checks · Pasta Station', meta: 'Tonight · whoever closes the station' }];
const CATERING = [{ name: 'Wedding (demo) · Sat 120 guests', need: 'Penne cacio e pepe 9 kg · Meatballs 156 pcs', station: 'Pasta Station' }];
const SHIFTS = { luca: [['Sat 3 Oct', '14:00–23:00', 'Pasta Station'], ['Sun 4 Oct', '11:00–20:00', 'Pasta Station'], ['Tue 6 Oct', '14:00–22:00', 'Sauté']] };
const BRIEF = 'Busy Saturday: 42 covers + wedding prep. Fettuccine first, then sauce.';

/* ---------- state (per device, like the real app) ---------- */
const fresh = () => ({ v: 2, user: null, screen: 'login', tabs: [], open: null, pick: null, pin: '', log: [], reports: [], prep: {} });
let S = fresh();
try { const x = JSON.parse(localStorage.getItem(KEY)); if (x && x.v === 2) S = x; } catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
// screenshots/links: #as=luca&s=k-today
(function fromHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.get('seed') === 'report') S.reports = [{ by: 'Luca (demo)', reason: 'Missing ingredient', note: 'San Marzano finished, 2 cans left', at: '15:42' }];
  if (h.get('seed') === 'progress') S.prep = { p2: { started: true, by: 'Luca (demo)', at: '14:20' }, p4: { done: 'counted', by: 'Luca (demo)', at: '14:05' } };
  if (h.get('as') && USERS[h.get('as')]) { S.user = h.get('as'); S.screen = h.get('s') || (S.user === 'max' ? 'a-today' : 'k-today'); if (h.get('r')) S.open = h.get('r'); }
})();
const U = () => USERS[S.user];
const isAdmin = () => U() && U().role === 'admin';
function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2200); }
const go = (s, extra) => { Object.assign(S, extra || {}, { screen: s }); save(); render(); window.scrollTo(0, 0); };

/* ---------- pieces ---------- */
const who = () => U() ? `<div class="who"><span class="avatar" style="background:${U().color}">${esc(U().name[0])}</span><span><div class="n">${esc(U().name)}</div><div class="r">${isAdmin() ? 'Chef · admin' : esc(U().station) + ' · kitchen'}</div></span><button class="sw" data-a="switch">Switch user</button></div>` : '';
const tabs = () => S.tabs.length ? `<div class="k-tabs">${S.tabs.map((t) => `<button class="k-tab ${S.open === t && /recipe/.test(S.screen) ? 'on' : ''}" data-a="openRecipe" data-r="${t}">${esc(RECIPES[t].title)}</button>`).join('')}</div>` : '';
function bottom(active) {
  const items = isAdmin()
    ? [['a-today', 'Today', I.today, '--today'], ['a-rest', 'Restaurant', I.rest, '--rest'], ['k-cat', 'Catering', I.cat, '--cat'], ['k-plan', 'Planner', I.plan, '--plan']]
    : [['k-today', 'My shift', I.today, '--today'], ['k-rest', 'Recipes', I.rest, '--rest'], ['k-cat', 'Catering', I.cat, '--cat'], ['k-plan', 'Planner', I.plan, '--plan']];
  return `<nav class="bottom">${items.map(([s, l, ic, c]) => `<button class="${active === s ? 'on' : ''}" style="--c:var(${c})" data-a="go" data-s="${s}">${ic}${l}</button>`).join('')}</nav>`;
}
const page = (inner, active) => `${who()}${tabs()}<div class="page">${inner}</div>${S.user ? bottom(active) : ''}`;
const head = (eb, h, sub) => `<div><div class="eyebrow">${eb}</div><h1>${h}</h1>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`;
const prepState = (p) => S.prep[p.id] || {};
const prepRow = (p) => { const st = prepState(p); const hot = ['Do first', 'Prep today', 'Count first'].includes(p.plan);
  return `<button class="row ${st.done ? 'done' : ''}" data-a="go" data-s="k-prep" data-id="${p.id}"><span class="main"><div class="name">${esc(p.name)}</div><div class="meta">${st.done ? `Done · ${esc(st.done)} by ${esc(st.by)}` : st.started ? `In progress · ${esc(st.by)}` : esc(p.why)}</div></span><span class="right ${hot && !st.done ? 'wtx' : 'muted'}">${st.done ? '✓' : esc(p.plan)}${p.qty && !st.done ? ' · ' + esc(p.qty) : ''}</span></button>`; };

/* ---------- screens ---------- */
const SC = {};
SC.login = () => `<div class="page">${head('Brigade', 'Who is working?', 'Tap your name, then your 4-digit PIN.')}
  <div class="people">${Object.values(USERS).map((u) => `<button data-a="pick" data-u="${u.id}"><span class="avatar" style="background:${u.color}">${esc(u.name[0])}</span><span><b>${esc(u.name)}</b><div class="lock">${u.role === 'admin' ? 'Chef' : esc(u.station)}</div></span></button>`).join('')}</div>
  ${S.pick ? `<div class="card" style="padding:16px"><div class="dots">${[0, 1, 2, 3].map((i) => `<i class="${S.pin.length > i ? 'on' : ''}"></i>`).join('')}</div>
    <div class="pin">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map((k) => k === '' ? '<span></span>' : `<button data-a="key" data-k="${k}">${k}</button>`).join('')}</div>
    <p class="lock" style="text-align:center">Demo: any 4 digits work. Real Brigade checks the PIN on the server.</p></div>` : ''}
</div>`;

SC['k-today'] = () => { const mine = PREP.filter((p) => p.station === U().station);
  const order = { 'Do first': 0, 'Count first': 1, 'Prep today': 2, 'Looks OK': 3 };
  const todo = mine.filter((p) => !prepState(p).done).sort((a, b) => order[a.plan] - order[b.plan]), done = mine.filter((p) => prepState(p).done);
  const cat = CATERING.filter((c) => c.station === U().station);
  return page(`${head('Saturday 3 October', `Hi ${esc(U().name.split(' ')[0])}`, `${esc(U().station)} · shift 14:00–23:00`)}
    <div class="note"><b>From Chef:</b> ${esc(BRIEF)}</div>
    <section><div class="chap"><h2>My station · to do</h2><span>${todo.length}</span></div><div class="list">${todo.map(prepRow).join('') || '<div class="row"><span class="main"><div class="meta">All done 👏</div></span></div>'}</div></section>
    ${cat.length ? `<section><h2>Catering for my station</h2><div class="list">${cat.map((c) => `<button class="row" data-a="go" data-s="k-cat"><span class="main"><div class="name">${esc(c.name)}</div><div class="meta">${esc(c.need)}</div></span><span class="chev">›</span></button>`).join('')}</div></section>` : ''}
    <section><h2>Shared with the team</h2><div class="list">${SHARED.map((s) => `<div class="row"><span class="main"><div class="name">${esc(s.name)}</div><div class="meta">${esc(s.meta)}</div></span></div>`).join('')}</div></section>
    ${done.length ? `<section><h2>Done today</h2><div class="list">${done.map(prepRow).join('')}</div></section>` : ''}
    <button class="hero" style="background:var(--warn)" data-a="go" data-s="k-report"><div class="k">Something wrong?</div><div class="t">Report a problem</div><div class="m">Missing ingredient, broken equipment, quality. Chef sees it.</div></button>`, 'k-today'); };

SC['k-prep'] = () => { const p = PREP.find((x) => x.id === S.open) || PREP[0]; const st = prepState(p);
  return page(`<button class="back" data-a="go" data-s="${isAdmin() ? 'a-today' : 'k-today'}">‹ My shift</button>
    ${head(esc(p.station), esc(p.name), esc(p.why))}
    <div class="facts"><span>Plan <b>${esc(p.plan)}${p.qty ? ' · ' + esc(p.qty) : ''}</b></span><span>Stock <b>${esc(p.stock)}</b></span></div>
    ${p.recipe ? `<div class="list"><button class="row" data-a="openRecipe" data-r="${p.recipe}"><span class="main"><div class="name">${esc(RECIPES[p.recipe].title)}</div><div class="meta">Recipe · batch ${esc(RECIPES[p.recipe].batch)}</div></span><span class="chev">›</span></button></div>` : ''}
    ${st.done ? `<div class="note"><b>Done:</b> ${esc(st.done)} · ${esc(st.by)} at ${esc(st.at)}</div>`
      : `<div class="act">${st.started ? '' : `<button class="ghost" data-a="start" data-id="${p.id}">Start</button>`}<button class="primary" data-a="finish" data-id="${p.id}">Done${p.qty ? ' · ' + esc(p.qty) : ''}</button></div>
      <p class="lock">${st.started ? `Started by ${esc(st.by)} at ${esc(st.at)}. ` : ''}Done asks only the quantity made; the stock updates from it.</p>`}`, 'k-today'); };

function recipeScreen() { const r = RECIPES[S.open] || RECIPES.pom; const admin = isAdmin();
  return page(`<button class="back" data-a="go" data-s="${admin ? 'a-rest' : 'k-rest'}">‹ ${admin ? 'Restaurant' : 'Recipes'}</button>
    ${head('Recipe', esc(r.title), 'Batch ' + esc(r.batch))}
    ${admin ? `<div class="facts">${r.price ? `<span>Price <b>$${r.price}</b></span>` : ''}${r.fc ? `<span>Food cost <b>${r.fc}%</b></span>` : ''}<span>Recipe cost <b>$${r.cost.toFixed(2)}</b></span></div>` : ''}
    <section><h2>Components</h2><div class="list">${r.comps.map(([n, q]) => `<div class="ing"><span>${esc(n)}</span><b class="num">${esc(q)}</b></div>`).join('')}</div></section>
    <section><h2>Method</h2><div class="list">${r.steps.map((s, i) => `<div class="step"><span class="n">${i + 1}</span><span>${esc(s)}</span></div>`).join('')}</div></section>
    ${admin ? '<p class="lock">Chef sees prices and food cost; the team does not.</p>' : '<p class="lock">Read only: recipes are changed by Chef.</p>'}`, admin ? 'a-rest' : 'k-rest'); }
SC['k-recipe'] = recipeScreen; SC['a-recipe'] = recipeScreen;

SC['k-rest'] = () => page(`${head('Kitchen', 'Recipes', 'What you cook, with quantities and method')}
  <div class="list">${['pom', 'fet', 'rag', 'dish'].map((k) => `<button class="row" data-a="openRecipe" data-r="${k}"><span class="main"><div class="name">${esc(RECIPES[k].title)}</div><div class="meta">Batch ${esc(RECIPES[k].batch)}</div></span><span class="chev">›</span></button>`).join('')}</div>`, 'k-rest');

SC['k-report'] = () => page(`<button class="back" data-a="go" data-s="k-today">‹ My shift</button>
  ${head('To Chef', 'Report a problem', 'Pick one, add a word if you want. Chef sees it in Today.')}
  <div class="reasons">${['Missing ingredient', 'Equipment broken', 'Quality problem', 'Recipe unclear'].map((r) => `<button class="${S.reason === r ? 'on' : ''}" data-a="reason" data-r="${r}">${r}</button>`).join('')}</div>
  <textarea id="note" placeholder="e.g. San Marzano finished, 2 cans left"></textarea>
  <div class="act"><button class="primary" data-a="send">Send to Chef</button></div>`, 'k-today');

SC['k-cat'] = () => page(`${head('Catering', 'What to cook', 'Only the production for your kitchen: no client data, no prices')}
  <div class="list">${CATERING.map((c) => `<div class="row"><span class="main"><div class="name">${esc(c.name)}</div><div class="meta">${esc(c.need)}</div></span><span class="right muted">${esc(c.station)}</span></div>`).join('')}</div>`, 'k-cat');

SC['k-plan'] = () => page(`${head('Planner', isAdmin() ? 'Team this week' : 'My shifts', isAdmin() ? '' : 'From the schedule')}
  <div class="list">${(isAdmin() ? [['Luca (demo)', 'Sat 14:00–23:00', 'Pasta Station'], ['Sara (demo)', 'Sat 11:00–20:00', 'Salad Station']] : SHIFTS.luca).map(([a, b, c]) => `<div class="row"><span class="main"><div class="name">${esc(a)}</div><div class="meta">${esc(b)}</div></span><span class="right muted">${esc(c)}</span></div>`).join('')}</div>`, 'k-plan');

SC['a-today'] = () => { const reps = S.reports.slice().reverse();
  return page(`${head('Saturday 3 October', 'Good afternoon, Chef', '')}
    ${reps.length ? `<section><div class="chap"><h2>From the team</h2><span>${reps.length}</span></div><div class="list">${reps.map((r) => `<div class="dec"><div class="name">${esc(r.by)}: ${esc(r.reason)}</div><div class="meta">${esc(r.note || '')} · ${esc(r.at)}</div></div>`).join('')}</div></section>` : '<div class="note">Nothing from the team yet. (Demo: log in as Luca and report a problem.)</div>'}
    <section><div class="chap"><h2>Decisions</h2><span>2</span></div><div class="list"><div class="dec"><div class="name">H-E-B receipt: how many filets?</div><div class="meta">Invoices</div></div><div class="dec"><div class="name">Ribeye Steaks: portions per batch</div><div class="meta">Recipes</div></div></div></section>
    <section><h2>Prep progress</h2><div class="list">${PREP.map(prepRow).join('')}</div></section>`, 'a-today'); };

SC['a-rest'] = () => page(`${head('Restaurant', 'Everything', 'Chef only: prices, invoices, sales')}
  <div class="grid">${[['Prep', 'k-today'], ['Recipes', 'k-rest'], ['Ingredients & prices', ''], ['Invoices', ''], ['Sales', ''], ['Team & users', '']].map(([l]) => `<div class="big"><div class="lbl">${l}</div><div class="val">Demo tile</div></div>`).join('')}</div>
  <div class="list">${['dish', 'pom'].map((k) => `<button class="row" data-a="openRecipe" data-r="${k}"><span class="main"><div class="name">${esc(RECIPES[k].title)}</div><div class="meta">${RECIPES[k].fc ? 'Food cost ' + RECIPES[k].fc + '%' : 'Cost $' + RECIPES[k].cost.toFixed(2)}</div></span><span class="chev">›</span></button>`).join('')}</div>`, 'a-rest');

/* ---------- render + actions ---------- */
function render() {
  if (!S.user && S.screen !== 'login') S.screen = 'login';
  const sc = SC[S.screen] || SC.login;
  $('#app').innerHTML = sc();
}
const now = () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
const A = {
  pick(el) { S.pick = el.dataset.u; S.pin = ''; save(); render(); },
  key(el) { const k = el.dataset.k; if (k === '⌫') S.pin = S.pin.slice(0, -1); else if (S.pin.length < 4) S.pin += k;
    if (S.pin.length === 4) { const u = S.pick; Object.assign(S, { user: u, pick: null, pin: '', tabs: [], open: null }); go(USERS[u].role === 'admin' ? 'a-today' : 'k-today'); return; }
    save(); render(); },
  switch() { // switch user: the next person starts clean — no tabs, no open recipe from the previous one
    const prev = U() ? U().name : ''; Object.assign(S, { user: null, tabs: [], open: null, pick: null, pin: '', reason: null }); go('login'); if (prev) toast(`${prev} signed out · tabs closed`); },
  go(el) { go(el.dataset.s, el.dataset.id ? { open: el.dataset.id } : {}); },
  openRecipe(el) { const r = el.dataset.r; if (!S.tabs.includes(r)) S.tabs.push(r); go(isAdmin() ? 'a-recipe' : 'k-recipe', { open: r }); },
  start(el) { S.prep[el.dataset.id] = { started: true, by: U().name, at: now() }; save(); render(); toast('Started'); },
  finish(el) { const p = PREP.find((x) => x.id === el.dataset.id); S.prep[p.id] = { done: p.qty || 'counted', by: U().name, at: now() }; S.log.push({ prep: p.name, by: U().name, at: now() }); go('k-today'); toast(`Logged · ${p.name}`); },
  reason(el) { S.reason = el.dataset.r; save(); render(); },
  send() { if (!S.reason) { toast('Pick a reason'); return; } S.reports.push({ by: U().name, reason: S.reason, note: ($('#note') || {}).value || '', at: now() }); S.reason = null; go('k-today'); toast('Sent to Chef'); },
};
document.addEventListener('click', (e) => { const el = e.target.closest('[data-a]'); if (el && A[el.dataset.a]) A[el.dataset.a](el); });
$('#reset').addEventListener('click', () => { S = fresh(); save(); history.replaceState(null, '', location.pathname); render(); });
render();
})();
