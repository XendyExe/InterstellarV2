"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const InterstellarEvents_1 = require("@interstellar/InterstellarEvents");
const StellarEventManager_1 = __importDefault(require("@interstellar/StellarEventManager"));
class TogglableBillboards {
    constructor() {
        this.enabled = true;
        StellarEventManager_1.default.addEventListener(InterstellarEvents_1.RenderAdvertsEvent, ((event) => {
            if (!this.enabled)
                event.cancelEvent();
        }).bind(this));
        StellarEventManager_1.default.addEventListener(InterstellarEvents_1.AdvertClickEvent, ((event) => {
            if (!this.enabled)
                event.cancelEvent();
        }).bind(this));
    }
}
exports.default = new TogglableBillboards();
