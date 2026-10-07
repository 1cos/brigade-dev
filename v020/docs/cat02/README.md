# CAT02 — Come si collega un piatto dell'evento a una ricetta (07/10/2026)

## Brigade di oggi (brigade-main bb4ae0c)
Esiste un editor, solo admin:
**••• → Calendar → scheda evento (tocca per aprire) → ✏️ Edit → "🍽 Menu / Recipes"**.
- Ogni riga ha: nome ricetta (scrivi almeno 2 lettere, poi scegli dall'elenco: il campo diventa verde = collegata), Pax e Note.
- "Save Changes" scrive `events.event_recipes`, con questi campi per riga: recipe_id, recipe_title, portions, note, food_cost.
- È lo stesso evento che legge la V020.
- La sincronizzazione Tripleseat non tocca event_recipes: il pulsante ↻ è disattivato (410), mentre ud02 e ts06 non usano quel campo.

Limiti verificati sul codice (js/calendar.js):
- Pax si riempie da solo con il numero di ospiti. L'unica unità è "Pax": niente kg o pezzi.
- Dopo la scelta, il nome Tripleseat della riga viene sostituito dal titolo della ricetta.
- Un piatto composto diventa più righe separate, senza legame tra loro.
- "Estimated Food Cost" = food_cost_pct / 100 × pax: non è un costo in dollari.
- L'editor mostra la vecchia copia del menu, non il documento Tripleseat attuale.
- "Save Changes" riscrive anche nome, data, ospiti, stato e note dell'evento con i valori del modulo.
- Finora usato solo su 2 eventi manuali (27/06 e 03/10), mai su un evento Tripleseat.
- Non provato con un salvataggio reale: nessuna scrittura, e il login a Brigade (PIN) non spetta a me.

## V020 pubblicata (59f26dd)
- Apertura ricetta: sì.
- Selezione / collegamento: no.
- Salvataggio quantità: no.

## Laboratorio locale (non pubblicato)
- ea88d05: le candidate aprivano solo la scheda ricetta, senza collegamento.
- CAT02, questo commit: flusso minimo piatto → cerca/scegli ricetta (anche più componenti) → apri per controllare → quantità + unità → riepilogo.
- **Salvataggio SIMULATO** solo nel browser (localStorage `v020-cat02-sim`).
- Production mostra anche i collegamenti fatti con l'editor di Brigade.
- Test: `flow-test.cjs` (Playwright, localhost) → 0 richieste di scrittura verso Supabase. Senza quantità il salvataggio viene rifiutato.
- Le quantità nelle schermate sono esempi del test, non decisioni.
