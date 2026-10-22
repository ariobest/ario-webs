(() => {
  "use strict";
  const SUPABASE_URL = "https://cqtwmxojwwyeasstuhgb.supabase.co";
  const PUBLIC_KEY = "sb_publishable_qBPb1ltQbHNZ-fO3PFmDeg_IQj0QfNB";
  const esc = value => String(value ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
  const slugify = value => String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80) || "script";
  let issuedKey = "";
  let activeSlug = "";

  function makeLoader(slug, key = issuedKey || "PASTE_YOUR_ARIO_KEY_HERE") {
    const url = `${location.origin}/script/${encodeURIComponent(slug)}?key=${encodeURIComponent(key)}`;
    const api = "https://cqtwmxojwwyeasstuhgb.supabase.co/functions/v1/script-api";
    const lua = `local API = "${api}"
local KEY = "${key.replace(/\\/g,"\\\\").replace(/"/g,'\\"')}"
local SCRIPT = "${slug.replace(/\\/g,"\\\\").replace(/"/g,'\\"')}"
local function fail(message)
    warn("[VOID KEY SYSTEM] " .. message)
    return nil
end
if KEY == "PASTE_YOUR_ARIO_KEY_HERE" then
    return fail("WRONG KEY — paste the key you received from the website.")
end
local httpRequest = request or http_request or (syn and syn.request) or (fluxus and fluxus.request)
if type(httpRequest) ~= "function" then
    return fail("HTTP REQUEST NOT AVAILABLE IN THIS EXECUTOR.")
end
local HttpService = game:GetService("HttpService")
local ok, response = pcall(function()
    return httpRequest({
        Url = API, Method = "POST",
        Headers = { ["Content-Type"] = "application/json" },
        Body = HttpService:JSONEncode({ action = "validate", key = KEY, script = SCRIPT })
    })
end)
if not ok or type(response) ~= "table" then
    return fail("KEY SERVICE UNAVAILABLE — try again later.")
end
local data = {}
pcall(function() data = HttpService:JSONDecode(response.Body or response.body or "{}") end)
local status = tonumber(response.StatusCode or response.Status or response.status_code or 0)
if (status < 200 or status >= 300) or data.valid ~= true then
    local code = data.code or ""
    if code == "KEY_NOT_FOUND" or code == "" then return fail("WRONG KEY") end
    if code == "KEY_EXPIRED" then return fail("KEY EXPIRED") end
    if code == "KEY_REVOKED" then return fail("KEY REVOKED") end
    if code == "WRONG_SCRIPT" then return fail("KEY NOT AUTHORIZED FOR THIS SCRIPT") end
    if code == "SCRIPT_UNPUBLISHED" then return fail("SCRIPT IS NOT PUBLISHED") end
    if code == "KEY_LIMIT_REACHED" then return fail("KEY USAGE LIMIT REACHED") end
    return fail(data.error or "KEY VERIFICATION FAILED")
end
local loaded, sourceResponse = pcall(function()
    return httpRequest({
        Url = API .. "?action=load&script=" .. HttpService:UrlEncode(SCRIPT) .. "&key=" .. HttpService:UrlEncode(KEY),
        Method = "GET"
    })
end)
if not loaded or type(sourceResponse) ~= "table" then
    return fail("SCRIPT LOAD FAILED — key may have expired or been revoked.")
end
local loadStatus = tonumber(sourceResponse.StatusCode or sourceResponse.Status or sourceResponse.status_code or 0)
if loadStatus < 200 or loadStatus >= 300 then
    local errorData = {}
    pcall(function() errorData = HttpService:JSONDecode(sourceResponse.Body or sourceResponse.body or "{}") end)
    return fail(errorData.error or "SCRIPT LOAD FAILED — key may have expired or been revoked.")
end
local source = sourceResponse.Body or sourceResponse.body
if type(source) ~= "string" or source == "" then return fail("SCRIPT SOURCE IS EMPTY.") end
local compile, scriptFunction = pcall(loadstring, source)
if not compile or type(scriptFunction) ~= "function" then return fail("SCRIPT SOURCE COULD NOT BE COMPILED.") end
local ran, result = pcall(scriptFunction)
if not ran then warn("[VOID SCRIPT ERROR] " .. tostring(result)) end`;
    return { url, lua };
  }

  function injectStyles(){
    if(document.getElementById("arioProtectToolsStyle"))return;
    const s=document.createElement("style");s.id="arioProtectToolsStyle";s.textContent=`
      .ario-loader-box{margin:16px 0;padding:18px;border:1px solid rgba(127,153,190,.22);border-radius:18px;background:rgba(10,18,32,.72);box-shadow:0 14px 35px rgba(0,0,0,.14)}
      .ario-loader-box h4{margin:0 0 6px}.ario-loader-box p{margin:0 0 12px;color:var(--muted,#9aa9bd);font-size:.9rem}
      .ario-loader-box textarea,.ario-loader-box input{width:100%;box-sizing:border-box;font:inherit;border:1px solid rgba(127,153,190,.25);border-radius:12px;padding:11px;background:rgba(0,0,0,.2);color:inherit;margin:5px 0 9px}
      .ario-loader-actions{display:flex;gap:8px;flex-wrap:wrap}.ario-loader-actions button{border:0;border-radius:10px;padding:9px 12px;cursor:pointer;font-weight:700}
      .ario-loader-primary{background:var(--accent,#f5b942);color:#10131a}.ario-loader-copy{background:rgba(127,153,190,.14);color:inherit}
      .ario-loader-note{font-size:.78rem!important;margin-top:9px!important}
      .ario-code-interactive{transition:transform .28s ease,filter .28s ease;animation:arioCodeFloat 4.5s ease-in-out infinite;transform-origin:center}
      .ario-code-interactive:hover,.ario-code-interactive.ario-code-touch{transform:translateY(-7px) scale(1.015) rotate(-.5deg);filter:drop-shadow(0 18px 28px rgba(0,0,0,.2));animation-play-state:paused}
      .ario-code-interactive pre{position:relative;overflow:hidden}
      .ario-code-cursor{display:inline-block;width:7px;height:1em;margin-left:3px;vertical-align:-2px;background:currentColor;animation:arioCursor .75s steps(1) infinite}
      @keyframes arioCodeFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
      @keyframes arioCursor{50%{opacity:0}}
    `;document.head.appendChild(s);
  }

  function showLoaderBox(slug, name){
    injectStyles();
    const form=document.querySelector("#scriptForm"); if(!form)return;
    activeSlug=slug;
    let box=document.getElementById("arioLoaderBox");
    if(!box){box=document.createElement("div");box.id="arioLoaderBox";box.className="ario-loader-box";form.appendChild(box)}
    const generated=makeLoader(slug);
    box.innerHTML=`<h4>🛡️ Protected loader${name?` — ${esc(name)}`:""}</h4><p>Your script is protected by Sunny Dev. The loader uses a real Sunny key when one has been issued.</p><label>Script URL<input id="arioLoaderUrl" readonly></label><label>Lua loadstring<textarea id="arioLoaderCode" rows="3" readonly></textarea></label><div class="ario-loader-actions"><button type="button" class="ario-loader-primary" id="arioCopyLoader">Copy loadstring</button><button type="button" class="ario-loader-copy" id="arioCopyUrl">Copy URL</button></div><p class="ario-loader-note" id="arioLoaderNote">${issuedKey ? "Real Sunny key attached ✓" : "Get a Sunny key from the top bar to attach a real key automatically."}</p>`;
    box.querySelector("#arioLoaderUrl").value=generated.url;
    box.querySelector("#arioLoaderCode").value=generated.lua;
    box.querySelector("#arioCopyLoader").onclick=()=>navigator.clipboard?.writeText(box.querySelector("#arioLoaderCode").value).then(()=>box.querySelector("#arioCopyLoader").textContent="Copied ✓").catch(()=>window.prompt("Copy loadstring:",box.querySelector("#arioLoaderCode").value));
    box.querySelector("#arioCopyUrl").onclick=()=>navigator.clipboard?.writeText(box.querySelector("#arioLoaderUrl").value).then(()=>box.querySelector("#arioCopyUrl").textContent="Copied ✓").catch(()=>window.prompt("Copy URL:",box.querySelector("#arioLoaderUrl").value));
    box.scrollIntoView({behavior:"smooth",block:"center"});
  }

  async function findPublishedScript(name){
    try{
      const client=window.supabase?.createClient?.(SUPABASE_URL,PUBLIC_KEY); if(!client)return null;
      const {data,error}=await client.from("published_script_metadata").select("id,name,slug,created_at").eq("name",name).order("created_at",{ascending:false}).limit(1).maybeSingle();
      if(error)throw error; return data||null;
    }catch(error){console.warn("Sunny loader lookup failed",error);return null;}
  }

  function refreshLoaderWithKey(key){
    if(!key || !activeSlug)return;
    issuedKey=key;
    const generated=makeLoader(activeSlug,key);
    const url=document.querySelector("#arioLoaderUrl"), code=document.querySelector("#arioLoaderCode"), note=document.querySelector("#arioLoaderNote");
    if(url)url.value=generated.url;
    if(code)code.value=generated.lua;
    if(note)note.textContent="Real Sunny key attached ✓ — copy the loadstring.";
  }

  function bindCodePreview(){
    injectStyles();
    const win=document.querySelector(".code-window"); if(!win || win.dataset.arioInteractive)return;
    win.dataset.arioInteractive="1"; win.classList.add("ario-code-interactive");
    const code=win.querySelector("code"); if(!code)return;
    const original=code.textContent.trim(); let running=false;
    const type=()=>{
      if(running)return; running=true; win.classList.add("ario-code-touch"); code.textContent="";
      let i=0; const cursor=document.createElement("span"); cursor.className="ario-code-cursor"; code.appendChild(cursor);
      const tick=()=>{ if(i<original.length){cursor.before(document.createTextNode(original[i++]));setTimeout(tick,18)}else{running=false;setTimeout(()=>win.classList.remove("ario-code-touch"),350)} };
      tick();
    };
    win.addEventListener("mouseenter",type); win.addEventListener("touchstart",type,{passive:true});
  }

  function watch(){
    document.addEventListener("submit",async e=>{
      if(!e.target?.matches?.("#scriptForm"))return;
      const name=document.querySelector("#newScriptName")?.value.trim(); if(!name)return;
      let record=null;
      for(let i=0;i<8 && !record;i++){
        await new Promise(r=>setTimeout(r,i?700:1200));
        record=await findPublishedScript(name);
      }
      if(record?.slug)showLoaderBox(record.slug,record.name); else showLoaderBox(slugify(name),name);
    },true);
    window.addEventListener("ario:key-issued",e=>refreshLoaderWithKey(e.detail?.key),false);
    bindCodePreview();
    const observer=new MutationObserver(bindCodePreview); observer.observe(document.documentElement,{childList:true,subtree:true});
  }

  window.arioProtectedLoader={makeLoader,showLoaderBox};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",watch);else watch();
})();
