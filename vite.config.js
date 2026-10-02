import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pages = ['index', 'uslugi', 'tehnologii', 'vrachi', 'ceny', 'o-klinike', 'kontakty', '404'];
const U = (id, w, h) => `https://images.unsplash.com/photo-${id}?auto=format&amp;fit=crop&amp;w=${w}${h ? `&amp;h=${h}` : ''}&amp;q=78`;

function includes() {
  return {
    name: 'html-includes',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        // partials, up to 2 levels deep
        for (let i = 0; i < 2; i++) {
          html = html.replace(/<!--\s*@include\s+([\w-]+)\s*-->/g, (_, n) => readFileSync(resolve(__dirname, `src/partials/${n}.html`), 'utf8'));
        }
        // image helpers: IMG(id,w[,h]) and SRCSET(id[,ratio])
        html = html.replace(/IMG\(([\w-]+),(\d+)(?:,(\d+))?\)/g, (_, id, w, h) => U(id, w, h));
        html = html.replace(/SRCSET\(([\w-]+)(?:,([\d.]+))?\)/g, (_, id, r) =>
          [480, 800, 1200, 1800].map((w) => `${U(id, w, r ? Math.round(w * +r) : 0)} ${w}w`).join(', '));
        return html;
      },
    },
  };
}

export default defineConfig({
  plugins: [includes()],
  build: {
    rollupOptions: { input: Object.fromEntries(pages.map((p) => [p, resolve(__dirname, `${p}.html`)])) },
    chunkSizeWarningLimit: 900,
  },
});
