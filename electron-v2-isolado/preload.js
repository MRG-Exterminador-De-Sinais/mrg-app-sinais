'use strict';

const { contextBridge, ipcRenderer } = require('electron');

let activeSlot = null;
let observer = null;
let resizeHookInstalled = false;
let scrollTrackingInstalled = false;
let scrollTrackingFrame = null;
const FRAME_KEY = 'mrg:v2:aviator-frame';

function corDaMoldura() {
  const estilo = getComputedStyle(document.documentElement);
  // P2 publica --p2pred; P3 publica --mrg-analista-cor. A leitura da P3
  // também herda a variável P2 como reserva durante a primeira atualização.
  const p3 = estilo.getPropertyValue('--mrg-analista-cor').trim();
  const p2 = estilo.getPropertyValue('--p2pred').trim();
  return (activeSlot?.page === 'P3' ? (p3 || p2) : (p2 || p3)) || '#38bdf8';
}

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
    element.style.setProperty('padding', '12px', 'important');
    element.style.setProperty('border', '0', 'important');
    // Arredondamento somente do lado externo. O Aviator interno continua
    // quadrado, pois é um BrowserView nativo encaixado após a faixa da moldura.
    element.style.setProperty('border-radius', '16px', 'important');
    element.style.setProperty('overflow', 'visible', 'important');
    const styleId = 'mrg-v2-native-frame-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = '.mrg-v2-aviator-frame::before{display:none!important;background:transparent!important}';
      document.head.appendChild(style);
    }
  }
  const cor = corDaMoldura();
  if (element.dataset.mrgV2FrameColor !== cor) {
    element.dataset.mrgV2FrameColor = cor;
    // A cor vem do mesmo Norte do Analista que colore os painéis: roxo, azul,
    // rosa ou branco. O degradê usa a própria cor entre luz e sombra.
    element.style.setProperty('background', `linear-gradient(135deg,#f5fbff 0%,${cor} 18%,${cor} 64%,#05070b 100%)`, 'important');
    element.style.setProperty('box-shadow', `0 0 13px ${cor},0 0 25px ${cor}`, 'important');
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
