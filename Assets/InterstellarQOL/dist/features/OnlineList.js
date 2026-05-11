"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const InterstellarEvents_1 = require("@interstellar/InterstellarEvents");
const StellarAPI_1 = __importDefault(require("@interstellar/StellarAPI"));
const StellarCommandsManager_1 = __importStar(require("@interstellar/StellarCommandsManager"));
const StellarEventManager_1 = __importDefault(require("@interstellar/StellarEventManager"));
class OnlineListCommand extends StellarCommandsManager_1.BaseCommand {
    constructor(parent) {
        super();
        this.name = "onlinelist";
        this.alias = ["tablist"];
        this.arguments = [new StellarCommandsManager_1.OptionsArgument("", ["", "show", "hide", "toggle"])];
        this.testOnly = false;
        this.parent = parent;
    }
    execute(arg) {
        if (arg == "hide")
            this.parent.hide();
        else if (arg == "show")
            this.parent.show();
        else {
            if (this.parent.opened)
                this.parent.hide();
            else
                this.parent.show();
        }
    }
}
class OnlineList {
    constructor() {
        this.opened = false;
        this.tablistContainer = document.createElement("div");
        this.shipElements = new Map();
        this.shipSnapshots = new Map();
        this.tablistContainer.style.pointerEvents = "none";
        this.tablistContainer.style.zIndex = "999999999";
        this.tablistContainer.style.width = "100%";
        this.tablistContainer.style.height = "100%";
        this.tablistContainer.style.overflow = "";
        this.tablistContainer.style.display = "none";
        this.tablistContainer.style.position = "absolute";
        this.tablistContainer.style.flexDirection = "row";
        this.tablistContainer.style.flexWrap = "wrap";
        this.tablistContainer.style.alignItems = "flex-start";
        this.tablistContainer.style.alignContent = "flex-start";
        this.tablistContainer.style.gap = "8px";
        this.tablistContainer.style.padding = "16px";
        document.body.appendChild(this.tablistContainer);
        StellarCommandsManager_1.default.registerCommand(new OnlineListCommand(this));
        StellarEventManager_1.default.addTriggerListener(InterstellarEvents_1.TriggerEvent.CONSTANT_TICK, this.constantTick.bind(this));
    }
    constantTick() {
        if (!this.opened)
            return;
        this.updateTablist();
    }
    updateTablist() {
        const currentWorldId = StellarAPI_1.default.Game.getCurrentShipID().toString();
        const worldState = StellarAPI_1.default.Game.getWorldState();
        const orderedIds = [];
        const localState = StellarAPI_1.default.Game.getLocalShipState();
        if (localState)
            orderedIds.push(currentWorldId);
        for (const id of Object.keys(worldState)) {
            if (id === "current_world" || id === currentWorldId)
                continue;
            orderedIds.push(id);
        }
        for (const [id, el] of this.shipElements) {
            if (!orderedIds.includes(id)) {
                el.remove();
                this.shipElements.delete(id);
                this.shipSnapshots.delete(id);
            }
        }
        for (const id of orderedIds) {
            const state = id === currentWorldId
                ? localState
                : StellarAPI_1.default.Game.getShipState(id);
            if (!state)
                continue;
            const snapshot = JSON.stringify(state);
            if (this.shipSnapshots.get(id) === snapshot)
                continue;
            this.shipSnapshots.set(id, snapshot);
            if (this.shipElements.has(id)) {
                this.patchShipEntry(this.shipElements.get(id), state);
            }
            else {
                const el = this.createShipTablistEntry(state);
                this.shipElements.set(id, el);
            }
        }
        orderedIds.forEach((id, i) => {
            const el = this.shipElements.get(id);
            if (!el)
                return;
            const current = this.tablistContainer.children[i];
            if (current !== el)
                this.tablistContainer.insertBefore(el, current !== null && current !== void 0 ? current : null);
        });
    }
    patchShipEntry(element, state) {
        const nameEl = element.querySelector(".ship-name");
        if (nameEl.textContent !== state.name)
            nameEl.textContent = state.name;
        const sorted = Object.entries(state.players)
            .sort(([, a], [, b]) => b.rank - a.rank);
        const existingRows = new Map([...element.querySelectorAll("[data-player-id]")]
            .map(el => [el.dataset.playerId, el]));
        const seenIds = new Set();
        for (const [playerId, player] of sorted) {
            seenIds.add(playerId);
            if (existingRows.has(playerId)) {
                this.patchPlayerRow(existingRows.get(playerId), player);
            }
            else {
                existingRows.set(playerId, this.createPlayerRow(playerId, player));
            }
        }
        for (const [playerId, el] of existingRows) {
            if (!seenIds.has(playerId))
                el.remove();
        }
        sorted.forEach(([playerId], i) => {
            const row = existingRows.get(playerId);
            if (!row)
                return;
            const current = element.children[i + 1]; // +1 skips .ship-name
            if (current !== row)
                element.insertBefore(row, current !== null && current !== void 0 ? current : null);
        });
    }
    patchPlayerRow(row, player) {
        var _a;
        const prevRank = Number(row.dataset.rank);
        if (prevRank !== player.rank) {
            row.dataset.rank = String(player.rank);
            (_a = row.querySelector(".player-badge")) === null || _a === void 0 ? void 0 : _a.remove();
            const badge = this.createRankBadge(player.rank);
            if (badge) {
                row.insertBefore(badge, row.firstChild);
            }
        }
        const nameEl = row.querySelector(".player-name");
        if (nameEl.textContent !== player.name)
            nameEl.textContent = player.name;
    }
    createRankBadge(rank) {
        if (rank !== 3 && rank !== 1)
            return null;
        const frag = document.createDocumentFragment();
        const badge = document.createElement("span");
        badge.className = "player-badge";
        if (rank === 3) {
            badge.textContent = "[Captain]";
            badge.style.color = "#0FF";
        }
        else {
            badge.textContent = "[Crew]";
            badge.style.color = "#FF0";
        }
        frag.appendChild(badge);
        frag.append("\u00a0");
        return frag;
    }
    createShipTablistEntry(state) {
        const element = document.createElement("div");
        element.style.cssText = `
            background-color: #000000a9; display: flex; flex-direction: column;
            width: 304px; color: white; padding: 4px; border: 1px solid white;
        `;
        const nameEl = document.createElement("span");
        nameEl.className = "ship-name";
        nameEl.style.cssText = "color: #ffffff; font-size: 20px;";
        nameEl.textContent = state.name;
        element.appendChild(nameEl);
        const sorted = Object.entries(state.players)
            .sort(([, a], [, b]) => b.rank - a.rank);
        for (const [playerId, player] of sorted) {
            element.appendChild(this.createPlayerRow(playerId, player));
        }
        return element;
    }
    createPlayerRow(playerId, player) {
        const row = document.createElement("div");
        row.dataset.playerId = playerId;
        row.dataset.rank = String(player.rank);
        const badge = this.createRankBadge(player.rank);
        if (badge)
            row.appendChild(badge);
        const nameEl = document.createElement("span");
        nameEl.className = "player-name";
        nameEl.textContent = player.name;
        row.appendChild(nameEl);
        return row;
    }
    show() {
        if (this.opened)
            return;
        this.opened = true;
        this.tablistContainer.style.display = "flex";
        this.updateTablist();
    }
    hide() {
        if (!this.opened)
            return;
        this.opened = false;
        this.tablistContainer.style.display = "none";
    }
}
exports.default = OnlineList;
