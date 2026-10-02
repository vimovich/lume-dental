const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const html = document.documentElement;
html.classList.remove('no-js');

/* ---------- active nav ---------- */
const norm = (p) => (p.replace(/\.html$/, '').replace(/\/index$/, '/').replace(/\/+$/, '') || '/');
const here = norm(location.pathname);
$$('.nav a, .mnav__links a').forEach((a) => {
  if (norm(new URL(a.href).pathname) === here) { a.classList.add('is-active'); a.setAttribute('aria-current', 'page'); }
});

/* ---------- header ---------- */
const hdr = $('[data-hdr]');
const onScroll = () => hdr && hdr.classList.toggle('is-scrolled', scrollY > 8);
addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------- mobile menu ---------- */
const burger = $('[data-burger]');
const mnav = $('[data-mnav]');
const setMenu = (open) => {
  html.classList.toggle('menu-open', open);
  burger?.setAttribute('aria-expanded', String(open));
  burger?.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  mnav?.setAttribute('aria-hidden', String(!open));
};
burger?.addEventListener('click', () => setMenu(!html.classList.contains('menu-open')));
$$('a', mnav || document.createElement('div')).forEach((a) => a.addEventListener('click', () => setMenu(false)));
matchMedia('(min-width: 1025px)').addEventListener('change', (e) => e.matches && setMenu(false));

/* ---------- reveal on scroll ---------- */
const rio = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); rio.unobserve(e.target); } }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
$$('[data-reveal], .pcta').forEach((el) => rio.observe(el));

/* ---------- modal (booking) ---------- */
let lastFocus = null;
function openModal(m) {
  if (!m) return;
  lastFocus = document.activeElement;
  m.classList.add('is-open');
  m.setAttribute('aria-hidden', 'false');
  html.style.overflow = 'hidden';
  setTimeout(() => $('input, select, button', $('.modal__box', m))?.focus({ preventScroll: true }), 60);
}
function closeModal(m) {
  if (!m) return;
  m.classList.remove('is-open');
  m.setAttribute('aria-hidden', 'true');
  if (!$('.modal.is-open')) html.style.overflow = '';
  lastFocus?.focus?.({ preventScroll: true });
}
const book = $('[data-modal]');
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-book]');
  if (b) {
    e.preventDefault();
    setFab(false); setMenu(false);
    $$('.modal.is-open').forEach(closeModal);
    const form = $('[data-form]', book);
    form?.classList.remove('is-sent');
    const want = b.getAttribute('data-book');
    const sel = $('[data-service]', book);
    if (sel && want) { const o = [...sel.options].find((o) => o.text.toLowerCase().includes(want.toLowerCase())); sel.value = o ? o.value || o.text : ''; }
    openModal(book);
  }
  const c = e.target.closest('[data-close]');
  if (c) closeModal(c.closest('.modal'));
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { $$('.modal.is-open').forEach(closeModal); setFab(false); setMenu(false); }
});

/* ---------- floating contact ---------- */
const fab = $('[data-fab]');
function setFab(open) { html.classList.toggle('fab-open', open); fab?.setAttribute('aria-expanded', String(open)); }
fab?.addEventListener('click', () => setFab(!html.classList.contains('fab-open')));
document.addEventListener('click', (e) => { if (!e.target.closest('[data-fab], [data-fabmenu]')) setFab(false); });

/* ---------- forms ---------- */
function maskPhone(v) {
  let d = v.replace(/\D/g, '');
  if (d.startsWith('998')) d = d.slice(3);
  d = d.slice(0, 9);
  let out = '+998';
  if (d.length) out += ' ' + d.slice(0, 2);
  if (d.length > 2) out += ' ' + d.slice(2, 5);
  if (d.length > 5) out += '-' + d.slice(5, 7);
  if (d.length > 7) out += '-' + d.slice(7, 9);
  return out;
}
$$('[data-phone]').forEach((i) => {
  i.addEventListener('focus', () => { if (!i.value) i.value = '+998 '; });
  i.addEventListener('input', () => { i.value = maskPhone(i.value); });
  i.addEventListener('blur', () => { if (i.value.trim() === '+998') i.value = ''; });
});
$$('[data-form]').forEach((f) => {
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    let ok = true;
    $$('input[required]', f).forEach((i) => {
      const fld = i.closest('.fld');
      let valid = i.type === 'checkbox' ? i.checked : i.value.trim().length > 1;
      if (i.hasAttribute('data-phone')) valid = i.value.replace(/\D/g, '').length === 12;
      fld?.classList.toggle('is-err', !valid);
      if (!valid) ok = false;
    });
    if (!ok) { $('.is-err input', f)?.focus(); return; }
    // Demo: no backend yet — plug Telegram bot / CRM webhook here.
    f.classList.add('is-sent');
    setTimeout(() => { f.reset(); }, 400);
  });
  f.addEventListener('input', (e) => e.target.closest('.fld')?.classList.remove('is-err'));
});

/* ---------- before / after ---------- */
$$('[data-ba]').forEach((ba) => {
  let drag = false;
  const set = (clientX) => {
    const r = ba.getBoundingClientRect();
    const x = Math.min(Math.max((clientX - r.left) / r.width, 0.04), 0.96);
    ba.style.setProperty('--x', (x * 100).toFixed(2) + '%');
  };
  ba.addEventListener('pointerdown', (e) => { drag = true; ba.setPointerCapture(e.pointerId); set(e.clientX); });
  ba.addEventListener('pointermove', (e) => drag && set(e.clientX));
  ba.addEventListener('pointerup', () => (drag = false));
  ba.addEventListener('pointercancel', () => (drag = false));
  ba.tabIndex = 0;
  ba.setAttribute('role', 'slider');
  ba.setAttribute('aria-label', 'Сравнение до и после');
  ba.setAttribute('aria-valuemin', '0'); ba.setAttribute('aria-valuemax', '100'); ba.setAttribute('aria-valuenow', '50');
  ba.addEventListener('keydown', (e) => {
    const cur = parseFloat(getComputedStyle(ba).getPropertyValue('--x')) || 50;
    const step = e.key === 'ArrowLeft' ? -4 : e.key === 'ArrowRight' ? 4 : 0;
    if (!step) return;
    const v = Math.min(96, Math.max(4, cur + step));
    ba.style.setProperty('--x', v + '%'); ba.setAttribute('aria-valuenow', String(Math.round(v)));
  });
  // intro hint animation
  const io = new IntersectionObserver(([en]) => {
    if (!en.isIntersecting) return; io.disconnect();
    const t0 = performance.now();
    const anim = (t) => {
      const p = Math.min((t - t0) / 1800, 1);
      const v = 50 + Math.sin(p * Math.PI * 2) * 18 * (1 - p);
      if (!drag) ba.style.setProperty('--x', v + '%');
      if (p < 1) requestAnimationFrame(anim);
    };
    requestAnimationFrame(anim);
  }, { threshold: 0.5 });
  io.observe(ba);
});

/* ---------- glass card tilt ---------- */
if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
  $$('[data-tilt]').forEach((c) => {
    c.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      c.style.transform = `rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateY(-4px)`;
    });
    c.addEventListener('pointerleave', () => (c.style.transform = ''));
  });
}

/* ---------- filter chips (services) ---------- */
$$('[data-chips]').forEach((wrap) => {
  wrap.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    $$('button', wrap).forEach((x) => x.classList.toggle('is-active', x === b));
    const f = b.dataset.f;
    $$('[data-cat]').forEach((el) => el.classList.toggle('is-hidden', f !== 'all' && el.dataset.cat !== f));
  });
});

/* ---------- price tabs ---------- */
$$('[data-ptabs]').forEach((tabs) => {
  tabs.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    $$('button', tabs).forEach((x) => { x.classList.toggle('is-active', x === b); x.setAttribute('aria-selected', String(x === b)); });
    $$('.ptable').forEach((t) => t.classList.toggle('is-active', t.id === b.dataset.t));
  });
});

/* ---------- doctor modal ---------- */
const dmodal = $('[data-dmodal]');
if (dmodal) {
  $$('[data-doc]').forEach((d) => d.addEventListener('click', () => {
    const data = JSON.parse(d.dataset.doc);
    $('[data-d-img]', dmodal).src = $('img', d).currentSrc || $('img', d).src;
    $('[data-d-img]', dmodal).alt = data.name;
    $('[data-d-name]', dmodal).textContent = data.name;
    $('[data-d-role]', dmodal).textContent = data.role;
    $('[data-d-bio]', dmodal).textContent = data.bio;
    $('[data-d-edu]', dmodal).textContent = data.edu;
    $('[data-d-exp]', dmodal).textContent = data.exp;
    $('[data-d-book]', dmodal).setAttribute('data-book', data.service || '');
    openModal(dmodal);
  }));
}

/* ---------- 3D tooth scenes (lazy) ---------- */
const webgl = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
const lazy = (el, fn) => {
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); fn(); } }, { rootMargin: '300px' });
  io.observe(el);
};
if (webgl) {
  $$('[data-tooth]').forEach((el) => lazy(el, async () => {
    const { mountTooth } = await import('./tooth3d.js');
    mountTooth(el, { mode: el.dataset.tooth || 'hero', rotY: el.dataset.rot ? +el.dataset.rot : undefined, view: el.dataset.view ? +el.dataset.view : undefined });
  }));

  $$('[data-scan]').forEach((root) => lazy(root, async () => {
    const { mountTooth } = await import('./tooth3d.js');
    const mark = $('[data-ruler-mark]', root);
    const gv = $('[data-gauge-v]', root);
    const garc = $('[data-gauge-arc]', root);
    const bar = $('[data-bar]', root);
    const ro = $$('[data-ro]', root);
    let last = 0;
    mountTooth($('[data-scan-canvas]', root), {
      mode: 'scan',
      onScan(p) {
        const now = performance.now();
        if (now - last < 60) return; last = now;
        const pct = Math.round(p * 100);
        if (mark) { mark.style.top = (100 - (6 + p * 82)).toFixed(2) + '%'; mark.dataset.v = (p * 24.6).toFixed(1) + ' мм'; }
        if (gv) gv.textContent = pct + '%';
        if (garc) garc.style.strokeDashoffset = String(1 - p);
        if (bar) bar.style.setProperty('--w', 40 + p * 58 + '%');
        ro.forEach((r, i) => { r.textContent = (i === 0 ? 12.4 + p * 3.1 : i === 1 ? 8.1 - p * 2.2 : 0.02 + p * 0.03).toFixed(i === 2 ? 3 : 1); });
      },
    });
  }));
} else {
  $$('[data-tooth], [data-scan-canvas]').forEach((el) => el.remove());
}

/* ---------- scan tabs (auto-rotating) ---------- */
$$('[data-tabs]').forEach((wrap) => {
  const tabs = $$('[data-tab]', wrap.closest('section'));
  const slots = $$('[data-slot]', wrap.closest('section'));
  const content = JSON.parse($('script[type="application/json"]', wrap.closest('section')).textContent);
  let i = 0, timer;
  const dur = 7000;
  const show = (n) => {
    i = n;
    tabs.forEach((t, k) => { t.classList.toggle('is-active', k === n); t.setAttribute('aria-selected', String(k === n)); t.style.setProperty('--dur', dur + 'ms'); });
    slots.forEach((s) => s.classList.add('is-out'));
    setTimeout(() => {
      slots.forEach((s) => { s.innerHTML = content[n][s.dataset.slot]; s.classList.remove('is-out'); });
    }, 260);
    clearTimeout(timer);
    timer = setTimeout(() => show((i + 1) % tabs.length), dur);
  };
  tabs.forEach((t, k) => t.addEventListener('click', () => show(k)));
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { show(i); } else clearTimeout(timer); }, { threshold: 0.3 });
  io.observe(wrap);
});

/* ---------- counters ---------- */
$$('[data-count]').forEach((el) => {
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return; io.disconnect();
    const to = parseFloat(el.dataset.count), dec = (el.dataset.count.split('.')[1] || '').length;
    const suf = el.dataset.suf || '';
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min((t - t0) / 1600, 1), v = to * (1 - Math.pow(1 - p, 3));
      el.textContent = v.toLocaleString('ru-RU', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, { threshold: 0.6 });
  io.observe(el);
});

/* ---------- parallax on CTA bg ---------- */
const pbg = $('.pcta__bg');
if (pbg && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const sec = pbg.parentElement;
  const tick = () => {
    const r = sec.getBoundingClientRect();
    if (r.bottom > 0 && r.top < innerHeight) {
      const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
      pbg.style.transform = `translateY(${(p * -40).toFixed(1)}px)`;
    }
  };
  addEventListener('scroll', tick, { passive: true });
  tick();
}
