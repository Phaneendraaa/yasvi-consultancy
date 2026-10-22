import { COUNTRIES } from './countries.js';

const WA_NUMBER = '919989884094';
const waLink = (text) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
document.documentElement.classList.add('js');

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- WhatsApp links ---------- */
$$('[data-wa]').forEach((a) => {
  a.href = waLink(a.dataset.waText || "Hi Yasvi, I'd like to know more about studying abroad.");
});

/* ---------- Country silhouettes ---------- */
const silhouette = (c, cls = '') => `
  <svg viewBox="0 0 240 200" class="${cls}" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
    <path class="land" d="${c.path}"/>
    <circle class="city-ring" cx="${c.dot[0]}" cy="${c.dot[1]}" r="5"/>
    <circle class="city-dot" cx="${c.dot[0]}" cy="${c.dot[1]}" r="5"/>
  </svg>`;

const arrow = '<svg viewBox="0 0 20 20" aria-hidden="true"><use href="#i-arrow"/></svg>';

$('#miniCountries').innerHTML = COUNTRIES.slice(0, 3).map((c) => `
  <a class="mini" href="#c-${c.id}">
    <span class="mini__map">${silhouette(c)}<span class="round-btn">${arrow}</span></span>
    <span class="mini__body">
      <span class="mini__name">${c.code === 'UK' ? 'UK' : c.name}</span>
      <span class="mini__city">${c.city}</span>
    </span>
  </a>`).join('');

$('#countryGrid').innerHTML = COUNTRIES.map((c, i) => `
  <a class="ccard rv" id="c-${c.id}" style="--rd:${(i % 3) * 90}ms" href="${waLink(`Hi Yasvi, I'd like to know about studying in ${c.name}.`)}" target="_blank" rel="noopener"
     aria-label="${c.name}: ask Yasvi on WhatsApp">
    <div class="ccard__map">
      <span class="ccard__code">${c.code}</span>
      <span class="ccard__flight">HYD → ${c.city.slice(0, 3).toUpperCase()}</span>
      ${silhouette(c)}
    </div>
    <div class="ccard__body">
      <h3 class="ccard__name">${c.name}</h3>
      <p class="ccard__cities">${c.cities}</p>
      <ul class="ccard__facts">${c.facts.map((f) => `<li>${f}</li>`).join('')}</ul>
      <div class="ccard__foot"><span class="ccard__ask">Ask about ${c.code === 'UK' ? 'the UK' : c.name}</span><span class="round-btn">${arrow}</span></div>
    </div>
  </a>`).join('');

/* ---------- Nav ---------- */
const nav = $('.nav');
const burger = $('.burger');
const mnav = $('#mnav');
const setMenu = (open) => {
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  mnav.hidden = !open;
};
burger.addEventListener('click', () => setMenu(mnav.hidden));
mnav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

const navLinks = $$('.nav__links a');
const sections = navLinks.map((a) => $(a.getAttribute('href'))).filter(Boolean);

/* ---------- Reveal on scroll (only for things below the first screen) ---------- */
const rvEls = $$('.rv');
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
if (!reduced) {
  rvEls.forEach((el) => {
    if (el.getBoundingClientRect().top > window.innerHeight * 0.95) { el.classList.add('rv-wait'); io.observe(el); }
  });
}

/* ---------- Scroll-driven bits ---------- */
const steps = $('#steps');
const stepEls = $$('.step', steps);
const whyImg = $('.why__img img');
let ticking = false;
function onScroll() {
  ticking = false;
  const y = window.scrollY;
  // safety net in case an observer callback was missed
  $$('.rv-wait:not(.in)').forEach((el) => { if (el.getBoundingClientRect().top < window.innerHeight * 0.92) el.classList.add('in'); });
  nav.classList.toggle('is-scrolled', y > 8);

  // process progress
  const r = steps.getBoundingClientRect();
  const vh = window.innerHeight;
  const p = Math.min(1, Math.max(0, (vh * 0.75 - r.top) / (r.height + vh * 0.2)));
  steps.style.setProperty('--p', reduced ? 1 : p.toFixed(4));
  stepEls.forEach((s, i) => s.classList.toggle('is-on', reduced || p >= (i / stepEls.length) * 0.98 + 0.02));

  // parallax
  if (!reduced && whyImg) {
    const wr = whyImg.parentElement.getBoundingClientRect();
    const k = (wr.top + wr.height / 2 - vh / 2) / vh;
    whyImg.style.setProperty('--py', (k * -40).toFixed(1));
  }

  // active nav
  let current = null;
  sections.forEach((s) => { if (s.getBoundingClientRect().top < vh * 0.4) current = s.id; });
  navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + current));
}
window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
window.addEventListener('resize', onScroll);
onScroll();

/* ---------- 3D tilt on country cards (mouse only) ---------- */
if (finePointer && !reduced) {
  $$('.ccard').forEach((card) => {
    let raf = 0;
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        card.style.transition = 'transform .15s ease-out, box-shadow .5s';
        card.style.transform = `perspective(1000px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateY(-6px)`;
      });
    });
    card.addEventListener('pointerleave', () => {
      cancelAnimationFrame(raf);
      card.style.transition = '';
      card.style.transform = '';
    });
  });

  // magnetic CTA
  $$('.magnetic').forEach((b) => {
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.15}px, ${(e.clientY - r.top - r.height / 2) * 0.25 - 2}px)`;
    });
    b.addEventListener('pointerleave', () => { b.style.transform = ''; });
  });
}

/* ---------- Stat ticker ---------- */
const stats = [['6', 'Study destinations'], ['10', 'Services, start to arrival'], ['1:1', 'Personal counselling']];
const numEl = $('[data-stat-num]');
const labelEl = $('[data-stat-label]');
const dots = $$('.stat-card__dots i');
let si = 0;
if (!reduced) {
  setInterval(() => {
    if (document.hidden) return;
    si = (si + 1) % stats.length;
    numEl.classList.remove('flip'); void numEl.offsetWidth; numEl.classList.add('flip');
    setTimeout(() => { numEl.textContent = stats[si][0]; labelEl.textContent = stats[si][1]; }, 320);
    dots.forEach((d, i) => d.classList.toggle('on', i === si));
  }, 3200);
}

/* ---------- Dot world map (dark panels) ---------- */
import('./land.js').then(({ getLandMask }) => getLandMask(2048)).then((mask) => {
  const sw = 200, sh = 100;
  const c = document.createElement('canvas'); c.width = sw; c.height = sh;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(mask, 0, 0, sw, sh);
  const px = g.getImageData(0, 0, sw, sh).data;
  const drawAll = () => $$('canvas.dotmap').forEach((cv) => {
    const W = cv.clientWidth, H = cv.clientHeight; if (!W || !H) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr;
    const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
    const step = 7, mapW = Math.max(W, H * 2) * 1.05, mapH = mapW / 2;
    const ox = (W - mapW) / 2, oy = (H - mapH) / 2 + mapH * 0.06;
    ctx.fillStyle = 'rgba(244,242,238,0.28)';
    for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) {
      const u = (x - ox) / mapW, v = (y - oy) / mapH;
      if (u < 0 || u >= 1 || v < 0 || v >= 1) continue;
      if (px[(Math.floor(v * sh) * sw + Math.floor(u * sw)) * 4] < 120) continue;
      ctx.beginPath(); ctx.arc(x, y, 1.1, 0, Math.PI * 2); ctx.fill();
    }
  });
  drawAll();
  let to; window.addEventListener('resize', () => { clearTimeout(to); to = setTimeout(drawAll, 200); });
}).catch(() => {});

/* ---------- Lead form → WhatsApp ---------- */
const form = $('#leadForm');
const err = $('#formError');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = new FormData(form);
  const name = (f.get('name') || '').toString().trim();
  const phone = (f.get('phone') || '').toString().replace(/[^\d+]/g, '');
  const nameEl = $('#f-name'), phoneEl = $('#f-phone');
  nameEl.removeAttribute('aria-invalid'); phoneEl.removeAttribute('aria-invalid');
  if (name.length < 2) { err.textContent = 'Please enter your name.'; err.hidden = false; nameEl.setAttribute('aria-invalid', 'true'); nameEl.focus(); return; }
  if (phone.replace(/\D/g, '').length < 10) { err.textContent = 'Please enter a 10-digit phone number.'; err.hidden = false; phoneEl.setAttribute('aria-invalid', 'true'); phoneEl.focus(); return; }
  err.hidden = true;
  const course = (f.get('course') || '').toString().trim();
  const msg = [
    "Hi Yasvi, I'd like to book a counselling session.",
    `Name: ${name}`,
    `Phone: ${phone}`,
    `Preferred country: ${f.get('country')}`,
    `Intake: ${f.get('intake')}`,
    course ? `Course: ${course}` : null,
  ].filter(Boolean).join('\n');
  const a = document.createElement('a');
  a.href = waLink(msg); a.target = '_blank'; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  toast('Opening WhatsApp with your details…');
});

/* ---------- Copy ---------- */
const toastEl = $('#toast');
let toastT;
function toast(msg) {
  toastEl.textContent = msg; toastEl.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { toastEl.hidden = true; }, 2600);
}
$$('[data-copy]').forEach((b) => b.addEventListener('click', () => {
  const v = b.dataset.copy;
  const done = () => { b.textContent = 'Copied'; toast('Number copied'); setTimeout(() => { b.textContent = 'Copy'; }, 1800); };
  if (navigator.clipboard) navigator.clipboard.writeText(v).then(done, () => selectNear(b));
  else selectNear(b);
}));
function selectNear(b) {
  const t = b.parentElement.querySelector('.selectable');
  const r = document.createRange(); r.selectNodeContents(t);
  const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
}

/* ---------- WhatsApp float hint ---------- */
const waFloat = $('.wa-float');
setTimeout(() => { waFloat.classList.add('is-hint'); setTimeout(() => waFloat.classList.remove('is-hint'), 3500); }, 2500);

/* ---------- 3D globe ---------- */
const globeEl = $('#globe');
const scrollToCountry = (d) => {
  const el = document.getElementById('c-' + d.id);
  if (el) el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center', inline: 'center' });
};
(async () => {
  try {
    const test = document.createElement('canvas');
    if (!(test.getContext('webgl2') || test.getContext('webgl'))) throw new Error('no webgl');
    const { createGlobe } = await import('./globe.js');
    await createGlobe({
      container: globeEl,
      canvas: $('.globe__canvas', globeEl),
      labelsEl: $('.globe__labels', globeEl),
      destinations: COUNTRIES,
      onSelect: scrollToCountry,
      reducedMotion: reduced,
    });
  } catch (e) {
    console.warn('Globe unavailable:', e);
    $('.globe__hint', globeEl).hidden = true;
  }
})();
