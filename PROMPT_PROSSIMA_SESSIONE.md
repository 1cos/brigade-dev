# PROMPT PROSSIMA SESSIONE — Brigade

## CARICA SUBITO
1. Token GitHub da file `x_claude_GIthub.txt` nel progetto
2. Repo `1cos/back-of-house`, branch `brigade-main` SEMPRE
3. Leggi i file da GitHub LIVE, mai da memoria, mai da `/mnt/project/`
4. Supabase project: ydqmumpytgrlceuinoqt

## ⚠️ ATTENZIONE — SESSIONI PARALLELE
Max lavora in più chat contemporanee. PRIMA di bumpare sw.js:
- Leggi live `boh-v???` da sw.js
- Verifica gli ultimi commit su `brigade-main` (`/commits?sha=brigade-main`)
- Incrementa SOLO di +1 rispetto alla versione live (non da memoria)

## ⚠️ REGOLA D'ORO
- Per Max si chiamano SEMPRE "ingredienti", MAI "BOM/JSON". Max è un cuoco.
- NON chiedere mai a Max di ricreare gli ingredienti — LI HA GIÀ. Leggi il DB prima.
- MAI assumere — confermare SEMPRE prima di scrivere codice

## 🟢 APP IN PRODUZIONE
**Brigade è live. I ragazzi stanno usando l'app.** Ogni modifica al codice deve essere
chirurgica — zero rischi di rompere funzionalità esistenti. Testare prima di pushare.

---

## STATO TECNICO (aggiornato 2026-06-25)
- Frontend: **v368** (sw.js boh-v368) — repo: `1cos/brigade-dev`
- **App dev** — `https://1cos.github.io/brigade-dev/`

---

## Sessione 2026-06-25 — Prep & Closing cleanup (v366→v368)

### DB — prep_tasks
- Oven: Mozzarella→Mozzarella shredded; Scallops/Sicilian mix/Siciliana in bag→Sauté; Chicken Parmesan aggiunto
- Fresh Pasta: Maccheroni aggiunto; Grated Pecorino + Parmesan Grated aggiunti; 7 item archiviati (Focaccia dough, Gnocchi, Gnocco Dough, Ravioli Lemon, Ravioli Meat, Fettuccine, Spaghetti)
- Pasta: Clams→Rinse Clams, Mussels→Rinse Mussels, Lobster→Thaw Lobster, Shrimp→Thaw Shrimp; Rosemary Oil aggiunto; 10 item archiviati (Ragù, Arrabbiata, Cacio e pepe, Confit tomatoes, Demi, Mushrooms, Pesto, Pomodoro, Preparato Livornese, Texana)
- Sauté: Scallops/Sicilian mix/Siciliana in bag arrivati da Oven; 10 item aggiunti (Thaw Salmon, Thaw Branzino, Asparagus, Butter Spinach, Setup Sous Vide Sauces, Setup Sous Vide Meatballs, Season Focaccia, Cook Focaccia, Heating Lamp, Warmers for Plates)
- Saucier: Lobster Prepared→Soffritto Livornese; Cacio e pepe→Cacio e pepe sauce; Demi glacé→Demi; Pomodoro→Pomodoro sauce; Mash Potato + Texana Soup + Mushrooms + Preparato per Livornese aggiunti
- Plating: Check Basil Oil, Check Balsamic Glaze, Check Rosemary Oil, Check Parmesan Grated, Check Pecorino Grated, Clean Plating Station, Parsley, Organized Plates, Turn On Warm Air for Plates, Refill Nutmeg/Pepper/White Pepper, Lemon Zest, Orange supreme (da Table Side)
- Salad: Make→nomi puliti; Watermelon Cubes, Check Goat Cheese, Check Burrata, Check Croutons aggiunti
- Pastry: Caesar Dressing, Ranch, Balsamic Dressing, Citronnette aggiunti/spostati
- Manager: Basil leaves→Basil flowers; Arugola/Basil/Flowers/Rosemary/Sage/Tarragon/Thyme/Refill Capers/Confit tomatoes/Porterhouse aggiunti
- Table Side: Clean Branzino + Filet Branzino aggiunti; Orange supreme→Plating; Scallops archiviato
- Basil oil→Check Basil Oil→Plating Station

### DB — closing_checks
- Stazioni archiviate (nessun check serale): Fresh Pasta, Pastry, Saucier, Manager, Table Side, Plating
- Grill & Features creata: Ribeye, Filets, Porterhouse, Wagyu Ribeye, Tomahawk
- Sauté: Refill Capers, Arrabbiata sauce, Chicken Parmesan, Spinach, Flowers, Basil, Thyme, Sage, Tarragon, Arugola, Rosemary aggiunti
- Salad: allineata ai nomi prep tasks; Make→archiviati
- Nomi allineati tra closing e prep: Thaw Lobster, Thaw Shrimp, Arrabbiata sauce, Cacio e pepe sauce, ecc.

### DB — prep_tasks.daily_reset
- Nuova colonna `daily_reset` boolean aggiunta
- Cron `daily-reset-prep-tasks`: ogni notte 00:00 CDT resetta done=false per task daily_reset=true
- Task automatici: Rinse Clams, Rinse Mussels, Thaw Scallops (Sauté), Season Focaccia, Cook Focaccia, Tempura

### Codice (v367-v368)
- `init.js` v367: tab closing dinamiche dal DB (solo stazioni con item attivi) — Grill & Features appare automaticamente
- `closing.js` v367: allStations dinamico dal closingItems
- `souschef-core.js` v368: scScheduleAutoScan() DISABILITATA — andava in timeout ogni ora consumando token OpenRouter

### ✅ Collegamento closing_checks → prep_tasks COMPLETATO
- 83 closing checks collegate via `prep_task_id` — zero senza collegamento
- Quando la sera si segna "manca" → prep task si attiva automaticamente la mattina

### 🔴 DA FARE — souschef-scan
- `souschef-scan` Edge Function manda 400+ ingredienti a OpenRouter → timeout 500 ogni ora
- **Fix:** riscrivere con SQL diretto (GHOST e NOLINK si trovano con query SQL, AI serve solo per testo)
- Attualmente: scan automatica disabilitata in `souschef-core.js`



---

## Sessione 2026-06-25 — cosa è stato fatto

### Toggle Originale / Smart nella sheet ricetta (v351→v355)
- `recipes.js`: aggiunto toggle **Original / Smart** sopra gli ingredienti nella sheet ricetta
- In modalità **Smart**: legge `suggested_qty` dal DB (`prep_tasks.suggested_qty`), calcola fattore kg rispetto a `base_weight_g`, scala ingredienti via `scaleToKg()` — funziona anche per ricette senza `servingWeightG` (es. salse in kg)
- In modalità **Original**: ripristina `base_weight_g` originale e riscala
- Toggle visibile solo se esiste `suggested_qty` nel DB per quella ricetta
- Fix scroll iOS sheet ricetta: `overscroll-behavior:contain`, `-webkit-overflow-scrolling:touch`, `mb-6` su close button
- **BUG APERTO v355**: scroll iOS — una volta arrivati in fondo alla sheet, non si riesce a tornare in cima (non risolto definitivamente)

### Calendario eventi — nuovo modulo (v350→v355)
- DB: aggiunte colonne `service_style` (text) e `event_recipes` (jsonb []) alla tabella `events`
- `calendar.js` riscritta completa:
  - Pagina con **sticky header** `top:64px` (pattern vvdr) — titolo, ‹ back, + New Event, ↻ TripleSeat
  - Filtri Upcoming / Past / All fissi sotto l'header, lista che scrolla normalmente
  - **Editor eventi** stile recipe editor (modale rounded-3xl):
    - Campi: nome, data+ora, location (Zenos/La Scuderia/Private Home/+ Add New), ospiti, service style (Al Piatto/Buffet/Family Style/Cocktail), status, note
    - Sezione Ricette: nome (autocomplete DB) + Portions + Note per ogni ricetta
    - Food cost stimato solo per admin
    - Edit / Delete eventi manuali
    - Bottone ↻ TripleSeat pronto per quando Monica autorizza (source='manual' vs 'tripleseat')
  - Card evento: giorno + data, nome, status badge colorato, ora/ospiti/location/service style, menu ricette
- `briefing.js`: upcoming demand in home mostra ricette, cliccabile → apre calendario, "View all →"
- **BUG APERTO v355**: autocomplete ricette nell'editor usa `<datalist>` nativo ma non funziona correttamente su iOS — da rivedere nella prossima sessione

### Focus Mode — disabilitata globalmente (v350)
- `focus-mode.js`: `shouldShowFocusMode()` ritorna `false` immediatamente
- Motivo: orari 7shifts non allineati con la realtà — i ragazzi erano bloccati sulla prep list e non potevano fare la closing checklist
- Da riabilitare quando gli orari sono corretti (basta rimuovere `return false`)

### Closing checklist — voci aggiunte al DB
- **Pasta Station** (8 voci): Pomodoro sauce, Arrabbiata sauce, Preparato per Livornese, Texana soup, Pesto, Cacio e pepe sauce, Demi, Ragù
- **Salad Station** (2 voci): Shrimp for cocktail, Big bruschetta

### Vendor Documents — da modal a pagina (v351)
- Rimosso il modal `fixed inset-0 z-[65]` che copriva la topbar
- Aggiunta sezione `vvdr` nel flusso normale dell'app (topbar + bottom bar sempre visibili)
- `showVdrSection()` e `vdrBack()` in `app.js`
- `openVendorDocumentsReview()` ora chiama `showVdrSection()` invece di creare modal

### Chat — fix overlay Focus Mode (v352)
- `chat.js`: rimozione automatica `_focusChatOverlay` all'avvio e in `showChat()`
- Risolveva: "Send to team" + doppio bottone send visibili nella chat

### Chat — long press: Modifica + Reaction (v353-354)
- Long press 500ms su bubble messaggio → menu contestuale iOS-style
- Propri messaggi: ✏️ Modifica + 😊 Reaction
- Messaggi altrui: solo 😊 Reaction
- Modifica: sheet con textarea pre-popolata → UPDATE su `messages` dove `user_name = user.name`
- `user-select:none` + `webkit-touch-callout:none` sui bubble → no selettori iOS

---

## 🔴 PRIORITÀ #1 PROSSIMA SESSIONE — ai_options come azioni eseguibili in L'Ufficio

### Problema
Le ai_options nel sistema Tell Chef sono ora stringhe (es. "Aggiungi focaccia alla lista").
Quando Max le preme, chiamano `officeResolve` che archivia il messaggio ma NON esegue nulla nel DB.

### Visione
Il bot genera opzioni strutturate con azione codificata:
```json
[
  { "label": "Aggiungi focaccia alla lista Oven", "action": "add_prep_task", "params": {"name": "Focaccia", "station": "Oven Station"} },
  { "label": "Ignora", "action": "ignore", "params": {} }
]
```
Quando Max preme il bottone:
1. Frontend chiama `souschef-chat` con `confirmed_action` costruito da action+params
2. Chef AI esegue nel DB
3. Card mostra "✓ Focaccia aggiunta — Oven Station" e si chiude

### Piano
**Sessione 1 (prossima):**
- `office.js`: `officeExecuteOption(item, opt)` — se opt.action presente, chiama souschef-chat confirmed_action; altrimenti fallback officeResolve
- `bot-tell-chef-reader v6`: aggiorna prompt per generare ai_options strutturate {label, action, params}

### Azioni già eseguibili via souschef-chat (v25)
add_prep_task, remove_prep_task, update_prep_task, add_closing_check, remove_closing_check,
send_brigade_message, update_ingredient_vendor, block/unblock_*, create_office_item, resolve_warning

---

## 🔴 PRIORITÀ #2 — Autocomplete ricette nel Calendar editor (BUG APERTO v355)
- `<datalist>` nativo HTML non funziona correttamente su iOS nel modale editor eventi
- Tentativi fatti: dropdown body-attached position:fixed (coordinate sbagliate con tastiera), position:absolute (tagliato da overflow:auto), datalist nativo (non riconosce selezione)
- Prossima sessione: valutare approccio alternativo — es. sheet separato di ricerca ricette (tap su campo → apre lista ricette fullscreen, selezione → torna all'editor)
- Chat autocomplete: verificare separatamente

---

## 🔴 PRIORITÀ #3 — Cleaning Checklist (nuovo modulo)

Flusso serale: Closing Prep → Operation Note → Cleaning Checklist → Chiudi Shift → notifica Max+David
- DB: nuove tabelle `cleaning_tasks` e `cleaning_log` (non ancora create)
- ⚠️ Prima: riallineare stazioni DB con realtà cucina

---

## 🔴 PRIORITÀ #4 — Riallineamento stazioni

Stazioni attuali in DB: Fresh Pasta Station, Manager Station, Oven Station, Pasta Station,
Pastry Station, Plating Station, Salad Station, Saucier Station, Sauté Station, Table Side, Dish Crew
Da allineare con Max. Manager → Coordinator. Expo Line e Grill da valutare.

---

## 🟠 PRIORITÀ #5 — Home dedicata Dish Crew (Fase 2)

Detect: `user.default_station === 'Dish Crew'`
Nascondere: Recipes, Closing, Sales, Ingredienti, Focus Mode, Operation Notes
Bottom bar: Home / Chat / Schedule / Tell Chef

---

## TODO BACKLOG ALTO PRIORITÀ

- Fix realtime TV — loadChat() troppo pesante, aggiungere solo payload.new
- office-ai cron orario (analisi automatica ogni ora)
- Spostare L'Ufficio nella bottom bar (ora nei tre puntini)
- Focus Mode — riabilitare quando orari 7shifts allineati
- Foto in chat — bottone camera presente ma upload da verificare su iPhone
- TripleSeat — Monica deve fare Authorize
- Bot 5 versione B — food cost % quando selling_price popolato

---

## REGOLE OPERATIVE INVIOLABILI
- SHA fresco prima di ogni PUT; bump boh-vN in sw.js ad ogni push (verifica live prima)
- node --check prima di push
- Commit: "vN file — descrizione"; solo brigade-main
- Leggi SEMPRE da GitHub live, mai da memoria o /mnt/project/
- Conferma piano prima di scrivere codice; una cosa alla volta
- Financial data mai allo staff
- Kitchen Display SOLO inglese
- Domenica chiuso
- **App in produzione — modifiche chirurgiche, zero rischi**
- **MAI assumere — confermare SEMPRE con Max prima di agire**




---

## Sessione 2026-06-26 — Bot Smart preplist + BOM fixes (v375)

### ✅ FATTO — BOM cleanup Arrabbiata
- Ingrediente "Arrabbiata Sauce" eliminato dal DB (non si compra, si produce)
- 4 ricette aggiornate da ingrediente a sub-recipe ARRABBIATA: CHICKEN PIZZAIOLA, MACCHERONI ARRABBIATA, PENNE ARRABBIATA BUFFET (qty corretta 2.5g→2500g), Ciopino
- Fried Calamari: ARRABBIATA linkato come sub-recipe (50g)
- Chicken Parmesan BOM aggiornato: ora ha ARRABBIATA 75g (salsa sul pollo) + ARRABBIATA 200g (pasta side) + SPAGHETTI FRESH PASTA 0.5 each (dal nuovo menu domani CP viene SEMPRE con half spaghetti)

### ✅ FATTO — Bot preplist-builder v14 (da v5)
- **v6**: ragionamento per giorno della settimana (dow-aware) + `suggested_note` in `prep_tasks`
- **v7**: fix strutturale BOM — espande SEMPRE tutti i piatti via `subUsedBy[recipe_id]`
- **v8/v9**: report esploso in `bot_preplist_log` (nuova tabella) — un solo INSERT, veloce
- **v10**: fix `visited` set — i piatti finali (con pos_name) sempre inclusi anche da percorsi diversi (Chicken Parm: 75g salsa + 200g pasta side entrambi contati)
- **v14**: fix critico PostgREST — limite 1000 righe tagliava dati silenziosamente. Soluzione: RPC SQL aggregate (`get_sales_by_dow`, `get_modifiers_by_dow`) che ritornano medie già calcolate per dow (935 righe invece di 1713 raw)

### ✅ FATTO — DB nuove tabelle/colonne
- `prep_tasks.suggested_note` text — spiegazione ragionamento bot
- `bot_preplist_log` — log esploso giornaliero del bot (run_date, task_name, detail JSONB, etc.)
- Funzioni SQL: `get_sales_by_dow()`, `get_modifiers_by_dow()`, `get_sales_history()`, `get_modifier_history()`

### ✅ FATTO — UI recipes.js v375
- Box Smart mostra `suggested_note` sotto il numero verde

### 📊 STATO DATI POS (al 2026-06-26)
- Dati dal: martedì 9 giugno 2026
- Martedì/Mercoledì/Giovedì: **3 settimane** ✅
- Lunedì/Venerdì/Sabato: **2 settimane** (venerdì 26/6 importa stasera → domani 3 settimane)
- Il bot migliora automaticamente ogni settimana

### 🔴 NON RISOLTO — da fare prossima sessione
- **SW.js versione**: verificare versione live su `1cos/back-of-house` (memoria dice v383 ma questa sessione ha pushato su `1cos/brigade-dev` → verificare quale repo è quello attivo e allineare
- **Arrabbiata shelf_life**: attualmente 7 giorni in DB — il bot suggerisce ~25 kg per settimana. Verificare se shelf life è corretta o se va ridotta (es. 3-4 giorni = batch più frequenti ma quantità più gestibili)
- **Chicken Parmesan pasta side**: il BOM ora ha 200g arrabbiata per la pasta, ma NON include ancora il consumo di Penne Midnight Half/Kids che usano arrabbiata — già nel BOM ma verificare che il bot le conti tutte
- **Focus Mode**: disabilitata (return false) — riabilitare quando orari 7shifts allineati
- **Autocomplete ricette nel Calendar editor**: `<datalist>` non funziona su iOS — da rivedere con sheet separato
- **Cleaning Checklist**: tabelle `cleaning_tasks` e `cleaning_log` non ancora create
- **Riallineamento stazioni**: Manager → Coordinator, verificare Expo Line e Grill
- **Smart mode — unità vincolante (ingrediente acquisto)**: quando lo Smart scala la ricetta Arrabbiata a 25.87 kg, dovrebbe mostrare "X latte di pomodoro da 3 kg" invece di soli grammi. Richiede: (1) fornitore con peso latta in ingredient_vendors, (2) logica nel bot/UI per arrotondare al multiplo dell'unità di acquisto e mostrarlo tra parentesi. Da fare DOPO che Max inserisce i fornitori nel DB.
- **UI label "BOTSUGGESTION · THISWEEK" → "Chef AI · Questa settimana"**: in recipes.js la label sopra il box verde Smart mostra ancora il testo tecnico. Cambiare in testo human-readable usando tr() — IT: "Chef AI · Questa settimana", EN: "Chef AI · This week", ES: "Chef AI · Esta semana". Tutto quello che viene dai bot e che i ragazzi vedono deve chiamarsi "Chef AI", non "bot suggestion".

### REPO ATTIVO
**ATTENZIONE**: questa sessione ha lavorato su `1cos/brigade-dev` branch `brigade-main` (v375).
Le memorie dicono che il repo corretto è `1cos/back-of-house`. Verificare all'inizio della prossima sessione quale dei due è quello live su GitHub Pages e allineare tutto.

