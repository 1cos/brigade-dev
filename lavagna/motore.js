(function(){
// B-52 PROTOTIPO v2 — regole della lavagna. Funzione PURA: (voci, registro ufficiale, ora) → cosa mostrare.
// Nessuno stato proprio: tutto viene dal registro ufficiale simulato (official_sim.mjs).
//
// PRIORITÀ (solo da dati e regole dello Chef, mai da ipotesi):
//   URGENT   — si esaurisce (o scade) prima della fine del servizio di oggi · checklist con orario vicino · regola Chef "urgent"
//   TODAY    — non copre il minimo di N giorni di servizio (di regola 2; giornaliere 1) · giacenza SCONOSCIUTA · settimanale nel suo giorno · checklist dovuta
//   UPCOMING — da pianificare: settimanale domani · catering entro 48 h non coperto · prep lunga (≥ 3 h) che domani sarà sotto il minimo
// GIACENZA: "counted" (conteggio vero) · "estimate" (solo produzioni CONFERMATE meno consumo stimato) · "unknown". Mai inventata.
const H = 3600000, DAY = 24 * H

const DEFAULT_CTX = { serviceStart: 17, serviceEnd: 22, showMs: 45000, catering: [], closedDays: [0] }   // domenica chiusi (Chef 20/10)
// V5 (Chef 20/10): i "2 giorni" sono giorni di SERVIZIO effettivi (la domenica non conta e non consuma).
// Il minimo NON prevale mai su: durata del lotto (shelf life / sicurezza alimentare), tempi di preparazione, istruzioni dello Chef.
// Shelf life mancante: nessuna ipotesi → si copre solo il prossimo servizio e la voce segnala il dato mancante.

const at = (t, hour, addDays = 0) => { const d = new Date(t); d.setHours(hour, 0, 0, 0); return d.getTime() + addDays * DAY }
// fine del servizio "di oggi": se il servizio di stasera è già finito, quello di domani
const isOpen = (t, ctx) => !(ctx.closedDays || []).includes(new Date(t).getDay())
const serviceDayEnd = (t, ctx, plusDays = 0) => {
  let e = at(t, ctx.serviceEnd); if (t >= e) e += DAY
  while (!isOpen(e, ctx)) e += DAY
  for (let k = 0; k < plusDays; k++) { e += DAY; while (!isOpen(e, ctx)) e += DAY }
  return e
}
// giorni di servizio (aperti) il cui servizio finisce dopo t e entro "fino"
const serviceDaysBetween = (t, fino, ctx) => { let n = 0; for (let e = serviceDayEnd(t, ctx); e <= fino; e = serviceDayEnd(e + H, ctx)) n++; return n }
const startOfDay = t => at(t, 0)

// consumo stimato: dailyNeed distribuito sulle ore di servizio
function useBetween(it, a, b, ctx) {
  if (b <= a) return 0
  const perH = it.dailyNeed / (ctx.serviceEnd - ctx.serviceStart); let used = 0
  for (let d = startOfDay(a); d < b; d += DAY) {
    if (!isOpen(d, ctx)) continue                                     // giorno di chiusura: nessun consumo
    const s = Math.max(a, d + ctx.serviceStart * H), e = Math.min(b, d + ctx.serviceEnd * H)
    if (e > s) used += perH * (e - s) / H
  }
  return used
}

// simula la scorta nel tempo: lotti (FIFO) che scadono, consumo in servizio, richieste catering
function simulate(it, evs, t, ctx) {
  const counts = evs.filter(e => e.kind === 'count'), lastCount = counts.at(-1)
  const prods = evs.filter(e => e.kind === 'production' && (!lastCount || e.at > lastCount.at))
  if (!lastCount && !prods.length) return { kind: 'unknown' }
  let lots = []; const life = it.shelfLifeDays * DAY
  const startT = lastCount ? lastCount.at : prods[0].at
  if (lastCount) lots.push({ qty: lastCount.qty, exp: lastCount.at + life })
  const cat = ctx.catering.flatMap(c => c.needs.filter(n => n.itemId === it.id).map(n => ({ at: c.at, qty: n.qty, name: c.name })))
  const take = q => { for (const l of lots) { const x = Math.min(l.qty, q); l.qty -= x; q -= x; if (q <= 0) break } lots = lots.filter(l => l.qty > 1e-9); return q }
  let cur = startT - (startT % H), pi = 0, nowQty = null, coverEnd = null, expired = 0
  const horizon = t + 9 * DAY
  while (cur < horizon && coverEnd === null) {
    const next = cur + H
    while (pi < prods.length && prods[pi].at < next) { lots.push({ qty: prods[pi].qty, exp: prods[pi].at + life }); pi++ }
    if (next > t) expired += lots.filter(l => l.exp <= cur).reduce((a, l) => a + l.qty, 0)
    lots = lots.filter(l => l.exp > cur)
    let short = 0
    for (const c of cat) if (c.at >= cur && c.at < next) short += take(c.qty)
    short += take(useBetween(it, cur, next, ctx))
    if (next > t) expired += lots.filter(l => l.exp <= next).reduce((a, l) => a + l.qty, 0)
    lots = lots.filter(l => l.exp > next)
    if (next > t) {
      if (nowQty === null) nowQty = lots.reduce((s, l) => s + l.qty, 0)
      if (short > 1e-9) coverEnd = Math.max(cur, t)              // da qui la richiesta non è più coperta
    }
    cur = next
  }
  const round = x => Math.round(x * 10) / 10
  return { kind: lastCount ? 'counted' : 'estimate', qty: round(Math.max(0, nowQty ?? 0)), coverEnd: coverEnd ?? horizon, expired: Math.round(expired * 10) / 10,
    count: lastCount ? { qty: lastCount.qty, at: lastCount.at, by: lastCount.by } : null }
}

const hhmm = t => new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
const dayName = t => new Date(t).toLocaleDateString('en-US', { weekday: 'short' })
const rel = (x, t) => { const d = Math.round((startOfDay(x) - startOfDay(t)) / DAY); return d === 0 ? 'today' : d === 1 ? 'tomorrow' : dayName(x) }

function itemState(it, evs, t, ctx = DEFAULT_CTX) {
  const last = evs.filter(e => e.kind === it.type || (it.type === 'production' && e.kind === 'count')).at(-1)
  const made = evs.filter(e => e.kind === 'production').at(-1)
  const base = { id: it.id, name: it.name, station: it.station, type: it.type, unit: it.unit, chefNote: it.chef?.note || null }
  if (it.type === 'check') {
    const lastCheck = evs.filter(e => e.kind === 'check').at(-1)
    const due = !lastCheck || t >= lastCheck.at + it.everyHours * H
    if (!due) return { ...base, show: false, nextAt: lastCheck.at + it.everyHours * H }
    const dueAt = it.dueHour != null ? at(t, it.dueHour) : null
    const urgent = !!it.chef?.urgent || (dueAt && t >= dueAt - H)
    const why = urgent ? (it.chef?.urgent ? 'chef' : 'due_time') : null
    return { ...base, show: true, tier: urgent ? 'URGENT' : 'TODAY', urgentWhy: why, reason: dueAt ? `Due by ${hhmm(dueAt)}` : 'Check due', sortAt: dueAt ?? t }
  }
  // finestra da coprire: N giorni di SERVIZIO (Chef può cambiarla) · settimanali: fino al prossimo giorno fisso di produzione
  const cover = it.chef?.coverDays ?? it.coverDays ?? 2
  let winEnd
  if (it.rule === 'weekly') {
    let k = 1; while (new Date(t + k * DAY).getDay() !== it.weekday) k++
    winEnd = at(t + k * DAY, ctx.serviceStart)                           // il prossimo lotto si fa quel giorno, prima del servizio
  } else winEnd = serviceDayEnd(t, ctx, cover - 1)
  // la durata del lotto prevale: un lotto fatto adesso non può coprire oltre la sua scadenza (mai assumere 7 giorni)
  const dataMissing = []
  let capped = null
  if (it.shelfLifeDays == null) { dataMissing.push('shelf_life'); const e1 = serviceDayEnd(t, ctx); if (e1 < winEnd) { winEnd = e1; capped = 'shelf_life_missing' } }
  else { const lifeEnd = t + it.shelfLifeDays * DAY; if (lifeEnd < winEnd) { let e = serviceDayEnd(t, ctx), last = null; while (e <= lifeEnd) { last = e; e = serviceDayEnd(e + H, ctx) } winEnd = last ?? t; capped = 'shelf_life' } }
  const days = serviceDaysBetween(t, winEnd, ctx)
  const cat = ctx.catering.flatMap(c => c.needs.filter(n => n.itemId === it.id).map(n => ({ ...n, at: c.at, name: c.name })))
  const catIn = cat.filter(c => c.at > t && c.at <= winEnd).reduce((s, c) => s + c.qty, 0)
  const min = Math.round((it.dailyNeed * days + catIn + (it.chef?.extra || 0)) * 10) / 10   // SUGGESTED MINIMUM = target, non giacenza
  const sim = simulate(it, evs, t, ctx)
  const stock = sim.kind === 'unknown' ? { kind: 'unknown' } : sim.kind === 'counted' ? { kind: 'counted', qty: sim.qty, at: sim.count.at, by: sim.count.by } : { kind: 'estimate', qty: sim.qty }
  const out = { ...base, min, coverServiceDays: days, capped, dataMissing, made: made ? { qty: made.qty, by: made.by, at: made.at } : null, stock }
  const todayEnd = serviceDayEnd(t, ctx)
  const prep = (it.prepMinutes || 30) * 60000
  let tier = null, reason = '', sortAt = Infinity, urgentWhy = null
  if (it.rule === 'weekly') {
    // fatta "per questa settimana" = registrata dal giorno prima (anticipo) in poi
    const isDay = new Date(t).getDay() === it.weekday, tomorrow = new Date(t + DAY).getDay() === it.weekday
    const doneForDay = made && made.at >= startOfDay(t) - (isDay ? DAY : 0)
    if (isDay && !doneForDay) { tier = 'TODAY'; reason = 'Weekly prep — today'; sortAt = todayEnd }
    else if (tomorrow && !doneForDay) { tier = 'UPCOMING'; reason = `Weekly prep — tomorrow (${dayName(t + DAY)})`; sortAt = todayEnd + DAY }
  }
  if (sim.kind === 'unknown') {
    if (!tier || tier === 'UPCOMING') { tier = it.rule === 'weekly' ? tier : 'TODAY'; reason = tier ? (it.rule === 'weekly' ? reason : 'Stock unknown — no production logged') : reason; sortAt = todayEnd }
  } else {
    const ce = sim.coverEnd
    if (ce < todayEnd) { tier = 'URGENT'; sortAt = ce
      // motivo concreto: scadenza (lotti che scadono prima di stasera) · tempi di preparazione (start by già passato) · fabbisogno (non basta per il servizio)
      urgentWhy = sim.expired > 0 ? 'expiry' : ce - prep - H <= t ? 'prep_time' : 'need'
      reason = ce <= t ? 'Out (estimate) — needed for tonight' : `Runs out ~${hhmm(ce)} (estimate)` + (ce - prep - H <= t ? ' — START NOW' : ` — start by ${hhmm(ce - prep - H)}`) }
    else if (ce < winEnd && !(it.rule === 'weekly' && tier)) { tier = 'TODAY'; sortAt = ce
      reason = it.rule === 'weekly' ? `Weekly prep — stock lasts to ${rel(ce, t)} ${hhmm(ce)}, before next weekly batch` : `Below ${days}-service-day minimum — lasts to ${rel(ce, t)} ${hhmm(ce)}` }
    else if (!tier) {
      const nextCat = cat.find(c => c.at > t && c.at - t <= 2 * DAY && ce < c.at + H)
      if (nextCat) { tier = 'UPCOMING'; sortAt = nextCat.at; reason = `${nextCat.name} ${dayName(nextCat.at)} needs +${nextCat.qty} ${it.unit}` }
      else if ((it.prepMinutes || 0) >= 180 && ce < serviceDayEnd(t, ctx, cover) && it.rule !== 'weekly') { tier = 'UPCOMING'; sortAt = ce; reason = `Long prep (${Math.round(it.prepMinutes / 60)} h) — plan for tomorrow` }
    }
  }
  const soonCat = cat.find(c => c.at > t && c.at - t <= 2 * DAY)
  if (soonCat && tier && !reason.includes(soonCat.name)) reason += ` · ${soonCat.name} ${rel(soonCat.at, t)} +${soonCat.qty} ${it.unit}`
  if (tier && capped === 'shelf_life') reason += ` · shelf life ${it.shelfLifeDays}d: covers ${days} service day${days === 1 ? '' : 's'}`
  if (tier && capped === 'shelf_life_missing') reason += ' · shelf life MISSING: next service only, ask Chef'
  if (!tier) return { ...out, show: false }
  if (it.chef?.urgent && tier === 'TODAY') { tier = 'URGENT'; urgentWhy = 'chef'; reason = 'Chef: priority — ' + reason }
  return { ...out, show: true, tier, reason, sortAt, urgentWhy }
}

const TIER_ORDER = { URGENT: 0, TODAY: 1, UPCOMING: 2 }
function boardView(items, log, t, ctx = DEFAULT_CTX) {
  const valid = log.valid(), byItem = new Map()
  for (const e of valid) (byItem.get(e.itemId) || byItem.set(e.itemId, []).get(e.itemId)).push(e)
  const stations = {}, counts = { URGENT: 0, TODAY: 0, UPCOMING: 0, DONE: 0 }
  for (const it of items) {
    const evs = byItem.get(it.id) || []
    const s = itemState(it, evs, t, ctx)
    const recent = evs.filter(e => (e.kind === 'check' || e.kind === 'production') && t - e.at >= 0 && t - e.at < ctx.showMs).at(-1)
    if (!s.show && !recent) continue
    const card = recent ? { ...s, tier: 'DONE', completed: { by: recent.by, kind: recent.kind, qty: recent.qty, eventId: recent.id } } : s
    counts[card.tier]++
    ;(stations[it.station] ||= []).push(card)
  }
  for (const k of Object.keys(stations)) stations[k].sort((a, b) =>
    (a.tier === 'DONE' ? -1 : TIER_ORDER[a.tier]) - (b.tier === 'DONE' ? -1 : TIER_ORDER[b.tier]) || (a.sortAt ?? 0) - (b.sortAt ?? 0) || a.name.localeCompare(b.name))
  return { at: t, stations, counts }
}

// B-52 PROTOTIPO v2 — SIMULAZIONE del registro UFFICIALE (B-49 produzioni / B-51 checklist).
// La lavagna NON ha un registro suo: legge solo questo. In Brigade vero questo ruolo è di
// prep_log + record-prep-production-v2 (produzioni) e station_check / record-prep-checklist (checklist).
// Dati SINTETICI, nessun collegamento alla produzione.
function createOfficialLog() {
  const events = [], seen = new Map()
  let rev = 1
  // tipi: check · production (qty, lotto, scadenza) · count (giacenza CONTATA) · undo (correzione, of=id)
  function append(ev, clientKey) {
    if (clientKey && seen.has(clientKey)) return { ok: true, duplicate: true, event: seen.get(clientKey) }
    const e = { ...ev, id: events.length + 1 }
    events.push(e); if (clientKey) seen.set(clientKey, e); rev++
    return { ok: true, event: e }
  }
  const undone = id => events.some(e => e.kind === 'undo' && e.of === id)
  return {
    append, undone,
    events: () => events,
    valid: () => events.filter(e => e.kind !== 'undo' && !undone(e.id)),   // eventi non annullati
    rev: () => rev,
  }
}

// B-52 PROTOTIPO v2 — dati SINTETICI di prova. Nomi di esempio; nessun dato reale di vendite, giacenze o ricette.
// Stazioni = quelle della lista prep reale (audit B-52, sezione A). Manager Station esclusa: decisione dello Chef ancora aperta.
// I numeri (fabbisogno, durata, tempi) sono INVENTATI per la prova, non vengono da Brigade.

// V4: 4 colonne × 2 stazioni (ordine per colonna, come la bozza dello Chef). Plating non è sulla lavagna in questa prova.
const STATIONS = ['Oven', 'Pasta', 'Fresh Pasta', 'Sauté', 'Saucier', 'Salad', 'Table Side', 'Pastry']

const P = (station, id, name, unit, dailyNeed, shelfLifeDays, prepMinutes, extra = {}) => ({ id, station, name, type: 'production', unit, dailyNeed, shelfLifeDays, prepMinutes, coverDays: 2, rule: 'cover', ...extra })
const C = (station, id, name, everyHours, extra = {}) => ({ id, station, name, type: 'check', everyHours, ...extra })

function demoItems(t0) {
  const wd = new Date(t0).getDay()
  return [
    P('Oven', 'focaccia', 'Focaccia dough', 'kg', 4, 1, 90, { coverDays: 1, rule: 'daily' }),
    P('Oven', 'roastveg', 'Roasted vegetables', 'kg', 2, 3, 60),
    C('Oven', 'ovenclean', 'Oven temp check', 24, { dueHour: 16 }),
    P('Pasta', 'carbonara', 'Carbonara base', 'kg', 1.2, 3, 40),
    P('Pasta', 'pastawater', 'Salted pasta water stock', 'L', 10, 1, 20, { coverDays: 1, rule: 'daily' }),
    P('Fresh Pasta', 'gnocchi', 'Gnocchi', 'kg', 1.5, 3, 120, { chef: { extra: 2, note: 'Chef: +2 kg for the weekend' } }),
    P('Fresh Pasta', 'tagliatelle', 'Tagliatelle', 'kg', 2, 2, 90),
    P('Fresh Pasta', 'ravioli', 'Ricotta ravioli', 'pcs', 80, 2, 150),
    P('Fresh Pasta', 'pici', 'Pici', 'kg', 1.5, 2, 60),
    P('Fresh Pasta', 'sheets', 'Lasagna sheets', 'kg', 1, 2, 45),
    P('Sauté', 'calamari', 'Calamari (cleaned)', 'kg', 3, 2, 45, { coverDays: 1, rule: 'daily' }),
    C('Sauté', 'lobster', 'Lobster tails (thaw)', 24, { dueHour: 15, chef: { urgent: true } }),
    P('Sauté', 'garlicoil', 'Garlic confit', 'kg', 0.5, 7, 60),
    P('Saucier', 'pomodoro', 'Pomodoro sauce', 'kg', 2.5, 5, 120),
    P('Saucier', 'demi', 'Demi-glace', 'L', 0.8, 10, 480, { rule: 'weekly', weekday: (wd + 1) % 7 }),
    P('Saucier', 'beurre', 'Beurre blanc base', 'L', 0.6, 2, 30),
    P('Salad', 'vinaigrette', 'House vinaigrette', 'L', 0.6, 7, 20, { rule: 'weekly', weekday: wd }),
    C('Salad', 'greens', 'Greens quality check', 12),
    ...['Parmesan grated', 'Herb oil', 'Croutons', 'Pickled onions', 'Candied walnuts', 'Lemon zest', 'Shaved fennel', 'Caesar dressing', 'Roasted beets', 'Burrata portions', 'Grated pecorino']
      .map((n, i) => P('Salad', 'salad' + i, n, n === 'Burrata portions' ? 'pcs' : 'kg', n === 'Burrata portions' ? 24 : 0.4, [4, 7, 3, 10, 14, 1, 1, 4, 4, 2, 5][i], [15, 30, 40, 30, 45, 10, 15, 20, 60, 10, 15][i])),
    C('Table Side', 'caesar', 'Caesar cart setup', 24, { dueHour: 16 }),
    P('Table Side', 'flambe', 'Flambé mise en place', 'sets', 6, 1, 20, { coverDays: 1, rule: 'daily' }),
    P('Pastry', 'tiramisu', 'Tiramisù', 'ptn', 18, 3, 90),
    P('Pastry', 'pannacotta', 'Panna cotta', 'ptn', 14, 3, 45),
    P('Pastry', 'cannoli', 'Cannoli shells', 'pcs', 30, 7, 120),
    P('Pastry', 'cremino', 'Cremino', 'ptn', 12, 3, 60),
    P('Pastry', 'meringue', 'Meringues', 'pcs', 40, 5, 90),
    P('Pastry', 'anglaise', 'Crème anglaise', 'L', 1, 2, 30),
    C('Pastry', 'pastryfridge', 'Pastry fridge check', 24),
    P('Plating', 'microgreens', 'Microgreens portioned', 'trays', 2, 2, 15),
    C('Plating', 'plates', 'Plate warmers check', 24, { dueHour: 16 }),
  ]
}

// produzioni e conteggi SINTETICI già "registrati" prima dell'inizio della prova (t0 = mattina del giorno di prova)
function demoSeed(t0) {
  const ev = (itemId, kind, by, hoursAgo, qty) => ({ itemId, kind, by, at: t0 - hoursAgo * H, ...(qty != null ? { qty } : {}) })
  return [
    ev('pomodoro', 'production', 'Bea', 40, 5),        // fatta 2 giorni fa: oggi sotto il minimo di 2 giorni
    ev('carbonara', 'production', 'Alex', 20, 2.4),    // copre oggi, non domani
    ev('calamari', 'production', 'Carlos', 30, 2),     // giornaliera: scarsa per stasera
    ev('garlicoil', 'production', 'Bea', 60, 3),       // coperta a lungo
    ev('tagliatelle', 'production', 'Alex', 14, 4),    // scade domani
    ev('ravioli', 'production', 'Alex', 12, 200),
    ev('beurre', 'production', 'Carlos', 10, 1.2),
    ev('roastveg', 'production', 'Bea', 16, 4),
    ev('tiramisu', 'production', 'Dana', 22, 36),
    ev('pannacotta', 'production', 'Dana', 30, 20),
    ev('cannoli', 'production', 'Dana', 50, 200),
    ev('microgreens', 'production', 'Carlos', 15, 4),
    ev('greens', 'check', 'Bea', 13),
    ...[0, 1, 2, 3, 4, 7, 8].map((i, k) => ev('salad' + i, 'production', ['Bea', 'Alex', 'Carlos'][k % 3], 10 + k * 6, [1.6, 1, 0.5, 1.2, 1.5, 0.8, 0.6][k])),
    ev('salad3', 'count', 'Chef', 6, 0.9),             // UNICO conteggio vero (sintetico): mostra la differenza tra contato e stimato
    ev('salad9', 'production', 'Bea', 8, 30),
  ]
}

function demoCatering(t0) {
  const d = new Date(t0 + 2 * DAY); d.setHours(12, 0, 0, 0)
  return [{ name: 'Catering', guests: 120, at: d.getTime(), needs: [{ itemId: 'focaccia', qty: 6 }, { itemId: 'tiramisu', qty: 120 }, { itemId: 'salad8', qty: 3 }] }]
}

function demoAnnouncements(t0, catering) {
  const c = catering[0], day = new Date(c.at).toLocaleDateString('en-US', { weekday: 'long' })
  return [
    { kind: 'CATERING', text: `${day} · Catering · ${c.guests} guests` },
    { kind: 'SPECIAL', text: 'Saturday · Special Menu' },
    { kind: 'CHEF', text: 'Chef · Extra Gnocchi' },
  ]
}


// ---- il "server" della prova, dentro il browser (stesse regole di server.mjs, stato solo in questa pagina) ----
const PARAMS = new URLSearchParams(location.search);
let offset, t0, items, log, ctx, ann, layout = PARAMS.get('layout') === 'B' ? 'B' : 'A', sim = null;
const now = () => Date.now() + offset;
function reset() {
  const d = new Date(); d.setHours(9, 30, 0, 0); t0 = d.getTime(); offset = t0 - Date.now();
  items = demoItems(t0); log = createOfficialLog(); for (const e of demoSeed(t0)) log.append(e);
  const catering = demoCatering(t0); ctx = { ...DEFAULT_CTX, showMs: 60000, catering }; ann = demoAnnouncements(t0, catering);
}
reset();
const byId = id => items.find(i => i.id === id);
const evsOf = id => log.valid().filter(e => e.itemId === id);
const clients = new Set(); let viewVersion = 1, lastShown = '';
const refresh = force => { const s = JSON.stringify(boardView(items, log, now(), ctx).stations); if (force || s !== lastShown) { lastShown = s; viewVersion++; for (const c of clients) c._emit('version', { version: viewVersion }); } };
setInterval(() => refresh(false), 2000);
function check(id, by, key) {
  const it = byId(id); if (!it || it.type !== 'check') return { ok: false, error: 'not_a_check' };
  if (key && log.events().some(e => e.key === key)) return { ok: true, duplicate: true };
  const s = itemState(it, evsOf(id), now(), ctx);
  if (!s.show) return { ok: false, error: 'already_done' };
  return log.append({ itemId: id, kind: 'check', by, at: now(), key }, key);
}
function produce(id, by, qty, key) {
  const it = byId(id); if (!it || it.type !== 'production') return { ok: false, error: 'not_a_production' };
  if (!(qty > 0)) return { ok: false, error: 'qty_required' };
  return log.append({ itemId: id, kind: 'production', by, qty, at: now(), key }, key);
}
const COOKS = ['Alex', 'Bea', 'Carlos'];
function startSim(minutes = 3) {
  stopSim(); const until = Date.now() + minutes * 60000; let n = 0;
  const tick = () => {
    if (Date.now() > until) return stopSim();
    const open = Object.values(boardView(items, log, now(), ctx).stations).flat().filter(c => c.tier !== 'DONE');
    if (open.length) {
      const c = open[Math.floor(Math.random() * open.length)], cook = COOKS[n++ % 3];
      if (c.type === 'check') check(c.id, cook, 'sim' + n);
      else { const have = c.stock?.qty ?? 0, q = Math.max(c.min - have, c.min * 0.5); produce(c.id, cook, Math.ceil(q * 2) / 2, 'sim' + n); }
      refresh(true);
    }
    sim = setTimeout(tick, 2000 + Math.random() * 3000);
  };
  sim = setTimeout(tick, 500);
}
function stopSim() { if (sim) clearTimeout(sim); sim = null; }
function api(path, b) {
  if (path === 'board') { const t = now(), v = boardView(items, log, t, ctx);
    const recent = log.valid().filter(e => e.kind === 'check' || e.kind === 'production').sort((a, b) => b.at - a.at).slice(0, 5).map(e => ({ name: byId(e.itemId)?.name, by: e.by, kind: e.kind, qty: e.qty, unit: byId(e.itemId)?.unit, at: e.at }));
    return { ...v, version: viewVersion, stationOrder: STATIONS, announcements: ann, clock: t, layout, recent, sim: !!sim }; }
  if (path === 'version') return { version: viewVersion, layout };
  if (path === 'clock') { offset += (+b.hours || 0) * H + (+b.days || 0) * DAY; refresh(true); return { ok: true }; }
  if (path === 'reset') { stopSim(); reset(); refresh(true); return { ok: true }; }
  if (path === 'sim') { b.on ? startSim(+b.minutes || 3) : stopSim(); refresh(true); return { ok: true, sim: !!sim }; }
  return {};
}
const realFetch = window.fetch.bind(window);
window.fetch = (url, opt) => {
  const m = String(url).match(/\/api\/([a-z]+)$/);
  if (!m) return realFetch(url, opt);
  const b = opt && opt.body ? JSON.parse(opt.body) : {};
  return Promise.resolve(new Response(JSON.stringify(api(m[1], b)), { status: 200, headers: { 'Content-Type': 'application/json' } }));
};
window.EventSource = class { constructor() { this._l = {}; clients.add(this); setTimeout(() => { this._emit('version', { version: viewVersion }); }, 0); }
  addEventListener(n, f) { (this._l[n] = this._l[n] || []).push(f); } _emit(n, d) { (this._l[n] || []).forEach(f => f({ data: JSON.stringify(d) })); } close() { clients.delete(this); } };
if (PARAMS.get('sim') === '1') startSim(+PARAMS.get('min') || 30);

})();
