'use strict';

const { contextBridge, ipcRenderer } = require('electron');

let activeSlot = null;
let observer = null;
let resizeHookInstalled = false;
const FRAME_KEY = 'mrg:v2:aviator-frame';

function storedP3Frame() {
  try {
    const value = JSON.parse(sessionStorage.getItem(FRAME_KEY) || 'null');
    return value && value.width >= 400 && value.height >= 300 ? value : null;
  } catch (_) { return null; }
}

function applyP2Geometry(element) {
  const layout = document.querySelector('.p2-layout');
  // Mesmo desenho-base da P3: 280px | JOGO | 300px, com 9px de espaço.
  const frame = storedP3Frame();
  // Referência aprovada da P3 no notebook: 670 x 500. Ao abrir a P3,
  // a medida real dela substitui esta referência para qualquer resolução.
  const width = frame ? frame.width : 670;
  const height = frame ? frame.height : 500;
  element.style.setProperty('width', `${width}px`, 'important');
  element.style.setProperty('height', `${height}px`, 'important');
  element.style.setProperty('min-height', `${height}px`, 'important');
  element.style.setProperty('max-height', `${height}px`, 'important');
  if (layout) {
    layout.style.setProperty('grid-template-columns', `280px ${width}px minmax(300px, 1fr)`, 'important');
    layout.style.setProperty('gap', '9px', 'important');
  }
}

function publishSlot() {
  if (!activeSlot) return;
  const element = document.getElementById(activeSlot.slotId);
  if (!element) {
    ipcRenderer.send('mrg:aviator-slot', { visible: false });
    return;
  }
  const rect = element.getBoundingClientRect();
  if (activeSlot.page === 'P3' && rect.width >= 400 && rect.height >= 300) {
    try { sessionStorage.setItem(FRAME_KEY, JSON.stringify({ width: Math.round(rect.width), height: Math.round(rect.height) })); } catch (_) {}
  }
  const visible = rect.width > 40 && rect.height > 40 && document.visibilityState === 'visible';
  ipcRenderer.send('mrg:aviator-slot', {
    visible,
    page: activeSlot.page,
    slotId: activeSlot.slotId,
    // BrowserView fica alguns pixels dentro do slot. Assim a moldura da página
    // continua na frente/ao redor do jogo, sem ser coberta pelo conteúdo nativo.
    frameInset: 10,
    bounds: { x: Math.round(rect.left), y: Math.round(rect.top), width: Math.round(rect.width), height: Math.round(rect.height) }
  });
}

function mountAviator(options) {
  if (!options || !options.slotId) return;
  activeSlot = { page: String(options.page || ''), slotId: String(options.slotId) };
  if (observer) observer.disconnect();
  observer = new ResizeObserver(publishSlot);
  const start = () => {
    const el = document.getElementById(activeSlot.slotId);
    if (el) {
      if (activeSlot.page === 'P2') applyP2Geometry(el);
      observer.observe(el);
    }
    publishSlot();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
  if (!resizeHookInstalled) {
    resizeHookInstalled = true;
    window.addEventListener('resize', publishSlot, { passive: true });
    window.addEventListener('scroll', publishSlot, { passive: true, capture: true });
    document.addEventListener('visibilitychange', publishSlot);
  }
}

contextBridge.exposeInMainWorld('MRG_APP_SHELL', {
  isNative: true,
  isApp: true,
  platform: 'PC',
  abrirPagina: (page) => ipcRenderer.send('mrg:open-page', Number(page)),
  mountAviator
});

window.addEventListener('beforeunload', () => ipcRenderer.send('mrg:aviator-slot', { visible: false }));
