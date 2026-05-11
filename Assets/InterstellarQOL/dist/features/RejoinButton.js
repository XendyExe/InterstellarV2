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
class RejoinCommand extends StellarCommandsManager_1.BaseCommand {
    constructor(parent) {
        super();
        this.name = "rejoin";
        this.alias = [];
        this.testOnly = false;
        this.arguments = [new StellarCommandsManager_1.OptionsArgument("option", ["", "and-reload"])];
        this.parent = parent;
    }
    execute(option) {
        if (option == "") {
            let disconnect = document.querySelector("#disconnect-popup");
            if (disconnect != null)
                disconnect.style.display = "none";
            StellarAPI_1.default.Game.leaveShip();
            StellarAPI_1.default.joinShip(this.parent.cachedServer, this.parent.cachedData);
        }
        else if (option == "and-reload") {
            sessionStorage.setItem("isqol-rejoin", JSON.stringify([0, this.parent.cachedServer, this.parent.cachedData]));
            location.reload();
        }
    }
}
class RejoinButton {
    constructor() {
        var _a;
        this.exitShipButton = document.querySelector("#exit_button");
        this.button = document.createElement("button");
        this.cached = false;
        this.hasShifted = false;
        this.button.classList.add("btn-red", "btn-small");
        (_a = document.querySelector(".button-container")) === null || _a === void 0 ? void 0 : _a.insertBefore(this.button, document.getElementById("team_manager_button"));
        this.button.innerHTML = `<i class="fas fa-door-open"></i> Rejoin`;
        this.button.disabled = true;
        StellarEventManager_1.default.addEventListener(InterstellarEvents_1.JoinShipRequestEvent, this.onShipJoin.bind(this));
        StellarEventManager_1.default.addTriggerListener(InterstellarEvents_1.TriggerEvent.FRAME_START, this.tick.bind(this));
        this.button.addEventListener("click", this.click.bind(this));
        let rejoin = sessionStorage.getItem("isqol-rejoin");
        if (rejoin) {
            let data = JSON.parse(rejoin);
            if (data[0] == 0) {
                StellarAPI_1.default.joinShip(data[1], data[2]);
            }
            sessionStorage.removeItem("isqol-rejoin");
        }
        let rejoinCache = sessionStorage.getItem("isqol-rejoin-cache");
        if (rejoinCache) {
            let data = JSON.parse(rejoinCache);
            this.cached = true;
            this.cachedServer = data[1];
            this.cachedData = data[2];
        }
        this.exitShipButton.setAttribute("onclick", "");
        this.exitShipButton.onclick = this.onExitShip.bind(this);
        StellarCommandsManager_1.default.registerCommand(new RejoinCommand(this));
    }
    onExitShip() {
        if (StellarAPI_1.default.Input.keyDown("ShiftLeft") && StellarAPI_1.default.isCaptain()) {
            StellarAPI_1.default.sendPacket({
                type: StellarAPI_1.default.Packet.ClMsgTeamAct,
                act: "save_team",
                arg: null
            });
        }
        else
            StellarAPI_1.default.Game.leaveShip();
    }
    tick() {
        if (StellarAPI_1.default.Input.keyDown("ShiftLeft")) {
            if (!this.hasShifted) {
                this.button.innerHTML = `<i class="fas fa-door-open"></i> Reload + Rejoin`;
                if (StellarAPI_1.default.isCaptain())
                    this.exitShipButton.innerHTML = `<i class="fas fa-door-open"></i> Save Ship`;
            }
            this.hasShifted = true;
        }
        else {
            if (this.hasShifted) {
                this.button.innerHTML = `<i class="fas fa-door-open"></i> Rejoin`;
                this.exitShipButton.innerHTML = `<i class="fas fa-door-open"></i> Exit Ship`;
            }
            this.hasShifted = false;
        }
    }
    click() {
        if (!this.cached)
            return;
        if (StellarAPI_1.default.Input.keyDown("ShiftLeft")) {
            sessionStorage.setItem("isqol-rejoin", JSON.stringify([0, this.cachedServer, this.cachedData]));
            location.reload();
        }
        else {
            let disconnect = document.querySelector("#disconnect-popup");
            if (disconnect != null)
                disconnect.style.display = "none";
            StellarAPI_1.default.Game.leaveShip();
            StellarAPI_1.default.joinShip(this.cachedServer, this.cachedData);
        }
    }
    onShipJoin(event) {
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
exports.default = RejoinButton;
