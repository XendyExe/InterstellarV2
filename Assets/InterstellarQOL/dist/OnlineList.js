"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const StellarAPI_1 = __importDefault(require("@interstellar/StellarAPI"));
class OnlineList {
    constructor() {
        this.opened = false;
        this.tablistContainer = document.createElement("div");
        this.tablistContainer.style.pointerEvents = "none";
        this.tablistContainer.style.zIndex = "999999999";
        this.tablistContainer.style.width = "100%";
        this.tablistContainer.style.height = "100%";
        this.tablistContainer.style.overflow = "";
        this.tablistContainer.style.display = "none";
        document.body.appendChild(this.tablistContainer);
    }
    constantTick() {
        if (!this.opened)
            return;
        this.updateTablist();
    }
    updateTablist() {
        let current_world = StellarAPI_1.default.Game.getCurrentShipID();
        let worlds = Object.keys(StellarAPI_1.default.Game.getWorldState()).filter((m) => (m != "current_world" && m != current_world.toString()));
        this.tablistContainer.innerHTML = "";
        for (let world_id of worlds) {
            let world = StellarAPI_1.default.Game.getShipState(world_id);
            this.tablistContainer.append(this.createShipTablistEntry(world));
        }
        let currentState = StellarAPI_1.default.Game.getLocalShipState();
        if (currentState)
            this.tablistContainer.prepend(this.createShipTablistEntry(currentState));
    }
    createShipTablistEntry(state) {
        let element = document.createElement("div");
        element.style.backgroundColor = "#00000055";
        element.style.display = "flex";
        element.style.flexDirection = "column";
        for (let [_, players] of Object.entries(state.players)) {
            let entryElement = document.createElement("div");
            entryElement.innerHTML = `<span>${players.name}<span>`;
        }
        return element;
    }
    show() {
        this.opened = true;
        this.tablistContainer.style.display = "";
        this.updateTablist();
    }
    hide() {
        this.opened = false;
        this.tablistContainer.style.display = "none";
    }
}
