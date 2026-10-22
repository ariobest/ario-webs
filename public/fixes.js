(() => {
  "use strict";
  const SUPABASE_URL = "https://cqtwmxojwwyeasstuhgb.supabase.co";
  const PUBLIC_KEY = "sb_publishable_qBPb1ltQbHNZ-fO3PFmDeg_IQj0QfNB";
  const API_URL = SUPABASE_URL + "/functions/v1/script-api";
  const $ = (s, root=document) => root.querySelector(s);
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let client = null, adminScripts = [], keyBusy = false;
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function api(body, token) {
    const response = await fetch(API_URL, {method:"POST", headers:{"Content-Type":"application/json","apikey":PUBLIC_KEY,...(token?{Authorization:"Bearer "+token}:{})}, body:JSON.stringify(body), cache:"no-store"});
    let data; try { data = await response.json(); } catch { throw new Error("The key service returned an unreadable response."); }
    if (!response.ok || data.error) throw new Error(data.error || ("Request failed ("+response.status+")."));
    return data;
  }
  function clientId() {
    let id = "";
    try { id = localStorage.getItem("void.key-client.v1") || ""; } catch {}
    if (!/^[a-f0-9]{48}$/i.test(id)) {
      const bytes = new Uint8Array(24);
      crypto.getRandomValues(bytes);
      id = Array.from(bytes, b => b.toString(16).padStart(2,"0")).join("");
      try { localStorage.setItem("void.key-client.v1", id); } catch {}
    }
    return id;
  }
  function keyDialog(slug) {
    let modal = $("#voidKeyBackdrop");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "voidKeyBackdrop"; modal.className = "modal-backdrop void-key-backdrop";
      modal.innerHTML = '<section class="void-key-modal" role="dialog" aria-modal="true" aria-labelledby="voidKeyTitle"><button type="button" class="icon-button void-key-close" aria-label="Close key dialog">×</button><span class="eyebrow">VOID DEVELOPMENT / ACCESS</span><h2 id="voidKeyTitle">Get your script key</h2><p id="voidKeyDescription">We’ll verify the request and issue a temporary access key.</p><div class="void-key-progress" id="voidKeyProgress" hidden><span class="void-key-spinner"></span><span id="voidKeyProgressText">Preparing secure key request…</span></div><div id="voidKeyResult" hidden><label for="voidKeyValue">Your access key</label><div class="void-key-value-row"><input id="voidKeyValue" readonly spellcheck="false"><button type="button" class="small-primary" id="voidCopyKey">Copy</button></div><p class="saved-note" id="voidKeyExpiry"></p><button type="button" class="secondary small" id="voidKeyDone">Done</button></div><p id="voidKeyError" class="saved-note" role="status" hidden></p><button type="button" class="small-primary" id="voidStartKey">Generate access key ↗</button></section>';
      document.body.append(modal);
      const close = () => { modal.hidden = true; document.body.classList.remove("modal-open"); };
      $(".void-key-close", modal).addEventListener("click", close);
      $("#voidKeyDone", modal).addEventListener("click", close);
      modal.addEventListener("click", e => { if (e.target === modal) close(); });
      document.addEventListener("keydown", e => { if (e.key === "Escape" && !modal.hidden) close(); });
      $("#voidCopyKey", modal).addEventListener("click", async () => {
        const field = $("#voidKeyValue", modal);
        try { await navigator.clipboard.writeText(field.value); $("#voidCopyKey", modal).textContent = "Copied ✓"; }
        catch { field.focus(); field.select(); document.execCommand("copy"); $("#voidCopyKey", modal).textContent = "Select / copy"; }
      });
      $("#voidStartKey", modal).addEventListener("click", () => runKeyFlow(modal.dataset.slug || ""));
    }
    modal.dataset.slug = slug || "";
    $("#voidKeyDescription", modal).textContent = slug ? "Requesting access for “" + slug + "”. One key can be issued per device each day." : "We’ll choose the first available published script and issue a temporary access key.";
    $("#voidKeyProgress", modal).hidden = true; $("#voidKeyResult", modal).hidden = true; $("#voidKeyError", modal).hidden = true;
    $("#voidStartKey", modal).hidden = false; $("#voidStartKey", modal).disabled = false; $("#voidStartKey", modal).textContent = "Generate access key ↗";
    modal.hidden = false; document.body.classList.add("modal-open");
  }
  async function runKeyFlow(slug) {
    if (keyBusy) return;
    keyBusy = true;
    const modal = $("#voidKeyBackdrop"), start = $("#voidStartKey"), progress = $("#voidKeyProgress"), label = $("#voidKeyProgressText"), error = $("#voidKeyError"), result = $("#voidKeyResult");
    start.disabled = true; start.hidden = true; error.hidden = true; result.hidden = true; progress.hidden = false;
    try {
      label.textContent = "Preparing secure key request…";
      const started = await api({action:"start-key",script:slug || undefined,client_id:clientId()});
      const seconds = Math.max(1, Math.min(8, Number(started.wait_seconds) || 3));
      for (let remaining = seconds; remaining > 0; remaining--) { label.textContent = "Verifying request… " + remaining; await sleep(1000); }
      label.textContent = "Issuing your access key…";
      const issued = await api({action:"claim-key",script:started.script || slug,token:started.token,client_id:clientId()});
      $("#voidKeyValue", modal).value = issued.key;
      $("#voidKeyExpiry", modal).textContent = issued.expires_at ? "Expires " + new Date(issued.expires_at).toLocaleString() + ". Keep this key private." : "Keep this key private. It is linked to the selected script.";
      result.hidden = false; progress.hidden = true; $("#voidCopyKey", modal).textContent = "Copy";
    } catch (e) {
      progress.hidden = true; error.hidden = false; error.dataset.state = "error";
      error.textContent = e?.message || "Could not generate a key. Please try again.";
      start.hidden = false; start.disabled = false; start.textContent = "Try again";
    } finally { keyBusy = false; }
  }
  document.addEventListener("click", e => {
    const button = e.target.closest("[data-copy-loader]");
    if (!button) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    keyDialog(button.dataset.copyLoader || "");
  }, true);

  function installSideNav() {
    const nav = $(".nav");
    if (!nav || $("#voidSideNavToggle")) return;
    const toggle=document.createElement("button"); toggle.id="voidSideNavToggle";toggle.className="void-side-toggle is-visible";toggle.type="button";
    toggle.setAttribute("aria-label","Open site navigation");toggle.setAttribute("aria-expanded","false");toggle.setAttribute("aria-controls","voidSideNav");
    toggle.innerHTML='<span></span><span></span><span></span>';
    const shade=document.createElement("button");shade.type="button";shade.className="void-side-shade";shade.setAttribute("aria-label","Close navigation");shade.tabIndex=-1;
    const drawer=document.createElement("aside");drawer.id="voidSideNav";drawer.className="void-side-drawer";drawer.setAttribute("aria-label","Site navigation");drawer.setAttribute("role","dialog");drawer.setAttribute("aria-modal","true");
    const logo=nav.querySelector(".brand-logo")?.getAttribute("src")||document.querySelector(".hero-brand-mark img")?.getAttribute("src")||"";
    drawer.innerHTML='<div class="void-drawer-head"><img src="'+esc(logo)+'" alt="VOID DEVELOPMENT logo"><div><b>VOID DEVELOPMENT</b><small>Creator workspace</small></div><button type="button" class="icon-button" id="voidDrawerClose" aria-label="Close navigation">×</button></div><div class="void-drawer-section"><small>EXPLORE</small><nav class="void-drawer-links" id="voidDrawerPublic" aria-label="Public pages"></nav></div><div class="void-drawer-section"><small>ACCOUNT</small><div class="void-drawer-links" id="voidDrawerAccount"></div></div><div class="void-drawer-section" id="voidDrawerAdminSection" hidden><small>ADMINISTRATION</small><div class="void-drawer-links" id="voidDrawerAdminLinks"></div></div><p class="void-drawer-foot">BLACK VOID · WHITE SPOTLIGHT</p>';
    document.body.append(shade,drawer,toggle);
    const close=()=>{drawer.classList.remove("open");shade.classList.remove("open");toggle.setAttribute("aria-expanded","false");document.body.classList.remove("void-drawer-open");};
    const open=()=>{drawer.classList.add("open");shade.classList.add("open");toggle.setAttribute("aria-expanded","true");document.body.classList.add("void-drawer-open");$("#voidDrawerClose")?.focus({preventScroll:true});};
    const makeLink=(label,icon,action)=>{const b=document.createElement("button");b.type="button";b.className="void-drawer-link";b.innerHTML='<span class="void-drawer-icon" aria-hidden="true">'+esc(icon)+'</span><span>'+esc(label)+'</span>';b.addEventListener("click",()=>{close();action();});return b;};
    const publicHost=$("#voidDrawerPublic"),sources=[...nav.querySelectorAll("[data-view]")];
    sources.forEach(source=>{const label=(source.textContent||"").replace(/\\s+/g," ").trim(),icon=source.querySelector("span")?.textContent?.trim()||"•";publicHost.append(makeLink(label,icon,()=>{source.click();const target=source.dataset.view==="scripts"?"#scripts":source.dataset.view==="themes"?"#themes":source.dataset.view==="about"?"#about":null;if(target&&$(target))$(target).scrollIntoView({behavior:"smooth",block:"start"});else window.scrollTo({top:0,behavior:"smooth"});}));});
    $("#voidDrawerAccount").append(makeLink("Toggle appearance","◐",()=>$("#themeQuick")?.click()));
    $("#voidDrawerAccount").append(makeLink("Sign in / account","↗",()=>{const p=$("#openProfile"),auth=$("#openAuth");if(p&&!p.hidden)p.click();else auth?.click();}));
    const adminSection=$("#voidDrawerAdminSection"),adminLinks=$("#voidDrawerAdminLinks");
    adminLinks.append(makeLink("Admin panel","⚙",()=>$("#openAdmin")?.click()));
    adminLinks.append(makeLink("Manage scripts","⌘",()=>{$("#openAdmin")?.click();setTimeout(()=>$('#adminTabs [data-admin-tab="scripts"]')?.click(),150);}));
    const syncAdmin=async session=>{let allowed=false;if(session?.user&&client){try{const {data,error}=await client.from("user_roles").select("role").eq("user_id",session.user.id).eq("role","admin").maybeSingle();allowed=!error&&Boolean(data);}catch{allowed=false;}}adminSection.hidden=!allowed;if($("#openAdmin"))$("#openAdmin").hidden=!allowed;if($("#openAdminFooter"))$("#openAdminFooter").hidden=!allowed;};
    const updateScroll=()=>{nav.classList.toggle("void-nav-hidden",window.scrollY>80);toggle.classList.add("is-visible");};
    window.addEventListener("scroll",updateScroll,{passive:true});updateScroll();
    toggle.addEventListener("click",()=>drawer.classList.contains("open")?close():open());shade.addEventListener("click",close);$("#voidDrawerClose").addEventListener("click",close);
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&drawer.classList.contains("open")){close();toggle.focus({preventScroll:true});}});
    document.addEventListener("click",e=>{if(drawer.classList.contains("open")&&!drawer.contains(e.target)&&!toggle.contains(e.target)&&!shade.contains(e.target))close();});
    if(window.supabase?.createClient){try{if(!client)client=window.supabase.createClient(SUPABASE_URL,PUBLIC_KEY);client.auth.getSession().then(({data})=>syncAdmin(data?.session)).catch(()=>syncAdmin(null));client.auth.onAuthStateChange((_event,session)=>setTimeout(()=>syncAdmin(session),0));}catch(e){console.warn("VOID navigation permission check failed",e);}}
  }

  async function requireAdmin() {
    if (!client) throw new Error("Supabase client did not load. Refresh the page and try again.");
    const {data:sessionData,error:sessionError} = await client.auth.getSession();
    const session = sessionData?.session;
    if (sessionError || !session?.user || !session.access_token) throw new Error("Sign in with your administrator account first.");
    const {data:role,error:roleError} = await client.from("user_roles").select("role").eq("user_id",session.user.id).eq("role","admin").maybeSingle();
    if (roleError || !role) throw new Error("Administrator access required.");
    return {session,user:session.user};
  }
  const adminFields = ["name","slug","category","description","link","content","status","release_status","banner_url","showcase_url"];
  function renderAdminRows() {
    const host = $("#adminScriptList"); if (!host) return;
    host.dataset.adminDatabaseLoaded = "true";
    host.innerHTML = adminScripts.length ? adminScripts.map(s => '<div class="admin-script-row"><div class="admin-script-symbol">⌘</div><div class="admin-script-info"><b>'+esc(s.name)+'</b><small>'+esc(s.slug)+' · '+esc(s.status)+' · '+esc(s.category)+'</small></div><button type="button" class="text-action" data-void-edit="'+esc(s.id)+'">Edit</button><button type="button" class="text-action danger" data-void-delete="'+esc(s.id)+'">Delete</button></div>').join("") : '<p class="empty-state">No scripts found in Supabase.</p>';
  }
  async function refreshAdminScripts() {
    const host = $("#adminScriptList"); if (!host) return;
    host.dataset.adminDatabaseLoaded = "false"; host.innerHTML = '<p class="saved-note">Loading scripts from Supabase…</p>';
    try {
      await requireAdmin();
      const {data,error} = await client.from("scripts").select("id,owner_id,name,slug,category,description,link,content,status,release_status,banner_url,showcase_url,created_at").order("created_at",{ascending:false});
      if (error) throw error;
      adminScripts = data || []; renderAdminRows();
      const status = $("#adminOverviewStatus"); if (status) status.textContent = "Connected — "+adminScripts.length+" script records loaded from Supabase.";
      const total=$("#overviewTotalScripts"), published=$("#overviewPublishedScripts"), drafts=$("#overviewDraftScripts");
      if(total) total.textContent=adminScripts.length;
      if(published) published.textContent=adminScripts.filter(s=>s.status==="published").length;
      if(drafts) drafts.textContent=adminScripts.filter(s=>s.status==="draft").length;
    } catch (e) {
      host.dataset.adminDatabaseLoaded = "false";
      host.innerHTML = '<p class="saved-note" data-state="error">'+esc(e.message || "Could not load scripts.")+'</p>';
      const status=$("#adminOverviewStatus"); if(status){status.textContent=e.message||"Could not load scripts.";status.dataset.state="error";}
    }
  }
  function fillScriptForm(s) {
    $("#editScriptId").value=s?.id||"";
    $("#newScriptName").value=s?.name||"";
    $("#newScriptSlug").value=s?.slug||"";
    $("#newScriptCategory").value=s?.category||"Utility";
    $("#newScriptStatus").value=s?.status||"draft";
    $("#newScriptReleaseStatus").value=s?.release_status||"active";
    $("#newScriptBannerUrl").value=s?.banner_url||"";
    $("#newScriptShowcaseUrl").value=s?.showcase_url||"";
    $("#newScriptDescription").value=s?.description||"";
    $("#newScriptContent").value=s?.content||"";
    $("#newScriptLink").value=s?.link||"";
    $("#scriptFormTitle").textContent=s?"Edit script":"Add a script";
    $("#scriptForm").hidden=false;
    $("#scriptForm").scrollIntoView({behavior:"smooth",block:"nearest"});
    $("#newScriptName").focus();
    $("#sourceCharCount").textContent=($("#newScriptContent").value||"").length+" characters";
  }
  async function saveScript(e) {
    e.preventDefault();
    try {
      const {user} = await requireAdmin();
      const record = {
        name:$("#newScriptName").value.trim(),
        slug:$("#newScriptSlug").value.trim(),
        category:$("#newScriptCategory").value,
        description:$("#newScriptDescription").value.trim(),
        link:$("#newScriptLink").value.trim()||null,
        content:$("#newScriptContent").value,
        status:$("#newScriptStatus").value,
        release_status:$("#newScriptReleaseStatus").value,
        banner_url:$("#newScriptBannerUrl").value.trim()||null,
        showcase_url:$("#newScriptShowcaseUrl").value.trim()||null,
        updated_at:new Date().toISOString()
      };
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.slug)) throw new Error("Use a lowercase slug with words separated by hyphens.");
      if (!record.content.trim()) throw new Error("Paste the script source before saving.");
      const id=$("#editScriptId").value;
      const result = id
        ? await client.from("scripts").update(record).eq("id",id).select("id").maybeSingle()
        : await client.from("scripts").insert({...record,owner_id:user.id}).select("id").maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) throw new Error("No script was saved. Check administrator database permissions.");
      $("#scriptForm").hidden=true;
      const status=$("#adminOverviewStatus"); if(status){status.textContent="Script saved to Supabase successfully.";status.dataset.state="ok";}
      await refreshAdminScripts();
      await client.from("published_script_metadata").select("id").limit(1);
      window.location.reload();
    } catch(e2) {
      const status=$("#adminOverviewStatus"); if(status){status.hidden=false;status.textContent=e2.message||"Could not save script.";status.dataset.state="error";}
      const form=$("#scriptForm"); let note=$("#voidScriptSaveStatus");
      if(!note){note=document.createElement("p");note.id="voidScriptSaveStatus";note.className="saved-note";form.append(note);}
      note.textContent=e2.message||"Could not save script.";note.dataset.state="error";
    }
  }
  async function deleteScript(id) {
    const s=adminScripts.find(x=>x.id===id); if(!s||!confirm("Delete “"+s.name+"” from the database? This cannot be undone.")) return;
    try {
      await requireAdmin();
      const {error} = await client.from("scripts").delete().eq("id",id);
      if(error) throw error;
      await refreshAdminScripts();
    } catch(e) { alert(e.message || "Could not delete script. It may have related keys or activity records."); }
  }

  async function refreshKeyList() {
    const host=$("#keyList"); if(!host)return;
    host.innerHTML='<p class="saved-note">Loading access keys…</p>';
    try {
      const {session}=await requireAdmin();
      const data=await api({action:"list-keys"},session.access_token);
      host.innerHTML=(data.keys||[]).length?(data.keys||[]).map(k=>'<article class="key-list-row"><div><b>'+esc(k.key_prefix||"VOID-•••")+'</b><small>'+esc(k.label||"Access key")+' · '+esc(k.scripts?.name||k.scripts?.slug||"Script")+'</small><small>'+esc(k.revoked_at?"Revoked":k.expires_at?"Expires "+new Date(k.expires_at).toLocaleString():"No expiry")+' · '+esc(String(k.use_count||0))+'/'+esc(k.max_uses==null?"∞":String(k.max_uses))+' uses</small></div>'+(!k.revoked_at?'<button type="button" class="text-action danger" data-void-revoke-key="'+esc(k.id)+'">Revoke</button>':'<span class="saved-note">Revoked</span>')+'</article>').join(""):'<p class="empty-state">No access keys have been created yet.</p>';
      const status=$("#keyStatus");if(status){status.textContent="Loaded "+(data.keys||[]).length+" key records.";status.dataset.state="ok";}
    } catch(e) { host.innerHTML='<p class="saved-note" data-state="error">'+esc(e.message||"Could not load keys.")+'</p>'; }
  }
  async function createAdminKey(e) {
    e.preventDefault();
    const status=$("#keyStatus"),button=$("#createKeyBtn");
    try {
      const {session}=await requireAdmin();
      if(!$("#keyScriptId").value)throw new Error("Choose a published script first.");
      button.disabled=true;status.textContent="Creating key…";
      const data=await api({action:"create-key",script_id:$("#keyScriptId").value,label:$("#keyLabel").value.trim()||"Access key",expires_in_days:$("#keyExpiry").value||null,max_uses:$("#keyMaxUses").value||null},session.access_token);
      $("#newKeyResult").hidden=false;$("#newKeyValue").value=data.key;
      status.textContent="Key created. Copy it now; the full key is not stored for later display.";status.dataset.state="ok";
      await refreshKeyList();
    } catch(err) { status.hidden=false;status.textContent=err.message||"Could not create key.";status.dataset.state="error"; }
    finally {button.disabled=false;}
  }
  async function revokeAdminKey(id) {
    if(!confirm("Revoke this key now? It will no longer authorize script loading."))return;
    try {const {session}=await requireAdmin();await api({action:"revoke-key",id},session.access_token);await refreshKeyList();}
    catch(err){alert(err.message||"Could not revoke this key.");}
  }
  async function checkApiStatus() {
    const host=$("#apiStatus");if(!host)return;
    host.innerHTML='<span class="status-dot"></span><span>Checking API…</span>';
    try {const r=await fetch(API_URL+"?action=health",{cache:"no-store"});const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||"API did not respond successfully.");host.innerHTML='<span class="status-dot is-online"></span><span>Online · '+esc(d.service||"VOID Script API")+'</span>';}
    catch(err){host.innerHTML='<span class="status-dot is-offline"></span><span>Offline · '+esc(err.message||"API unavailable")+'</span>';}
  }
  async function verifyAdminKey() {
    const result=$("#verificationTestResult"),slug=$("#verificationScriptSlug")?.value,key=$("#verificationKeyInput")?.value.trim();
    if(!result)return;
    if(!slug||!key){result.textContent="Choose a published script and enter a key.";result.dataset.state="error";return;}
    result.textContent="Verifying key…";
    try {const d=await api({action:"validate",script:slug,key});result.textContent=d.valid?"Key is valid for "+(d.script?.name||slug)+".":"Key is invalid or expired.";result.dataset.state=d.valid?"ok":"error";}
    catch(err){result.textContent=err.message||"Key verification failed.";result.dataset.state="error";}
  }

  function installAdminFixes() {
    if (!client && window.supabase?.createClient) { try { client=window.supabase.createClient(SUPABASE_URL,PUBLIC_KEY); } catch {} }
    $("#scriptForm")?.addEventListener("submit", saveScript, true);
    $("#keyForm")?.addEventListener("submit", createAdminKey, true);
    $("#refreshKeys")?.addEventListener("click", refreshKeyList);
    $("#checkApiStatus")?.addEventListener("click", checkApiStatus);
    $("#testVerificationKey")?.addEventListener("click", verifyAdminKey);
    $("#copyNewKey")?.addEventListener("click", async () => {const field=$("#newKeyValue");try{await navigator.clipboard.writeText(field.value);$("#copyNewKey").textContent="Copied ✓";}catch{field.focus();field.select();document.execCommand("copy");}});
    $("#adminTabs")?.addEventListener("click", e => {if(e.target.closest('[data-admin-tab="keys"]'))refreshAdminScripts().then(refreshKeyList);if(e.target.closest('[data-admin-tab="api"]'))checkApiStatus();});
    $("#keyList")?.addEventListener("click", e => {const b=e.target.closest("[data-void-revoke-key]");if(b)revokeAdminKey(b.dataset.voidRevokeKey);});
    $("#adminScriptList")?.addEventListener("click", e => {
      const edit=e.target.closest("[data-void-edit]"), del=e.target.closest("[data-void-delete]");
      if(edit){e.preventDefault();e.stopImmediatePropagation();const s=adminScripts.find(x=>x.id===edit.dataset.voidEdit);if(s)fillScriptForm(s);}
      if(del){e.preventDefault();e.stopImmediatePropagation();deleteScript(del.dataset.voidDelete);}
    }, true);
    $("#newScriptBtn")?.addEventListener("click", () => fillScriptForm(null));
    $("#cancelScript")?.addEventListener("click", () => {$("#scriptForm").hidden=true;});
    $("#refreshAdminOverview")?.addEventListener("click", refreshAdminScripts);
    $("#adminTabs")?.addEventListener("click", e => { if(e.target.closest('[data-admin-tab="scripts"],[data-admin-tab="overview"]')) refreshAdminScripts(); }, true);
    $("#openAdmin")?.addEventListener("click", () => setTimeout(refreshAdminScripts,80));
    $("#openAdminFooter")?.addEventListener("click", () => setTimeout(refreshAdminScripts,80));
    $("#newScriptContent")?.addEventListener("input", () => {const el=$("#sourceCharCount");if(el)el.textContent=$("#newScriptContent").value.length+" characters";});
  }

  function install() {
    installSideNav();
    if (window.supabase?.createClient && !client) { try { client=window.supabase.createClient(SUPABASE_URL,PUBLIC_KEY); } catch {} }
    installAdminFixes();
  }
  if (document.readyState==="loading") document.addEventListener("DOMContentLoaded",install,{once:true}); else install();
})();