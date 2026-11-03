// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  devToolbar: { enabled: false },
  adapter: vercel(),
  integrations: [icon()],
  vite: {
    plugins: [tailwindcss()],
  },
});
