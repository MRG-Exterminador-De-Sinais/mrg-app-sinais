self.addEventListener("install", (event) => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(clients.claim());
});

const PREF_CACHE = "mrg-push-preferencias-v1";
const PREF_URL = "/__mrg_push_preferencias__";

async function salvarPreferencias(prefs) {
    const cache = await caches.open(PREF_CACHE);

    await cache.put(
        PREF_URL,
        new Response(
            JSON.stringify({
                roxa: prefs.roxa !== false,
                rosa: prefs.rosa !== false
            }),
            {
                headers: {
                    "Content-Type": "application/json"
                }
            }
        )
    );
}

async function lerPreferencias() {
    try {
        const cache = await caches.open(PREF_CACHE);
        const resp = await cache.match(PREF_URL);

        if (!resp) {
            return {
                roxa: true,
                rosa: true
            };
        }

        const prefs = await resp.json();

        return {
            roxa: prefs.roxa !== false,
            rosa: prefs.rosa !== false
        };
    } catch (_) {
        return {
            roxa: true,
            rosa: true
        };
    }
}

self.addEventListener("message", (event) => {
    const dados = event.data || {};

    if (dados.tipo === "MRG_PUSH_PREFS") {
        event.waitUntil(
            salvarPreferencias({
                roxa: !!dados.roxa,
                rosa: !!dados.rosa
            })
        );
    }
});

self.addEventListener("push", (event) => {
    event.waitUntil(
        (async () => {
            let dados = {};

            try {
                if (event.data) {
                    dados = event.data.json();
                }
            } catch (erro) {
                dados = {
                    body: event.data ? event.data.text() : ""
                };
            }

            let titulo =
                dados.title ||
                dados.titulo ||
                "MRG Exterminador de Sinais";

            let mensagem =
                dados.body ||
                dados.mensagem ||
                "Novo sinal disponível.";

            const referencia =
                `${dados.tipo || ""} ${titulo} ${mensagem}`.toUpperCase();

            const entradaRosa =
                referencia.includes("ROSA") ||
                referencia.includes("EXECUTOR") ||
                referencia.includes(" 4C") ||
                referencia.includes("· 4C");

            const entradaRoxa =
                referencia.includes("ROXA") ||
                referencia.includes("SURF") ||
                referencia.includes(" 2C") ||
                referencia.includes("· 2C");

            // =====================================================
            // PREFERÊNCIAS INDEPENDENTES ROXA / ROSA
            // =====================================================

            const prefs = await lerPreferencias();

            if (entradaRosa && !prefs.rosa) {
                return;
            }

            if (entradaRoxa && !entradaRosa && !prefs.roxa) {
                return;
            }

            // =====================================================
            // TÍTULOS DAS NOTIFICAÇÕES
            // =====================================================

            if (entradaRosa) {
                titulo = "MRG EXECUTOR ROSA - ENTRADA";
                mensagem = String(mensagem).replace(/🟢/g, "🩷");
            } else if (entradaRoxa) {
                titulo = "MRG SURF ROXO - ENTRADA";
            }

            // =====================================================
            // MANTÉM SOMENTE A LINHA DA ENTRADA
            // =====================================================

            const linhaEntrada = String(mensagem)
                .split(/\n+/)
                .map((linha) => linha.trim())
                .find(
                    (linha) =>
                        linha.toUpperCase().includes("APÓS") &&
                        linha.toUpperCase().includes("SAIR")
                );

            if (linhaEntrada) {
                mensagem = linhaEntrada;
            }

            const url =
                dados.url ||
                dados.link ||
                "/";

            // =====================================================
            // TAGS INDEPENDENTES
            // ROSA NÃO SUBSTITUI ROXA E VICE-VERSA
            // =====================================================

            const tag = entradaRosa
                ? "mrg-executor-rosa"
                : entradaRoxa
                    ? "mrg-surf-roxo"
                    : (dados.tag || dados.tipo || "mrg-sinal");

            const opcoes = {
                body: mensagem,
                icon: dados.icon || "/icon-192.png",
                badge: dados.badge || "/icon-192.png",
                tag: tag,
                renotify: true,
                requireInteraction: false,
                data: {
                    url: url,
                    tipo: dados.tipo || "",
                    sinalId:
                        dados.sinal_id ||
                        dados.sinalId ||
                        ""
                }
            };

            await self.registration.showNotification(
                titulo,
                opcoes
            );
        })()
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const urlDestino =
        event.notification.data &&
        event.notification.data.url
            ? event.notification.data.url
            : "/";

    event.waitUntil(
        clients
            .matchAll({
                type: "window",
                includeUncontrolled: true
            })
            .then((clientList) => {
                for (const client of clientList) {
                    if ("focus" in client) {
                        client.navigate(urlDestino);
                        return client.focus();
                    }
                }

                if (clients.openWindow) {
                    return clients.openWindow(urlDestino);
                }

                return null;
            })
    );
});
