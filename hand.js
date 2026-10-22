// Мультяшная перчатка над макушкой: висит в воздухе, покачивается и указательным пальцем
// показывает, что макушку можно нажать (клик по ней самой — тоже нажатие). Рисуется тем же
// штрихом, что реквизит props.js: невидимый заслон в буфер глубины + линии контура.
//
// Детали — гладкие параметрические поверхности (ладонь-суперэллипсоид, пальцы-«сардельки»
// с круглыми концами, отворот манжеты — тело вращения). Контур считается каждый кадр:
// на каждом треугольнике — отрезок, где n·(камера − p), интерполированное по вершинам,
// меняет знак (Hertzmann & Zorin) — линия гладкая, без «лесенки» по рёбрам сетки.
// Места, где палец или манжета входят в ладонь, — заранее посчитанные линии стыка.
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
const YAW = THREE.MathUtils.degToRad(-28);   // поворот к камере: тыл ладони в три четверти

// заслон: пишет только глубину. Рисуется раньше корпуса (renderOrder), поэтому за рукой
// корпус не проступает — перчатка «закрашена» фоном страницы, как белая перчатка в мультфильме
const occluderMat = new THREE.MeshBasicMaterial({
  colorWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2,
});

// ─── поверхности ────────────────────────────────────────────────────────────
// fn(u, v) → точка; u 0..1 — от полюса до полюса, v 0..1 — по кругу (замкнуто)
function surface(fn, nu, nv) {
  const pos = [], idx = [], p = new THREE.Vector3();
  for (let i = 0; i <= nu; i++)
    for (let j = 0; j < nv; j++) pos.push(...fn(i / nu, j / nv, p).toArray());
  for (let i = 0; i < nu; i++)
    for (let j = 0; j < nv; j++) {
      const a = i * nv + j, b = i * nv + (j + 1) % nv;
      idx.push(a, b + nv, b, a, a + nv, b + nv);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  // на полюсах вершины совпадают, а нормали у каждой — от своего треугольника: усредняем
  const n = geo.attributes.normal, s = new THREE.Vector3();
  for (const row of [0, nu]) {
    s.set(0, 0, 0);
    for (let j = 0; j < nv; j++) s.x += n.getX(row * nv + j), s.y += n.getY(row * nv + j), s.z += n.getZ(row * nv + j);
    s.normalize();
    for (let j = 0; j < nv; j++) n.setXYZ(row * nv + j, s.x, s.y, s.z);
  }
  geo.userData.fn = fn;
  return geo;
}

// ладонь — суперэллипсоид: |x/a|^p + |y/b|^p + |z/c|^p = 1, p = 2/E (E < 1 — «квадратнее»)
const PALM = { c: new THREE.Vector3(0, 7.2, 0), r: new THREE.Vector3(6.3, 6.6, 3.4), e: 0.72 };
const spow = (x, e) => Math.sign(x) * Math.abs(x) ** e;
function palmFn(u, v, p) {
  const a = Math.PI * u, b = 2 * Math.PI * v, { c, r, e } = PALM;
  return p.set(c.x + r.x * spow(Math.sin(a), e) * spow(Math.cos(b), e),
               c.y - r.y * spow(Math.cos(a), e),
               c.z + r.z * spow(Math.sin(a), e) * spow(Math.sin(b), e));
}
function palmF(q) {                         // < 1 — внутри ладони
  const { c, r, e } = PALM, k = 2 / e;
  return Math.abs((q.x - c.x) / r.x) ** k + Math.abs((q.y - c.y) / r.y) ** k + Math.abs((q.z - c.z) / r.z) ** k;
}

// палец — трубка по кривой с переменным радиусом и полусферами на концах
function fingerFn(points, r0, r1) {
  const curve = new THREE.CatmullRomCurve3(points.map(a => new THREE.Vector3(...a)));
  const N = 64, fr = curve.computeFrenetFrames(N, false);
  const len = curve.getLength(), cap0 = Math.PI * r0 / 2, cap1 = Math.PI * r1 / 2, T = cap0 + len + cap1;
  const frame = s => Math.min(N, Math.round(s * N));
  const c = new THREE.Vector3(), t = new THREE.Vector3();
  return (u, v, p) => {
    const w = u * T, b = 2 * Math.PI * v;
    let s, rad, ax;                         // доля длины, радиус сечения, сдвиг вдоль касательной
    if (w < cap0) { const a = w / r0; s = 0; rad = r0 * Math.sin(a); ax = -r0 * Math.cos(a); }
    else if (w > cap0 + len) { const a = (T - w) / r1; s = 1; rad = r1 * Math.sin(a); ax = r1 * Math.cos(a); }
    else { s = (w - cap0) / len; rad = THREE.MathUtils.lerp(r0, r1, s); ax = 0; }
    const k = frame(s);
    curve.getPointAt(s, c);
    curve.getTangentAt(s, t);
    return p.copy(c).addScaledVector(t, ax)
      .addScaledVector(fr.normals[k], rad * Math.cos(b)).addScaledVector(fr.binormals[k], rad * Math.sin(b));
  };
}

// манжета — тело вращения вдоль +Y, сплюснутое по Z (запястье не круглое); профиль (r, y)
// с отворотом на краю: на нём контур сам «ломается», рисуя валик
const CUFF_Z = 0.72;
const CUFF = new THREE.SplineCurve([
  [0, 10.4], [3.6, 10.6], [4.3, 12.5], [4.6, 15], [5.6, 18.2], [6.5, 19.2], [6.6, 20.4], [6.0, 21.1], [5.2, 20.9], [0, 20.6],
].map(a => new THREE.Vector2(...a)));
function cuffFn(u, v, p) {
  const q = CUFF.getPoint(u), b = 2 * Math.PI * v;
  return p.set(q.x * Math.cos(b), q.y, q.x * Math.sin(b) * CUFF_Z);
}

// пальцы (правая рука, тыл к +Z): указательный вытянут вниз, средний и безымянный поджаты
// к ладони, большой прижат поверх них со стороны ладони
const FINGERS = [
  fingerFn([[3.3, 3.2, 0.2], [3.2, -1.5, 0.4], [3.0, -6.5, 0.6], [2.9, -9.8, 0.5]], 1.95, 1.8),     // указательный
  fingerFn([[-0.3, 3.0, 0.6], [-0.3, -0.6, 0.9], [-0.3, -2.6, -1.4], [-0.3, -1.4, -3.9], [-0.3, 1.4, -3.6]], 1.9, 1.75),   // средний
  fingerFn([[-3.6, 3.2, 0.5], [-3.7, 0.0, 0.6], [-3.8, -1.6, -1.6], [-3.8, -0.4, -3.7], [-3.7, 1.9, -3.4]], 1.85, 1.7),    // безымянный
  fingerFn([[4.6, 6.5, -1.6], [6.1, 3.6, -2.4], [4.4, 0.6, -3.9], [1.6, -0.4, -4.6]], 2.0, 1.85),  // большой
];
const TIP_Y = -9.8 - 1.8;      // кончик указательного — с полусферой

// линия стыка поверхности с ладонью: по каждому v — первый выход из ладони от конца u0
function seam(fn, from, to, nv = 48) {
  const pts = [], p = new THREE.Vector3();
  for (let j = 0; j <= nv; j++) {
    const v = j / nv;
    if (palmF(fn(from, v, p)) >= 1) return null;          // этот конец не в ладони
    let lo = from, hi = to;
    if (palmF(fn(hi, v, p)) < 1) return null;
    for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (palmF(fn(m, v, p)) < 1) lo = m; else hi = m; }
    pts.push(fn(hi, v, p).clone());
  }
  return pts;
}

// стежки на тыльной стороне — три линии от манжеты к костяшкам, по поверхности ладони
function stitch(x, y0, y1) {
  const { c, r, e } = PALM, k = 2 / e, pts = [];
  for (let i = 0; i <= 12; i++) {
    const y = THREE.MathUtils.lerp(y0, y1, i / 12);
    const z = r.z * Math.max(0, 1 - Math.abs(x / r.x) ** k - Math.abs((y - c.y) / r.y) ** k) ** (1 / k);
    pts.push(new THREE.Vector3(x, y, c.z + z + 0.04));
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
    this.body.position.y = -TIP_Y;
    this.mat = lineMat();
    this.meshes = [];
    const geos = [surface(palmFn, 28, 36), surface(cuffFn, 32, 36),
      ...FINGERS.map(fn => surface(fn, 44, 20))];
    for (const g of geos) {
      const m = new THREE.Mesh(g, occluderMat);
      m.renderOrder = -1;
      this.body.add(m);
      this.meshes.push(m);
    }
    // контур: отрезков не больше, чем треугольников
    this.geos = geos;
    const tris = geos.reduce((n, g) => n + g.index.count / 3, 0);
    this.segGeo = new LineSegmentsGeometry().setPositions(new Float32Array(tris * 6));
    this.seg = new LineSegments2(this.segGeo, this.mat);
    this.seg.frustumCulled = false;
    this.body.add(this.seg);
    // постоянные линии: стыки с ладонью и стежки
    const fixed = [seam(cuffFn, 0, 0.5)];
    for (const fn of FINGERS) fixed.push(seam(fn, 0, 0.5), seam(fn, 1, 0.5));
    fixed.push(stitch(-2.6, 4.6, 10.2), stitch(0, 4.4, 10.6), stitch(2.6, 4.6, 10.2));
    for (const pts of fixed.filter(Boolean)) {
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
