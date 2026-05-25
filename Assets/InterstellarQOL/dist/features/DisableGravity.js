"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const StellarEventManager_1 = __importDefault(require("@interstellar/StellarEventManager"));
const InterstellarEvents_1 = require("@interstellar/InterstellarEvents");
const StellarAPI_1 = __importDefault(require("@interstellar/StellarAPI"));
const index_1 = __importDefault(require("../index"));
class DisableGravity {
    constructor() {
        this.disabled = false;
        StellarEventManager_1.default.addEventListener(InterstellarEvents_1.SocketMessageRecieveEvent, this.packetReceive.bind(this));
        StellarEventManager_1.default.addEventListener(InterstellarEvents_1.SocketMessageSendEvent, this.packetSend.bind(this));
    }
    packetReceive(event) {
        if (event.message.type == StellarAPI_1.default.Packet.SvMsgMotd) {
            let disabled = event.message.text.includes("[NOGRAVITY]");
            if (this.disabled != disabled) {
                this.disabled = disabled;
                if (this.disabled)
                    index_1.default.logMessage("Gravity packets have been disabled !");
                else
                    index_1.default.logMessage("Gravity packets have been re-enabled !");
            }
        }
    }
    packetSend(event) {
        if (!this.disabled)
            return;
        if (event.message.type == StellarAPI_1.default.Packet.ClMsgTeamAct && event.message.act == "gravity") {
            index_1.default.logMessage("Attempted to do a gravity change that was canceled due to [NOGRAVITY] in MOTD !");
            event.cancelEvent();
        }
    }
}
exports.default = DisableGravity;
