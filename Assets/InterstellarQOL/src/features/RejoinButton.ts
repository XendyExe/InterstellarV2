import { JoinShipRequestEvent, TriggerEvent } from "@interstellar/InterstellarEvents";
import StellarAPI from "@interstellar/StellarAPI";
import StellarCommandsManager, { BaseCommand, OptionsArgument } from "@interstellar/StellarCommandsManager";
import StellarEventManager from "@interstellar/StellarEventManager";

class RejoinCommand extends BaseCommand {
    name = "rejoin"
    alias = []
    testOnly = false;
    arguments = [new OptionsArgument("option", ["", "and-reload"])]

    parent: RejoinButton;
    constructor(parent: RejoinButton) {
        super();
        this.parent = parent;
    }
    execute(option: string) {
        if (option == "") {
            let disconnect = document.querySelector("#disconnect-popup");
            if (disconnect != null) (disconnect as HTMLDivElement).style.display = "none";
            StellarAPI.Game.leaveShip();
            StellarAPI.joinShip(this.parent.cachedServer!!, this.parent.cachedData);
        } else if (option == "and-reload") {
            sessionStorage.setItem("isqol-rejoin", JSON.stringify([0, this.parent.cachedServer, this.parent.cachedData]));
            location.reload();
        }
    }
}

export default class RejoinButton {
    exitShipButton: HTMLButtonElement = document.querySelector("#exit_button")!!;
    button: HTMLButtonElement = document.createElement("button");
    
    cached = false;
    cachedServer: number | null | undefined;
    cachedData: any;
    constructor() {
        this.button.classList.add("btn-red", "btn-small");
        document.querySelector(".button-container")?.insertBefore(this.button, document.getElementById("team_manager_button")!!);
        this.button.innerHTML = `<i class="fas fa-door-open"></i> Rejoin`;
        this.button.disabled = true;

        StellarEventManager.addEventListener(JoinShipRequestEvent, this.onShipJoin.bind(this));
        StellarEventManager.addTriggerListener(TriggerEvent.FRAME_START, this.tick.bind(this));
        this.button.addEventListener("click", this.click.bind(this));
        let rejoin = sessionStorage.getItem("isqol-rejoin")
        if (rejoin) {
            let data: [number, number | null, any] = JSON.parse(rejoin);
            if (data[0] == 0) {
                StellarAPI.joinShip(data[1], data[2]);
            }
            sessionStorage.removeItem("isqol-rejoin");
        }

        let rejoinCache = sessionStorage.getItem("isqol-rejoin-cache");
        if (rejoinCache) {
            let data: [number, number | null, any] = JSON.parse(rejoinCache);
            this.cached = true;
            this.cachedServer = data[1];
            this.cachedData = data[2];
        }

        this.exitShipButton.setAttribute("onclick", "")
        this.exitShipButton.onclick = this.onExitShip.bind(this);
        StellarCommandsManager.registerCommand(new RejoinCommand(this));
    }

    onExitShip() {
        if (StellarAPI.Input.keyDown("ShiftLeft") && StellarAPI.isCaptain()) {
            StellarAPI.sendPacket({
                type: StellarAPI.Packet.ClMsgTeamAct,
                act: "save_team",
                arg: null
            })
        } else StellarAPI.Game.leaveShip();
    }

    hasShifted = false;
    tick() {
        if (StellarAPI.Input.keyDown("ShiftLeft")) {
            if (!this.hasShifted) {
                this.button.innerHTML = `<i class="fas fa-door-open"></i> Reload + Rejoin`
                if (StellarAPI.isCaptain()) this.exitShipButton.innerHTML = `<i class="fas fa-door-open"></i> Save Ship`
            }
            this.hasShifted = true;
        }
        else {
            if (this.hasShifted) {
                this.button.innerHTML = `<i class="fas fa-door-open"></i> Rejoin`
                this.exitShipButton.innerHTML = `<i class="fas fa-door-open"></i> Exit Ship`
            }
            this.hasShifted = false;
        }
    }

    click() {
        if (!this.cached) return;
        if (StellarAPI.Input.keyDown("ShiftLeft")) {
            sessionStorage.setItem("isqol-rejoin", JSON.stringify([0, this.cachedServer, this.cachedData]));
            location.reload();
        } else {
            let disconnect = document.querySelector("#disconnect-popup");
            if (disconnect != null) (disconnect as HTMLDivElement).style.display = "none";
            StellarAPI.Game.leaveShip();
            StellarAPI.joinShip(this.cachedServer!!, this.cachedData);
        }
    }

    onShipJoin(event: JoinShipRequestEvent) {
        if (event.data.type == "new" || event.data.type == "labs") {
            sessionStorage.removeItem("isqol-rejoin-cache");
            this.button.disabled = true;
            this.cached = false;
            return;
        }
        this.cached = true;
        this.cachedServer = event.server;
        this.cachedData = event.data;
        this.button.disabled = false;
        sessionStorage.setItem("isqol-rejoin-cache", JSON.stringify([0, this.cachedServer, this.cachedData]));
    }
}