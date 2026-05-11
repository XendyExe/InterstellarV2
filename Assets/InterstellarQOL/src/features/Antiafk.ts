import { SocketCloseEvent, TriggerEvent } from "@interstellar/InterstellarEvents";
import StellarEventManager from "@interstellar/StellarEventManager";
import InterstellarQOL from "..";
import StellarAPI from "@interstellar/StellarAPI";
import StellarCommandManager, { BaseCommand, OptionsArgument } from "@interstellar/StellarCommandsManager";


class AntiAFKCommand extends BaseCommand {
    name = "antiafk"
    alias = []
    testOnly = false;
    arguments = [new OptionsArgument("option", ["enable", "disable", "toggle", ""], [""])]

    anti: AntiAFK;
    constructor(anti: AntiAFK) {
        super();
        this.anti = anti;
    }
    execute(arg: string) {
        if (arg == "enable") this.anti.enable();
        else if (arg == "disable") this.anti.disable();
        else this.anti.toggle();
    }
}

const SEND_TIME = 60000;
const SEND_MESSASGE = "/mrrow :3";
class AntiAFK {
    enabled: boolean = false;
    lastSendTime = 0;
    constructor() {
        StellarEventManager.addEventListener(SocketCloseEvent, this.onSocketClose.bind(this));
        StellarEventManager.addTriggerListener(TriggerEvent.CONSTANT_TICK, this.constantTick.bind(this));
        StellarCommandManager.registerCommand(new AntiAFKCommand(this));
    }
    onSocketClose(event: SocketCloseEvent) {
        if (this.enabled) {
            InterstellarQOL.logMessage("AntiAFK disabled due to socket disconnect!");
        }
        this.enabled = false;
    }

    constantTick() {
        if (Date.now() - this.lastSendTime > SEND_TIME && this.enabled) {
            this.lastSendTime = Date.now();
            StellarAPI.sendChat(SEND_MESSASGE, true);
        }
    }

    enable() {
        if (this.enabled) {
            InterstellarQOL.logMessage("AntiAFK is already enabled");
        } 
        else {
            InterstellarQOL.logMessage("Enabled AntiAFK");
            this.enabled = true;
        }
    }

    disable() {
        if (this.enabled) {
            InterstellarQOL.logMessage("Disabled AntiAFK");
            this.enabled = false;
        } 
        else {
            InterstellarQOL.logMessage("AntiAFK is already disabled");
        }

    }
    toggle() {
        if (this.enabled) this.disable();
        else this.enable();
    }
}

export default AntiAFK;