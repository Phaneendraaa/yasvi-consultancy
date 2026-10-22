import * as THREE from 'three';
import { getLandMask } from './land.js';

const DEG = Math.PI / 180;
const ORANGE = new THREE.Color('#FF5A1F');

export const HOME = { name: 'Hyderabad', sub: 'India', lat: 17.385, lon: 78.4867 };

function toVec3(lat, lon, r = 1) {
  const phi = (90 - lat) * DEG;
  const theta = (lon + 180) * DEG;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

/** Builds the land/ocean texture from the land mask (white = land). */
function buildSurface(mask) {
  const w = mask.width, h = mask.height;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(mask, 0, 0);
  const data = g.getImageData(0, 0, w, h);
  const d = data.data;
  const ocean = [250, 249, 246], land = [221, 216, 208];
  for (let i = 0; i < d.length; i += 4) {
    const t = d[i] / 255;
    d[i] = ocean[0] + (land[0] - ocean[0]) * t;
    d[i + 1] = ocean[1] + (land[1] - ocean[1]) * t;
    d[i + 2] = ocean[2] + (land[2] - ocean[2]) * t;
  }
  g.putImageData(data, 0, 0);
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  const bump = new THREE.CanvasTexture(mask);
  return { map, bump };
}

export function createGlobe({ container, canvas, labelsEl, destinations, onSelect, reducedMotion }) {
  const isSmall = () => container.clientWidth < 520;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSmall() ? 1.75 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 4.15);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xe4dfd7, 1.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.45);
  key.position.set(-2, 3, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffe6d8, 0.45);
  rim.position.set(3, -1, -2);
  scene.add(rim);

  const world = new THREE.Group();          // tilt
  const spin = new THREE.Group();           // y rotation
  world.add(spin);
  scene.add(world);
  world.rotation.x = 0.3;

  // Sphere (texture added once the mask loads)
  const sphereMat = new THREE.MeshStandardMaterial({ color: 0xf6f5f2, roughness: 0.92, metalness: 0 });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), sphereMat);
  spin.add(sphere);

  // Soft rim glow (fresnel) for depth
  const glowMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.BackSide,
    uniforms: { c: { value: new THREE.Color('#ffffff') } },
    vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} ',
    fragmentShader: 'uniform vec3 c; varying vec3 vN; void main(){ float i = pow(0.62 - dot(vN, vec3(0.0,0.0,1.0)), 3.0); gl_FragColor = vec4(c, clamp(i,0.0,1.0)*0.9);} '
  });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(1.12, 64, 48), glowMat);
  world.add(glow);

  const ready = getLandMask(2048).then((mask) => {
    const { map, bump } = buildSurface(mask);
    sphereMat.map = map; sphereMat.color.set(0xffffff);
    sphereMat.bumpMap = bump; sphereMat.bumpScale = 4;
    sphereMat.needsUpdate = true;
  }).catch((e) => console.warn('Land map unavailable:', e));

  // Home marker
  const homePos = toVec3(HOME.lat, HOME.lon, 1.002);
  const pinGeo = new THREE.SphereGeometry(1, 20, 16);
  const orangeMat = new THREE.MeshBasicMaterial({ color: ORANGE });
  const homeDot = new THREE.Mesh(pinGeo, orangeMat);
  homeDot.scale.setScalar(0.026);
  homeDot.position.copy(homePos);
  spin.add(homeDot);

  const ringGeo = new THREE.RingGeometry(0.8, 1, 48);
  function makeRing(pos, size) {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
    m.position.copy(pos.clone().multiplyScalar(1.003));
    m.lookAt(pos.clone().multiplyScalar(2));
    m.userData.base = size;
    m.scale.setScalar(size);
    spin.add(m);
    return m;
  }
  const rings = [makeRing(homePos, 0.05), makeRing(homePos, 0.05)];
  rings[1].userData.offset = 0.5;

  // Arcs, pulses, city pins
  const arcs = destinations.map((d, i) => {
    const end = toVec3(d.lat, d.lon, 1.002);
    const a = homePos.clone().normalize(), b = end.clone().normalize();
    const ang = a.angleTo(b);
    const lift = 0.05 + 0.2 * (ang / Math.PI);
    const pts = [];
    const N = 64;
    for (let k = 0; k <= N; k++) {
      const t = k / N;
      const v = new THREE.Vector3().copy(a).lerp(b, t);
      // slerp
      const s = Math.sin(ang);
      v.copy(a).multiplyScalar(Math.sin((1 - t) * ang) / s).add(b.clone().multiplyScalar(Math.sin(t * ang) / s));
      v.setLength(1.002 + lift * Math.sin(Math.PI * t));
      pts.push(v);
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const TUB = 120, RAD = 8;
    const geo = new THREE.TubeGeometry(curve, TUB, isSmall() ? 0.0065 : 0.0052, RAD, false);
    const mat = new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.95 });
    const tube = new THREE.Mesh(geo, mat);
    geo.setDrawRange(0, 0);
    spin.add(tube);

    const pulse = new THREE.Mesh(pinGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    pulse.scale.setScalar(0.011);
    pulse.visible = false;
    spin.add(pulse);
    const halo = new THREE.Mesh(pinGeo, new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.35, depthWrite: false }));
    halo.scale.setScalar(0.024);
    pulse.add(halo); halo.scale.setScalar(2.2);

    const pin = new THREE.Mesh(pinGeo, orangeMat);
    pin.position.copy(end);
    pin.scale.setScalar(0);
    spin.add(pin);
    const ring = makeRing(end, 0.035);
    ring.visible = false;

    // label
    const el = document.createElement('a');
    el.className = 'gl';
    el.href = '#c-' + d.id;
    el.innerHTML = `<b>${d.name}</b><span>· ${d.city}</span>`;
    el.dataset.ax = String(d.ax ?? 0);
    el.style.opacity = '0';
    el.addEventListener('click', (e) => { e.preventDefault(); onSelect && onSelect(d); });
    labelsEl.appendChild(el);

    return { d, curve, geo, tube, total: TUB * RAD * 6, TUB, RAD, pulse, pin, ring, end, el, start: 0.35 + i * 0.22, phase: i / destinations.length, vis: 0 };
  });

  const homeEl = document.createElement('div');
  homeEl.className = 'gl gl--home';
  homeEl.innerHTML = `<b>${HOME.name}</b><span>· You start here</span>`;
  homeEl.style.opacity = '0';
  labelsEl.appendChild(homeEl);

  // Orientation: face longitude L to camera. The globe sways gently around a home view
  // so the key routes (Europe, India, Australia) stay readable; drag to spin freely.
  const faceLon = (L) => -(L + 90) * DEG;
  const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  let baseY = faceLon(48);
  let rotY = baseY - 1.1;
  let vel = 0;
  const SWAY = reducedMotion ? 0 : 0.62;
  let swayT = 0;

  // Drag (horizontal only; vertical stays as page scroll)
  let dragging = false, lastX = 0, lastT = 0, dragVel = 0, idleAt = 0;
  const onDown = (e) => {
    dragging = true; lastX = e.clientX; lastT = performance.now(); dragVel = 0;
    container.classList.add('is-dragging');
    canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
  };
  const onMove = (e) => {
    if (!dragging) return;
    const now = performance.now();
    const dx = e.clientX - lastX;
    const delta = dx / container.clientWidth * Math.PI * 1.2;
    rotY += delta;
    dragVel = delta / Math.max(16, now - lastT) * 1000;
    lastX = e.clientX; lastT = now;
  };
  const onUp = () => {
    if (!dragging) return;
    dragging = false; vel = Math.max(-3, Math.min(3, dragVel)); idleAt = performance.now();
    container.classList.remove('is-dragging');
  };
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);

  // Sizing
  let W = 1, H = 1;
  const resize = () => {
    W = container.clientWidth; H = container.clientHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(container);
  resize();

  // Visibility / pause
  let running = true, inView = true;
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; }, { rootMargin: '100px' }).observe(container);
  document.addEventListener('visibilitychange', () => { running = !document.hidden; });

  const tmp = new THREE.Vector3(), camDir = new THREE.Vector3();
  const place = (el, worldPos, alpha, offsetY, ax = 0) => {
    tmp.copy(worldPos).project(camera);
    const x = (tmp.x * 0.5 + 0.5) * W, y = (-tmp.y * 0.5 + 0.5) * H;
    const tx = ax === 0 ? '-50%' : ax > 0 ? '0%' : '-100%';
    const ty = ax === 0 ? (offsetY < 0 ? '0%' : '-100%') : '-50%';
    const dx = ax * 14;
    el.style.transform = `translate3d(${x + dx}px, ${y - offsetY}px, 0) translate(${tx}, ${ty})`;
    el.style.opacity = alpha.toFixed(3);
    el.style.pointerEvents = alpha > 0.5 ? 'auto' : 'none';
  };

  const clock = new THREE.Clock();
  let t0 = null;
  function frame() {
    requestAnimationFrame(frame);
    if (!running || !inView) { clock.getDelta(); return; }
    const dt = Math.min(clock.getDelta(), 0.05);
    if (t0 === null) t0 = clock.elapsedTime;
    const t = clock.elapsedTime - t0;

    if (!dragging) {
      rotY += vel * dt;
      vel *= Math.exp(-dt * 2.4);
      if (performance.now() - idleAt > 2500 && Math.abs(vel) < 0.05) {
        swayT += dt;
        const target = baseY + Math.sin(swayT * 0.18) * SWAY;
        rotY += wrap(target - rotY) * (1 - Math.exp(-dt * 0.9));
      }
    }
    spin.rotation.y = rotY;

    // rings
    const rp = (t * 0.6) % 1;
    rings.forEach((r) => {
      const p = (rp + (r.userData.offset || 0)) % 1;
      r.scale.setScalar(r.userData.base * (0.6 + p * 1.8));
      r.material.opacity = 0.6 * (1 - p);
    });

    // world matrix for label projection
    scene.updateMatrixWorld();
    camDir.copy(camera.position).normalize();

    arcs.forEach((a) => {
      const p = reducedMotion ? 1 : Math.min(1, Math.max(0, (t - a.start) / 1.1));
      const e = 1 - Math.pow(1 - p, 3);
      const segs = Math.floor(e * a.TUB);
      a.geo.setDrawRange(0, segs * a.RAD * 6);
      if (p >= 1) {
        const pin = Math.min(1, (t - a.start - 1.1) / 0.4);
        a.pin.scale.setScalar(0.02 * (pin < 1 ? (1 - Math.pow(1 - Math.max(0, pin), 3)) * 1.15 : 1));
        a.ring.visible = true;
        const q = (t * 0.5 + a.phase) % 1;
        a.ring.scale.setScalar(a.ring.userData.base * (0.6 + q * 1.6));
        a.ring.material.opacity = 0.55 * (1 - q);
        // travelling pulse
        if (!reducedMotion) {
          const u = ((t * 0.32) + a.phase) % 1;
          a.pulse.visible = true;
          a.pulse.position.copy(a.curve.getPointAt(u));
          const s = Math.sin(Math.PI * u);
          a.pulse.scale.setScalar(0.011 * (0.4 + s));
        }
      }
      // label visibility from facing
      const wp = a.pin.getWorldPosition(tmp.set(0, 0, 0)).clone();
      const facing = wp.clone().normalize().dot(camDir);
      const target = p >= 1 && facing > 0.18 ? 1 : 0;
      // fade routes whose destination has turned away from the viewer
      const fade = Math.min(1, Math.max(0, (facing + 0.25) / 0.4));
      a.tube.material.opacity = 0.95 * fade;
      a.pulse.visible = a.pulse.visible && fade > 0.3;
      a.pin.visible = fade > 0.05;
      a.vis += (target - a.vis) * Math.min(1, dt * 6);
      place(a.el, wp, a.vis, a.d.oy ?? (a.d.ax ? 0 : 12), a.d.ax ?? 0);
    });

    const hp = homeDot.getWorldPosition(new THREE.Vector3());
    const hf = hp.clone().normalize().dot(camDir);
    const ht = t > 0.2 && hf > 0.15 ? 1 : 0;
    homeEl._v = (homeEl._v || 0) + (ht - (homeEl._v || 0)) * Math.min(1, dt * 5);
    place(homeEl, hp, homeEl._v, -14, 0);

    renderer.render(scene, camera);
  }

  return ready.then(() => {
    container.classList.add('is-ready');
    requestAnimationFrame(frame);
    return {
      focus(d) { baseY = faceLon(d.lon); swayT = 0; idleAt = 0; vel = 0; }
    };
  });
}
