(() => {
  "use strict";
  const LOGO_URL = "https://www.image2url.com/r2/default/images/1792591024054-9d66ce25-9de6-4662-93d2-a3c6e127a298.png";
  const STORAGE = { theme: "sunnyScripts.theme.v1", scripts: "sunnyScripts.library.v1", supabase: "sunnyScripts.supabase.public.v1", favorites: "sunnyScripts.favorites.v1" };
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
  const starterScripts = [
    { id: "quicktools", name: "QuickTools", category: "Utility", description: "Useful utilities packaged into a simple, easy-to-use script.", link: "" },
    { id: "islandkit", name: "IslandKit", category: "Tools", description: "A set of summer-inspired tools for experimenting with Roblox projects.", link: "" },
    { id: "devbox", name: "DevBox", category: "Learning", description: "Developer-focused helpers and starter snippets for your next idea.", link: "" }
  ];
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const toast = $("#toast");
  let toastTimer;
  const safeRead = (key, fallback) => { try { const value = localStorage.getItem(key); return value === null ? fallback : JSON.parse(value); } catch { return fallback; } };
  const safeWrite = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { showToast("Could not save: browser storage is unavailable."); return false; } };
  const showToast = (message) => { if (!toast) return; toast.textContent = message; toast.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 2200); };
  let scripts = safeRead(STORAGE.scripts, starterScripts);
  if (!Array.isArray(scripts)) scripts = starterScripts.slice();
  const validThemes = ["summer", "light", "dark", "winter", "autumn", "spring"];
  let favorites = new Set(safeRead(STORAGE.favorites, []));
  let showFavorites = false;
  let currentTheme = safeRead(STORAGE.theme, "summer");
  if (!validThemes.includes(currentTheme)) currentTheme = "summer";

  function applyTheme(theme, announce = false) {
    if (!validThemes.includes(theme)) return;
    currentTheme = theme;
    document.documentElement.dataset.theme = theme;
    const themeNames = { summer: "SUMMER EDITION", light: "LIGHT EDITION", dark: "MIDNIGHT EDITION", winter: "WINTER EDITION", autumn: "AUTUMN EDITION", spring: "SPRING EDITION" };
    $("#themeLabel").textContent = themeNames[theme];
    const colors = { summer: "#101a2b", light: "#f7f9fc", dark: "#0a1020", winter: "#eaf6ff", autumn: "#2b1a14", spring: "#eaf7e9" };
    $('meta[name="theme-color"]').content = colors[theme];
    safeWrite(STORAGE.theme, theme);
    $$("[data-theme-choice]").forEach(button => {
      const selected = button.dataset.themeChoice === theme;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    if (announce) showToast(themeNames[theme].replace(" EDITION", "").toLowerCase() + " theme applied");
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
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
    $("#scriptGrid").innerHTML = filtered.map((item, index) => `<article class="script-card" style="--card-index:${index}"><div class="script-card-top"><span class="script-icon">${item.category === "Utility" ? "⌁" : item.category === "Tools" ? "⌘" : "✧"}</span><span class="pill">${escapeHTML(item.category)}</span><button class="favorite-btn ${favorites.has(item.id) ? "is-favorite" : ""}" data-favorite-id="${escapeHTML(item.id)}" type="button" aria-label="${favorites.has(item.id) ? "Remove from" : "Add to"} favorites" aria-pressed="${favorites.has(item.id)}">${favorites.has(item.id) ? "♥" : "♡"}</button></div><h3>${escapeHTML(item.name)}</h3><p>${escapeHTML(item.description)}</p><div class="script-card-actions"><button class="copy-btn" data-copy-name="${escapeHTML(item.name)}" type="button">Copy name <span>↗</span></button>${item.link ? `<a class="open-script" href="${escapeHTML(item.link)}" target="_blank" rel="noopener noreferrer">Open ↗</a>` : ""}</div></article>`).join("");
    $("#emptyState").textContent = showFavorites && filtered.length === 0 ? "No favorites yet — tap the heart on a script to save it." : "No scripts match that search.";
    $("#emptyState").hidden = filtered.length !== 0;
    $("#scriptCount").textContent = scripts.length;
    renderAdminScripts();
    observeRiseElements($("#scriptGrid"));
  }
  function renderAdminScripts() {
    const host = $("#adminScriptList");
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
    $("#editScriptId").value = item.id; $("#newScriptName").value = item.name; $("#newScriptCategory").value = item.category; $("#newScriptDescription").value = item.description; $("#newScriptLink").value = item.link || ""; $("#scriptFormTitle").textContent = "Edit script"; $("#scriptForm").hidden = false; $("#newScriptName").focus();
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
        .from("scripts")
        .select("id,name,category,description,link,created_at")
        .eq("status", "published")
        .order("created_at", { ascending: false });
      if (error) throw error;
      scripts = (data || []).map(item => ({
        id: String(item.id),
        name: item.name,
        category: item.category || "Utility",
        description: item.description || "",
        link: item.link || ""
      }));
      databaseConnected = true;
      safeWrite(STORAGE.scripts, scripts);
      renderScripts();
      if (status) status.textContent = "Connected to Supabase. Published scripts are loading from the database.";
    } catch (error) {
      databaseConnected = false;
      if (status) status.textContent = "Supabase connection failed: " + (error?.message || "check Data API exposure and table grants.");
      console.warn("SunnyScripts Supabase read failed:", error);
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
      console.warn("SunnyScripts Supabase setup failed:", error);
    }
  }

  $("#themeQuick").addEventListener("click", () => { const index = validThemes.indexOf(currentTheme); applyTheme(validThemes[(index + 1) % validThemes.length], true); });
  $("#openAdmin").addEventListener("click", () => openAdmin());
  $("#openAdminFooter").addEventListener("click", () => openAdmin());
  $("#closeAdmin").addEventListener("click", closeAdmin);
  $("#closeAdminBottom").addEventListener("click", closeAdmin);
  $("#adminBackdrop").addEventListener("click", event => { if (event.target === $("#adminBackdrop")) closeAdmin(); });
  document.addEventListener("keydown", event => { if (event.key === "Escape" && !$("#adminBackdrop").hidden) closeAdmin(); });
  $$(".admin-tab").forEach(button => button.addEventListener("click", () => selectAdminTab(button.dataset.adminTab)));
  $$("[data-theme-choice]").forEach(button => button.addEventListener("click", () => applyTheme(button.dataset.themeChoice, true)));
  $$("[data-view]").forEach(button => button.addEventListener("click", () => { const view = button.dataset.view; if (view === "about") $("#about").scrollIntoView({ behavior: "smooth" }); else $("#scripts").scrollIntoView({ behavior: "smooth" }); }));
  $$("[data-scroll-scripts]").forEach(button => button.addEventListener("click", () => $("#scripts").scrollIntoView({ behavior: "smooth" })));
  $("#scriptSearch").addEventListener("input", renderScripts);
  $("#categoryFilter").addEventListener("change", renderScripts);
  $("#sortScripts").addEventListener("change", renderScripts);
  $("#favoritesToggle").addEventListener("click", () => { showFavorites = !showFavorites; renderScripts(); });
  $("#backToTop").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  window.addEventListener("scroll", () => $("#backToTop").classList.toggle("visible", window.scrollY > 500), { passive: true });
  $("#newScriptBtn").addEventListener("click", () => { resetScriptForm(); $("#scriptForm").hidden = false; $("#newScriptName").focus(); });
  $("#cancelScript").addEventListener("click", resetScriptForm);
  $("#scriptForm").addEventListener("submit", event => {
    event.preventDefault();
    const id = $("#editScriptId").value || (window.crypto?.randomUUID?.() || "script-" + Date.now());
    const item = { id, name: $("#newScriptName").value.trim(), category: $("#newScriptCategory").value, description: $("#newScriptDescription").value.trim(), link: $("#newScriptLink").value.trim() };
    if (!item.name || !item.description) return;
    const index = scripts.findIndex(script => script.id === id);
    if (index >= 0) scripts[index] = item; else scripts.unshift(item);
    if (safeWrite(STORAGE.scripts, scripts)) { resetScriptForm(); renderScripts(); showToast("Script saved on this device."); }
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
  $("#scriptGrid").addEventListener("click", async event => {
    const favoriteButton = event.target.closest("[data-favorite-id]");
    if (favoriteButton) {
      const id = favoriteButton.dataset.favoriteId;
      if (favorites.has(id)) favorites.delete(id); else favorites.add(id);
      if (safeWrite(STORAGE.favorites, [...favorites])) { renderScripts(); showToast(favorites.has(id) ? "Added to favorites." : "Removed from favorites."); }
      return;
    }
    const button = event.target.closest("[data-copy-name]"); if (!button) return;
    const value = button.dataset.copyName;
    try { await navigator.clipboard.writeText(value); showToast('"' + value + '" copied!'); }
    catch {
      const area = document.createElement("textarea"); area.value = value; area.style.position = "fixed"; area.style.opacity = "0"; document.body.appendChild(area); area.select();
      let ok = false; try { ok = document.execCommand("copy"); } catch {}
      area.remove(); showToast(ok ? '"' + value + '" copied!' : "Copy unavailable — " + value);
    }
  });
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
  $$(".brand-logo").forEach(image => { image.src = LOGO_URL; image.addEventListener("error", () => { image.alt = "SunnyScripts"; }); });
  applyTheme(currentTheme);
  observeRiseElements();
  renderScripts();
  initSupabase();
})();