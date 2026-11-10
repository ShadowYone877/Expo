/* ============================================================
   Quiz relámpago · Seguridad Web
   5 preguntas "¿Vulnerable o seguro?" + 5 de teoría.
   JavaScript vainilla ES6+ — sin dependencias.
   ============================================================ */

(() => {
    "use strict";

    /* ---------- 1. Banco de preguntas ---------- */
    // Tipos: "vs" = vulnerable/seguir · "mc" = opción múltiple · "tf" = verdadero/falso
    const QUESTIONS = [
        // ── Bloque A · ¿Vulnerable o seguro? (5) ──
        {
            type: "vs",
            q: "¿Vulnerable o seguro? Consulta construida por concatenación",
            code: "const q = `SELECT * FROM users WHERE user = '${input}'`;",
            options: ["Vulnerable", "Seguro"],
            answer: 0,
            why: "La entrada del usuario se concatena en el SQL: un payload como admin' OR '1'='1 -- extrae o borra datos. Debe usarse una consulta preparada."
        },
        {
            type: "vs",
            q: "¿Vulnerable o seguro? Consulta con parámetro marcado",
            code: 'db.query("SELECT * FROM users WHERE user = ?", [input]);',
            options: ["Vulnerable", "Seguro"],
            answer: 1,
            why: "Los datos viajan por separado de la instrucción SQL: el motor los trata como valores, nunca como código. Es la defensa nº1 contra SQLi."
        },
        {
            type: "vs",
            q: "¿Vulnerable o seguro? Inserción de la URL en el DOM",
            code: 'element.innerHTML = new URLSearchParams(location.search).get("q");',
            options: ["Vulnerable", "Seguro"],
            answer: 0,
            why: "location.search llega sin sanitizar y se inserta como HTML: permite robar cookies/sesiones y alterar la página (XSS basado en DOM)."
        },
        {
            type: "vs",
            q: "¿Vulnerable o seguro? Cabecera de respuesta",
            code: "res.setHeader(\"Content-Security-Policy\", \"default-src 'self'\");",
            options: ["Vulnerable", "Seguro"],
            answer: 1,
            why: "CSP restringe el origen de scripts y recursos: reduce drásticamente el impacto de un XSS y bloquea scripts externos no autorizados."
        },
        {
            type: "vs",
            q: "¿Vulnerable o seguro? Escritura de cookie de sesión",
            code: 'document.cookie = "token=" + userData.token;   // sin HttpOnly ni SameSite',
            options: ["Vulnerable", "Seguro"],
            answer: 0,
            why: "Una cookie sin HttpOnly/SameSite queda expuesta a scripts (XSS) y a peticiones cruzadas (CSRF). Debe enviarse con HttpOnly; Secure; SameSite."
        },

        // ── Bloque B · Conceptos (5) ──
        {
            type: "mc",
            q: "¿Qué es una vulnerabilidad en una aplicación web?",
            options: [
                "Una herramienta para cifrar información",
                "Un sistema de respaldo de datos",
                "Una debilidad que puede ser explotada por un atacante",
                "Un mecanismo para mejorar el rendimiento"
            ],
            answer: 2,
            why: "Es una debilidad del diseño, la implementación o la operación que un atacante puede explotar para alterar el comportamiento esperado del sistema (base del OWASP Top 10)."
        },
        {
            type: "mc",
            q: "¿Cómo se produce principalmente un ataque de inyección SQL (SQLi)?",
            options: [
                "Interceptando exclusivamente señales Wi-Fi",
                "Modificando los estilos visuales de una página",
                "Mediante el envío de archivos infectados",
                "Insertando instrucciones SQL maliciosas en entradas de datos"
            ],
            answer: 3,
            why: "El ataque SQLi consiste en insertar instrucciones SQL maliciosas en entradas de datos (formularios, URLs o cabeceras) que se concatenan sin sanitizar."
        },
        {
            type: "tf",
            q: "El principio de menor privilegio establece que cada usuario debe tener únicamente los permisos necesarios para realizar su función.",
            options: ["Verdadero", "Falso"],
            answer: 0,
            why: "Verdadero: cada usuario, proceso o componente recibe solo los permisos estrictamente necesarios y solo durante el tiempo que los necesita."
        },
        {
            type: "mc",
            q: "¿Cuál es la principal ventaja de utilizar consultas preparadas (Prepared Statements)?",
            options: [
                "Aumentar el tamaño de la base de datos",
                "Eliminar la necesidad de validar entradas",
                "Separar los datos de las instrucciones SQL para prevenir inyecciones",
                "Evitar que los usuarios creen contraseñas débiles"
            ],
            answer: 2,
            why: "Al separar datos de instrucciones SQL, el motor nunca interpreta la entrada como código: es la principal defensa contra inyecciones (y sigue validando entradas)."
        },
        {
            type: "tf",
            q: "En una estrategia de programación segura, la seguridad debe agregarse únicamente después de terminar el desarrollo de una aplicación.",
            options: ["Verdadero", "Falso"],
            answer: 1,
            why: "Falso: es Security by Design — la seguridad se diseña desde la primera línea de código; parchearla al final es más caro y deja huecos."
        }
    ];

    const TOTAL = QUESTIONS.length;

    /* ---------- 2. Referencias al DOM ---------- */
    const screens = {
        start: document.getElementById("screenStart"),
        play:  document.getElementById("screenPlay"),
        end:   document.getElementById("screenEnd")
    };

    const ui = {
        progress:  document.getElementById("quizProgress"),
        counter:   document.getElementById("quizCounter"),
        score:     document.getElementById("quizScore"),
        chip:      document.getElementById("quizChip"),
        question:  document.getElementById("quizQuestion"),
        code:      document.getElementById("quizCode"),
        options:   document.getElementById("quizOptions"),
        feedback:  document.getElementById("quizFeedback"),
        nextBtn:   document.getElementById("nextBtn"),
        startBtn:  document.getElementById("startBtn"),
        retryBtn:  document.getElementById("retryBtn"),
        endTitle:  document.getElementById("endTitle"),
        endScore:  document.getElementById("endScore"),
        endPct:    document.getElementById("endPct"),
        endMsg:    document.getElementById("endMsg"),
        ring:      document.getElementById("quizRing"),
        review:    document.getElementById("quizReview")
    };

    const CHIP = {
        vs: "Código · Vulnerable o seguro",
        mc: "Opción múltiple",
        tf: "Verdadero o falso"
    };

    /* ---------- 3. Estado ---------- */
    let index = 0;
    let score = 0;
    let answered = false;
    let results = [];   // { chosen, correct } por pregunta

    /* ---------- 4. Utilidades ---------- */
    function show(name) {
        Object.entries(screens).forEach(([key, node]) => {
            const active = key === name;
            node.hidden = !active;
            if (active) {
                // Reinicia la animación de entrada
                node.style.animation = "none";
                void node.offsetWidth;          // fuerza reflow
                node.style.animation = "";
            }
        });
        window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    }

    function setProgress(pct) {
        ui.progress.style.width = `${Math.max(0, Math.min(100, pct))}%`;
    }

    const labelFor = (q, i) => q.options[i];

    /* ---------- 5. Render de pregunta ---------- */
    function renderQuestion() {
        const q = QUESTIONS[index];
        answered = false;

        ui.counter.textContent = `Pregunta ${index + 1} / ${TOTAL}`;
        ui.score.textContent = `Puntos ${score}`;
        ui.chip.textContent = CHIP[q.type];
        ui.question.textContent = q.q;

        if (q.code) {
            ui.code.textContent = q.code;      // textContent = sin inyección de HTML
            ui.code.hidden = false;
        } else {
            ui.code.hidden = true;
        }

        ui.feedback.hidden = true;
        ui.feedback.textContent = "";
        ui.feedback.className = "quiz-feedback";
        ui.nextBtn.hidden = true;

        // Opciones
        ui.options.innerHTML = "";
        ui.options.className = "quiz-options" + (q.options.length === 2 ? " quiz-options--2" : "");

        q.options.forEach((opt, i) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "quiz-opt";

            if (q.type === "vs") btn.classList.add(i === 0 ? "quiz-opt--bad" : "quiz-opt--good");

            if (q.type === "mc") {
                const key = document.createElement("span");
                key.className = "quiz-opt__key";
                key.textContent = "ABCD"[i];
                btn.appendChild(key);
            }

            const label = document.createElement("span");
            label.className = "quiz-opt__label";
            label.textContent = opt;
            btn.appendChild(label);

            btn.addEventListener("click", () => choose(i));
            ui.options.appendChild(btn);
        });
    }

    /* ---------- 6. Selección de respuesta ---------- */
    function choose(i) {
        if (answered) return;
        const q = QUESTIONS[index];
        if (i >= q.options.length) return;

        answered = true;
        const correct = i === q.answer;
        if (correct) score++;
        results[index] = { chosen: i, correct };

        [...ui.options.children].forEach((btn, j) => {
            btn.disabled = true;
            if (j === q.answer)      btn.classList.add("quiz-opt--correct");
            else if (j === i)        btn.classList.add("quiz-opt--wrong");
            else                     btn.classList.add("quiz-opt--dim");
        });

        ui.score.textContent = `Puntos ${score}`;
        ui.feedback.hidden = false;
        ui.feedback.classList.add(correct ? "quiz-feedback--ok" : "quiz-feedback--bad");
        ui.feedback.textContent = `${correct ? "✔ Correcto." : "✘ Incorrecto."} ${q.why}`;

        ui.nextBtn.hidden = false;
        ui.nextBtn.textContent = index === TOTAL - 1 ? "Ver resultado →" : "Siguiente →";
        ui.nextBtn.focus();
    }

    /* ---------- 7. Siguiente / resultado ---------- */
    function next() {
        if (!answered) return;
        if (index === TOTAL - 1) return finish();
        index++;
        renderQuestion();
        setProgress((index / TOTAL) * 100);
    }

    function finish() {
        setProgress(100);

        const pct = Math.round((score / TOTAL) * 100);
        ui.endTitle.textContent = score === TOTAL ? "¡Puntaje perfecto!" : "¡Terminaste!";
        ui.endScore.textContent = `${score}/${TOTAL}`;
        ui.endPct.textContent = `${pct}%`;
        ui.ring.style.setProperty("--pct", pct);

        ui.endMsg.textContent =
            score === 10 ? "Dominas seguridad web: prevención, detección y buenas prácticas al nivel de un full-stack." :
            score >= 8   ? "¡Excelente! Tienes muy sólidos los fundamentos de las diapositivas 4.2 y 4.3." :
            score >= 6   ? "¡Bien! Aprobarías; revisa en rojo las que fallaste para consolidar." :
            score >= 4   ? "Vas por buen camino, pero conviene repasar el deck antes de exponer." :
                          "Toca repasar las diapositivas 4.2 y 4.3 y volver a intentarlo.";

        // Revisión de respuestas
        ui.review.innerHTML = "";
        QUESTIONS.forEach((q, i) => {
            const r = results[i] || { chosen: -1, correct: false };
            const item = document.createElement("div");
            item.className = `quiz-review__item ${r.correct ? "is-ok" : "is-bad"}`;

            const head = document.createElement("div");
            head.className = "quiz-review__head";
            const num = document.createElement("strong");
            num.textContent = `${i + 1}.`;
            const state = document.createElement("span");
            state.className = r.correct ? "ok" : "danger";
            state.textContent = r.correct ? "✔ Acertaste" : "✘ Fallaste";
            head.append(num, state);

            const text = document.createElement("p");
            text.className = "quiz-review__q";
            text.textContent = q.q;

            const detail = document.createElement("p");
            detail.className = "quiz-review__a";
            const respuesta = r.chosen >= 0 ? labelFor(q, r.chosen) : "Sin responder";
            detail.textContent = r.correct
                ? `Tu respuesta: ${respuesta}`
                : `Tu respuesta: ${respuesta} · Correcta: ${labelFor(q, q.answer)}`;

            item.append(head, text, detail);
            ui.review.appendChild(item);
        });

        show("end");
    }

    /* ---------- 8. Reinicio ---------- */
    function reset(toPlay = false) {
        index = 0;
        score = 0;
        answered = false;
        results = [];
        setProgress(0);
        if (toPlay) {
            renderQuestion();
            show("play");
        } else {
            show("start");
        }
    }

    /* ---------- 9. Eventos ---------- */
    ui.startBtn.addEventListener("click", () => reset(true));
    ui.retryBtn.addEventListener("click", () => reset(true));
    ui.nextBtn.addEventListener("click", next);

    // Teclado: 1-4 para responder, Enter para avanzar
    document.addEventListener("keydown", (e) => {
        if (screens.play.hidden) return;

        if (/^[1-4]$/.test(e.key)) {
            if (answered) return;
            const i = Number(e.key) - 1;
            if (i < QUESTIONS[index].options.length) {
                e.preventDefault();
                choose(i);
            }
        } else if (e.key === "Enter" && answered && e.target !== ui.nextBtn) {
            e.preventDefault();
            next();
        }
    });

    /* ---------- 10. Arranque ---------- */
    setProgress(0);
    show("start");
})();
