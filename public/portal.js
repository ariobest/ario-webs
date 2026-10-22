(() => {
  "use strict";
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const PROJECT_URL = "https://cqtwmxojwwyeasstuhgb.supabase.co";
  const PUBLIC_KEY = "sb_publishable_qBPb1ltQbHNZ-fO3PFmDeg_IQj0QfNB";
  const client = window.supabase && window.supabase.createClient ? window.supabase.createClient(PROJECT_URL, PUBLIC_KEY) : null;
  let user = null, admin = false, adminRoleError = "", authCheckId = 0, mode = "login", authBusy = false, toastTimer = 0;
  const showToast = (msg, kind = "info") => { const t=$("#toast"); if(t){t.textContent=msg;t.dataset.kind=kind;t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),3200);} };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const themes = [
    ["summer","Summer","Warm and ario","#f5b942","#e59b1a","#101a2b","#162238","#22314c","#a9c0e5"],
    ["light","Light","Clean and bright","#4778ed","#315bd1","#f7f9fc","#ffffff","#eaf0fa","#43516b"],
    ["dark","Midnight","Deep navy","#9aabff","#687cf0","#080d18","#101827","#172235","#93a2bb"],
    ["winter","Winter","Frosted blue","#8ee2ff","#48b6e6","#071827","#10283b","#17374e","#a2c4d6"],
    ["autumn","Autumn","Warm amber","#f2ad73","#d8783d","#1b120f","#2a1b16","#38241c","#c4a994"],
    ["spring","Spring","Fresh green","#9ee8b5","#55b77a","#0e1c19","#162923","#1d382e","#a5c5b3"],
    ["ocean","Ocean","Cool deep sea","#5edbff","#1698c5","#071c2a","#0d2b3e","#143b52","#a4ccdd"],
    ["sunset","Sunset","Pink horizon","#ff9aaf","#df527b","#21101f","#31172d","#49203f","#d6a7c2"],
    ["lavender","Lavender","Soft purple","#c7a6ff","#9465df","#181326","#241d38","#33284d","#c0b2d9"],
    ["rose","Rose","Blush and berry","#ff9fca","#d94d91","#24111d","#351827","#4a2137","#d6afc4"],
    ["forest","Forest","Evergreen calm","#a3e6a8","#3eaa68","#0b1c15","#12291d","#1c3928","#a6c9b1"],
    ["mint","Mint","Fresh mint","#9af3d1","#42c99a","#0a1e1b","#102d28","#174039","#a7d8ca"],
    ["cyber","Cyber","Electric neon","#8bffef","#00c9b7","#071318","#0b2028","#10313a","#9cc9d0"],
    ["crimson","Crimson","Bold red","#ff9d9d","#df4747","#200e12","#30151b","#451d26","#d8a8af"],
    ["gold","Gold","Premium gold","#f5d782","#d9a82e","#201a0b","#302710","#453719","#d5c69a"],
    ["slate","Slate","Minimal graphite","#b8c5d6","#8194ad","#111820","#1b2632","#273646","#afbbc9"],
    ["mono","Black Void","Black canvas, white spotlight","#ffffff","#f4f4f5","#050505","#0a0a0a","#101010","#d4d4d8"],
    ["candy","Candy","Playful pastel","#ffb5d2","#e779b0","#241529","#35203b","#4a2b50","#d9b8dc"],
    ["sakura","Sakura","Cherry blossom","#ffc1d1","#e884a2","#21141d","#30202b","#44303e","#d5b7c8"],
    ["arctic","Arctic","Ice and silver","#c1efff","#70bde8","#101d2a","#192b3b","#263f52","#b0c8d8"]
  ].map(a=>({id:a[0],name:a[1],desc:a[2],accent:a[3],strong:a[4],page:a[5],surface:a[6],surface2:a[7],muted:a[8]}));
  function setTheme(id, broadcast = true) {
    const t=themes.find(x=>x.id===id)||themes[0];
    document.documentElement.dataset.theme=t.id;
    const root=document.documentElement.style;
    root.setProperty("--accent",t.accent);root.setProperty("--accent-strong",t.strong);
    root.setProperty("--page",t.page);root.setProperty("--surface",t.surface);root.setProperty("--surface-2",t.surface2);
    root.setProperty("--muted",t.muted);root.setProperty("--glow",t.strong+"22");root.setProperty("--hero-glow",t.accent+"22");
    const label=$("#themeLabel");if(label)label.textContent=t.name.toUpperCase()+" EDITION";
    const meta=$('meta[name="theme-color"]');if(meta)meta.content=t.page;
    try{localStorage.setItem("voidDevelopment.theme.v1",JSON.stringify(t.id));}catch{}
    $$("#themeGrid [data-theme-choice]").forEach(b=>{b.classList.toggle("selected",b.dataset.themeChoice===id);b.setAttribute("aria-pressed",String(b.dataset.themeChoice===id));});
    if (broadcast) document.dispatchEvent(new CustomEvent("voidDevelopment:theme-change", { detail: { id } }));
  }
  document.addEventListener("voidDevelopment:theme-change", event => {
    const id = event.detail?.id;
    if (themes.some(theme => theme.id === id)) setTheme(id, false);
  });
  function renderThemes() {
    const host=$("#themeGrid");if(!host)return;
    host.innerHTML=themes.map(t=>'<button type="button" class="theme-choice" data-theme-choice="'+t.id+'"><span class="theme-preview" style="background:linear-gradient(135deg,'+t.page+','+t.strong+');color:'+t.accent+'">✦</span><b>'+esc(t.name)+'</b><small>'+esc(t.desc)+'</small></button>').join("");
    let current="mono";try{const saved=JSON.parse(localStorage.getItem("voidDevelopment.theme.v1")||'"mono"');current=themes.some(theme=>theme.id===saved)?saved:"mono";}catch{current="mono";}
    setTheme(current);
  }
  function showAuth(which) {
    mode=user && (which==="signup" || which==="login" || !which) ? "account" : (which||"login");
    if(user){$("#authEmail").value=user.email||$("#authEmail").value;$("#authUsername").value=String((user.user_metadata&&user.user_metadata.username)||$("#authUsername").value||"");}
    $("#authBackdrop").hidden=false;document.body.classList.add("modal-open");updateAuthMode();
    $("#authStatus").textContent=user?("You are already signed in as "+(user.email||"your account")+". Your account details are filled in below."):"Supabase email authentication";
    if(user)showToast("You are already signed in.","success");
    $("#closeAuth").focus();
  }
  function closeAuth(){ $("#authBackdrop").hidden=true;document.body.classList.remove("modal-open"); }
  function updateAuthMode(){
    $$(".auth-mode").forEach(b=>b.classList.toggle("active",b.dataset.authMode===mode));
    const accountMode=mode==="account";
    $("#usernameField").hidden=mode!=="signup"&&!accountMode;
    $("#authPasswordField").hidden=mode==="reset"||accountMode;
    $("#authPassword").required=mode!=="reset"&&!accountMode;
    $("#authPassword").value=accountMode?"":$("#authPassword").value;
    $("#authTitle").textContent=accountMode?"You are already signed in":mode==="signup"?"Create your account":mode==="reset"?"Reset your password":mode==="newpassword"?"Choose a new password":"Welcome back";
    $("#authSubtitle").textContent=accountMode?"Your account details are shown below. You can safely close this window.":mode==="signup"?"Sign up with email, username and password.":mode==="reset"?"We will email you a secure password-reset link.":mode==="newpassword"?"Choose a new password for your account.":"Log in with your email and password.";
    $("#authSubmit").textContent=accountMode?"Already signed in":mode==="signup"?"Create account":mode==="reset"?"Send reset link":mode==="newpassword"?"Save new password":"Log in";
    $("#authSubmit").disabled=accountMode||authBusy;
    $("#authPassword").autocomplete=mode==="signup"||mode==="newpassword"?"new-password":"current-password";
    $("#authEmail").readOnly=accountMode;$("#authUsername").readOnly=accountMode;
    $("#resendConfirmation").hidden=mode!=="signup";
    $("#forgotPassword").hidden=mode!=="login";
    $("#authModeSwitch").hidden=accountMode||mode==="reset"||mode==="newpassword";
    $("#signOutButton").hidden=!user;
  }
  function updateUI(){
    $("#openAuth").textContent=user?(admin?"Admin account ▾":"My account ▾"):"Sign up / Log in";
    $("#openProfile").hidden=!user;
    // Admin navigation is shown only after the Supabase role check succeeds.
    $("#openAdmin").hidden=!admin;$("#openAdminFooter").hidden=!admin;
    $("#signOutButton").hidden=!user;
    const notice=$("#adminAccessNotice");
    if(notice){
      notice.hidden=!user;
      notice.textContent=!user?"Sign in with an administrator account to continue.":admin?"Administrator access verified.":"This account is not authorized to access the admin panel.";
      notice.dataset.state=admin?"authorized":user?"restricted":"signed-out";
    }
    if(user)$("#authStatus").textContent="Signed in as "+(user.email||"account")+(admin?" · Admin access verified.":adminRoleError?" · Could not verify admin role: "+adminRoleError:" · Signed in; administrator role not found.");
  }
  async function refresh(userIn){
    const checkId=++authCheckId;
    user=userIn||null;admin=false;adminRoleError="";
    if(user&&client){
      try{
        const {data,error}=await client.from("user_roles").select("role").eq("user_id",user.id).eq("role","admin").maybeSingle();
        if(checkId!==authCheckId)return;
        if(error)adminRoleError=error.message||"role lookup failed";
        else if(data&&data.role==="admin")admin=true;
      }catch(error){if(checkId!==authCheckId)return;adminRoleError=error?.message||"role lookup failed";}
    }
    if(checkId!==authCheckId)return;
    updateUI();
    if(admin)loadAdminScripts();
    const adminRouteRequested = location.pathname === "/admin" || new URLSearchParams(location.search).get("admin") === "1";
    if(adminRouteRequested){
      if(admin){
        if($("#adminBackdrop").hidden)$("#openAdmin").click();
      }else if(!user){
        showAuth("login");
        $("#authStatus").textContent="Sign in with an administrator account to open the admin panel.";
      }else{
        $("#adminBackdrop").hidden=true;
        document.body.classList.remove("modal-open");
        $("#deniedAccountLabel").textContent=(user.email||"SIGNED IN ACCOUNT")+" · MEMBER ACCESS";
        $("#accessDeniedBackdrop").hidden=false;
        document.body.classList.add("modal-open");
      }
    }
    if(!user&&!$("#adminBackdrop").hidden)$("#adminBackdrop").hidden=true;
  }
  async function loadAdminScripts() {
    const host = $("#adminScriptList");
    if (!host || !admin || !client) return;
    host.innerHTML = '<p class="saved-note">Loading scripts from Supabase…</p>';
    try {
      const { data, error } = await client.from("scripts").select("id,name,slug,category,description,status,updated_at").order("updated_at", { ascending: false });
      if (error) throw error;
      const rows = data || [];
      host.dataset.adminDatabaseLoaded = "true";
      host.innerHTML = rows.length ? rows.map(item => '<div class="admin-script-row"><div class="admin-script-symbol">⌘</div><div class="admin-script-info"><b>' + esc(item.name) + '</b><small>' + esc(item.slug) + ' · ' + esc(item.category || "Utility") + ' · ' + esc(item.status || "draft") + '</small></div><button class="text-action" data-edit-script="' + esc(item.id) + '" type="button">Edit</button><button class="text-action" data-toggle-script-status="' + esc(item.id) + '" data-next-status="' + (item.status === "published" ? "draft" : "published") + '" type="button">' + (item.status === "published" ? "Unpublish" : "Publish") + '</button><button class="text-action danger" data-delete-script="' + esc(item.id) + '" type="button">Delete</button></div>').join("") : '<p class="empty-state">No scripts yet. Add your first one above.</p>';
    } catch (error) {
      host.dataset.adminDatabaseLoaded = "false";
      host.innerHTML = '<p class="saved-note">Could not load scripts from Supabase. Check administrator permissions and retry.</p><button type="button" class="secondary small" id="retryAdminScripts">Retry</button>';
    }
  }
  async function handleAuth(event){
    event.preventDefault();if(authBusy)return;
    if($("#authWebsite").value.trim()){showToast("Could not submit this form. Try again.","error");return;}
    if(user&&mode!=="newpassword"){mode="account";updateAuthMode();$("#authStatus").textContent="You are already signed in as "+(user.email||"your account")+". Sign out first if you need to use another account.";showToast("You are already signed in.","info");return;}
    if(!client){$("#authStatus").textContent="Supabase client did not load.";showToast("Authentication is unavailable right now.","error");return;}
    const email=$("#authEmail").value.trim(),password=$("#authPassword").value,username=$("#authUsername").value.trim();
    if(mode==="signup"&&!/^[a-zA-Z0-9_.-]{3,32}$/.test(username)){ $("#authStatus").textContent="Username must be 3–32 letters, numbers, dot, dash or underscore.";return; }
    if((mode==="reset"||mode==="newpassword")&&!email&&mode==="reset"){ $("#authStatus").textContent="Enter your account email first.";return; }
    authBusy=true;$("#authSubmit").disabled=true;$("#authStatus").textContent="Please wait…";
    try{
      if(mode==="signup"){
        const result=await client.auth.signUp({email,password,options:{data:{username:username},emailRedirectTo:window.location.origin}});
        if(result.error)throw result.error;
        if(result.data.session&&result.data.user){
          await client.from("profiles").upsert({id:result.data.user.id,username:username},{onConflict:"id"});
          await refresh(result.data.user);mode="account";updateAuthMode();$("#authStatus").textContent="Account created and signed in. Welcome to VOID DEVELOPMENT!";showToast("Account created successfully.","success");
        }else { $("#resendConfirmation").hidden=false; $("#authStatus").textContent="Account created. Check your inbox and spam folder for the VOID DEVELOPMENT confirmation email.";showToast("Confirmation email requested. Check your inbox.","success"); }
      }else if(mode==="reset"){
        const result=await client.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin});
        if(result.error)throw result.error;
        $("#authStatus").textContent="If that account exists, a password-reset email has been requested. Check your inbox and spam folder.";showToast("If the account exists, a reset email is on its way.","success");
      }else if(mode==="newpassword"){
        const result=await client.auth.updateUser({password});if(result.error)throw result.error;
        await refresh(result.data.user);mode="account";updateAuthMode();$("#authStatus").textContent="Password updated successfully.";showToast("Password updated.","success");
      }else{
        const result=await client.auth.signInWithPassword({email,password});if(result.error)throw result.error;
        const signedInUser=result.data.user;
        const savedUsername=String((signedInUser.user_metadata&&signedInUser.user_metadata.username)||username||"").trim();
        if(savedUsername) { const profileResult=await client.from("profiles").upsert({id:signedInUser.id,username:savedUsername},{onConflict:"id"}); if(profileResult.error) console.warn("Profile username sync failed:",profileResult.error.message); }
        await refresh(signedInUser);mode="account";updateAuthMode();$("#authStatus").textContent="You are already signed in as "+(signedInUser.email||"your account")+".";showToast(admin?"Welcome back, admin.":"Signed in successfully.","success");
      }
    }catch(e){$("#authStatus").textContent=e.message||"Could not authenticate.";showToast(e.message||"Authentication failed.","error");}
    finally{authBusy=false;$("#authSubmit").disabled=mode==="account";}
  }

  async function openProfile(){
    if(!user){showAuth("login");return;}
    $("#profileBackdrop").hidden=false;document.body.classList.add("modal-open");
    const meta=user.user_metadata||{};
    let username=String(meta.username||meta.name||"").trim();
    $("#profileUsername").textContent=username||"Not set";
    $("#profileEmail").textContent=user.email||"Not provided";
    $("#profileRole").textContent=admin?"Administrator":"Member";
    $("#profileJoined").textContent=user.created_at?new Date(user.created_at).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"}):"Unavailable";
    $("#profileUserId").textContent=user.id||"Unavailable";
    $("#profileAvatar").textContent=(username||user.email||"V").trim().charAt(0).toUpperCase();
    $("#profileSubtitle").textContent=admin?"Administrator profile":"Member profile";
    $("#profileStatus").textContent="Loaded from your signed-in Supabase session.";
    if(client&&user.id){
      try{
        const {data,error}=await client.from("profiles").select("username").eq("id",user.id).maybeSingle();
        if(!error&&data&&data.username){username=String(data.username);$("#profileUsername").textContent=username;$("#profileAvatar").textContent=username.charAt(0).toUpperCase();}
      }catch{}
    }
  }
  function closeProfile(){ $("#profileBackdrop").hidden=true;document.body.classList.remove("modal-open");}
  function saveSignupDraft(){try{sessionStorage.setItem("arioScripts.signupDraft.v1",JSON.stringify({email:$("#authEmail").value.trim(),username:$("#authUsername").value.trim()}));}catch{}}
  function init(){
    renderThemes();
    $("#openAuth").addEventListener("click",()=>showAuth(user?"account":"signup"));
    $("#openProfile").addEventListener("click",openProfile);
    $("#closeProfile").addEventListener("click",closeProfile);
    $("#profileBackdrop").addEventListener("click",e=>{if(e.target===$("#profileBackdrop"))closeProfile();});
    $("#profileManageAccount").addEventListener("click",()=>{closeProfile();showAuth("account");});
    $("#profileSignOut").addEventListener("click",async()=>{if(!client)return;const {error}=await client.auth.signOut();if(error){$("#profileStatus").textContent=error.message;return;}closeProfile();await refresh(null);mode="login";updateAuthMode();showToast("Signed out.","success");});
    $("#copyProfileId").addEventListener("click",async()=>{if(!user||!user.id)return;try{await navigator.clipboard.writeText(user.id);showToast("User ID copied.","success");}catch{window.prompt("Copy your user ID:",user.id);}});
    $("#deniedSwitchAccount").addEventListener("click",async()=>{if(client){const {error}=await client.auth.signOut();if(error){showToast(error.message||"Could not sign out.","error");return;}}$("#accessDeniedBackdrop").hidden=true;document.body.classList.remove("modal-open");await refresh(null);mode="login";showAuth("login");$("#authStatus").textContent="Sign in with an administrator account to continue.";});

    $("#heroSignUp").addEventListener("click",event=>{event.preventDefault();showAuth("signup");});
    try{const draft=JSON.parse(sessionStorage.getItem("arioScripts.signupDraft.v1")||"null");if(draft){if(draft.email)$("#authEmail").value=draft.email;if(draft.username)$("#authUsername").value=draft.username;}}catch{}
    $("#authEmail").addEventListener("input",saveSignupDraft);$("#authUsername").addEventListener("input",saveSignupDraft);
    $("#closeAuth").addEventListener("click",closeAuth);
    $("#authBackdrop").addEventListener("click",e=>{if(e.target===$("#authBackdrop"))closeAuth();});
    $$(".auth-mode").forEach(b=>b.addEventListener("click",()=>{mode=b.dataset.authMode;updateAuthMode();}));
    $("#authForm").addEventListener("submit",handleAuth);
    const authParams=new URLSearchParams(location.search);if(authParams.get("auth")==="signup"||location.hash==="#signup")showAuth("signup");
    $("#forgotPassword").addEventListener("click",()=>{mode="reset";updateAuthMode();$("#authStatus").textContent="Enter your email and we will send a secure reset link.";});
    $("#resendConfirmation").addEventListener("click",async()=>{if(!client)return;const email=$("#authEmail").value.trim();if(!email){$("#authStatus").textContent="Enter the email address you signed up with first.";return;}const b=$("#resendConfirmation");b.disabled=true;try{const {error}=await client.auth.resend({type:"signup",email,options:{emailRedirectTo:window.location.origin}});if(error)throw error;$("#authStatus").textContent="If confirmation is still needed, a new email has been requested. Check your inbox and spam folder.";showToast("Confirmation email requested.","success");}catch(e){$("#authStatus").textContent=e.message||"Could not resend confirmation.";showToast(e.message||"Could not resend confirmation.","error");}finally{b.disabled=false;}});
    $("#signOutButton").addEventListener("click",async()=>{if(!client)return;const {error}=await client.auth.signOut();if(error){$("#authStatus").textContent=error.message;showToast(error.message,"error");return;}await refresh(null);mode="login";updateAuthMode();$("#authStatus").textContent="You have signed out.";showToast("Signed out.","success");});
    $("#adminTabs").addEventListener("click",e=>{
      const b=e.target.closest("[data-admin-tab]");if(!b)return;
      if(!admin){e.preventDefault();showToast("Administrator access required.");$("#adminBackdrop").hidden=true;showAuth("login");return;}
      $$(".admin-tab").forEach(x=>x.classList.toggle("active",x===b));
      $$(".admin-pane").forEach(x=>{x.hidden=x.dataset.pane!==b.dataset.adminTab;x.classList.toggle("active",!x.hidden);});
      if(b.dataset.adminTab==="keys")loadKeys();
      if(b.dataset.adminTab==="api")checkApiStatus();
      if(b.dataset.adminTab==="verification")loadVerificationPanel();
      if(b.dataset.adminTab==="media")loadMedia();
      if(b.dataset.adminTab==="settings"||b.dataset.adminTab==="discord")loadSiteSettings();
      if(b.dataset.adminTab==="overview")loadAdminOverview();
    },true);
    $("#themeGrid").addEventListener("click",e=>{const b=e.target.closest("[data-theme-choice]");if(b)setTheme(b.dataset.themeChoice);});
    $("#adminContent").addEventListener("click", event => {
      const choice = event.target.closest("[data-appearance-theme]");
      if (choice) setTheme(choice.dataset.appearanceTheme);
      if (event.target.closest("#resetTheme")) setTheme("mono");
    });
    $("#refreshAdminOverview").addEventListener("click", loadAdminOverview);
    $("#scriptForm").addEventListener("submit",async e=>{
      if(!admin||!user||!client)return;
      e.preventDefault();e.stopImmediatePropagation();
      const name=$("#newScriptName").value.trim(),slug=$("#newScriptSlug").value.trim().toLowerCase(),category=$("#newScriptCategory").value,status=$("#newScriptStatus").value,release_status=$("#newScriptReleaseStatus")?.value||"active",banner_url=$("#newScriptBannerUrl")?.value.trim()||null,showcase_url=$("#newScriptShowcaseUrl")?.value.trim()||null,description=$("#newScriptDescription").value.trim(),link=$("#newScriptLink").value.trim(),id=$("#editScriptId").value;
      if(!name||!description||!slug){showToast("Enter a script name, slug and description.");return;}
      if(slug.length>80){showToast("Slug must be 80 characters or fewer.");$("#newScriptSlug").focus();return;}
      if(!["published","draft","hidden"].includes(status)){showToast("Choose a valid publication status.");return;}
      if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)){showToast("Slug must use lowercase letters, numbers and hyphens.");$("#newScriptSlug").focus();return;}
      const duplicate = await client.from("scripts").select("id").eq("slug", slug).neq("id", id || "00000000-0000-0000-0000-000000000000").maybeSingle();
      if (duplicate.error) { showToast("Could not verify slug uniqueness. Please retry."); return; }
      if (duplicate.data) { showToast("That slug is already in use. Choose a unique slug."); $("#newScriptSlug").focus(); return; }
      const content=$("#newScriptContent").value;
      if(!content.trim()){showToast("Add the Lua source before saving.");$("#newScriptContent").focus();return;}
      if(content.length>200000){showToast("Lua source is too large (200,000 characters maximum).");return;}
      const record={name,slug,category,description,link:link||null,content:content||null,status,release_status,banner_url,showcase_url,updated_at:new Date().toISOString()};
      let result;
      if(id&&/^[0-9a-f-]{36}$/i.test(id)) result=await client.from("scripts").update(record).eq("id",id);
      else result=await client.from("scripts").insert({...record,owner_id:user.id});
      if(result.error){showToast(result.error.code==="23505"?"That slug is already in use. Choose a unique slug.":"Could not save the script. Check your permissions and try again.");return;}
      showToast("Script saved to Supabase.");location.reload();
    },true);
    $("#newScriptName").addEventListener("input",()=>{const field=$("#newScriptSlug");if(!field||field.dataset.touched==="true")return;field.value=$("#newScriptName").value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");if($("#scriptSlugPreview"))$("#scriptSlugPreview").textContent="Public page: /scripts/"+(field.value||"your-script")+" · loader: /script/"+(field.value||"your-script");});
    $("#newScriptSlug").addEventListener("input",e=>{e.target.dataset.touched="true";e.target.value=e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"").replace(/-{2,}/g,"-").replace(/^-|-$/g,"");if($("#scriptSlugPreview"))$("#scriptSlugPreview").textContent="Public page: /scripts/"+(e.target.value||"your-script")+" · loader: /script/"+(e.target.value||"your-script");});
    $("#adminScriptList").addEventListener("click",async e=>{
      const button=e.target.closest("[data-delete-script]");if(!button||!admin||!client)return;
      const id=button.dataset.deleteScript;if(!/^[0-9a-f-]{36}$/i.test(id))return;
      e.preventDefault();e.stopImmediatePropagation();
      if(!confirm("Delete this script from Supabase?"))return;
      const result=await client.from("scripts").delete().eq("id",id);
      if(result.error){showToast("Could not delete the script. Check administrator permissions and try again.");return;}
      showToast("Script deleted from Supabase.");location.reload();
    },true);
    const API_URL = "https://cqtwmxojwwyeasstuhgb.supabase.co/functions/v1/script-api";
    async function callScriptApi(payload, needsAdmin = true) {
      if (!client) throw new Error("Supabase client is unavailable.");
      const { data } = await client.auth.getSession();
      const headers = { "Content-Type": "application/json", "apikey": PUBLIC_KEY };
      if (needsAdmin) {
        if (!data.session?.access_token) throw new Error("Sign in as an administrator first.");
        headers.Authorization = "Bearer " + data.session.access_token;
      }
      const response = await fetch(API_URL, {
        method: "POST", headers, body: JSON.stringify(payload), cache: "no-store"
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "API request failed (" + response.status + ").");
      return result;
    }
    async function loadKeys() {
      const status = $("#keyStatus");
      const list = $("#keyList");
      const select = $("#keyScriptId");
      if (!admin || !client) {
        status.textContent = "Sign in as an administrator to manage keys.";
        list.innerHTML = '<p class="saved-note">Administrator access is required.</p>';
        return;
      }
      status.textContent = "Loading published scripts and keys…";
      try {
        const scriptsResult = await client.from("scripts").select("id,name,slug").eq("status", "published").order("created_at", { ascending: false });
        if (scriptsResult.error) throw scriptsResult.error;
        const options = scriptsResult.data || [];
        select.innerHTML = '<option value="">Choose a published script</option>' + options.map(s => '<option value="' + esc(s.id) + '">' + esc(s.name) + ' · ' + esc(s.slug) + '</option>').join("");
        const result = await callScriptApi({ action: "list-keys" });
        list.innerHTML = result.keys.length ? result.keys.map(k => {
          const scriptName = Array.isArray(k.scripts) ? k.scripts[0]?.name : k.scripts?.name;
          const expired = k.expires_at && Date.parse(k.expires_at) <= Date.now();
          const state = k.revoked_at ? "Revoked" : expired ? "Expired" : k.max_uses !== null && k.use_count >= k.max_uses ? "Limit reached" : "Active";
          return '<article class="key-row"><div class="key-row-main"><b>' + esc(k.label) + '</b><small>' + esc(scriptName || k.script_id) + ' · ' + esc(k.key_prefix) + '…</small><small>' + esc(state) + ' · ' + esc(String(k.use_count)) + (k.max_uses === null ? ' loads' : '/' + esc(String(k.max_uses)) + ' loads') + (k.expires_at ? ' · expires ' + esc(new Date(k.expires_at).toLocaleDateString()) : '') + '</small></div>' + (!k.revoked_at ? '<button class="text-action danger" type="button" data-revoke-key="' + esc(k.id) + '">Revoke</button>' : '') + '</article>';
        }).join("") : '<p class="saved-note">No access keys yet. Create one above.</p>';
        status.textContent = "Loaded " + result.keys.length + " key record(s).";
      } catch (error) {
        status.textContent = error.message || "Could not load access keys.";
        list.innerHTML = '<p class="saved-note">Could not load keys. Check admin role and API status.</p>';
      }
    }
    async function checkApiStatus() {
      const host = $("#apiStatus");
      host.innerHTML = '<span class="status-dot"></span><span>Checking API…</span>';
      try {
        const response = await fetch(API_URL + "?action=health", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error("API health check failed.");
        host.innerHTML = '<span class="status-dot"></span><span>Online · v' + esc(result.version) + ' · checked ' + esc(new Date(result.timestamp).toLocaleTimeString()) + '</span>';
      } catch {
        host.innerHTML = '<span class="status-dot api-dot-offline"></span><span>Could not reach the API. Check the function deployment and network.</span>';
      }
    }
    async function loadVerificationPanel() {
      const host = $("#verificationApiStatus");
      const menu = $("#verificationScriptMenu");
      if (host) host.innerHTML = '<span class="status-dot"></span><span>Checking verification endpoint…</span>';
      if (menu) menu.innerHTML = '<p class="saved-note">Loading published scripts…</p>';
      try {
        const response = await fetch(API_URL + "?action=health", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error("Health check failed.");
        if (host) host.innerHTML = '<span class="status-dot"></span><span>Online · ' + esc(result.service || "Script API") + ' · v' + esc(result.version) + ' · ' + esc(new Date(result.timestamp).toLocaleTimeString()) + '</span>';
      } catch (error) {
        if (host) host.innerHTML = '<span class="status-dot api-dot-offline"></span><span>Offline or unreachable. Check the deployed script-api function.</span>';
      }
      if (!client || !admin || !menu) return;
      try {
        const { data, error } = await client.from("scripts").select("name,slug").eq("status", "published").order("name", { ascending: true });
        if (error) throw error;
        const rows = data || [];
        menu.innerHTML = rows.length ? rows.map(script => '<button type="button" class="void-picker-option" role="option" data-verification-slug="' + esc(script.slug) + '" data-verification-name="' + esc(script.name) + '"><span>' + esc(script.name) + '</span><small>' + esc(script.slug) + '</small></button>').join("") : '<p class="saved-note">No published scripts are available.</p>';
        if (!rows.some(script => script.slug === $("#verificationScriptSlug")?.value)) {
          $("#verificationScriptSlug").value = "";
          $("#verificationScriptLabel").textContent = "Choose a published script";
        }
      } catch (error) {
        menu.innerHTML = '<p class="saved-note">Could not load published scripts. Check database permissions.</p>';
      }
    }
    async function testVerificationKey() {
      const slug = $("#verificationScriptSlug")?.value || "";
      const key = ($("#verificationKeyInput")?.value || "").trim().toUpperCase();
      const status = $("#verificationTestResult");
      const button = $("#testVerificationKey");
      if (!slug) { status.textContent = "Choose a published script first."; return; }
      if (!/^(?:VOID|ARIO)-[A-Z0-9]{2}-[A-Z0-9]{3}-[A-Z0-9]{4}$/.test(key)) { status.textContent = "Use the format VOID-XX-XXX-XXXX."; return; }
      button.disabled = true;
      status.textContent = "Validating key without consuming a load…";
      try {
        const result = await callScriptApi({ action: "validate", key, script: slug }, false);
        status.textContent = "Valid ✓ " + (result.script?.name || slug) + (result.remaining_uses === null ? " · unlimited loads" : " · " + result.remaining_uses + " remaining load(s)") + (result.expires_at ? " · expires " + new Date(result.expires_at).toLocaleString() : "");
        status.dataset.state = "success";
      } catch (error) {
        status.textContent = error.message || "Key verification failed.";
        status.dataset.state = "error";
      } finally { button.disabled = false; }
    }
    function bindVerificationControls() {
      const trigger = $("#verificationScriptTrigger"), menu = $("#verificationScriptMenu"), picker = $("#verificationScriptPicker");
      trigger?.addEventListener("click", () => {
        const opening = menu.hidden;
        menu.hidden = !opening;
        trigger.setAttribute("aria-expanded", String(opening));
        picker.classList.toggle("is-open", opening);
      });
      menu?.addEventListener("click", event => {
        const option = event.target.closest("[data-verification-slug]");
        if (!option) return;
        $("#verificationScriptSlug").value = option.dataset.verificationSlug;
        $("#verificationScriptLabel").textContent = option.dataset.verificationName + " · " + option.dataset.verificationSlug;
        menu.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
        picker.classList.remove("is-open");
        $(".void-picker-option", menu).forEach(button => button.setAttribute("aria-selected", String(button === option)));
      });
      document.addEventListener("click", event => {
        if (picker && !picker.contains(event.target)) {
          menu.hidden = true;
          trigger?.setAttribute("aria-expanded", "false");
          picker.classList.remove("is-open");
        }
      });
      $("#testVerificationKey")?.addEventListener("click", testVerificationKey);
      $("#refreshVerification")?.addEventListener("click", loadVerificationPanel);
      $("#clearVerificationTest")?.addEventListener("click", () => {
        $("#verificationKeyInput").value = "";
        $("#verificationTestResult").textContent = "Select a script and enter a key to test.";
        $("#verificationTestResult").dataset.state = "";
      });
      $("#verificationKeyInput")?.addEventListener("input", event => {
        event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 19);
      });
      $("#copyVerificationSample")?.addEventListener("click", async () => {
        const sample = $("#verificationSampleCode")?.value || "";
        try { await navigator.clipboard.writeText(sample); $("#copyVerificationSample").textContent = "Copied ✓"; setTimeout(() => $("#copyVerificationSample").textContent = "Copy sample", 1400); }
        catch { $("#verificationSampleCode").select(); document.execCommand("copy"); }
      });
    }
    bindVerificationControls();
    async function loadMedia() {
      const host = $("#mediaGrid");
      const status = $("#mediaStatus");
      if (!host) return;
      if (!admin || !client) {
        host.innerHTML = '<p class="saved-note">Administrator access is required.</p>';
        return;
      }
      host.innerHTML = '<p class="saved-note">Loading media…</p>';
      try {
        const storage = client.storage.from("void-files");
        const files = [];
        const pageSize = 100;
        for (let offset = 0; ; offset += pageSize) {
          const { data, error } = await storage.list("", { limit: pageSize, offset, sortBy: { column: "created_at", order: "desc" } });
          if (error) throw error;
          const page = (data || []).filter(file => file.name && file.id);
          files.push(...page);
          if (!data || data.length < pageSize) break;
        }
        if (!files.length) {
          host.innerHTML = '<p class="saved-note">No media uploaded yet. Upload a logo, thumbnail or other media above.</p>';
          return;
        }
        host.innerHTML = files.map(file => {
          const path = file.name;
          const publicUrl = client.storage.from("void-files").getPublicUrl(path).data.publicUrl;
          const mime = file.metadata?.mimetype || "";
          const image = mime.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg)$/i.test(path);
          const video = mime.startsWith("video/") || /\.(mp4|webm)$/i.test(path);
          const preview = image
            ? '<img src="' + esc(publicUrl) + '" alt="' + esc(path) + '" loading="lazy">'
            : video ? '<video src="' + esc(publicUrl) + '" muted playsinline controls></video>' : '<div class="media-file-icon">' + (mime.startsWith("audio/") ? '♫' : '▤') + '</div>';
          return '<article class="media-card"><div class="media-preview">' + preview + '</div><div class="media-card-info"><b title="' + esc(path) + '">' + esc(path) + '</b><small>' + esc(mime || "Media file") + ' · ' + esc(String(Math.round((file.metadata?.size || 0) / 1024))) + ' KB</small><div class="media-card-actions"><button class="secondary small" type="button" data-media-copy="' + esc(path) + '">Copy URL</button><button class="text-action danger" type="button" data-media-delete="' + esc(path) + '">Delete</button></div></div></article>';
        }).join("");
        if (status) status.textContent = "Loaded " + files.length + " file(s).";
      } catch (error) {
        host.innerHTML = '<p class="saved-note">Could not load media: ' + esc(error.message || "Storage request failed") + '</p>';
        if (status) status.textContent = "Check that the void-files bucket and admin storage policies exist.";
      }
    }
    async function loadAdminOverview() {
      const status = $("#adminOverviewStatus");
      if (!admin || !client) { status.textContent = "Sign in as an administrator to load live totals."; return; }
      status.textContent = "Loading live totals…";
      try {
        const { data, error } = await client.from("scripts").select("id,status");
        if (error) throw error;
        const rows = data || [];
        $("#overviewTotalScripts").textContent = String(rows.length);
        $("#overviewPublishedScripts").textContent = String(rows.filter(row => row.status === "published").length);
        $("#overviewDraftScripts").textContent = String(rows.filter(row => row.status === "draft").length);
        status.textContent = "Live counts loaded from Supabase.";
      } catch (error) {
        $("#overviewTotalScripts").textContent = "—";
        $("#overviewPublishedScripts").textContent = "—";
        $("#overviewDraftScripts").textContent = "—";
        status.textContent = "Could not load overview totals. Check administrator access and retry.";
      }
    }
    async function loadSiteSettings() {
      const status = $("#siteSettingsStatus");
      if (!admin || !client) { status.textContent = "Sign in as an administrator to edit site settings."; return; }
      status.textContent = "Loading saved settings…";
      try {
        const { data, error } = await client.from("site_settings").select("value,is_public").eq("key", "site_config").maybeSingle();
        if (error) throw error;
        const value = data?.value || {};
        $("#settingSiteName").value = value.siteName || "VOID DEVELOPMENT";
        $("#settingTagline").value = value.tagline || "";
        $("#settingAnnouncement").value = value.announcement || "";
        $("#settingAnnouncementEnabled").checked = Boolean(value.announcementEnabled);
        $("#settingDefaultTheme").value = value.defaultTheme || "mono";
        if($("#settingDiscordUrl"))$("#settingDiscordUrl").value=value.discordUrl||"";
        if($("#settingDiscordDescription"))$("#settingDiscordDescription").value=value.discordDescription||"";
        status.textContent = data ? "Loaded from Supabase. Public fields are currently " + (data.is_public ? "published." : "private.") : "No saved settings yet. Save to create the site configuration.";
      } catch (error) { status.textContent = error.message || "Could not load site settings."; }
    }
    $("#scriptFileInput").addEventListener("change", async event => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (file.size > 200000) { showToast("Source file exceeds the 200,000 character limit."); event.target.value = ""; return; }
      try {
        const source = await file.text();
        if (source.length > 200000) throw new Error("File exceeds the 200,000 character limit.");
        $("#newScriptContent").value = source;
        $("#sourceCharCount").textContent = source.length.toLocaleString() + " characters";
        if (!$("#newScriptName").value.trim()) $("#newScriptName").value = file.name.replace(/\.(lua|luau|txt|js|ts|json)$/i, "").replace(/[_-]+/g, " ");
        showToast("Imported " + file.name + ". Save the script to publish it.");
      } catch (error) { showToast(error.message || "Could not read that file.", "error"); }
    });
    $("#importScriptFile").addEventListener("click", () => $("#scriptFileInput").click());
    $("#newScriptContent").addEventListener("input", () => {
      $("#sourceCharCount").textContent = $("#newScriptContent").value.length.toLocaleString() + " characters";
    });
    $("#macCloseAdmin").addEventListener("click", () => { $("#adminBackdrop").hidden = true; document.body.classList.remove("modal-open"); });
    $("#macMinimizeAdmin").addEventListener("click", () => $("#adminBackdrop").querySelector(".admin-modal").classList.toggle("is-minimized"));
    $("#macFocusAdmin").addEventListener("click", () => {
      const modal = $("#adminBackdrop").querySelector(".admin-modal");
      modal.classList.remove("is-minimized");
      modal.classList.toggle("is-focused");
    });
    $("#importProtectorFile").addEventListener("click", () => $("#protectorFile").click());
    $("#protectorFile").addEventListener("change", async event => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (file.size > 200000) { $("#protectorStatus").textContent = "Lua source must be 200,000 bytes or smaller."; return; }
      try {
        $("#protectorSource").value = await file.text();
        const guessedName = file.name.replace(/\\.(lua|luau|txt)$/i, "");
        if (!$("#protectorName").value.trim()) $("#protectorName").value = guessedName;
        if (!$("#protectorSlug").value.trim()) $("#protectorSlug").value = guessedName.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
        $("#protectorStatus").textContent = "Imported " + file.name + ". Click Create script + generate loadstring to save a protected draft; publish it manually later.";
      } catch (error) { $("#protectorStatus").textContent = error.message || "Could not read the Lua file."; }
    });
    $("#protectorName").addEventListener("input", () => {
      const slugField = $("#protectorSlug");
      if (!slugField || slugField.dataset.touched === "true") return;
      slugField.value = $("#protectorName").value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
    });
    $("#protectorSlug").addEventListener("input", event => {
      event.target.dataset.touched = "true";
      event.target.value = event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/-{2,}/g, "-").replace(/^-|-$/g, "").slice(0, 80);
    });
    $("#clearProtector").addEventListener("click", () => {
      $("#protectorName").value = "";
      $("#protectorSlug").value = "";
      $("#protectorSlug").dataset.touched = "false";
      $("#protectorSource").value = "";
      $("#protectorFile").value = "";
      $("#protectedScriptUrl").value = "";
      $("#protectedLoaderOutput").value = "";
      const progress = $("#protectedProgress"); if (progress) { progress.dataset.state = "idle"; progress.setAttribute("aria-valuenow", "0"); }
      if ($("#protectedProgressFill")) $("#protectedProgressFill").style.width = "0%";
      if ($("#protectedProgressLabel")) $("#protectedProgressLabel").textContent = "Waiting for a script";
      if ($("#protectedProgressPercent")) $("#protectedProgressPercent").textContent = "0%";
      $("#protectorStatus").textContent = "Protector cleared.";
    });
    $("#generateProtectedLoader").addEventListener("click", async () => {
      if (!admin || !user || !client) { showToast("Administrator access required.", "error"); return; }
      const name = $("#protectorName").value.trim();
      const slug = $("#protectorSlug").value.trim().toLowerCase();
      const source = $("#protectorSource").value;
      if (!name) { $("#protectorStatus").textContent = "Enter a script name."; $("#protectorName").focus(); return; }
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) { $("#protectorStatus").textContent = "Use a valid slug with lowercase letters, numbers and hyphens."; $("#protectorSlug").focus(); return; }
      if (!source.trim()) { $("#protectorStatus").textContent = "Paste or import Lua/Luau source first."; $("#protectorSource").focus(); return; }
      if (new TextEncoder().encode(source).length > 200000) { $("#protectorStatus").textContent = "Lua source must be 200,000 bytes or smaller."; return; }
      const status = $("#protectorStatus");
      const createButton = $("#generateProtectedLoader");
      createButton.disabled = true;
      const progress = $("#protectedProgress");
      const progressFill = $("#protectedProgressFill");
      const progressLabel = $("#protectedProgressLabel");
      const progressPercent = $("#protectedProgressPercent");
      const setProgress = (value, label, state = "loading") => {
        if (!progress || !progressFill) return;
        const safeValue = Math.max(0, Math.min(100, value));
        progress.dataset.state = state;
        progress.setAttribute("aria-valuenow", String(safeValue));
        progressFill.style.width = safeValue + "%";
        if (progressLabel) progressLabel.textContent = label;
        if (progressPercent) progressPercent.textContent = safeValue + "%";
      };
      setProgress(8, "Checking slug…");
      status.textContent = "Checking slug and preparing a protected draft…";
      try {
        setProgress(24, "Checking availability…");
        const duplicate = await client.from("scripts").select("id").eq("slug", slug).maybeSingle();
        if (duplicate.error) throw new Error("Could not verify slug uniqueness: " + duplicate.error.message);
        if (duplicate.data) throw new Error("That slug already exists. Choose a different slug.");
        const record = {
          name,
          slug,
          category: "Utility",
          description: "Protected draft created from the VOID DEVELOPMENT Script Protector.",
          link: null,
          content: source,
          status: "draft",
          release_status: "active",
          owner_id: user.id,
          updated_at: new Date().toISOString()
        };
        setProgress(48, "Saving script source…");
        const saved = await client.from("scripts").insert(record);
        if (saved.error) throw new Error("Could not publish script: " + saved.error.message);
        setProgress(76, "Generating protected draft URL…");
        const pathWords = ["amber","atlas","birch","black","blue","cedar","cloud","cobalt","comet","coral","dawn","delta","drift","echo","ember","fern","frost","ghost","glacier","gold","harbor","hollow","indigo","ivory","jade","lunar","maple","marble","midnight","moss","nova","onyx","orbit","pearl","pine","quiet","raven","river","shadow","silver","solar","stone","velvet","void","willow","winter"];
        const randomWord = () => pathWords[crypto.getRandomValues(new Uint32Array(1))[0] % pathWords.length];
        const publicPath = [randomWord(), randomWord(), randomWord(), randomWord()].join("-");
        const sourceUrl = "https://arioscripts.cyou/" + publicPath + "?s=" + encodeURIComponent(slug);
        const loader = "loadstring(game:HttpGet(" + JSON.stringify(sourceUrl) + "))()";
        $("#protectedScriptUrl").value = sourceUrl;
        $("#protectedLoaderOutput").value = loader;
        setProgress(100, "Protected URL ready", "done");
        status.textContent = "Protected draft saved. It is NOT public yet. Review it in Scripts and manually choose Published when ready.";
        showToast("Protected draft saved — not released.", "success");
        loadAdminScripts();
      } catch (error) {
        if (typeof setProgress === "function") setProgress(100, "Publishing failed — review the message below", "error");
        status.textContent = error?.message || "Could not create the hosted script.";
        showToast(status.textContent, "error");
      } finally {
        createButton.disabled = false;
      }
    });
    $("#copyProtectedLoader").addEventListener("click", async () => {
      const output = $("#protectedLoaderOutput").value;
      if (!output) { $("#protectorStatus").textContent = "Create the script first."; return; }
      try { await navigator.clipboard.writeText(output); showToast("Loadstring copied.", "success"); }
      catch { window.prompt("Copy Roblox loadstring:", output); }
    });
    $("#mediaUploadForm").addEventListener("submit", async event => {
      event.preventDefault();
      if (!admin || !client) { showToast("Administrator access required.", "error"); return; }
      const input = $("#mediaFile"), file = input.files?.[0];
      if (!file) { $("#mediaStatus").textContent = "Choose a file first."; return; }
      const uploadType = file.type || "application/octet-stream";
      const button = $("#uploadMediaButton"); button.disabled = true;
      $("#mediaStatus").textContent = "Uploading " + file.name + "…";
      try {
        const label = $("#mediaLabel").value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        const filename = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
        const path = Date.now() + (label ? "-" + label : "") + "-" + filename;
        const { error } = await client.storage.from("void-files").upload(path, file, {
          cacheControl: "3600", upsert: false, contentType: uploadType
        });
        if (error) throw error;
        $("#mediaStatus").textContent = "Uploaded successfully.";
        $("#mediaUploadForm").reset();
        showToast("Media uploaded.", "success");
        await loadMedia();
      } catch (error) {
        $("#mediaStatus").textContent = error.message || "Upload failed. Check storage policies.";
      } finally { button.disabled = false; }
    });
    $("#mediaGrid").addEventListener("click", async event => {
      const copy = event.target.closest("[data-media-copy]");
      const remove = event.target.closest("[data-media-delete]");
      if (copy && client) {
        const url = client.storage.from("void-files").getPublicUrl(copy.dataset.mediaCopy).data.publicUrl;
        try { await navigator.clipboard.writeText(url); showToast("Public media URL copied.", "success"); }
        catch { window.prompt("Copy public media URL:", url); }
      } else if (remove && client && admin) {
        if (!confirm("Delete this media file? Any page using its URL will stop displaying it.")) return;
        remove.disabled = true;
        const { error } = await client.storage.from("void-files").remove([remove.dataset.mediaDelete]);
        if (error) { showToast(error.message || "Could not delete media.", "error"); remove.disabled = false; return; }
        showToast("Media deleted.", "success"); await loadMedia();
      }
    });
    $("#refreshMedia").addEventListener("click", loadMedia);
    $("#reloadSiteSettings").addEventListener("click", loadSiteSettings);
    $("#siteSettingsForm").addEventListener("submit", async event => {
      event.preventDefault();
      if (!admin || !client || !user) { showToast("Administrator access required.", "error"); return; }
      const existingSettings = await client.from("site_settings").select("value").eq("key", "site_config").maybeSingle();
      if (existingSettings.error) { $("#siteSettingsStatus").textContent = "Could not load existing settings; nothing was overwritten."; return; }
      const value = {
        ...(existingSettings.data?.value || {}),
        siteName: $("#settingSiteName").value.trim() || "VOID DEVELOPMENT",
        tagline: $("#settingTagline").value.trim(),
        announcement: $("#settingAnnouncement").value.trim(),
        announcementEnabled: $("#settingAnnouncementEnabled").checked,
        defaultTheme: $("#settingDefaultTheme").value
      };
      const button = $("#saveSiteSettings"); button.disabled = true;
      $("#siteSettingsStatus").textContent = "Saving to Supabase…";
      try {
        const { error } = await client.from("site_settings").upsert({
          key: "site_config", value, is_public: true, updated_by: user.id, updated_at: new Date().toISOString()
        }, { onConflict: "key" });
        if (error) throw error;
        $("#siteSettingsStatus").textContent = "Saved. Public site settings are live on the next page load.";
        showToast("Site settings saved.", "success");
      } catch (error) { $("#siteSettingsStatus").textContent = error.message || "Could not save settings."; }
      finally { button.disabled = false; }
    });
    $("#discordSettingsForm").addEventListener("submit", async event => {
      event.preventDefault();
      const status = $("#discordSettingsStatus");
      const button = $("#saveDiscordSettings");
      if (!admin || !client || !user) { status.textContent = "Administrator access required."; return; }
      const raw = $("#settingDiscordUrl").value.trim();
      const description = $("#settingDiscordDescription").value.trim();
      let discordUrl = "";
      if (raw) {
        try {
          const parsed = new URL(raw);
          const validHost = parsed.hostname === "discord.gg" || parsed.hostname === "discord.com" || parsed.hostname === "www.discord.com";
          const validPath = parsed.hostname === "discord.gg" || parsed.pathname.startsWith("/invite/");
          if (parsed.protocol !== "https:" || !validHost || !validPath) throw new Error("Use an HTTPS Discord invite URL, such as https://discord.gg/your-invite.");
          discordUrl = parsed.href;
        } catch (error) { status.textContent = error.message || "Enter a valid Discord invite URL."; return; }
      }
      button.disabled = true;
      status.textContent = "Saving Discord settings…";
      try {
        const result = await client.from("site_settings").select("value").eq("key", "site_config").maybeSingle();
        if (result.error) throw result.error;
        const value = { ...(result.data?.value || {}), discordUrl, discordDescription: description };
        const saved = await client.from("site_settings").upsert({ key: "site_config", value, is_public: true, updated_by: user.id, updated_at: new Date().toISOString() }, { onConflict: "key" });
        if (saved.error) throw saved.error;
        status.textContent = "Discord settings saved.";
        const link = $("#discordLink");
        if (link && discordUrl) link.href = discordUrl;
        showToast("Discord settings saved.", "success");
      } catch (error) { status.textContent = error.message || "Could not save Discord settings."; }
      finally { button.disabled = false; }
    });
    $("#keyForm").addEventListener("submit", async event => {
      event.preventDefault();
      if (!admin) { showToast("Administrator access required."); return; }
      const button = $("#createKeyBtn"); button.disabled = true;
      $("#keyStatus").textContent = "Creating key securely…";
      $("#newKeyResult").hidden = true;
      try {
        const maxValue = $("#keyMaxUses").value.trim();
        const result = await callScriptApi({
          action: "create-key",
          script_id: $("#keyScriptId").value,
          label: $("#keyLabel").value.trim() || "Access key",
          expires_in_days: $("#keyExpiry").value || null,
          max_uses: maxValue ? Number(maxValue) : null
        });
        $("#newKeyValue").value = result.key;
        $("#newKeyResult").hidden = false;
        $("#keyStatus").textContent = "Key created. Copy it now; only its prefix will be shown again.";
        showToast("Access key created.", "success");
        await loadKeys();
      } catch (error) {
        $("#keyStatus").textContent = error.message || "Could not create key.";
      } finally { button.disabled = false; }
    });
    $("#refreshKeys").addEventListener("click", loadKeys);
    $("#keyList").addEventListener("click", async event => {
      const button = event.target.closest("[data-revoke-key]");
      if (!button || !admin) return;
      if (!confirm("Revoke this access key? This cannot be undone.")) return;
      button.disabled = true;
      try {
        await callScriptApi({ action: "revoke-key", id: button.dataset.revokeKey });
        showToast("Access key revoked.", "success");
        await loadKeys();
      } catch (error) { showToast(error.message || "Could not revoke key.", "error"); button.disabled = false; }
    });
    $("#copyNewKey").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText($("#newKeyValue").value); showToast("Key copied.", "success"); }
      catch { $("#newKeyValue").select(); document.execCommand("copy"); showToast("Select and copy the key."); }
    });
    $("#checkApiStatus").addEventListener("click", checkApiStatus);
    $("#adminScriptList").addEventListener("click", async event => {
      if (event.target.closest("#retryAdminScripts")) { loadAdminScripts(); return; }
      const toggle = event.target.closest("[data-toggle-script-status]");
      if (!toggle || !admin || !client || !user) return;
      const id = toggle.dataset.toggleScriptStatus;
      const nextStatus = toggle.dataset.nextStatus;
      if (!["published", "draft"].includes(nextStatus)) return;
      if (nextStatus === "draft" && !window.confirm("Unpublish this script? It will disappear from the public catalog.")) return;
      toggle.disabled = true;
      try {
        const { error } = await client.from("scripts").update({ status: nextStatus, updated_at: new Date().toISOString() }).eq("id", id);
        if (error) throw error;
        showToast(nextStatus === "published" ? "Script published." : "Script unpublished.", "success");
        location.reload();
      } catch (error) { showToast("Could not update publication status. Check permissions and retry.", "error"); toggle.disabled = false; }
    });
    $("#adminScriptList").addEventListener("click", async event => {
      const edit = event.target.closest("[data-edit-script]");
      if (!edit || !admin || !client || !/^[0-9a-f-]{36}$/i.test(edit.dataset.editScript)) return;
      event.preventDefault(); event.stopImmediatePropagation();
      try {
        const { data, error } = await client.from("scripts").select("id,name,slug,category,description,link,content,status,release_status,banner_url,showcase_url").eq("id", edit.dataset.editScript).maybeSingle();
        if (error || !data) throw error || new Error("Script unavailable.");
        $("#editScriptId").value = data.id;
        $("#newScriptName").value = data.name || "";
        $("#newScriptSlug").value = data.slug || "";
        $("#newScriptSlug").dataset.touched = "true";
        $("#newScriptCategory").value = data.category || "Utility";
        $("#newScriptStatus").value = data.status || "draft";\n        if($("#newScriptReleaseStatus"))$("#newScriptReleaseStatus").value=data.release_status||"active";\n        if($("#newScriptBannerUrl"))$("#newScriptBannerUrl").value=data.banner_url||"";\n        if($("#newScriptShowcaseUrl"))$("#newScriptShowcaseUrl").value=data.showcase_url||"";\n        if($("#newScriptReleaseStatus"))$("#newScriptReleaseStatus").value=data.release_status||"active";\n        if($("#newScriptBannerUrl"))$("#newScriptBannerUrl").value=data.banner_url||"";\n        if($("#newScriptShowcaseUrl"))$("#newScriptShowcaseUrl").value=data.showcase_url||"";
        $("#newScriptDescription").value = data.description || "";
        $("#newScriptLink").value = data.link || "";
        $("#newScriptContent").value = data.content || "";
        $("#sourceCharCount").textContent = $("#newScriptContent").value.length.toLocaleString() + " characters";
        $("#scriptSlugPreview").textContent = "Public page: /scripts/" + (data.slug || "your-script") + " · loader: /script/" + (data.slug || "your-script");
        $("#scriptFormTitle").textContent = "Edit script";
        $("#scriptForm").hidden = false;
        $("#newScriptName").focus();
      } catch (error) { showToast("Could not load this script for editing.", "error"); }
    }, true);
    if(client){
      client.auth.getSession().then(({data})=>refresh(data.session&&data.session.user||null));
      client.auth.onAuthStateChange((event,session)=>{refresh(session&&session.user||null);if(session&&session.user){if(session.user.email)$("#authEmail").value=session.user.email;$("#authUsername").value=String((session.user.user_metadata&&session.user.user_metadata.username)||"");if(mode==="signup"||mode==="login"){mode="account";updateAuthMode();$("#authStatus").textContent="You are already signed in as "+(session.user.email||"your account")+". Your account details are filled in below.";}}if(event==="PASSWORD_RECOVERY"){mode="newpassword";showAuth("newpassword");$("#authStatus").textContent="Choose a new password to finish resetting your account.";}});
      if(location.hash.includes("type=recovery")||new URLSearchParams(location.search).get("type")==="recovery"){mode="newpassword";showAuth("newpassword");$("#authStatus").textContent="Choose a new password to finish resetting your account.";}
    }else $("#authStatus").textContent="Supabase client library unavailable.";
    updateUI();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
/* VOID Pro roadmap tracker: transparent, manually maintained progress estimates. */
(() => {
  const KEY="voidDevelopment.voidProRoadmap.v1";
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const read=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(x)?x:[]}catch{return []}};
  const write=items=>{try{localStorage.setItem(KEY,JSON.stringify(items));return true}catch{return false}};
  const render=()=>{
    const list=$("#voidProList");if(!list)return;const items=read();
    $("#voidProCount").textContent=String(items.length);
    $("#voidProAverage").textContent=(items.length?Math.round(items.reduce((a,x)=>a+x.percent,0)/items.length):0)+"%";
    list.innerHTML=items.length?items.map(x=>'<article class="void-pro-item" data-roadmap-id="'+esc(x.id)+'"><div class="void-pro-item-head"><div><b>'+esc(x.name)+'</b><br><small>'+esc(x.notes||"No implementation notes yet.")+'</small></div><strong>'+x.percent+'%</strong></div><div class="void-pro-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+x.percent+'"><span style="width:'+x.percent+'%"></span></div><div class="void-pro-item-foot"><span class="void-pro-status">'+esc(({planned:"Planned",working:"Working on it",patched:"Patched / testing",active:"Active"})[x.status]||"Planned")+'</span><div class="void-pro-item-actions"><button class="secondary small" type="button" data-roadmap-edit="'+esc(x.id)+'">Edit %</button><button class="text-action danger" type="button" data-roadmap-delete="'+esc(x.id)+'">Remove</button></div></div></article>').join(""):'<p class="saved-note">No roadmap items yet. Add the first Void Pro feature above.</p>';
  };
  document.addEventListener("submit",e=>{if(e.target.id!=="voidProForm")return;e.preventDefault();const name=$("#voidProName").value.trim(),notes=$("#voidProNotes").value.trim(),percent=Number($("#voidProPercent").value),status=$("#voidProStatus").value;if(!name||!Number.isFinite(percent)||percent<0||percent>100)return;const items=read();items.unshift({id:crypto.randomUUID(),name,notes,percent:Math.round(percent),status,updated_at:new Date().toISOString()});if(!write(items)){alert("Could not save roadmap in this browser.");return;}e.target.reset();$("#voidProPercent").value="1";render();});
  document.addEventListener("click",e=>{const del=e.target.closest("[data-roadmap-delete]");if(del){const items=read().filter(x=>x.id!==del.dataset.roadmapDelete);write(items);render();return;}const edit=e.target.closest("[data-roadmap-edit]");if(edit){const items=read(),item=items.find(x=>x.id===edit.dataset.roadmapEdit);if(!item)return;const answer=prompt("Set progress percentage (0–100):",String(item.percent));if(answer===null)return;const value=Number(answer);if(!Number.isInteger(value)||value<0||value>100){alert("Enter a whole percentage from 0 to 100.");return;}item.percent=value;item.updated_at=new Date().toISOString();write(items);render();}});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render,{once:true});else render();
})();

/* VOID Pro progress tracker */
(()=>{const KEY="voidDevelopment.voidProRoadmap.v1",q=s=>document.querySelector(s),esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));const read=()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(v)?v:[]}catch{return[]}};const save=v=>{try{localStorage.setItem(KEY,JSON.stringify(v));return true}catch{return false}};function render(){if(!q("#voidProList"))return;const a=read();q("#voidProCount").textContent=a.length;q("#voidProAverage").textContent=(a.length?Math.round(a.reduce((s,x)=>s+x.percent,0)/a.length):0)+"%";q("#voidProList").innerHTML=a.length?a.map(x=>'<article class="void-pro-item"><div class="void-pro-item-head"><div><b>'+esc(x.name)+'</b><br><small>'+esc(x.notes||"No notes")+'</small></div><strong>'+x.percent+'%</strong></div><div class="void-pro-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+x.percent+'"><span style="width:'+x.percent+'%"></span></div><div class="void-pro-item-foot"><span class="void-pro-status">'+esc(({planned:"Planned",working:"Working on it",patched:"Patched / testing",active:"Active"})[x.status]||"Planned")+'</span><div class="void-pro-item-actions"><button class="secondary small" type="button" data-roadmap-edit="'+esc(x.id)+'">Edit %</button><button class="text-action danger" type="button" data-roadmap-delete="'+esc(x.id)+'">Remove</button></div></div></article>').join(""):'<p class="saved-note">No roadmap items yet. Add your first Void Pro feature above.</p>'}document.addEventListener("submit",e=>{if(e.target.id!=="voidProForm")return;e.preventDefault();const name=q("#voidProName").value.trim(),notes=q("#voidProNotes").value.trim(),percent=Number(q("#voidProPercent").value),status=q("#voidProStatus").value;if(!name||!Number.isInteger(percent)||percent<0||percent>100)return;const a=read();a.unshift({id:crypto.randomUUID(),name,notes,percent,status});if(!save(a)){alert("Could not save this roadmap in your browser.");return}e.target.reset();q("#voidProPercent").value="1";render()});document.addEventListener("click",e=>{const d=e.target.closest("[data-roadmap-delete]");if(d){save(read().filter(x=>x.id!==d.dataset.roadmapDelete));render();return}const b=e.target.closest("[data-roadmap-edit]");if(b){const a=read(),x=a.find(i=>i.id===b.dataset.roadmapEdit);if(!x)return;const v=prompt("Set progress percentage (0–100):",x.percent);if(v===null)return;const n=Number(v);if(!Number.isInteger(n)||n<0||n>100){alert("Enter a whole percentage from 0 to 100.");return}x.percent=n;save(a);render()}});if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render,{once:true});else render()})();
