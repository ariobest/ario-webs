(() => {
  "use strict";
  const PROJECT_URL = "https://cqtwmxojwwyeasstuhgb.supabase.co";
  const PUBLIC_KEY = "sb_publishable_qBPb1ltQbHNZ-fO3PFmDeg_IQj0QfNB";
  const $ = (s, root = document) => root.querySelector(s);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const date = value => value ? new Date(value).toLocaleString() : "—";
  let db = null, user = null, isAdmin = false, currentEditorScript = null, editorLoadedSource = "", editorVersions = [], luaEditor = null, liveChannel = null;
  const status = (id, msg, error = false) => { const el = $("#" + id); if (el) { el.textContent = msg; el.dataset.state = error ? "error" : "ok"; } };
  const toast = msg => { const el = $("#toast"); if (el) { el.textContent = msg; el.dataset.kind = "info"; el.classList.add("show"); setTimeout(() => el.classList.remove("show"), 2600); } else console.info("[VOID]", msg); };
  const isAdminUser = async () => {
    if (!user || !db) return false;
    const { data, error } = await db.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    return !error && Boolean(data);
  };
  const audit = async (action, targetType = null, targetId = null, metadata = {}) => {
    if (!db || !user || !isAdmin) return;
    const { error } = await db.from("void_audit_logs").insert({ actor_id:user.id, action, target_type:targetType, target_id:targetId == null ? null : String(targetId), metadata });
    if (error) console.warn("VOID audit event was not saved:", error.message);
  };
  const tabNames = [
    ["analytics","▥","Analytics"],["activity","◷","Live activity"],["lua-editor","⌘","Lua Studio"],
    ["community-admin","♙","Community"],["security-log","⛨","Audit log"],["announcements","▤","Updates"]
  ];
  function addAdminFeatures() {
    const tabs = $("#adminTabs"), content = $("#adminContent");
    if (!tabs || !content || $("#voidAnalyticsPane")) return;
    tabNames.forEach(([id, icon, label]) => {
      const button = document.createElement("button");
      button.className = "admin-tab void-extra-tab"; button.dataset.adminTab = id; button.setAttribute("role","tab");
      button.innerHTML = '<span aria-hidden="true">' + icon + '</span> ' + label;
      tabs.append(button);
    });
    const panes = [
      '<section class="admin-pane" data-pane="analytics" id="voidAnalyticsPane" hidden><div class="pane-heading"><div><h3>Advanced analytics</h3><p>Usage totals and event trends from the existing script database.</p></div><button class="secondary small" id="voidRefreshAnalytics">Refresh</button></div><div class="void-stat-grid"><article><span>Script records</span><strong id="voidStatScripts">—</strong></article><article><span>Events · 7 days</span><strong id="voidStatEvents">—</strong></article><article><span>Unique signed-in users · 7 days</span><strong id="voidStatUsers">—</strong></article><article><span>Published scripts</span><strong id="voidStatPublished">—</strong></article></div><div class="void-card"><h4>Event activity · last 7 days</h4><div id="voidAnalyticsBars" class="void-bars"></div></div><p id="voidAnalyticsStatus" class="saved-note">Admin access is required to load analytics.</p></section>',
      '<section class="admin-pane" data-pane="activity" id="voidActivityPane" hidden><div class="pane-heading"><div><h3>Live activity</h3><p>Recent recorded script views, opens, copies and downloads.</p></div><button class="secondary small" id="voidRefreshActivity">Refresh</button></div><div id="voidActivityList" class="void-list"></div><p id="voidActivityStatus" class="saved-note">Recent events appear here.</p></section>',
      '<section class="admin-pane" data-pane="lua-editor" id="voidEditorPane" hidden><div class="pane-heading"><div><h3>Lua Studio</h3><p>Admin-only editor with saved snapshots, notes, and safe rollback.</p></div></div><label>Script to edit<select id="voidEditorSelect"><option value="">Loading scripts…</option></select></label><label>Version note<input id="voidVersionNote" maxlength="160" placeholder="Describe what changed"></label><div class="void-editor-meta"><span id="voidEditorFilename">Choose a script</span><span id="voidEditorLines">0 lines</span></div><textarea id="voidLuaSource" class="void-lua-source" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="Select a script to edit Lua / Luau source…" disabled></textarea><div class="form-actions"><button type="button" class="secondary small" id="voidReloadSource">Reload</button><button type="button" class="secondary small" id="voidSaveSnapshot">Save snapshot</button><button type="button" class="small-primary" id="voidSaveSource">Save source</button></div><div class="void-card"><h4>Version history</h4><div id="voidVersionList" class="void-list"></div></div><p id="voidEditorStatus" class="saved-note">Select a script to begin.</p></section>',
      '<section class="admin-pane" data-pane="community-admin" id="voidCommunityAdminPane" hidden><div class="pane-heading"><div><h3>Community & badges</h3><p>Review profile totals and award profile badges to members.</p></div><button class="secondary small" id="voidRefreshCommunity">Refresh</button></div><div class="void-stat-grid"><article><span>Profiles</span><strong id="voidMemberCount">—</strong></article><article><span>Favorites</span><strong id="voidFavoriteCount">—</strong></article><article><span>Badges awarded</span><strong id="voidBadgeCount">—</strong></article></div><form id="voidBadgeForm" class="editor-form visible-form"><h4>Award a badge</h4><label>Member user ID<input id="voidBadgeUser" required placeholder="Supabase user UUID" autocomplete="off"></label><label>Badge name<input id="voidBadgeLabel" required maxlength="60" placeholder="Community Builder"></label><label>Badge key<input id="voidBadgeKey" required maxlength="50" pattern="[a-z0-9-]+" placeholder="community-builder"></label><label>Description<input id="voidBadgeDescription" maxlength="180" placeholder="Why this badge was awarded"></label><button class="small-primary" type="submit">Award badge</button><p id="voidBadgeStatus" class="saved-note" role="status"></p></form><p id="voidCommunityAdminStatus" class="saved-note"></p></section>',
      '<section class="admin-pane" data-pane="security-log" id="voidAuditPane" hidden><div class="pane-heading"><div><h3>Security & audit log</h3><p>Admin action history. Client-written events are useful operational records, not tamper-proof forensic evidence.</p></div><button class="secondary small" id="voidRefreshAudit">Refresh</button></div><div id="voidAuditList" class="void-list"></div><p id="voidAuditStatus" class="saved-note"></p></section>',
      '<section class="admin-pane" data-pane="announcements" id="voidAnnouncementsPane" hidden><div class="pane-heading"><div><h3>Changelog & announcements</h3><p>Publish a release note or site-wide announcement to signed-in users.</p></div></div><form id="voidAnnouncementForm" class="editor-form visible-form"><label>Title<input id="voidAnnouncementTitle" required maxlength="120" placeholder="Version 2.1 is live"></label><label>Message<textarea id="voidAnnouncementBody" rows="4" required maxlength="3000" placeholder="What changed?"></textarea></label><button class="small-primary" type="submit">Publish update</button><p id="voidAnnouncementStatus" class="saved-note" role="status"></p></form><div class="void-card"><h4>Recent published updates</h4><div id="voidAnnouncementList" class="void-list"></div></div></section>'
    ];
    panes.forEach(p => content.insertAdjacentHTML("beforeend", p));
    const luaTextarea=$("#voidLuaSource");
    if(window.CodeMirror&&luaTextarea){luaEditor=window.CodeMirror.fromTextArea(luaTextarea,{mode:"lua",theme:"material-darker",lineNumbers:true,matchBrackets:true,indentUnit:4,tabSize:4,indentWithTabs:true,viewportMargin:Infinity});luaEditor.setSize("100%","420px");luaEditor.setOption("readOnly",true);luaEditor.on("change",()=>{$("#voidEditorLines").textContent=luaEditor.getValue().split("\n").length+" lines";});}
    tabs.addEventListener("click", e => {
      const button = e.target.closest("[data-admin-tab]");
      if (!button || !tabNames.some(x => x[0] === button.dataset.adminTab)) return;
      e.preventDefault();
      tabs.querySelectorAll(".admin-tab").forEach(b => { b.classList.toggle("active", b === button); b.setAttribute("aria-selected", b === button ? "true" : "false"); });
      content.querySelectorAll(".admin-pane").forEach(p => { const active = p.dataset.pane === button.dataset.adminTab; p.classList.toggle("active", active); p.hidden = !active; });
      if (!isAdmin) { status("adminAccessNotice", "Sign in with an administrator account to use these tools.", true); return; }
      if (button.dataset.adminTab === "analytics") loadAnalytics();
      if (button.dataset.adminTab === "activity") loadActivity();
      if (button.dataset.adminTab === "lua-editor") loadEditorScripts();
      if (button.dataset.adminTab === "community-admin") loadCommunityAdmin();
      if (button.dataset.adminTab === "security-log") loadAudit();
      if (button.dataset.adminTab === "announcements") loadAnnouncements();
    });
    $("#voidRefreshAnalytics").addEventListener("click", loadAnalytics);
    $("#voidRefreshActivity").addEventListener("click", loadActivity);
    $("#voidRefreshCommunity").addEventListener("click", loadCommunityAdmin);
    $("#voidRefreshAudit").addEventListener("click", loadAudit);
    $("#voidEditorSelect").addEventListener("change", () => loadEditorScript($("#voidEditorSelect").value));
    $("#voidLuaSource").addEventListener("input", () => { $("#voidEditorLines").textContent = $("#voidLuaSource").value.split("\n").length + " lines"; });
    $("#voidReloadSource").addEventListener("click", () => loadEditorScript($("#voidEditorSelect").value));
    $("#voidSaveSnapshot").addEventListener("click", saveSnapshot);
    $("#voidSaveSource").addEventListener("click", saveSource);
    $("#voidBadgeForm").addEventListener("submit", awardBadge);
    $("#voidAnnouncementForm").addEventListener("submit", publishAnnouncement);
    loadAnnouncementsPublic();
  }
  function requireAdmin() { if (!db || !user || !isAdmin) { toast("Sign in as an administrator to use this feature."); return false; } return true; }
  async function loadAnalytics() {
    if (!requireAdmin()) return;
    status("voidAnalyticsStatus","Loading analytics…");
    const since = new Date(Date.now() - 7*86400000).toISOString();
    const [scripts, events, published] = await Promise.all([
      db.from("scripts").select("id", {count:"exact",head:true}),
      db.from("script_events").select("id,user_id,event_type,created_at").gte("created_at",since).order("created_at",{ascending:true}).limit(2000),
      db.from("scripts").select("id",{count:"exact",head:true}).eq("status","published")
    ]);
    if (scripts.error || events.error || published.error) { status("voidAnalyticsStatus",[scripts.error,events.error,published.error].find(Boolean)?.message || "Could not load analytics.",true); return; }
    $("#voidStatScripts").textContent = scripts.count ?? "—";
    $("#voidStatEvents").textContent = events.data.length;
    $("#voidStatUsers").textContent = new Set(events.data.map(x=>x.user_id).filter(Boolean)).size;
    $("#voidStatPublished").textContent = published.count ?? "—";
    const days = Array.from({length:7},(_,i)=>{const d=new Date(Date.now()-(6-i)*86400000);return {key:d.toISOString().slice(0,10),label:d.toLocaleDateString(undefined,{weekday:"short"}),count:0};});
    events.data.forEach(e=>{const d=days.find(x=>x.key===String(e.created_at).slice(0,10));if(d)d.count++;});
    const max=Math.max(1,...days.map(d=>d.count));
    $("#voidAnalyticsBars").innerHTML=days.map(d=>'<div class="void-bar-row"><span>'+esc(d.label)+'</span><div><i style="width:'+Math.round(d.count/max*100)+'%"></i></div><b>'+d.count+'</b></div>').join("");
    status("voidAnalyticsStatus","Analytics loaded. Event totals reflect events recorded by the site; they do not retroactively include untracked activity.");
  }
  async function loadActivity() {
    if (!requireAdmin()) return;
    status("voidActivityStatus","Loading recent activity…");
    const {data,error}=await db.from("script_events").select("id,script_id,user_id,event_type,created_at").order("created_at",{ascending:false}).limit(60);
    if(error){status("voidActivityStatus",error.message,true);return;}
    const ids=[...new Set((data||[]).map(e=>e.script_id).filter(Boolean))];
    let names={};
    if(ids.length){const q=await db.from("scripts").select("id,name,slug").in("id",ids);(q.data||[]).forEach(s=>names[s.id]=s);}
    $("#voidActivityList").innerHTML=(data||[]).map(e=>'<article class="void-list-item"><div><b>'+esc((e.event_type||"event").toUpperCase())+' · '+esc(names[e.script_id]?.name||"Script")+'</b><small>'+esc(e.user_id ? "Signed-in user "+e.user_id.slice(0,8)+"…" : "Anonymous visitor")+'</small></div><time>'+esc(date(e.created_at))+'</time></article>').join("")||'<p class="saved-note">No script events recorded yet.</p>';
    status("voidActivityStatus","Showing the latest "+(data||[]).length+" recorded events.");
  }
  async function loadEditorScripts() {
    if(!requireAdmin())return;
    const select=$("#voidEditorSelect"); select.innerHTML='<option value="">Loading…</option>';
    const {data,error}=await db.from("scripts").select("id,name,slug,updated_at").order("updated_at",{ascending:false});
    if(error){select.innerHTML='<option value="">Could not load scripts</option>';status("voidEditorStatus",error.message,true);return;}
    select.innerHTML='<option value="">Choose a script…</option>'+(data||[]).map(s=>'<option value="'+esc(s.id)+'">'+esc(s.name)+' · '+esc(s.slug)+'</option>').join("");
    status("voidEditorStatus",(data||[]).length+" script records available to the admin editor.");
  }
  async function loadEditorScript(id) {
    if(!requireAdmin()||!id)return;
    const {data,error}=await db.from("scripts").select("id,name,slug,content,updated_at").eq("id",id).maybeSingle();
    if(error||!data){status("voidEditorStatus",error?.message||"Script not found.",true);return;}
    currentEditorScript=data; editorLoadedSource=data.content||"";
    $("#voidLuaSource").disabled=false;$("#voidLuaSource").value=editorLoadedSource;if(luaEditor){luaEditor.setValue(editorLoadedSource);luaEditor.setOption("readOnly",false);luaEditor.refresh();}
    $("#voidEditorFilename").textContent=data.slug+".lua";$("#voidEditorLines").textContent=editorLoadedSource.split("\n").length+" lines";
    const q=await db.from("void_script_versions").select("id,version_label,change_note,created_at,author_id,source").eq("script_id",id).order("created_at",{ascending:false}).limit(30);
    editorVersions=q.data||[];
    if(q.error) status("voidEditorStatus","Source loaded; version history unavailable: "+q.error.message,true);
    else renderVersions();
    if(q.error) console.warn(q.error);
    if(q.data?.length===0) status("voidEditorStatus","Source loaded. Save a snapshot before major changes.");
  }
  function renderVersions(){
    const root=$("#voidVersionList");
    root.innerHTML=editorVersions.map(v=>'<article class="void-list-item"><div><b>'+esc(v.version_label||"Snapshot")+'</b><small>'+esc(v.change_note||"No note")+' · '+esc(date(v.created_at))+'</small></div><button type="button" class="secondary small" data-restore-version="'+esc(v.id)+'">Preview / restore</button></article>').join("")||'<p class="saved-note">No snapshots saved yet.</p>';
    root.querySelectorAll("[data-restore-version]").forEach(btn=>btn.addEventListener("click",()=>{
      const v=editorVersions.find(x=>x.id===btn.dataset.restoreVersion);if(!v)return;
      if(!confirm("Load this snapshot into the editor? The database is not changed until you click Save source."))return;
      $("#voidLuaSource").value=v.source;if(luaEditor)luaEditor.setValue(v.source);$("#voidEditorLines").textContent=v.source.split("\n").length+" lines";$("#voidVersionNote").value="Restore: "+(v.version_label||"Snapshot");status("voidEditorStatus","Snapshot loaded into the editor. Save source to apply it.");
    }));
  }
  async function saveSnapshot() {
    if(!requireAdmin()||!currentEditorScript)return;
    const note=$("#voidVersionNote").value.trim()||"Manual snapshot";
    const {error}=await db.from("void_script_versions").insert({script_id:currentEditorScript.id,author_id:user.id,version_label:new Date().toLocaleString(),source:(luaEditor?luaEditor.getValue():$("#voidLuaSource").value),change_note:note});
    if(error){status("voidEditorStatus",error.message,true);return;}
    await audit("script.snapshot","script",currentEditorScript.id,{slug:currentEditorScript.slug,note});
    await loadEditorScript(currentEditorScript.id);status("voidEditorStatus","Snapshot saved.");
  }
  async function saveSource() {
    if(!requireAdmin()||!currentEditorScript)return;
    const source=luaEditor?luaEditor.getValue():$("#voidLuaSource").value;
    if(source.length>200000){status("voidEditorStatus","Source exceeds the 200,000 character limit.",true);return;}
    if(!confirm("Save these source changes to "+currentEditorScript.slug+"? A snapshot will be created first."))return;
    const note=$("#voidVersionNote").value.trim()||"Saved from Lua Studio";
    const snap=await db.from("void_script_versions").insert({script_id:currentEditorScript.id,author_id:user.id,version_label:"Before edit · "+new Date().toLocaleString(),source:currentEditorScript.content||"",change_note:note});
    if(snap.error){status("voidEditorStatus","Could not create safety snapshot; save cancelled: "+snap.error.message,true);return;}
    const update=await db.from("scripts").update({content:source,updated_at:new Date().toISOString()}).eq("id",currentEditorScript.id);
    if(update.error){status("voidEditorStatus","Snapshot saved, but source update failed: "+update.error.message,true);return;}
    await audit("script.source.updated","script",currentEditorScript.id,{slug:currentEditorScript.slug,note,characters:source.length});
    await loadEditorScript(currentEditorScript.id);status("voidEditorStatus","Source saved and previous version snapshotted.");
  }
  async function loadCommunityAdmin() {
    if(!requireAdmin())return;
    status("voidCommunityAdminStatus","Loading community totals…");
    const [profiles,favorites,badges]=await Promise.all([
      db.from("ario_profiles").select("id",{count:"exact",head:true}),
      db.from("void_script_favorites").select("user_id",{count:"exact",head:true}),
      db.from("void_user_badges").select("id",{count:"exact",head:true})
    ]);
    $("#voidMemberCount").textContent=profiles.count??"—";$("#voidFavoriteCount").textContent=favorites.count??"—";$("#voidBadgeCount").textContent=badges.count??"—";
    const error=[profiles,favorites,badges].find(x=>x.error);
    status("voidCommunityAdminStatus",error?error.error.message:"Community totals refreshed.",Boolean(error));
  }
  async function awardBadge(e) {
    e.preventDefault();if(!requireAdmin())return;
    const target=$("#voidBadgeUser").value.trim(),label=$("#voidBadgeLabel").value.trim(),key=$("#voidBadgeKey").value.trim().toLowerCase();
    if(!/^[0-9a-f-]{36}$/i.test(target)){status("voidBadgeStatus","Enter a valid user UUID.",true);return;}
    const {error}=await db.from("void_user_badges").insert({user_id:target,badge_key:key,label,description:$("#voidBadgeDescription").value.trim(),awarded_by:user.id});
    if(error){status("voidBadgeStatus",error.message,true);return;}
    await audit("badge.awarded","user",target,{badge_key:key,label});status("voidBadgeStatus","Badge awarded.");e.target.reset();loadCommunityAdmin();
  }
  async function loadAudit() {
    if(!requireAdmin())return;
    status("voidAuditStatus","Loading audit log…");
    const {data,error}=await db.from("void_audit_logs").select("id,actor_id,action,target_type,target_id,metadata,created_at").order("created_at",{ascending:false}).limit(100);
    if(error){status("voidAuditStatus",error.message,true);return;}
    $("#voidAuditList").innerHTML=(data||[]).map(x=>'<article class="void-list-item"><div><b>'+esc(x.action)+'</b><small>'+esc(x.target_type||"system")+(x.target_id?" · "+esc(x.target_id):"")+' · '+esc(x.actor_id||"Unknown actor")+'</small><small>'+esc(JSON.stringify(x.metadata||{}))+'</small></div><time>'+esc(date(x.created_at))+'</time></article>').join("")||'<p class="saved-note">No admin actions recorded yet.</p>';
    status("voidAuditStatus","Showing "+(data||[]).length+" audit records. Logs written by the client are operational history, not tamper-proof evidence.");
  }
  async function publishAnnouncement(e) {
    e.preventDefault();if(!requireAdmin())return;
    const title=$("#voidAnnouncementTitle").value.trim(),body=$("#voidAnnouncementBody").value.trim();
    const {data,error}=await db.from("announcements").insert({title,body,is_published:true,published_at:new Date().toISOString(),created_by:user.id}).select("id").single();
    if(error){status("voidAnnouncementStatus",error.message,true);return;}
    await db.from("void_notifications").insert({user_id:null,title,body,kind:"release",created_by:user.id,link:"/updates"});
    await audit("announcement.published","announcement",data?.id,{title});
    status("voidAnnouncementStatus","Update published.");e.target.reset();await loadAnnouncements();await loadAnnouncementsPublic();
  }
  async function loadAnnouncements() {
    if(!requireAdmin())return;
    const {data,error}=await db.from("announcements").select("id,title,body,is_published,published_at,created_at").order("created_at",{ascending:false}).limit(30);
    if(error){$("#voidAnnouncementList").innerHTML='<p class="saved-note">'+esc(error.message)+'</p>';return;}
    $("#voidAnnouncementList").innerHTML=(data||[]).map(a=>'<article class="void-list-item"><div><b>'+esc(a.title)+'</b><small>'+esc(a.body)+'</small></div><time>'+esc(date(a.published_at||a.created_at))+'</time></article>').join("")||'<p class="saved-note">No updates yet.</p>';
  }
  async function loadAnnouncementsPublic() {
    if(!db)return;
    const {data,error}=await db.from("announcements").select("id,title,body,published_at,created_at").eq("is_published",true).order("published_at",{ascending:false}).limit(5);
    if(error||!data?.length)return;
    let section=$("#voidPublicUpdates");
    if(!section){
      section=document.createElement("section");section.id="voidPublicUpdates";section.className="section void-public-updates";
      section.innerHTML='<div class="section-heading"><div><span class="eyebrow">WHAT’S NEW</span><h2>Updates from VOID.</h2><p>Release notes and community announcements.</p></div></div><div class="void-list" id="voidPublicUpdateList"></div>';
      const main=$("main");const about=$("#about");if(about&&main)main.insertBefore(section,about);else main?.append(section);
    }
    $("#voidPublicUpdateList").innerHTML=data.map(a=>'<article class="void-list-item"><div><b>'+esc(a.title)+'</b><small>'+esc(a.body)+'</small></div><time>'+esc(date(a.published_at||a.created_at))+'</time></article>').join("");
  }
  function addProfileArea() {
    if($("#voidProfileSection"))return;
    const section=document.createElement("section");section.id="voidProfileSection";section.className="section void-profile-section";
    section.innerHTML='<div class="section-heading"><div><span class="eyebrow">YOUR SPACE</span><h2>Creator profile.</h2><p>Update your public display details, manage favorites, and view earned badges.</p></div></div><div class="void-profile-layout"><form id="voidProfileForm" class="void-card"><h3>Profile settings</h3><label>Display name<input id="voidDisplayName" maxlength="60" placeholder="How should we call you?"></label><label>Username<input id="voidUsername" maxlength="30" pattern="[A-Za-z0-9_]+" placeholder="username"></label><label>Avatar image URL (optional)<input id="voidAvatar" type="url" maxlength="500" placeholder="https://…"></label><label>Bio<textarea id="voidBio" maxlength="240" rows="3" placeholder="A little about you…"></textarea></label><button class="small-primary" type="submit">Save profile</button><p id="voidProfileStatus" class="saved-note" role="status">Sign in to edit your profile.</p></form><div class="void-card"><h3>Saved scripts</h3><div id="voidFavoriteList" class="void-list"><p class="saved-note">Sign in to load favorites.</p></div><h3>Your badges</h3><div id="voidMyBadges" class="void-badges"><p class="saved-note">Sign in to load badges.</p></div><div class="void-notifications-head"><h3>Notifications</h3><button type="button" class="secondary small" id="voidRefreshNotifications">Refresh</button></div><div id="voidNotifications" class="void-list"><p class="saved-note">Sign in to load notifications.</p></div></div></div>';
    const main=$("main");if(main)main.append(section);
    const profileActions=$(".profile-actions");if(profileActions&&!$("#voidProfileJump")){const jump=document.createElement("button");jump.id="voidProfileJump";jump.type="button";jump.className="secondary";jump.textContent="Profile & community";jump.addEventListener("click",()=>{const backdrop=$("#profileBackdrop");if(backdrop)backdrop.hidden=true;document.body.classList.remove("modal-open");$("#voidProfileSection")?.scrollIntoView({behavior:"smooth"});});profileActions.insertBefore(jump,$("#profileSignOut")||null);}
    $("#voidProfileForm").addEventListener("submit",saveProfile);
    $("#voidRefreshNotifications").addEventListener("click",loadNotifications);
  }
  async function loadProfile() {
    addProfileArea();
    if(!user||!db){status("voidProfileStatus","Sign in to save your profile and sync favorites.");$("#voidFavoriteList").innerHTML='<p class="saved-note">Sign in to view saved scripts.</p>';return;}
    const {data,error}=await db.from("ario_profiles").select("id,username,display_name,bio,avatar_url,role,banned").eq("id",user.id).maybeSingle();
    if(error){status("voidProfileStatus",error.message,true);return;}
    if(data){
      $("#voidDisplayName").value=data.display_name||"";$("#voidUsername").value=data.username||"";$("#voidBio").value=data.bio||"";$("#voidAvatar").value=data.avatar_url||"";
      $("#voidUsername").disabled=Boolean(data.role==="admin"||data.banned);
      if(data.banned)status("voidProfileStatus","This account is restricted from editing profile settings.",true);
    } else status("voidProfileStatus","No profile row exists for this account yet. Contact an administrator to initialize it.",true);
    await Promise.all([loadFavorites(),loadBadges(),loadNotifications()]);
  }
  async function saveProfile(e) {
    e.preventDefault();if(!user||!db){status("voidProfileStatus","Sign in first.",true);return;}
    const username=$("#voidUsername").value.trim();
    if(!/^[A-Za-z0-9_]{3,30}$/.test(username)){status("voidProfileStatus","Username must be 3–30 letters, numbers, or underscores.",true);return;}
    const avatar=$("#voidAvatar").value.trim();
    if(avatar){try{const u=new URL(avatar);if(u.protocol!=="https:"){throw 0;}}catch{status("voidProfileStatus","Avatar must be a valid HTTPS URL.",true);return;}}
    const payload={username,display_name:$("#voidDisplayName").value.trim()||username,bio:$("#voidBio").value.trim(),avatar_url:avatar||null,updated_at:new Date().toISOString()};
    const {error}=await db.from("ario_profiles").update(payload).eq("id",user.id);
    if(error){status("voidProfileStatus",error.message,true);return;}
    status("voidProfileStatus","Profile saved.");toast("Profile updated.");
  }
  async function loadFavorites() {
    if(!user||!db)return;
    const {data,error}=await db.from("void_script_favorites").select("script_id,created_at").eq("user_id",user.id).order("created_at",{ascending:false});
    if(error){$("#voidFavoriteList").innerHTML='<p class="saved-note">'+esc(error.message)+'</p>';return;}
    const ids=(data||[]).map(x=>x.script_id);
    if(!ids.length){$("#voidFavoriteList").innerHTML='<p class="saved-note">No saved scripts yet. Add favorites from the script library.</p>';return;}
    const q=await db.from("published_script_metadata").select("id,name,slug,description").in("id",ids);
    $("#voidFavoriteList").innerHTML=(q.data||[]).map(s=>'<article class="void-list-item"><div><b>'+esc(s.name)+'</b><small>'+esc(s.description||s.slug)+'</small></div><button class="secondary small" data-remove-favorite="'+esc(s.id)+'">Remove</button></article>').join("")||'<p class="saved-note">Favorite scripts are no longer published.</p>';
    $("#voidFavoriteList").querySelectorAll("[data-remove-favorite]").forEach(btn=>btn.addEventListener("click",async()=>{const r=await db.from("void_script_favorites").delete().eq("user_id",user.id).eq("script_id",btn.dataset.removeFavorite);if(r.error){toast(r.error.message);return;}loadFavorites();}));
  }
  async function loadBadges() {
    if(!user||!db)return;
    const {data,error}=await db.from("void_user_badges").select("badge_key,label,description,created_at").eq("user_id",user.id).order("created_at",{ascending:false});
    $("#voidMyBadges").innerHTML=error?'<p class="saved-note">'+esc(error.message)+'</p>':(data||[]).map(b=>'<span class="void-badge" title="'+esc(b.description)+'">✦ '+esc(b.label)+'</span>').join("")||'<p class="saved-note">No badges earned yet.</p>';
  }
  async function loadNotifications() {
    if(!user||!db){$("#voidNotifications").innerHTML='<p class="saved-note">Sign in to view notifications.</p>';return;}
    const {data,error}=await db.from("void_notifications").select("id,user_id,title,body,kind,link,created_at,read_at").or("user_id.is.null,user_id.eq."+user.id).order("created_at",{ascending:false}).limit(20);
    if(error){$("#voidNotifications").innerHTML='<p class="saved-note">'+esc(error.message)+'</p>';return;}
    $("#voidNotifications").innerHTML=(data||[]).map(n=>'<article class="void-list-item '+(n.read_at?"":"is-unread")+'"><div><b>'+esc(n.title)+'</b><small>'+esc(n.body)+'</small><time>'+esc(date(n.created_at))+'</time></div>'+(n.read_at?"":(n.user_id===user.id?'<button type="button" class="secondary small" data-read-notice="'+esc(n.id)+'">Mark read</button>':'<small>Site-wide</small>'))+'</article>').join("")||'<p class="saved-note">You are all caught up.</p>';
    $("#voidNotifications").querySelectorAll("[data-read-notice]").forEach(btn=>btn.addEventListener("click",async()=>{const r=await db.from("void_notifications").update({read_at:new Date().toISOString()}).eq("id",btn.dataset.readNotice).eq("user_id",user.id);if(r.error){toast(r.error.message);return;}loadNotifications();}));
  }
  async function trackEvent(type, scriptId) {
    if(!db||!["view","copy","open","download"].includes(type)||!scriptId)return;
    const {error}=await db.from("script_events").insert({script_id:scriptId,user_id:user?.id||null,event_type:type});
    if(error)console.debug("Event tracking skipped:",error.message);
  }
  function attachFavoriteTracking() {
    const grid=$("#scriptGrid");if(!grid)return;
    grid.addEventListener("click",async e=>{
      const favorite=e.target.closest("[data-favorite-id]");
      if(favorite&&user&&db){
        const id=favorite.dataset.favoriteId;
        const existing=await db.from("void_script_favorites").select("script_id").eq("user_id",user.id).eq("script_id",id).maybeSingle();
        if(existing.data){await db.from("void_script_favorites").delete().eq("user_id",user.id).eq("script_id",id);}
        else {const result=await db.from("void_script_favorites").insert({user_id:user.id,script_id:id});if(result.error){toast(result.error.message);return;}}
        loadFavorites();
      }
      const card=e.target.closest(".script-card");
      if(card){const title=card.querySelector("h3")?.textContent||"";db?.from("published_script_metadata").select("id").eq("name",title).maybeSingle().then(r=>{if(r.data)trackEvent("open",r.data.id);});}
    });
  }
  function bindPublicNotifications() {
    const nav=$(".nav-actions");if(nav&&!$("#voidNotificationJump")){
      const b=document.createElement("button");b.id="voidNotificationJump";b.className="secondary";b.type="button";b.textContent="Updates";b.addEventListener("click",()=>$("#voidProfileSection")?.scrollIntoView({behavior:"smooth"}));nav.insertBefore(b,$("#openProfile")||null);
    }
  }
  async function onSession(session) {
    user=session?.user||null;
    isAdmin=await isAdminUser();
    if(liveChannel&&db){db.removeChannel(liveChannel);liveChannel=null;}
    if(user&&db){liveChannel=db.channel("void-live-"+user.id).on("postgres_changes",{event:"INSERT",schema:"public",table:"void_notifications"},payload=>{const n=payload.new||{};if(!n.user_id||n.user_id===user?.id){loadNotifications();if(n.title)toast("New update: "+n.title);}}).on("postgres_changes",{event:"INSERT",schema:"public",table:"script_events"},()=>{if(isAdmin&&$("#voidActivityPane")&&!$("#voidActivityPane").hidden)loadActivity();}).subscribe();}
    const openProfile=$("#openProfile");
    if(openProfile){openProfile.hidden=!user;openProfile.textContent=user?"Profile":"Profile";}
    if(user){loadProfile();}else if($("#voidProfileSection")){status("voidProfileStatus","Sign in to save your profile and sync favorites.");}
  }
  async function init() {
    addAdminFeatures();addProfileArea();bindPublicNotifications();
    if(!window.supabase?.createClient){status("voidProfileStatus","Supabase client library did not load.",true);return;}
    try {
      db=window.supabase.createClient(PROJECT_URL,PUBLIC_KEY);
      const {data}=await db.auth.getSession();await onSession(data.session);
      db.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>onSession(session),0);});
      loadAnnouncementsPublic();attachFavoriteTracking();
    } catch(e){console.error("VOID feature initialization failed:",e);status("voidProfileStatus","Could not initialize community features.",true);}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();