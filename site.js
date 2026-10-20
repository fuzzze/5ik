// Обвязка страницы вокруг 3D-сцены: тексты кнопок и модалок на 6 языках,
// версия прошивки из ota/manifest.json (тот же, что читают устройства).
export const SITE_TEXT = {
  ru: {
    fw: 'Скачать прошивку', models: 'Модели корпуса', docs: 'Документация',
    fw_ver: 'Последняя версия:', fw_dl: 'Скачать firmware.bin',
    fw_note: 'Установка: админка устройства → «Обновление прошивки» → «Загрузить файл прошивки .bin». С включённым автообновлением устройство поставит её само.',
    models_note: 'STL уже в положении для печати, поддержки не нужны. Заднюю часть лучше печатать из PETG: шарниры кнопки-дна гнутся, PETG переносит это лучше PLA.',
    models_screws: 'Крепёж: 2 самореза ST2.2×8 с потайной головкой.',
    m_front: 'Передняя панель · STL', m_back: 'Задняя часть с кнопкой · STL', m_step: 'Сборка с электроникой · STEP',
    loading: 'загрузка…',
  },
  en: {
    fw: 'Download firmware', models: 'Enclosure models', docs: 'Documentation',
    fw_ver: 'Latest version:', fw_dl: 'Download firmware.bin',
    fw_note: 'To install: device admin → “Firmware update” → “Upload firmware file .bin”. With auto-update on, the device installs it by itself.',
    models_note: 'The STLs are already oriented for printing, no supports needed. Print the back in PETG: the hinges of the bottom button flex, and PETG handles that better than PLA.',
    models_screws: 'Hardware: 2 × ST2.2×8 countersunk self-tapping screws.',
    m_front: 'Front panel · STL', m_back: 'Back case with button · STL', m_step: 'Assembly with electronics · STEP',
    loading: 'loading…',
  },
  de: {
    fw: 'Firmware herunterladen', models: 'Gehäusemodelle', docs: 'Dokumentation',
    fw_ver: 'Neueste Version:', fw_dl: 'firmware.bin herunterladen',
    fw_note: 'Installation: Geräte-Admin → „Firmware-Update“ → „Firmware-Datei .bin hochladen“. Mit Auto-Update installiert das Gerät sie selbst.',
    models_note: 'Die STL-Dateien sind schon druckfertig ausgerichtet, keine Stützen nötig. Das Rückteil am besten aus PETG drucken: die Scharniere der Bodentaste biegen sich, PETG verträgt das besser als PLA.',
    models_screws: 'Befestigung: 2 Senkkopf-Blechschrauben ST2,2×8.',
    m_front: 'Frontblende · STL', m_back: 'Rückteil mit Taste · STL', m_step: 'Baugruppe mit Elektronik · STEP',
    loading: 'wird geladen…',
  },
  fr: {
    fw: 'Télécharger le firmware', models: 'Modèles du boîtier', docs: 'Documentation',
    fw_ver: 'Dernière version :', fw_dl: 'Télécharger firmware.bin',
    fw_note: 'Installation : admin de l’appareil → « Mise à jour du firmware » → « Envoyer le fichier .bin ». Avec la mise à jour auto, l’appareil l’installe tout seul.',
    models_note: 'Les STL sont déjà orientés pour l’impression, sans supports. Imprimez l’arrière en PETG : les charnières du bouton du fond fléchissent, le PETG le supporte mieux que le PLA.',
    models_screws: 'Visserie : 2 vis autotaraudeuses ST2,2×8 à tête fraisée.',
    m_front: 'Façade · STL', m_back: 'Arrière avec bouton · STL', m_step: 'Assemblage avec électronique · STEP',
    loading: 'chargement…',
  },
  es: {
    fw: 'Descargar firmware', models: 'Modelos de la carcasa', docs: 'Documentación',
    fw_ver: 'Última versión:', fw_dl: 'Descargar firmware.bin',
    fw_note: 'Instalación: admin del dispositivo → «Actualización del firmware» → «Subir archivo .bin». Con la actualización automática, el dispositivo la instala solo.',
    models_note: 'Los STL ya están orientados para imprimir, sin soportes. Imprime la parte trasera en PETG: las bisagras del botón inferior se flexionan y el PETG lo aguanta mejor que el PLA.',
    models_screws: 'Tornillería: 2 tornillos autorroscantes ST2,2×8 de cabeza avellanada.',
    m_front: 'Panel frontal · STL', m_back: 'Parte trasera con botón · STL', m_step: 'Conjunto con electrónica · STEP',
    loading: 'cargando…',
  },
  pt: {
    fw: 'Baixar firmware', models: 'Modelos do gabinete', docs: 'Documentação',
    fw_ver: 'Última versão:', fw_dl: 'Baixar firmware.bin',
    fw_note: 'Instalação: admin do dispositivo → «Atualização de firmware» → «Enviar arquivo .bin». Com a atualização automática, o dispositivo a instala sozinho.',
    models_note: 'Os STL já estão orientados para impressão, sem suportes. Imprima a parte traseira em PETG: as dobradiças do botão inferior flexionam, e o PETG aguenta isso melhor que o PLA.',
    models_screws: 'Fixação: 2 parafusos autoatarraxantes ST2,2×8 de cabeça escareada.',
    m_front: 'Painel frontal · STL', m_back: 'Parte traseira com botão · STL', m_step: 'Montagem com eletrônica · STEP',
    loading: 'carregando…',
  },
};

// названия в списке — как в админке (admin_ext.h, блок «Локализация»)
export const LANG_NAMES = { en: 'English', ru: 'Русский', de: 'Deutsch', fr: 'Français', es: 'Español', pt: 'Português' };

export function applySiteLang(l) {
  const T = SITE_TEXT[l] || SITE_TEXT.en;
  for (const el of document.querySelectorAll('[data-t]')) el.textContent = T[el.dataset.t];
  const ld = document.getElementById('loading');
  if (ld && !ld.dataset.err) ld.textContent = T.loading;
}

fetch('ota/manifest.json', { cache: 'no-cache' }).then(r => r.json())
  .then(m => { document.getElementById('fw-ver').textContent = m.version; })
  .catch(() => {});

// #modal=fw|models|docs — открыть страницу сразу с модалкой (ссылка на документацию и т.п.)
const m = new URLSearchParams(location.hash.slice(1)).get('modal');
if (m) document.getElementById('modal-' + m)?.classList.add('show');
