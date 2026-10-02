import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

let geoPromise = null;
export function loadToothGeometry(url = '/assets/tooth.bin') {
  if (!geoPromise) {
    geoPromise = fetch(url)
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        const [vcount, icount] = new Uint32Array(buf, 0, 2);
        const q = new Int16Array(buf, 8, vcount * 3);
        const off = 8 + vcount * 6;
        const idx = vcount < 65536 ? new Uint16Array(buf.slice(off, off + icount * 2)) : new Uint32Array(buf.slice(off, off + icount * 4));
        const pos = new Float32Array(vcount * 3);
        for (let i = 0; i < pos.length; i++) pos[i] = (q[i] / 32767) * 2.0;
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        g.setIndex(new THREE.BufferAttribute(idx, 1));
        g.computeVertexNormals();
        g.computeBoundingSphere();
        return g;
      });
  }
  return geoPromise;
}

const reduceMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function enamel(env) {
  return new THREE.MeshPhysicalMaterial({
    color: 0xf3eee6,
    roughness: 0.36,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.18,
    sheen: 0.35,
    sheenColor: new THREE.Color(0xfff6ea),
    sheenRoughness: 0.6,
    envMap: env,
    envMapIntensity: 1.05,
  });
}

function holoMaterial(color = 0x9fe3ff) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    clipping: true,
    uniforms: { uColor: { value: new THREE.Color(color) }, uTime: { value: 0 }, uIntensity: { value: 1 } },
    vertexShader: /* glsl */ `
      #include <clipping_planes_pars_vertex>
      varying vec3 vPos; varying vec3 vN; varying vec3 vView;
      void main(){
        vPos = position;
        vec4 mvPosition = modelViewMatrix * vec4(position,1.0);
        vN = normalize(normalMatrix * normal);
        vView = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
        #include <clipping_planes_vertex>
      }`,
    fragmentShader: /* glsl */ `
      #include <clipping_planes_pars_fragment>
      uniform vec3 uColor; uniform float uTime; uniform float uIntensity;
      varying vec3 vPos; varying vec3 vN; varying vec3 vView;
      float line(float v, float w){ float f = abs(fract(v)-0.5); return smoothstep(0.5-w, 0.5, f); }
      void main(){
        #include <clipping_planes_fragment>
        float lat = line(vPos.y*7.0, 0.06);
        float lon = line(atan(vPos.z, vPos.x)/6.2831853*36.0, 0.07);
        float grid = max(lat, lon);
        float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vView))), 2.2);
        float pulse = 0.85 + 0.15*sin(uTime*2.0 + vPos.y*3.0);
        float a = (grid*0.75 + fres*0.85 + 0.035) * pulse * uIntensity;
        gl_FragColor = vec4(uColor * a, a);
      }`,
  });
}

function laserMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color(0x8fdcff) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `uniform vec3 uColor; varying vec2 vUv;
      void main(){
        float y = abs(vUv.y-0.5)*2.0;
        float core = exp(-y*y*60.0);
        float halo = exp(-y*y*6.0)*0.35;
        float ends = smoothstep(0.0,0.25,vUv.x)*smoothstep(1.0,0.75,vUv.x);
        float a = (core + halo) * ends;
        vec3 c = mix(uColor, vec3(1.0), core*0.8);
        gl_FragColor = vec4(c*a, a);
      }`,
  });
}

function sliceMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color(0x7fd2ff) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `uniform vec3 uColor; varying vec2 vUv;
      void main(){
        float r = length(vUv-0.5)*2.0;
        float ring = smoothstep(0.9,0.97,r)*smoothstep(1.0,0.97,r);
        float fill = (1.0-r)*0.12;
        float a = ring*0.9 + fill;
        gl_FragColor = vec4(uColor*a, a);
      }`,
  });
}

/**
 * Mount an interactive tooth scene.
 * @param {HTMLElement} el container (canvas fills it)
 * @param {{mode?: 'hero'|'scan', onScan?: (v:number)=>void, static?: boolean, view?: number}} opts
 */
export async function mountTooth(el, opts = {}) {
  const mode = opts.mode || 'hero';
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: !!opts.static, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.static ? 2 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = mode === 'scan' ? 0.95 : 0.98;
  renderer.localClippingEnabled = true;
  renderer.setClearColor(0x000000, 0);
  el.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0.15, opts.view || (mode === 'scan' ? 8.6 : 8.2));

  const key = new THREE.DirectionalLight(0xfff1df, mode === 'scan' ? 1.6 : 2.2);
  key.position.set(3, 4, 5);
  const rim = new THREE.DirectionalLight(mode === 'scan' ? 0x8fd0ff : 0xdfe9ff, mode === 'scan' ? 2.4 : 1.2);
  rim.position.set(-4, 1.5, -3);
  scene.add(key, rim, new THREE.AmbientLight(0xffffff, mode === 'scan' ? 0.15 : 0.35));

  const geo = await loadToothGeometry(opts.url);
  const group = new THREE.Group();
  scene.add(group);

  const solidMat = enamel(env);
  if (mode === 'scan') solidMat.envMapIntensity = 0.75;
  const solid = new THREE.Mesh(geo, solidMat);
  group.add(solid);

  let holo, laser, slice, clipSolid, clipHolo, holoMat;
  if (mode === 'scan' || mode === 'holo') {
    holoMat = holoMaterial();
    holo = new THREE.Mesh(geo, holoMat);
    group.add(holo);
    if (mode === 'holo') solid.visible = false;
  }
  if (mode === 'scan') {
    clipSolid = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    clipHolo = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
    solidMat.clippingPlanes = [clipSolid];
    holoMat.clippingPlanes = [clipHolo];
    laser = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 0.22), laserMaterial());
    slice = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 2.9), sliceMaterial());
    slice.rotation.x = -Math.PI / 2;
    scene.add(laser, slice);
  }

  // sizing
  const resize = () => {
    const w = el.clientWidth || 1, h = el.clientHeight || 1;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    camera.aspect = w / h;
    // keep tooth fully visible on narrow containers
    const fit = Math.max(1, 0.85 / camera.aspect);
    camera.position.z = (opts.view || (mode === 'scan' ? 8.6 : 8.2)) * fit;
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(el);

  // pointer parallax
  const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  const onMove = (e) => {
    const r = el.getBoundingClientRect();
    target.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    target.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
  };
  window.addEventListener('pointermove', onMove, { passive: true });

  let visible = true, raf = 0, t0 = performance.now();
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) loop(); }, { rootMargin: '100px' });
  io.observe(el);

  group.rotation.set(0.12, opts.rotY ?? -0.5, 0.06);

  function frame(t) {
    const s = (t - t0) / 1000;
    cur.x += (target.x - cur.x) * 0.05;
    cur.y += (target.y - cur.y) * 0.05;
    if (!reduceMotion && !opts.static) {
      group.rotation.y = (opts.rotY ?? -0.5) + (mode === 'scan' ? s * 0.28 : Math.sin(s * 0.35) * 0.75) + cur.x * 0.35;
      group.rotation.x = 0.12 + cur.y * 0.12;
      group.position.y = Math.sin(s * 1.1) * 0.06;
    }
    if (mode === 'scan') {
      const p = opts.static ? 0.42 : 0.5 - 0.5 * Math.cos(s * 0.55);
      const y = -1.75 + p * 3.3;
      clipSolid.constant = -y; clipHolo.constant = y;
      laser.position.y = y + group.position.y; slice.position.y = y + group.position.y;
      laser.lookAt(camera.position.x, laser.position.y, camera.position.z);
      opts.onScan && opts.onScan(p);
    }
    if (holoMat) holoMat.uniforms.uTime.value = s;
    // keep clipping planes in world space aligned with bob
    if (clipSolid) { clipSolid.constant -= group.position.y; clipHolo.constant += group.position.y; }
    renderer.render(scene, camera);
  }
  function loop() {
    raf = 0;
    if (!visible || document.hidden) return;
    frame(performance.now());
    if (!opts.static) raf = requestAnimationFrame(loop);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible && !raf) loop(); });
  loop();
  el.classList.add('is-ready');

  return {
    renderer,
    snapshot() { frame(performance.now()); return renderer.domElement.toDataURL('image/png'); },
    dispose() { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); window.removeEventListener('pointermove', onMove); renderer.dispose(); },
  };
}
