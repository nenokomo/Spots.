import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// [TODO: Domain] – beim Deployen als Umgebungsvariable SITE_URL setzen (z. B. https://spots-app.de).
const site = process.env.SITE_URL || 'https://spots.example';

export default defineConfig({
  site,
  trailingSlash: 'always',
  integrations: [sitemap({ filter: (page) => !/\/(impressum|datenschutz)\/$/.test(page) })],
  devToolbar: { enabled: false },
  // Nur die eigene tsconfig nutzen, nie die der App im Hauptordner (die braucht expo, das beim Hoster nicht installiert ist).
  vite: { tsconfig: './tsconfig.json' },
});
