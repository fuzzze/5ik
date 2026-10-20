// Живой экран Blin для демки: рисуется на canvas и уходит в three.js текстурой.
// Геометрия, цвета, звёзды и 80s-глитчи повторяют src/main.cpp — правишь отрисовку
// экрана в прошивке, правь и здесь (и в brag-output/work/blin_screen.py, fx.py).
// Координаты — в пикселях устройства (240×240), рисуется в SS раз крупнее.

const SS = 2;
const W = 240;
const ARC_START = 168, ARC_SPAN = 204;   // lv_arc_set_bg_angles(168, 12)
const ARC_R = 112, ARC_W = 12;
const GRAY = '#616161';
// Темп — вдвое медленнее таймеров прошивки (40 и 33 мс): так выглядит на живом
// устройстве (реальная частота кадров панели ниже номинала таймеров).
const STAR_COUNT = 40, STAR_TICK = 80;   // star_timer_cb
const FX_ENV = [0, 0.4, 0.9, 1.5, 0.9, 0.4], FX_FRAME = 66;   // FX_ANIM_ENV, кадр fx_anim_cb
const FONT = 'BlinMontserrat';
// Хулиганский режим (hooligan_timer_cb): каомодзи вместо числа, кадр 400 мс.
// На устройстве — раз в 20–40 мин, в демке — раз в минуту.
const KAOMOJI = ['O_o', 'o_O', 'O_o', 'O_o', '>_<'], KAO_FRAME = 400, HOOLIGAN_EVERY = 60000;

// Названия экранов на устройстве задаёт пользователь, прошивка их не переводит —
// для демки у каждого экрана свой ключ и переводы на 6 языков, как у админки.
export const LANGS = ['ru', 'en', 'de', 'fr', 'es', 'pt'];
const LABELS = {
  cacti:   { ru: 'Кактусы',  en: 'Cacti',      de: 'Kakteen',        fr: 'Cactus',         es: 'Cactus',         pt: 'Cactos' },
  outside: { ru: 'На улице', en: 'Outside',    de: 'Draußen',        fr: 'Dehors',         es: 'Exterior',       pt: 'Lá fora' },
  garden:  { ru: 'Садовая',  en: 'Garden',     de: 'Garten',         fr: 'Jardin',         es: 'Jardín',         pt: 'Jardim' },
  home:    { ru: 'Дом',      en: 'Home',       de: 'Zuhause',        fr: 'Maison',         es: 'Casa',           pt: 'Casa' },
  small:   { ru: 'Малая',    en: 'Small room', de: 'Kleines Zimmer', fr: 'Petite chambre', es: 'Cuarto pequeño', pt: 'Quarto pequeno' },
};

// детерминированный ГСЧ: одинаковые глитчи при одинаковом seed
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export class BlinScreen {
  constructor(data, iconsImg) {
    this.d = data;
    this.c = data.colors;
    this.icons = iconsImg;
    // buf — кадр в координатах LVGL (с эффектами), canvas — что видно на панели
    // после tft.setRotation (поворот тройным кликом)
    this.buf = document.createElement('canvas');
    this.buf.width = this.buf.height = W * SS;
    this.ctx = this.buf.getContext('2d', { willReadFrequently: true });
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = W * SS;
    this.out = this.canvas.getContext('2d');
    this.rot = 0;            // g_rotation: 0..3, по 90° по часовой
    this.muted = false;      // g_snd_muted
    this.hoolStart = -1e9;   // начало хулиганского режима
    this.hoolNext = null;    // когда следующий
    this.idx = data.main;
    this.lang = 'ru';
    this.fxStart = -1e9;
    this.swingStart = -1e9;
    this.fxSeed = 1;
    const r = rng(7);
    this.placeholder = Array.from({ length: 24 }, () => Math.floor(r() * 256));
    this.stars = Array.from({ length: STAR_COUNT }, () => this.spawn({}, true, r));
    this.starT = 0;
  }

  // star_spawn()
  spawn(s, randomDist, r = Math.random) {
    s.angle = r() * 2 * Math.PI;
    s.dist = randomDist ? 1 + Math.floor(r() * 115) : 2;
    s.speed = 0.8 + Math.floor(r() * 14) * 0.15;
    s.bright = 80 + Math.floor(r() * 100);
    return s;
  }

  get count() { return this.d.screens.length; }

  // fx_apply_all(): глитч с новым случайным рисунком
  glitch(now) {
    this.fxStart = now;
    this.fxSeed = (this.fxSeed * 7919 + 13) >>> 0;
  }

  // ui_goto_screen(): новый экран + глитч + качание нижней панели
  goto(i, now) {
    this.idx = i % this.count;
    this.swingStart = now;
    this.glitch(now);
  }

  // двойной клик: g_snd_muted = !g_snd_muted → колокольчик серый/белый
  toggleMute() { this.muted = !this.muted; return this.muted; }

  // тройной клик: g_rotation = (g_rotation + 1) & 3
  rotate() { this.rot = (this.rot + 1) & 3; }

  // каомодзи текущего кадра хулиганского режима или null; старт и финиш — с глитчем
  kaomoji(now) {
    if (this.hoolNext === null) this.hoolNext = now + HOOLIGAN_EVERY;
    if (now >= this.hoolNext && now - this.hoolStart >= KAOMOJI.length * KAO_FRAME) {
      this.hoolStart = now;
      this.hoolDone = false;
      this.hoolNext = now + HOOLIGAN_EVERY;
      this.glitch(now);
    }
    const k = Math.floor((now - this.hoolStart) / KAO_FRAME);
    if (k < KAOMOJI.length) return KAOMOJI[k];
    if (!this.hoolDone) { this.hoolDone = true; if (this.hoolStart > 0) this.glitch(now); }
    return null;
  }

  zone(s, t) {
    if (t < s.t_lo) return this.c.cold;
    if (t <= s.t_hi) return this.c.normal;
    return this.c.hot;
  }

  // ─── кадр ──────────────────────────────────────────────────────────────────
  draw(now) {
    const g = this.ctx;
    const s = this.d.screens[this.idx];
    g.setTransform(SS, 0, 0, SS, 0, 0);
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, W);
    this.drawStars(g, now);
    this.drawArc(g, s);
    this.drawIcons(g, s);
    this.drawText(g, s, now);
    this.drawChart(g, s);
    this.drawDots(g);
    this.drawPanel(g, now);
    this.drawFx(now);
    // tft.setRotation: панель выводит тот же кадр, повёрнутый на rot × 90° по часовой
    const o = this.out, N = W * SS;
    o.setTransform(1, 0, 0, 1, 0, 0);
    o.translate(N / 2, N / 2);
    o.rotate(this.rot * Math.PI / 2);
    o.drawImage(this.buf, -N / 2, -N / 2);
  }

  drawStars(g, now) {
    if (!this.d.fx.star_en) return;
    // star_timer_cb двигает звёзды тиками по 40 мс
    while (now - this.starT >= STAR_TICK) {
      this.starT = this.starT ? this.starT + STAR_TICK : now;
      for (const st of this.stars) {
        st.dist += st.speed;
        if (st.dist > 132) this.spawn(st, false);
      }
    }
    g.fillStyle = this.c.fg;
    for (const st of this.stars) {
      const sx = 120 + Math.trunc(Math.cos(st.angle) * st.dist);
      const sy = 120 + Math.trunc(Math.sin(st.angle) * st.dist);
      const sz = st.dist < 40 ? 1 : st.dist < 90 ? 2 : 3;
      g.globalAlpha = Math.max(15, Math.min(255, Math.trunc(st.bright * st.dist / 120))) / 255;
      g.fillRect(sx - (sz >> 1), sy - (sz >> 1), sz, sz);
    }
    g.globalAlpha = 1;
  }

  drawArc(g, s) {
    const rad = d => d * Math.PI / 180;
    g.lineWidth = ARC_W;
    g.lineCap = 'butt';
    g.strokeStyle = 'rgba(97,97,97,0.5)';   // COL_GRAY, LV_OPA_50
    g.beginPath();
    g.arc(120, 120, ARC_R, rad(ARC_START), rad(ARC_START + ARC_SPAN));
    g.stroke();

    const col = s.stale ? this.c.warn : this.zone(s, s.temp);
    const v = Math.trunc(Math.min(Math.max(s.temp, s.arc_min), s.arc_max));   // lv_arc_set_value(int)
    const a = rad(ARC_START + (v - s.arc_min) / (s.arc_max - s.arc_min) * ARC_SPAN);
    if (v > s.arc_min) {
      g.strokeStyle = col;
      g.beginPath();
      g.arc(120, 120, ARC_R, rad(ARC_START), a);
      g.stroke();
    }
    // knob: круг под толщину дуги + тень 48 px со spread 8 — «свечение» конца дуги
    const kx = 120 + ARC_R * Math.cos(a), ky = 120 + ARC_R * Math.sin(a);
    g.save();
    g.shadowColor = col;
    g.shadowBlur = 24 * SS;
    g.shadowOffsetX = 1000 * SS;            // рисуем только тень: сама фигура — за кадром
    g.fillStyle = col;
    g.beginPath();
    g.arc(kx - 1000, ky, ARC_W / 2 + 8, 0, 2 * Math.PI);
    g.fill();
    g.restore();
    g.fillStyle = col;
    g.beginPath();
    g.arc(kx, ky, ARC_W / 2, 0, 2 * Math.PI);
    g.fill();

    // кружки звуковых порогов: 14×14, белые, чёрная рамка 3
    for (const thr of [s.snd_lo, s.snd_hi]) {
      if (thr == null || thr < s.arc_min || thr > s.arc_max) continue;
      const t = (thr - s.arc_min) / (s.arc_max - s.arc_min);
      const b = rad(ARC_START + t * ARC_SPAN);
      const x = 120 + Math.round(ARC_R * Math.cos(b)), y = 120 + Math.round(ARC_R * Math.sin(b));
      g.fillStyle = this.c.bg;
      g.beginPath(); g.arc(x, y, 7, 0, 2 * Math.PI); g.fill();
      g.fillStyle = this.c.fg;
      g.beginPath(); g.arc(x, y, 4, 0, 2 * Math.PI); g.fill();
    }
  }

  icon(g, i, x, y, color) {
    // маска из icons.png, перекрашенная — как img_recolor в LVGL
    const t = this.tint || (this.tint = document.createElement('canvas'));
    t.width = t.height = 20;
    const c = t.getContext('2d');
    c.globalCompositeOperation = 'copy';
    c.drawImage(this.icons, 20 * i, 0, 20, 20, 0, 0, 20, 20);
    c.globalCompositeOperation = 'source-in';
    c.fillStyle = color;
    c.fillRect(0, 0, 20, 20);
    g.drawImage(t, x, y);
  }

  drawIcons(g, s) {
    // ui_update_bell(): белый, если звук не выключен и хоть у одного экрана есть порог
    const bell = !this.muted && this.d.screens.some(x => x.snd_lo != null || x.snd_hi != null) ? this.c.fg : GRAY;
    const extra = s.extra && s.extra !== 'none' ? s.extra : null;
    if (extra) {   // ui_update_icons_layout(): 3 иконки с x=78 или 2 с x=94
      this.icon(g, extra.startsWith('cooler') ? 2 : 3, 78, 41, extra.endsWith('_on') ? this.c.fg : GRAY);
      this.icon(g, 0, 110, 41, this.c.fg);
      this.icon(g, 1, 142, 41, bell);
    } else {
      this.icon(g, 0, 94, 41, this.c.fg);
      this.icon(g, 1, 126, 41, bell);
    }
  }

  // Текст: метрики шрифтов LVGL (lv_font_conv) — базовая линия = верх строки + 0.95·размер
  text(g, str, px, x, top, align, color) {
    g.font = `${px}px ${FONT}`;
    g.textAlign = align;
    g.textBaseline = 'alphabetic';
    g.fillStyle = color;
    g.fillText(str, x, top + Math.round(px * 0.95));
  }

  drawText(g, s, now) {
    const vals = s.hist.filter((h, k) => h != null && !((s.gap >> k) & 1)).concat([s.temp]);
    const f1 = v => v.toFixed(1);
    // главное число: LV_ALIGN_CENTER, 0, -15 → середина строки на y=105
    this.text(g, this.kaomoji(now) ?? f1(s.temp), 64, 120, 105 - 39, 'center', this.c.fg);
    this.text(g, f1(Math.min(...vals)), 16, 16, 152, 'left', GRAY);
    this.text(g, f1(Math.max(...vals)), 16, 224, 152, 'right', GRAY);
    const label = LABELS[s.label]?.[this.lang] ?? s.label;
    this.text(g, label, 16, 120, 176, 'center', s.stale ? this.c.warn : this.c.fg);
  }

  drawChart(g, s) {
    // chart_redraw(): 24 столбика 3×(1..20), шаг 4, от (72,147); высота — от максимума
    let mx = 0;
    for (const h of s.hist) if (h != null && h > mx) mx = h;
    s.hist.forEach((h, i) => {
      let hp, col;
      if (h == null) {
        hp = this.placeholder[i] % 19 + 1;
        col = '#484848';
      } else {
        hp = mx > 0 ? Math.round(h / mx * 20) : 1;
        hp = Math.min(20, Math.max(1, hp));
        col = (s.gap >> i) & 1 ? GRAY : this.zone(s, h);
      }
      g.fillStyle = col;
      g.beginPath();
      g.roundRect(72 + i * 4, 147 + 20 - hp, 3, hp, Math.min(1, hp / 2));
      g.fill();
    });
  }

  drawDots(g) {
    const n = this.count, total = n * 6 + (n - 1) * 4, x0 = 120 - Math.trunc(total / 2);
    this.d.screens.forEach((s, i) => {
      g.fillStyle = i === this.idx ? this.c.fg : s.stale ? this.c.warn : GRAY;
      g.beginPath();
      g.arc(x0 + i * 10 + 3, 204, 3, 0, 2 * Math.PI);
      g.fill();
    });
  }

  drawPanel(g, now) {
    // update_second_param(): цвет — зона ГЛАВНОГО экрана; на главном — часы,
    // на остальных — его температура. Качание — panel_swing_cb (5 с затухания).
    const m = this.d.screens[this.d.main];
    const col = this.zone(m, m.temp);
    const ts = (now - this.swingStart) / 1000;
    const deg = ts < 5 ? 5 * Math.exp(-ts / 1.4) * Math.sin(2 * Math.PI * ts / 0.8) : 0;
    g.save();
    g.translate(120, 214);
    g.rotate(Math.round(deg * 10) / 10 * Math.PI / 180);
    g.fillStyle = col;
    g.fillRect(-76, 0, 152, 26);
    g.restore();

    if (this.idx !== this.d.main) {
      this.text(g, m.temp.toFixed(1), 16, 120, 226 - 10, 'center', this.c.bg);
      return;
    }
    // часы посетителя; двоеточие мигает раз в 500 мс перекраской в цвет панели
    const d = new Date();
    const [hh, mm] = this.clock ?? [d.getHours(), d.getMinutes()].map(v => String(v).padStart(2, '0'));
    const colon = Math.floor(now / 500) % 2 === 0 ? this.c.bg : col;
    g.font = `16px ${FONT}`;
    const wh = g.measureText(hh).width, wc = g.measureText(':').width, wm = g.measureText(mm).width;
    let x = 120 - (wh + wc + wm) / 2;
    this.text(g, hh, 16, x, 216, 'left', this.c.bg); x += wh;
    this.text(g, ':', 16, x, 216, 'left', colon); x += wc;
    this.text(g, mm, 16, x, 216, 'left', this.c.bg);
  }

  // ─── 80s-глитч: 5 кадров по 33 мс, огибающая FX_ANIM_ENV ───────────────────
  drawFx(now) {
    const k = Math.floor((now - this.fxStart) / FX_FRAME) + 1;
    if (k < 1 || k > 5) return;
    const fx = this.d.fx, env = FX_ENV[k];
    const scale = (v, hi) => Math.min(hi, Math.max(1, Math.round(v * env)));
    const r = rng(this.fxSeed * 31 + k);
    const N = W * SS;
    const img = this.ctx.getImageData(0, 0, N, N);
    const src = new Uint8ClampedArray(img.data);   // g_fb: кадр до эффектов
    const p = img.data;
    const put = (x, y, rr, gg, bb) => {
      for (let dy = 0; dy < SS; dy++) for (let dx = 0; dx < SS; dx++) {
        const o = ((y * SS + dy) * N + x * SS + dx) * 4;
        p[o] = rr; p[o + 1] = gg; p[o + 2] = bb;
      }
    };
    if (fx.chr_en) {   // fx_chroma_shift: R слева, B справа
      const sh = scale(fx.chr_sh, 6) * SS;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const o = (y * N + x) * 4;
        p[o] = src[(y * N + Math.max(0, x - sh)) * 4];
        p[o + 2] = src[(y * N + Math.min(N - 1, x + sh)) * 4 + 2];
      }
    }
    if (fx.tr_en) {    // fx_tear: строки из g_fb со сдвигом
      const rows = scale(fx.tr_rows, 24), mx = fx.tr_shft;
      for (let i = 0; i < rows; i++) {
        const y = Math.floor(r() * W);
        let sh = Math.floor(r() * (2 * mx + 1)) - mx || 1;
        for (let dy = 0; dy < SS; dy++) {
          const row = (y * SS + dy) * N;
          for (let x = 0; x < N; x++) {
            const sx = Math.min(N - 1, Math.max(0, x - sh * SS));
            for (let c = 0; c < 3; c++) p[(row + x) * 4 + c] = src[(row + sx) * 4 + c];
          }
        }
      }
    }
    if (fx.snw_en) {   // fx_snow: белые, чёрные и случайные RGB565-пиксели
      const n = Math.max(1, Math.round(fx.snw_n * env));
      for (let i = 0; i < n; i++) {
        const x = Math.floor(r() * W), y = Math.floor(r() * W), kind = r() * 256;
        if (kind < 64) put(x, y, 255, 255, 255);
        else if (kind < 128) put(x, y, 0, 0, 0);
        else {
          const c = Math.floor(r() * 65536);
          put(x, y, (c >> 11) << 3, ((c >> 5) & 63) << 2, (c & 31) << 3);
        }
      }
    }
    this.ctx.putImageData(img, 0, 0);
  }
}

export async function loadFont(url) {
  // шрифт — уже скачанными байтами: FontFace по url в headless-Chrome не грузится
  const f = new FontFace(FONT, await (await fetch(url)).arrayBuffer());
  document.fonts.add(await f.load());
}
