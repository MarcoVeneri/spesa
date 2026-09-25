const API='https://nlhxjpartgvplythgzrz.supabase.co';
const KEY='sb_publishable_uA9EbSMwJ5oFraqP-r5njg_EXtLSjEH';
const LS_TOKEN='spesa_shared_token',LS_CACHE='spesa_items_cache';
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
function row(x){
  return '<div class="item" data-id="'+x.id+'" role="button" tabindex="0" aria-label="Elimina '+esc(x.name)+'">'+
    '<div class="itemName">'+esc(x.name)+'</div>'+
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
function feedback(){
  try{
    if(typeof navigator.vibrate==='function') navigator.vibrate(8);
  }catch{}
  try{
    const Ctx=window.AudioContext||window.webkitAudioContext;
    if(!Ctx)return;
    if(!audioCtx) audioCtx=new Ctx();
    if(audioCtx.state==='suspended') audioCtx.resume();
    const now=audioCtx.currentTime;
    const osc=audioCtx.createOscillator();
    const gain=audioCtx.createGain();
    osc.type='sine';
    osc.frequency.setValueAtTime(980,now);
    osc.frequency.exponentialRampToValueAtTime(720,now+.032);
    gain.gain.setValueAtTime(.0001,now);
    gain.gain.exponentialRampToValueAtTime(.055,now+.004);
    gain.gain.exponentialRampToValueAtTime(.0001,now+.038);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now+.042);
  }catch{}
}
async function del(id,el){
  if(!id||!el||el.classList.contains('removing'))return;
  const previous=items.slice();
  feedback();
  el.classList.add('removing');
  await new Promise(resolve=>setTimeout(resolve,320));
  items=items.filter(x=>x.id!==id);
  render();
  localStorage.setItem(LS_CACHE,JSON.stringify(items));
  try{
    await rpc('shopping_delete_item',{p_token:token,p_item_id:id});
  }catch{
    items=previous;
    render();
    localStorage.setItem(LS_CACHE,JSON.stringify(items));
    toast('Eliminazione non salvata');
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
$('#content').addEventListener('click',e=>{
  const item=e.target.closest('.item');
  if(item)del(item.dataset.id,item);
});
$('#content').addEventListener('keydown',e=>{
  if(e.key==='Enter'||e.key===' '){
    const item=e.target.closest('.item');
    if(item){e.preventDefault();del(item.dataset.id,item)}
  }
});
window.addEventListener('online',()=>refresh(true));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh(true)});
if('serviceWorker'in navigator){
  navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(r=>r.update()).catch(()=>{});
}
ingestHash();
items=cached();
render();
if(token)refresh();
setInterval(()=>{if(!document.hidden)refresh(true)},5000);