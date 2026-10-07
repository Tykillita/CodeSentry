import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwind from '@tailwindcss/vite';

export default defineConfig({
  devToolbar: { enabled: false },
  site: process.env.PUBLIC_SITE_URL || 'https://gocodesentry.web.app',
  output: 'static',
  trailingSlash: 'always',
  integrations: [react(), sitemap()],
  vite: { plugins: [tailwind()] },
});
