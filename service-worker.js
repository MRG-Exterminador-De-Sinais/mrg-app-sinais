const LIMITE_SINAL_MS = 15000;

self.addEventListener("install", (event) => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
    event.waitUntil((async () => {
        let dados = {};
        try {
            dados = event.data ? event.data.json() : {};
        } catch (_) {
            dados = { body: event.data ? event.data.text() : "" };
        }

        const criadoEmBruto = dados.criado_em ?? dados.created_at ?? Date.now();
        const criadoEm = typeof criadoEmBruto === "number"
            ? criadoEmBruto
            : new Date(criadoEmBruto).getTime();

        if (Number.isFinite(criadoEm) && Date.now() - criadoEm > LIMITE_SINAL_MS) {
            return;
        }

        const titulo = dados.title || dados.titulo || "🟣 MRG — NOVO SINAL";
        const corpo = dados.body || dados.mensagem || "Abra a Lista de Sinais para conferir a entrada.";

        await self.registration.showNotification(titulo, {
            body: corpo,
            icon: "/16037623-50c1-4b03-b31c-35b5261d38ac.jpg",
            badge: "/16037623-50c1-4b03-b31c-35b5261d38ac.jpg",
            tag: dados.tag || `mrg-sinal-${dados.sinal_id || criadoEm}`,
            renotify: true,
            requireInteraction: false,
            data: {
                url: dados.url || "/",
                criado_em: criadoEm,
                sinal_id: dados.sinal_id || null
            }
        });
    })());
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const destino = event.notification.data?.url || "/";

    event.waitUntil((async () => {
        const janelas = await self.clients.matchAll({
            type: "window",
            includeUncontrolled: true
        });

        for (const janela of janelas) {
            if ("navigate" in janela) {
                await janela.navigate(destino);
            }
            if ("focus" in janela) {
                return janela.focus();
            }
        }

        if (self.clients.openWindow) {
            return self.clients.openWindow(destino);
        }
    })());
});
