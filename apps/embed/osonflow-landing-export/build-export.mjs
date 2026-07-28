#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../web");
const out = __dirname;

const markupTs = fs.readFileSync(
  path.join(root, "modules/marketing/ui/components/landing-page-markup.ts"),
  "utf8",
);

// eslint-disable-next-line no-eval
const body = eval(
  markupTs.replace(
    "export const landingPageBodyMarkup",
    "globalThis.__landingBody",
  ) + "; globalThis.__landingBody",
);

let htmlBody = body
  .replace(/\/landing\/assets\//g, "./assets/")
  .replace(/href="\/sign-up"/g, 'href="#cta"')
  .replace(/href="\/sign-in"/g, 'href="#cta"');

const caseStudyPlaceholder = `<div class="case-study-placeholder" id="osonflow-case-study-root">
  <div class="case-study-placeholder__inner">
    <p class="case-study-placeholder__eyebrow">Case study showcase</p>
    <p class="case-study-placeholder__text">In production this slot is a React component with video case studies. Redesign or replace freely.</p>
  </div>
</div>`;

htmlBody = htmlBody.replace(
  '<div id="osonflow-case-study-root"></div>',
  caseStudyPlaceholder,
);

const nav = `  <header class="nav" id="nav">
    <div class="nav__shell">
      <div class="nav__capsule">
        <div class="nav__brand-chip">
          <a class="brand" href="#" aria-label="Osonflow home">
            <span class="brand__mark" aria-hidden="true">
              <img class="brand__img" src="./assets/logo-mark.png" alt="" width="30" height="30" />
            </span>
            <span class="brand__name">Osonflow</span>
          </a>
        </div>
        <nav aria-label="Primary" class="nav__links">
          <div class="nav__menu" id="navMenu">
            <a href="#product">Platform</a>
            <a href="#loop">How it works</a>
            <a href="#experience">Live demo</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">Resources</a>
          </div>
        </nav>
        <div class="nav__actions">
          <div class="nav__auth">
            <a class="link-quiet" href="#cta">Sign in</a>
            <a class="btn btn--primary btn--sm" href="#cta">Sign up</a>
          </div>
          <button aria-expanded="false" aria-label="Toggle menu" class="nav__toggle" id="navToggle" type="button">
            <span></span><span></span>
          </button>
        </div>
      </div>
    </div>
  </header>
  <button class="nav__backdrop" id="navBackdrop" type="button" aria-label="Close menu" hidden></button>
  <div class="nav__mobile" id="navMobile" hidden>
    <a href="#product">Platform</a>
    <a href="#loop">How it works</a>
    <a href="#experience">Live demo</a>
    <a href="#pricing">Pricing</a>
    <a href="#faq">Resources</a>
    <div class="nav__mobile-actions">
      <a class="nav__mobile-auth-link" href="#cta">Sign in</a>
      <a class="btn btn--primary btn--block nav__mobile-cta" href="#cta">Sign up</a>
    </div>
  </div>`;

const extraStyles = `
.case-study-placeholder {
  margin-top: clamp(24px, 4vw, 40px);
  border: 1px dashed var(--linen-300);
  border-radius: var(--radius-lg);
  background: rgba(255,255,255,0.55);
  min-height: 220px;
  display: grid;
  place-items: center;
  padding: 24px;
}
.case-study-placeholder__eyebrow {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-soft);
  margin-bottom: 8px;
}
.case-study-placeholder__text {
  max-width: 36ch;
  text-align: center;
  color: var(--ink-soft);
  font-size: 14px;
}
`;

const navScript = `
(function () {
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('navToggle');
  const mobile = document.getElementById('navMobile');
  const backdrop = document.getElementById('navBackdrop');
  if (!nav || !toggle || !mobile || !backdrop) return;

  const setOpen = (open) => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    mobile.hidden = !open;
    backdrop.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
  };

  toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
  backdrop.addEventListener('click', () => setOpen(false));
  mobile.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false)));

  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  document.querySelectorAll('.hero [data-reveal], .hero .reveal').forEach((el) => el.classList.add('is-in'));
})();
`;

const indexHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Osonflow — One calm front door for customer support</title>
  <meta name="description" content="AI answers grounded in trusted context. Humans take over with full history when judgment is needed." />
  <link rel="icon" href="./assets/favicon.svg" type="image/svg+xml" />
  <link rel="stylesheet" href="./japandi-landing.css" />
  <link rel="stylesheet" href="./motion.css" />
  <style>${extraStyles}</style>
</head>
<body>
  <div class="japandi-landing">
${nav}
${htmlBody}
  </div>
  <script src="./main.js"></script>
  <script>${navScript}</script>
  <script>window.__initOsonflowLanding?.();</script>
  <script src="./motion.js"></script>
</body>
</html>`;

fs.writeFileSync(path.join(out, "index.html"), indexHtml);
fs.copyFileSync(
  path.join(root, "modules/marketing/ui/styles/japandi-landing.css"),
  path.join(out, "japandi-landing.css"),
);
fs.copyFileSync(path.join(root, "public/landing/main.js"), path.join(out, "main.js"));
fs.copyFileSync(path.join(root, "public/landing/motion.css"), path.join(out, "motion.css"));
fs.copyFileSync(path.join(root, "public/landing/motion.js"), path.join(out, "motion.js"));

const assetsSrc = path.join(root, "public/landing/assets");
const assetsDst = path.join(out, "assets");
fs.cpSync(assetsSrc, assetsDst, { recursive: true });

const readme = `# Osonflow landing page export

Standalone bundle for redesign prompts (Claude Opus, etc.).

## Preview locally

\`\`\`bash
cd apps/embed/osonflow-landing-export
python3 -m http.server 4173
\`\`\`

Open http://localhost:4173

## Attach to Opus

Zip this entire folder, or attach:
- \`index.html\`
- \`japandi-landing.css\`
- \`motion.css\`
- \`main.js\`
- \`motion.js\`
- \`assets/\` (if Opus needs images)

## Regenerate after repo changes

\`\`\`bash
node apps/embed/osonflow-landing-export/build-export.mjs
\`\`\`

## Notes

- Nav is static HTML (production uses React + Clerk).
- Hero case study slot is a placeholder (production uses React video carousel).
- Sign-in/sign-up links point to \`#cta\` in this export.
`;

fs.writeFileSync(path.join(out, "README.md"), readme);

console.log("Export ready:", out);
console.log("Files: index.html, japandi-landing.css, motion.css, main.js, motion.js, assets/");
