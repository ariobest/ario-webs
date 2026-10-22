# VOID DEVELOPMENT — Cloudflare Workers

This version is structured for **Cloudflare Workers**, not a Pages-only project.

## Deploy

1. Install Node.js.
2. In this folder run:
   `npm install`
3. Run locally:
   `npm run dev`
4. Deploy:
   `npm run deploy`

The static website is in `public/`, and `wrangler.jsonc` configures the Worker to serve those assets.

## Important
The JavaScript was fixed to:
- wait for the DOM via `defer`
- safely handle clipboard support
- provide a fallback copy method
- handle browsers without IntersectionObserver
- support reduced-motion preferences
- avoid errors when optional UI elements are missing
