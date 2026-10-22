export async function onRequest(context) {
  const response = await context.next();
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;

  const css = `
    :root{--void-logo-filter:none;--void-nav-bg:color-mix(in srgb,var(--surface) 72%,transparent)}
    :root[data-theme="light"]{--void-logo-filter:brightness(0) saturate(100%) invert(42%) sepia(72%) saturate(1260%) hue-rotate(188deg) brightness(88%)}
    :root[data-theme="dark"]{--void-logo-filter:brightness(0) saturate(100%) invert(68%) sepia(38%) saturate(1125%) hue-rotate(199deg) brightness(102%)}
    :root[data-theme="summer"]{--void-logo-filter:brightness(0) saturate(100%) invert(77%) sepia(76%) saturate(630%) hue-rotate(333deg) brightness(103%)}
    :root[data-theme="winter"],:root[data-theme="arctic"]{--void-logo-filter:brightness(0) saturate(100%) invert(82%) sepia(42%) saturate(775%) hue-rotate(160deg) brightness(103%)}
    :root[data-theme="autumn"]{--void-logo-filter:brightness(0) saturate(100%) invert(70%) sepia(57%) saturate(890%) hue-rotate(329deg) brightness(101%)}
    :root[data-theme="spring"],:root[data-theme="forest"]{--void-logo-filter:brightness(0) saturate(100%) invert(72%) sepia(38%) saturate(695%) hue-rotate(87deg) brightness(98%)}
    :root[data-theme="ocean"]{--void-logo-filter:brightness(0) saturate(100%) invert(68%) sepia(47%) saturate(1120%) hue-rotate(159deg) brightness(101%)}
    :root[data-theme="sunset"],:root[data-theme="rose"],:root[data-theme="sakura"]{--void-logo-filter:brightness(0) saturate(100%) invert(67%) sepia(43%) saturate(1010%) hue-rotate(295deg) brightness(104%)}
    :root[data-theme="lavender"]{--void-logo-filter:brightness(0) saturate(100%) invert(73%) sepia(22%) saturate(1130%) hue-rotate(220deg) brightness(102%)}
    :root[data-theme="mint"]{--void-logo-filter:brightness(0) saturate(100%) invert(73%) sepia(35%) saturate(820%) hue-rotate(111deg) brightness(102%)}
    :root[data-theme="cyber"]{--void-logo-filter:brightness(0) saturate(100%) invert(77%) sepia(77%) saturate(1070%) hue-rotate(133deg) brightness(102%)}
    :root[data-theme="crimson"]{--void-logo-filter:brightness(0) saturate(100%) invert(41%) sepia(83%) saturate(1730%) hue-rotate(329deg) brightness(102%)}
    :root[data-theme="gold"]{--void-logo-filter:brightness(0) saturate(100%) invert(78%) sepia(66%) saturate(1100%) hue-rotate(3deg) brightness(102%)}
    :root[data-theme="candy"]{--void-logo-filter:brightness(0) saturate(100%) invert(71%) sepia(35%) saturate(1120%) hue-rotate(292deg) brightness(104%)}
    :root[data-theme="slate"],:root[data-theme="mono"]{--void-logo-filter:brightness(0) invert(1)}
    .nav{width:min(1280px,94%);padding:13px 15px;min-height:70px;border:1px solid var(--line);border-radius:20px;margin:12px auto 0;background:var(--void-nav-bg);box-shadow:0 18px 70px rgba(0,0,0,.18);backdrop-filter:blur(26px) saturate(145%);-webkit-backdrop-filter:blur(26px) saturate(145%)}
    .nav .brand-logo{width:54px;height:54px;border-radius:16px;filter:var(--void-logo-filter);transition:filter .3s,transform .3s;width:clamp(52px,4.5vw,66px);height:clamp(52px,4.5vw,66px)}
    .nav .brand{gap:12px;font-size:21px}.nav .brand:hover .brand-logo{transform:scale(1.04)}
    .nav>nav,.nav>.nav-actions{display:none!important}
    .void-menu-toggle{margin-left:auto;width:48px;height:48px;padding:0;border:1px solid var(--line);border-radius:15px;background:color-mix(in srgb,var(--surface) 72%,transparent);color:var(--ink);display:grid;place-items:center;gap:4px;cursor:pointer;box-shadow:0 10px 35px var(--glow);transition:.2s}
    .void-menu-toggle:hover{border-color:var(--accent);transform:translateY(-1px)}
    .void-menu-toggle i{display:block;width:20px;height:2px;border-radius:99px;background:var(--accent);transition:.25s}
    .void-menu-toggle.is-open i:nth-child(1){transform:translateY(6px) rotate(45deg)}.void-menu-toggle.is-open i:nth-child(2){opacity:0}.void-menu-toggle.is-open i:nth-child(3){transform:translateY(-6px) rotate(-45deg)}
    .void-drawer-backdrop{position:fixed;inset:0;z-index:40;background:rgba(0,0,0,.28);backdrop-filter:blur(5px);opacity:0;pointer-events:none;transition:opacity .25s}.void-drawer-backdrop.open{opacity:1;pointer-events:auto}
    .void-drawer{position:fixed;z-index:41;top:12px;right:12px;width:min(360px,calc(100vw - 24px));max-height:calc(100vh - 24px);overflow:auto;padding:16px;border:1px solid var(--line);border-radius:24px;background:color-mix(in srgb,var(--surface) 82%,transparent);box-shadow:0 35px 110px rgba(0,0,0,.4);backdrop-filter:blur(30px) saturate(150%);-webkit-backdrop-filter:blur(30px) saturate(150%);transform:translateX(115%);transition:transform .3s cubic-bezier(.2,.8,.2,1)}
    .void-drawer.open{transform:translateX(0)}
    .void-drawer-head{display:flex;align-items:center;justify-content:space-between;padding:5px 4px 14px}.void-drawer-title{font:700 17px 'Space Grotesk',sans-serif;color:var(--ink);letter-spacing:-.02em}.void-drawer-close{border:0;background:transparent;color:var(--muted);font-size:25px;cursor:pointer;padding:4px 8px}.void-drawer-close:hover{color:var(--ink)}
    .void-drawer-group{display:grid;gap:5px;padding:9px 0;border-top:1px solid var(--line)}
    .void-drawer-link{width:100%;border:0;border-radius:12px;background:transparent;color:var(--muted);padding:13px 12px;text-align:left;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:space-between}.void-drawer-link:hover,.void-drawer-link.active{background:var(--glow);color:var(--accent)}
    .void-drawer-meta{padding:10px 12px;color:var(--muted);font-size:10px;letter-spacing:.12em;font-weight:800;text-transform:uppercase}
    .void-drawer-action{width:100%;border:1px solid var(--line);border-radius:12px;background:color-mix(in srgb,var(--surface-2) 75%,transparent);color:var(--ink);padding:12px;text-align:left;font-weight:700;cursor:pointer}.void-drawer-action:hover{border-color:var(--accent);color:var(--accent)}
    .void-page-loader{position:fixed;top:0;left:0;right:0;height:3px;z-index:100;pointer-events:none;overflow:hidden;background:transparent}.void-page-loader span{display:block;width:28%;height:100%;background:var(--accent);box-shadow:0 0 18px var(--accent);transform:translateX(-120%);opacity:0}.void-page-loader.loading span{opacity:1;animation:void-load 1.15s cubic-bezier(.4,0,.2,1) infinite}.void-page-loader.done span{opacity:0;transform:translateX(350%);transition:transform .35s,opacity .25s}@keyframes void-load{0%{transform:translateX(-120%)}100%{transform:translateX(420%)}}
    body.void-drawer-open{overflow:hidden}
    @media(max-width:700px){.nav{width:calc(100% - 16px);margin-top:8px;padding:9px 10px;min-height:64px;border-radius:18px}.nav .brand-logo{width:48px;height:48px}.nav .brand{font-size:17px}.void-menu-toggle{width:44px;height:44px;border-radius:13px}.void-drawer{top:8px;right:8px;width:calc(100vw - 16px);max-height:calc(100vh - 16px);border-radius:20px}}
    .hero-brand-mark img{display:none!important}
  `;

  const drawer = `
    <div class="void-drawer-backdrop" id="voidDrawerBackdrop"></div>
    <aside class="void-drawer" id="voidDrawer" aria-hidden="true" aria-label="Site navigation">
      <div class="void-drawer-head"><span class="void-drawer-title">VOID DEVELOPMENT</span><button class="void-drawer-close" id="voidDrawerClose" type="button" aria-label="Close menu">×</button></div>
      <div class="void-drawer-group">
        <div class="void-drawer-meta">Navigation</div>
        <button class="void-drawer-link" data-void-view="home">Home <span>⌂</span></button>
        <button class="void-drawer-link" data-void-view="scripts">Scripts <span>⌘</span></button>
        <button class="void-drawer-link" data-void-view="about">About <span>ⓘ</span></button>
        <button class="void-drawer-link" data-void-view="themes">Themes <span>◈</span></button>
      </div>
      <div class="void-drawer-group">
        <div class="void-drawer-meta">Quick actions</div>
        <button class="void-drawer-action" id="voidThemeAction" type="button">Switch theme</button>
        <button class="void-drawer-action" id="voidDiscordAction" type="button">Discord ↗</button>
        <button class="void-drawer-action" id="voidAuthAction" type="button">Sign up / Log in</button>
        <button class="void-drawer-action" id="voidProfileAction" type="button" hidden>Profile</button>
        <button class="void-drawer-action" id="voidAdminAction" type="button" hidden>Admin panel ↗</button>
      </div>
    </aside>`;

  const script = `
    (() => {
      const $ = (s, r=document) => r.querySelector(s);
      const $$ = (s, r=document) => [...r.querySelectorAll(s)];
      const drawer = document.createElement('div'); drawer.innerHTML = ${JSON.stringify(drawer)}; document.body.append(...drawer.children);
      const backdrop = $('#voidDrawerBackdrop'), panel = $('#voidDrawer');
      const toggle = document.createElement('button'); toggle.className='void-menu-toggle'; toggle.id='voidMenuToggle'; toggle.type='button'; toggle.setAttribute('aria-label','Open menu'); toggle.setAttribute('aria-expanded','false'); toggle.innerHTML='<i></i><i></i><i></i>';
      $('.nav')?.append(toggle);
      const open = () => { panel.classList.add('open'); backdrop.classList.add('open'); toggle.classList.add('is-open'); toggle.setAttribute('aria-expanded','true'); panel.setAttribute('aria-hidden','false'); document.body.classList.add('void-drawer-open'); };
      const close = () => { panel.classList.remove('open'); backdrop.classList.remove('open'); toggle.classList.remove('is-open'); toggle.setAttribute('aria-expanded','false'); panel.setAttribute('aria-hidden','true'); document.body.classList.remove('void-drawer-open'); };
      toggle.addEventListener('click', () => panel.classList.contains('open') ? close() : open());
      backdrop.addEventListener('click', close); $('#voidDrawerClose').addEventListener('click', close);
      $$('[data-void-view]').forEach(btn => btn.addEventListener('click', () => { $('.nav-link[data-view="'+btn.dataset.voidView+'"]')?.click(); close(); }));
      $('#voidThemeAction').addEventListener('click', () => { $('#themeQuick')?.click(); close(); });
      $('#voidDiscordAction').addEventListener('click', () => { $('#discordLink')?.click(); close(); });
      $('#voidAuthAction').addEventListener('click', () => { $('#openAuth')?.click(); close(); });
      $('#voidProfileAction').addEventListener('click', () => { $('#openProfile')?.click(); close(); });
      $('#voidAdminAction').addEventListener('click', () => { $('#openAdmin')?.click(); close(); });
      const sync = () => { const admin=$('#openAdmin'); const profile=$('#openProfile'); if(admin) $('#voidAdminAction').hidden=admin.hidden; if(profile) $('#voidProfileAction').hidden=profile.hidden; };
      sync(); new MutationObserver(sync).observe(document.body,{subtree:true,attributes:true,attributeFilter:['hidden']});
      document.addEventListener('keydown', e => { if(e.key==='Escape' && panel.classList.contains('open')) close(); });
      const bar=document.createElement('div'); bar.className='void-page-loader'; bar.innerHTML='<span></span>'; document.body.prepend(bar);
      const start=()=>{bar.classList.remove('done');bar.classList.add('loading')}; const done=()=>{bar.classList.remove('loading');bar.classList.add('done');};
      start(); window.addEventListener('load',()=>setTimeout(done,180));
      document.addEventListener('click', e => { if(e.target.closest('[data-view]')) { start(); setTimeout(done,420); } });
      const rewriteKeyCopy = () => { $$('body *').forEach(el => { if(el.children.length===0 && /daily limit|daily key limit|limit of one key per day/i.test(el.textContent||'')) el.textContent='One key per day'; }); };
      new MutationObserver(rewriteKeyCopy).observe(document.body,{subtree:true,childList:true,characterData:true}); rewriteKeyCopy();
    })();`;

  return new HTMLRewriter()
    .on("head", { element(el) { el.append(`<style>${css}</style>`, { html: true }); } })
    .on("body", { element(el) { el.append(drawer, { html: true }); el.append(`<script>${script}</script>`, { html: true }); } })
    .on("header.nav", { element(el) { el.setAttribute("data-void-shell", "true"); } })
    .on(".hero-brand-mark img", { element(el) { el.remove(); } })
    .transform(response);
}
