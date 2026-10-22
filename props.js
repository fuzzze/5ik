// Окружение устройства в демке — штриховая графика одной тонкой линией, без объёма:
//   стоит      — поверхность под ним;
//   на боку    — USB-кабель сверху, штекер в гнезде;
//   вверх дном — кабель выходит вбок и уходит вверх;
//   USB вниз   — переходник USB-C → USB-A (пропорции — по фото образца) в пауэрбанке.
// Координаты — мм модели (X вправо, Y вверх, Z к зрителю, центр экрана в нуле),
// в системе устройства до поворота; USB-гнездо смотрит в +X.
//
// Как рисуется: у каждой детали — невидимая «пробка» (пишет только глубину, прячет
// задние линии) и контур. Рёбра — постоянные линии; у скруглённых боков и кабеля
// контур зависит от точки зрения — он пересчитывается каждый кадр (updateProps()).
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

const INK = 0x5f6368;        // цвет штриха
export const STROKE = 1.5;   // толщина штриха, px — везде одна (и у обводки деталей, outline.js)

// гнездо USB-C и корпус (enclosure.py: LM["usb_face"]; дно — Y_OUT_BOT − FOOT)
const PORT = new THREE.Vector3(16.92, -13.31, -7.08);
const FLOOR_Y = -35.3;

const materials = [];
export const lineMat = () => {
  const m = new LineMaterial({ color: INK, linewidth: STROKE, transparent: true, toneMapped: false, depthWrite: false });
  materials.push(m);
  return m;
};
export function setResolution(w, h) {
  for (const m of materials) m.resolution.set(w, h);
}

const occluderMat = new THREE.MeshBasicMaterial({
  colorWrite: false, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2,
});

function line(points, closed = false) {
  const p = closed ? [...points, points[0]] : points;
  const l = new Line2(new LineGeometry().setPositions(p.flatMap(v => [v.x, v.y, v.z])), lineMat());
  l.frustumCulled = false;
  return l;
}

// линия с переменными точками: число точек фиксировано, буфер обновляется на месте
function dynLine(n) {
  const l = line(Array.from({ length: n }, () => new THREE.Vector3()));
  l.set = pts => {
    const a = l.geometry.attributes.instanceStart.data;
    for (let i = 0; i < n - 1; i++)
      a.array.set([pts[i].x, pts[i].y, pts[i].z, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z], i * 6);
    a.needsUpdate = true;
  };
  return l;
}

// ─── профиль: скруглённый прямоугольник w × h, радиус r, в осях (u, v) ──────
const SEG = 8;   // точек на четверть дуги
function profile(w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  const pts = [];
  for (const [cx, cy, a0] of [[w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, 90],
                               [-w / 2 + r, -h / 2 + r, 180], [w / 2 - r, -h / 2 + r, 270]])
    for (let i = 0; i <= SEG; i++) {
      const a = (a0 + 90 * i / SEG) * Math.PI / 180;
      pts.push({ u: cx + r * Math.cos(a), v: cy + r * Math.sin(a), nu: Math.cos(a), nv: Math.sin(a) });
    }
  return pts;
}

// плоский контур скруглённого прямоугольника вокруг center в плоскости осей u, v
function roundRect(center, u, v, w, h, r) {
  return line(profile(w, h, r).map(p => center.clone().addScaledVector(u, p.u).addScaledVector(v, p.v)), true);
}

// ─── «лофт» вдоль X: сечения {x, w, h, r} с центром в (cy, cz) ───────────────
// Сечение может нести dz — сдвиг центра по Z. Контур — у сечений из edges; у почти острых углов (r < 1.5) — линии по углам,
// у скруглённых — силуэт по точке зрения.
function loft(stations, { cy = PORT.y, cz = PORT.z, edges = [0, stations.length - 1] } = {}) {
  const g = new THREE.Group();
  const prof = stations.map(s => profile(s.w, s.h, s.r));
  const zc = i => cz + (stations[i].dz ?? 0);    // dz — сдвиг сечения по Z (несимметричное сужение)
  const P = (i, k) => new THREE.Vector3(stations[i].x, cy + prof[i][k].u, zc(i) + prof[i][k].v);
  const n = prof[0].length;

  // пробка: боковины + торцы
  const pos = [], idx = [];
  stations.forEach((s, i) => { for (let k = 0; k < n; k++) pos.push(...P(i, k).toArray()); });
  for (let i = 0; i < stations.length - 1; i++)
    for (let k = 0; k < n; k++) {
      const a = i * n + k, b = i * n + (k + 1) % n;
      idx.push(a, b, b + n, a, b + n, a + n);
    }
  for (const i of [0, stations.length - 1]) {
    const c = pos.length / 3;
    pos.push(stations[i].x, cy, zc(i));
    for (let k = 0; k < n; k++) idx.push(c, i * n + k, i * n + (k + 1) % n);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  const occ = new THREE.Mesh(geo, occluderMat);
  occ.material.side = THREE.DoubleSide;
  g.add(occ);

  for (const i of edges) g.add(line(prof[i].map((_, k) => P(i, k)), true));

  if (Math.max(...stations.map(s => Math.min(s.r, s.w / 2, s.h / 2))) < 1.5) {
    const mid = SEG / 2;   // середины четырёх дуг — рёбра
    for (let c = 0; c < 4; c++) g.add(line(stations.map((_, i) => P(i, c * (SEG + 1) + mid))));
    return g;
  }
  // силуэт: нормаль сечения ⟂ взгляду (профиль постоянен по X — нормали без X-составляющей)
  const sil = [dynLine(stations.length), dynLine(stations.length)];
  g.add(...sil);
  g.userData.update = cam => {
    const out = [[], []];
    stations.forEach((s, i) => {
      const f = k => prof[i][k].nu * (cam.y - cy - prof[i][k].u) + prof[i][k].nv * (cam.z - zc(i) - prof[i][k].v);
      for (let k = 0; k < n; k++) {
        const a = f(k), b = f((k + 1) % n);
        if ((a > 0) !== (b > 0)) out[a > 0 ? 0 : 1][i] = P(i, k).lerp(P(i, (k + 1) % n), a / (a - b));
      }
      for (const o of out) o[i] ??= P(i, 0);   // камера внутри профиля — линия схлопнется
    });
    sil[0].set(out[0]); sil[1].set(out[1]);
  };
  return g;
}

// ─── кабель: труба радиуса r по кривой, силуэт — две линии по точке зрения ──
function tube(curve, r, segs = 64) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, segs, r, 12), occluderMat));
  const pts = curve.getSpacedPoints(segs);
  const tan = pts.map((_, i) => curve.getTangentAt(i / segs));
  const sil = [dynLine(pts.length), dynLine(pts.length)];
  g.add(...sil);
  const v = new THREE.Vector3();
  g.userData.update = cam => {
    const a = [], b = [];
    pts.forEach((p, i) => {
      v.subVectors(cam, p).cross(tan[i]).normalize().multiplyScalar(r);
      a.push(p.clone().add(v));
      b.push(p.clone().sub(v));
    });
    sil[0].set(a);
    sil[1].set(b);
  };
  return g;
}

const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
const at = (x, dy = 0) => new THREE.Vector3(x, PORT.y + dy, PORT.z);

// ─── сцены ───────────────────────────────────────────────────────────────────
function surface() {
  const g = new THREE.Group();
  g.add(roundRect(new THREE.Vector3(0, FLOOR_Y, -8), X, Z, 186, 120, 0));   // стол — простой прямоугольник
  return g;
}

// штекер USB-C кабеля: корпус входит в проём корпуса до гнезда (проём 12.4 × 6.8),
// за ним — сужающийся хвостовик и кабель Ø3.6
function plug() {
  const g = new THREE.Group();
  g.add(loft([
    { x: PORT.x + 0.3, w: 11.4, h: 6.0, r: 2.6 },
    { x: 34.5, w: 11.0, h: 5.8, r: 2.6 },
    { x: 36.5, w: 10.0, h: 5.0, r: 2.4 },
  ]));
  g.add(loft([
    { x: 36.5, w: 6.4, h: 4.6, r: 2.3 },
    { x: 44, w: 3.8, h: 3.8, r: 1.9 },
  ], { edges: [] }));
  return g;
}

function cableUp() {          // на боку: гнездо смотрит вверх, кабель прямо вверх
  const g = plug();
  g.add(tube(new THREE.LineCurve3(at(43.5), at(260)), 1.8, 8));
  return g;
}

function cableSide() {        // вверх дном: кабель выходит вбок и изгибается вверх (−Y модели)
  const g = plug();
  g.add(tube(new THREE.CatmullRomCurve3([at(43.5), at(58), at(70, -7), at(77, -24), at(80, -60), at(82, -240)]), 1.8));
  g.add(clothespin(47));
  return g;
}

// прищепка, зажавшая кабель сразу за штекером: две планки 72 × 10 × 6.5 обнимают
// кабель спереди и сзади, губки — у кабеля, пружина посередине. Строится вдоль X
// своей системы (0 — губки) и поворачивается вверх по миру (−Y модели).
function clothespin(x, k = 0.5) {   // k — масштаб от натуральной прищепки 72 мм
  const g = new THREE.Group();
  const gap = 1.8;                                  // радиус кабеля: губки сжимают его, не масштабируется
  const L = 72 * k, W = 10 * k, H = 6.5 * k;
  for (const s of [-1, 1]) {
    // внутренняя грань губки — у кабеля, наружная сужается к кончику
    const st = (x, h) => ({ x, w: W, h, r: 0.6 * k, dz: s * (gap + h / 2) });
    g.add(loft([st(0, 3.6 * k), st(10 * k, H), st(L, H)], { cy: 0, cz: 0, edges: [0, 1, 2] }));
  }
  for (const px of [33 * k, 38 * k])                // пружина — бандаж вокруг обеих планок
    g.add(roundRect(new THREE.Vector3(px, 0, 0), Y, Z, W + 1, 2 * (gap + H) + 1, 1.2 * k));
  g.position.set(x, PORT.y + 4 * k, PORT.z);        // губки — чуть ниже кабеля (по миру)
  g.rotation.z = -Math.PI / 2;                      // своя X → −Y модели (вверх по миру)
  return g;
}

// переходник по образцу: USB-C в гнезде → шейка в проёме корпуса → чёрный корпус
// (13.6 × 6.6, длина ~0.8 ширины) → USB-A (12 × 4.5) почти целиком в гнезде пауэрбанка
function powerBank() {
  const g = new THREE.Group();
  g.add(loft([{ x: PORT.x + 0.3, w: 9.6, h: 4.4, r: 2.2 }, { x: 21.6, w: 9.6, h: 4.4, r: 2.2 }]));   // шейка
  g.add(loft([{ x: 21.6, w: 13.6, h: 6.6, r: 0.9 }, { x: 32.6, w: 13.6, h: 6.6, r: 0.9 }]));        // корпус
  g.add(loft([{ x: 32.6, w: 12, h: 4.5, r: 0.3 }, { x: 44.6, w: 12, h: 4.5, r: 0.3 }]));            // USB-A
  // пауэрбанк: длинные грани скруглены по максимуму (полутолщины)
  const top = 34.1, len = 120, W = 68, H = 24;
  g.add(loft([{ x: top, w: W, h: H, r: H / 2 }, { x: top + len, w: W, h: H, r: H / 2 }]));
  g.add(roundRect(new THREE.Vector3(top - 0.05, PORT.y, PORT.z), Y, Z, 13.4, 5.6, 0.6));   // гнездо USB-A
  for (let i = 0; i < 4; i++)                                                                 // индикатор заряда
    g.add(roundRect(new THREE.Vector3(top + 12, PORT.y - 7.5 + i * 5, PORT.z + H / 2 + 0.05), Y, X, 2, 2, 1));
  return g;
}

// по положению экрана rot (0..3): стоит, на боку, вверх дном, USB вниз
export function buildProps() {
  return [surface(), cableUp(), cableSide(), powerBank()];
}

// пересчитать силуэты реквизита; cam — положение камеры в мире
const camL = new THREE.Vector3();
export function updateProps(prop, cam) {
  prop.traverse(o => { if (o.userData.update) o.userData.update(o.worldToLocal(camL.copy(cam))); });
}
