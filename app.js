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
    '<button class="deleteAction" type="button" aria-label="Elimina '+esc(x.name)+'">Elimina</button>'+
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
let audioCtx=null;
function showDoneOverlay(){
  const o=$('#doneOverlay');
  if(!o)return;
  o.classList.remove('show');
  void o.offsetWidth;
  o.classList.add('show');
}
function emitTick(){
  try{
    if(!audioCtx||audioCtx.state!=='running')return;
    const now=audioCtx.currentTime;
    const osc=audioCtx.createOscillator();
    const gain=audioCtx.createGain();
    osc.type='triangle';
    osc.frequency.setValueAtTime(1350,now);
    osc.frequency.exponentialRampToValueAtTime(820,now+.055);
    gain.gain.setValueAtTime(.0001,now);
    gain.gain.exponentialRampToValueAtTime(.11,now+.005);
    gain.gain.exponentialRampToValueAtTime(.0001,now+.07);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now+.075);
  }catch{}
}
function feedback(){
  showDoneOverlay();
  try{
    if(typeof navigator.vibrate==='function') navigator.vibrate(8);
  }catch{}
  try{
    const Ctx=window.AudioContext||window.webkitAudioContext;
    if(!Ctx)return;
    if(!audioCtx) audioCtx=new Ctx();
    if(audioCtx.state==='suspended'){
      audioCtx.resume().then(emitTick).catch(()=>{});
    }else{
      emitTick();
    }
  }catch{}
}
async function del(id,el){
  if(!id||!el||el.classList.contains('removing'))return;
  const previous=items.slice();
  const removed=items.find(x=>x.id===id);
  feedback();
  el.classList.add('removing');
  await new Promise(resolve=>setTimeout(resolve,320));
  items=items.filter(x=>x.id!==id);
  render();
  localStorage.setItem(LS_CACHE,JSON.stringify(items));
  try{
    await rpc('shopping_delete_item',{p_token:token,p_item_id:id});
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
let openSwipe=null;
const SWIPE_OPEN=92;
function closeSwipe(row,animate=true){
  if(!row)return;
  const item=row.querySelector('.item');
  if(!item)return;
  item.style.transition=animate?'transform .22s cubic-bezier(.22,.8,.32,1)':'none';
  item.style.transform='translateX(0px)';
  row.classList.remove('open','dragging');
  if(openSwipe===row)openSwipe=null;
}
function openSwipeRow(row){
  if(openSwipe&&openSwipe!==row)closeSwipe(openSwipe);
  const item=row.querySelector('.item');
  if(!item)return;
  item.style.transition='transform .22s cubic-bezier(.22,.8,.32,1)';
  item.style.transform='translateX(-'+SWIPE_OPEN+'px)';
  row.classList.remove('dragging');
  row.classList.add('open');
  openSwipe=row;
}
function bindSwipe(row){
  const item=row.querySelector('.item');
  if(!item)return;
  let sx=0,sy=0,startOffset=0,dx=0,dragging=false,horizontal=false;
  item.addEventListener('touchstart',e=>{
    const t=e.touches[0];
    sx=t.clientX;sy=t.clientY;dx=0;dragging=true;horizontal=false;
    startOffset=row.classList.contains('open')?-SWIPE_OPEN:0;
    item.style.transition='none';
    if(openSwipe&&openSwipe!==row)closeSwipe(openSwipe);
  },{passive:true});
  item.addEventListener('touchmove',e=>{
    if(!dragging)return;
    const t=e.touches[0],mx=t.clientX-sx,my=t.clientY-sy;
    if(!horizontal){
      if(Math.abs(mx)<6)return;
      if(Math.abs(my)>Math.abs(mx)){dragging=false;return}
      horizontal=true;
    }
    e.preventDefault();
    dx=mx;
    row.classList.add('dragging');
    let x=startOffset+mx;
    x=Math.min(0,Math.max(-Math.max(220,row.clientWidth*.72),x));
    item.style.transform='translateX('+x+'px)';
  },{passive:false});
  item.addEventListener('touchend',()=>{
    if(!horizontal){dragging=false;item.style.transition='';return}
    dragging=false;
    const current=startOffset+dx;
    const fullThreshold=-Math.max(120,row.clientWidth*.50);
    if(current<=fullThreshold){
      row.classList.remove('dragging');
      row.classList.add('open');
      item.style.transition='transform .18s ease';
      item.style.transform='translateX(-100%)';
      setTimeout(()=>del(row.dataset.id,row),150);
      return;
    }
    if(current<=-46){openSwipeRow(row)}
    else closeSwipe(row);
  },{passive:true});
  item.addEventListener('touchcancel',()=>{dragging=false;closeSwipe(row)},{passive:true});
}
function bindAllSwipes(){
  document.querySelectorAll('.swipeRow').forEach(bindSwipe);
}
$('#content').addEventListener('click',e=>{
  const delBtn=e.target.closest('.deleteAction');
  if(delBtn){
    const row=delBtn.closest('.swipeRow');
    if(row)del(row.dataset.id,row);
    return;
  }
  const row=e.target.closest('.swipeRow');
  if(row&&row.classList.contains('open'))closeSwipe(row);
});
document.addEventListener('touchstart',e=>{
  if(openSwipe&&!e.target.closest('.swipeRow'))closeSwipe(openSwipe);
},{passive:true});
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