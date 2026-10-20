// Обвязка страницы вокруг 3D-сцены: тексты кнопок и модалок на 6 языках,
// версия прошивки из ota/manifest.json (тот же, что читают устройства).
export const SITE_TEXT = {
  ru: {
    fw: 'Скачать прошивку', models: 'Модели корпуса', docs: 'Документация',
    fw_ver: 'Последняя версия:', fw_dl: 'Скачать firmware.bin',
    fw_note: 'Установка: админка устройства → «Обновление прошивки» → «Загрузить файл прошивки .bin». С включённым автообновлением устройство поставит её само.',
    models_note: 'STL уже в положении для печати. Передняя панель — стыком на стол, лицом вверх; поддержки нужны только внутри, под крышей и штифтами. Заднюю часть — задней стенкой на стол, с поддержками под полкой, из PETG: шарниры кнопки-дна и пальцы защёлок гнутся, PETG переносит это лучше PLA.',
    models_snaps: 'Крепежа нет: задняя часть защёлкивается на переднюю. Чтобы открыть, поддените отвёрткой в пазах снизу.',
    m_front: 'Передняя панель · STL', m_back: 'Задняя часть с кнопкой · STL',
    loading: 'загрузка…',
  },
  en: {
    fw: 'Download firmware', models: 'Enclosure models', docs: 'Documentation',
    fw_ver: 'Latest version:', fw_dl: 'Download firmware.bin',
    fw_note: 'To install: device admin → “Firmware update” → “Upload firmware file .bin”. With auto-update on, the device installs it by itself.',
    models_note: 'The STLs are already oriented for printing. Print the front panel seam-down, face up; supports are needed only inside, under the roof and the pegs. Print the back back-down, with supports under the ledge, in PETG: the hinges of the bottom button and the snap fingers flex, and PETG handles that better than PLA.',
    models_snaps: 'No screws: the back snaps onto the front. To open, pry with a screwdriver in the notches at the bottom.',
    m_front: 'Front panel · STL', m_back: 'Back case with button · STL',
    loading: 'loading…',
  },
  de: {
    fw: 'Firmware herunterladen', models: 'Gehäusemodelle', docs: 'Dokumentation',
    fw_ver: 'Neueste Version:', fw_dl: 'firmware.bin herunterladen',
    fw_note: 'Installation: Geräte-Admin → „Firmware-Update“ → „Firmware-Datei .bin hochladen“. Mit Auto-Update installiert das Gerät sie selbst.',
    models_note: 'Die STL-Dateien sind schon druckfertig ausgerichtet. Die Frontblende mit der Fuge nach unten, Front nach oben drucken; Stützen nur innen, unter dem Dach und den Stiften. Das Rückteil mit der Rückwand nach unten, mit Stützen unter der Stufe, aus PETG drucken: die Scharniere der Bodentaste und die Rastfinger biegen sich, PETG verträgt das besser als PLA.',
    models_snaps: 'Keine Schrauben: das Rückteil rastet an der Frontblende ein. Zum Öffnen mit einem Schraubendreher in den Kerben unten aufhebeln.',
    m_front: 'Frontblende · STL', m_back: 'Rückteil mit Taste · STL',
    loading: 'wird geladen…',
  },
  fr: {
    fw: 'Télécharger le firmware', models: 'Modèles du boîtier', docs: 'Documentation',
    fw_ver: 'Dernière version :', fw_dl: 'Télécharger firmware.bin',
    fw_note: 'Installation : admin de l’appareil → « Mise à jour du firmware » → « Envoyer le fichier .bin ». Avec la mise à jour auto, l’appareil l’installe tout seul.',
    models_note: 'Les STL sont déjà orientés pour l’impression. La façade s’imprime joint en bas, face en haut ; supports uniquement à l’intérieur, sous le toit et les ergots. Imprimez l’arrière dos en bas, avec supports sous le rebord, en PETG : les charnières du bouton du fond et les doigts des clips fléchissent, le PETG le supporte mieux que le PLA.',
    models_snaps: 'Sans vis : l’arrière se clipse sur la façade. Pour ouvrir, faites levier avec un tournevis dans les encoches en bas.',
    m_front: 'Façade · STL', m_back: 'Arrière avec bouton · STL',
    loading: 'chargement…',
  },
  es: {
    fw: 'Descargar firmware', models: 'Modelos de la carcasa', docs: 'Documentación',
    fw_ver: 'Última versión:', fw_dl: 'Descargar firmware.bin',
    fw_note: 'Instalación: admin del dispositivo → «Actualización del firmware» → «Subir archivo .bin». Con la actualización automática, el dispositivo la instala solo.',
    models_note: 'Los STL ya están orientados para imprimir. El panel frontal se imprime con la junta abajo y la cara arriba; soportes solo por dentro, bajo el techo y los pernos. Imprime la parte trasera con la tapa trasera abajo, con soportes bajo el escalón, en PETG: las bisagras del botón inferior y los dedos de los clips se flexionan, y el PETG lo aguanta mejor que el PLA.',
    models_snaps: 'Sin tornillos: la parte trasera encaja a presión en la frontal. Para abrir, haz palanca con un destornillador en las ranuras de abajo.',
    m_front: 'Panel frontal · STL', m_back: 'Parte trasera con botón · STL',
    loading: 'cargando…',
  },
  pt: {
    fw: 'Baixar firmware', models: 'Modelos do gabinete', docs: 'Documentação',
    fw_ver: 'Última versão:', fw_dl: 'Baixar firmware.bin',
    fw_note: 'Instalação: admin do dispositivo → «Atualização de firmware» → «Enviar arquivo .bin». Com a atualização automática, o dispositivo a instala sozinho.',
    models_note: 'Os STL já estão orientados para impressão. Imprima o painel frontal com a junta para baixo e a face para cima; suportes só por dentro, sob o teto e os pinos. Imprima a parte traseira com o fundo para baixo, com suportes sob o degrau, em PETG: as dobradiças do botão inferior e os dedos dos encaixes flexionam, e o PETG aguenta isso melhor que o PLA.',
    models_snaps: 'Sem parafusos: a parte traseira encaixa na frontal. Para abrir, faça alavanca com uma chave de fenda nos entalhes de baixo.',
    m_front: 'Painel frontal · STL', m_back: 'Parte traseira com botão · STL',
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
