(() => {
  "use strict";
  const API = "https://cqtwmxojwwyeasstuhgb.supabase.co/functions/v1/script-api";
  const $ = (s, r=document) => r.querySelector(s);
  const esc = v => String(v ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
  let challenge = null, timer = null, seconds = 0;
  function openKey(script = "") {
    const modal = $("#keyGateBackdrop"); if (!modal) return;
    modal.hidden = false; document.body.classList.add("modal-open");
    $("#keyScript").value = script || $("#keyScript").value || "";
    $("#keyResult").hidden = true; $("#keyError").hidden = true;
    $("#keyGateStatus").textContent = "Choose a published script, then start verification.";
    $("#startKeyButton").disabled = false; $("#startKeyButton").textContent = "Start 20-second verification";
    clearInterval(timer); challenge = null;
    $("#keyScript").focus();
  }
  function closeKey(){ $("#keyGateBackdrop").hidden=true; document.body.classList.remove("modal-open"); clearInterval(timer); }
  async function start(){
    const slug=$("#keyScript").value.trim(); if(!slug){$("#keyError").textContent="Enter the script slug shown on its script card.";$("#keyError").hidden=false;return;}
    const btn=$("#startKeyButton");btn.disabled=true;btn.textContent="Starting…";$("#keyError").hidden=true;
    try{
      const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"start-key",script:slug})});
      const data=await r.json(); if(!r.ok)throw new Error(data.error||"Could not start verification.");
      challenge=data;seconds=Math.max(0,Math.ceil((Date.parse(data.ready_at)-Date.now())/1000));
      $("#keyGateStatus").textContent="Verification running. Please wait " + seconds + " seconds.";
      timer=setInterval(async()=>{seconds=Math.max(0,seconds-1);$("#keyGateStatus").textContent=seconds?"Verification running. Please wait "+seconds+" seconds.":"Verification complete — issuing your key…";if(seconds===0){clearInterval(timer);await claim();}},1000);
    }catch(e){btn.disabled=false;btn.textContent="Start 20-second verification";$("#keyError").textContent=e.message||"Could not start verification.";$("#keyError").hidden=false;}
  }
  async function claim(){
    if(!challenge)return; const btn=$("#startKeyButton");
    try{
      const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"claim-key",token:challenge.token,script:challenge.script})});
      const data=await r.json(); if(!r.ok)throw new Error(data.error||"Could not issue key.");
      $("#keyValue").value=data.key;$("#keyExpiryText").textContent="Valid for 24 hours and 1 successful load.";$("#keyResult").hidden=false;btn.textContent="Key issued";
    }catch(e){btn.disabled=false;btn.textContent="Try again";$("#keyError").textContent=e.message||"Could not issue key.";$("#keyError").hidden=false;}
  }
  async function copy(){const value=$("#keyValue").value;if(!value)return;try{await navigator.clipboard.writeText(value);$("#copyKeyButton").textContent="Copied ✓";setTimeout(()=>$("#copyKeyButton").textContent="Copy key",1500)}catch{window.prompt("Copy your Sunny key:",value)}}
  window.sunnyKeySystem={open:openKey,close:closeKey};
  document.addEventListener("DOMContentLoaded",()=>{
    $("#openKeySystem")?.addEventListener("click",()=>openKey());
    $("#closeKeySystem")?.addEventListener("click",closeKey);
    $("#keyGateBackdrop")?.addEventListener("click",e=>{if(e.target===$("#keyGateBackdrop"))closeKey()});
    $("#startKeyButton")?.addEventListener("click",start); $("#copyKeyButton")?.addEventListener("click",copy);
    $("#keyScript")?.addEventListener("input",()=>{$("#keyResult").hidden=true;$(' #keyError')?.setAttribute("hidden","")});
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("#keyGateBackdrop").hidden)closeKey()});
  });
})();
