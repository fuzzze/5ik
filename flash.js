// Прошивка нового устройства из браузера по USB (Web Serial, esptool-js).
// Только наши сборки: список и файлы — flash/versions.json и flash/<версия>/
// на этом же сайте (выкладывает tools/publish_flash.py), своего файла выбрать нельзя.
// Пишется полный набор для чистой платы: загрузчик, таблица разделов, otadata,
// приложение — по адресам из versions.json.
import { SITE_TEXT, siteLang } from './site.js';

const $ = id => document.getElementById(id);
const T = k => (SITE_TEXT[siteLang()] || SITE_TEXT.en)[k];
const ESPRESSIF_VID = 0x303a;          // нативный USB ESP32-S2 (и в режиме загрузки)
const BAUD = 115200;                   // 460800/921600 на S2 Mini ненадёжны (CLAUDE.md)

let versions = [];
let busy = false;

function msg(text) { $('fl-msg').textContent = text; }
function progress(p) {
  $('fl-prog').style.display = p === null ? 'none' : '';
  if (p !== null) $('fl-bar').style.width = `${(p * 100).toFixed(1)}%`;
}
function setBusy(on) {
  busy = on;
  document.body.classList.toggle('flashing', on);       // модалка не закрывается кликом мимо
  for (const id of ['fl-go', 'fl-ver', 'fl-erase', 'fl-x']) $(id).disabled = on;
}

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
  let port;
  try {
    port = await navigator.serial.requestPort({ filters: [{ usbVendorId: ESPRESSIF_VID }] });
  } catch { msg(T('st_noport')); return; }

  setBusy(true);
  progress(null);
  let transport;
  try {
    msg(T('st_load'));
    const fileArray = await fetchFiles(v);
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
    progress(0);
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
    msg(T('st_done'));
  } catch (e) {
    console.error(e);
    progress(null);
    msg(T('st_fail').replace('{e}', e?.message || e));
  } finally {
    try { await transport?.disconnect(); } catch { /* порт уже пропал после сброса */ }
    setBusy(false);
  }
}

if ('serial' in navigator) {
  loadVersions();
  $('fl-go').addEventListener('click', flash);
} else {
  // Web Serial есть только в Chrome/Edge/Opera на компьютере
  $('fl-go').disabled = true;
  $('fl-ver').disabled = true;
  $('fl-erase').disabled = true;
  document.addEventListener('blin-lang', () => msg(T('fl_nosupport')));
  msg(T('fl_nosupport'));
  loadVersions().then(() => msg(T('fl_nosupport')));
}
// язык сменился — подписи версий («последняя») перерисовать
document.addEventListener('blin-lang', () => { if (!busy && versions.length) {
  const i = $('fl-ver').value; loadVersions().then(() => { $('fl-ver').value = i; }); } });
