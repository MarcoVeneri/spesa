(()=>{
  document.addEventListener('click',e=>{
    const btn=e.target.closest('.deleteAction');
    if(!btn)return;
    const row=btn.closest('.swipeRow');
    if(!row)return;
    e.preventDefault();
    e.stopPropagation();
    if(typeof del==='function') del(row.dataset.id,row);
  },true);
})();
