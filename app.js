/* ============================================================
   Seguridad Web · Controlador de presentación
   Navegación: teclado, botones, dots, swipe, hash y progreso.
   JavaScript vainilla ES6+ — sin dependencias.
   ============================================================ */

(() => {
    "use strict";

    // ---------- 1. Referencias al DOM ----------
    const slides   = Array.from(document.querySelectorAll(".slide"));
    const dotsWrap = document.getElementById("dots");
    const prevBtn  = document.getElementById("prevBtn");
    const nextBtn  = document.getElementById("nextBtn");
    const counter  = document.getElementById("slideCounter");
    const progress = document.getElementById("progressFill");
    const deck     = document.getElementById("deck");

    const TOTAL = slides.length;
    let current = 0;
    const ANIM_MS = 560;            // debe coincidir con la transición CSS

    const pad = (n) => String(n).padStart(2, "0");

    // ---------- 2. Crear dots de indicador ----------
    const dots = slides.map((_, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "dot";
        b.setAttribute("role", "tab");
        b.setAttribute("aria-label", `Ir a la diapositiva ${i + 1}`);
        b.addEventListener("click", () => goTo(i));
        dotsWrap.appendChild(b);
        return b;
    });

    // ---------- 3. Render del estado ----------
    function render(direction = 0) {
        slides.forEach((slide, i) => {
            const active = i === current;
            slide.classList.toggle("slide--active", active);
            slide.toggleAttribute("hidden", !active);
            slide.setAttribute("aria-hidden", String(!active));

            // Efecto de salida en la dirección del movimiento
            if (!active && direction !== 0) {
                const exitClass = direction > 0 ? "slide--exit-right" : "slide--exit-left";
                slide.classList.add(exitClass);
                window.setTimeout(() => slide.classList.remove(exitClass), ANIM_MS);
            }
        });

        dots.forEach((d, i) => {
            const active = i === current;
            d.classList.toggle("dot--active", active);
            d.setAttribute("aria-selected", String(active));
        });

        counter.textContent = `${pad(current + 1)} / ${pad(TOTAL)}`;
        progress.style.width = `${((current + 1) / TOTAL) * 100}%`;

        prevBtn.disabled = current === 0;
        nextBtn.disabled = current === TOTAL - 1;

        // Actualiza el hash sin recargar (#/3)
        const hash = `#/${current + 1}`;
        if (location.hash !== hash) history.replaceState(null, "", hash);

        // Reinicia el scroll de la diapositiva activa
        slides[current].scrollTop = 0;
    }

    // ---------- 4. Navegación ----------
    // Sin bloqueo: cada pulsación avanza/retrocede una diapositiva aunque la
    // transición anterior siga en curso (CSS retargetea la animación sin cortes).
    function goTo(index) {
        const next = Math.max(0, Math.min(TOTAL - 1, index));
        if (next === current) return;

        const direction = next > current ? 1 : -1;
        current = next;
        render(direction);
    }

    const next = () => goTo(current + 1);
    const prev = () => goTo(current - 1);

    // ---------- 5. Eventos ----------
    nextBtn.addEventListener("click", next);
    prevBtn.addEventListener("click", prev);

    document.addEventListener("keydown", (e) => {
        // No interferir si el usuario escribe en un campo
        if (e.target.closest("input, textarea, select, [contenteditable]")) return;

        switch (e.key) {
            case "ArrowRight":
            case "PageDown":
            case " ":                       // espacio avanza
            case "Enter":
                e.preventDefault();
                next();
                break;
            case "ArrowLeft":
            case "PageUp":
                e.preventDefault();
                prev();
                break;
            case "Home":
                e.preventDefault();
                goTo(0);
                break;
            case "End":
                e.preventDefault();
                goTo(TOTAL - 1);
                break;
        }
    });

    // Navegación táctil (swipe horizontal)
    let touchX = null;
    let touchY = null;

    deck.addEventListener("touchstart", (e) => {
        touchX = e.changedTouches[0].clientX;
        touchY = e.changedTouches[0].clientY;
    }, { passive: true });

    deck.addEventListener("touchend", (e) => {
        if (touchX === null) return;
        const dx = e.changedTouches[0].clientX - touchX;
        const dy = e.changedTouches[0].clientY - touchY;
        touchX = touchY = null;

        // Solo gestos claramente horizontales
        if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            dx < 0 ? next() : prev();
        }
    }, { passive: true });

    // Rueda del trackpad/mouse (con throttle) — desactivada en pantallas pequeñas
    let wheelLock = false;
    deck.addEventListener("wheel", (e) => {
        if (window.innerWidth < 900) return;            // en móvil dejamos el scroll libre
        if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;   // solo scroll horizontal
        if (wheelLock) return;

        wheelLock = true;
        e.deltaX > 0 ? next() : prev();
        window.setTimeout(() => { wheelLock = false; }, 800);
    }, { passive: true });

    // Sincroniza con cambios manuales del hash (#/5)
    window.addEventListener("hashchange", () => {
        const n = parseInt(location.hash.replace(/\D+/g, ""), 10);
        if (!Number.isNaN(n)) goTo(n - 1);
    });

    // ---------- 6. Arranque ----------
    function init() {
        const n = parseInt(location.hash.replace(/\D+/g, ""), 10);
        if (!Number.isNaN(n) && n >= 1 && n <= TOTAL) current = n - 1;
        render();
    }

    init();
})();
