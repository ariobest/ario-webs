(() => {
  "use strict";
  const LOGO_URL = "https://cdn.phototourl.com/member/2026-10-22-2137bbb7-82d5-48bb-855c-03c7361f95a8.png";
  const STORAGE = { theme: "voidDevelopment.theme.v1", scripts: "voidDevelopment.library.v1", supabase: "voidDevelopment.supabase.public.v1", favorites: "voidDevelopment.favorites.v1" };
  const DEFAULT_SUPABASE = { url: "https://cqtwmxojwwyeasstuhgb.supabase.co", key: "sb_publishable_qBPb1ltQbHNZ-fO3PFmDeg_IQj0QfNB" };
  let supabaseClient = null;
  let databaseConnected = false;
  let riseObserver = null;
  function observeRiseElements(root = document) {
    const targets = root.querySelectorAll(".section-heading, .about-section > *, .script-card");
    if (!("IntersectionObserver" in window)) { targets.forEach(el => el.classList.add("rise-reveal", "is-visible")); return; }
    if (!riseObserver) riseObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add("is-visible"); riseObserver.unobserve(entry.target); }
    }), { threshold: 0.12, rootMargin: "0px 0px -35px 0px" });
    targets.forEach(el => { if (!el.classList.contains("rise-reveal")) el.classList.add("rise-reveal"); riseObserver.observe(el); });
  }
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const toast = $("#toast");
  let toastTimer;
  const safeRead = (key, fallback) => { try { const value = localStorage.getItem(key); return value === null ? fallback : JSON.parse(value); } catch { return fallback; } };
  const safeWrite = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { showToast("Could not save: browser storage is unavailable."); return false; } };
  const showToast = (message) => { if (!toast) return; toast.textContent = message; toast.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 2200); };
  const DEMO_NAMES = new Set(["quicktools","islandkit","devbox"]);
  const requestedScript = new URLSearchParams(location.search).get("script");
  let scripts = safeRead(STORAGE.scripts, []);
  if (!Array.isArray(scripts)) scripts = [];
  scripts = scripts.filter(item => !DEMO_NAMES.has(String(item?.name || "").toLowerCase()) && !DEMO_NAMES.has(String(item?.slug || "").toLowerCase()));
  const validThemes = ["summer","light","dark","winter","autumn","spring","ocean","sunset","lavender","rose","forest","mint","cyber","crimson","gold","slate","mono","candy","sakura","arctic"];
  let favorites = new Set(safeRead(STORAGE.favorites, []));
  let showFavorites = false;
  let currentTheme = safeRead(STORAGE.theme, "mono");
  if (!validThemes.includes(currentTheme)) currentTheme = "mono";

  function applyTheme(theme, announce = false, syncPortal = true) {
    if (!validThemes.includes(theme)) return;
    currentTheme = theme;
    document.documentElement.dataset.theme = theme;
    const themeNames = { summer:"SUMMER EDITION",light:"LIGHT EDITION",dark:"MIDNIGHT EDITION",winter:"WINTER EDITION",autumn:"AUTUMN EDITION",spring:"SPRING EDITION",ocean:"OCEAN EDITION",sunset:"SUNSET EDITION",lavender:"LAVENDER EDITION",rose:"ROSE EDITION",forest:"FOREST EDITION",mint:"MINT EDITION",cyber:"CYBER EDITION",crimson:"CRIMSON EDITION",gold:"GOLD EDITION",slate:"SLATE EDITION",mono:"BLACK VOID",candy:"CANDY EDITION",sakura:"SAKURA EDITION",arctic:"ARCTIC EDITION" };
    $("#themeLabel").textContent = themeNames[theme];
    const colors = { summer:"#101a2b",light:"#f7f9fc",dark:"#0a1020",winter:"#071827",autumn:"#1b120f",spring:"#0e1c19",ocean:"#071c2a",sunset:"#21101f",lavender:"#181326",rose:"#24111d",forest:"#0b1c15",mint:"#0a1e1b",cyber:"#071318",crimson:"#200e12",gold:"#201a0b",slate:"#111820",mono:"#111111",candy:"#241529",sakura:"#21141d",arctic:"#101d2a" };
    $('meta[name="theme-color"]').content = colors[theme];
    safeWrite(STORAGE.theme, theme);
    $$("[data-public-theme]").forEach(button => { const selected = button.dataset.publicTheme === theme; button.classList.toggle("selected", selected); button.setAttribute("aria-pressed", String(selected)); });
    $$("[data-theme-choice]").forEach(button => {
      const selected = button.dataset.themeChoice === theme;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    if (announce) showToast(themeNames[theme].replace(" EDITION", "").toLowerCase() + " theme applied");
    // Keep the Theme Studio's inline palette and this switcher's state in sync.
    if (syncPortal) document.dispatchEvent(new CustomEvent("voidDevelopment:theme-change", { detail: { id: theme } }));
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }
  function renderScriptDetail(slug) {
    const host = $("#scripts");
    if (!host) return;
    let view = $("#scriptDetailView");
    if (!view) {
      view = document.createElement("section");
      view.id = "scriptDetailView";
      view.className = "script-detail-view";
      host.appendChild(view);
    }
    const item = scripts.find(script => String(script.slug || "").toLowerCase() === String(slug || "").toLowerCase());
    $(".script-tools").hidden = true;
    $("#scriptGrid").hidden = true;
    $("#emptyState").hidden = true;
    view.hidden = false;
    if (!item) {
      view.innerHTML = '<a class="secondary small" href="/scripts">← Back to scripts</a><h2>Script not found</h2><p>This script may be unpublished, unavailable, or the URL may be incorrect.</p>';
      return;
    }
    view.innerHTML = '<a class="secondary small" href="/scripts">← Back to scripts</a><div class="script-detail-card"><span class="eyebrow">VOID DEVELOPMENT · SCRIPT DETAILS</span><h2>' + escapeHTML(item.name) + '</h2><p>' + escapeHTML(item.description || "No description provided.") + '</p><div class="script-detail-meta"><span>' + escapeHTML(item.category || "Script") + '</span><span>Slug: ' + escapeHTML(item.slug || item.id) + '</span></div>' + (item.link ? '<a class="secondary" href="' + escapeHTML(item.link) + '" target="_blank" rel="noopener noreferrer">Open project link ↗</a>' : '') + '<p class="saved-note">Source remains protected and is delivered only through the authorized key-checked loader.</p></div>';
  }
  function renderScripts() {
    const query = ($("#scriptSearch").value || "").trim().toLowerCase();
    const category = $("#categoryFilter").value;
    const sort = $("#sortScripts").value;
    let filtered = scripts.filter(item => (category === "all" || item.category === category) && (!showFavorites || favorites.has(item.id)) && [item.name, item.category, item.description].some(value => String(value || "").toLowerCase().includes(query)));
    filtered = filtered.slice().sort((a, b) => sort === "az" ? a.name.localeCompare(b.name) : sort === "za" ? b.name.localeCompare(a.name) : scripts.indexOf(a) - scripts.indexOf(b));
    $("#favoritesToggle").classList.toggle("active", showFavorites);
    $("#favoritesToggle").setAttribute("aria-pressed", String(showFavorites));
    $("#favoritesToggle").textContent = showFavorites ? "♥ Favorites" : "♡ Favorites";
    $("#scriptGrid").innerHTML = filtered.map((item, index) => `<article class="script-card" id="script-${escapeHTML(item.slug || item.id)}" style="--card-index:${index}"><div class="script-card-top"><span class="script-icon">${item.category === "Utility" ? "⌁" : item.category === "Tools" ? "⌘" : "✧"}</span><span class="pill">${escapeHTML(item.category)}</span><button class="favorite-btn ${favorites.has(item.id) ? "is-favorite" : ""}" data-favorite-id="${escapeHTML(item.id)}" type="button" aria-label="${favorites.has(item.id) ? "Remove from" : "Add to"} favorites" aria-pressed="${favorites.has(item.id)}">${favorites.has(item.id) ? "♥" : "♡"}</button><details class="script-more"><summary aria-label="More script options" title="More options">•••</summary><div class="script-more-menu"><button type="button" data-copy-link="${escapeHTML(item.slug || item.id)}">Copy script link</button><button type="button" data-copy-name="${escapeHTML(item.name)}">Copy script name</button></div></details></div><h3>${escapeHTML(item.name)}</h3><p>${escapeHTML(item.description)}</p><div class="script-card-actions"><button class="copy-btn" data-copy-loader="${escapeHTML(item.slug || item.id)}" type="button">Copy script <span>↗</span></button><a class="open-script" href="/scripts/${encodeURIComponent(item.slug || item.id)}">Details ↗</a>${item.link ? `<a class="open-script" href="${escapeHTML(item.link)}" target="_blank" rel="noopener noreferrer">Project ↗</a>` : ""}</div></article>`).join("");
    $("#emptyState").textContent = showFavorites && filtered.length === 0 ? "No favorites yet — tap the heart on a script to save it." : "No scripts match that search.";
    $("#emptyState").hidden = filtered.length !== 0;
    if (requestedScript) renderScriptDetail(requestedScript);
    else { const detail = $("#scriptDetailView"); if (detail) detail.hidden = true; $(".script-tools").hidden = false; $("#scriptGrid").hidden = false; }
    $("#scriptCount").textContent = scripts.length;
    renderAdminScripts();
    observeRiseElements($("#scriptGrid"));
  }
  function renderAdminScripts() {
    const host = $("#adminScriptList");
    if (host.dataset.adminDatabaseLoaded === "true") return;
    host.innerHTML = scripts.length ? scripts.map(item => `<div class="admin-script-row"><div class="admin-script-symbol">⌘</div><div class="admin-script-info"><b>${escapeHTML(item.name)}</b><small>${escapeHTML(item.category)} · ${escapeHTML(item.description)}</small></div><button class="text-action" data-edit-script="${escapeHTML(item.id)}">Edit</button><button class="text-action danger" data-delete-script="${escapeHTML(item.id)}">Delete</button></div>`).join("") : '<p class="empty-state">No scripts yet. Add your first one above.</p>';
  }
  function openAdmin(tab = "scripts") {
    $("#adminBackdrop").hidden = false;
    document.body.classList.add("modal-open");
    selectAdminTab(tab);
    if (tab === "supabase") loadSupabaseForm();
    $("#closeAdmin").focus();
  }
  function closeAdmin() { $("#adminBackdrop").hidden = true; document.body.classList.remove("modal-open"); }
  function selectAdminTab(tab) {
    $$(".admin-tab").forEach(button => button.classList.toggle("active", button.dataset.adminTab === tab));
    $$(".admin-pane").forEach(pane => { const active = pane.dataset.pane === tab; pane.hidden = !active; pane.classList.toggle("active", active); });
    if (tab === "themes") applyTheme(currentTheme);
    if (tab === "supabase") loadSupabaseForm();
  }
  function resetScriptForm() { $("#scriptForm").reset(); $("#editScriptId").value = ""; $("#scriptFormTitle").textContent = "Add a script"; $("#scriptForm").hidden = true; }
  function editScript(id) {
    const item = scripts.find(script => script.id === id); if (!item) return;
    $("#editScriptId").value = item.id; $("#newScriptName").value = item.name; $("#newScriptSlug").value = item.slug || item.name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""); $("#newScriptSlug").dataset.touched="false"; if($("#scriptSlugPreview"))$("#scriptSlugPreview").textContent="Public page: /scripts/"+($("#newScriptSlug").value||"your-script")+" · loader: /script/"+($("#newScriptSlug").value||"your-script"); $("#newScriptCategory").value = item.category; $("#newScriptDescription").value = item.description; $("#newScriptLink").value = item.link || ""; $("#scriptFormTitle").textContent = "Edit script"; $("#scriptForm").hidden = false; $("#newScriptName").focus();
  }
  function activeSupabaseConfig() {
    const custom = safeRead(STORAGE.supabase, null);
    return custom?.url && custom?.key ? custom : DEFAULT_SUPABASE;
  }
  function loadSupabaseForm() {
    const custom = safeRead(STORAGE.supabase, null);
    const config = activeSupabaseConfig();
    $("#supabaseUrl").value = config.url;
    $("#supabaseKey").value = config.key;
    $("#supabaseStatus").textContent = custom?.url && custom?.key
      ? "Custom public configuration saved in this browser."
      : "Using the website's default public Supabase configuration.";
  }
  async function loadDatabaseScripts() {
    if (!supabaseClient) return;
    const status = $("#supabaseStatus");
    try {
      const { data, error } = await supabaseClient
        .from("published_script_metadata")
        .select("id,name,slug,category,description,link,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      scripts = (data || []).map(item => ({
        id: String(item.id),
        slug: item.slug || String(item.id),
        name: item.name,
        category: item.category || "Utility",
        description: item.description || "",
        link: item.link || ""
      }));
      databaseConnected = true;
      safeWrite(STORAGE.scripts, scripts);
      renderScripts();
      loadPublicSiteSettings();
      if (location.hash.startsWith("#script-")) requestAnimationFrame(() => document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ behavior: "smooth", block: "center" }));
      if (status) status.textContent = "Connected to Supabase. Published scripts are loading from the database.";
    } catch (error) {
      databaseConnected = false;
      if (status) status.textContent = "Supabase connection failed: " + (error?.message || "check Data API exposure and table grants.");
      console.warn("VOID DEVELOPMENT Supabase read failed:", error);
    }
  }
  function initSupabase() {
    const config = activeSupabaseConfig();
    if (!window.supabase?.createClient) {
      const status = $("#supabaseStatus");
      if (status) status.textContent = "Supabase client library did not load. Check your network/CDN access.";
      return;
    }
    try {
      supabaseClient = window.supabase.createClient(config.url, config.key);
      loadDatabaseScripts();
    } catch (error) {
      databaseConnected = false;
      console.warn("VOID DEVELOPMENT Supabase setup failed:", error);
    }
  }

  document.addEventListener("voidDevelopment:theme-change", event => {
    const id = event.detail?.id;
    if (validThemes.includes(id) && currentTheme !== id) applyTheme(id, false, false);
  });
  $("#themeQuick").addEventListener("click", () => applyTheme(currentTheme === "light" ? "mono" : "light", true));
  // Public Themes tab: one delegated handler survives theme-grid rerenders.
  $("#publicThemeGrid")?.addEventListener("click", event => {
    const button = event.target.closest("[data-public-theme]");
    if (button) applyTheme(button.dataset.publicTheme, true);
  });
  $("#openAdmin").addEventListener("click", () => openAdmin());
  $("#openAdminFooter").addEventListener("click", () => openAdmin());
  $("#closeAdmin").addEventListener("click", closeAdmin);
  $("#closeAdminBottom").addEventListener("click", closeAdmin);
  $("#adminBackdrop").addEventListener("click", event => { if (event.target === $("#adminBackdrop")) closeAdmin(); });
  document.addEventListener("keydown", event => { if (event.key === "Escape" && !$("#adminBackdrop").hidden) closeAdmin(); });
  $$(".admin-tab").forEach(button => button.addEventListener("click", () => selectAdminTab(button.dataset.adminTab)));
  $$("[data-theme-choice]").forEach(button => button.addEventListener("click", () => applyTheme(button.dataset.themeChoice, true)));
  function setPage(view, updateAddress = true) {
    const page = ["home", "scripts", "themes", "about"].includes(view) ? view : "home";
    $("#hero").hidden = page !== "home";
    $("#scripts").hidden = page !== "scripts";
    $("#themes").hidden = page !== "themes";
    $("#about").hidden = page !== "about";
    $$(".nav-link").forEach(link => {
      const active = link.dataset.view === page;
      link.classList.toggle("active", active);
      link.setAttribute("aria-current", active ? "page" : "false");
    });
    if (updateAddress) {
      const url = new URL(location.href);
      url.pathname = page === "home" ? "/" : "/" + page;
      url.searchParams.delete("view");
      history.pushState({ view: page }, "", url);
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  }
  $$("[data-view]").forEach(button => button.addEventListener("click", () => setPage(button.dataset.view)));
  $$("[data-scroll-scripts]").forEach(button => button.addEventListener("click", () => setPage("scripts")));
  window.addEventListener("popstate", () => {
    const route = location.pathname.replace(/\/+$/, "") || "/";
    const fromPath = route === "/scripts" ? "scripts" : route === "/themes" ? "themes" : route === "/about" ? "about" : "home";
    setPage(new URLSearchParams(location.search).get("view") || fromPath, false);
  });
  $("#scriptSearch").addEventListener("input", renderScripts);
  $("#categoryFilter").addEventListener("change", renderScripts);
  $("#sortScripts").addEventListener("change", renderScripts);
  $("#favoritesToggle").addEventListener("click", () => { showFavorites = !showFavorites; renderScripts(); });
  $("#backToTop").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  window.addEventListener("scroll", () => $("#backToTop").classList.toggle("visible", window.scrollY > 500), { passive: true });
  $("#newScriptBtn").addEventListener("click", () => { resetScriptForm(); $("#scriptForm").hidden = false; $("#newScriptName").focus(); });
  $("#cancelScript").addEventListener("click", resetScriptForm);
  $("#newScriptName").addEventListener("input",()=>{const field=$("#newScriptSlug");if(!field||field.dataset.touched==="true")return;field.value=$("#newScriptName").value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");if($("#scriptSlugPreview"))$("#scriptSlugPreview").textContent="Public page: /scripts/"+(field.value||"your-script")+" · loader: /script/"+(field.value||"your-script");});
  $("#newScriptSlug").addEventListener("input",e=>{e.target.dataset.touched="true";e.target.value=e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"").replace(/-{2,}/g,"-").replace(/^-|-$/g,"");if($("#scriptSlugPreview"))$("#scriptSlugPreview").textContent="Public page: /scripts/"+(e.target.value||"your-script")+" · loader: /script/"+(e.target.value||"your-script");});
  $("#scriptForm").addEventListener("submit", event => {
    event.preventDefault();
    showToast("Local-only script saving is disabled. Sign in with an authorized administrator account and ensure Supabase is available.");
    return;
  });
  $("#adminScriptList").addEventListener("click", event => {
    const edit = event.target.closest("[data-edit-script]");
    const remove = event.target.closest("[data-delete-script]");
    if (edit) editScript(edit.dataset.editScript);
    if (remove) {
      const item = scripts.find(script => script.id === remove.dataset.deleteScript);
      if (!item || !window.confirm("Delete " + item.name + " from this browser's library?")) return;
      scripts = scripts.filter(script => script.id !== item.id);
      if (safeWrite(STORAGE.scripts, scripts)) { renderScripts(); showToast("Script deleted."); }
    }
  });
  async function copyText(value, message) {
    try { await navigator.clipboard.writeText(value); showToast(message || "Copied to clipboard."); return true; }
    catch {
      const area = document.createElement("textarea"); area.value = value; area.style.position = "fixed"; area.style.opacity = "0"; document.body.appendChild(area); area.select();
      let ok = false; try { ok = document.execCommand("copy"); } catch {}
      area.remove(); showToast(ok ? (message || "Copied to clipboard.") : "Copy unavailable — select and copy manually."); return ok;
    }
  }
  function buildLoader(slug) {
    const api = "https://cqtwmxojwwyeasstuhgb.supabase.co/functions/v1/script-api";
    const safeSlug = String(slug || "").replace(/[^a-zA-Z0-9_-]/g, "");
    return [
      "-- VOID DEVELOPMENT protected loader",
      "-- Paste your access key below. Source is delivered only after server-side key verification.",
      'local HttpService = game:GetService("HttpService")',
      'local API_URL = "' + api + '"',
      'local SCRIPT_SLUG = "' + safeSlug + '"',
      'local ACCESS_KEY = "PASTE_YOUR_ACCESS_KEY_HERE"',
      'local PUBLIC_KEY = "sb_publishable_qBPb1ltQbHNZ-fO3PFmDeg_IQj0QfNB"',
      "",
      "local send = (syn and syn.request) or (http and http.request) or http_request or request",
      'assert(type(send) == "function", "Your environment needs an HTTP request function.")',
      "",
      "local response = send({",
      "    Url = API_URL,",
      '    Method = "POST",',
      "    Headers = {",
      '        ["Content-Type"] = "application/json",',
      '        ["apikey"] = PUBLIC_KEY',
      "    },",
      "    Body = HttpService:JSONEncode({",
      '        action = "load",',
      "        key = ACCESS_KEY,",
      "        script = SCRIPT_SLUG",
      "    })",
      "})",
      "",
      "local status = response.StatusCode or response.Status or 0",
      'local body = response.Body or response.body or ""',
      'assert(status == 200, "VOID DEVELOPMENT key verification failed: " .. tostring(body))',
      "local run, loadError = loadstring(body)",
      'assert(type(run) == "function", "Could not load authorized script: " .. tostring(loadError))',
      "run()"
    ].join("\n");
  }
  $("#scriptGrid").addEventListener("click", async event => {
    const favoriteButton = event.target.closest("[data-favorite-id]");
    if (favoriteButton) {
      const id = favoriteButton.dataset.favoriteId;
      if (favorites.has(id)) favorites.delete(id); else favorites.add(id);
      if (safeWrite(STORAGE.favorites, [...favorites])) { renderScripts(); showToast(favorites.has(id) ? "Added to favorites." : "Removed from favorites."); }
      return;
    }
    const moreButton = event.target.closest("[data-copy-link]");
    if (moreButton) {
      const url = new URL("/scripts/" + encodeURIComponent(moreButton.dataset.copyLink), location.origin);
      await copyText(url.href, "Script link copied."); moreButton.closest("details")?.removeAttribute("open"); return;
    }
    const loaderButton = event.target.closest("[data-copy-loader]");
    if (loaderButton) {
      await copyText(buildLoader(loaderButton.dataset.copyLoader), "Protected loader copied. Add your access key before running it.");
      return;
    }
    const nameButton = event.target.closest("[data-copy-name]");
    if (nameButton) await copyText(nameButton.dataset.copyName, "Script name copied.");
  });
  async function loadPublicSiteSettings() {
    if (!supabaseClient) return;
    try {
      const { data, error } = await supabaseClient.from("site_settings").select("value").eq("key", "site_config").eq("is_public", true).maybeSingle();
      if (error || !data?.value) return;
      const value = data.value;
      if (value.siteName) {
        document.title = value.siteName + " — Roblox Scripts";
        const brand = $(".brand > span"); if (brand) brand.textContent = value.siteName;
      }
      const tagline = $("#heroTagline"); if (tagline && value.tagline) tagline.textContent = value.tagline;
      const banner = $("#siteAnnouncement");
      if (banner) { banner.textContent = value.announcement || ""; banner.hidden = !(value.announcementEnabled && value.announcement); }
      const discordLink = $("#discordLink");
      if (discordLink && typeof value.discordUrl === "string") {
        try {
          const parsed = new URL(value.discordUrl);
          const validHost = parsed.hostname === "discord.gg" || parsed.hostname === "discord.com" || parsed.hostname === "www.discord.com";
          const validPath = parsed.hostname === "discord.gg" || parsed.pathname.startsWith("/invite/");
          if (parsed.protocol === "https:" && validHost && validPath) discordLink.href = parsed.href;
        } catch {}
      }
      if (value.defaultTheme && validThemes.includes(value.defaultTheme)) applyTheme(value.defaultTheme, false, false);
    } catch (error) { console.warn("Public site settings could not be loaded:", error); }
  }
  $("#supabaseForm").addEventListener("submit", event => {
    event.preventDefault();
    const url = $("#supabaseUrl").value.trim().replace(/\/$/, "");
    const key = $("#supabaseKey").value.trim();
    if (!url || !key) { $("#supabaseStatus").textContent = "Enter both the project URL and public key."; return; }
    try { const parsed = new URL(url); if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".supabase.co")) { $("#supabaseStatus").textContent = "Use your HTTPS Supabase project URL."; return; } } catch { $("#supabaseStatus").textContent = "That project URL is not valid."; return; }
    if (/service_role|sb_secret_/i.test(key)) { $("#supabaseStatus").textContent = "For safety, service-role and secret keys cannot be saved here."; return; }
    if (safeWrite(STORAGE.supabase, { url, key })) { $("#supabaseStatus").textContent = "Saved. Connecting to Supabase…"; initSupabase(); showToast("Supabase configuration saved."); }
  });
  $("#clearSupabase").addEventListener("click", () => {
    if (!window.confirm("Clear the saved Supabase URL and public key from this browser?")) return;
    localStorage.removeItem(STORAGE.supabase); loadSupabaseForm(); initSupabase(); showToast("Using the website's default Supabase configuration.");
  });

  // Keep the supplied brand image consistent for all logo placements.
  $$(".brand-logo").forEach(image => { image.src = LOGO_URL; image.addEventListener("error", () => { image.alt = "VOID DEVELOPMENT"; }); });
  applyTheme(currentTheme);
  const initialRoute = location.pathname.replace(/\/+$/, "") || "/";
  const initialView = new URLSearchParams(location.search).get("view") || (initialRoute === "/scripts" ? "scripts" : initialRoute === "/themes" ? "themes" : initialRoute === "/about" ? "about" : "home");
  setPage(initialView, false);
  observeRiseElements();
  renderScripts();
  initSupabase();
})();
(function(){const init=()=>{const n=document.querySelector("#cookieNotice");if(!n)return;let saved=null;try{saved=JSON.parse(localStorage.getItem("voidDevelopment.cookieChoice.v2")||"null");}catch{}n.hidden=Boolean(saved&&saved.version===2);const options=document.querySelector("#cookieOptions");const analytics=document.querySelector("#cookieAnalytics");if(analytics)analytics.checked=saved?.version===2&&saved.analytics===true;const choose=value=>{const record={version:2,necessary:true,analytics:Boolean(value.analytics),choice:value.choice,updatedAt:new Date().toISOString()};try{localStorage.setItem("voidDevelopment.cookieChoice.v2",JSON.stringify(record));localStorage.setItem("voidDevelopment.cookieChoice.v1",value.choice);}catch{}n.hidden=true;};document.querySelector("#cookieAccept")?.addEventListener("click",()=>choose({choice:"accepted",analytics:true}));document.querySelector("#cookieReject")?.addEventListener("click",()=>choose({choice:"essential-only",analytics:false}));document.querySelector("#cookieCustomize")?.addEventListener("click",()=>{options.hidden=!options.hidden;});document.querySelector("#openCookieSettings")?.addEventListener("click",()=>{n.hidden=false;if(options)options.hidden=false;});document.querySelector("#cookieSave")?.addEventListener("click",()=>choose({choice:"customized",analytics:analytics?.checked===true}));};if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();})();;
document.addEventListener("click",e=>{const home=e.target.closest('[data-view="home"]');if(home){e.preventDefault();window.scrollTo({top:0,behavior:"smooth"});document.querySelectorAll("[data-view]").forEach(b=>b.classList.toggle("active",b===home));}});
