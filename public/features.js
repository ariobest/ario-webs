(() => {
  "use strict";
  const PROJECT_URL = "https://cqtwmxojwwyeasstuhgb.supabase.co";
  const PUBLIC_KEY = "sb_publishable_qBPb1ltQbHNZ-fO3PFmDeg_IQj0QfNB";
  const $ = (s, root = document) => root.querySelector(s);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const date = value => value ? new Date(value).toLocaleString() : "—";
  let db = null, user = null, isAdmin = false, currentEditorScript = null, editorLoadedSource = "", editorVersions = [], luaEditor = null, liveChannel = null, remoteFavoriteIds = new Set();
  const status = (id, msg, error = false) => { const el = $("#" + id); if (el) { el.hidden = false; el.textContent = msg; el.dataset.state = error ? "error" : "ok"; } };
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
    ["community-admin","♙","Community"],["security-log","⛨","Audit log"],["announcements","▤","Updates"],["roadmap","▤","Roadmap"],["admin-users","♙","Users"],["admin-reports","⚑","Reports"],["admin-inbox","✉","Inbox"],["admin-backup","⇩","Backups"],["admin-site","◉","Site control"]
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
      '<section class="admin-pane" data-pane="announcements" id="voidAnnouncementsPane" hidden><div class="pane-heading"><div><h3>Changelog & announcements</h3><p>Publish a release note or site-wide announcement to signed-in users.</p></div></div><form id="voidAnnouncementForm" class="editor-form visible-form"><label>Title<input id="voidAnnouncementTitle" required maxlength="120" placeholder="Version 2.1 is live"></label><label>Message<textarea id="voidAnnouncementBody" rows="4" required maxlength="3000" placeholder="What changed?"></textarea></label><button class="small-primary" type="submit">Publish update</button><p id="voidAnnouncementStatus" class="saved-note" role="status"></p></form><div class="void-card"><h4>Recent published updates</h4><div id="voidAnnouncementList" class="void-list"></div></div></section>',
      '<section class="admin-pane" data-pane="roadmap" id="voidRoadmapPane" hidden><div class="pane-heading"><div><h3>Script roadmap</h3><p>Manage game coverage, release milestones, and public progress. Changes sync through Supabase.</p></div><button class="secondary small" type="button" id="voidRefreshRoadmap">Refresh</button></div><form id="voidRoadmapForm" class="editor-form visible-form"><input type="hidden" id="voidRoadmapEditId"><label>Feature or game name<input id="voidRoadmapTitle" required maxlength="120" placeholder="MM2 loader support"></label><label>Game / area<input id="voidRoadmapGame" maxlength="120" placeholder="Murder Mystery 2, UI library, etc."></label><label>Notes<textarea id="voidRoadmapNotes" rows="3" maxlength="1200" placeholder="What is included and what remains?"></textarea></label><div class="void-pro-fields"><label>Progress %<input id="voidRoadmapProgress" type="number" min="0" max="100" step="1" value="0" required></label><label>Status<select id="voidRoadmapStatus"><option value="planned">Planned</option><option value="working">In progress</option><option value="testing">Testing</option><option value="released">Released</option></select></label><label>Sort order<input id="voidRoadmapSort" type="number" min="0" max="9999" step="1" value="0"></label></div><label class="setting-check"><input id="voidRoadmapPublic" type="checkbox" checked> Show on public roadmap</label><div class="form-actions"><button type="button" class="secondary small" id="voidRoadmapCancel">Clear form</button><button class="small-primary" type="submit">Save roadmap item</button></div><p id="voidRoadmapAdminStatus" class="saved-note" role="status">Roadmap changes are saved to the existing Supabase project.</p></form><div id="voidRoadmapAdminList" class="void-list"></div></section>',
      '<section class="admin-pane" data-pane="admin-users" hidden><div class="pane-heading"><div><h3>User management</h3><p>Review existing profiles and manage account restrictions. Admin-role promotion is intentionally not available here.</p></div><button class="secondary small" id="voidRefreshUsers" type="button">Refresh</button></div><label>Search users<input id="voidUserSearch" type="search" placeholder="Username or user UUID"></label><div id="voidAdminUsersList" class="void-list"></div><p id="voidAdminUsersStatus" class="saved-note" role="status"></p></section>',
      '<section class="admin-pane" data-pane="admin-reports" hidden><div class="pane-heading"><div><h3>Reports & moderation</h3><p>Review user-submitted script reports and record moderation outcomes.</p></div><button class="secondary small" id="voidRefreshReports" type="button">Refresh</button></div><div class="void-pro-fields"><label>Filter status<select id="voidReportFilter"><option value="open">Open</option><option value="reviewing">Reviewing</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option><option value="all">All reports</option></select></label></div><div id="voidReportsList" class="void-list"></div><p id="voidReportsStatus" class="saved-note" role="status"></p></section>',
      '<section class="admin-pane" data-pane="admin-inbox" hidden><div class="pane-heading"><div><h3>Admin notifications</h3><p>Broadcasts and account-specific notices stored in the existing notification system.</p></div><button class="secondary small" id="voidRefreshAdminInbox" type="button">Refresh</button></div><form id="voidAdminNoticeForm" class="editor-form visible-form"><label>Title<input id="voidAdminNoticeTitle" required maxlength="140" placeholder="Maintenance scheduled"></label><label>Message<textarea id="voidAdminNoticeBody" rows="3" maxlength="2000" placeholder="Write a clear update for your users"></textarea></label><label>Type<select id="voidAdminNoticeKind"><option value="info">Information</option><option value="warning">Warning</option><option value="success">Success</option><option value="release">Release</option></select></label><label>Optional link<input id="voidAdminNoticeLink" type="url" maxlength="500" placeholder="https://voiddev.bond/updates"></label><button class="small-primary" type="submit">Send site-wide notification</button><p id="voidAdminNoticeStatus" class="saved-note" role="status"></p></form><div id="voidAdminInboxList" class="void-list"></div><p id="voidAdminInboxStatus" class="saved-note" role="status"></p></section>',
      '<section class="admin-pane" data-pane="admin-backup" hidden><div class="pane-heading"><div><h3>Export & backups</h3><p>Download a timestamped JSON export of records the signed-in admin can read. This is not a full Supabase database or Storage backup.</p></div></div><div class="void-card"><h4>Data export</h4><p>Includes scripts, profiles, script events, audit history, notifications, reports, and site settings when permitted. Each table is capped at 5,000 rows.</p><button class="small-primary" id="voidDownloadBackup" type="button">Download JSON backup</button><p id="voidBackupStatus" class="saved-note" role="status">Export runs in your browser using your existing admin session.</p></div><div class="void-card"><h4>Backup safety</h4><p>Store the downloaded file securely. It may contain private script source and account identifiers. For disaster recovery, also use Supabase database backup / point-in-time recovery and Storage backup options.</p></div></section>',
      '<section class="admin-pane" data-pane="admin-site" hidden><div class="pane-heading"><div><h3>Site control</h3><p>Manage the public maintenance notice and inspect the current public-facing state.</p></div><button class="secondary small" id="voidReloadAdminSite" type="button">Reload</button></div><form id="voidMaintenanceForm" class="editor-form visible-form"><label class="setting-check"><input id="voidMaintenanceEnabled" type="checkbox"> Enable maintenance notice for visitors</label><label>Visitor message<textarea id="voidMaintenanceMessage" rows="3" maxlength="500">VOID DEVELOPMENT is undergoing scheduled maintenance. Please check back soon.</textarea></label><p class="security-note">This toggle displays a public maintenance notice; it is not a server-side access lock and must not be used as a security boundary.</p><button class="small-primary" type="submit">Save maintenance settings</button><p id="voidMaintenanceStatus" class="saved-note" role="status"></p></form></section>'
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
      if (button.dataset.adminTab === "roadmap") loadRoadmapAdmin();
      if (button.dataset.adminTab === "admin-users") loadAdminUsers();
      if (button.dataset.adminTab === "admin-reports") loadAdminReports();
      if (button.dataset.adminTab === "admin-inbox") loadAdminInbox();
      if (button.dataset.adminTab === "admin-site") loadAdminSiteSettings();
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
    $("#voidRoadmapForm").addEventListener("submit", saveRoadmapItem);
    $("#voidRefreshRoadmap").addEventListener("click", loadRoadmapAdmin);
    $("#voidRoadmapCancel").addEventListener("click", resetRoadmapForm);
    $("#voidRoadmapAdminList").addEventListener("click", handleRoadmapAdminClick);
    $("#voidRefreshUsers").addEventListener("click", loadAdminUsers);
    $("#voidUserSearch").addEventListener("input", renderAdminUsers);
    $("#voidRefreshReports").addEventListener("click", loadAdminReports);
    $("#voidReportFilter").addEventListener("change", loadAdminReports);
    $("#voidRefreshAdminInbox").addEventListener("click", loadAdminInbox);
    $("#voidAdminNoticeForm").addEventListener("submit", publishAdminNotice);
    $("#voidDownloadBackup").addEventListener("click", downloadAdminBackup);
    $("#voidReloadAdminSite").addEventListener("click", loadAdminSiteSettings);
    $("#voidMaintenanceForm").addEventListener("submit", saveAdminSiteSettings);
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
  async function loadRoadmapPublic() {
    const host=$("#publicRoadmapGrid");if(!host||!db)return;
    const {data,error}=await db.from("void_roadmap_items").select("id,title,game_name,notes,progress,status,sort_order,updated_at").eq("is_public",true).order("sort_order",{ascending:true}).order("created_at",{ascending:false});
    if(error){host.innerHTML='<p class="saved-note">The public roadmap is temporarily unavailable.</p>';status("publicRoadmapStatus","Roadmap data could not be loaded.",true);console.warn("VOID roadmap read failed:",error.message);return;}
    host.innerHTML=(data||[]).map(item=>'<article class="roadmap-card"><div class="roadmap-card-head"><span class="roadmap-status roadmap-'+esc(item.status)+'">'+esc(({planned:"Planned",working:"In progress",testing:"Testing",released:"Released"})[item.status]||"Planned")+'</span><span class="roadmap-progress-label">'+Math.max(0,Math.min(100,Number(item.progress)||0))+'%</span></div><h3>'+esc(item.title)+'</h3>'+(item.game_name?'<p class="roadmap-game">'+esc(item.game_name)+'</p>':'')+'<p>'+esc(item.notes||"Details will be shared as development continues.")+'</p><div class="roadmap-progress" role="progressbar" aria-label="'+esc(item.title)+' progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+Math.max(0,Math.min(100,Number(item.progress)||0))+'"><span style="width:'+Math.max(0,Math.min(100,Number(item.progress)||0))+'%"></span></div></article>').join("")||'<p class="saved-note">No public roadmap items yet. Check back for upcoming games and features.</p>';
    status("publicRoadmapStatus",(data||[]).length+" roadmap items loaded.");
  }
  async function loadRoadmapAdmin() {
    if(!requireAdmin())return;
    status("voidRoadmapAdminStatus","Loading roadmap items…");
    const {data,error}=await db.from("void_roadmap_items").select("id,title,game_name,notes,progress,status,is_public,sort_order,updated_at").order("sort_order",{ascending:true}).order("created_at",{ascending:false});
    if(error){status("voidRoadmapAdminStatus","Could not load roadmap: "+error.message,true);return;}
    const host=$("#voidRoadmapAdminList");
    host.innerHTML=(data||[]).map(item=>'<article class="void-list-item roadmap-admin-row"><div><b>'+esc(item.title)+'</b><small>'+esc(item.game_name||"No game specified")+' · '+esc(({planned:"Planned",working:"In progress",testing:"Testing",released:"Released"})[item.status]||item.status)+' · '+Number(item.progress||0)+'% · '+(item.is_public?"Public":"Hidden")+'</small><small>'+esc(item.notes||"No notes")+'</small></div><div class="roadmap-admin-actions"><button type="button" class="text-action" data-roadmap-edit="'+esc(item.id)+'">Edit</button><button type="button" class="text-action danger" data-roadmap-delete="'+esc(item.id)+'">Delete</button></div></article>').join("")||'<p class="saved-note">No roadmap items yet. Add the first one above.</p>';
    host.dataset.roadmapItems=JSON.stringify(data||[]);
    status("voidRoadmapAdminStatus","Loaded "+(data||[]).length+" roadmap items.");
  }
  async function saveRoadmapItem(event) {
    event.preventDefault();if(!requireAdmin())return;
    const id=$("#voidRoadmapEditId").value;
    const record={title:$("#voidRoadmapTitle").value.trim(),game_name:$("#voidRoadmapGame").value.trim(),notes:$("#voidRoadmapNotes").value.trim(),progress:Math.max(0,Math.min(100,Number($("#voidRoadmapProgress").value)||0)),status:$("#voidRoadmapStatus").value,is_public:$("#voidRoadmapPublic").checked,sort_order:Math.max(0,Math.min(9999,Number($("#voidRoadmapSort").value)||0)),updated_at:new Date().toISOString()};
    if(!record.title){status("voidRoadmapAdminStatus","Add a title first.",true);return;}
    const result=id?await db.from("void_roadmap_items").update(record).eq("id",id).select("id").maybeSingle():await db.from("void_roadmap_items").insert({...record,created_by:user.id}).select("id").single();
    if(result.error){status("voidRoadmapAdminStatus","Save failed: "+result.error.message,true);return;}
    await audit(id?"roadmap.updated":"roadmap.created","roadmap",result.data?.id||id,{title:record.title,status:record.status,progress:record.progress,is_public:record.is_public});
    resetRoadmapForm();await loadRoadmapAdmin();await loadRoadmapPublic();
  }
  function resetRoadmapForm(){const form=$("#voidRoadmapForm");if(!form)return;form.reset();$("#voidRoadmapEditId").value="";$("#voidRoadmapProgress").value="0";$("#voidRoadmapSort").value="0";$("#voidRoadmapPublic").checked=true;const submit=form.querySelector('button[type="submit"]');if(submit)submit.textContent="Save roadmap item";}
  function handleRoadmapAdminClick(event){
    const edit=event.target.closest("[data-roadmap-edit]"),del=event.target.closest("[data-roadmap-delete]");
    const rows=JSON.parse($("#voidRoadmapAdminList")?.dataset.roadmapItems||"[]");
    if(edit){const item=rows.find(x=>x.id===edit.dataset.roadmapEdit);if(!item)return;$("#voidRoadmapEditId").value=item.id;$("#voidRoadmapTitle").value=item.title||"";$("#voidRoadmapGame").value=item.game_name||"";$("#voidRoadmapNotes").value=item.notes||"";$("#voidRoadmapProgress").value=Number(item.progress)||0;$("#voidRoadmapStatus").value=item.status||"planned";$("#voidRoadmapPublic").checked=Boolean(item.is_public);$("#voidRoadmapSort").value=Number(item.sort_order)||0;$("#voidRoadmapForm").querySelector('button[type="submit"]').textContent="Update roadmap item";$("#voidRoadmapForm").scrollIntoView({behavior:"smooth",block:"start"});}
    if(del&&requireAdmin()&&window.confirm("Delete this roadmap item?")){db.from("void_roadmap_items").delete().eq("id",del.dataset.roadmapDelete).then(async result=>{if(result.error){status("voidRoadmapAdminStatus",result.error.message,true);return;}await audit("roadmap.deleted","roadmap",del.dataset.roadmapDelete);await loadRoadmapAdmin();await loadRoadmapPublic();});}
  }
  async function loadAdminUsers() {
    if(!requireAdmin())return;
    status("voidAdminUsersStatus","Loading user profiles…");
    const {data,error}=await db.from("ario_profiles").select("id,username,display_name,role,banned,verified,created_at,updated_at").order("created_at",{ascending:false}).limit(500);
    if(error){status("voidAdminUsersStatus","Could not load profiles: "+error.message,true);return;}
    window.voidAdminUserRows=data||[];
    renderAdminUsers();
    status("voidAdminUsersStatus","Loaded "+window.voidAdminUserRows.length+" profiles. Search is limited to the latest 500 profile records.");
  }
  function renderAdminUsers() {
    const root=$("#voidAdminUsersList");if(!root)return;
    const query=($("#voidUserSearch")?.value||"").trim().toLowerCase();
    const rows=(window.voidAdminUserRows||[]).filter(x=>(x.username||"").toLowerCase().includes(query)||(x.display_name||"").toLowerCase().includes(query)||String(x.id).toLowerCase().includes(query));
    root.innerHTML=rows.map(x=>'<article class="void-list-item"><div><b>'+esc(x.display_name||x.username||"Unnamed user")+'</b><small>@'+esc(x.username||"no-username")+' · '+esc(String(x.id))+'</small><small>Role: '+esc(x.role||"member")+' · '+(x.verified?"Verified":"Not verified")+' · '+(x.banned?"Restricted":"Active")+'</small></div><div class="roadmap-admin-actions"><button type="button" class="secondary small" data-admin-verify="'+esc(x.id)+'" data-value="'+(!x.verified)+'">'+(x.verified?"Unverify":"Verify")+'</button><button type="button" class="secondary small" data-admin-ban="'+esc(x.id)+'" data-value="'+(!x.banned)+'">'+(x.banned?"Unrestrict":"Restrict")+'</button></div></article>').join("")||'<p class="saved-note">No matching users.</p>';
    root.querySelectorAll("[data-admin-verify],[data-admin-ban]").forEach(btn=>btn.addEventListener("click",async()=>{
      if(!requireAdmin())return;
      const id=btn.dataset.adminVerify||btn.dataset.adminBan;
      const field=btn.hasAttribute("data-admin-verify")?"verified":"banned";
      const value=btn.dataset.value==="true";
      if(!confirm((field==="banned"?(value?"Restrict":"Remove restriction for "):(value?"Verify":"Remove verification for "))+id+"?"))return;
      const patch={[field]:value,updated_at:new Date().toISOString()};
      const result=await db.from("ario_profiles").update(patch).eq("id",id);
      if(result.error){status("voidAdminUsersStatus","Update failed: "+result.error.message,true);return;}
      await audit(field==="banned"?(value?"user.restricted":"user.unrestricted"):(value?"user.verified":"user.unverified"),"user",id,{[field]:value});
      await loadAdminUsers();
    }));
  }
  async function loadAdminReports() {
    if(!requireAdmin())return;
    status("voidReportsStatus","Loading reports…");
    let query=db.from("void_script_reports").select("id,script_id,reporter_id,reason,details,status,created_at,reviewed_by,reviewed_at").order("created_at",{ascending:false}).limit(300);
    const filter=$("#voidReportFilter").value;if(filter!=="all")query=query.eq("status",filter);
    const {data,error}=await query;
    if(error){status("voidReportsStatus","Could not load reports. Apply the admin migration first: "+error.message,true);return;}
    const ids=[...new Set((data||[]).map(r=>r.script_id).filter(Boolean))];let names={};
    if(ids.length){const scripts=await db.from("scripts").select("id,name,slug").in("id",ids);(scripts.data||[]).forEach(s=>names[s.id]=s);}
    $("#voidReportsList").innerHTML=(data||[]).map(r=>'<article class="void-list-item"><div><b>'+esc(r.reason)+'</b><small>'+esc(names[r.script_id]?.name||"Script removed or unspecified")+' · '+esc(r.status)+' · '+esc(date(r.created_at))+'</small><small>'+esc(r.details||"No additional details")+'</small><small>Report ID: '+esc(r.id)+' · Reporter: '+esc(r.reporter_id||"unknown")+'</small></div><div class="roadmap-admin-actions"><select aria-label="Report status" data-report-status="'+esc(r.id)+'"><option value="open" '+(r.status==="open"?"selected":"")+'>Open</option><option value="reviewing" '+(r.status==="reviewing"?"selected":"")+'>Reviewing</option><option value="resolved" '+(r.status==="resolved"?"selected":"")+'>Resolved</option><option value="dismissed" '+(r.status==="dismissed"?"selected":"")+'>Dismissed</option></select><button class="secondary small" type="button" data-save-report="'+esc(r.id)+'">Save</button></div></article>').join("")||'<p class="saved-note">No reports in this queue.</p>';
    $("#voidReportsList").querySelectorAll("[data-save-report]").forEach(btn=>btn.addEventListener("click",async()=>{
      const id=btn.dataset.saveReport,statusValue=$("#voidReportsList [data-report-status=\""+id+"\"]")?.value;
      if(!statusValue||!requireAdmin())return;
      const result=await db.from("void_script_reports").update({status:statusValue,reviewed_by:user.id,reviewed_at:new Date().toISOString()}).eq("id",id);
      if(result.error){status("voidReportsStatus",result.error.message,true);return;}
      await audit("report.status.updated","report",id,{status:statusValue});await loadAdminReports();
    }));
    status("voidReportsStatus","Loaded "+(data||[]).length+" reports.");
  }
  async function loadAdminInbox() {
    if(!requireAdmin())return;
    status("voidAdminInboxStatus","Loading notifications…");
    const {data,error}=await db.from("void_notifications").select("id,user_id,title,body,kind,link,created_at,read_at,created_by").order("created_at",{ascending:false}).limit(300);
    if(error){status("voidAdminInboxStatus",error.message,true);return;}
    $("#voidAdminInboxList").innerHTML=(data||[]).map(n=>'<article class="void-list-item"><div><b>'+esc(n.title)+'</b><small>'+esc(n.kind)+' · '+esc(n.user_id||"Site-wide broadcast")+' · '+esc(date(n.created_at))+'</small><small>'+esc(n.body||"")+'</small></div><span class="void-badge">'+(n.read_at?"Read":"Unread")+'</span></article>').join("")||'<p class="saved-note">No notifications yet.</p>';
    status("voidAdminInboxStatus","Loaded "+(data||[]).length+" notification records.");
  }
  async function publishAdminNotice(event) {
    event.preventDefault();if(!requireAdmin())return;
    const title=$("#voidAdminNoticeTitle").value.trim(),body=$("#voidAdminNoticeBody").value.trim(),kind=$("#voidAdminNoticeKind").value,link=$("#voidAdminNoticeLink").value.trim();
    if(!title){status("voidAdminNoticeStatus","A title is required.",true);return;}
    if(link){try{const u=new URL(link);if(u.protocol!=="https:")throw new Error();}catch{status("voidAdminNoticeStatus","Link must be a valid HTTPS URL.",true);return;}}
    const {error}=await db.from("void_notifications").insert({user_id:null,title,body,kind,link:link||null,created_by:user.id});
    if(error){status("voidAdminNoticeStatus",error.message,true);return;}
    await audit("notification.broadcast","notification",null,{title,kind});status("voidAdminNoticeStatus","Site-wide notification published.");event.target.reset();await loadAdminInbox();
  }
  async function downloadAdminBackup() {
    if(!requireAdmin())return;
    status("voidBackupStatus","Preparing export…");
    const tables=[
      ["scripts","id,name,slug,category,description,status,release_status,created_at,updated_at,view_count,content"],
      ["ario_profiles","id,username,display_name,bio,role,banned,verified,created_at,updated_at"],
      ["script_events","id,script_id,user_id,event_type,created_at"],
      ["void_audit_logs","id,actor_id,action,target_type,target_id,metadata,created_at"],
      ["void_notifications","id,user_id,title,body,kind,link,created_by,created_at,read_at"],
      ["void_script_reports","id,script_id,reporter_id,reason,details,status,reviewed_by,reviewed_at,created_at"],
      ["void_admin_settings","setting_key,setting_value,updated_by,updated_at"]
    ];
    const backup={product:"VOID DEVELOPMENT",format_version:1,created_at:new Date().toISOString(),note:"Client-side export of accessible rows, maximum 5000 per table; not a complete database/storage backup.",tables:{}};
    const errors=[];
    for(const [table,columns] of tables){
      const result=await db.from(table).select(columns).limit(5000);
      if(result.error){errors.push(table+": "+result.error.message);continue;}
      backup.tables[table]=result.data||[];
    }
    const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download="void-development-backup-"+new Date().toISOString().replace(/[:.]/g,"-")+".json";document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url);
    await audit("backup.exported","backup",null,{tables:Object.keys(backup.tables),errors:errors.length});
    status("voidBackupStatus","Export downloaded. Included "+Object.keys(backup.tables).length+" tables."+ (errors.length?" Some tables were skipped: "+errors.join(" | "):" Check the JSON note; this is not a full Supabase backup."),Boolean(errors.length));
  }
  async function loadAdminSiteSettings() {
    if(!requireAdmin())return;
    status("voidMaintenanceStatus","Loading site controls…");
    const {data,error}=await db.from("void_admin_settings").select("setting_value").eq("setting_key","maintenance_mode").maybeSingle();
    if(error){status("voidMaintenanceStatus","Could not load settings. Apply the admin migration first: "+error.message,true);return;}
    const value=data?.setting_value||{enabled:false,message:"VOID DEVELOPMENT is undergoing scheduled maintenance. Please check back soon."};
    $("#voidMaintenanceEnabled").checked=Boolean(value.enabled);$("#voidMaintenanceMessage").value=value.message||"";
    status("voidMaintenanceStatus","Settings loaded.");
  }
  async function saveAdminSiteSettings(event) {
    event.preventDefault();if(!requireAdmin())return;
    const value={enabled:$("#voidMaintenanceEnabled").checked,message:$("#voidMaintenanceMessage").value.trim().slice(0,500)};
    const {error}=await db.from("void_admin_settings").upsert({setting_key:"maintenance_mode",setting_value:value,updated_by:user.id,updated_at:new Date().toISOString()},{onConflict:"setting_key"});
    if(error){status("voidMaintenanceStatus",error.message,true);return;}
    await audit("site.maintenance.updated","setting", "maintenance_mode",value);
    status("voidMaintenanceStatus",value.enabled?"Maintenance notice enabled for visitors.":"Maintenance notice disabled.");
    loadPublicMaintenanceNotice();
  }
  async function loadPublicMaintenanceNotice() {
    if(!db||isAdmin)return;
    const {data,error}=await db.from("void_admin_settings").select("setting_value").eq("setting_key","maintenance_mode").maybeSingle();
    if(error||!data?.setting_value?.enabled)return;
    let banner=$("#voidPublicMaintenanceNotice");
    if(!banner){banner=document.createElement("aside");banner.id="voidPublicMaintenanceNotice";banner.className="void-maintenance-notice";banner.setAttribute("role","status");document.body.prepend(banner);}
    banner.textContent=data.setting_value.message||"VOID DEVELOPMENT is undergoing scheduled maintenance. Please check back soon.";
  }
  function addProfileArea() {
    if($("#voidProfileSection"))return;
    const section=document.createElement("section");section.id="voidProfileSection";section.className="profile-modal void-profile-modal";section.setAttribute("role","dialog");section.setAttribute("aria-modal","true");section.setAttribute("aria-labelledby","voidProfileTitle");
    section.innerHTML='<div class="section-heading"><div><span class="eyebrow">YOUR SPACE</span><h2 id="voidProfileTitle">Creator profile.</h2><p>Update your public display details, manage favorites, and view earned badges.</p></div><button type="button" class="void-profile-close" id="voidProfileClose" aria-label="Close profile">×</button></div><div class="void-profile-layout"><form id="voidProfileForm" class="void-card"><h3>Profile settings</h3><label>Display name<input id="voidDisplayName" maxlength="60" placeholder="How should we call you?"></label><label>Username<input id="voidUsername" maxlength="30" pattern="[A-Za-z0-9_]+" placeholder="username"></label><label>Avatar image URL (optional)<input id="voidAvatar" type="url" maxlength="500" placeholder="https://…"></label><label>Bio<textarea id="voidBio" maxlength="240" rows="3" placeholder="A little about you…"></textarea></label><button class="small-primary" type="submit">Save profile</button><p id="voidProfileStatus" class="saved-note" role="status">Sign in to edit your profile.</p></form><div class="void-card"><h3>Saved scripts</h3><div id="voidFavoriteList" class="void-list"><p class="saved-note">Sign in to load favorites.</p></div><h3>Your badges</h3><div id="voidMyBadges" class="void-badges"><p class="saved-note">Sign in to load badges.</p></div><div class="void-notifications-head"><h3>Notifications</h3><button type="button" class="secondary small" id="voidRefreshNotifications">Refresh</button></div><div id="voidNotifications" class="void-list"><p class="saved-note">Sign in to load notifications.</p></div></div></div>';
    const backdrop=document.createElement("div");backdrop.id="voidProfileBackdrop";backdrop.className="profile-backdrop";backdrop.hidden=true;backdrop.append(section);document.body.append(backdrop);
    $("#voidProfileClose").addEventListener("click",closeCreatorProfile);backdrop.addEventListener("click",e=>{if(e.target===backdrop)closeCreatorProfile();});
    if(!window.voidProfileEscapeHandler){window.voidProfileEscapeHandler=true;document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("#voidProfileBackdrop")&&!$("#voidProfileBackdrop").hidden)closeCreatorProfile();});}
    const profileActions=$(".profile-actions");if(profileActions&&!$("#voidProfileJump")){const jump=document.createElement("button");jump.id="voidProfileJump";jump.type="button";jump.className="secondary";jump.textContent="Profile & community";jump.addEventListener("click",()=>{const accountBackdrop=$("#profileBackdrop");if(accountBackdrop)accountBackdrop.hidden=true;openCreatorProfile();});profileActions.insertBefore(jump,$("#profileSignOut")||null);}
    $("#voidProfileForm").addEventListener("submit",saveProfile);
    $("#voidRefreshNotifications").addEventListener("click",loadNotifications);
  }
  function openCreatorProfile(){const backdrop=$("#voidProfileBackdrop");if(!backdrop)return;if(!user){toast("Sign in to open your profile.");return;}backdrop.hidden=false;document.body.classList.add("modal-open");loadProfile();$("#voidProfileClose")?.focus();}
  function closeCreatorProfile(){const backdrop=$("#voidProfileBackdrop");if(backdrop)backdrop.hidden=true;document.body.classList.remove("modal-open");}
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
    const ids=(data||[]).map(x=>x.script_id);remoteFavoriteIds=new Set(ids);syncFavoriteButtons();
    if(!ids.length){$("#voidFavoriteList").innerHTML='<p class="saved-note">No saved scripts yet. Add favorites from the script library.</p>';return;}
    const q=await db.from("published_script_metadata").select("id,name,slug,description").in("id",ids);
    $("#voidFavoriteList").innerHTML=(q.data||[]).map(s=>'<article class="void-list-item"><div><b>'+esc(s.name)+'</b><small>'+esc(s.description||s.slug)+'</small></div><button class="secondary small" data-remove-favorite="'+esc(s.id)+'">Remove</button></article>').join("")||'<p class="saved-note">Favorite scripts are no longer published.</p>';
    $("#voidFavoriteList").querySelectorAll("[data-remove-favorite]").forEach(btn=>btn.addEventListener("click",async()=>{const r=await db.from("void_script_favorites").delete().eq("user_id",user.id).eq("script_id",btn.dataset.removeFavorite);if(r.error){toast(r.error.message);return;}loadFavorites();}));
  }
  function syncFavoriteButtons(){document.querySelectorAll("#scriptGrid [data-favorite-id]").forEach(btn=>{const saved=remoteFavoriteIds.has(btn.dataset.favoriteId);btn.classList.toggle("is-favorite",saved);btn.setAttribute("aria-pressed",String(saved));btn.setAttribute("aria-label",(saved?"Remove from":"Add to")+" favorites");btn.textContent=saved?"♥":"♡";});}
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
      const b=document.createElement("button");b.id="voidNotificationJump";b.className="secondary";b.type="button";b.textContent="Updates";b.addEventListener("click",()=>($("#voidPublicUpdates")||$("#voidProfileSection"))?.scrollIntoView({behavior:"smooth"}));nav.insertBefore(b,$("#openProfile")||null);
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
    loadPublicMaintenanceNotice();
  }
  async function init() {
    addAdminFeatures();addProfileArea();bindPublicNotifications();
    if(!window.supabase?.createClient){status("voidProfileStatus","Supabase client library did not load.",true);return;}
    try {
      db=window.supabase.createClient(PROJECT_URL,PUBLIC_KEY);
      const {data}=await db.auth.getSession();await onSession(data.session);
      db.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>onSession(session),0);});
      loadAnnouncementsPublic();loadRoadmapPublic();attachFavoriteTracking();
      const grid=$("#scriptGrid");if(grid&&window.MutationObserver)new MutationObserver(()=>{if(user)syncFavoriteButtons();}).observe(grid,{childList:true,subtree:false});
    } catch(e){console.error("VOID feature initialization failed:",e);status("voidProfileStatus","Could not initialize community features.",true);}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();