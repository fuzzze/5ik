// Blin в three.js: вращение мышью/пальцем, клик по макушке или дну — следующий экран
// (как кнопка-дно в настоящем корпусе), колесо/два пальца — взрыв-схема.
// Единицы — миллиметры, оси как в модели: X вправо, Y вверх, Z к зрителю.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BlinScreen, LANGS, loadFont } from './screen.js';
import { buildProps, setResolution, updateProps } from './props.js';
import { Hints } from './hints.js';
import { applySiteLang, LANG_NAMES } from './site.js';
import './flash.js';

const CENTER = new THREE.Vector3(0, -7, -8);   // середина собранного устройства
const TOP_Y = 4;          // клик выше этой отметки (мм от центра экрана) — «макушка»
const BOTTOM_Y = -31.5;   // клик ниже — дно-клавиша (Y_IN_BOT)
const PRESS_DEG = 3.4;    // наклон корпуса при нажатии — как у кнопки-дна
const PIVOT = new THREE.Vector3(0, -33.1, -14);  // ось шарниров клавиши

// ─── сцена ──────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });   // фон — CSS страницы
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
// сцена живёт в карточке-рамке (как основная рамка админки), не на всё окно
const stage = document.getElementById('stage');
const stageW = () => stage.clientWidth, stageH = () => stage.clientHeight;
renderer.setSize(stageW(), stageH());
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.prepend(renderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.7;

const camera = new THREE.PerspectiveCamera(30, stageW() / stageH(), 1, 5000);
camera.position.set(110, 70, 190);
if (new URLSearchParams(location.hash.slice(1)).has('front')) camera.position.set(0, 0, 220);   // #front — строго спереди

const key = new THREE.DirectionalLight(0xffffff, 1.6);
key.position.set(80, 160, 120);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = key.shadow.camera.bottom = -140;
key.shadow.camera.right = key.shadow.camera.top = 140;
key.shadow.camera.near = 10;
key.shadow.camera.far = 600;
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.3;
key.shadow.radius = 4;
scene.add(key);
scene.add(new THREE.HemisphereLight(0xffffff, 0xdfe3e8, 0.45));
// второй свет — скользящий слева-сверху от камеры, ходит вместе с ней: рельеф (ступеньки,
// фаски, логотип) читается с любой стороны, а не только там, куда светит основной
const rim = new THREE.DirectionalLight(0xffffff, 0.9);
rim.position.set(-160, 90, 40);          // в осях камеры; цель — центр модели (0, 0, 0)
camera.add(rim);
scene.add(camera);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enableZoom = false;   // колесо занято взрыв-схемой
controls.enablePan = false;
// два пальца — только взрыв-схема (см. touchmove ниже). С выключенными zoom/pan OrbitControls
// на втором пальце выходит, не сбросив вращение от первого, — и жест крутит модель.
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: null };
controls.target.set(0, 0, 0);

// device: центр собранного устройства в нуле; press: поворот вокруг шарниров
const device = new THREE.Group();
const press = new THREE.Group();
press.position.copy(PIVOT).sub(CENTER);
device.add(press);
scene.add(device);

// ─── модель ─────────────────────────────────────────────────────────────────
const parts = [];          // { obj, group, base }
let explode = {};
let screen = null;          // BlinScreen: живой экран на canvas
let screenTex = null;

// #explode, #lang=de, #explode&lang=de — параметры в hash (query до артефакта не доходит)
const hash = new URLSearchParams(location.hash.slice(1));
function setLang(l) {
  if (!LANGS.includes(l)) l = 'en';
  if (screen) screen.lang = l;
  document.documentElement.lang = l;
  hints.setLang(l);
  applySiteLang(l);
  for (const b of langBar.children) b.setAttribute('aria-pressed', b.dataset.lang === l);
  lang = l;
}
// ─── подсказки ──────────────────────────────────────────────────────────────
// Собрано, под углом — одна на макушке (как жать кнопку). Строго спереди — пять
// к информации на экране. Полностью разобрано — по одной на каждую из 5 деталей.
// Точки — в мм модели; у экранных — пиксели экрана 240×240 (координаты ui_init()).
const hints = new Hints(document.getElementById('hints'));
let modelRoot = null;
const hintV = new THREE.Vector3();
const AA = 32.4 / 240;       // мм на пиксель экрана (DISP_AA_D / 240)
function modelPoint(x, y, z, group) {
  hintV.set(x, y, z + (group ? explodeOffset(group, t) : 0));
  return modelRoot.localToWorld(hintV);
}
function screenPoint(px, py) {
  // картинка повёрнута вместе с экраном (tft.setRotation) — на rot × 90° по часовой
  const a = -(screen?.rot ?? 0) * Math.PI / 2;
  const x = (px - 120) * AA, y = -(py - 120) * AA;
  return modelPoint(x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a), 1.6, 'display');
}
// кружки — у края элемента, чтобы не закрывать саму информацию
const SCREEN_HINTS = { temp: [182, 76], min: [36, 141], max: [204, 141], icons: [176, 51], chart: [176, 157] };
// у деталей разобранной схемы — под нижней точкой детали на экране, с отступом (см. partEdge)
const PART_HINTS = ['front', 'display', 's2', 'buzzer', 'back'];
hints.add('top', () => partEdge(null, 1), () => pressTop(), true);   // над макушкой: клик — нажатие
for (const [id, [px, py]] of Object.entries(SCREEN_HINTS)) hints.add(id, () => screenPoint(px, py));
for (const g of PART_HINTS) hints.add(g, () => partEdge(g, -1), null, true);

// Точка у края детали на экране: проекция её вершин (выборка — до HINT_SAMPLE на группу),
// по центру по горизонтали, на HINT_GAP px ниже нижней (side −1) или выше верхней (side 1)
// точки; глубина — центра детали. group null — вся модель (маркер над макушкой).
const HINT_GAP = 18, HINT_SAMPLE = 600;   // px от края детали до центра кружка (16 px)
const partBox = new THREE.Box3(), partV = new THREE.Vector3(), partC = new THREE.Vector3();
const partPts = new Map();   // группа → [[сетка, Float32Array локальных точек]]
function partSamples(group) {
  if (!partPts.has(group)) {
    const mine = parts.filter(p => group === null || p.group === group);
    partPts.set(group, mine.map(p => {
      const pos = p.obj.geometry.attributes.position, n = pos.count;
      const budget = group === null ? 3 * HINT_SAMPLE : HINT_SAMPLE;   // вся модель — выборка гуще
      const step = Math.max(1, Math.floor(n * mine.length / budget));
      const a = [];
      for (let i = 0; i < n; i += step) a.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      return [p.obj, new Float32Array(a)];
    }));
  }
  return partPts.get(group);
}
function partEdge(group, side) {
  partBox.makeEmpty();
  partC.set(0, 0, 0);
  let n = 0;
  for (const [obj, a] of partSamples(group)) {
    for (let i = 0; i < a.length; i += 3) {
      partV.set(a[i], a[i + 1], a[i + 2]).applyMatrix4(obj.matrixWorld);
      partC.add(partV); n++;
      partBox.expandByPoint(partV.project(camera));
    }
  }
  const z = partC.divideScalar(Math.max(n, 1)).project(camera).z;
  const y = side > 0 ? partBox.max.y + 2 * HINT_GAP / stageH() : partBox.min.y - 2 * HINT_GAP / stageH();
  return partV.set((partBox.min.x + partBox.max.x) / 2, y, z).unproject(camera);
}

const FRONTAL = Math.cos(THREE.MathUtils.degToRad(8));   // «строго спереди» — в пределах 8°
const camDir = new THREE.Vector3();
function updateHints() {
  if (!modelRoot) return;
  const show = new Set();
  const assembled = t < 0.02 && tTarget < 0.02, exploded = t > 0.97;
  const frontal = camDir.subVectors(camera.position, controls.target).normalize().z > FRONTAL;
  if (assembled) (frontal ? Object.keys(SCREEN_HINTS) : ['top']).forEach(id => show.add(id));
  if (exploded) PART_HINTS.forEach(id => show.add(id));
  hints.update(camera, show, stageW(), stageH());
}

let lang = hash.get('lang') || (navigator.language || 'en').slice(0, 2);
const langBar = document.getElementById('lang');
for (const l of LANGS) {
  const b = document.createElement('button');
  b.textContent = l.toUpperCase();
  b.title = LANG_NAMES[l];
  b.dataset.lang = l;
  b.onclick = () => setLang(l);
  langBar.appendChild(b);
}
setLang(lang);

async function loadScreen() {
  const icons = new Image();
  icons.src = 'screen/icons.png';
  const [data] = await Promise.all([
    fetch('screen/screens.json').then(r => r.json()),
    icons.decode(),
    loadFont('screen/montserrat-sb.woff'),
  ]);
  screen = new BlinScreen(data, icons);
  screen.lang = lang;
  screenTex = new THREE.CanvasTexture(screen.canvas);
  screenTex.flipY = false;                 // UV в glTF идут сверху вниз
  screenTex.colorSpace = THREE.SRGBColorSpace;
  screenTex.anisotropy = 8;
}

Promise.all([
  fetch('explode.json').then(r => r.json()),
  new GLTFLoader().loadAsync('blin.gltf.json'),
  loadScreen(),
]).then(([ex, gltf]) => {
  explode = ex;
  const root = modelRoot = gltf.scene;
  root.position.copy(CENTER).negate().sub(press.position);   // в системе press
  press.add(root);
  root.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = o.receiveShadow = true;
    const name = o.name || o.parent.name;
    const group = name === 'screen' ? 'display' : name.split('__')[0];
    parts.push({ obj: o, group, base: o.position.z });
    if (name === 'screen') {
      // экран светится сам: без освещения и тон-маппинга — цвета как на устройстве
      o.material = new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false });
      o.receiveShadow = false;
    }
  });
  // #rot=1..3 — открыть с повёрнутым экраном и устройством
  const r0 = (+hash.get('rot') || 0) & 3;
  for (let i = 0; i < r0; i++) screen.rotate();
  device.rotation.z = turnFrom = turnTo = r0 * Math.PI / 2;
  propCur = r0;
  document.getElementById('loading').remove();
}).catch(err => {
  document.getElementById('loading').dataset.err = 1;
  document.getElementById('loading').textContent =
    `не удалось загрузить сцену (${err.message}) — откройте через http-сервер, см. README`;
});

// ─── взрыв-схема: колесо и два пальца ───────────────────────────────────────
// ?explode=1 или #explode — открыть сразу разобранным
// #explode — разобранным, #explode=0.4 — на доле шкалы (этапы — по трети)
let tTarget = hash.has('explode') ? THREE.MathUtils.clamp(hash.get('explode') === '' ? 1 : +hash.get('explode') || 0, 0, 1)
  : THREE.MathUtils.clamp(+new URLSearchParams(location.search).get('explode') || 0, 0, 1);
let t = tTarget;
// ─── покачивание в начале: пока с моделью не взаимодействовали ───────────────
// Камера плавно ходит вокруг устройства ±SWING по синусу; амплитуда нарастает
// за первые секунды, чтобы старт был без рывка. Первое касание, клик, колесо —
// и покачивание выключается насовсем (OrbitControls продолжают с того же места).
const SWING = THREE.MathUtils.degToRad(14), SWING_PERIOD = 14, SWING_RAMP = 3;
let idle = !hash.has('front'), swingPrev = 0, swingT0 = -1;
function interacted() { idle = false; }
function swing(now) {
  if (!idle) return;
  if (swingT0 < 0) swingT0 = now;
  const s = now - swingT0;
  const a = SWING * Math.sin(2 * Math.PI * s / SWING_PERIOD) * smooth(Math.min(1, s / SWING_RAMP));
  camera.position.sub(controls.target).applyAxisAngle(THREE.Object3D.DEFAULT_UP, a - swingPrev).add(controls.target);
  swingPrev = a;
}

stage.addEventListener('wheel', e => {
  e.preventDefault();
  tTarget = THREE.MathUtils.clamp(tTarget + e.deltaY * 0.0015, 0, 1);
  interacted();
}, { passive: false });

let pinchY = null;
// после жеста двумя пальцами не вращать, пока не подняты все: иначе оставшийся палец докручивает
renderer.domElement.addEventListener('touchstart', e => {
  if (e.touches.length > 1) controls.enableRotate = false;
}, { passive: true });
renderer.domElement.addEventListener('touchmove', e => {
  if (e.touches.length !== 2) { pinchY = null; return; }
  const y = (e.touches[0].clientY + e.touches[1].clientY) / 2;
  if (pinchY !== null) tTarget = THREE.MathUtils.clamp(tTarget + (pinchY - y) * 0.004, 0, 1);
  pinchY = y;
  interacted();
}, { passive: true });
renderer.domElement.addEventListener('touchend', e => {
  pinchY = null;
  if (!e.touches.length) controls.enableRotate = true;
});
renderer.domElement.addEventListener('touchcancel', e => {
  pinchY = null;
  if (!e.touches.length) controls.enableRotate = true;
});

// ─── клик по макушке ────────────────────────────────────────────────────────
const ray = new THREE.Raycaster();
const tmpV = new THREE.Vector3();
const ndc = new THREE.Vector2();
let down = null;
let pressT = -1;           // время начала анимации нажатия, с

function hitTop(ev) {
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set((ev.clientX - r.left) / r.width * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(parts.map(p => p.obj), false)[0];
  if (!hit) return false;
  // как в жизни: щёлкает, если сжать макушку или дно-клавишу — в любом положении
  const y = device.worldToLocal(tmpV.copy(hit.point)).y + CENTER.y;   // мм модели
  return y > TOP_Y || y < BOTTOM_Y;
}

renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; interacted(); });
renderer.domElement.addEventListener('pointerup', e => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;  // это было вращение
  down = null;
  if (!screen || !hitTop(e)) return;
  pressTop();
});

function pressTop() {
  if (!screen) return;
  pressT = performance.now() / 1000;
  interacted();
  bootClick();
}

// ─── кнопка Boot: клики как в loop() прошивки ───────────────────────────────
// Короткие нажатия копятся, пока между ними < 400 мс; через 400 мс тишины:
// 1× — следующий экран, 2× — вкл/выкл звуковых алертов, 3× — поворот на 90°.
const CLICK_GAP = 400;
let clicks = 0, clickTimer = 0;
function bootClick() {
  clicks++;
  clearTimeout(clickTimer);
  clickTimer = setTimeout(() => {
    const now = performance.now();
    if (clicks === 1) screen.goto(screen.idx + 1, now);
    else if (clicks === 2) buzz(screen.toggleMute() ? 2700 : 3200, 80);
    else { screen.rotate(); buzz(3200, 60); turnDevice(now / 1000); }
    clicks = 0;
  }, CLICK_GAP);
}

// buzz(freq, ms): ledcWriteTone — меандр 50% на пьезо-пищалке
let audio = null;
function buzz(freq, ms) {
  try {
    audio ??= new AudioContext();
    const t0 = audio.currentTime, osc = audio.createOscillator(), gain = audio.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.06, t0);
    gain.gain.setValueAtTime(0, t0 + ms / 1000);
    osc.connect(gain).connect(audio.destination);
    osc.start(t0);
    osc.stop(t0 + ms / 1000 + 0.02);
  } catch { /* без звука — не страшно */ }
}
renderer.domElement.addEventListener('pointermove', e => {
  if (e.buttons) return;
  renderer.domElement.style.cursor = screen && hitTop(e) ? 'pointer' : '';
});

// ─── поэтапная разборка ─────────────────────────────────────────────────────
// Скролл ведёт t от 0 до 1, разборка идёт двумя этапами по половине шкалы:
//   1) крышка и чашка расходятся (защёлки — без шурупов);
//   2) устройство делится на экран, плату и зуммер.
// Финальные сдвиги — из explode.json (те же, что у render_hero.py).
const smooth = x => x * x * (3 - 2 * x);
function stageTargets(ex) {
  const s1 = { front: ex.front, back: ex.back };
  const s2 = { ...s1, display: ex.display, s2: ex.s2, buzzer: ex.buzzer };
  return [{}, s1, s2];
}
let stages = null;
function explodeOffset(group, t) {
  stages ??= stageTargets(explode);
  let z = 0;
  for (let k = 1; k < stages.length; k++) {
    const local = smooth(THREE.MathUtils.clamp(t * (stages.length - 1) - (k - 1), 0, 1));
    z += ((stages[k][group] ?? 0) - (stages[k - 1][group] ?? 0)) * local;
  }
  return z;
}

// ─── кадр ───────────────────────────────────────────────────────────────────
function pressAngle(now) {
  if (pressT < 0) return 0;
  const dt = now - pressT, down = 0.07, up = 0.22;
  if (dt > down + up) { pressT = -1; return 0; }
  const k = dt < down ? dt / down : 1 - (dt - down) / up;
  return THREE.MathUtils.degToRad(PRESS_DEG) * Math.sin(k * Math.PI / 2);
}

// ─── окружение: поверхность / кабель / пауэрбанк ────────────────────────────
// По положению (rot = 0..3) — свой реквизит в системе модели. При повороте старый
// гаснет сразу, новый проявляется, когда корпус довернулся. В разборе — скрыт.
const props = buildProps();
const propsRoot = new THREE.Group();
propsRoot.position.copy(CENTER).negate();
props.forEach(p => { p.visible = false; propsRoot.add(p); });
device.add(propsRoot);
setResolution(stageW(), stageH());
const PROP_OUT = 0.25, PROP_IN = 0.45;   // с
let propCur = 0, propInAt = -1e9;
const propOutAt = props.map(() => -1e9);
function showProp(r, now) {
  propOutAt[propCur] = now;
  propCur = r;
  propInAt = now + TURN_DELAY + TURN_TIME;
}
function fadeProps(now, e) {
  props.forEach((p, i) => {
    const a = (i === propCur ? THREE.MathUtils.clamp((now - propInAt) / PROP_IN, 0, 1)
                             : 1 - THREE.MathUtils.clamp((now - propOutAt[i]) / PROP_OUT, 0, 1)) * (1 - e);
    p.visible = a > 0.01;
    if (!p.visible) return;
    p.traverse(o => { if (o.material) o.material.opacity = a; });
    updateProps(p, camera.position);
  });
}

// ─── поворот устройства вслед за экраном ────────────────────────────────────
// Экран повернулся на 90° по часовой — корпус чуть погодя плавно ложится на бок
// против часовой, и картинка снова стоит прямо (корпус встаёт на любую из трёх граней).
const TURN_DELAY = 0.35, TURN_TIME = 0.9;   // с
let turnFrom = 0, turnTo = 0, turnT0 = -1;
function turnDevice(now) {
  showProp(screen.rot, now);
  turnFrom = device.rotation.z;
  turnTo += Math.PI / 2;                     // копится: после 270° — дальше, а не назад
  turnT0 = now + TURN_DELAY;
}
function turnAngle(now) {
  if (turnT0 < 0 || now < turnT0) return device.rotation.z;
  const k = Math.min(1, (now - turnT0) / TURN_TIME);
  const ease = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;   // easeInOutCubic
  return turnFrom + (turnTo - turnFrom) * ease;
}

// На широком (десктопном) экране разобранный вид кадрируется по деталям: зум (до ×2) и сдвиг
// кадра так, чтобы разлёт занял сцену с полями. Перспектива не меняется — меняется только
// «объектив». Считается каждый кадр: рамка разлёта зависит от ракурса (покачивание, вращение).
const FIT_MAX = 2, FIT_MARGIN = 0.07;   // потолок зума; поле — доля полуразмера сцены
const fitBox = new THREE.Box3(), fitV = new THREE.Vector3();
let fitZoom = 1, fitX = 0, fitY = 0;
const wideness = () => THREE.MathUtils.clamp((camera.aspect - 1) / 0.3, 0, 1);   // 0 — узкий экран, 1 — широкий
function frameExploded(e) {
  const k = e * wideness();   // 0 — собран или узкий экран
  let zoom = 1, cx = 0, cy = 0;
  if (k > 0 && parts.length) {
    camera.zoom = 1; camera.clearViewOffset(); camera.updateProjectionMatrix();
    fitBox.makeEmpty();
    for (const { obj } of parts) {
      const b = obj.geometry.boundingBox ?? (obj.geometry.computeBoundingBox(), obj.geometry.boundingBox);
      for (let i = 0; i < 8; i++) {
        fitV.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z)
          .applyMatrix4(obj.matrixWorld).project(camera);
        fitBox.expandByPoint(fitV);
      }
    }
    const fit = 2 * (1 - FIT_MARGIN) / Math.max(fitBox.max.x - fitBox.min.x, fitBox.max.y - fitBox.min.y);
    zoom = 1 + (Math.min(FIT_MAX, fit) - 1) * k;
    cx = (fitBox.min.x + fitBox.max.x) / 2 * k;
    cy = (fitBox.min.y + fitBox.max.y) / 2 * k;
  }
  // плавно — без дрожи от покачивания
  fitZoom += (zoom - fitZoom) * 0.15; fitX += (cx - fitX) * 0.15; fitY += (cy - fitY) * 0.15;
  const w = stageW(), h = stageH();
  camera.zoom = fitZoom;
  if (Math.abs(fitX) + Math.abs(fitY) > 1e-4) camera.setViewOffset(w, h, fitX * fitZoom * w / 2, -fitY * fitZoom * h / 2, w, h);
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}

function frame() {
  const now = performance.now() / 1000;
  t += (tTarget - t) * 0.12;
  const e = smooth(t);                     // плавный старт и финиш
  for (const p of parts) p.obj.position.z = p.base + explodeOffset(p.group, t);
  // в разобранном виде середина смещается назад — держим её в центре кадра
  device.position.z = 19 * e;
  device.rotation.z = turnAngle(now);
  // нажатие: корпус наклоняется вперёд вокруг шарниров (только в собранном виде)
  press.rotation.x = pressAngle(now) * (1 - e);
  // отъезжаем камерой, чтобы разлёт помещался в кадр
  // на узком (вертикальном) экране — дальше, чтобы помещалось по ширине
  const dist = THREE.MathUtils.lerp(165, 300, e) * Math.max(1, 1 / camera.aspect) ** 0.9;
  camera.position.sub(controls.target).setLength(dist).add(controls.target);
  swing(now);
  controls.update();
  scene.updateMatrixWorld();
  frameExploded(e);
  fadeProps(now, e);
  updateHints();
  if (screen) {
    screen.draw(performance.now());
    screenTex.needsUpdate = true;
  }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
frame();

new ResizeObserver(() => {
  const w = stageW(), h = stageH();
  setResolution(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}).observe(stage);
