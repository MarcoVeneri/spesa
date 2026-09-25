const API='https://nlhxjpartgvplythgzrz.supabase.co';
const KEY='sb_publishable_uA9EbSMwJ5oFraqP-r5njg_EXtLSjEH';
const LS_TOKEN='spesa_shared_token',LS_CACHE='spesa_items_cache';
let token='',items=[],loading=false;
const $=s=>document.querySelector(s);
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1600)}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function category(name){
 const s=name.toLowerCase(),groups=[
 ['Frutta e verdura',['mela','banana','insalata','pomodor','zucchin','patat','cipoll','carot','verdura','frutta','limon','aranc','fragol']],
 ['Freschi',['latte','yogurt','burro','uova','formaggio','mozzarella','parmigiano','prosciutto','speck','affettat']],
 ['Carne e pesce',['pollo','carne','bistecca','hamburger','salsic','pesce','salmone','tonno','orata']],
 ['Dispensa',['pasta','riso','farina','zucchero','sale','olio','caff','biscott','pane','cracker','passata','sugo']],
 ['Bevande',['acqua','vino','birra','coca','succo','bevanda']],
 ['Casa',['detersivo','lavatrice','lavastoviglie','carta','scottex','sacchi','spugna','candeggina']],
 ['Igiene',['shampoo','sapone','dentifricio','deodorante','rasoio','bagnoschiuma']]];
 for(const [g,k] of groups)if(k.some(x=>s.includes(x)))return g;return 'Altro';
}
async function rpc(fn,args){
 const r=await fetch(API+'/rest/v1/rpc/'+fn,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify(args)});
 if(!r.ok)throw new Error(await r.text());
 const ct=r.headers.get('content-type')||'';return ct.includes('application/json')?r.json():r.text();
}
function ingestHash(){
 const p=new URLSearchParams(location.hash.replace(/^#/,''));
 const k=p.get('key');
 if(k){localStorage.setItem(LS_TOKEN,k);history.replaceState(null,'',location.pathname+location.search)}
 token=localStorage.getItem(LS_TOKEN)||'';
}
function cached(){try{return JSON.parse(localStorage.getItem(LS_CACHE)||'[]')}catch{return[]}}
function row(x){return '<div class="item '+(x.checked?'checked':'')+'" data-id="'+x.id+'"><button class="check" data-act="check">'+(x.checked?'✓':'')+'</button><div><div class="name">'+esc(x.name)+'</div><div class="meta">'+esc(x.category||'Altro')+'</div></div>'+(x.quantity?'<div class="qty">'+esc(x.quantity)+'</div>':'<div></div>')+'<button class="trash" data-act="delete">×</button></div>'}
function render(){
 $('#setup').hidden=!!token;$('#main').hidden=!token;if(!token)return;
 const active=items.filter(x=>!x.checked),done=items.filter(x=>x.checked);$('#count').textContent=active.length+' da prendere';
 if(!items.length){$('#content').innerHTML='<div class="card empty"><b>Lista vuota</b>Aggiungi qualcosa sopra.</div>';return}
 let out='';for(const cat of [...new Set(active.map(x=>x.category||'Altro'))]){out+='<div class="section">'+esc(cat)+'</div><div class="card list">'+active.filter(x=>(x.category||'Altro')===cat).map(row).join('')+'</div>'}
 if(done.length)out+='<div class="section">Presi</div><div class="card list">'+done.map(row).join('')+'</div>';$('#content').innerHTML=out;
}
async function refresh(silent=false){
 if(!token||loading)return;loading=true;
 try{const d=await rpc('shopping_get_items',{p_token:token});items=Array.isArray(d)?d:[];localStorage.setItem(LS_CACHE,JSON.stringify(items));$('#status').textContent='Condivisa';render()}
 catch{items=cached();render();$('#status').textContent=navigator.onLine?'Errore':'Offline';if(!silent)toast('Connessione non disponibile')}
 finally{loading=false}
}
async function add(){
 const a=$('#itemInput'),q=$('#qtyInput'),name=a.value.trim();if(!name)return;const qty=q.value.trim();a.value='';q.value='';
 try{await rpc('shopping_add_item',{p_token:token,p_name:name,p_quantity:qty||null,p_category:category(name)});await refresh(true);a.focus()}
 catch{a.value=name;toast('Non riesco ad aggiungere')}
}
async function toggle(id){const x=items.find(v=>v.id===id);if(!x)return;x.checked=!x.checked;render();try{await rpc('shopping_set_checked',{p_token:token,p_item_id:id,p_checked:x.checked});await refresh(true)}catch{x.checked=!x.checked;render();toast('Modifica non salvata')}}
async function del(id){const old=items;items=items.filter(x=>x.id!==id);render();try{await rpc('shopping_delete_item',{p_token:token,p_item_id:id});await refresh(true)}catch{items=old;render();toast('Eliminazione non salvata')}}
async function clearDone(){if(!items.some(x=>x.checked)){toast('Nessun prodotto preso');return}try{await rpc('shopping_clear_checked',{p_token:token});await refresh(true);toast('Prodotti presi rimossi')}catch{toast('Operazione non riuscita')}}
async function share(){
 const link=location.origin+location.pathname+'#key='+encodeURIComponent(token);
 try{if(navigator.share)await navigator.share({title:'Lista della spesa',text:'Apri la nostra lista condivisa',url:link});else{await navigator.clipboard.writeText(link);toast('Link copiato')}}catch(e){if(e.name!=='AbortError')toast('Condivisione non riuscita')}
}
$('#addBtn').onclick=add;$('#itemInput').addEventListener('keydown',e=>{if(e.key==='Enter')add()});$('#qtyInput').addEventListener('keydown',e=>{if(e.key==='Enter')add()});
$('#clearBtn').onclick=clearDone;$('#shareBtn').onclick=share;
$('#saveCode').onclick=()=>{const k=$('#codeInput').value.trim();if(k){localStorage.setItem(LS_TOKEN,k);token=k;render();refresh()}};
$('#content').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const it=b.closest('.item');if(!it)return;b.dataset.act==='check'?toggle(it.dataset.id):del(it.dataset.id)});
window.addEventListener('online',()=>refresh(true));document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh(true)});
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js');
ingestHash();items=cached();render();if(token)refresh();setInterval(()=>{if(!document.hidden)refresh(true)},5000);