'use strict';

const { contextBridge, ipcRenderer } = require('electron');

let activeSlot = null;
let observer = null;
let resizeHookInstalled = false;

function publishSlot() {
  if (!activeSlot) return;
  const element = document.getElementById(activeSlot.slotId);
  if (!element) {
    ipcRenderer.send('mrg:aviator-slot', { visible: false });
    return;
  }
  const rect = element.getBoundingClientRect();
  const visible = rect.width > 40 && rect.height > 40 && document.visibilityState === 'visible';
  ipcRenderer.send('mrg:aviator-slot', {
    visible,
    page: activeSlot.page,
    slotId: activeSlot.slotId,
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
    if (el) observer.observe(el);
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
