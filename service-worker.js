self.addEventListener("install", (event) => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener("notificationclick", function(event) {
    event.notification.close();

    event.waitUntil(
        clients.matchAll({
            type: "window",
            includeUncontrolled: true
        }).then(function(clientList) {

            for (const client of clientList) {
                if ("focus" in client)
                    return client.focus();
            }

            if (clients.openWindow) {
                return clients.openWindow("/");
            }
        })
    );
});
