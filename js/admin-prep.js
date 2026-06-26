// ── ADMIN PREP TASKS ──
// Gestione prep tasks: aggiungi, modifica, archivia, ripristina.

async function adminAdd(){ openPrepEditor(null); }
async function adminRename(id){ openPrepEditor(tasks[id]); }
async function adminDel(id){
  const choice = confirm('Archivia questa prep? (OK=Archivia, Annulla=Elimina definitivamente)');
  if(choice===null) return;
  if(choice){
    await supa.from('prep_tasks').update({archived:true,need_tomorrow:false}).eq('id',id);
    // Archivia anche le closing_checks collegate
    await supa.from('closing_checks').update({archived:true}).eq('prep_task_id',id);
  } else {
    if(!confirm('Eliminare definitivamente?')) return;
    await supa.from('closing_checks').delete().eq('prep_task_id',id);
    await supa.from('prep_tasks').delete().eq('id',id);
  }
  location.reload();
}

async function showArchivedPreps(){
  const{data}=await supa.from('prep_tasks').select('*').eq('archived',true).order('name');
  if(!data||!data.length){alert('Nessuna prep archiviata');return}
  const modal=document.createElement('div');
  modal.className='fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4';
  modal.innerHTML=`<div class="bg-white w-full max-w-lg rounded-3xl shadow-2xl max-h-[80vh] flex flex-col">
    <div class="p-4 border-b flex items-center justify-between"><h3 class="font-bold">📦 Prep Archiviate</h3><button onclick="this.closest('.fixed').remove()" class="text-slate-400">✕</button></div>
    <div class="p-4 overflow-auto space-y-2 flex-1">
      ${data.map(p=>`<div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
        <div><div class="font-medium text-sm">${p.name}</div><div class="text-xs text-slate-400">${p.category||''}</div></div>
        <button onclick="restorePrep('${p.id}')" class="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold">Riattiva</button>
      </div>`).join('')}
    </div>
  </div>`;
  document.body.appendChild(modal);
}

async function restorePrep(id){
  await supa.from('prep_tasks').update({archived:false}).eq('id',id);
  await supa.from('closing_checks').update({archived:false}).eq('prep_task_id',id);
  location.reload();
}
window.adminRename=adminRename; window.adminDel=adminDel;

const STATION_OPTIONS = ['Oven Station','Fresh Pasta Station','Pasta Station','Sauté Station','Saucier Station','Plating Station','Salad Station','Pastry Station','Table Side','Freezer','Manager Station'];

async function openPrepEditor(prep=null){
  const isNew = !prep;
  if(!window.SHOP_RECIPES || !window.SHOP_RECIPES.length){
    const {data:recs} = await supa.from('recipes').select('id,title').order('title');
    if(recs) window.SHOP_RECIPES = recs;
  }

  // Carica closing_checks esistenti per questa prep (stazioni che controllano)
  let existingCheckStations = [];
  if(!isNew && prep.id){
    const {data:cc} = await supa.from('closing_checks')
      .select('station')
      .eq('prep_task_id', prep.id)
      .eq('archived', false);
    existingCheckStations = (cc||[]).map(r=>r.station);
  }

  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4';
  const currentRecipeId = prep ? (prep.recipe_id||null) : null;

  const checkStationsHTML = STATION_OPTIONS.map(s=>{
    const checked = existingCheckStations.includes(s) ? 'checked' : '';
    return `<label style="display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer;">
      <input type="checkbox" class="pepCheckStation" value="${s}" ${checked}
        style="width:16px;height:16px;accent-color:#059669;cursor:pointer;">
      <span style="font-size:13px;color:#1e293b;">${s.replace(' Station','')}</span>
    </label>`;
  }).join('');

  modal.innerHTML = `
    <div class="bg-white w-full max-w-lg rounded-3xl shadow-2xl max-h-[90vh] flex flex-col">
      <div class="p-4 border-b flex items-center justify-between">
        <h3 class="font-bold">${isNew?'Nuova Prep':'Modifica Prep'}</h3>
        <button onclick="this.closest('.fixed').remove()" class="text-slate-400 text-xl">✕</button>
      </div>
      <div class="p-4 overflow-auto space-y-3 text-sm flex-1">
        <div>
          <label class="text-xs font-semibold text-slate-500 mb-1 block">Nome preparazione</label>
          <input id="pepName" placeholder="es. Salsa Arrabbiata" class="w-full px-3 py-2.5 border rounded-xl" value="${prep?.name||''}">
        </div>
        <div>
          <label class="text-xs font-semibold text-slate-500 mb-1 block">🍳 Stazione che produce</label>
          <select id="pepStation" class="w-full px-3 py-2.5 border rounded-xl bg-white">
            ${STATION_OPTIONS.map(s=>`<option ${(prep?.category||'Oven Station')===s?'selected':''}>${s}</option>`).join('')}
          </select>
          <p class="text-[10px] text-slate-400 mt-1">Chi prepara questo item la mattina.</p>
        </div>
        <div>
          <label class="text-xs font-semibold text-slate-500 mb-1 block">👁 Stazioni che controllano la sera</label>
          <div style="border:1px solid #e2e8f0;border-radius:12px;padding:8px 12px;max-height:180px;overflow-y:auto;">
            ${checkStationsHTML}
          </div>
          <p class="text-[10px] text-slate-400 mt-1">Seleziona una o più stazioni che devono verificare questo item nel check serale.</p>
        </div>
        <div>
          <label class="text-xs font-semibold text-slate-500 mb-1 block">Collega ricetta</label>
          <select id="pepRecipe" class="w-full px-3 py-2.5 border rounded-xl bg-white">
            <option value="">— nessuna ricetta —</option>
            ${(window.SHOP_RECIPES||[]).map(r=>`<option value="${r.id}" ${currentRecipeId==r.id?'selected':''}>${r.title}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="text-xs font-semibold text-slate-500 mb-1 block">Nota / Procedimento rapido</label>
          <textarea id="pepNote" class="w-full px-3 py-2.5 border rounded-xl h-24 resize-none" placeholder="Scrivi un procedimento rapido se non hai una ricetta collegata...">${prep?.note||''}</textarea>
          <p class="text-[10px] text-slate-400 mt-1">Se colleghi una ricetta, questa nota viene ignorata al tap.</p>
        </div>
        ${!isNew?`<div>
          <label class="text-xs font-semibold text-slate-500 mb-1 block">Durata attesa (giorni)</label>
          <input id="pepDuration" type="number" min="1" max="30" placeholder="es. 3" class="w-full px-3 py-2.5 border rounded-xl" value="${prep?.expected_duration_days||''}">
        </div>`:''}
        ${!isNew?`<div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs font-semibold text-slate-500">Steps sequenziali</label>
            <button type="button" id="pepAddStep" class="text-xs font-semibold text-white bg-slate-800 px-3 py-1.5 rounded-lg">+ Aggiungi step</button>
          </div>
          <div id="pepStepsList" class="space-y-2"></div>
          <p class="text-[10px] text-slate-400 mt-1">Se aggiungi steps, la nota viene ignorata al tap. Gli steps sono sequenziali: step 2 si sblocca solo dopo step 1.</p>
        </div>`:''}
      </div>
      <div class="p-4 border-t flex gap-2">
        <button onclick="this.closest('.fixed').remove()" class="flex-1 py-2.5 border rounded-xl text-sm">Annulla</button>
        <button id="pepSave" class="flex-1 py-2.5 bg-slate-900 text-white rounded-xl font-semibold text-sm">Salva</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  // ── GESTIONE STEPS ──
  let pepSteps = [];
  if(!isNew){
    const {data: existingSteps} = await supa.from('prep_steps')
      .select('*').eq('prep_task_id', prep.id).order('sort_order');
    pepSteps = (existingSteps||[]).map(s=>({...s}));
    renderPepSteps();
    modal.querySelector('#pepAddStep').onclick = () => {
      pepSteps.push({title:'', note:'', timer_minutes:null, sort_order: pepSteps.length});
      renderPepSteps();
    };
  }

  function renderPepSteps(){
    const list = modal.querySelector('#pepStepsList');
    if(!list) return;
    if(!pepSteps.length){
      list.innerHTML = '<div class="text-xs text-slate-400 text-center py-2">Nessuno step — usa ricetta o nota.</div>';
      return;
    }
    list.innerHTML = pepSteps.map((s,idx)=>`
      <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold text-slate-400 w-5">${idx+1}.</span>
          <input class="step-title flex-1 px-2 py-1.5 border rounded-lg text-sm" placeholder="es. Scongela i calamari" value="${s.title||''}">
          <button type="button" class="step-del text-slate-300 text-lg font-bold leading-none">×</button>
        </div>
        <textarea class="step-note w-full px-2 py-1.5 border rounded-lg text-xs resize-none h-14" placeholder="Nota/spiegazione (opzionale — es. In acqua fredda, pitcher da 5L)">${s.note||''}</textarea>
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-400">⏱ Timer:</span>
          <input class="step-timer w-20 px-2 py-1 border rounded-lg text-sm text-center" type="number" min="1" max="240" placeholder="min" value="${s.timer_minutes||''}">
          <span class="text-xs text-slate-400">minuti (vuoto = nessun timer)</span>
        </div>
      </div>`).join('');
    list.querySelectorAll('.step-del').forEach((btn,idx)=>{
      btn.onclick = ()=>{ pepSteps.splice(idx,1); renderPepSteps(); };
    });
    list.querySelectorAll('.step-title').forEach((inp,idx)=>{
      inp.oninput = ()=>{ pepSteps[idx].title = inp.value; };
    });
    list.querySelectorAll('.step-note').forEach((inp,idx)=>{
      inp.oninput = ()=>{ pepSteps[idx].note = inp.value; };
    });
    list.querySelectorAll('.step-timer').forEach((inp,idx)=>{
      inp.oninput = ()=>{ pepSteps[idx].timer_minutes = inp.value ? parseInt(inp.value) : null; };
    });
  }

  modal.querySelector('#pepSave').onclick = async() => {
    const name = modal.querySelector('#pepName').value.trim();
    if(!name){ alert('Nome obbligatorio'); return; }
    const category = modal.querySelector('#pepStation').value;
    const recipe_id = modal.querySelector('#pepRecipe').value || null;
    const note = modal.querySelector('#pepNote').value.trim() || null;
    const duration = modal.querySelector('#pepDuration')?.value ? parseInt(modal.querySelector('#pepDuration').value) : null;

    // Stazioni check selezionate
    const selectedCheckStations = Array.from(modal.querySelectorAll('.pepCheckStation:checked')).map(cb=>cb.value);

    const btn = modal.querySelector('#pepSave');
    btn.disabled = true; btn.textContent = 'Salvataggio...';
    try{
      let prepId = prep?.id;
      if(isNew){
        const{data:newPrep, error} = await supa.from('prep_tasks')
          .insert({name, category, note, recipe_id, need_tomorrow: false})
          .select().single();
        if(error) throw error;
        prepId = newPrep.id;
      } else {
        const updates = {name, category, note, recipe_id};
        if(duration) updates.expected_duration_days = duration;
        const{error} = await supa.from('prep_tasks').update(updates).eq('id', prep.id);
        if(error) throw error;

        // Salva steps: elimina tutti e reinserisce
        await supa.from('prep_steps').delete().eq('prep_task_id', prep.id);
        if(pepSteps.length > 0){
          const invalid = pepSteps.find(s=>!s.title.trim());
          if(invalid){ alert('Ogni step deve avere un titolo.'); btn.disabled=false; btn.textContent='Salva'; return; }
          const toInsert = pepSteps.map((s,i)=>({
            prep_task_id: prep.id,
            sort_order: i,
            title: s.title.trim(),
            note: s.note?.trim()||null,
            timer_minutes: s.timer_minutes||null
          }));
          const{error:se} = await supa.from('prep_steps').insert(toInsert);
          if(se) throw se;
        }
      }

      // Sincronizza closing_checks:
      // 1. Rimuovi le stazioni deselezionate
      if(!isNew){
        const toRemove = existingCheckStations.filter(s=>!selectedCheckStations.includes(s));
        for(const s of toRemove){
          await supa.from('closing_checks')
            .update({archived:true})
            .eq('prep_task_id', prepId)
            .eq('station', s);
        }
      }
      // 2. Aggiungi le stazioni nuove
      const toAdd = selectedCheckStations.filter(s=>!existingCheckStations.includes(s));
      for(const s of toAdd){
        await supa.from('closing_checks').insert({
          name, station: s, prep_task_id: prepId, archived: false
        });
      }
      // 3. Aggiorna nome se cambiato (su tutte le closing_checks collegate)
      if(!isNew && name !== prep.name){
        await supa.from('closing_checks')
          .update({name})
          .eq('prep_task_id', prepId)
          .eq('archived', false);
      }

      modal.remove();
      await init();
      if(typeof renderRecipes === 'function') renderRecipes();
    }catch(e){
      alert('Errore: '+e.message);
      btn.disabled=false; btn.textContent='Salva';
    }
  };
}

// ── ADMIN CLOSING CHECKS ──
// Gestione closing checks: aggiungi, modifica, archivia, sposta stazione

const CLOSING_STATION_OPTIONS = [
  'Oven Station','Fresh Pasta Station','Pasta Station','Sauté Station',
  'Saucier Station','Plating Station','Salad Station','Pastry Station',
  'Table Side','Freezer','Grill & Features','Coordinator Station','Dish Crew'
];

async function openClosingAdmin() {
  let overlay = document.getElementById('closingAdminOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'closingAdminOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:80;background:#f0f4f8;overflow-y:auto;-webkit-overflow-scrolling:touch;';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `
    <div style="max-width:480px;margin:0 auto;padding:0 0 80px;">
      <div style="position:sticky;top:0;z-index:10;background:#f0f4f8;padding:16px 16px 10px;display:flex;align-items:center;gap:10px;border-bottom:0.5px solid #e2e8f0;">
        <button onclick="closeClosingAdmin()" style="width:36px;height:36px;border-radius:50%;border:none;background:white;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,0.1);cursor:pointer;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" stroke-width="2" stroke-linecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <div>
          <div style="font-size:17px;font-weight:700;color:#1e3a5f;">Closing Checks</div>
          <div style="font-size:11px;color:#94a3b8;">Gestione admin — tutti i check serali</div>
        </div>
        <button onclick="_showClosingCheckEditor(null)" style="margin-left:auto;padding:7px 14px;border-radius:20px;border:none;background:#1e3a5f;color:white;font-size:12px;font-weight:600;cursor:pointer;">+ Aggiungi</button>
      </div>
      <div id="closingAdminList" style="padding:12px 12px 0;">
        <div style="text-align:center;padding:40px;color:#94a3b8;font-size:13px;">Caricamento...</div>
      </div>
    </div>

    <!-- Editor modal -->
    <div id="closingCheckEditorModal" style="display:none;position:fixed;inset:0;z-index:90;background:rgba(15,23,42,0.5);" onclick="if(event.target===this)_closeClosingCheckEditor()">
      <div id="closingCheckEditorContent" style="position:absolute;bottom:0;left:0;right:0;max-width:480px;margin:0 auto;background:white;border-radius:24px 24px 0 0;padding:20px 16px 40px;max-height:92vh;overflow-y:auto;-webkit-overflow-scrolling:touch;"></div>
    </div>
  `;
  overlay.classList.remove('hidden');
  await _loadClosingAdminList();
}

async function _loadClosingAdminList() {
  const container = document.getElementById('closingAdminList');
  if (!container) return;

  const { data: checks, error } = await supa
    .from('closing_checks')
    .select('*, prep_tasks(name, category)')
    .eq('archived', false)
    .order('station')
    .order('name');

  if (error) { container.innerHTML = `<div style="padding:20px;color:#ef4444;font-size:13px;">Errore: ${error.message}</div>`; return; }
  if (!checks || checks.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;font-size:13px;">Nessun closing check attivo</div>';
    return;
  }

  // Raggruppa per stazione
  const byStation = {};
  checks.forEach(c => {
    const s = c.station || 'Senza stazione';
    if (!byStation[s]) byStation[s] = [];
    byStation[s].push(c);
  });

  container.innerHTML = Object.entries(byStation).map(([station, items]) => `
    <div style="margin-bottom:16px;">
      <div style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:0.08em;text-transform:uppercase;padding:0 4px 6px;">${station.replace(' Station','')}</div>
      ${items.map(c => `
        <div onclick="_showClosingCheckEditor(${c.id})" style="background:white;border-radius:12px;padding:11px 14px;margin-bottom:6px;box-shadow:0 1px 3px rgba(30,58,95,0.07);cursor:pointer;border:0.5px solid #e2e8f0;display:flex;align-items:center;gap:10px;">
          <div style="flex:1;min-width:0;">
            <div style="font-size:14px;font-weight:600;color:#1e3a5f;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.name}</div>
            <div style="font-size:10px;color:#94a3b8;margin-top:2px;display:flex;gap:6px;flex-wrap:wrap;">
              ${c.prep_tasks ? `<span style="color:#6366f1;">→ ${c.prep_tasks.name}</span>` : '<span>Stand-alone</span>'}
              ${c.daily_reset ? '<span style="color:#059669;">↺ Daily reset</span>' : ''}
            </div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </div>
      `).join('')}
    </div>
  `).join('');
}

async function _showClosingCheckEditor(checkId) {
  const modal = document.getElementById('closingCheckEditorModal');
  const content = document.getElementById('closingCheckEditorContent');
  if (!modal || !content) return;

  content.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;">Caricamento...</div>';
  modal.style.display = 'block';

  const isNew = !checkId;
  let check = null;

  if (!isNew) {
    const { data } = await supa.from('closing_checks').select('*').eq('id', checkId).single();
    check = data;
  }

  // Carica prep tasks per il collegamento
  const { data: prepTasks } = await supa
    .from('prep_tasks')
    .select('id, name, category')
    .eq('archived', false)
    .order('name');

  const prepOptions = (prepTasks || []).map(p =>
    `<option value="${p.id}" ${check?.prep_task_id == p.id ? 'selected' : ''}>${p.name} (${(p.category||'').replace(' Station','')})</option>`
  ).join('');

  const stationOpts = CLOSING_STATION_OPTIONS.map(s =>
    `<option value="${s}" ${(check?.station || 'Oven Station') === s ? 'selected' : ''}>${s.replace(' Station','')}</option>`
  ).join('');

  content.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">
      <button onclick="_closeClosingCheckEditor()" style="width:32px;height:32px;border-radius:50%;border:none;background:#f1f5f9;cursor:pointer;display:flex;align-items:center;justify-content:center;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" stroke-width="2" stroke-linecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
      </button>
      <div style="font-size:16px;font-weight:700;color:#1e3a5f;">${isNew ? 'Nuovo Closing Check' : 'Modifica Check'}</div>
    </div>

    <!-- Nome -->
    <div style="margin-bottom:14px;">
      <div style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:6px;">Nome</div>
      <input id="ccName" value="${check?.name || ''}" placeholder="es. Arrabbiata sauce"
        style="width:100%;font-size:14px;border:0.5px solid #e2e8f0;border-radius:10px;padding:10px 12px;color:#1e3a5f;font-family:inherit;box-sizing:border-box;">
    </div>

    <!-- Stazione -->
    <div style="margin-bottom:14px;">
      <div style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:6px;">Stazione che controlla la sera</div>
      <select id="ccStation" style="width:100%;font-size:13px;border:0.5px solid #e2e8f0;border-radius:10px;padding:10px 12px;background:white;color:#1e3a5f;">
        ${stationOpts}
      </select>
    </div>

    <!-- Collega prep task -->
    <div style="margin-bottom:14px;">
      <div style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:6px;">Collegamento prep task (opzionale)</div>
      <select id="ccPrepTask" style="width:100%;font-size:13px;border:0.5px solid #e2e8f0;border-radius:10px;padding:10px 12px;background:white;color:#1e3a5f;">
        <option value="">— nessun collegamento —</option>
        ${prepOptions}
      </select>
      <div style="font-size:10px;color:#94a3b8;margin-top:4px;">Se collegato: segnare "Manca" attiva automaticamente la prep task la mattina.</div>
    </div>

    <!-- Daily reset -->
    <div style="margin-bottom:20px;background:#f0fdf4;border-radius:12px;padding:12px 14px;border:0.5px solid #bbf7d0;">
      <label style="display:flex;align-items:center;gap:10px;cursor:pointer;">
        <div style="position:relative;width:44px;height:26px;flex-shrink:0;">
          <input type="checkbox" id="ccDailyReset" ${check?.daily_reset ? 'checked' : ''}
            style="opacity:0;width:0;height:0;position:absolute;"
            onchange="document.getElementById('ccDailyResetTrack').style.background=this.checked?'#059669':'#e2e8f0';document.getElementById('ccDailyResetThumb').style.transform=this.checked?'translateX(18px)':'translateX(0)'">
          <div id="ccDailyResetTrack" style="position:absolute;inset:0;border-radius:13px;background:${check?.daily_reset ? '#059669' : '#e2e8f0'};transition:background 0.2s;"></div>
          <div id="ccDailyResetThumb" style="position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:white;box-shadow:0 1px 3px rgba(0,0,0,0.2);transition:transform 0.2s;transform:${check?.daily_reset ? 'translateX(18px)' : 'translateX(0)'};"></div>
        </div>
        <div>
          <div style="font-size:13px;font-weight:600;color:#065f46;">↺ Reset automatico giornaliero</div>
          <div style="font-size:10px;color:#6b7280;margin-top:1px;">Il check si azzera ogni notte e torna da rispondere il giorno dopo.</div>
        </div>
      </label>
    </div>

    <!-- Note -->
    <div style="margin-bottom:20px;">
      <div style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:6px;">Nota (opzionale)</div>
      <textarea id="ccNote" placeholder="es. Verificare anche il livello nel contenitore di riserva"
        style="width:100%;font-size:13px;border:0.5px solid #e2e8f0;border-radius:10px;padding:10px 12px;resize:none;height:60px;color:#1e3a5f;font-family:inherit;box-sizing:border-box;">${check?.note || ''}</textarea>
    </div>

    <!-- Salva -->
    <button id="ccSaveBtn" onclick="_saveClosingCheck(${checkId || 'null'})"
      style="width:100%;padding:13px;border-radius:12px;border:none;background:#1e3a5f;color:white;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:10px;">
      ${isNew ? 'Crea closing check' : 'Salva modifiche'}
    </button>

    ${!isNew ? `
    <button onclick="_archiveClosingCheck(${checkId})"
      style="width:100%;padding:11px;border-radius:12px;border:0.5px solid #fecaca;background:#fff5f5;color:#ef4444;font-size:13px;font-weight:600;cursor:pointer;">
      Archivia questo check
    </button>
    ` : ''}
  `;
}

async function _saveClosingCheck(checkId) {
  const btn = document.getElementById('ccSaveBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Salvataggio...'; }

  const name = document.getElementById('ccName')?.value?.trim();
  if (!name) { alert('Il nome è obbligatorio'); if (btn) { btn.disabled = false; btn.textContent = checkId ? 'Salva modifiche' : 'Crea closing check'; } return; }

  const station = document.getElementById('ccStation')?.value;
  const prep_task_id = document.getElementById('ccPrepTask')?.value || null;
  const daily_reset = document.getElementById('ccDailyReset')?.checked || false;
  const note = document.getElementById('ccNote')?.value?.trim() || null;

  const payload = { name, station, prep_task_id, daily_reset, note };

  let error;
  if (!checkId) {
    ({ error } = await supa.from('closing_checks').insert({ ...payload, archived: false }));
  } else {
    ({ error } = await supa.from('closing_checks').update(payload).eq('id', checkId));
  }

  if (error) {
    alert('Errore: ' + error.message);
    if (btn) { btn.disabled = false; btn.textContent = checkId ? 'Salva modifiche' : 'Crea closing check'; }
    return;
  }

  _closeClosingCheckEditor();
  await _loadClosingAdminList();
}

async function _archiveClosingCheck(checkId) {
  if (!confirm('Archiviare questo closing check? Verrà nascosto dalla lista serale.')) return;
  await supa.from('closing_checks').update({ archived: true }).eq('id', checkId);
  _closeClosingCheckEditor();
  await _loadClosingAdminList();
}

function _closeClosingCheckEditor() {
  const modal = document.getElementById('closingCheckEditorModal');
  if (modal) modal.style.display = 'none';
}

function closeClosingAdmin() {
  const overlay = document.getElementById('closingAdminOverlay');
  if (overlay) overlay.remove();
}

