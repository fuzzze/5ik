// Blin в three.js: вращение мышью/пальцем, клик по макушке — следующий экран
// (как кнопка-дно в настоящем корпусе), колесо/два пальца — взрыв-схема.
// Единицы — миллиметры, оси как в модели: X вправо, Y вверх, Z к зрителю.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const SCREENS = ['screens/screen_0.png', 'screens/screen_1.png', 'screens/screen_2.png',
                 'screens/screen_3.png', 'screens/screen_4.png'];
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
let screenMat = null;
const screenTex = [];      // по индексу экрана; догружаются в фоне
let screenIdx = 0;

// ImageBitmap — как текстуры внутри glTF: без переворота (UV в glTF идут сверху вниз)
const bmpLoader = new THREE.ImageBitmapLoader().setOptions({ imageOrientation: 'none' });
async function loadScreen(url, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const t = new THREE.Texture(await bmpLoader.loadAsync(url));
      t.flipY = false;
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      t.needsUpdate = true;
      return t;
    } catch (e) {
      if (i >= tries) throw e;
      await new Promise(r => setTimeout(r, 300 * i));
    }
  }
}

function showScreen(i) {
  screenIdx = i;
  screenMat.map = screenTex[i];
  screenMat.needsUpdate = true;
}

// Сначала — модель и первый экран (сцена сразу видна), остальные экраны — потом, по одному.
Promise.all([
  fetch('explode.json').then(r => r.json()),
  new GLTFLoader().loadAsync('blin.gltf.json'),
  loadScreen(SCREENS[0]),
]).then(([ex, gltf, first]) => {
  explode = ex;
  screenTex[0] = first;
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
      screenMat = new THREE.MeshBasicMaterial({ toneMapped: false });
      o.material = screenMat;
      o.receiveShadow = false;
      showScreen(0);
    }
  });
  document.getElementById('loading').remove();
  (async () => {
    for (let i = 1; i < SCREENS.length; i++) {
      try { screenTex[i] = await loadScreen(SCREENS[i]); } catch { /* экран просто пропустится */ }
    }
  })();
}).catch(err => {
  document.getElementById('loading').textContent =
    `не удалось загрузить сцену (${err.message}) — откройте через http-сервер, см. README`;
});

// ─── взрыв-схема: колесо и два пальца ───────────────────────────────────────
// ?explode=1 или #explode — открыть сразу разобранным
let tTarget = location.hash === '#explode' ? 1
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
  if (!screenMat || !hitTop(e)) return;
  let next = screenIdx;
  do next = (next + 1) % SCREENS.length; while (!screenTex[next] && next !== screenIdx);
  showScreen(next);
  pressT = performance.now() / 1000;
  hideHint();
});
renderer.domElement.addEventListener('pointermove', e => {
  if (e.buttons) return;
  renderer.domElement.style.cursor = screenMat && hitTop(e) ? 'pointer' : '';
});

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
  const e = t * t * (3 - 2 * t);           // плавный старт и финиш
  for (const p of parts) p.obj.position.z = p.base + (explode[p.group] || 0) * e;
  // в разобранном виде середина смещается назад — держим её в центре кадра
  device.position.z = 19 * e;
  // нажатие: корпус наклоняется вперёд вокруг шарниров (только в собранном виде)
  press.rotation.x = pressAngle(now) * (1 - e);
  // отъезжаем камерой, чтобы разлёт помещался в кадр
  const dist = THREE.MathUtils.lerp(165, 300, e);
  camera.position.sub(controls.target).setLength(dist).add(controls.target);
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
frame();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
