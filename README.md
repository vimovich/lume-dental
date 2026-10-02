# Lumé Dental — сайт клиники эстетической стоматологии

Многостраничный сайт (концепт) на Vite + Three.js.

- `index.html` — главная (3D-зуб в стеклянной капсуле, HUD-сканер, до/после, стеклянные карточки, CTA)
- `uslugi.html`, `tehnologii.html`, `vrachi.html`, `ceny.html`, `o-klinike.html`, `kontakty.html`, `404.html`
- Общие блоки — `src/partials/*` (подключаются при сборке)
- 3D-модель зуба генерируется из SDF: `node scripts/build-tooth.mjs` → `public/assets/tooth.bin`

```bash
npm install
npm run dev     # разработка
npm run build   # сборка в dist/
```

Деплой: Vercel (Framework preset: Vite, output `dist`).
