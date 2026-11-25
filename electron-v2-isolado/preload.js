'use strict';

const { contextBridge, ipcRenderer } = require('electron');

let activeSlot = null;
let observer = null;
let resizeHookInstalled = false;
let scrollTrackingInstalled = false;
let scrollTrackingFrame = null;
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
  // Esta moldura existe somente no aplicativo. Ela e preparada uma vez, sem
  // redesenhar o DOM a cada quadro de rolagem.
  if (element.dataset.mrgV2Frame !== '1') {
    element.dataset.mrgV2Frame = '1';
    element.classList.add('mrg-v2-aviator-frame');
    element.style.setProperty('background', 'linear-gradient(135deg,#16d9ff 0%,#385cff 42%,#b55cff 70%,#ff5ab9 100%)', 'important');
    element.style.setProperty('padding', '12px', 'important');
    element.style.setProperty('border', '0', 'important');
    element.style.setProperty('border-radius', '0', 'important');
    element.style.setProperty('box-shadow', '0 0 18px rgba(43,202,255,.70),0 0 26px rgba(202,79,255,.50)', 'important');
    const styleId = 'mrg-v2-native-frame-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = '.mrg-v2-aviator-frame::before{display:none!important;background:transparent!important}';
      document.head.appendChild(style);
    }
  }
  ipcRenderer.send('mrg:aviator-slot', {
    visible,
    page: activeSlot.page,
    slotId: activeSlot.slotId,
    // BrowserView fica alguns pixels dentro do slot. Assim a moldura da página
    // continua na frente/ao redor do jogo, sem ser coberta pelo conteúdo nativo.
    // O jogo fica inteiramente dentro da moldura. A faixa colorida substitui
    // o espaço preto que antes aparecia entre a página e o BrowserView.
    frameInset: 12,
    bounds: { x: Math.round(rect.left), y: Math.round(rect.top), width: Math.round(rect.width), height: Math.round(rect.height) }
  });
}

function instalarRastreamentoDeRolagem() {
  if (scrollTrackingInstalled) return;
  scrollTrackingInstalled = true;

  // Scroll dentro de .app não dispara resize. BrowserView é uma camada nativa
  // fora do HTML, portanto precisa receber as novas coordenadas do slot a cada
  // quadro enquanto a página se move. Assim ele sobe e desaparece junto com o
  // restante da P2/P3, sem cobrir o histórico abaixo.
  let ultimoEnvio = 0;
  const acompanhar = (agora) => {
    if (agora - ultimoEnvio >= 24) {
      ultimoEnvio = agora;
      publishSlot();
    }
    scrollTrackingFrame = requestAnimationFrame(acompanhar);
  };
  scrollTrackingFrame = requestAnimationFrame(acompanhar);
  window.addEventListener('scroll', publishSlot, { passive: true, capture: true });
  document.addEventListener('scroll', publishSlot, { passive: true, capture: true });
  window.addEventListener('pagehide', () => {
    if (scrollTrackingFrame) cancelAnimationFrame(scrollTrackingFrame);
    scrollTrackingFrame = null;
  }, { once: true });
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
  instalarRastreamentoDeRolagem();
}

contextBridge.exposeInMainWorld('MRG_APP_SHELL', {
  isNative: true,
  isApp: true,
  platform: 'PC',
  abrirPagina: (page) => ipcRenderer.send('mrg:open-page', Number(page)),
  mountAviator
});

window.addEventListener('beforeunload', () => ipcRenderer.send('mrg:aviator-slot', { visible: false }));
