const API='https://nlhxjpartgvplythgzrz.supabase.co';
const KEY='sb_publishable_uA9EbSMwJ5oFraqP-r5njg_EXtLSjEH';
const LS_TOKEN='spesa_shared_token',LS_CACHE='spesa_items_cache',LS_TRASH='spesa_trash_cache';
let token='',items=[],loading=false;
const $=s=>document.querySelector(s);

function toast(m){
  const t=$('#toast');t.textContent=m;t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),1500);
}
function esc(s){
  return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
async function rpc(fn,args){
  const r=await fetch(API+'/rest/v1/rpc/'+fn,{
    method:'POST',
    headers:{apikey:KEY,'Content-Type':'application/json'},
    body:JSON.stringify(args)
  });
  if(!r.ok)throw new Error(await r.text());
  const ct=r.headers.get('content-type')||'';
  return ct.includes('application/json')?r.json():r.text();
}
function ingestHash(){
  const p=new URLSearchParams(location.hash.replace(/^#/,''));
  const k=p.get('key');
  if(k){
    localStorage.setItem(LS_TOKEN,k);
    history.replaceState(null,'',location.pathname+location.search);
  }
  token=localStorage.getItem(LS_TOKEN)||'';
}
function cached(){
  try{return JSON.parse(localStorage.getItem(LS_CACHE)||'[]')}catch{return[]}
}
function trashCached(){
  try{return JSON.parse(localStorage.getItem(LS_TRASH)||'[]')}catch{return[]}
}
function saveTrash(list){
  localStorage.setItem(LS_TRASH,JSON.stringify(list.slice(0,30)));
  renderTrashBadge();
}
function renderTrashBadge(){
  const btn=$('#trashBtn');
  if(!btn)return;
  btn.classList.toggle('active',trashCached().length>0);
}
function renderTrash(){
  const list=trashCached();
  const box=$('#trashList');
  if(!box)return;
  box.innerHTML=list.length?list.map((x,i)=>
    '<div class="trashRow" data-index="'+i+'"><div class="trashName">'+esc(x.name)+'</div><button class="restoreBtn" type="button">Recupera</button></div>'
  ).join(''):'<div class="trashEmpty">Nessun articolo da recuperare.</div>';
}
function openTrash(){
  renderTrash();
  $('#trashModal').classList.add('open');
  $('#trashModal').setAttribute('aria-hidden','false');
}
function closeTrash(){
  $('#trashModal').classList.remove('open');
  $('#trashModal').setAttribute('aria-hidden','true');
}
function clearTrash(){
  saveTrash([]);
  renderTrash();
  toast('Cestino svuotato');
}
function row(x){
  return '<div class="swipeRow" data-id="'+x.id+'">'+
    '<button class="deleteAction" type="button" aria-label="Elimina '+esc(x.name)+'"><span>Elimina</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="m7 7 1 13h8l1-13"/></svg></button>'+
    '<div class="item" role="listitem"><div class="itemName">'+esc(x.name)+'</div></div>'+
  '</div>';
}
function emptyState(){
  return '<div class="empty">'+
    '<div class="emptyIcon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14l-1.2 12H6.2Z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/></svg></div>'+
    '<b>Lista vuota</b><span>Aggiungi il primo articolo.</span>'+
  '</div>';
}
function render(){
  $('#setup').hidden=!!token;
  $('#main').hidden=!token;
  if(!token)return;

  $('#count').textContent=items.length+' '+(items.length===1?'articolo':'articoli');
  $('#content').innerHTML=items.length?'<div class="list">'+items.map(row).join('')+'</div>':emptyState();
  openSwipe=null;
  bindAllSwipes();
}
async function refresh(silent=false){
  if(!token||loading)return;
  loading=true;
  try{
    const d=await rpc('shopping_get_items',{p_token:token});
    items=Array.isArray(d)?d:[];
    localStorage.setItem(LS_CACHE,JSON.stringify(items));
    $('#status').textContent='Sincronizzata';
    render();
  }catch{
    items=cached();
    render();
    $('#status').textContent=navigator.onLine?'Errore':'Offline';
    if(!silent)toast('Connessione non disponibile');
  }finally{
    loading=false;
  }
}
async function add(){
  const input=$('#itemInput');
  const name=input.value.trim();
  if(!name)return;
  input.value='';
  try{
    await rpc('shopping_add_item',{
      p_token:token,
      p_name:name,
      p_quantity:null,
      p_category:'Altro'
    });
    await refresh(true);
    input.focus();
  }catch{
    input.value=name;
    toast('Non riesco ad aggiungere');
  }
}
function hapticDelete(){
  try{
    if(typeof navigator.vibrate==='function') navigator.vibrate(10);
  }catch{}
}
async function del(id,el){
  if(!id||!el||el.classList.contains('removing'))return;
  const previous=items.slice();
  const removed=items.find(x=>x.id===id);
  const request=rpc('shopping_delete_item',{p_token:token,p_item_id:id});
  el.classList.add('removing');
  await new Promise(resolve=>setTimeout(resolve,270));
  items=items.filter(x=>x.id!==id);
  render();
  localStorage.setItem(LS_CACHE,JSON.stringify(items));
  try{
    await request;
    if(removed){
      const t=trashCached();
      t.unshift({name:removed.name,deletedAt:Date.now()});
      saveTrash(t);
    }
  }catch{
    items=previous;
    render();
    localStorage.setItem(LS_CACHE,JSON.stringify(items));
    toast('Eliminazione non salvata');
  }
}
async function restoreTrash(index){
  const t=trashCached();
  const x=t[index];
  if(!x)return;
  try{
    await rpc('shopping_add_item',{p_token:token,p_name:x.name,p_quantity:null,p_category:'Altro'});
    t.splice(index,1);
    saveTrash(t);
    renderTrash();
    await refresh(true);
    toast('Articolo recuperato');
  }catch{
    toast('Recupero non riuscito');
  }
}
async function share(){
  const link=location.origin+location.pathname+'#key='+encodeURIComponent(token);
  try{
    if(navigator.share){
      await navigator.share({title:'Lista della spesa',text:'Apri la nostra lista condivisa',url:link});
    }else{
      await navigator.clipboard.writeText(link);
      toast('Link copiato');
    }
  }catch(e){
    if(e.name!=='AbortError')toast('Condivisione non riuscita');
  }
}

$('#addBtn').onclick=add;
$('#trashBtn').onclick=openTrash;
$('#trashClose').onclick=closeTrash;
$('#trashClear').onclick=clearTrash;
$('#trashModal').addEventListener('click',e=>{if(e.target===$('#trashModal'))closeTrash()});
$('#trashList').addEventListener('click',e=>{
  const b=e.target.closest('.restoreBtn');
  if(!b)return;
  const row=b.closest('.trashRow');
  if(row)restoreTrash(Number(row.dataset.index));
});
$('#itemInput').addEventListener('keydown',e=>{if(e.key==='Enter')add()});
$('#shareBtn').onclick=share;
$('#saveCode').onclick=()=>{
  const k=$('#codeInput').value.trim();
  if(k){
    localStorage.setItem(LS_TOKEN,k);
    token=k;
    render();
    refresh();
  }
};
const SWIPE_TRIGGER=44;
function mixDeleteColor(progress){
  const p=Math.max(0,Math.min(1,progress));
  const a=[92,85,87],b=[231,40,40];
  const v=a.map((n,i)=>Math.round(n+(b[i]-n)*p));
  return 'rgb('+v.join(',')+')';
}
function resetSwipe(row,animate=true){
  if(!row)return;
  const item=row.querySelector('.item');
  const action=row.querySelector('.deleteAction');
  if(!item||!action)return;
  item.style.transition=animate?'transform .18s cubic-bezier(.22,.8,.32,1)':'none';
  action.style.transition=animate?'width .18s cubic-bezier(.22,.8,.32,1),background-color .18s ease':'none';
  item.style.transform='translateX(0px)';
  action.style.width='0px';
  action.style.backgroundColor='rgb(92,85,87)';
  row.classList.remove('dragging','armed');
}
function commitSwipe(row,item,action){
  row.classList.remove('dragging');
  row.classList.add('armed');
  hapticDelete();
  const w=row.clientWidth;
  item.style.transition='transform .13s cubic-bezier(.18,.82,.22,1)';
  action.style.transition='width .13s cubic-bezier(.18,.82,.22,1),background-color .10s linear';
  action.style.backgroundColor='rgb(231,40,40)';
  action.style.width=w+'px';
  item.style.transform='translateX(-100%)';
  setTimeout(()=>del(row.dataset.id,row),190);
}
function bindSwipe(row){
  const item=row.querySelector('.item');
  const action=row.querySelector('.deleteAction');
  if(!item||!action)return;
  let sx=0,sy=0,dragging=false,horizontal=false,committed=false;
  item.addEventListener('touchstart',e=>{
    if(committed)return;
    const t=e.touches[0];
    sx=t.clientX;sy=t.clientY;
    dragging=true;horizontal=false;
    item.style.transition='none';
    action.style.transition='none';
    action.style.width='0px';
    action.style.backgroundColor='rgb(92,85,87)';
  },{passive:true});
  item.addEventListener('touchmove',e=>{
    if(!dragging||committed)return;
    const t=e.touches[0];
    const dx=t.clientX-sx,dy=t.clientY-sy;
    if(!horizontal){
      if(Math.abs(dx)<4)return;
      if(Math.abs(dy)>Math.abs(dx)){dragging=false;return}
      horizontal=true;
      row.classList.add('dragging');
    }
    if(dx>=0){
      item.style.transform='translateX(0px)';
      action.style.width='0px';
      return;
    }
    e.preventDefault();
    const reveal=Math.min(row.clientWidth,Math.abs(dx));
    const progress=Math.min(1,reveal/SWIPE_TRIGGER);
    item.style.transform='translateX(-'+reveal+'px)';
    action.style.width=reveal+'px';
    action.style.backgroundColor=mixDeleteColor(progress);
    if(reveal>=SWIPE_TRIGGER){
      committed=true;
      dragging=false;
      commitSwipe(row,item,action);
    }
  },{passive:false});
  item.addEventListener('touchend',()=>{
    if(committed)return;
    dragging=false;
    if(horizontal)resetSwipe(row);
    horizontal=false;
  },{passive:true});
  item.addEventListener('touchcancel',()=>{
    if(committed)return;
    dragging=false;horizontal=false;resetSwipe(row);
  },{passive:true});
}
function bindAllSwipes(){
  document.querySelectorAll('.swipeRow').forEach(bindSwipe);
}
window.addEventListener('online',()=>refresh(true));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh(true)});
if('serviceWorker'in navigator){
  navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(r=>r.update()).catch(()=>{});
}
ingestHash();
items=cached();
render();
renderTrashBadge();
if(token)refresh();
setInterval(()=>{if(!document.hidden)refresh(true)},5000);