"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const StellarEventManager_1 = __importDefault(require("@interstellar/StellarEventManager"));
const InterstellarEvents_1 = require("@interstellar/InterstellarEvents");
const StellarAPI_1 = __importDefault(require("@interstellar/StellarAPI"));
class Autoresponse {
    constructor(mod) {
        this.lastMessageTime = 0;
        this.mod = mod;
        StellarEventManager_1.default.addEventListener(InterstellarEvents_1.ChatMessageRecieveEvent, this.onMessage.bind(this));
        StellarEventManager_1.default.addEventListener(InterstellarEvents_1.JoinShipEvent, this.onShipJoin.bind(this));
    }
    onShipJoin(event) {
        this.lastMessageTime = 0;
    }
    onMessage(event) {
        if (!this.mod.options.sillyAutoresponse.value || Date.now() - this.lastMessageTime < 60000)
            return;
        let text = event.getText();
        if (text.endsWith(": meow") && !text.includes(StellarAPI_1.default.playerName())) {
            StellarAPI_1.default.sendChat("mrrow :3", true);
            this.lastMessageTime = Date.now();
        }
        if (text.endsWith(": mrrow") && !text.includes(StellarAPI_1.default.playerName())) {
            StellarAPI_1.default.sendChat("meoww :3", true);
            this.lastMessageTime = Date.now();
        }
    }
}
exports.default = Autoresponse;
