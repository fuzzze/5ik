// Окружение устройства в демке — штриховая графика, без объёма и текстур:
//   стоит      — поверхность под ним;
//   на боку    — USB-кабель сверху, штекер в гнезде;
//   вверх дном — кабель выходит вбок и уходит вверх;
//   USB вниз   — переходник USB-C → USB-A в условном пауэрбанке.
// Координаты — мм модели (X вправо, Y вверх, Z к зрителю, центр экрана в нуле),
// то есть в системе устройства до поворота; USB-гнездо смотрит в +X.
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';

const INK = 0x5f6368;        // цвет штриха
const PAPER = 0xffffff;      // заливка «трубок» — цвет фона
const STROKE = 1.5;          // толщина штриха, px

// гнездо USB-C и корпус (enclosure.py: LM["usb_face"], R_OUT; дно — Y_OUT_BOT − FOOT)
const PORT = new THREE.Vector3(16.92, -13.31, -7.08);
const WALL_X = 21.3;
const FLOOR_Y = -35.3;

const materials = [];
function mat(params) {
  // без тон-маппинга (белый должен остаться белым) и без записи глубины:
  // белая середина «трубки» ложится поверх тёмной каймы без мерцания
  const m = new LineMaterial({ transparent: true, toneMapped: false, depthWrite: false, ...params });
  materials.push(m);
  return m;
}

export function setResolution(w, h) {
  for (const m of materials) m.resolution.set(w, h);
}

// замкнутые и открытые ломаные — штрихом STROKE px
function polyline(points, closed = false) {
  const p = closed ? [...points, points[0]] : points;
  const g = new LineGeometry().setPositions(p.flatMap(v => [v.x, v.y, v.z]));
  return new Line2(g, mat({ color: INK, linewidth: STROKE }));
}

// невидимая «пробка» коробки: пишет только глубину и прячет задние рёбра
const occluderMat = new THREE.MeshBasicMaterial({
  colorWrite: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
});
function occluder(a, b) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(b.x - a.x, b.y - a.y, b.z - a.z), occluderMat);
  m.position.addVectors(a, b).multiplyScalar(0.5);
  m.renderOrder = -1;
  return m;
}

// рёбра коробки (12 отрезков) — от a до b по осям, задние скрыты
function boxEdges(a, b) {
  const g = new THREE.Group();
  g.add(occluder(a, b), boxLines(a, b));
  return g;
}
function boxLines(a, b) {
  const c = [];
  for (const [x, y, z] of [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]])
    c.push(new THREE.Vector3(x ? b.x : a.x, y ? b.y : a.y, z ? b.z : a.z));
  const e = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  const g = new LineSegmentsGeometry().setPositions(e.flatMap(([i, j]) => [...c[i].toArray(), ...c[j].toArray()]));
  return new LineSegments2(g, mat({ color: INK, linewidth: STROKE }));
}

// прямоугольник со скруглёнными углами в плоскости, заданной осями u, v вокруг центра
function roundRect(center, u, v, w, h, r, seg = 6) {
  const pts = [];
  const corners = [[w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, 90], [-w / 2 + r, -h / 2 + r, 180], [w / 2 - r, -h / 2 + r, 270]];
  for (const [cx, cy, a0] of corners)
    for (let i = 0; i <= seg; i++) {
      const a = (a0 + 90 * i / seg) * Math.PI / 180;
      pts.push(center.clone().addScaledVector(u, cx + r * Math.cos(a)).addScaledVector(v, cy + r * Math.sin(a)));
    }
  return polyline(pts, true);
}

// «трубка» штрихом: тёмная полоса шире на 2 штриха, поверх — белая; сливаются в один контур
function tube(points, widths) {
  const g = new THREE.Group();
  const parts = [];
  for (let i = 0; i < points.length; i++) {
    const geo = new LineGeometry().setPositions(points[i].flatMap(v => [v.x, v.y, v.z]));
    parts.push([geo, widths[i]]);
  }
  for (const [geo, w] of parts) {
    const l = new Line2(geo, mat({ color: INK, linewidth: w + 0.45, worldUnits: true }));
    l.renderOrder = 1;
    g.add(l);
  }
  for (const [geo, w] of parts) {
    const l = new Line2(geo, mat({ color: PAPER, linewidth: w - 0.45, worldUnits: true }));
    l.renderOrder = 2;
    g.add(l);
  }
  return g;
}

const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
const at = (x, dy = 0) => new THREE.Vector3(x, PORT.y + dy, PORT.z);

// поверхность: скруглённый прямоугольник под дном
function surface() {
  const g = new THREE.Group();
  g.add(roundRect(new THREE.Vector3(0, FLOOR_Y, -8), X, Z, 84, 50, 6, 8));
  return g;
}

// штекер USB-C с кабелем: корпус штекера 11.8 мм, «хвостовик» 6, кабель 3.6.
// Концы полос скруглены на полширины — точки отступают внутрь на столько же.
function cable(path) {
  return tube([
    [at(PORT.x + 0.4 + 5.9), at(40 - 5.9)],     // корпус штекера: от гнезда до 40 мм
    [at(40 - 3), at(46)],                       // хвостовик
    path,                                       // кабель
  ], [11.8, 6, 3.6]);
}

function cableUp() {          // на боку: гнездо смотрит вверх, кабель прямо вверх
  return cable([at(46), at(260)]);
}

function cableSide() {        // вверх дном: кабель выходит вбок и изгибается вверх (−Y модели)
  const c = new THREE.CatmullRomCurve3([at(46), at(62), at(74, -8), at(80, -26), at(82, -60), at(83, -240)]);
  return cable(c.getPoints(48));
}

// переходник USB-C → USB-A в пауэрбанке; гнездо смотрит вниз
function powerBank() {
  const g = new THREE.Group();
  const box = (x0, x1, w, h) => boxEdges(
    new THREE.Vector3(x0, PORT.y - w / 2, PORT.z - h / 2), new THREE.Vector3(x1, PORT.y + w / 2, PORT.z + h / 2));
  g.add(box(WALL_X, 23.5, 8.3, 2.5));     // металл штекера USB-C между стенкой и корпусом
  g.add(box(23.5, 34, 13, 6.5));          // корпус переходника
  g.add(box(34, 45, 12, 4.5));            // штекер USB-A (виден на 1 мм над пауэрбанком)
  const top = 44, len = 120, W = 68, H = 24;
  g.add(boxEdges(new THREE.Vector3(top, PORT.y - W / 2, PORT.z - H / 2),
                 new THREE.Vector3(top + len, PORT.y + W / 2, PORT.z + H / 2)));
  g.add(roundRect(new THREE.Vector3(top, PORT.y, PORT.z), Y, Z, 14, 6, 0.6, 1));   // гнездо USB-A
  for (let i = 0; i < 4; i++)                                                       // индикатор заряда
    g.add(roundRect(new THREE.Vector3(top + 12, PORT.y - 7.5 + i * 5, PORT.z + H / 2), Y, X, 2, 2, 1, 3));
  return g;
}

// по положению экрана rot (0..3, по 90° по часовой; корпус — против часовой)
export function buildProps() {
  return [surface(), cableUp(), cableSide(), powerBank()];
}
