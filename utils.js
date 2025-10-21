export const $ = (sel) => document.querySelector(sel);
export const $$ = (sel) => document.querySelectorAll(sel);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const Toast = {
    show(msg, duration = 2000) {
        const t = document.createElement("div");
        t.className = "toast";
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => t.classList.add("show"), 50);
        setTimeout(() => {
            t.classList.remove("show");
            setTimeout(() => t.remove(), 300);
        }, duration);
    }
};

export const Dom = {
    setText(sel, text) { const el = $(sel); if (el) el.textContent = text; },
    setColor(sel, color) { const el = $(sel); if (el) el.style.color = color; },
    setBg(sel, color) { const el = $(sel); if (el) el.style.backgroundColor = color; },
    addClass(sel, cls) { const el = $(sel); if (el) el.classList.add(cls); },
    removeClass(sel, cls) { const el = $(sel); if (el) el.classList.remove(cls); },
    toggleClass(sel, cls) { const el = $(sel); if (el) el.classList.toggle(cls); }
};
