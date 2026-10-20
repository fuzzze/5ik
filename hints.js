// Подсказки поверх сцены: белый кружок с прозрачным плюсом, привязанный к точке
// модели. Наведение (или касание) — кружок чуть растёт, рядом плашка с текстом.
// Положение пересчитывается каждый кадр проекцией точки на экран.
import * as THREE from 'three';

export const HINT_TEXT = {
  ru: {
    top: '1 клик: смена экрана, 2 клика: включение оповещений, 3 клика: поворот экрана',
    temp: 'Текущая температура', min: 'Минимум за сутки', max: 'Максимум за сутки',
    icons: 'Статус: обогреватель или кулер, Wi-Fi, звуковые оповещения',
    chart: 'График температуры за 24 часа',
    front: 'Передняя панель', display: 'Круглый дисплей 1,28″, 240×240',
    s2: 'Плата ESP32-S2 Mini: Wi-Fi и MQTT', buzzer: 'Зуммер для звуковых оповещений',
    back: 'Задняя часть: всё дно — кнопка',
  },
  en: {
    top: '1 click: next screen, 2 clicks: alerts on/off, 3 clicks: rotate the screen',
    temp: 'Current temperature', min: '24-hour minimum', max: '24-hour maximum',
    icons: 'Status: heater or cooler, Wi-Fi, sound alerts',
    chart: 'Temperature over the last 24 hours',
    front: 'Front panel', display: 'Round 1.28″ display, 240×240',
    s2: 'ESP32-S2 Mini board: Wi-Fi and MQTT', buzzer: 'Buzzer for sound alerts',
    back: 'Back case: the whole bottom is a button',
  },
  de: {
    top: '1 Klick: nächster Bildschirm, 2 Klicks: Warnungen ein/aus, 3 Klicks: Bildschirm drehen',
    temp: 'Aktuelle Temperatur', min: 'Tagesminimum', max: 'Tagesmaximum',
    icons: 'Status: Heizung oder Lüfter, WLAN, Tonwarnungen',
    chart: 'Temperaturverlauf der letzten 24 Stunden',
    front: 'Frontblende', display: 'Rundes 1,28″-Display, 240×240',
    s2: 'ESP32-S2-Mini-Platine: WLAN und MQTT', buzzer: 'Summer für Tonwarnungen',
    back: 'Rückteil: der ganze Boden ist eine Taste',
  },
  fr: {
    top: '1 clic : écran suivant, 2 clics : alertes on/off, 3 clics : rotation de l’écran',
    temp: 'Température actuelle', min: 'Minimum sur 24 h', max: 'Maximum sur 24 h',
    icons: 'État : chauffage ou ventilateur, Wi-Fi, alertes sonores',
    chart: 'Température des dernières 24 heures',
    front: 'Façade', display: 'Écran rond 1,28″, 240×240',
    s2: 'Carte ESP32-S2 Mini : Wi-Fi et MQTT', buzzer: 'Buzzer des alertes sonores',
    back: 'Arrière : tout le fond est un bouton',
  },
  es: {
    top: '1 clic: siguiente pantalla, 2 clics: alertas sí/no, 3 clics: girar la pantalla',
    temp: 'Temperatura actual', min: 'Mínima de 24 h', max: 'Máxima de 24 h',
    icons: 'Estado: calefactor o ventilador, Wi-Fi, alertas sonoras',
    chart: 'Temperatura de las últimas 24 horas',
    front: 'Panel frontal', display: 'Pantalla redonda de 1,28″, 240×240',
    s2: 'Placa ESP32-S2 Mini: Wi-Fi y MQTT', buzzer: 'Zumbador de alertas sonoras',
    back: 'Parte trasera: todo el fondo es un botón',
  },
  pt: {
    top: '1 clique: próxima tela, 2 cliques: alertas lig./desl., 3 cliques: girar a tela',
    temp: 'Temperatura atual', min: 'Mínima em 24 h', max: 'Máxima em 24 h',
    icons: 'Estado: aquecedor ou ventilador, Wi-Fi, alertas sonoros',
    chart: 'Temperatura nas últimas 24 horas',
    front: 'Painel frontal', display: 'Tela redonda de 1,28″, 240×240',
    s2: 'Placa ESP32-S2 Mini: Wi-Fi e MQTT', buzzer: 'Buzzer dos alertas sonoros',
    back: 'Parte traseira: todo o fundo é um botão',
  },
};

// кружок с плюсом-«дыркой»: evenodd вырезает плюс из круга
const ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" fill-rule="evenodd" ' +
  'd="M12 1a11 11 0 1 1 0 22a11 11 0 1 1 0-22zM10.9 6.5h2.2v4.4h4.4v2.2h-4.4v4.4h-2.2v-4.4H6.5v-2.2h4.4z"/></svg>';

export class Hints {
  constructor(root) {
    this.root = root;
    this.items = new Map();   // id → { el, label, pos: () => Vector3 мира }
    this.v = new THREE.Vector3();
    root.addEventListener('pointerdown', e => e.stopPropagation());
  }

  // onPress — действие по клику на маркер вместо открытия плашки (маркер на макушке
  // стоит там, где нажимают кнопку: клик по нему — тот же клик по макушке)
  add(id, pos, onPress) {
    const el = document.createElement('div');
    el.className = 'hint';
    el.innerHTML = `<button aria-label="">${ICON}</button><span class="hint-label"></span>`;
    const btn = el.querySelector('button');
    btn.onclick = () => {         // касание на телефоне: открыть/закрыть
      if (onPress) { onPress(); el.classList.add('open'); return; }
      const open = !el.classList.contains('open');
      for (const it of this.items.values()) it.el.classList.remove('open');
      el.classList.toggle('open', open);
    };
    this.root.appendChild(el);
    this.items.set(id, { el, label: el.querySelector('.hint-label'), btn, pos });
  }

  setLang(lang) {
    const T = HINT_TEXT[lang] || HINT_TEXT.en;
    for (const [id, it] of this.items) {
      it.label.textContent = T[id];
      it.btn.setAttribute('aria-label', T[id]);
    }
  }

  // show: множество id, которые видны сейчас
  update(camera, show) {
    const W = innerWidth, H = innerHeight;
    for (const [id, it] of this.items) {
      const on = show.has(id);
      it.el.classList.toggle('on', on);
      if (!on) { it.el.classList.remove('open'); continue; }
      const p = this.v.copy(it.pos()).project(camera);
      const x = (p.x + 1) / 2 * W, y = (1 - p.y) / 2 * H;
      it.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      // плашка — над кружком по центру, но не заходит за края окна (отступ 16)
      const half = it.label.offsetWidth / 2, m = 16;
      const dx = Math.max(0, m + half - x) - Math.max(0, x + half - (W - m));
      it.label.style.setProperty('--dx', `${dx.toFixed(1)}px`);
    }
  }
}
