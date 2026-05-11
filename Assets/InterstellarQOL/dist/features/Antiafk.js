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
const StellarEventManager_1 = __importDefault(require("@interstellar/StellarEventManager"));
const __1 = __importDefault(require(".."));
const StellarAPI_1 = __importDefault(require("@interstellar/StellarAPI"));
const StellarCommandsManager_1 = __importStar(require("@interstellar/StellarCommandsManager"));
class AntiAFKCommand extends StellarCommandsManager_1.BaseCommand {
    constructor(anti) {
        super();
        this.name = "antiafk";
        this.alias = [];
        this.testOnly = false;
        this.arguments = [new StellarCommandsManager_1.OptionsArgument("option", ["enable", "disable", "toggle", ""], [""])];
        this.anti = anti;
    }
    execute(arg) {
        if (arg == "enable")
            this.anti.enable();
        else if (arg == "disable")
            this.anti.disable();
        else
            this.anti.toggle();
    }
}
const SEND_TIME = 60000;
const SEND_MESSASGE = "/mrrow :3";
class AntiAFK {
    constructor() {
        this.enabled = false;
        this.lastSendTime = 0;
        StellarEventManager_1.default.addEventListener(InterstellarEvents_1.SocketCloseEvent, this.onSocketClose.bind(this));
        StellarEventManager_1.default.addTriggerListener(InterstellarEvents_1.TriggerEvent.CONSTANT_TICK, this.constantTick.bind(this));
        StellarCommandsManager_1.default.registerCommand(new AntiAFKCommand(this));
    }
    onSocketClose(event) {
        if (this.enabled) {
            __1.default.logMessage("AntiAFK disabled due to socket disconnect!");
        }
        this.enabled = false;
    }
    constantTick() {
        if (Date.now() - this.lastSendTime > SEND_TIME && this.enabled) {
            this.lastSendTime = Date.now();
            StellarAPI_1.default.sendChat(SEND_MESSASGE, true);
        }
    }
    enable() {
        if (this.enabled) {
            __1.default.logMessage("AntiAFK is already enabled");
        }
        else {
            __1.default.logMessage("Enabled AntiAFK");
            this.enabled = true;
        }
    }
    disable() {
        if (this.enabled) {
            __1.default.logMessage("Disabled AntiAFK");
            this.enabled = false;
        }
        else {
            __1.default.logMessage("AntiAFK is already disabled");
        }
    }
    toggle() {
        if (this.enabled)
            this.disable();
        else
            this.enable();
    }
}
exports.default = AntiAFK;
