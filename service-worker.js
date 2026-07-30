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

    const titulo =
        dados.title ||
        dados.titulo ||
        "MRG Exterminador de Sinais";

    const mensagem =
        dados.body ||
        dados.mensagem ||
        "Novo sinal disponível.";

    const url =
        dados.url ||
        dados.link ||
        "/";

    const tag =
        dados.tag ||
        dados.tipo ||
        "mrg-sinal";

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
