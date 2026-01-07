"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const InterstellarEvents_1 = require("@interstellar/InterstellarEvents");
const StellarAPI_1 = __importDefault(require("@interstellar/StellarAPI"));
const StellarEventManager_1 = __importDefault(require("@interstellar/StellarEventManager"));
function clamp(num, min, max) {
    return Math.max(Math.min(num, max), min);
}
class ZoomOpacity {
    constructor() {
        this.overrideOpacity = 1;
        this.elements = {
            chat: document.querySelector("#chat"),
            inventory: document.querySelector("#item-ui-container"),
            motd: document.querySelector("#motd"),
            bottom: document.querySelector("#content-bottom"),
            top: document.querySelector("#top-bar")
        };
        document.addEventListener('mousemove', (event) => {
            const mouseX = event.clientX;
            const mouseY = event.clientY;
            const yp = mouseY / window.innerHeight;
            let bottomPer = (yp) - 0.8;
            let topPer = (1 - yp) - 0.9;
            topPer = Math.min(Math.max(topPer, 0), 0.1);
            let motdPer = 0;
            if (this.elements !== undefined && this.elements.motd !== undefined) {
                const rect = this.elements.motd.getBoundingClientRect();
                const closestX = Math.max(rect.left, Math.min(mouseX, rect.right));
                const closestY = Math.max(rect.top, Math.min(mouseY, rect.bottom));
                const dx = closestX - mouseX;
                const dy = closestY - mouseY;
                let hype = Math.sqrt(window.innerWidth * window.innerWidth + window.innerHeight * window.innerHeight);
                motdPer = (1 - Math.sqrt(dx * dx + dy * dy) / hype) - 0.95;
                motdPer = Math.min(Math.max(motdPer, 0), 0.1) * 2;
            }
            if (bottomPer < 0)
                bottomPer = 0;
            if (bottomPer > 0.1)
                bottomPer = 0.1;
            this.overrideOpacity = Math.max(bottomPer, topPer, motdPer) * 10;
        });
        StellarEventManager_1.default.addTriggerListener(InterstellarEvents_1.TriggerEvent.FRAME_END, this.tick.bind(this));
    }
    tick() {
        let zoom = StellarAPI_1.default.Game.getZoom();
        zoom += this.overrideOpacity;
        let minZoom = clamp(zoom * 100 + 20, 0, 100);
        zoom = clamp(zoom * 100, 0, 100);
        if (zoom < 10)
            zoom = 0;
        if (this.elements.chat.classList.contains("closed")) {
            this.elements.chat.style.opacity = `${minZoom}%`;
        }
        else {
            this.elements.chat.style.opacity = "100%";
        }
        this.elements.inventory.style.opacity = `${zoom}%`;
        this.elements.motd.style.opacity = `${minZoom}%`;
        this.elements.bottom.style.opacity = `${zoom}%`;
        this.elements.top.style.opacity = `${zoom}%`;
    }
}
exports.default = new ZoomOpacity();
