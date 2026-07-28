# Osonflow landing page export

Standalone bundle for redesign prompts (Claude Opus, etc.).

## Preview locally

```bash
cd apps/embed/osonflow-landing-export
python3 -m http.server 4173
```

Open http://localhost:4173

## Attach to Opus

Zip this entire folder, or attach:
- `index.html`
- `japandi-landing.css`
- `main.js`
- `assets/` (if Opus needs images)

## Regenerate after repo changes

```bash
node apps/embed/osonflow-landing-export/build-export.mjs
```

## Notes

- Nav is static HTML (production uses React + Clerk).
- Hero case study slot is a placeholder (production uses React video carousel).
- Sign-in/sign-up links point to `#cta` in this export.
