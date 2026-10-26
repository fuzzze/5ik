// Образ раздела NVS (формат ESP-IDF, версия 2) — преднастройка устройства при прошивке
// из браузера. Прошивка читает те же ключи, что пишет AP-портал (`prefs_save_common`,
// `handle_save` в main.cpp), через Preferences: тип записи должен совпадать с тем, каким
// `prefs.get*` его читает, иначе прошивка молча возьмёт значение по умолчанию.
// Сверка с эталоном — esp-idf-nvs-partition-gen (команда — demo/README.md, «Прошивка из браузера»).

const PAGE = 4096;
const ENTRY = 32;
const ENTRIES_PER_PAGE = 126;
const T = { u8: 0x01, i32: 0x14, str: 0x21 };

// zlib.crc32(data, 0xFFFFFFFF) — так считает NVS (esp_rom_crc32_le с 0xFFFFFFFF)
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(bytes) {
  let c = 0;                                     // ~0xFFFFFFFF
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xFF] ^ (c >>> 8);
  return ~c >>> 0;
}

const enc = new TextEncoder();

// items: [{ ns, key, type: 'u8'|'i32'|'str', value }], size — размер раздела (кратен 4096)
export function nvsImage(items, size) {
  const img = new Uint8Array(size).fill(0xFF);
  const nsIndex = new Map();
  const entries = [];                            // каждая — массив 32-байтных записей (span)

  const entry = (ns, type, key, span) => {
    const e = new Uint8Array(ENTRY).fill(0xFF);
    e[0] = ns; e[1] = type; e[2] = span; e[3] = 0xFF;
    const k = enc.encode(key);
    if (k.length > 15) throw new Error(`NVS key too long: ${key}`);
    e.fill(0, 8, 24); e.set(k, 8);
    return e;
  };
  const seal = e => {
    const v = new DataView(e.buffer);
    v.setUint32(4, crc32([...e.subarray(0, 4), ...e.subarray(8, 32)]), true);
    return e;
  };

  for (const it of items) {
    if (!nsIndex.has(it.ns)) {
      const idx = nsIndex.size + 1;
      nsIndex.set(it.ns, idx);
      const e = entry(0, T.u8, it.ns, 1);
      e[24] = idx;
      entries.push([seal(e)]);
    }
    const ns = nsIndex.get(it.ns);
    if (it.type === 'str') {
      const data = new Uint8Array([...enc.encode(it.value), 0]);
      const extra = Math.ceil(data.length / ENTRY);
      const e = entry(ns, T.str, it.key, 1 + extra);
      const v = new DataView(e.buffer);
      v.setUint16(24, data.length, true);
      v.setUint16(26, 0xFFFF, true);
      v.setUint32(28, crc32(data), true);
      const span = [seal(e)];
      for (let i = 0; i < extra; i++) {
        const d = new Uint8Array(ENTRY).fill(0xFF);
        d.set(data.subarray(i * ENTRY, (i + 1) * ENTRY));
        span.push(d);
      }
      entries.push(span);
    } else {
      const e = entry(ns, T[it.type], it.key, 1);
      const v = new DataView(e.buffer);
      if (it.type === 'u8') e[24] = it.value & 0xFF;
      else v.setInt32(24, it.value | 0, true);
      entries.push([seal(e)]);
    }
  }

  // раскладка по страницам: запись (со всеми частями строки) не переходит через границу
  let page = 0, slot = 0;
  const pages = [[]];
  for (const span of entries) {
    if (span.length > ENTRIES_PER_PAGE) throw new Error('NVS value too long');
    if (slot + span.length > ENTRIES_PER_PAGE) { page++; slot = 0; pages.push([]); }
    pages[page].push(...span);
    slot += span.length;
  }
  if (pages.length >= size / PAGE) throw new Error('NVS image does not fit');   // одна страница должна остаться свободной

  pages.forEach((list, p) => {
    const base = p * PAGE;
    const v = new DataView(img.buffer, base, PAGE);
    const last = p === pages.length - 1;
    v.setUint32(0, last ? 0xFFFFFFFE : 0xFFFFFFFC, true);   // ACTIVE / FULL
    v.setUint32(4, p, true);                                // порядковый номер страницы
    img[base + 8] = 0xFE;                                   // версия формата 2
    v.setUint32(28, crc32(img.subarray(base + 4, base + 28)), true);
    list.forEach((e, i) => {
      img.set(e, base + 64 + i * ENTRY);
      img[base + 32 + (i >> 2)] &= ~(1 << ((i & 3) * 2));   // состояние записи: 0b11 → 0b10 (записана)
    });
  });
  return img;
}

// Раздел NVS из таблицы разделов (partitions.bin, записи по 32 байта, magic 0x50AA)
export function findNvs(partitions) {
  const v = new DataView(partitions.buffer, partitions.byteOffset, partitions.byteLength);
  for (let o = 0; o + 32 <= partitions.length; o += 32) {
    if (v.getUint16(o, true) !== 0x50AA) break;
    if (partitions[o + 2] === 0x01 && partitions[o + 3] === 0x02)
      return { offset: v.getUint32(o + 4, true), size: v.getUint32(o + 8, true) };
  }
  return null;
}

// Поля AP-портала → ключи NVS (namespace "cfg"). Типы — как их читает prefs_load():
// строки — getString, port/rot — getInt, lang/sync_* — getUChar, show_ip — getBool (u8).
export const LANGS = ['en', 'ru', 'de', 'fr', 'es', 'pt'];   // порядок I18N_CODES в i18n.h
export function blinConfig(c) {
  const s = (key, value) => ({ ns: 'cfg', key, type: 'str', value });
  const items = [
    s('ssid', c.ssid), s('pass', c.pass), s('host', c.host),
    { ns: 'cfg', key: 'port', type: 'i32', value: c.port },
    s('mq_user', c.mqUser), s('mq_pass', c.mqPass),
    { ns: 'cfg', key: 'rot', type: 'i32', value: c.rot },
    { ns: 'cfg', key: 'lang', type: 'u8', value: Math.max(0, LANGS.indexOf(c.lang)) },
    { ns: 'cfg', key: 'show_ip', type: 'u8', value: 1 },   // как после сохранения в портале: IP на экране один раз
  ];
  if (c.follow) items.push({ ns: 'cfg', key: 'sync_follow', type: 'u8', value: 1 });
  return items;
}
