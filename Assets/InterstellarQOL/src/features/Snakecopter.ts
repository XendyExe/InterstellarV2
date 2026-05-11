import { TriggerEvent } from "@interstellar/InterstellarEvents";
import StellarCommandManager, { BaseCommand, OptionsArgument } from "@interstellar/StellarCommandsManager";
import StellarEventManager from "@interstellar/StellarEventManager";
import InterstellarQOL from "..";
import StellarAPI from "@interstellar/StellarAPI";
import DefaultGravity from "./DefaultGravity";

class SnakecopterCommand extends BaseCommand {
    name = "snakecopter"
    alias = ["copter", "zerograv"]
    testOnly = false;
    arguments = [new OptionsArgument("option", ["", "start", "stop"])]

    copter: Snakecopter;
    constructor(copter: Snakecopter) {
        super();
        this.copter = copter;
    }
    execute(option: string) {
        if (option == "") {
            if (this.copter.coptering) {
                this.copter.endCopter();
                InterstellarQOL.logMessage("Ended snakecopter.")
            } else {
                this.copter.startCopter();
                InterstellarQOL.logMessage("Started snakecopter.")
            }
        } else if (option == "start") {
            if (this.copter.coptering) throw "Already snakecoptering!";
            this.copter.startCopter();
            InterstellarQOL.logMessage("Started snakecopter.")
        } else if (option == "end") {
            if (!this.copter.coptering) throw "Already not snakecoptering!";
            this.copter.endCopter();
            InterstellarQOL.logMessage("Ended snakecopter.")
        }
    }
}

export class Snakecopter {
    coptering = false;
    copterDirection = 0;
    constructor() {
        StellarCommandManager.registerCommand(new SnakecopterCommand(this));
        StellarEventManager.addTriggerListener(TriggerEvent.CONSTANT_TICK, this.constantTick.bind(this));
    }

    startCopter() {
        this.coptering = true;
        
    }
    endCopter() {
        this.coptering = false;
        setTimeout(() => this.setGravity(DefaultGravity.defaultGravs[StellarAPI.currentShip!!.hex] ?? 0), 20);
    }
    constantTick() {
        if (!this.coptering) return;
        this.setGravity(this.copterDirection);
        this.copterDirection++;
        if (this.copterDirection == 4) this.copterDirection = 0;
    }

    setGravity(dir: number) {
        StellarAPI.sendPacket({type: StellarAPI.Packet.ClMsgTeamAct, arg: dir, act: "gravity"})
    }
}