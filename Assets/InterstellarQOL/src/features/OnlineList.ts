import { TriggerEvent } from "@interstellar/InterstellarEvents";
import StellarAPI, { PlayerState, ShipState } from "@interstellar/StellarAPI";
import StellarCommandsManager, { BaseCommand, OptionsArgument } from "@interstellar/StellarCommandsManager";
import StellarEventManager from "@interstellar/StellarEventManager";

class OnlineListCommand extends BaseCommand{
    name = "onlinelist"
    alias = ["tablist"];
    arguments = [new OptionsArgument("", ["", "show", "hide", "toggle"])];
    testOnly = false;

    parent: OnlineList;
    constructor(parent: OnlineList) {
        super();
        this.parent = parent;
    }
    execute(arg: string) {
        if (arg == "hide") this.parent.hide();
        else if (arg == "show") this.parent.show();
        else {
            if (this.parent.opened) this.parent.hide();
            else this.parent.show();
        }
    }
    
}


export default class OnlineList {
    opened: boolean = false;
    tablistContainer: HTMLDivElement = document.createElement("div");
    constructor() {
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

        StellarCommandsManager.registerCommand(new OnlineListCommand(this));
        StellarEventManager.addTriggerListener(TriggerEvent.CONSTANT_TICK, this.constantTick.bind(this));
    }

    constantTick () {
        if (!this.opened) return;
        this.updateTablist();
    }


    private shipElements: Map<string, HTMLDivElement> = new Map();
    private shipSnapshots: Map<string, string> = new Map();

    updateTablist() {
        const currentWorldId = StellarAPI.Game.getCurrentShipID().toString();
        const worldState = StellarAPI.Game.getWorldState();

        const orderedIds: string[] = [];
        const localState = StellarAPI.Game.getLocalShipState();
        if (localState) orderedIds.push(currentWorldId);

        for (const id of Object.keys(worldState)) {
            if (id === "current_world" || id === currentWorldId) continue;
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
                ? localState!
                : StellarAPI.Game.getShipState(id);
            if (!state) continue;
            const snapshot = JSON.stringify(state);
            if (this.shipSnapshots.get(id) === snapshot) continue;
            this.shipSnapshots.set(id, snapshot);

            if (this.shipElements.has(id)) {
                this.patchShipEntry(this.shipElements.get(id)!, state);
            } else {
                const el = this.createShipTablistEntry(state);
                this.shipElements.set(id, el);
            }
        }
        orderedIds.forEach((id, i) => {
            const el = this.shipElements.get(id);
            if (!el) return;
            const current = this.tablistContainer.children[i];
            if (current !== el) this.tablistContainer.insertBefore(el, current ?? null);
        });
    }

    private patchShipEntry(element: HTMLDivElement, state: ShipState) {
        const nameEl = element.querySelector<HTMLSpanElement>(".ship-name")!;
        if (nameEl.textContent !== state.name) nameEl.textContent = state.name;

        const sorted = Object.entries(state.players)
            .sort(([, a], [, b]) => b.rank - a.rank);

        const existingRows = new Map<string, HTMLDivElement>(
            [...element.querySelectorAll<HTMLDivElement>("[data-player-id]")]
                .map(el => [el.dataset.playerId!, el])
        );

        const seenIds = new Set<string>();

        for (const [playerId, player] of sorted) {
            seenIds.add(playerId);
            if (existingRows.has(playerId)) {
                this.patchPlayerRow(existingRows.get(playerId)!, player);
            } else {
                existingRows.set(playerId, this.createPlayerRow(playerId, player));
            }
        }

        for (const [playerId, el] of existingRows) {
            if (!seenIds.has(playerId)) el.remove();
        }

        sorted.forEach(([playerId], i) => {
            const row = existingRows.get(playerId);
            if (!row) return;
            const current = element.children[i + 1]; // +1 skips .ship-name
            if (current !== row) element.insertBefore(row, current ?? null);
        });
    }

    private patchPlayerRow(row: HTMLDivElement, player: PlayerState) {
        const prevRank = Number(row.dataset.rank);
        if (prevRank !== player.rank) {
            row.dataset.rank = String(player.rank);
            row.querySelector(".player-badge")?.remove();
            const badge = this.createRankBadge(player.rank);
            if (badge) {
                row.insertBefore(badge, row.firstChild);
            }
        }

        const nameEl = row.querySelector<HTMLSpanElement>(".player-name")!;
        if (nameEl.textContent !== player.name) nameEl.textContent = player.name;
    }

    private createRankBadge(rank: number): DocumentFragment | null {
        if (rank !== 3 && rank !== 1) return null;

        const frag = document.createDocumentFragment();
        const badge = document.createElement("span");
        badge.className = "player-badge";

        if (rank === 3) {
            badge.textContent = "[Captain]";
            badge.style.color = "#0FF";
        } else {
            badge.textContent = "[Crew]";
            badge.style.color = "#FF0";
        }

        frag.appendChild(badge);
        frag.append("\u00a0");
        return frag;
    }


    createShipTablistEntry(state: ShipState): HTMLDivElement {
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

    private createPlayerRow(playerId: string, player: PlayerState): HTMLDivElement {
        const row = document.createElement("div");
        row.dataset.playerId = playerId;
        row.dataset.rank = String(player.rank);

        const badge = this.createRankBadge(player.rank);
        if (badge) row.appendChild(badge);

        const nameEl = document.createElement("span");
        nameEl.className = "player-name";
        nameEl.textContent = player.name;
        row.appendChild(nameEl);

        return row;
    }


    show() {
        if (this.opened) return;
        this.opened = true;
        this.tablistContainer.style.display = "flex";
        this.updateTablist();
    }

    hide() {
        if (!this.opened) return;
        this.opened = false;
        this.tablistContainer.style.display = "none";
    }
}