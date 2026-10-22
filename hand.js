// Мультяшная перчатка над макушкой: висит в воздухе, покачивается и указательным пальцем
// показывает, что макушку можно нажать (клик по ней самой — тоже нажатие). Рисуется тем же
// штрихом, что реквизит props.js: невидимый заслон в буфер глубины + линии контура.
//
// Рука — одно гладкое тело: поле расстояний (SDF) из кулака-эллипсоида, пальцев-«конусов
// со скруглёнными концами» по кривым и манжеты, слитых плавным минимумом (smin) — швов между
// частями нет. Сетка — surface nets по сетке SDF при загрузке, вершины доводятся на поверхность,
// нормали — градиент поля. Контур считается каждый кадр: на каждом треугольнике — отрезок, где
// n·(камера − p), интерполированное по вершинам, меняет знак (Hertzmann & Zorin). Складки
// между поджатыми пальцами — готовые короткие штрихи по поверхности.
// Единицы — мм модели; рука своя: указательный палец вдоль −Y, кончик в нуле,
// тыльная сторона ладони — +Z, большой палец — +X (правая рука).
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { lineMat } from './props.js';

const SCALE = 0.5;           // вся рука: ~16 мм от кончика пальца до края манжеты
const HOVER = 4.5;           // мм от макушки до кончика пальца в покое
const BOB = 1.2, BOB_PERIOD = 2.4;   // покачивание: ход по оси пальца, мм, и период, с
const SWAY = THREE.MathUtils.degToRad(5);
const YAW = THREE.MathUtils.degToRad(-110);   // поворот к камере: боком, со стороны большого пальца (как на референсе)

// заслон: пишет только глубину. Рисуется раньше корпуса (renderOrder), поэтому за рукой
// корпус не проступает — перчатка «закрашена» фоном страницы, как белая перчатка в мультфильме
const occluderMat = new THREE.MeshBasicMaterial({
  colorWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2,
});

// ─── поле расстояний ────────────────────────────────────────────────────────
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function smin(a, b, k) {                   // плавный минимум (полиномиальный, И. Квилес)
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k / 4;
}
const smax = (a, b, k) => -smin(-a, -b, k);
// конус со сферами на концах (a, ra) — (b, rb)
function roundCone(p, a, ra, b, rb) {
  const bx = b.x - a.x, by = b.y - a.y, bz = b.z - a.z, l2 = bx * bx + by * by + bz * bz;
  const rr = ra - rb, a2 = l2 - rr * rr, il2 = 1 / l2;
  const px = p.x - a.x, py = p.y - a.y, pz = p.z - a.z;
  const y = px * bx + py * by + pz * bz, z = y - l2;
  const qx = px * l2 - bx * y, qy = py * l2 - by * y, qz = pz * l2 - bz * y;
  const x2 = qx * qx + qy * qy + qz * qz, y2 = y * y * l2, z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - rb;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - ra;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - ra;
}
function ellipsoid(p, c, r) {             // приближённое расстояние (И. Квилес)
  const x = (p.x - c.x) / r.x, y = (p.y - c.y) / r.y, z = (p.z - c.z) / r.z;
  const k0 = Math.hypot(x, y, z), k1 = Math.hypot(x / r.x, y / r.y, z / r.z);
  return k0 * (k0 - 1) / k1;
}
// палец — гладкая кривая через опорные точки, радиус меняется от r0 до r1
function digit(points, r0, r1, n = 8) {
  const c = new THREE.CatmullRomCurve3(points.map(a => V(...a)));
  const pts = c.getSpacedPoints(n), rs = pts.map((_, i) => THREE.MathUtils.lerp(r0, r1, i / n));
  const segs = [];
  for (let i = 0; i < n; i++) segs.push([pts[i], rs[i], pts[i + 1], rs[i + 1]]);
  return { curve: c, d: p => { let d = 1e9; for (const s of segs) d = Math.min(d, roundCone(p, ...s)); return d; } };
}

// указательный: кончик внизу, к основанию заметно толще и выгнут «бананом»
const R_TIP = 2.3;
const TIP_Y = R_TIP - 3;                 // палец длиннее остального на 3 мм: кончик ниже нуля сетки
const INDEX = digit([[0, TIP_Y, 0], [-1.7, 3.6, 0.6], [-1.7, 8.6, 1.2], [0.4, 12.8, 0.6]], R_TIP, 3.8);
// кулак — пухлый; основную массу снизу и спереди дают поджатые пальцы
const FIST = { c: V(-0.8, 16.2, 0.2), r: V(6.2, 5.6, 4.6) };
// поджатые средний и безымянный: от костяшки вниз и подушечками к ладони
const CURL = [
  digit([[-1.6, 14.0, 2.4], [-1.9, 10.8, 1.0], [-2.0, 9.9, -2.4], [-1.7, 12.2, -5.0]], 3.1, 2.9),
  digit([[-5.4, 14.6, 1.8], [-5.8, 12.0, 0.6], [-5.9, 11.4, -2.2], [-5.5, 13.4, -4.6]], 2.9, 2.7),
];
// большой — от основания ладони поперёк поджатых пальцев, кончик загнут
const THUMB = digit([[4.6, 18.4, -2.4], [5.6, 14.6, -4.6], [3.2, 12.4, -6.6], [-0.6, 12.6, -7.0]], 3.0, 2.5);
// короткое запястье и манжета-раструб с валиком и углублением внутри
const AX = { x: -0.8, z: -0.4 };
const WRIST = [V(AX.x, 19.5, AX.z), 5.0, V(AX.x, 22.5, AX.z), 4.4];
const CUFF = { y0: 21.4, y1: 24.0, r0: 4.5, r1: 5.4 };
const RIM = { y: 24.0, R: 5.2, r: 0.9 };
const SQ = 0.82;                          // запястье и манжета чуть сплюснуты по Z

function cappedCone(p, y0, y1, r0, r1) {  // усечённый конус вдоль Y (И. Квилес)
  const h = (y1 - y0) / 2, qx = Math.hypot(p.x - AX.x, p.z - AX.z), qy = p.y - (y0 + y1) / 2;
  const k1x = r1, k1y = h, k2x = r1 - r0, k2y = 2 * h;
  const cax = qx - Math.min(qx, qy < 0 ? r0 : r1), cay = Math.abs(qy) - h;
  const t = THREE.MathUtils.clamp(((k1x - qx) * k2x + (k1y - qy) * k2y) / (k2x * k2x + k2y * k2y), 0, 1);
  const cbx = qx - k1x + k2x * t, cby = qy - k1y + k2y * t;
  const sg = cbx < 0 && cay < 0 ? -1 : 1;
  return sg * Math.sqrt(Math.min(cax * cax + cay * cay, cbx * cbx + cby * cby));
}

function handSDF(p) {
  let d = ellipsoid(p, FIST.c, FIST.r);
  d = smin(d, INDEX.d(p), 3.2);
  for (const f of CURL) d = smin(d, f.d(p), 0.9);
  d = smin(d, THUMB.d(p), 1.0);
  const q = V(p.x, p.y, AX.z + (p.z - AX.z) / SQ);
  d = smin(d, roundCone(q, ...WRIST) * SQ, 2.5);
  let cuff = smin(cappedCone(q, CUFF.y0, CUFF.y1, CUFF.r0, CUFF.r1),
    Math.hypot(Math.hypot(q.x - AX.x, q.z - AX.z) - RIM.R, q.y - RIM.y) - RIM.r, 0.6);
  d = smin(d, cuff * SQ, 0.5);            // манжета — с перегибом: её край виден
  // проём — плавным вычитанием: на остром крае контур рассыпается на чёрточки
  const hole = smax(Math.hypot(q.x - AX.x, q.z - AX.z) - (RIM.R - 1.3), RIM.y - 1.2 - q.y, 0.5) * SQ;
  return smax(d, -hole, 0.4);
}

// ─── сетка: surface nets ────────────────────────────────────────────────────
function mesh(f, lo, hi, h) {
  const nx = Math.ceil((hi.x - lo.x) / h) + 1, ny = Math.ceil((hi.y - lo.y) / h) + 1, nz = Math.ceil((hi.z - lo.z) / h) + 1;
  const F = new Float32Array(nx * ny * nz), p = V(0, 0, 0);
  const id = (i, j, k) => i + nx * (j + ny * k);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++)
    F[id(i, j, k)] = f(p.set(lo.x + i * h, lo.y + j * h, lo.z + k * h));
  const cell = new Int32Array(nx * ny * nz).fill(-1), pos = [];
  const C = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const v = C.map(([a, b, c]) => F[id(i + a, j + b, k + c)]);
    if (v.every(x => x > 0) || v.every(x => x <= 0)) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of E) {
      if ((v[a] > 0) === (v[b] > 0)) continue;
      const t = v[a] / (v[a] - v[b]);
      sx += C[a][0] + (C[b][0] - C[a][0]) * t; sy += C[a][1] + (C[b][1] - C[a][1]) * t; sz += C[a][2] + (C[b][2] - C[a][2]) * t; n++;
    }
    cell[id(i, j, k)] = pos.length / 3;
    pos.push(lo.x + (i + sx / n) * h, lo.y + (j + sy / n) * h, lo.z + (k + sz / n) * h);
  }
  const idx = [];
  const quad = (a, b, c, d) => { if (a >= 0 && b >= 0 && c >= 0 && d >= 0) idx.push(a, b, c, a, c, d); };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const s = F[id(i, j, k)] > 0;
    if (s !== (F[id(i + 1, j, k)] > 0)) quad(cell[id(i, j - 1, k - 1)], cell[id(i, j, k - 1)], cell[id(i, j, k)], cell[id(i, j - 1, k)]);
    if (s !== (F[id(i, j + 1, k)] > 0)) quad(cell[id(i - 1, j, k - 1)], cell[id(i, j, k - 1)], cell[id(i, j, k)], cell[id(i - 1, j, k)]);
    if (s !== (F[id(i, j, k + 1)] > 0)) quad(cell[id(i - 1, j - 1, k)], cell[id(i, j - 1, k)], cell[id(i, j, k)], cell[id(i - 1, j, k)]);
  }
  // вершины — на поверхность (два шага Ньютона), нормаль — градиент поля
  const nrm = new Float32Array(pos.length), g = V(0, 0, 0), e = h * 0.25;
  const grad = q => g.set(f(V(q.x + e, q.y, q.z)) - f(V(q.x - e, q.y, q.z)), f(V(q.x, q.y + e, q.z)) - f(V(q.x, q.y - e, q.z)),
    f(V(q.x, q.y, q.z + e)) - f(V(q.x, q.y, q.z - e))).normalize();
  for (let i = 0; i < pos.length; i += 3) {
    p.fromArray(pos, i);
    for (let it = 0; it < 2; it++) p.addScaledVector(grad(p), -f(p));
    p.toArray(pos, i);
    grad(p).toArray(nrm, i);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  geo.setIndex(idx);
  return geo;
}

// складка вдоль поджатого пальца с его стороны side (±X): точка у бока пальца выносится
// лучом от оси кулака на поверхность — попадает в ложбину между пальцами
function crease(f, side, t0, t1, n = 12) {
  const pts = [], p = V(0, 0, 0), dir = V(0, 0, 0);
  for (let i = 0; i <= n; i++) {
    const t = THREE.MathUtils.lerp(t0, t1, i / n);
    const m = f.curve.getPointAt(t);
    m.x += side * 2.4;
    dir.set(0, m.y - FIST.c.y, m.z - FIST.c.z).normalize();
    let lo = -3, hi = 8;
    for (let k = 0; k < 30; k++) { const s = (lo + hi) / 2; if (handSDF(p.copy(m).addScaledVector(dir, s)) < 0) lo = s; else hi = s; }
    pts.push(p.copy(m).addScaledVector(dir, hi + 0.03).clone());
  }
  return pts;
}

export class Hand {
  constructor() {
    this.root = new THREE.Group();          // в системе модели; ставит place()
    this.turn = new THREE.Group();          // поворот вокруг оси пальца — тылом к камере
    this.pose = new THREE.Group();          // покачивание и тычок
    this.root.add(this.turn);
    this.body = new THREE.Group();          // вся геометрия; кончик пальца — в нуле pose
    this.turn.add(this.pose);
    this.pose.add(this.body);
    this.pose.scale.setScalar(SCALE);
    this.body.position.y = R_TIP - TIP_Y;  // кончик пальца — в нуле pose
    this.mat = lineMat();
    const geo = mesh(handSDF, V(-11, -3.8, -12), V(10, 27, 9), 0.45);
    const m = new THREE.Mesh(geo, occluderMat);
    m.renderOrder = -1;
    this.body.add(m);
    this.meshes = [m];
    // контур: отрезков не больше, чем треугольников
    this.segGeo = new LineSegmentsGeometry().setPositions(new Float32Array(geo.index.count * 2));
    this.seg = new LineSegments2(this.segGeo, this.mat);
    this.seg.frustumCulled = false;
    this.body.add(this.seg);
    // складки между поджатыми пальцами и у большого
    for (const pts of [crease(CURL[0], 1, 0.25, 0.8), crease(CURL[0], -1, 0.25, 0.8)]) {
      const l = new Line2(new LineGeometry().setPositions(pts.flatMap(q => [q.x, q.y, q.z])), this.mat);
      l.frustumCulled = false;
      this.body.add(l);
    }
    this.cam = new THREE.Vector3();
    this.yaw = null;
  }

  // кончик пальца — над точкой top (мм модели); angle — наклон руки от +Y модели, против часовой
  place(top, angle) { this.top = top.clone(); this.root.rotation.z = angle; }

  // now — с, jab 0..1 — тычок (нажатие), opacity — проявление; camWorld — камера
  update(now, jab, opacity, camWorld) {
    this.root.visible = opacity > 0.01;
    if (!this.root.visible) return;
    this.mat.opacity = opacity;
    const s = Math.sin(2 * Math.PI * now / BOB_PERIOD);
    this.root.position.copy(this.top);
    this.pose.position.y = (HOVER + BOB * s) * (1 - jab) + 0.1 * jab;   // при тычке кончик доходит до макушки
    // тыл ладони — к камере (по оси пальца), плавно
    this.root.updateMatrixWorld(true);
    this.root.worldToLocal(this.cam.copy(camWorld));
    const want = Math.atan2(this.cam.x, this.cam.z) + YAW;
    if (this.yaw === null) this.yaw = want;
    this.yaw += Math.atan2(Math.sin(want - this.yaw), Math.cos(want - this.yaw)) * 0.08;
    this.turn.rotation.y = this.yaw;
    // покачивание — вокруг кончика пальца, с отставанием по фазе от хода
    this.pose.rotation.z = SWAY * Math.sin(2 * Math.PI * now / BOB_PERIOD + 1.2) * (1 - jab);
    this.pose.rotation.x = 0.6 * SWAY * Math.sin(2 * Math.PI * now / (BOB_PERIOD * 1.7));
    this.root.updateMatrixWorld(true);
    this.contour(camWorld);
  }

  contour(camWorld) {
    const out = this.segGeo.attributes.instanceStart.data;
    const a = out.array;
    let n = 0;
    const c = this.cam, p = [0, 0, 0], g = [0, 0, 0];
    this.body.worldToLocal(c.copy(camWorld));      // у сеток своих сдвигов нет — система body
    for (const m of this.meshes) {
      const P = m.geometry.attributes.position.array, N = m.geometry.attributes.normal.array, I = m.geometry.index.array;
      const vals = new Float32Array(P.length / 3);
      for (let i = 0; i < vals.length; i++)
        vals[i] = N[3 * i] * (c.x - P[3 * i]) + N[3 * i + 1] * (c.y - P[3 * i + 1]) + N[3 * i + 2] * (c.z - P[3 * i + 2]);
      for (let t = 0; t < I.length; t += 3) {
        p[0] = I[t]; p[1] = I[t + 1]; p[2] = I[t + 2];
        g[0] = vals[p[0]]; g[1] = vals[p[1]]; g[2] = vals[p[2]];
        if ((g[0] > 0) === (g[1] > 0) && (g[1] > 0) === (g[2] > 0)) continue;
        let k = 0;
        for (let e = 0; e < 3; e++) {
          const i0 = p[e], i1 = p[(e + 1) % 3], g0 = g[e], g1 = g[(e + 1) % 3];
          if ((g0 > 0) === (g1 > 0)) continue;
          const f = g0 / (g0 - g1), o = n * 6 + k * 3;
          a[o] = P[3 * i0] + (P[3 * i1] - P[3 * i0]) * f;
          a[o + 1] = P[3 * i0 + 1] + (P[3 * i1 + 1] - P[3 * i0 + 1]) * f;
          a[o + 2] = P[3 * i0 + 2] + (P[3 * i1 + 2] - P[3 * i0 + 2]) * f;
          if (++k === 2) break;
        }
        if (k === 2) n++;
      }
    }
    out.needsUpdate = true;
    this.segGeo.instanceCount = n;
  }

  hit(ray) { return this.root.visible && ray.intersectObjects(this.meshes, false).length > 0; }
}
