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
class HideShipCommand extends StellarCommandsManager_1.BaseCommand {
    constructor() {
        super(...arguments);
        this.name = "shipvis";
        this.alias = ["shipvisability"];
        this.arguments = [new StellarCommandsManager_1.OptionsArgument("", ["hide", "show"])];
        this.testOnly = false;
    }
    execute(arg) {
        if (arg == "hide")
            hideShip.hidden = true;
        else
            hideShip.hidden = false;
    }
}
class HideShip {
    constructor() {
        this.hidden = false;
        StellarEventManager_1.default.addEventListener(InterstellarEvents_1.RenderPassOneEvent, this.cancelEnabled.bind(this));
        StellarEventManager_1.default.addEventListener(InterstellarEvents_1.RenderPassTwoEvent, this.cancelEnabled.bind(this));
        StellarEventManager_1.default.addEventListener(InterstellarEvents_1.RenderPassThreeEvent, this.cancelEnabled.bind(this));
        StellarCommandsManager_1.default.registerCommand(new HideShipCommand());
    }
    cancelEnabled(event) {
        if (!this.hidden)
            return;
        let localWorld = StellarAPI_1.default.Game.getLocalWorld();
        if (event.world.id == localWorld.id)
            event.cancelEvent();
    }
}
const hideShip = new HideShip();
exports.default = hideShip;
