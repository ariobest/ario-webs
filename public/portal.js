(() => {
  "use strict";
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const PROJECT_URL = "https://cqtwmxojwwyeasstuhgb.supabase.co";
  const PUBLIC_KEY = "sb_publishable_qBPb1ltQbHNZ-fO3PFmDeg_IQj0QfNB";
  const client = window.supabase && window.supabase.createClient ? window.supabase.createClient(PROJECT_URL, PUBLIC_KEY) : null;
  let user = null, admin = false, mode = "login", authBusy = false, toastTimer = 0;
  const showToast = (msg, kind = "info") => { const t=$("#toast"); if(t){t.textContent=msg;t.dataset.kind=kind;t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),3200);} };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const themes = [
    ["summer","Summer","Warm and sunny","#f5b942","#e59b1a","#101a2b","#162238","#22314c","#a9c0e5"],
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
    ["mono","Mono","Black and white","#f1f1f1","#b8b8b8","#111111","#1c1c1c","#2b2b2b","#c0c0c0"],
    ["candy","Candy","Playful pastel","#ffb5d2","#e779b0","#241529","#35203b","#4a2b50","#d9b8dc"],
    ["sakura","Sakura","Cherry blossom","#ffc1d1","#e884a2","#21141d","#30202b","#44303e","#d5b7c8"],
    ["arctic","Arctic","Ice and silver","#c1efff","#70bde8","#101d2a","#192b3b","#263f52","#b0c8d8"]
  ].map(a=>({id:a[0],name:a[1],desc:a[2],accent:a[3],strong:a[4],page:a[5],surface:a[6],surface2:a[7],muted:a[8]}));
  const tools = [
    "Dashboard","Users","Roles & Permissions","Image to URL","Media Library","File Uploads","Scripts","Script Categories","Games","Tags",
    "Script Versions","Featured Scripts","Drafts & Publishing","Comments","Reviews","Favorites","Reports","Moderation Queue","Banned Users","Announcements",
    "Notifications","Badges","Access Grants","API Keys","API Documentation","API Usage","Rate Limits","Webhooks","Integrations","Supabase",
    "Database Status","Database Tables","Storage Buckets","Storage Browser","Authentication","Login Settings","Sign-up Settings","Email Templates","Email Verification","Password Reset",
    "OAuth Providers","Sessions","Admin Accounts","Audit Logs","Security Events","RLS Policies","Security Advisor","Backup Status","Site Settings","Branding",
    "Logo & Favicon","Image to URL","Theme Studio","20 Themes","Appearance","Navigation","Homepage Editor","Hero Section","Footer Editor","SEO Settings",
    "Meta Tags","Robots & Sitemap","Analytics","Traffic Overview","Script Views","Popular Scripts","User Growth","Error Logs","Performance","Cache Settings",
    "Maintenance Mode","Status Page","Contact Messages","Support Inbox","FAQ Manager","Documentation","Changelog","Release Notes","Feature Flags","Localization",
    "Language Settings","Time Zone","Date & Number Formats","Privacy Settings","Terms & Rules","Cookie Notice","Data Export","Data Retention","Account Deletion","Community Settings",
    "Upload Settings","Allowed File Types","Image Optimizer","URL Validator","Link Checker","Embed Preview","Code Snippet Preview","Lua Formatter","JSON Formatter","Text Utilities",
    "Color Picker","Gradient Maker","Icon Library","Quick Links","Admin Notes","Task Checklist","System Diagnostics"
  ].slice(0,97);
  function setTheme(id, broadcast = true) {
    const t=themes.find(x=>x.id===id)||themes[0];
    document.documentElement.dataset.theme=t.id;
    const root=document.documentElement.style;
    root.setProperty("--accent",t.accent);root.setProperty("--accent-strong",t.strong);
    root.setProperty("--page",t.page);root.setProperty("--surface",t.surface);root.setProperty("--surface-2",t.surface2);
    root.setProperty("--muted",t.muted);root.setProperty("--glow",t.strong+"22");root.setProperty("--hero-glow",t.accent+"22");
    const label=$("#themeLabel");if(label)label.textContent=t.name.toUpperCase()+" EDITION";
    const meta=$('meta[name="theme-color"]');if(meta)meta.content=t.page;
    try{localStorage.setItem("sunnyScripts.theme.v1",JSON.stringify(t.id));}catch{}
    $("#themeGrid [data-theme-choice]").forEach(b=>{b.classList.toggle("selected",b.dataset.themeChoice===id);b.setAttribute("aria-pressed",String(b.dataset.themeChoice===id));});
    if (broadcast) document.dispatchEvent(new CustomEvent("sunnyScripts:theme-change", { detail: { id } }));
  }
  document.addEventListener("sunnyScripts:theme-change", event => {
    const id = event.detail?.id;
    if (themes.some(theme => theme.id === id)) setTheme(id, false);
  });
  function renderThemes() {
    const host=$("#themeGrid");if(!host)return;
    host.innerHTML=themes.map(t=>'<button type="button" class="theme-choice" data-theme-choice="'+t.id+'"><span class="theme-preview" style="background:linear-gradient(135deg,'+t.page+','+t.strong+');color:'+t.accent+'">✦</span><b>'+esc(t.name)+'</b><small>'+esc(t.desc)+'</small></button>').join("");
    let current="summer";try{current=JSON.parse(localStorage.getItem("sunnyScripts.theme.v1")||'"summer"');}catch{}
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
    $("#openAdmin").hidden=!admin;$("#openAdminFooter").hidden=!admin;
    $("#signOutButton").hidden=!user;
    if(user)$("#authStatus").textContent="Signed in as "+(user.email||"account")+(admin?" · Admin access verified.":" · Standard account. Admin panel is restricted.");
  }
  async function refresh(userIn){
    user=userIn||null;admin=false;
    if(user&&client){
      const {data,error}=await client.from("user_roles").select("role").eq("user_id",user.id).eq("role","admin").maybeSingle();
      if(!error&&data&&data.role==="admin")admin=true;
    }
    updateUI();
    if(!admin&&!$("#adminBackdrop").hidden)$("#adminBackdrop").hidden=true;
  }
  function addTools(){
    const nav=$("#adminTabs"),host=$("#adminContent");if(!nav||!host||nav.dataset.expanded==="yes")return;nav.dataset.expanded="yes";
    tools.forEach((label,i)=>{
      const id="extra-"+(i+1);
      const b=document.createElement("button");b.type="button";b.className="admin-tab";b.dataset.adminTab=id;b.setAttribute("role","tab");b.textContent=label;nav.appendChild(b);
      const p=document.createElement("section");p.className="admin-pane";p.dataset.pane=id;p.hidden=true;
      if(label==="Image to URL"){
        p.innerHTML='<div class="pane-heading"><div><h3>Image to URL</h3><p>Upload an image to the public site-assets bucket. Only admins can upload.</p></div></div><form id="imageUploadForm" class="editor-form visible-form"><label>Choose image (max 10 MB)<input id="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" required></label><button class="small-primary" type="submit">Upload and create URL</button><p id="imageUrlStatus" class="saved-note" role="status">Supported: PNG, JPG, WEBP, GIF and SVG.</p><div id="imageUrlResult" class="image-url-result" hidden><img id="uploadedImagePreview" alt="Uploaded image preview"><input id="uploadedImageUrl" readonly aria-label="Public image URL"><button class="secondary small" id="copyImageUrl" type="button">Copy URL</button></div></form>';
      } else {
        p.innerHTML='<div class="pane-heading"><div><h3>'+esc(label)+'</h3><p>Admin-only module. Save private notes and settings for this section.</p></div></div><form class="editor-form visible-form module-form" data-module="'+id+'"><label>Title or value<input name="title" maxlength="160" placeholder="Enter a value"></label><label>Notes / configuration<textarea name="notes" rows="4" maxlength="4000" placeholder="Write configuration notes"></textarea></label><label class="toggle-row"><input name="enabled" type="checkbox"> Enable this module</label><button class="small-primary" type="submit">Save module settings</button><p class="saved-note" role="status">Saved locally for this browser.</p></form>';
      }
      host.appendChild(p);
    });
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
          await refresh(result.data.user);mode="account";updateAuthMode();$("#authStatus").textContent="Account created and signed in. Welcome to SunnyScripts!";showToast("Account created successfully.","success");
        }else { $("#resendConfirmation").hidden=false; $("#authStatus").textContent="Account created. Check your inbox and spam folder for the SunnyScripts confirmation email.";showToast("Confirmation email requested. Check your inbox.","success"); }
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
  function saveSignupDraft(){try{sessionStorage.setItem("sunnyScripts.signupDraft.v1",JSON.stringify({email:$("#authEmail").value.trim(),username:$("#authUsername").value.trim()}));}catch{}}
  function init(){
    addTools();renderThemes();
    $("#openAuth").addEventListener("click",()=>showAuth(user?"account":"signup"));
    $("#heroSignUp").addEventListener("click",event=>{event.preventDefault();showAuth("signup");});
    try{const draft=JSON.parse(sessionStorage.getItem("sunnyScripts.signupDraft.v1")||"null");if(draft){if(draft.email)$("#authEmail").value=draft.email;if(draft.username)$("#authUsername").value=draft.username;}}catch{}
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
      if(b.dataset.adminTab==="extra-4"||b.dataset.adminTab==="extra-10")$("#imageUrlStatus").textContent="Upload an image to create a public URL.";
    },true);
    $("#themeGrid").addEventListener("click",e=>{const b=e.target.closest("[data-theme-choice]");if(b)setTheme(b.dataset.themeChoice);});
    $("#scriptForm").addEventListener("submit",async e=>{
      if(!admin||!user||!client)return;
      e.preventDefault();e.stopImmediatePropagation();
      const name=$("#newScriptName").value.trim(),category=$("#newScriptCategory").value,description=$("#newScriptDescription").value.trim(),link=$("#newScriptLink").value.trim(),id=$("#editScriptId").value;
      if(!name||!description){showToast("Enter a script name and description.");return;}
      const slug=name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")+"-"+Date.now().toString(36);
      const record={name,category,description,link:link||null,status:"published",owner_id:user.id};
      let result;
      if(id&&/^[0-9a-f-]{36}$/i.test(id)) result=await client.from("scripts").update(record).eq("id",id);
      else result=await client.from("scripts").insert({...record,slug});
      if(result.error){showToast("Supabase save failed: "+result.error.message);return;}
      showToast("Script saved to Supabase.");location.reload();
    },true);
    $("#adminScriptList").addEventListener("click",async e=>{
      const button=e.target.closest("[data-delete-script]");if(!button||!admin||!client)return;
      const id=button.dataset.deleteScript;if(!/^[0-9a-f-]{36}$/i.test(id))return;
      e.preventDefault();e.stopImmediatePropagation();
      if(!confirm("Delete this script from Supabase?"))return;
      const result=await client.from("scripts").delete().eq("id",id);
      if(result.error){showToast("Delete failed: "+result.error.message);return;}
      showToast("Script deleted from Supabase.");location.reload();
    },true);
    $("#adminContent").addEventListener("submit",e=>{
      const f=e.target.closest(".module-form");if(!f)return;e.preventDefault();if(!admin)return;
      const value={title:f.elements.title.value,notes:f.elements.notes.value,enabled:f.elements.enabled.checked};
      try{localStorage.setItem("sunnyScripts.admin."+f.dataset.module,JSON.stringify(value));f.querySelector('[role="status"]').textContent="Saved on this browser.";showToast("Module settings saved.");}catch{$("#toast").textContent="Could not save settings";}
    });
    $("#adminContent").addEventListener("submit",async e=>{
      if(e.target.id!=="imageUploadForm")return;e.preventDefault();
      if(!admin||!user||!client){$("#imageUrlStatus").textContent="Admin sign-in required.";return;}
      const file=$("#imageFile").files[0];if(!file)return;
      if(file.size>10*1024*1024){$("#imageUrlStatus").textContent="Image must be smaller than 10 MB.";return;}
      if(!/^image\/(png|jpeg|webp|gif|svg\+xml)$/.test(file.type)){ $("#imageUrlStatus").textContent="Unsupported image type.";return; }
      $("#imageUrlStatus").textContent="Uploading…";
      const safe=file.name.toLowerCase().replace(/[^a-z0-9._-]+/g,"-").slice(-80)||"image";
      const path=user.id+"/"+Date.now()+"-"+safe;
      const upload=await client.storage.from("site-assets").upload(path,file,{upsert:false,contentType:file.type});
      if(upload.error){$("#imageUrlStatus").textContent="Upload failed: "+upload.error.message;return;}
      const url=client.storage.from("site-assets").getPublicUrl(path).data.publicUrl;
      $("#uploadedImageUrl").value=url;$("#uploadedImagePreview").src=url;$("#imageUrlResult").hidden=false;$("#imageUrlStatus").textContent="Uploaded. This URL is public.";
    });
    $("#copyImageUrl").addEventListener("click",async()=>{try{await navigator.clipboard.writeText($("#uploadedImageUrl").value);showToast("Image URL copied.");}catch{$("#uploadedImageUrl").select();document.execCommand("copy");}});
    if(client){
      client.auth.getSession().then(({data})=>refresh(data.session&&data.session.user||null));
      client.auth.onAuthStateChange((event,session)=>{refresh(session&&session.user||null);if(session&&session.user){if(session.user.email)$("#authEmail").value=session.user.email;$("#authUsername").value=String((session.user.user_metadata&&session.user.user_metadata.username)||"");if(mode==="signup"||mode==="login"){mode="account";updateAuthMode();$("#authStatus").textContent="You are already signed in as "+(session.user.email||"your account")+". Your account details are filled in below.";}}if(event==="PASSWORD_RECOVERY"){mode="newpassword";showAuth("newpassword");$("#authStatus").textContent="Choose a new password to finish resetting your account.";}});
      if(location.hash.includes("type=recovery")||new URLSearchParams(location.search).get("type")==="recovery"){mode="newpassword";showAuth("newpassword");$("#authStatus").textContent="Choose a new password to finish resetting your account.";}
    }else $("#authStatus").textContent="Supabase client library unavailable.";
    updateUI();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();