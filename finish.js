// Поверхность корпуса: по умолчанию — шагрень, равномерно шершавый пластик после обработки
// (fuzzy skin, пескоструй, структурная краска); #finish=print — полоски слоёв FDM
// (текстура case.png, как есть). Шагрень процедурная, в шейдере: 3D-шум в координатах
// детали (мм) возмущает нормаль. UV корпуса для этого не годятся — они под полоски
// ((x+y)/40, z/3.2), на лице 2D-шум вытянулся бы в штрихи.
import * as THREE from 'three';

const CASE_RGB = [50, 52, 56];   // как render_hero.CASE_RGB
const GRAIN = 0.12;              // мм — размер «зерна» мелкой октавы, крупная — ×2.6
const SLOPE = 0.16;              // сила наклона микрорельефа: больше — уже штукатурка, а не шагрень
const ROUGH = 0.72;              // матовый, но с лёгким отливом — иначе рельеф не читается

const GLSL = /* glsl */`
varying vec3 vObj;
varying vec3 vAx; varying vec3 vAy; varying vec3 vAz;
float sgHash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
// value noise с аналитическим градиентом (И. Квилес): xyz — градиент, w — значение
vec4 sgNoise(vec3 x) {
  vec3 i = floor(x), w = fract(x);
  vec3 u = w * w * w * (w * (w * 6.0 - 15.0) + 10.0);
  vec3 du = 30.0 * w * w * (w * (w - 2.0) + 1.0);
  float a = sgHash(i), b = sgHash(i + vec3(1, 0, 0)), c = sgHash(i + vec3(0, 1, 0)), d = sgHash(i + vec3(1, 1, 0));
  float e = sgHash(i + vec3(0, 0, 1)), f = sgHash(i + vec3(1, 0, 1)), g = sgHash(i + vec3(0, 1, 1)), h = sgHash(i + vec3(1, 1, 1));
  float k1 = b - a, k2 = c - a, k3 = e - a, k4 = a - b - c + d, k5 = a - c - e + g, k6 = a - b - e + f, k7 = -a + b + c - d + e - f - g + h;
  return vec4(du * vec3(k1 + k4 * u.y + k6 * u.z + k7 * u.y * u.z,
                        k2 + k5 * u.z + k4 * u.x + k7 * u.z * u.x,
                        k3 + k6 * u.x + k5 * u.y + k7 * u.x * u.y),
              a + k1 * u.x + k2 * u.y + k3 * u.z + k4 * u.x * u.y + k5 * u.y * u.z + k6 * u.z * u.x + k7 * u.x * u.y * u.z);
}
`;

function shagreen(m) {
  m.map = null;
  m.color.setRGB(...CASE_RGB.map(c => c / 255), THREE.SRGBColorSpace);
  m.roughness = ROUGH;
  m.metalness = 0;
  m.onBeforeCompile = sh => {
    sh.vertexShader = 'varying vec3 vObj;\nvarying vec3 vAx; varying vec3 vAy; varying vec3 vAz;\n' + sh.vertexShader
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vObj = position;
        vAx = normalMatrix * vec3(1, 0, 0); vAy = normalMatrix * vec3(0, 1, 0); vAz = normalMatrix * vec3(0, 0, 1);`);
    sh.fragmentShader = GLSL + sh.fragmentShader
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          // размер пикселя в мм: октаву, которая мельче ~1.5 пикселя, гасим — иначе рябь
          float px = length(fwidth(vObj));
          vec4 n1 = sgNoise(vObj / ${GRAIN.toFixed(3)});
          vec4 n2 = sgNoise(vObj / ${(GRAIN * 2.6).toFixed(3)} + 17.0);
          float f1 = 1.0 - smoothstep(0.35, 0.8, px / ${GRAIN.toFixed(3)});
          float f2 = 1.0 - smoothstep(0.35, 0.8, px / ${(GRAIN * 2.6).toFixed(3)});
          vec3 g = n1.xyz * f1 + 0.35 * n2.xyz * f2;
          vec3 gv = g.x * vAx + g.y * vAy + g.z * vAz;
          normal = normalize(normal - ${SLOPE.toFixed(3)} * (gv - dot(gv, normal) * normal));
        }`);
  };
  m.customProgramCacheKey = () => 'shagreen';
  m.needsUpdate = true;
}

export function applyFinish(root, mode) {
  if (mode === 'print') return;
  root.traverse(o => { if (o.isMesh && o.material?.name === 'tex=case.png') shagreen(o.material); });
}
