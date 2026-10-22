// Обводка детали разобранной схемы по внешнему контуру: линия на отступе GAP от силуэта
// и мягкое зелёное свечение вокруг неё.
//
// Каждый кадр: силуэт детали (её слой, белый материал) рисуется в рендер-таргет размером
// со сцену в CSS px → в прямоугольнике детали читается на CPU → внутренние дыры заливаются
// (заливка снаружи от краёв: обводим только внешний контур, кольцо крышки — без линии
// внутри) → поле расстояний до силуэта (точное евклидово, Felzenszwalb) → текстура.
// Линию и свечение рисует шейдер поверх сцены по этому полю: отступ ровный в пикселях
// экрана при любом ракурсе и масштабе.
import * as THREE from 'three';

const GAP = 6;        // px от силуэта до линии
const WIDTH = 3;      // px — толщина линии
const GLOW = 9;       // px — «радиус» свечения (гаусс)
const GLOW_A = 0.4;   // непрозрачность свечения у линии
const D_MAX = 48;     // px — потолок поля расстояний (байт 255)
const MARGIN = GAP + WIDTH + 3 * GLOW;   // px — запас вокруг детали при расчёте поля

const VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const FRAG = `
  uniform sampler2D tDist; uniform vec3 color; uniform float opacity;
  varying vec2 vUv;
  void main() {
    float d = texture2D(tDist, vUv).r * ${D_MAX.toFixed(1)};
    float c = ${(GAP + WIDTH / 2).toFixed(1)};
    float line = 1.0 - smoothstep(${(WIDTH / 2 - 0.6).toFixed(2)}, ${(WIDTH / 2 + 0.6).toFixed(2)}, abs(d - c));
    float k = (d - c) / ${GLOW.toFixed(1)};
    float glow = ${GLOW_A.toFixed(2)} * exp(-k * k) * smoothstep(0.0, 2.0, d);   // на саму деталь не заходит
    float a = max(line, glow) * opacity;
    gl_FragColor = vec4(color, a);
  }`;

// цвет из CSS-переменной как есть (#rrggbb): шейдер пишет его в канвас без перевода в линейное
function cssColor(name) {
  const hex = getComputedStyle(document.documentElement).getPropertyValue(name).trim().replace('#', '');
  const n = parseInt(hex.length === 3 ? hex.replace(/./g, '$&$&') : hex, 16) || 0x00c853;
  return new THREE.Vector3((n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255);
}

// одномерное квадратичное расстояние (Felzenszwalb & Huttenlocher), f → d
function edt1d(f, d, n, v, z) {
  let k = 0;
  v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s;
    while ((s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])) <= z[k]) k--;
    k++; v[k] = q; z[k] = s; z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) ** 2 + f[v[k]];
  }
}

export class PartOutline {
  constructor() {
    this.rt = null;
    this.W = 0; this.H = 0;
    this.alpha = 0;
    this.maskMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthTest: false, depthWrite: false,
      uniforms: { tDist: { value: null }, color: { value: cssColor('--c-normal') }, opacity: { value: 0 } },
    });
    this.mat.toneMapped = false;
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    this.quad.frustumCulled = false;
    this.scene = new THREE.Scene();
    this.scene.add(this.quad);
    this.cam = new THREE.OrthographicCamera();
    this.clear = new THREE.Color();
  }

  resize(W, H) {
    if (W === this.W && H === this.H) return;
    this.W = W; this.H = H;
    this.rt?.dispose(); this.tex?.dispose();
    this.rt = new THREE.WebGLRenderTarget(W, H, { depthBuffer: true });
    this.dist = new Uint8Array(W * H).fill(255);
    this.tex = new THREE.DataTexture(this.dist, W, H, THREE.RedFormat, THREE.UnsignedByteType);
    this.tex.minFilter = this.tex.magFilter = THREE.LinearFilter;
    this.tex.unpackAlignment = 1;
    this.mat.uniforms.tDist.value = this.tex;
    this.region = null;
  }

  // layer — слой детали (null — нет детали: обводка гаснет); r — её рамка {x0,y0,x1,y1} в CSS px
  update(renderer, scene, camera, layer, r) {
    this.alpha += ((layer === null ? 0 : 1) - this.alpha) * 0.25;
    if (layer === null || !this.rt) return;
    const { W, H } = this;
    // силуэт: только слой детали, белым; тени не пересчитывать
    const shadowAuto = renderer.shadowMap.autoUpdate, clearA = renderer.getClearAlpha();
    renderer.getClearColor(this.clear);
    const ov = scene.overrideMaterial;
    scene.overrideMaterial = this.maskMat;
    renderer.shadowMap.autoUpdate = false;
    camera.layers.set(layer);
    renderer.setRenderTarget(this.rt);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    camera.layers.set(0);
    scene.overrideMaterial = ov;
    renderer.shadowMap.autoUpdate = shadowAuto;
    renderer.setClearColor(this.clear, clearA);

    // прямоугольник расчёта в координатах таргета (y снизу), с запасом под линию и свечение
    const x0 = Math.max(0, Math.floor(r.x0 - MARGIN)), x1 = Math.min(W, Math.ceil(r.x1 + MARGIN));
    const y0 = Math.max(0, Math.floor(H - r.y1 - MARGIN)), y1 = Math.min(H, Math.ceil(H - r.y0 + MARGIN));
    const w = x1 - x0, h = y1 - y0;
    if (this.region) {   // прошлый прямоугольник — в «далеко»
      const p = this.region;
      for (let y = p[1]; y < p[3]; y++) this.dist.fill(255, y * W + p[0], y * W + p[2]);
    }
    this.region = [x0, y0, x1, y1];
    if (w <= 0 || h <= 0) { this.tex.needsUpdate = true; return; }
    const n = w * h;
    if (!this.buf || this.buf.length < n * 4) {
      this.buf = new Uint8Array(n * 4); this.ext = new Uint8Array(n); this.stack = new Int32Array(n);
      this.f = new Float64Array(n);
    }
    const { buf, ext, stack, f } = this;
    renderer.readRenderTargetPixels(this.rt, x0, y0, w, h, buf);

    // снаружи — всё, куда можно дойти от краёв прямоугольника, не пересекая силуэт
    ext.fill(0, 0, n);
    let sp = 0;
    const seed = i => { if (!ext[i] && buf[i * 4] < 128) { ext[i] = 1; stack[sp++] = i; } };
    for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1); }
    while (sp) {
      const i = stack[--sp], x = i % w;
      if (x > 0) seed(i - 1);
      if (x < w - 1) seed(i + 1);
      if (i >= w) seed(i - w);
      if (i < n - w) seed(i + w);
    }

    // квадрат расстояния до «внутри» (силуэт + залитые дыры): по строкам, потом по столбцам
    const m = Math.max(w, h), line = new Float64Array(m), out = new Float64Array(m);
    const v = new Int32Array(m), z = new Float64Array(m + 1);
    for (let i = 0; i < n; i++) f[i] = ext[i] ? 1e12 : 0;
    for (let y = 0; y < h; y++) {
      const o = y * w;
      for (let x = 0; x < w; x++) line[x] = f[o + x];
      edt1d(line, out, w, v, z);
      for (let x = 0; x < w; x++) f[o + x] = out[x];
    }
    const s = 255 / D_MAX;
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) line[y] = f[y * w + x];
      edt1d(line, out, h, v, z);
      for (let y = 0; y < h; y++) this.dist[(y0 + y) * W + x0 + x] = Math.min(255, Math.sqrt(out[y]) * s + 0.5);
    }
    this.tex.needsUpdate = true;
  }

  render(renderer) {
    if (this.alpha < 0.01) return;
    this.mat.uniforms.opacity.value = this.alpha;
    const ac = renderer.autoClear;
    renderer.autoClear = false;
    renderer.render(this.scene, this.cam);
    renderer.autoClear = ac;
  }
}
