// Blin в three.js: вращение мышью/пальцем, клик по макушке — следующий экран
// (как кнопка-дно в настоящем корпусе), колесо/два пальца — взрыв-схема.
// Единицы — миллиметры, оси как в модели: X вправо, Y вверх, Z к зрителю.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BlinScreen, LANGS, loadFont } from './screen.js';

const CENTER = new THREE.Vector3(0, -7, -8);   // середина собранного устройства
const TOP_Y = 4;          // клик выше этой отметки (мм от центра экрана) — «макушка»
const PRESS_DEG = 3.4;    // наклон корпуса при нажатии — как у кнопки-дна
const PIVOT = new THREE.Vector3(0, -33.1, -14);  // ось шарниров клавиши

// ─── сцена ──────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.7;

const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 1, 5000);
camera.position.set(110, 70, 190);

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
scene.add(new THREE.HemisphereLight(0xffffff, 0xdfe3e8, 0.6));

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enableZoom = false;   // колесо занято взрыв-схемой
controls.enablePan = false;
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
const HINT = {
  ru: 'тяните — вращать · колесо или два пальца — разобрать и собрать · клик по макушке — следующий экран, 2× — звук, 3× — поворот',
  en: 'drag to rotate · scroll or two fingers to take apart · click the top for the next screen, 2× — sound, 3× — rotate',
  de: 'ziehen — drehen · Mausrad oder zwei Finger — zerlegen · Klick oben — nächster Bildschirm, 2× — Ton, 3× — drehen',
  fr: 'glisser — tourner · molette ou deux doigts — démonter · clic sur le dessus — écran suivant, 2× — son, 3× — rotation',
  es: 'arrastra para girar · rueda o dos dedos para desmontar · clic arriba — siguiente pantalla, 2× — sonido, 3× — girar',
  pt: 'arraste para girar · roda ou dois dedos para desmontar · clique no topo — próxima tela, 2× — som, 3× — girar',
};
function setLang(l) {
  if (!LANGS.includes(l)) l = 'en';
  if (screen) screen.lang = l;
  document.documentElement.lang = l;
  document.getElementById('hint').textContent = HINT[l];
  for (const b of document.querySelectorAll('#lang button')) b.setAttribute('aria-pressed', b.dataset.lang === l);
  lang = l;
}
let lang = hash.get('lang') || (navigator.language || 'en').slice(0, 2);
const langBar = document.getElementById('lang');
for (const l of LANGS) {
  const b = document.createElement('button');
  b.textContent = l.toUpperCase();
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
  const root = gltf.scene;
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
  document.getElementById('loading').remove();
}).catch(err => {
  document.getElementById('loading').textContent =
    `не удалось загрузить сцену (${err.message}) — откройте через http-сервер, см. README`;
});

// ─── взрыв-схема: колесо и два пальца ───────────────────────────────────────
// ?explode=1 или #explode — открыть сразу разобранным
// #explode — разобранным, #explode=0.4 — на доле шкалы (этапы — по трети)
let tTarget = hash.has('explode') ? THREE.MathUtils.clamp(hash.get('explode') === '' ? 1 : +hash.get('explode') || 0, 0, 1)
  : THREE.MathUtils.clamp(+new URLSearchParams(location.search).get('explode') || 0, 0, 1);
let t = tTarget;
const hint = document.getElementById('hint');
function hideHint() { hint.style.opacity = 0; }

addEventListener('wheel', e => {
  e.preventDefault();
  tTarget = THREE.MathUtils.clamp(tTarget + e.deltaY * 0.0015, 0, 1);
  hideHint();
}, { passive: false });

let pinchY = null;
renderer.domElement.addEventListener('touchmove', e => {
  if (e.touches.length !== 2) { pinchY = null; return; }
  const y = (e.touches[0].clientY + e.touches[1].clientY) / 2;
  if (pinchY !== null) tTarget = THREE.MathUtils.clamp(tTarget + (pinchY - y) * 0.004, 0, 1);
  pinchY = y;
  hideHint();
}, { passive: true });
renderer.domElement.addEventListener('touchend', () => { pinchY = null; });

// ─── клик по макушке ────────────────────────────────────────────────────────
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let down = null;
let pressT = -1;           // время начала анимации нажатия, с

function hitTop(ev) {
  ndc.set(ev.clientX / innerWidth * 2 - 1, -(ev.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(parts.map(p => p.obj), false)[0];
  if (!hit) return false;
  const local = device.worldToLocal(hit.point.clone()).add(CENTER);   // в мм модели
  return local.y > TOP_Y;
}

renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;  // это было вращение
  down = null;
  if (!screen || !hitTop(e)) return;
  pressT = performance.now() / 1000;
  hideHint();
  bootClick();
});

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
    else { screen.rotate(); buzz(3200, 60); }
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
// Скролл ведёт t от 0 до 1, разборка идёт тремя этапами по трети шкалы:
//   1) выкручиваются шурупы;  2) расходятся панель и задняя часть (шурупы — за ней);
//   3) устройство делится на экран, плату и зуммер.
// Финальные сдвиги — из explode.json (те же, что у render_hero.py).
const smooth = x => x * x * (3 - 2 * x);
function stageTargets(ex) {
  const s1 = { screws: ex.screws - ex.back };                          // вышли из корпуса
  const s2 = { ...s1, front: ex.front, back: ex.back, screws: ex.screws };
  const s3 = { ...s2, display: ex.display, s2: ex.s2, buzzer: ex.buzzer };
  return [{}, s1, s2, s3];
}
let stages = null;
function explodeOffset(group, t) {
  stages ??= stageTargets(explode);
  let z = 0;
  for (let k = 1; k < stages.length; k++) {
    const local = smooth(THREE.MathUtils.clamp(t * 3 - (k - 1), 0, 1));
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

function frame() {
  const now = performance.now() / 1000;
  t += (tTarget - t) * 0.12;
  const e = smooth(t);                     // плавный старт и финиш
  for (const p of parts) p.obj.position.z = p.base + explodeOffset(p.group, t);
  // в разобранном виде середина смещается назад — держим её в центре кадра
  device.position.z = 19 * e;
  // нажатие: корпус наклоняется вперёд вокруг шарниров (только в собранном виде)
  press.rotation.x = pressAngle(now) * (1 - e);
  // отъезжаем камерой, чтобы разлёт помещался в кадр
  // на узком (вертикальном) экране — дальше, чтобы помещалось по ширине
  const dist = THREE.MathUtils.lerp(165, 300, e) * Math.max(1, 1 / camera.aspect) ** 0.9;
  camera.position.sub(controls.target).setLength(dist).add(controls.target);
  controls.update();
  if (screen) {
    screen.draw(performance.now());
    screenTex.needsUpdate = true;
  }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
frame();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
