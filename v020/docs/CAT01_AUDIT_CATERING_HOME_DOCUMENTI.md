# CAT01 — Audit Catering → Production → Shopping → Cost (+ Home, Restaurant, Documenti)

Data: 07/10/2026, sessione shelllab-v020.

Modalità di lavoro:
- sola lettura di Brigade: SELECT e chiamate di funzioni STABLE, chiave pubblica per la V020;
- nessuna scrittura su dati reali, Tripleseat, ricette, distinte o stock;
- correzione **solo nel laboratorio**, non pubblicata.

## 1. Perché Production è vuota (Mason Rehearsal)

**Evento in Brigade**
- `events` 7c4b3029-f4c9-4a64-a17d-c2844e54bf06, Tripleseat #60062987.
- Venerdì 09/10 alle 17:00, 45 ospiti, stato *definite*.

**Menu attuale (Tripleseat)**
- `event_document_versions`, documento 39081121, versione 1, ricevuto il 06/10 alle 20:46 UTC. 16 righe.
- 8 righe sono bevande.
- 1 riga pacchetto: "menu for Rehearsal dinner" ×45.
- **7 piatti**: Tuscan Board with Bruschetta, caprese and cantalupe/Parma · Penne cacio e pepe with chicken · Penne Marinara · Beef Lasagna · Chicken parmigiana · House salad · Mini Tiramisu.

**Lasagna, parmigiana, tiramisù sono davvero di Mason**: sono righe dello stesso documento Tripleseat di Mason. Nelle schermate di Plan erano sotto lo scorrimento.

Gli stessi piatti compaiono anche in altri eventi (verificato sui documenti Tripleseat):
- Beef Lasagna: Wedding Ashley 23/10, wedding 24/10, meeting dinner 05/11, Birthdays 14/11, Sidney 21/11, Sophia Montez 02/12, Leanne 10/12, Comfort master 19/12;
- Chicken Parmigiana: meeting dinner 05/11;
- Mini Tiramisu: Celcuity 13/10, wedding 24/10, Abb Vie 28/10, meeting dinner 05/11 e altri.

**Dove si interrompe il percorso: il primo anello, cioè menu Tripleseat → ricetta Brigade.**

1. **Lettura errata della V020.** Plan legge il menu Tripleseat (rpc `ts_event_menus_kitchen`), mentre Production, Shopping e Cost leggono `events.event_recipes`. Quel campo è la vecchia copia, mai aggiornata.
   - Per Mason contiene 7 voci con **solo il nome e nessun `recipe_id`**.
   - Il codice (`app.js`, ramo `seg === 'production'`) filtra `dishes.filter(r => r.recipe_id)`, quindi non resta niente: "No linked dishes".
   - Shopping fa lo stesso. Cost legge `food_cost` sulla vecchia copia, che è assente.
2. **Collegamento assente nel modello dati.** In Brigade non c'è alcuna tabella che colleghi una riga del menu Tripleseat a una ricetta.
   - `food_cost.event_cost_sheets` / `event_cost_lines` (recipe_id, portions, qty_g per evento) esistono ma sono **vuote (0 righe)**.
   - Nessun evento ha mai ricevuto ricette collegate dal menu Tripleseat.
3. **Quantità assenti.** Il documento Tripleseat ha una quantità solo sulla riga pacchetto (×45). I piatti non hanno quantità. 45 ospiti non sono 45 porzioni di ogni piatto, quindi nessuna quantità è dimostrabile.

## 2. Tabella per piatto (Mason)

Legenda:
- "Candidata" = ricetta trovata **solo dal nome**, da confermare: **non è un collegamento**.
- Costo = motore FC05 (`food_cost.recipe_breakdown`), letto senza foglio evento.

| voce Tripleseat | ricetta collegata / candidata | quantità e fonte | preparazioni attese (dalle candidate) | oggi in Production / Shopping / Cost | blocco concreto |
|---|---|---|---|---|---|
| Tuscan Board with Bruschetta, caprese and cantalupe/Parma | nessuna ricetta "board". Componenti candidati: TOMATO X BRUSCHETTA, Caprese / CAPRESE SHOT, PROSCIUTTO E MELONE | nessuna (solo pacchetto ×45) | prep "Bruschetta" (TOMATO X BRUSCHETTA, GIALLO) | vuoto / vuoto / nessun costo | piatto composto: Chef deve dire quali ricette e quanto per ospite |
| Penne cacio e pepe with chicken | PENNE CACIO E PEPE Catering (100 porz.), Cacio e Pepe, CACIO E PEPE SAUCE; per il pollo Grilled Chicken / Diced Grilled Chicken | nessuna | prep "Cacio e pepe sauce" | vuoto / vuoto / nessun costo | catering ROSSO: la sotto-ricetta Cacio e Pepe (5 kg) non dichiara la resa. Pollo: ricetta e grammi da scegliere |
| Penne Marinara | **nessuna ricetta Brigade** con "marinara". Vicine ma diverse: POMODORO SAUCE, PENNE ARRABBIATA BUFFET | nessuna | — | vuoto / vuoto / nessun costo | ricetta da creare o da collegare a mano (marinara ≠ pomodoro senza conferma) |
| Beef Lasagna | Lasagna (6 porz.), Lasagna Pan (Catering) | nessuna | nessuna prep | vuoto / vuoto / nessun costo | Lasagna ROSSO: BESCIAMELLA ha distinta vuota. Lasagna Pan: le componenti sono "each" mentre la sotto-ricetta è in porzioni, e contiene House Salad |
| Chicken parmigiana | Chicken Parmesan (240 g a porzione) | nessuna | prep "Chicken Parmesan" (pezzi) | vuoto / vuoto / nessun costo | Chicken Parmesan ROSSO: troppa parte stimata |
| House salad | House Salad | nessuna | prep "Spring mix" | vuoto / vuoto / nessun costo | ROSSO: "Shredded Carrots" in ciclo |
| Mini Tiramisu | Tiramisu (10 porz.), TIRAMISU NEL SIFONE (12 × 75 g) | nessuna | prep "Tiramisu" (pezzi) | vuoto / vuoto / nessun costo | quanti mini per porzione standard (regola: arrotondare per eccesso). Tiramisu ROSSO: troppa parte stimata |

Solo Cacio e Pepe (ristorante) e CACIO E PEPE SAUCE sono VERDI.

Le prep collegate alle candidate risultano tutte `done=true`, con stock 0 o non affidabile: DATA QUALITY UNKNOWN.

## 3. Correzione nel laboratorio (fatta, non pubblicata)

`brigade-dev-lab/v020`, commit locale, nessun push:

- `catering-link.js` (nuovo, funzioni pure):
  - separa i piatti dalle bevande, dalla riga pacchetto e dalle intestazioni ("Pick 2", "Regular");
  - propone fino a 3 ricette candidate **solo dal nome**, con regole prudenti: una proteina, una forma di pasta o un ingrediente singolo non bastano.
- `app.js`:
  - per gli eventi Tripleseat, Production, Shopping e Cost partono dal menu Tripleseat e mostrano per ogni piatto: "Recipe to link · quantity to confirm", le candidate (cliccabili verso la ricetta) e le decisioni di Chef;
  - Shopping dice che la lista non è calcolabile e cosa manca;
  - Cost mostra "Not calculable", mai $0, con la riga imprevisti 10% separata;
  - la scheda Catering conta i piatti "to link".
- Home e Prep: la frase "The prep bot has not run today" era falsa. Ora si dice **quando è stato fatto il piano**, leggendo `generated_at`.
- Test: `v020/tests/catering-link.test.js`, 4 test su 4 OK, con il menu reale di Mason e i titoli reali delle ricette.
- Anteprima locale: http://127.0.0.1:8765/v020/index.html#ev=7c4b3029-f4c9-4a64-a17d-c2844e54bf06&seg=production (schermate in scratchpad `cat01/`).

Cosa la V020 **non può** fare da sola: collegare piatti e ricette e fissare le quantità. Serve un posto dove salvarli; il candidato naturale è `food_cost.event_cost_sheets/lines`, oggi vuoto. È una scrittura su DB, quindi solo con un GO.

## 4. Shopping e Cost: come devono funzionare quando i piatti saranno collegati

- **Shopping**: ingredienti della distinta × quantità confermata, divisi in tre gruppi:
  1. quantità calcolata;
  2. quantità non calcolabile (ricetta incompleta, resa assente, ciclo);
  3. disponibilità solo dove Brigade la conosce davvero.

  Oggi stock e prep sono DATA QUALITY UNKNOWN: non vanno sottratti alla lista senza conferma.
- **Cost**:
  - prezzi noti (classe A da fattura) e costi incompleti (B/C, non stimabili) separati;
  - un ingrediente senza prezzo non vale mai $0;
  - imprevisti 10% su riga propria, una sola volta, sul subtotale ingredienti.

## 5. Audit generale (solo diagnosi)

### Home del 07/10: "Live 09:56" ma piano del 6 ottobre

- "Live 09:56" è l'ora dell'ultimo aggiornamento dei dati nella V020, non l'ora del piano.
- **Il bot gira tutte le notti**. `bot_runs`, bot-prep-suggester v18:
  - 07/10 alle 02:06 CT: success, 95 righe;
  - 06/10 alle 02:05: success;
  - 04/10, 03/10 e 02/10: success.
- Chi lo chiama passa `suggestion_date` = giornata di servizio appena chiusa (06/10), con storico POS fino al 05/10. Non è un cron Supabase: il chiamante è esterno e non l'ho identificato.
- La V020 mostrava quella data come "piano del 6" e diceva "il bot non ha girato oggi". **Lettura errata, corretta nel lab.**
- Fuso orario: la V020 usa America/Chicago per "oggi". Corretto.

### Prep barrate

- Sono le prep con `prep_tasks.done = true`.
  - Nel piano del 07/10: 9 su 10 "Do first", 46 su 47 "Prep today", 16 su 16 "Looks OK".
  - **Nessuna** ha `daily_reset = true`, quindi il reset delle 00:00 CT non le azzera.
  - **Nessuna** ha produzione registrata oggi in `prep_log`.
  - `prep_tasks` non ha una data di "done": non si può sapere quando è stato messo.
- Conclusione: "barrato" oggi **non significa fatto oggi**. È un flag vecchio. DATA QUALITY UNKNOWN: non si corregge senza Chef.
- Proposta Home compatta, da fare dopo il catering:
  1. in alto "Conta prima di produrre" (count_first);
  2. massimo 5 priorità vere;
  3. "Vedi tutte (N)";
  4. le fatte **oggi** (da `prep_log`) raccolte in fondo;
  5. motivi lunghi solo nella scheda prep;
  6. il flag `done` non va mostrato come "fatto oggi".

### Restaurant: avvisi storici

- Avvisi su articoli mancanti e sostituzioni: proposta di toglierli dalla vista principale e spostarli in "Storico avvisi" consultabile.
- In vista principale resta solo ciò che blocca oggi.

### Documenti: Hardie's 07155718 e 07148732, "imported" e "ignored"

**Hardie's: non sono doppioni.** Per ogni numero ci sono due documenti diversi:
- la **conferma d'ordine** ("CONFIRMATION OF SALE", `order_confirmation`) → `ignored`, per regola: non è un costo;
- la **fattura** ("INVOICE", `invoice`) → `imported`.

Su 30 giorni: 13 conferme Hardie's ignorate, tutte con la fattura importata.

**BEK (Ben E. Keith)**: 45 giorni, nessuna fattura, solo conferme d'ordine.
- 16 ignorate: `BEK_BUYER_EXCLUDED`, ordini di **sala**, non di cucina. Corretto.
- 5 ignorate di cucina di classe "acknowledgement" (ricevuta d'ordine senza quantità confermate). Nessuna conferma operativa le segue: **$2.328,53 di ordini cucina senza costo in Brigade** (24/08, 31/08, 07/09, 14/09, 05/10 per $528,87). Da verificare con la fonte contabile BEK (Entrée).
- 6 importate (conferme operative di cucina).

**Proposta di stati comprensibili** (verificati con il collegamento per numero e tipo):
- "Conferma d'ordine · fatturata il …" (con link alla fattura);
- "Conferma d'ordine · in attesa di fattura";
- "Ordine di sala (non cucina)";
- "Ricevuta d'ordine senza quantità · in attesa di conferma";
- "Revisione sostituita";
- "Fattura importata".

Nota: la fattura importata **non prova la consegna fisica**. Serve un "ricevuto" separato.

## 6. Ordine dei prossimi interventi (proposta)

1. **Decisione di Chef su Mason, entro venerdì 09/10**: ricetta per ogni piatto (la tabella sopra), più porzioni o kg per piatto. Marinara: creare la ricetta o indicarne una.
2. **GO per salvare i collegamenti**: piatto Tripleseat → ricetta + quantità, per evento, in `event_cost_sheets/lines`. Con quello, Production, Shopping e Cost si calcolano.
3. Correggere le ricette candidate rosse (Lasagna/BESCIAMELLA, House Salad in ciclo, resa di Cacio e Pepe) con GO, una per volta.
4. Home compatta e significato di `done` (con Chef).
5. Stati documenti comprensibili; storico avvisi in Restaurant.
