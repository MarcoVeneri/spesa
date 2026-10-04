(()=>{
"use strict";
const btn=document.querySelector("#todoBtn");
if(!btn)return;
btn.addEventListener("click",()=>{
  const token=(localStorage.getItem("spesa_shared_token")||"").trim();
  if(token){
    try{localStorage.setItem("todo_shared_token",token)}catch(e){}
  }
  location.href=location.origin+"/To-Do/";
});
})();