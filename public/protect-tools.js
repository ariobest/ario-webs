(() => {
  "use strict";
  const API = "https://cqtwmxojwwyeasstuhgb.supabase.co/functions/v1/script-api";
  const SUPABASE_URL = "https://cqtwmxojwwyeasstuhgb.supabase.co";
  const PUBLIC_KEY = "sb_publishable_qBPb1ltQbHNZ-fO3PFmDeg_IQj0QfNB";
  const esc = value => String(value ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
  const slugify = value => String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80) || "script";
  function makeLoader(slug, key = "PASTE_YOUR_SUNNY_KEY_HERE") {
    const url = `${location.origin}/script/${encodeURIComponent(slug)}?key=${encodeURIComponent(key)}`;
    return { url, lua: `loadstring(game:HttpGet("${url}"))()` };
  }
  function injectStyles(){
    if(document.getElementById("sunnyProtectToolsStyle"))return;
    const s=document.createElement("style");s.id="sunnyProtectToolsStyle";s.textContent=`
      .sunny-loader-box{margin:16px 0;padding:18px;border:1px solid rgba(127,153,190,.22);border-radius:18px;background:rgba(10,18,32,.72);box-shadow:0 14px 35px rgba(0,0,0,.14)}
      .sunny-loader-box h4{margin:0 0 6px}.sunny-loader-box p{margin:0 0 12px;color:var(--muted,#9aa9bd);font-size:.9rem}
      .sunny-loader-box textarea,.sunny-loader-box input{width:100%;box-sizing:border-box;font:inherit;border:1px solid rgba(127,153,190,.25);border-radius:12px;padding:11px;background:rgba(0,0,0,.2);color:inherit;margin:5px 0 9px}
      .sunny-loader-actions{display:flex;gap:8px;flex-wrap:wrap}.sunny-loader-actions button{border:0;border-radius:10px;padding:9px 12px;cursor:pointer;font-weight:700}
      .sunny-loader-primary{background:var(--accent,#f5b942);color:#10131a}.sunny-loader-copy{background:rgba(127,153,190,.14);color:inherit}
      .sunny-loader-note{font-size:.78rem!important;margin-top:9px!important}
    `;document.head.appendChild(s);
  }
  function showLoaderBox(slug, name){
    injectStyles();
    const form=document.querySelector("#scriptForm"); if(!form)return;
    let box=document.getElementById("sunnyLoaderBox");
    if(!box){box=document.createElement("div");box.id="sunnyLoaderBox";box.className="sunny-loader-box";form.appendChild(box)}
    const generated=makeLoader(slug);
    box.innerHTML=`<h4>🛡️ Protected loader${name?` — ${esc(name)}`:""}</h4><p>Your script is protected by Sunny Dev. Give users a Sunny key, then use the key in the loader below.</p><label>Script URL<input id="sunnyLoaderUrl" readonly></label><label>Lua loadstring<textarea id="sunnyLoaderCode" rows="3" readonly></textarea></label><div class="sunny-loader-actions"><button type="button" class="sunny-loader-primary" id="sunnyCopyLoader">Copy loadstring</button><button type="button" class="sunny-loader-copy" id="sunnyCopyUrl">Copy URL</button></div><p class="sunny-loader-note">Replace <b>PASTE_YOUR_SUNNY_KEY_HERE</b> with a generated SUNNY key. Keys are checked by the server before the script is delivered.</p>`;
    box.querySelector("#sunnyLoaderUrl").value=generated.url;
    box.querySelector("#sunnyLoaderCode").value=generated.lua;
    box.querySelector("#sunnyCopyLoader").onclick=()=>navigator.clipboard?.writeText(box.querySelector("#sunnyLoaderCode").value).then(()=>box.querySelector("#sunnyCopyLoader").textContent="Copied ✓").catch(()=>window.prompt("Copy loadstring:",box.querySelector("#sunnyLoaderCode").value));
    box.querySelector("#sunnyCopyUrl").onclick=()=>navigator.clipboard?.writeText(box.querySelector("#sunnyLoaderUrl").value).then(()=>box.querySelector("#sunnyCopyUrl").textContent="Copied ✓").catch(()=>window.prompt("Copy URL:",box.querySelector("#sunnyLoaderUrl").value));
    box.scrollIntoView({behavior:"smooth",block:"center"});
  }
  async function findPublishedScript(name){
    try{
      const client=window.supabase?.createClient?.(SUPABASE_URL,PUBLIC_KEY); if(!client)return null;
      const {data,error}=await client.from("published_script_metadata").select("id,name,slug,created_at").eq("name",name).order("created_at",{ascending:false}).limit(1).maybeSingle();
      if(error)throw error; return data||null;
    }catch(error){console.warn("Sunny loader lookup failed",error);return null;}
  }
  function watch(){
    const form=document.querySelector("#scriptForm"); if(!form)return;
    form.addEventListener("submit",async()=>{
      const name=document.querySelector("#newScriptName")?.value.trim(); if(!name)return;
      setTimeout(async()=>{
        const record=await findPublishedScript(name);
        if(record?.slug) showLoaderBox(record.slug,record.name);
        else { const slug=slugify(name); showLoaderBox(slug,name); }
      },1800);
    });
  }
  window.sunnyProtectedLoader={makeLoader,showLoaderBox};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",watch);else watch();
})();
