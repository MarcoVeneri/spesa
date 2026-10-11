(()=>{
  const rules=[
    {k:'latte',r:/\b(latte|milk)\b/i,e:'🥛'},
    {k:'pane',r:/\b(pane|panino|baguette|bread)\b/i,e:'🥖'},
    {k:'pasta',r:/\b(pasta|spaghetti|penne|fusilli)\b/i,e:'🍝'},
    {k:'pomodori',r:/\b(pomodori?|tomato|passata)\b/i,e:'🍅'},
    {k:'formaggio',r:/\b(formaggio|parmigiano|grana|pecorino|mozzarella)\b/i,e:'🧀'},
    {k:'uova',r:/\b(uova|uovo|eggs?)\b/i,e:'🥚'},
    {k:'carta',r:/\b(carta igienica|scottex|rotoli|carta casa)\b/i,e:'🧻'},
    {k:'detersivo',r:/\b(detersivo|detergente|ammorbidente|sapone)\b/i,e:'🧴'},
    {k:'acqua',r:/\b(acqua|water)\b/i,e:'💧'},
    {k:'caffe',r:/\b(caff[eè]|coffee)\b/i,e:'☕'},
    {k:'frutta',r:/\b(mela|mele|banana|banane|arancia|arance|frutta)\b/i,e:'🍎'},
    {k:'verdura',r:/\b(zucchine?|carote?|insalata|verdura|cipolle?)\b/i,e:'🥬'},
    {k:'carne',r:/\b(carne|pollo|bistecca|hamburger|macinato)\b/i,e:'🥩'},
    {k:'pesce',r:/\b(pesce|tonno|salmone|merluzzo)\b/i,e:'🐟'}
  ];

  function decorate(){
    document.querySelectorAll('.swipeRow').forEach(row=>{
      const name=row.querySelector('.itemName');
      const item=row.querySelector('.item');
      if(!name||!item)return;
      const text=name.textContent.trim();
      const hit=rules.find(x=>x.r.test(text))||{k:'altro',e:'🛒'};
      if(row.dataset.kind!==hit.k)row.dataset.kind=hit.k;
      let art=item.querySelector('.productArt');
      if(!art){
        art=document.createElement('span');
        art.className='productArt';
        item.insertBefore(art,name);
      }
      if(art.textContent!==hit.e)art.textContent=hit.e;
    });
  }

  const content=document.getElementById('content');
  if(content){
    let scheduled=false;
    const run=()=>{
      if(scheduled)return;
      scheduled=true;
      requestAnimationFrame(()=>{
        scheduled=false;
        decorate();
      });
    };
    new MutationObserver(run).observe(content,{childList:true});
    run();
  }
})();