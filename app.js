(() => {
  const cfg = window.APP_CONFIG || {};
  const $ = id => document.getElementById(id);
  const localDate = () => new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Bogota'}).format(new Date());
  $('today').textContent = new Intl.DateTimeFormat('es-CO',{dateStyle:'long',timeZone:'America/Bogota'}).format(new Date());
  if (!cfg.supabaseUrl?.startsWith('https://') || !cfg.supabaseAnonKey || cfg.supabaseAnonKey.startsWith('TU_')) {
    $('loginMsg').textContent = 'Falta configurar config.js con la URL y la clave anónima de Supabase.';
    $('loginMsg').className = 'message error'; return;
  }
  const db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  let profile, allTasks = [], allProducts = [], profiles = [], activeTab = 'count';

  function msg(text='', bad=false){ $('appMsg').textContent=text; $('appMsg').className=bad?'message error':'message'; }
  function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  function csvCell(v){return `"${String(v??'').replaceAll('"','""')}"`;}
  function download(name, rows){ const s='\ufeff'+rows.map(r=>r.map(csvCell).join(',')).join('\n'); const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([s],{type:'text/csv;charset=utf-8'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500); }
  function isAdmin(){return profile?.role==='admin';}
  function visibleTasks(){const s=$('search').value.trim().toLowerCase(), state=$('status').value, op=$('operatorFilter').value;return allTasks.filter(t=>{const counted=t.counted_quantity!==null;return (state==='counted'?counted:!counted)&&(!s||t.product_code.toLowerCase().includes(s)||t.product_name.toLowerCase().includes(s))&&(!op||t.assigned_to===op);});}

  async function load(){
    msg('Actualizando…');
    const {data: tasks,error}=await db.from('count_tasks').select('*').order('product_code');
    if(error){msg(error.message,true);return;} allTasks=tasks||[];
    if(isAdmin()){
      const [{data: products,error:pe},{data:people,error:ue}]=await Promise.all([db.from('inventory_items').select('*').order('product_code'),db.from('profiles').select('id,full_name,email,role').order('full_name')]);
      if(pe||ue){msg((pe||ue).message,true);return;} allProducts=products||[]; profiles=people||[]; fillOperators(); renderAdmin();
    }
    render(); msg('');
  }
  function fillOperators(){const cur=$('operatorFilter').value;$('operatorFilter').innerHTML='<option value="">Todos</option>'+profiles.filter(x=>x.role==='operator').map(x=>`<option value="${x.id}">${esc(x.full_name||x.email)}</option>`).join('');$('operatorFilter').value=cur;}
  function render(){const list=visibleTasks();const counted=allTasks.filter(x=>x.counted_quantity!==null).length;$('shown').textContent=list.length;$('counted').textContent=counted;$('pending').textContent=allTasks.length-counted;
    $('tasks').innerHTML=list.length?list.map(t=>`<tr data-id="${t.id}"><td class="code">${esc(t.product_code)}</td><td>${esc(t.product_name)}</td><td>${esc(t.unit||'')}</td><td class="operario-col adminOnly">${isAdmin()?esc((profiles.find(p=>p.id===t.assigned_to)||{}).full_name||'Sin asignar'):''}</td><td><input class="count" type="number" step="0.01" min="0" value="${t.counted_quantity??''}" aria-label="Conteo ${esc(t.product_code)}"></td><td><input class="obs" value="${esc(t.observation||'')}" aria-label="Observación ${esc(t.product_code)}"></td><td class="status">${t.counted_quantity===null?'Pendiente':`Guardado ${t.counted_at||''}`}</td></tr>`).join(''):'<tr><td colspan="7" class="empty">No hay ítems en esta vista.</td></tr>';
    document.querySelectorAll('#tasks tr[data-id]').forEach(row=>{let timer;const save=()=>{clearTimeout(timer);timer=setTimeout(()=>saveTask(row),500)};row.querySelectorAll('input').forEach(i=>i.addEventListener('input',save));});
  }
  async function saveTask(row){const id=row.dataset.id, q=row.querySelector('.count').value, observation=row.querySelector('.obs').value; const payload={counted_quantity:q===''?null:Number(q),observation:observation||null};
    const {data,error}=await db.from('count_tasks').update(payload).eq('id',id).select().single(); if(error){msg('No se guardó: '+error.message,true);return;} const i=allTasks.findIndex(t=>t.id===id);allTasks[i]=data;row.querySelector('.status').textContent=data.counted_quantity===null?'Pendiente':`Guardado ${data.counted_at}`;msg('Guardado automáticamente.'); if($('status').value==='pending'&&data.counted_quantity!==null) setTimeout(render,200);
  }
  function renderAdmin(){const tasksByProduct=new Map(allTasks.map(t=>[t.inventory_item_id,t]));$('adminTasks').innerHTML=allProducts.map(p=>{const t=tasksByProduct.get(p.id), diff=t?.counted_quantity==null?'':Number(t.counted_quantity)-Number(p.system_quantity);const options='<option value="">Sin asignar</option>'+profiles.filter(x=>x.role==='operator').map(x=>`<option ${t?.assigned_to===x.id?'selected':''} value="${x.id}">${esc(x.full_name||x.email)}</option>`).join('');return `<tr><td class="code">${esc(p.product_code)}</td><td>${esc(p.product_name)}</td><td>${p.system_quantity??''}</td><td>${Number(p.unit_value||0).toLocaleString('es-CO')}</td><td>${esc((profiles.find(x=>x.id===t?.assigned_to)||{}).full_name||'Sin asignar')}</td><td>${t?.counted_quantity??''}</td><td style="color:${diff===0?'var(--green)':'var(--red)'}">${diff}</td><td>${t?`<select class="assign" data-task="${t.id}">${options}</select>`:''}</td></tr>`}).join('');document.querySelectorAll('.assign').forEach(s=>s.addEventListener('change',async()=>{const {error}=await db.from('count_tasks').update({assigned_to:s.value||null}).eq('id',s.dataset.task);if(error)msg(error.message,true);else load();}));}
  async function session(){const {data:{session}}=await db.auth.getSession();if(!session){$('login').classList.remove('hide');return;}const {data,error}=await db.from('profiles').select('*').eq('id',session.user.id).single();if(error){$('loginMsg').textContent='Su perfil no está creado. El administrador debe asignarle el rol.';return;}profile=data;$('login').classList.add('hide');$('app').classList.remove('hide');document.body.classList.toggle('admin',isAdmin());$('userBox').innerHTML=`${esc(profile.full_name||session.user.email)}<br><small>${isAdmin()?'Administrador':'Operario'}</small> <button id="out">Salir</button>`;$('out').onclick=()=>db.auth.signOut().then(()=>location.reload());await load();subscribe();}
  function subscribe(){db.channel('conteo-en-vivo').on('postgres_changes',{event:'*',schema:'public',table:'count_tasks'},()=>load()).subscribe();}
  $('signIn').onclick=async()=>{const email=$('email').value.trim(),password=$('password').value;if(!email||!password)return;$('signIn').disabled=true;const {error}=await db.auth.signInWithPassword({email,password});$('signIn').disabled=false;if(error){$('loginMsg').textContent=error.message;$('loginMsg').className='message error';}else session();};
  $('password').addEventListener('keydown',e=>{if(e.key==='Enter')$('signIn').click()});
  $('search').oninput=render;$('status').onchange=render;$('operatorFilter').onchange=render;$('refresh').onclick=load;
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{activeTab=b.dataset.tab;document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));$('countView').classList.toggle('hide',activeTab!=='count');$('adminView').classList.toggle('hide',activeTab!=='admin');});
  $('exportCount').onclick=()=>{const rows=[['Código del producto (obligatorio)','Nombre del producto / Servicio','Referencia de fábrica','Código de Bodega','Existencias contadas (obligatorio)']];allProducts.forEach(p=>{const t=allTasks.find(x=>x.inventory_item_id===p.id);if(t?.counted_quantity!==null)rows.push([p.product_code,p.product_name,p.factory_reference||'',p.warehouse_code||'01',t.counted_quantity]);});download(`importacion_conteo_siigo_${localDate()}.csv`,rows);};
  $('exportAdjustment').onclick=()=>{const rows=[['Código del producto (Obligatorio)','Nombre del producto / Servicio','Referencia de fábrica','Código de Bodega','Aumenta/Disminuye (Obligatorio)','Cantidad','Costo Unitario','Código cuenta contable','Ajuste']];allProducts.forEach(p=>{const t=allTasks.find(x=>x.inventory_item_id===p.id);if(t?.counted_quantity!==null){const d=Number(t.counted_quantity)-Number(p.system_quantity);if(d)rows.push([p.product_code,p.product_name,p.factory_reference||'',p.warehouse_code||'01',d>0?'Aumenta':'Disminuye',Math.abs(d),p.unit_value||'', '', 'Conteo físico']);}});download(`ajustes_siigo_${localDate()}.csv`,rows);};
  session();
})();
