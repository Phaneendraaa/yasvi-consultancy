# Yasvi Overseas Consultancy — website

Static site: plain HTML, CSS and JavaScript. The 3D globe uses three.js (loaded from jsDelivr).

## Files
- `index.html` — page
- `assets/css/styles.css` — styles
- `assets/js/main.js` — interactions, WhatsApp links, form
- `assets/js/globe.js` — three.js globe
- `assets/js/countries.js` — the six destinations (names, facts, map outlines)
- `assets/img/` — student photos and the land map used by the globe

## Run locally
The globe loads files with ES modules, so open it through a local server, not by double-clicking:

    npx serve .        # or: python3 -m http.server

## Deploy
Upload the folder as-is to Vercel, Netlify, GitHub Pages or any static host.

## Edit
- WhatsApp number: `WA_NUMBER` in `assets/js/main.js` and the `wa.me` links in `index.html`.
- Country facts and cities: `assets/js/countries.js`.
- Stat card values: `stats` in `assets/js/main.js`.
