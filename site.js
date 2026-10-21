// Обвязка страницы вокруг 3D-сцены: тексты кнопок и модалок на 6 языках,
// версия прошивки из ota/manifest.json (тот же, что читают устройства).
export const SITE_TEXT = {
  ru: {
    fw_btn: 'Прошивка',
    intro1: 'Это BLIN.', intro2: 'Компактный удалённый температурный монитор,', intro3: 'который вы можете собрать самостоятельно.', intro_i: 'О проекте',
    fl_open: 'Прошить новое устройство по USB',
    fl: 'Прошивка по USB',
    fl_ver: 'Версия',
    fl_latest: 'последняя',
    fl_go: 'Подключить и прошить',
    fl_note: 'Для новой платы Lolin S2 Mini: запишет загрузчик, таблицу разделов и прошивку. Нужен Chrome или Edge на компьютере.',
    fl_steps: 'Подключите плату кабелем. Зажмите кнопку 0, нажмите и отпустите RST, затем отпустите 0 — плата перейдёт в режим загрузки. Нажмите «Подключить и прошить» и выберите порт.',
    fl_erase: 'Стереть плату целиком (настройки и Wi-Fi пропадут)',
    fl_nosupport: 'Этот браузер не умеет работать с USB-портом. Откройте страницу в Chrome или Edge на компьютере.',
    fl_nolist: 'Не удалось загрузить список версий.',
    st_noport: 'Порт не выбран.',
    st_load: 'Загружаю файлы прошивки…',
    st_conn: 'Подключаюсь к плате…',
    st_wrongchip: 'Это не ESP32-S2 ({chip}) — прошивка не подходит.',
    st_erase: 'Стираю плату — до минуты…',
    st_write: 'Записываю… {p}%',
    st_done: 'Готово. Если экран не включился — нажмите RST. Устройство поднимет точку доступа blin_XXXXXX: подключитесь к ней и настройте Wi-Fi (QR-код — на экране).',
    st_fail: 'Не получилось: {e}. Проверьте, что плата в режиме загрузки (0 + RST), и попробуйте ещё раз.',
    fw: 'Скачать прошивку', models: 'Модели корпуса', docs: 'Документация', admin: 'Демо админки',
    fw_ver: 'Последняя версия:', fw_dl: 'Скачать firmware.bin',
    fw_note: 'Установка: админка устройства → «Обновление прошивки» → «Загрузить файл прошивки .bin». С включённым автообновлением устройство поставит её само.',
    models_note: 'Весь корпус печатается из PETG: шарниры кнопки-дна и пальцы защёлок гнутся. STL уже в положении для печати. Передняя панель — стыком на стол, лицом вверх; поддержки нужны только внутри, под крышей и штифтами. Задняя часть — задней стенкой на стол, с поддержками под полкой.',
    models_snaps: 'Крепежа нет: задняя часть защёлкивается на переднюю. Чтобы открыть, подденьте отвёрткой в пазах снизу.',
    m_front: 'Передняя панель · STL', m_back: 'Задняя часть с кнопкой · STL',
    loading: 'загрузка…',
  },
  en: {
    fw_btn: 'Firmware',
    intro1: 'This is BLIN.', intro2: 'A compact remote temperature monitor', intro3: 'you can build yourself.', intro_i: 'About',
    fl_open: 'Flash a new device over USB',
    fl: 'Flash over USB',
    fl_ver: 'Version',
    fl_latest: 'latest',
    fl_go: 'Connect and flash',
    fl_note: 'For a new Lolin S2 Mini board: writes the bootloader, the partition table and the firmware. Needs Chrome or Edge on a computer.',
    fl_steps: 'Connect the board with a cable. Hold button 0, press and release RST, then release 0 — the board enters download mode. Click “Connect and flash” and pick the port.',
    fl_erase: 'Erase the whole board (settings and Wi-Fi will be lost)',
    fl_nosupport: 'This browser can’t talk to USB ports. Open the page in Chrome or Edge on a computer.',
    fl_nolist: 'Couldn’t load the list of versions.',
    st_noport: 'No port selected.',
    st_load: 'Downloading firmware files…',
    st_conn: 'Connecting to the board…',
    st_wrongchip: 'This is not an ESP32-S2 ({chip}) — the firmware doesn’t fit.',
    st_erase: 'Erasing the board — up to a minute…',
    st_write: 'Writing… {p}%',
    st_done: 'Done. If the screen stays dark, press RST. The device starts a blin_XXXXXX access point: connect to it and set up Wi-Fi (QR code on the screen).',
    st_fail: 'Failed: {e}. Make sure the board is in download mode (0 + RST) and try again.',
    fw: 'Download firmware', models: 'Enclosure models', docs: 'Documentation', admin: 'Admin demo',
    fw_ver: 'Latest version:', fw_dl: 'Download firmware.bin',
    fw_note: 'To install: device admin → “Firmware update” → “Upload firmware file .bin”. With auto-update on, the device installs it by itself.',
    models_note: 'Print the whole enclosure in PETG: the hinges of the bottom button and the snap fingers flex. The STLs are already oriented for printing. Print the front panel seam-down, face up; supports are needed only inside, under the roof and the pegs. Print the back back-down, with supports under the ledge.',
    models_snaps: 'No screws: the back snaps onto the front. To open, pry with a screwdriver in the notches at the bottom.',
    m_front: 'Front panel · STL', m_back: 'Back case with button · STL',
    loading: 'loading…',
  },
  de: {
    fw_btn: 'Firmware',
    intro1: 'Das ist BLIN.', intro2: 'Ein kompakter Fern-Temperaturmonitor,', intro3: 'den Sie selbst bauen können.', intro_i: 'Über das Projekt',
    fl_open: 'Neues Gerät per USB flashen',
    fl: 'Flashen per USB',
    fl_ver: 'Version',
    fl_latest: 'neueste',
    fl_go: 'Verbinden und flashen',
    fl_note: 'Für eine neue Lolin-S2-Mini-Platine: schreibt Bootloader, Partitionstabelle und Firmware. Benötigt Chrome oder Edge auf einem Computer.',
    fl_steps: 'Platine per Kabel anschließen. Taste 0 gedrückt halten, RST drücken und loslassen, dann 0 loslassen — die Platine geht in den Download-Modus. „Verbinden und flashen“ klicken und den Port wählen.',
    fl_erase: 'Platine komplett löschen (Einstellungen und WLAN gehen verloren)',
    fl_nosupport: 'Dieser Browser kann nicht auf USB-Ports zugreifen. Seite in Chrome oder Edge auf einem Computer öffnen.',
    fl_nolist: 'Versionsliste konnte nicht geladen werden.',
    st_noport: 'Kein Port gewählt.',
    st_load: 'Firmware-Dateien werden geladen…',
    st_conn: 'Verbinde mit der Platine…',
    st_wrongchip: 'Das ist kein ESP32-S2 ({chip}) — die Firmware passt nicht.',
    st_erase: 'Platine wird gelöscht — bis zu einer Minute…',
    st_write: 'Schreibe… {p} %',
    st_done: 'Fertig. Bleibt der Bildschirm dunkel, RST drücken. Das Gerät startet den Zugangspunkt blin_XXXXXX: verbinden und WLAN einrichten (QR-Code auf dem Bildschirm).',
    st_fail: 'Fehlgeschlagen: {e}. Prüfen, ob die Platine im Download-Modus ist (0 + RST), und erneut versuchen.',
    fw: 'Firmware herunterladen', models: 'Gehäusemodelle', docs: 'Dokumentation', admin: 'Admin-Demo',
    fw_ver: 'Neueste Version:', fw_dl: 'firmware.bin herunterladen',
    fw_note: 'Installation: Geräte-Admin → „Firmware-Update“ → „Firmware-Datei .bin hochladen“. Mit Auto-Update installiert das Gerät sie selbst.',
    models_note: 'Das ganze Gehäuse aus PETG drucken: die Scharniere der Bodentaste und die Rastfinger biegen sich. Die STL-Dateien sind schon druckfertig ausgerichtet. Die Frontblende mit der Fuge nach unten, Front nach oben drucken; Stützen nur innen, unter dem Dach und den Stiften. Das Rückteil mit der Rückwand nach unten, mit Stützen unter der Stufe.',
    models_snaps: 'Keine Schrauben: das Rückteil rastet an der Frontblende ein. Zum Öffnen mit einem Schraubendreher in den Kerben unten aufhebeln.',
    m_front: 'Frontblende · STL', m_back: 'Rückteil mit Taste · STL',
    loading: 'wird geladen…',
  },
  fr: {
    fw_btn: 'Firmware',
    intro1: 'Voici BLIN.', intro2: 'Un moniteur de température à distance compact', intro3: 'que vous pouvez assembler vous-même.', intro_i: 'À propos',
    fl_open: 'Flasher un nouvel appareil par USB',
    fl: 'Flasher par USB',
    fl_ver: 'Version',
    fl_latest: 'dernière',
    fl_go: 'Connecter et flasher',
    fl_note: 'Pour une carte Lolin S2 Mini neuve : écrit le bootloader, la table des partitions et le firmware. Nécessite Chrome ou Edge sur un ordinateur.',
    fl_steps: 'Branchez la carte. Maintenez le bouton 0, appuyez puis relâchez RST, puis relâchez 0 — la carte passe en mode téléchargement. Cliquez sur « Connecter et flasher » et choisissez le port.',
    fl_erase: 'Effacer toute la carte (réglages et Wi-Fi seront perdus)',
    fl_nosupport: 'Ce navigateur ne sait pas accéder aux ports USB. Ouvrez la page dans Chrome ou Edge sur un ordinateur.',
    fl_nolist: 'Impossible de charger la liste des versions.',
    st_noport: 'Aucun port choisi.',
    st_load: 'Téléchargement des fichiers du firmware…',
    st_conn: 'Connexion à la carte…',
    st_wrongchip: 'Ce n’est pas un ESP32-S2 ({chip}) — le firmware ne convient pas.',
    st_erase: 'Effacement de la carte — jusqu’à une minute…',
    st_write: 'Écriture… {p} %',
    st_done: 'Terminé. Si l’écran reste noir, appuyez sur RST. L’appareil crée le point d’accès blin_XXXXXX : connectez-vous et configurez le Wi-Fi (QR code à l’écran).',
    st_fail: 'Échec : {e}. Vérifiez que la carte est en mode téléchargement (0 + RST) et réessayez.',
    fw: 'Télécharger le firmware', models: 'Modèles du boîtier', docs: 'Documentation', admin: 'Démo admin',
    fw_ver: 'Dernière version :', fw_dl: 'Télécharger firmware.bin',
    fw_note: 'Installation : admin de l’appareil → « Mise à jour du firmware » → « Envoyer le fichier .bin ». Avec la mise à jour auto, l’appareil l’installe tout seul.',
    models_note: 'Tout le boîtier s’imprime en PETG : les charnières du bouton du fond et les doigts des clips fléchissent. Les STL sont déjà orientés pour l’impression. La façade s’imprime joint en bas, face en haut ; supports uniquement à l’intérieur, sous le toit et les ergots. L’arrière s’imprime dos en bas, avec supports sous le rebord.',
    models_snaps: 'Sans vis : l’arrière se clipse sur la façade. Pour ouvrir, faites levier avec un tournevis dans les encoches en bas.',
    m_front: 'Façade · STL', m_back: 'Arrière avec bouton · STL',
    loading: 'chargement…',
  },
  es: {
    fw_btn: 'Firmware',
    intro1: 'Esto es BLIN.', intro2: 'Un monitor de temperatura remoto y compacto', intro3: 'que puedes montar tú mismo.', intro_i: 'Acerca de',
    fl_open: 'Flashear un dispositivo nuevo por USB',
    fl: 'Flashear por USB',
    fl_ver: 'Versión',
    fl_latest: 'última',
    fl_go: 'Conectar y flashear',
    fl_note: 'Para una placa Lolin S2 Mini nueva: escribe el bootloader, la tabla de particiones y el firmware. Necesita Chrome o Edge en un ordenador.',
    fl_steps: 'Conecta la placa con un cable. Mantén el botón 0, pulsa y suelta RST y luego suelta 0: la placa entra en modo de descarga. Pulsa «Conectar y flashear» y elige el puerto.',
    fl_erase: 'Borrar toda la placa (se perderán los ajustes y el Wi-Fi)',
    fl_nosupport: 'Este navegador no puede acceder a puertos USB. Abre la página en Chrome o Edge en un ordenador.',
    fl_nolist: 'No se pudo cargar la lista de versiones.',
    st_noport: 'No se eligió ningún puerto.',
    st_load: 'Descargando los archivos del firmware…',
    st_conn: 'Conectando con la placa…',
    st_wrongchip: 'Esto no es un ESP32-S2 ({chip}): el firmware no sirve.',
    st_erase: 'Borrando la placa: hasta un minuto…',
    st_write: 'Escribiendo… {p} %',
    st_done: 'Listo. Si la pantalla sigue apagada, pulsa RST. El dispositivo crea el punto de acceso blin_XXXXXX: conéctate y configura el Wi-Fi (código QR en la pantalla).',
    st_fail: 'Error: {e}. Comprueba que la placa está en modo de descarga (0 + RST) e inténtalo de nuevo.',
    fw: 'Descargar firmware', models: 'Modelos de la carcasa', docs: 'Documentación', admin: 'Demo del panel',
    fw_ver: 'Última versión:', fw_dl: 'Descargar firmware.bin',
    fw_note: 'Instalación: admin del dispositivo → «Actualización del firmware» → «Subir archivo .bin». Con la actualización automática, el dispositivo la instala solo.',
    models_note: 'Toda la carcasa se imprime en PETG: las bisagras del botón inferior y los dedos de los clips se flexionan. Los STL ya están orientados para imprimir. El panel frontal se imprime con la junta abajo y la cara arriba; soportes solo por dentro, bajo el techo y los pernos. La parte trasera, con la tapa trasera abajo y soportes bajo el escalón.',
    models_snaps: 'Sin tornillos: la parte trasera encaja a presión en la frontal. Para abrir, haz palanca con un destornillador en las ranuras de abajo.',
    m_front: 'Panel frontal · STL', m_back: 'Parte trasera con botón · STL',
    loading: 'cargando…',
  },
  pt: {
    fw_btn: 'Firmware',
    intro1: 'Este é o BLIN.', intro2: 'Um monitor de temperatura remoto e compacto', intro3: 'que você mesmo pode montar.', intro_i: 'Sobre',
    fl_open: 'Gravar um dispositivo novo por USB',
    fl: 'Gravação por USB',
    fl_ver: 'Versão',
    fl_latest: 'mais recente',
    fl_go: 'Conectar e gravar',
    fl_note: 'Para uma placa Lolin S2 Mini nova: grava o bootloader, a tabela de partições e o firmware. Precisa do Chrome ou Edge num computador.',
    fl_steps: 'Conecte a placa com um cabo. Segure o botão 0, aperte e solte RST e depois solte 0 — a placa entra no modo de download. Clique em «Conectar e gravar» e escolha a porta.',
    fl_erase: 'Apagar a placa inteira (configurações e Wi-Fi serão perdidos)',
    fl_nosupport: 'Este navegador não acessa portas USB. Abra a página no Chrome ou Edge num computador.',
    fl_nolist: 'Não foi possível carregar a lista de versões.',
    st_noport: 'Nenhuma porta escolhida.',
    st_load: 'Baixando os arquivos do firmware…',
    st_conn: 'Conectando à placa…',
    st_wrongchip: 'Isto não é um ESP32-S2 ({chip}) — o firmware não serve.',
    st_erase: 'Apagando a placa — até um minuto…',
    st_write: 'Gravando… {p}%',
    st_done: 'Pronto. Se a tela continuar apagada, aperte RST. O dispositivo cria o ponto de acesso blin_XXXXXX: conecte-se a ele e configure o Wi-Fi (código QR na tela).',
    st_fail: 'Falhou: {e}. Verifique se a placa está no modo de download (0 + RST) e tente de novo.',
    fw: 'Baixar firmware', models: 'Modelos do gabinete', docs: 'Documentação', admin: 'Demo do painel',
    fw_ver: 'Última versão:', fw_dl: 'Baixar firmware.bin',
    fw_note: 'Instalação: admin do dispositivo → «Atualização de firmware» → «Enviar arquivo .bin». Com a atualização automática, o dispositivo a instala sozinho.',
    models_note: 'Todo o gabinete é impresso em PETG: as dobradiças do botão inferior e os dedos dos encaixes flexionam. Os STL já estão orientados para impressão. Imprima o painel frontal com a junta para baixo e a face para cima; suportes só por dentro, sob o teto e os pinos. A parte traseira, com o fundo para baixo e suportes sob o degrau.',
    models_snaps: 'Sem parafusos: a parte traseira encaixa na frontal. Para abrir, faça alavanca com uma chave de fenda nos entalhes de baixo.',
    m_front: 'Painel frontal · STL', m_back: 'Parte traseira com botão · STL',
    loading: 'carregando…',
  },
};

// названия в списке — как в админке (admin_ext.h, блок «Локализация»)
export const LANG_NAMES = { en: 'English', ru: 'Русский', de: 'Deutsch', fr: 'Français', es: 'Español', pt: 'Português' };

let lang = 'ru';
export const siteLang = () => lang;

export function applySiteLang(l) {
  lang = l;
  const T = SITE_TEXT[l] || SITE_TEXT.en;
  for (const el of document.querySelectorAll('[data-t]')) el.textContent = T[el.dataset.t];
  document.querySelector('#loading .kao')?.setAttribute('aria-label', T.loading);   // прелоадер — каомодзи, текст для скринридера
  document.getElementById('admin-link')?.setAttribute('href', 'admin/#lang=' + l);   // демо админки — на том же языке
  document.querySelector('#intro .intro-i')?.setAttribute('aria-label', T.intro_i);
  document.dispatchEvent(new Event('blin-lang'));
}

// вступление на сцене: первое взаимодействие (колесо, касание, скролл, клавиши) сворачивает
// его в кружок «i», клик по кружку — разворачивает обратно до следующего взаимодействия
const intro = document.getElementById('intro');
if (intro) {
  const btn = intro.querySelector('.intro-i');
  const fold = min => {
    intro.classList.toggle('min', min);
    btn.setAttribute('aria-expanded', String(!min));
  };
  const collapse = e => {
    if (intro.classList.contains('min') || (e.target instanceof Node && btn.contains(e.target))) return;
    fold(true);
  };
  const stage = document.getElementById('stage');
  for (const t of ['pointerdown', 'wheel', 'touchstart']) stage.addEventListener(t, collapse, { capture: true, passive: true });
  for (const t of ['scroll', 'keydown']) window.addEventListener(t, collapse, { passive: true });
  btn.addEventListener('click', () => fold(false));
}

fetch('ota/manifest.json', { cache: 'no-cache' }).then(r => r.json())
  .then(m => {
    document.getElementById('fw-ver').textContent = m.version;
    document.getElementById('ftr-ver').textContent = 'v' + m.version;
  })
  .catch(() => {});

// #modal=fw|flash|models — открыть страницу сразу с модалкой (ссылка на документацию и т.п.)
const m = new URLSearchParams(location.hash.slice(1)).get('modal');
if (m) document.getElementById('modal-' + m)?.classList.add('show');
