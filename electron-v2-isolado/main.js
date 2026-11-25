'use strict';

const { app, BrowserWindow, BrowserView, ipcMain, shell } = require('electron');
const path = require('path');

// A lista online e a P3 oficial sao a unica fonte dos paineis.
// Este aplicativo conserva somente UM navegador nativo do Aviator.
const OFFICIAL_ORIGIN = 'https://mrg-app-sinais.vercel.app';
const AVIATOR_URL = 'https://1wxbwl.com/casino/play/v_spribe:aviator';
// Geometria aprovada: o Aviator interno trabalha sempre em 80%,
// independentemente de estar encaixado na P2 ou na P3.
const AVIATOR_ZOOM = 0.8;
const PAGE_URLS = {
  1: `${OFFICIAL_ORIGIN}/p1.html`,
  2: `${OFFICIAL_ORIGIN}/p2.html`,
  3: `${OFFICIAL_ORIGIN}/`,
  4: `${OFFICIAL_ORIGIN}/p4.html`
};

let win = null;
let aviatorView = null;
let currentPage = 1;

function isAllowedAviatorUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (url.hostname === '1wxbwl.com' || url.hostname === '1win.com' || url.hostname.endsWith('.1win.com'));
  } catch (_) { return false; }
}

function hideAviator() {
  if (aviatorView) aviatorView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
}

function forceAviatorZoom() {
  if (!aviatorView) return;
  // Zoom nativo do Chromium: preserva o fluxo real do Aviator. A tentativa de
  // escala CSS foi removida porque deformava a página interna do jogo.
  try { aviatorView.webContents.setZoomFactor(AVIATOR_ZOOM); } catch (_) {}
  try { aviatorView.webContents.setZoomLevel(Math.log(AVIATOR_ZOOM) / Math.log(1.2)); } catch (_) {}
}

function setAviatorBounds(payload) {
  if (!win || !aviatorView || !payload || !payload.visible || ![2, 3].includes(currentPage)) return hideAviator();
  const bounds = payload.bounds || {};
  const x = Number(bounds.x) || 0;
  const y = Number(bounds.y) || 0;
  const width = Math.max(1, Number(bounds.width) || 0);
  const height = Math.max(1, Number(bounds.height) || 0);
  const inset = Math.max(0, Math.min(18, Number(payload.frameInset) || 0));
  const content = win.getContentBounds();
  // O BrowserView não possui overflow próprio. Por isso o recorte precisa ser
  // calculado aqui: ao rolar a página, a parte do jogo acima/abaixo da janela
  // é reduzida e desaparece junto com a página, sem ficar presa em y=0.
  const left = Math.max(0, x + inset);
  const top = Math.max(0, y + inset);
  const right = Math.min(content.width, x + width - inset);
  const bottom = Math.min(content.height, y + height - inset);
  if (right - left < 1 || bottom - top < 1 || width < 80 || height < 80) return hideAviator();
  aviatorView.setBounds({
    x: Math.round(left),
    y: Math.round(top),
    width: Math.max(1, Math.round(right - left)),
    height: Math.max(1, Math.round(bottom - top))
  });
}

function openPage(page) {
  const number = Number(page);
  if (!PAGE_URLS[number] || !win) return;
  currentPage = number;
  hideAviator();
  win.loadURL(PAGE_URLS[number], { extraHeaders: 'Cache-Control: no-cache\r\n' }).catch((error) => console.error('[MRG V2] Falha ao abrir painel:', error.message));
}

function createWindow() {
  win = new BrowserWindow({
    width: 1410, height: 940, minWidth: 980, minHeight: 650,
    backgroundColor: '#030709', title: 'MRG Aviator - Teste Isolado', icon: path.join(__dirname, 'soldado_mrg.ico'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: false, nodeIntegration: false, webSecurity: true, spellcheck: false }
  });
  win.removeMenu();

  aviatorView = new BrowserView({ webPreferences: { partition: 'persist:mrg-aviator-unico-v2', contextIsolation: true, sandbox: true, nodeIntegration: false, webSecurity: true } });
  win.addBrowserView(aviatorView);
  hideAviator();
  aviatorView.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedAviatorUrl(url)) return { action: 'allow' };
    shell.openExternal(url).catch(() => {});
    return { action: 'deny' };
  });
  aviatorView.webContents.on('will-navigate', (event, url) => { if (!isAllowedAviatorUrl(url)) event.preventDefault(); });
  aviatorView.webContents.on('dom-ready', forceAviatorZoom);
  aviatorView.webContents.on('did-finish-load', () => {
    forceAviatorZoom();
    setTimeout(forceAviatorZoom, 400);
    setTimeout(forceAviatorZoom, 1500);
    setTimeout(forceAviatorZoom, 3500);
  });
  aviatorView.webContents.loadURL(AVIATOR_URL).catch((error) => console.error('[MRG V2] Falha no Aviator:', error.message));

  win.webContents.setWindowOpenHandler(({ url }) => {
    try { if (new URL(url).origin !== OFFICIAL_ORIGIN) shell.openExternal(url).catch(() => {}); } catch (_) {}
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => { try { if (new URL(url).origin !== OFFICIAL_ORIGIN) event.preventDefault(); } catch (_) { event.preventDefault(); } });
  win.on('resize', () => hideAviator());
  win.on('closed', () => { win = null; aviatorView = null; });
  openPage(1);
}

ipcMain.on('mrg:open-page', (_event, page) => openPage(page));
ipcMain.on('mrg:aviator-slot', (_event, payload) => setAviatorBounds(payload));

app.setName('MRG Aviator - Teste Isolado');
app.setPath('userData', path.join(app.getPath('appData'), 'MRG_AVIATOR_TESTE_ISOLADO_V2'));
if (!app.requestSingleInstanceLock()) app.quit();
app.whenReady().then(createWindow);
app.on('second-instance', () => { if (win && !win.isDestroyed()) { win.show(); win.focus(); } });
app.on('window-all-closed', () => app.quit());
