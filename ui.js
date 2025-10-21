import { $, $$, Dom } from "./utils.js";
import { SEL } from "./config.js";

export const Sidebar = {
    init() {
        const sidebar = $(SEL.sidebar);
        const overlay = $(SEL.overlay);
        const btn = $(SEL.menuBtn);
        if (!sidebar || !overlay || !btn) return;

        btn.addEventListener("click", () => {
            Dom.toggleClass(SEL.sidebar, "-translate-x-full");
            Dom.toggleClass(SEL.overlay, "hidden");
        });
        overlay.addEventListener("click", () => {
            Dom.addClass(SEL.sidebar, "-translate-x-full");
            Dom.addClass(SEL.overlay, "hidden");
        });
    },
    close() {
        Dom.addClass(SEL.sidebar, "-translate-x-full");
        Dom.addClass(SEL.overlay, "hidden");
    }
};

export const Sections = {
    show(id) {
        $$(SEL.sections).forEach((s) => s.classList.add("hidden"));
        const t = document.getElementById(id);
        if (t) t.classList.remove("hidden");
        Sidebar.close();
    }
};