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
const StellarAPI_1 = __importDefault(require("@interstellar/StellarAPI"));
const StellarCommandsManager_1 = __importStar(require("@interstellar/StellarCommandsManager"));
const __1 = __importDefault(require(".."));
const StellarEventManager_1 = __importDefault(require("@interstellar/StellarEventManager"));
const InterstellarEvents_1 = require("@interstellar/InterstellarEvents");
const EventTrack_1 = require("./EventTrack");
class PitsSpeedrunCommand extends StellarCommandsManager_1.BaseCommand {
    constructor(parent) {
        super();
        this.name = "pitsspeedrun";
        this.alias = [""];
        this.testOnly = false;
        this.arguments = [new StellarCommandsManager_1.OptionsArgument("option", ["", "start", "stop"])];
        this.parent = parent;
    }
    execute(option) {
        if (option == "" || option == "start") {
            this.parent.start();
        }
        else if (option == "end") {
            this.parent.end();
        }
    }
}
var SpeedrunState;
(function (SpeedrunState) {
    SpeedrunState[SpeedrunState["WAITING_MISSION"] = 0] = "WAITING_MISSION";
    SpeedrunState[SpeedrunState["RAVEN_TRAVELING"] = 1] = "RAVEN_TRAVELING";
    SpeedrunState[SpeedrunState["PITS_TRAVELING"] = 2] = "PITS_TRAVELING";
    SpeedrunState[SpeedrunState["DOING_PITS"] = 3] = "DOING_PITS";
    SpeedrunState[SpeedrunState["COMPLETE"] = 4] = "COMPLETE";
})(SpeedrunState || (SpeedrunState = {}));
var PitState;
(function (PitState) {
    PitState[PitState["NONE"] = 0] = "NONE";
    PitState[PitState["BURROWING"] = 1] = "BURROWING";
    PitState[PitState["DIGGING"] = 2] = "DIGGING";
    PitState[PitState["ESCAPING"] = 3] = "ESCAPING";
    PitState[PitState["DONE"] = 4] = "DONE";
})(PitState || (PitState = {}));
class PitsSpeedrun {
    constructor() {
        this.started = false;
        this.state = SpeedrunState.WAITING_MISSION;
        this.motd = "";
        this.pitsLog = "";
        this.pitState = PitState.NONE;
        this.masterTimer = 0;
        this.timer = 0;
        this.enteredPitsTime = 0;
        this.activePit = 0;
        this.lastMOTDTime = 0;
        StellarCommandsManager_1.default.registerCommand(new PitsSpeedrunCommand(this));
        StellarEventManager_1.default.addTriggerListener(InterstellarEvents_1.TriggerEvent.CONSTANT_TICK, this.constantTick.bind(this));
        StellarEventManager_1.default.addTriggerListener(InterstellarEvents_1.TriggerEvent.FRAME_START, this.tick.bind(this));
        StellarEventManager_1.default.addEventListener(InterstellarEvents_1.SocketCloseEvent, this.onDisconnect.bind(this));
    }
    onDisconnect(e) {
        if (this.started) {
            __1.default.logMessage("Disabled pits speedrun tool due to socket disconnect.");
            this.started = false;
        }
    }
    tick() {
        if (!this.started)
            return;
        let currentZone = StellarAPI_1.default.Game.getCurrentZone();
        let y = StellarAPI_1.default.Game.getCameraWorldY();
        switch (this.state) {
            case SpeedrunState.WAITING_MISSION:
                if (currentZone == "Raven") {
                    this.state = SpeedrunState.RAVEN_TRAVELING;
                    break;
                }
            case SpeedrunState.RAVEN_TRAVELING:
                if (currentZone == "The Pits") {
                    StellarAPI_1.default.sendChat("Entered pits! Starting speedrun timer...", false);
                    this.setEnterTime();
                    this.state = SpeedrunState.PITS_TRAVELING;
                }
                if (currentZone != "Raven") {
                    this.state = SpeedrunState.WAITING_MISSION;
                }
                break;
            case SpeedrunState.PITS_TRAVELING:
                let activePit = this.getPitNumber();
                if (y < 245) {
                    this.activePit = activePit;
                    StellarAPI_1.default.sendChat(`Starting pits A${this.activePit + 1}`, false);
                    this.state = SpeedrunState.DOING_PITS;
                    this.pitState = PitState.BURROWING;
                }
                break;
            case SpeedrunState.DOING_PITS:
                if (this.getPitNumber() != this.activePit) {
                    this.state = SpeedrunState.PITS_TRAVELING;
                }
                switch (this.pitState) {
                    case PitState.BURROWING: {
                        if (y < 60) {
                            StellarAPI_1.default.sendChat("Burrowed in todo sec...", false);
                            this.pitState = PitState.DIGGING;
                        }
                        break;
                    }
                    case PitState.DIGGING: {
                        if (y > 100) {
                            StellarAPI_1.default.sendChat("Finished digging in todo sec...", false);
                            this.pitState = PitState.ESCAPING;
                        }
                        break;
                    }
                    case PitState.ESCAPING: {
                        if (y > 260) {
                            StellarAPI_1.default.sendChat(`Successfully completed A${this.activePit} pits in todo time !`, false);
                            this.pitState = PitState.NONE;
                            this.state = SpeedrunState.PITS_TRAVELING;
                        }
                        break;
                    }
                }
                break;
        }
    }
    constantTick() {
        if (!this.started)
            return;
        if (Date.now() - this.lastMOTDTime > 100) {
            this.setMOTD();
            this.lastMOTDTime = Date.now();
        }
    }
    setMOTD() {
        let motd = this.motd + "\n[InterstellarQOL Pits Speedrun Tool]\n";
        motd += `You are at: ${Math.round(StellarAPI_1.default.Game.getCameraWorldX() * 100) / 100}, ${Math.round(StellarAPI_1.default.Game.getCameraWorldY() * 100) / 100} which is pits A${this.getPitNumber() + 1}\n`;
        switch (this.state) {
            case SpeedrunState.WAITING_MISSION:
            case SpeedrunState.RAVEN_TRAVELING:
                if (this.state == SpeedrunState.WAITING_MISSION) {
                    motd += "Currently waiting in freeport...\n";
                }
                else {
                    motd += "Traveling to the pits...\n";
                }
                let eventTimes = "";
                let eventData = StellarAPI_1.default.Telemetry.getEventState();
                for (let [id, name] of Object.entries(StellarAPI_1.default.Telemetry.getEventSchema())) {
                    let trackerData = eventData[id];
                    let formatted = (0, EventTrack_1.getFormattedEventTime)(trackerData.time, trackerData.event);
                    eventTimes += `${formatted[0]} ${name} ${formatted[1]}\n`;
                }
                motd += eventTimes;
                break;
            case SpeedrunState.PITS_TRAVELING:
                motd += "Traveling to the next pit...\n";
                break;
            case SpeedrunState.DOING_PITS:
                motd += `Completing pit A${this.activePit + 1}...\n`;
                break;
            case SpeedrunState.COMPLETE:
                motd += "Pits complete!";
                break;
        }
        StellarAPI_1.default.sendPacket({ "type": StellarAPI_1.default.Packet.ClMsgTeamAct, "act": "motd", "arg": motd });
    }
    setEnterTime() {
        this.masterTimer = Date.now();
    }
    start() {
        if (StellarAPI_1.default.Telemetry.isDisabled()) {
            __1.default.logMessage("Pits Speedrun Tool requires telemetry (because Xendy is Lazy)!");
            return;
        }
        if (this.started) {
            __1.default.logMessage("Pits Speedrun Tool is already started!");
            return;
        }
        this.started = true;
        if (StellarAPI_1.default.Game.getCurrentZone() == "Freeport")
            this.state = SpeedrunState.WAITING_MISSION;
        else if (StellarAPI_1.default.Game.getCurrentZone() == "Raven")
            this.state = SpeedrunState.RAVEN_TRAVELING;
        else if (StellarAPI_1.default.Game.getCurrentZone() == "The Pits") {
            this.state = SpeedrunState.PITS_TRAVELING;
            this.setEnterTime();
        }
        StellarAPI_1.default.sendChat("[ISQOL] Started pits speedrun tool !", false);
        this.motd = document.querySelector("#motd-text").textContent.split("\n[InterstellarQOL Pits Speedrun Tool]")[0];
    }
    end() {
        if (StellarAPI_1.default.Telemetry.isDisabled()) {
            __1.default.logMessage("Pits Speedrun Tool requires telemetry (because Xendy is Lazy)!");
            return;
        }
        if (!this.started) {
            __1.default.logMessage("Pits Speedrun Tool is not started!");
            return;
        }
    }
    // 245: Enter Pit
    // 60: Dig
    // 100: Escape
    getPitNumber() {
        let x = StellarAPI_1.default.Game.getCameraWorldX();
        if (x > 745)
            return 3;
        if (x > 492)
            return 2;
        if (x > 245)
            return 1;
        return 0;
    }
}
exports.default = PitsSpeedrun;
