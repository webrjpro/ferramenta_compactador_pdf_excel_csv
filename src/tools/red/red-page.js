(() => {
    "use strict";

    const RedPageApp = {
        init() {
            this.statusEl = document.getElementById("red-status");
            this.bindRouteButtons();
            this.setStatus("Pronto para navegacao.");
        },

        bindRouteButtons() {
            const buttons = document.querySelectorAll("[data-route]");
            buttons.forEach((button) => {
                button.addEventListener("click", () => {
                    const target = button.getAttribute("data-route");
                    this.navigateSafely(target);
                });
            });
        },

        navigateSafely(target) {
            if (!target) {
                this.setStatus("Rota invalida.");
                return;
            }

            try {
                const nextUrl = new URL(target, window.location.href);
                this.setStatus(`Abrindo ${nextUrl.pathname}...`);
                window.location.href = nextUrl.href;
            } catch (error) {
                this.setStatus("Nao foi possivel abrir a rota solicitada.");
                console.error("[RED] Falha de navegacao:", error);
            }
        },

        setStatus(message) {
            if (this.statusEl) {
                this.statusEl.textContent = message;
            }
        },
    };

    window.RedPageApp = RedPageApp;
    window.addEventListener("DOMContentLoaded", () => RedPageApp.init());
})();