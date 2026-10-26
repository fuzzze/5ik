// Прошивка нового устройства из браузера по USB (Web Serial, esptool-js).
// Только наши сборки: список и файлы — flash/versions.json и flash/<версия>/
// на этом же сайте (выкладывает tools/publish_flash.py), своего файла выбрать нельзя.
// Пишется полный набор для чистой платы: загрузчик, таблица разделов, otadata,
// приложение — по адресам из versions.json.
import { SITE_TEXT, siteLang, LANG_NAMES } from './site.js';
import { nvsImage, findNvs, blinConfig, LANGS } from './nvs.js';

const $ = id => document.getElementById(id);
const T = k => (SITE_TEXT[siteLang()] || SITE_TEXT.en)[k];
const ESPRESSIF_VID = 0x303a;          // нативный USB ESP32-S2 (и в режиме загрузки)
const BAUD = 115200;                   // 460800/921600 на S2 Mini ненадёжны (CLAUDE.md)

let versions = [];
let busy = false;

function msg(text) { $('fl-msg').textContent = text; }
// p: число 0…1 — доля записанного, 'wait' — этап без процентов (загрузка, подключение, стирание)
function progress(p) {
  const box = $('fl-prog');
  box.classList.toggle('wait', p === 'wait');
  $('fl-bar').style.width = p === 'wait' ? '' : `${(p * 100).toFixed(1)}%`;
  $('fl-pct').textContent = p === 'wait' ? '' : `${Math.floor(p * 100)}%`;
}
// Пока идёт прошивка, трогать нечего: поля и флажки выключены, крестик и закрытие модалки
// (клик мимо, Esc — проверяют body.flashing) не работают, кнопка заменена полосой прогресса.
function setBusy(on) {
  busy = on;
  document.body.classList.toggle('flashing', on);
  $('fl-form').disabled = on;
  $('fl-x').disabled = on;
  $('fl-go').hidden = on;
  $('fl-prog').hidden = !on;
  if (on) { progress('wait'); $('fl-prog').scrollIntoView({ block: 'nearest' }); }
}
window.addEventListener('beforeunload', e => { if (busy) e.preventDefault(); });   // закрыть вкладку посреди записи — спросит

// ── преднастройка: поля AP-портала ──
function fillLangs() {
  const sel = $('fl-lang'), cur = sel.value || siteLang();
  sel.innerHTML = '';
  for (const c of LANGS) {
    const o = document.createElement('option');
    o.value = c; o.textContent = LANG_NAMES[c];
    sel.appendChild(o);
  }
  sel.value = LANGS.includes(cur) ? cur : 'en';
}
const bytes = v => new TextEncoder().encode(v).length;
// null — всё в порядке, иначе текст ошибки; поле с ошибкой подсвечивается
function presetError() {
  for (const id of ['fl-ssid', 'fl-pass', 'fl-host', 'fl-port', 'fl-mquser', 'fl-mqpass']) $(id).classList.remove('bad');
  const bad = (id, k) => { $(id).classList.add('bad'); $(id).focus(); return T(k); };
  const ssid = $('fl-ssid').value, pass = $('fl-pass').value, port = +$('fl-port').value;
  if (!ssid.trim()) return bad('fl-ssid', 'er_ssid');
  if (bytes(ssid) > 32) return bad('fl-ssid', 'er_long');
  if (pass && (pass.length < 8 || bytes(pass) > 63)) return bad('fl-pass', 'er_pass');
  if (!Number.isInteger(port) || port < 1 || port > 65535) return bad('fl-port', 'er_port');
  for (const id of ['fl-host', 'fl-mquser', 'fl-mqpass']) if (bytes($(id).value) > 63) return bad(id, 'er_long');
  return null;
}
function presetConfig() {
  return {
    ssid: $('fl-ssid').value, pass: $('fl-pass').value,
    host: $('fl-host').value.trim(), port: +$('fl-port').value,
    mqUser: $('fl-mquser').value, mqPass: $('fl-mqpass').value,
    rot: +$('fl-rot').value, lang: $('fl-lang').value, follow: $('fl-follow').checked,
  };
}
$('fl-pre').addEventListener('change', e => { $('fl-pre-box').hidden = !e.target.checked; });

async function loadVersions() {
  const sel = $('fl-ver');
  try {
    const r = await fetch('flash/versions.json', { cache: 'no-cache' });
    versions = (await r.json()).versions;
  } catch { versions = []; }
  sel.innerHTML = '';
  versions.forEach((v, i) => {
    const o = document.createElement('option');
    o.value = i;
    o.textContent = `${v.version} · ${v.date}` + (i === 0 ? ` · ${T('fl_latest')}` : '');
    sel.appendChild(o);
  });
  if (!versions.length) { msg(T('fl_nolist')); $('fl-go').disabled = true; }
}

async function fetchFiles(v) {
  return Promise.all(v.files.map(async f => {
    const r = await fetch(`flash/${v.version}/${f.name}`, { cache: 'no-cache' });
    if (!r.ok) throw new Error(`${f.name}: HTTP ${r.status}`);
    const data = new Uint8Array(await r.arrayBuffer());
    if (data.length !== f.size) throw new Error(`${f.name}: ${data.length} ≠ ${f.size}`);
    return { data, address: f.offset };
  }));
}

async function flash() {
  if (busy) return;
  const v = versions[+$('fl-ver').value];
  if (!v) return;
  const pre = $('fl-pre').checked;
  if (pre) { const err = presetError(); if (err) { msg(err); return; } }
  const cfg = pre ? presetConfig() : null;
  let port;
  try {
    port = await navigator.serial.requestPort({ filters: [{ usbVendorId: ESPRESSIF_VID }] });
  } catch { msg(T('st_noport')); return; }

  setBusy(true);
  let transport, ok = false;
  try {
    msg(T('st_load'));
    const fileArray = await fetchFiles(v);
    if (cfg) {
      // раздел NVS — из таблицы разделов этой же версии, а не константой
      const parts = fileArray[v.files.findIndex(f => f.name === 'partitions.bin')];
      const nvs = parts && findNvs(parts.data);
      if (!nvs) throw new Error('NVS partition not found');
      fileArray.push({ data: nvsImage(blinConfig(cfg), nvs.size), address: nvs.offset });
    }
    const { ESPLoader, Transport } = await import('./vendor/esptool-js/esptool.js');

    msg(T('st_conn'));
    transport = new Transport(port, false);
    const terminal = { clean() {}, writeLine: l => console.log('[esptool]', l), write: l => console.log('[esptool]', l) };
    const loader = new ESPLoader({ transport, baudrate: BAUD, romBaudrate: BAUD, terminal });
    // плата уже в режиме загрузки (0 + RST вручную): дёргать DTR/RTS не нужно
    const chip = await loader.main('no_reset');
    if (!/ESP32-S2/i.test(chip)) throw new Error(T('st_wrongchip').replace('{chip}', chip));

    const total = fileArray.reduce((s, f) => s + f.data.length, 0);
    const before = i => fileArray.slice(0, i).reduce((s, f) => s + f.data.length, 0);
    const erase = $('fl-erase').checked;
    msg(`${chip}. ` + T(erase ? 'st_erase' : 'st_write').replace('{p}', '0'));
    progress(erase ? 'wait' : 0);
    await loader.writeFlash({
      fileArray, flashMode: 'keep', flashFreq: 'keep', flashSize: 'keep',
      eraseAll: erase, compress: true,
      reportProgress: (i, written, size) => {
        const p = (before(i) + written / size * fileArray[i].data.length) / total;
        progress(p);
        msg(`${chip}. ` + T('st_write').replace('{p}', Math.floor(p * 100)));
      },
    });
    progress(1);
    // нативный USB S2: сброс сторожевым таймером; если не перезапустилась — RST вручную
    try { await loader.after('hard_reset', true); } catch (e) { console.warn(e); }
    ok = true;
  } catch (e) {
    console.error(e);
    msg(T('st_fail').replace('{e}', e?.message || e));
  } finally {
    try { await transport?.disconnect(); } catch { /* порт уже пропал после сброса */ }
    setBusy(false);
  }
  if (ok) msg(cfg ? T('st_done_pre').replace('{ssid}', cfg.ssid) : T('st_done'));
}

fillLangs();
if ('serial' in navigator) {
  loadVersions();
  $('fl-go').addEventListener('click', flash);
} else {
  // Web Serial есть только в Chrome/Edge/Opera на компьютере
  $('fl-go').disabled = true;
  $('fl-ver').disabled = true;
  $('fl-form').disabled = true;
  document.addEventListener('blin-lang', () => msg(T('fl_nosupport')));
  msg(T('fl_nosupport'));
  loadVersions().then(() => msg(T('fl_nosupport')));
}
// язык сменился — подписи версий («последняя») перерисовать
document.addEventListener('blin-lang', () => { if (!busy && versions.length) {
  const i = $('fl-ver').value; loadVersions().then(() => { $('fl-ver').value = i; }); } });
