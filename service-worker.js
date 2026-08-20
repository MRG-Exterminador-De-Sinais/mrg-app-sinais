self.addEventListener("install", (event) => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener("push", (event) => {
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

    const referencia = `${dados.tipo || ""} ${titulo} ${mensagem}`.toUpperCase();
    const entradaRosa = referencia.includes("ROSA") || referencia.includes("EXECUTOR") || referencia.includes(" 4C") || referencia.includes("· 4C");
    const entradaRoxa = referencia.includes("ROXA") || referencia.includes("SURF") || referencia.includes(" 2C") || referencia.includes("· 2C");

    if (entradaRosa) {
        titulo = "MRG EXECUTOR ROSA - ENTRADA";
        mensagem = String(mensagem).replace(/🟢/g, "🩷");
    } else if (entradaRoxa) {
        titulo = "MRG SURF ROXO - ENTRADA";
    }

    const url =
        dados.url ||
        dados.link ||
        "/";

    const tag = entradaRosa ? "mrg-executor-rosa" : (entradaRoxa ? "mrg-surf-roxo" : (dados.tag || dados.tipo || "mrg-sinal"));

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
            sinalId: dados.sinal_id || dados.sinalId || ""
        }
    };

    event.waitUntil(
        self.registration.showNotification(titulo, opcoes)
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
        clients.matchAll({
            type: "window",
            includeUncontrolled: true
        }).then((clientList) => {
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
