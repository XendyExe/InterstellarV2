import StellarAPI from "@interstellar/StellarAPI";
import StellarCommandsManager, { BaseCommand, OptionsArgument } from "@interstellar/StellarCommandsManager";
import InterstellarQOL from "..";
import StellarEventManager from "@interstellar/StellarEventManager";
import { SocketCloseEvent, TriggerEvent } from "@interstellar/InterstellarEvents";
import { getFormattedEventTime } from "./EventTrack";

class PitsSpeedrunCommand extends BaseCommand {
    name = "pitsspeedrun"
    alias = [""]
    testOnly = false;
    arguments = [new OptionsArgument("option", ["", "start", "stop"])]

    parent: PitsSpeedrun;
    constructor(parent: PitsSpeedrun) {
        super();
        this.parent = parent;
    }
    execute(option: string) {
        if (option == "" || option == "start") {
            this.parent.start();
        } else if (option == "end") {
            this.parent.end();
        }
    }
}

enum SpeedrunState {
    WAITING_MISSION,
    RAVEN_TRAVELING,
    PITS_TRAVELING,
    DOING_PITS,
    COMPLETE
}

enum PitState {
    NONE,
    BURROWING,
    DIGGING,
    ESCAPING,
    DONE
}

export default class PitsSpeedrun {
    started = false;
    state = SpeedrunState.WAITING_MISSION;
    motd = ""
    pitsLog = ""
    pitState = PitState.NONE;

    masterTimer = 0;
    timer = 0;
    enteredPitsTime = 0;
    activePit = 0;
    constructor() {
        StellarCommandsManager.registerCommand(new PitsSpeedrunCommand(this));
        StellarEventManager.addTriggerListener(TriggerEvent.CONSTANT_TICK, this.constantTick.bind(this));
        StellarEventManager.addTriggerListener(TriggerEvent.FRAME_START, this.tick.bind(this));
        StellarEventManager.addEventListener(SocketCloseEvent, this.onDisconnect.bind(this))
    }

    onDisconnect(e: SocketCloseEvent) {
        if (this.started) {
            InterstellarQOL.logMessage("Disabled pits speedrun tool due to socket disconnect.");
            this.started = false;
        }
    }

    tick() {
        if (!this.started) return;
        let currentZone = StellarAPI.Game.getCurrentZone();
        let y = StellarAPI.Game.getCameraWorldY();
        switch (this.state) {
            case SpeedrunState.WAITING_MISSION:
                if (currentZone == "Raven") {
                    this.state = SpeedrunState.RAVEN_TRAVELING;
                    break;
                }
            case SpeedrunState.RAVEN_TRAVELING:
                if (currentZone == "The Pits") {
                    StellarAPI.sendChat("Entered pits! Starting speedrun timer...", false);
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
                    StellarAPI.sendChat(`Starting pits A${this.activePit + 1}`, false);
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
                            StellarAPI.sendChat("Burrowed in todo sec...", false);
                            this.pitState = PitState.DIGGING;
                        }
                        break;
                    }
                    case PitState.DIGGING: {
                        if (y > 100) {
                            StellarAPI.sendChat("Finished digging in todo sec...", false);
                            this.pitState = PitState.ESCAPING;
                        }
                        break;
                    }
                    case PitState.ESCAPING: {
                        if (y > 260) {
                            StellarAPI.sendChat(`Successfully completed A${this.activePit} pits in todo time !`, false);
                            this.pitState = PitState.NONE;
                            this.state = SpeedrunState.PITS_TRAVELING;
                        }
                        break;
                    }
                }
                break;
        }
    }

    lastMOTDTime = 0;
    constantTick() {
        if (!this.started) return;
        if (Date.now() - this.lastMOTDTime > 100) {
            this.setMOTD();
            this.lastMOTDTime = Date.now();
        }
    }


    setMOTD() {
        let motd = this.motd + "\n[InterstellarQOL Pits Speedrun Tool]\n";
        motd += `You are at: ${Math.round(StellarAPI.Game.getCameraWorldX() * 100) / 100}, ${Math.round(StellarAPI.Game.getCameraWorldY() * 100) / 100} which is pits A${this.getPitNumber() + 1}\n`;
        switch (this.state) {
            case SpeedrunState.WAITING_MISSION:
            case SpeedrunState.RAVEN_TRAVELING:
                if (this.state == SpeedrunState.WAITING_MISSION) {
                    motd += "Currently waiting in freeport...\n"
                } else {
                    motd += "Traveling to the pits...\n"
                }
                let eventTimes = "";
                let eventData = StellarAPI.Telemetry.getEventState();
                for (let [id, name] of Object.entries(StellarAPI.Telemetry.getEventSchema())) {
                    let trackerData = eventData[id]!!;
                    let formatted = getFormattedEventTime(trackerData.time, trackerData.event)
                    eventTimes += `${formatted[0]} ${name} ${formatted[1]}\n`
                }
                motd += eventTimes;
                break;
            case SpeedrunState.PITS_TRAVELING:
                motd += "Traveling to the next pit...\n"
                break;
            case SpeedrunState.DOING_PITS:
                motd += `Completing pit A${this.activePit + 1}...\n`
                break;
            case SpeedrunState.COMPLETE:
                motd += "Pits complete!"
                break;
        }
        StellarAPI.sendPacket({"type": StellarAPI.Packet.ClMsgTeamAct, "act": "motd", "arg": motd});
    }

    setEnterTime() {
        this.masterTimer = Date.now();
    }

    start() {
        if (StellarAPI.Telemetry.isDisabled()) {
            InterstellarQOL.logMessage("Pits Speedrun Tool requires telemetry (because Xendy is Lazy)!");
            return;
        }
        if (this.started) {
            InterstellarQOL.logMessage("Pits Speedrun Tool is already started!");
            return;
        }
        this.started = true;
        if (StellarAPI.Game.getCurrentZone() == "Freeport") this.state = SpeedrunState.WAITING_MISSION;
        else if (StellarAPI.Game.getCurrentZone() == "Raven") this.state = SpeedrunState.RAVEN_TRAVELING;
        else if (StellarAPI.Game.getCurrentZone() == "The Pits") {
            this.state = SpeedrunState.PITS_TRAVELING;
            this.setEnterTime();
        }
        StellarAPI.sendChat("[ISQOL] Started pits speedrun tool !", false);
        this.motd = document.querySelector("#motd-text")!!.textContent.split("\n[InterstellarQOL Pits Speedrun Tool]")[0]!!;
    }

    end() {
        if (StellarAPI.Telemetry.isDisabled()) {
            InterstellarQOL.logMessage("Pits Speedrun Tool requires telemetry (because Xendy is Lazy)!");
            return;
        }
        if (!this.started) {
            InterstellarQOL.logMessage("Pits Speedrun Tool is not started!");
            return;
        }
    }

    // 245: Enter Pit
    // 60: Dig
    // 100: Escape
    getPitNumber() {
        let x = StellarAPI.Game.getCameraWorldX();
        if (x > 745) return 3;
        if (x > 492) return 2;
        if (x > 245) return 1;
        return 0;
    }
}