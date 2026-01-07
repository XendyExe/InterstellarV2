"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const InterstellarEvents_1 = require("@interstellar/InterstellarEvents");
const StellarAPI_1 = __importDefault(require("@interstellar/StellarAPI"));
const StellarEventManager_1 = __importDefault(require("@interstellar/StellarEventManager"));
const __1 = __importDefault(require(".."));
class GravSkates {
    constructor() {
        this.enabled = false;
        this.currentGrav = -1;
        this.startGrav = 0;
        StellarEventManager_1.default.addTriggerListener(InterstellarEvents_1.TriggerEvent.FRAME_START, this.tick.bind(this));
    }
    tick() {
        if (!this.enabled)
            return;
        let grav = -1;
        if (StellarAPI_1.default.Input.keyDown("KeyW") || StellarAPI_1.default.Input.keyDown("KeyS"))
            grav = (this.startGrav + 2) % 4;
        else if (StellarAPI_1.default.Input.keyDown("KeyA") || StellarAPI_1.default.Input.keyDown("KeyD"))
            grav = this.startGrav;
        if (this.currentGrav != grav && grav != -1) {
            StellarAPI_1.default.sendPacket({ type: StellarAPI_1.default.Packet.ClMsgTeamAct, arg: grav, act: "gravity" });
            this.currentGrav = grav;
        }
    }
    enable() {
        this.enabled = true;
        __1.default.logMessage("Enabled grav skates!");
    }
    disable() {
        this.enabled = false;
        __1.default.logMessage("Disabled grav skates!");
        StellarAPI_1.default.sendPacket({ type: StellarAPI_1.default.Packet.ClMsgTeamAct, arg: this.startGrav, act: "gravity" });
    }
}
const gravSkates = new GravSkates();
exports.default = gravSkates;
