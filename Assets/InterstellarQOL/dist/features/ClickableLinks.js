"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const InterstellarEvents_1 = require("@interstellar/InterstellarEvents");
const StellarEventManager_1 = __importDefault(require("@interstellar/StellarEventManager"));
const linkRegex = /(\bhttps?:\/\/[^\s<>"']+)/gi;
class ClickableLinks {
    constructor() {
        StellarEventManager_1.default.addEventListener(InterstellarEvents_1.ChatMessageRecieveEvent, this.onChat.bind(this));
        StellarEventManager_1.default.addEventListener(InterstellarEvents_1.ProcessMOTDEvent, this.onRenderMOTD.bind(this));
    }
    onChat(event) {
        event.raw = this.processChat(event.raw);
    }
    processChat(data) {
        if (typeof data === "string") {
            let match;
            const splits = data.split(linkRegex).filter(elm => elm != "");
            if (splits.length == 0)
                return data;
            else if (splits.length == 1) {
                if (match = data.match(linkRegex))
                    return {
                        t: `a href=${data} target="_blank" rel="noopener noreferrer" style='color: var(--dark-links)'`,
                        c: data
                    };
                return data;
            }
            else {
                return splits.map(elm => {
                    if (match = elm.match(linkRegex))
                        return {
                            t: `a href=${elm} target="_blank" rel="noopener noreferrer" style='color: var(--dark-links)'`,
                            c: elm
                        };
                    else
                        return elm;
                });
            }
        }
        if (Array.isArray(data))
            return data.map(this.processChat.bind(this));
        if (data && typeof data === "object") {
            data.c = this.processChat(data.c);
        }
        return data;
    }
    onRenderMOTD(event) {
        event.motd = event.motd.replace(/(https?:\/\/[^\s]+)/g, '<a style="color: var(--dark-links)" href="$1" target="_blank">$1</a>');
    }
}
exports.default = ClickableLinks;
