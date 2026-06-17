# Landing Page Assets

Optional real product images for the homepage proof section belong here.

- `product-dashboard.png`: main dashboard or inbox screenshot, ideally 1600x1200 or wider.
- `widget-on-site.png`: website screenshot showing the Osonflow widget in context, ideally 1400x1100 or wider.
- `voice-handoff.png`: voice, transcript, or human handoff screenshot, ideally 1400x1100 or wider.

After adding an image, set the matching `imageSrc` in
`apps/web/modules/marketing/ui/components/home-landing.tsx` to:

- `/landing/product-dashboard.png`
- `/landing/widget-on-site.png`
- `/landing/voice-handoff.png`

## Landing styles

The homepage loads `japandi-landing.css` from this folder at runtime and removes it when you leave the page. That prevents landing styles from leaking into the dashboard after client-side navigation.

When editing the source stylesheet at
`apps/web/modules/marketing/ui/styles/japandi-landing.css`, copy the updated file here:

```bash
cp apps/web/modules/marketing/ui/styles/japandi-landing.css apps/web/public/landing/japandi-landing.css
```
