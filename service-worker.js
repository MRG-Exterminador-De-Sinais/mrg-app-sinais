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

    let titulo = String(
        dados.title ||
        dados.titulo ||
        ""
    ).trim();

    let mensagem = String(
        dados.body ||
        dados.mensagem ||
        ""
    ).trim();

    const referencia = `${dados.tipo || ""} ${titulo} ${mensagem} ${
        dados.data?.origem || ""
    } ${dados.data?.tipo || ""}`.toUpperCase();

    // =========================================================
    // NÃO ENVIAR STATUS INFORMATIVOS COMO PUSH
    // =========================================================
    const bloqueados = [
        "MERCADO BOM",
        "MERCADO ENTRANDO",
        "AGUARDAR E OBSERVAR",
        "RECALIBRANDO",
        "INICIANDO E RECALIBRANDO",
        "OBSERVANDO NOVOS PADRÕES"
    ];

    if (bloqueados.some((texto) => referencia.includes(texto))) {
        return;
    }

    // =========================================================
    // IDENTIFICAÇÃO INDEPENDENTE ROSA / ROXA
    // =========================================================
    const rosa =
        referencia.includes("EXECUTOR_ROSA") ||
        referencia.includes("EXECUTOR ROSA") ||
        referencia.includes("ENTRADA_ROSA") ||
        referencia.includes("RESULTADO_ROSA") ||
        referencia.includes("ROSA") ||
        referencia.includes("· 4C") ||
        referencia.includes(" 4C");

    const roxa =
        !rosa && (
            referencia.includes("SURF_ROXO") ||
            referencia.includes("SURF ROXO") ||
            referencia.includes("ENTRADA_ROXA") ||
            referencia.includes("RESULTADO_ROXO") ||
            referencia.includes("ROXA") ||
            referencia.includes("· 2C") ||
            referencia.includes(" 2C")
        );

    // =========================================================
    // ENTRADA — DEIXA SOMENTE A LINHA OPERACIONAL
    // =========================================================
    const linhaEntrada = mensagem
        .split(/\n+/)
        .map((linha) => linha.trim())
        .find((linha) =>
            linha.toUpperCase().includes("APÓS") &&
            linha.toUpperCase().includes("SAIR")
        );

    if (linhaEntrada) {
        mensagem = linhaEntrada;
    }

    // Rosa chega internamente com 🟢.
    // No Push do usuário deve aparecer 🩷.
    if (rosa) {
        mensagem = mensagem.replace(/🟢/g, "🩷");
    }

    // =========================================================
    // RESULTADO / RESUMO — COMPACTAR
    // =========================================================
    if (!linhaEntrada) {
        const linhas = mensagem
            .split(/\n+/)
            .map((linha) => linha.trim())
            .filter(Boolean);

        const linhaMarcadores = linhas.find((linha) =>
            /[🟣🔵🩷🟢]/u.test(linha)
        );

        const linhaPercentual = linhas.find((linha) =>
            /\d{1,3}\s*%/.test(linha)
        );

        if (linhaMarcadores) {
            let compacta = linhaMarcadores;

            if (
                linhaPercentual &&
                linhaPercentual !== linhaMarcadores
            ) {
                const pct = linhaPercentual.match(/\d{1,3}\s*%/);
                const seta = linhaPercentual.match(/[↑↓]/u);

                if (pct) {
                    compacta += ` ${pct[0]}`;
                }

                if (seta) {
                    compacta += ` ${seta[0]}`;
                }
            }

            mensagem = compacta;
        }

        if (rosa) {
            mensagem = mensagem.replace(/🟢/g, "🩷");
        }
    }

    // Compacta espaços para reduzir quebra de linha no iPhone.
    mensagem = mensagem
        .replace(/[ \t]+/g, " ")
        .trim();

    if (!mensagem) {
        return;
    }

    const url =
        dados.url ||
        dados.link ||
        "/";

    // Tags independentes:
    // Rosa nunca substitui Roxa e Roxa nunca substitui Rosa.
    const tag = rosa
        ? "mrg-executor-rosa"
        : roxa
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
            origem: dados.data?.origem || "",
            sinalId: dados.sinal_id || dados.sinalId || ""
        }
    };

    // Título mínimo para deixar a informação operacional em destaque.
    event.waitUntil(
        self.registration.showNotification("\u200B", opcoes)
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
