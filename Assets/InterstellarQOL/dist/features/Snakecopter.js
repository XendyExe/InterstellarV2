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
exports.Snakecopter = void 0;
const InterstellarEvents_1 = require("@interstellar/InterstellarEvents");
const StellarCommandsManager_1 = __importStar(require("@interstellar/StellarCommandsManager"));
const StellarEventManager_1 = __importDefault(require("@interstellar/StellarEventManager"));
const __1 = __importDefault(require(".."));
const StellarAPI_1 = __importDefault(require("@interstellar/StellarAPI"));
const DefaultGravity_1 = __importDefault(require("./DefaultGravity"));
class SnakecopterCommand extends StellarCommandsManager_1.BaseCommand {
    constructor(copter) {
        super();
        this.name = "snakecopter";
        this.alias = ["copter", "zerograv"];
        this.testOnly = false;
        this.arguments = [new StellarCommandsManager_1.OptionsArgument("option", ["", "start", "stop"])];
        this.copter = copter;
    }
    execute(option) {
        if (option == "") {
            if (this.copter.coptering) {
                this.copter.endCopter();
                __1.default.logMessage("Ended snakecopter.");
            }
            else {
                this.copter.startCopter();
                __1.default.logMessage("Started snakecopter.");
            }
        }
        else if (option == "start") {
            if (this.copter.coptering)
                throw "Already snakecoptering!";
            this.copter.startCopter();
            __1.default.logMessage("Started snakecopter.");
        }
        else if (option == "end") {
            if (!this.copter.coptering)
                throw "Already not snakecoptering!";
            this.copter.endCopter();
            __1.default.logMessage("Ended snakecopter.");
        }
    }
}
class Snakecopter {
    constructor() {
        this.coptering = false;
        this.copterDirection = 0;
        StellarCommandsManager_1.default.registerCommand(new SnakecopterCommand(this));
        StellarEventManager_1.default.addTriggerListener(InterstellarEvents_1.TriggerEvent.CONSTANT_TICK, this.constantTick.bind(this));
    }
    startCopter() {
        this.coptering = true;
    }
    endCopter() {
        this.coptering = false;
        setTimeout(() => { var _a; return this.setGravity((_a = DefaultGravity_1.default.defaultGravs[StellarAPI_1.default.currentShip.hex]) !== null && _a !== void 0 ? _a : 0); }, 20);
    }
    constantTick() {
        if (!this.coptering)
            return;
        this.setGravity(this.copterDirection);
        this.copterDirection++;
        if (this.copterDirection == 4)
            this.copterDirection = 0;
    }
    setGravity(dir) {
        StellarAPI_1.default.sendPacket({ type: StellarAPI_1.default.Packet.ClMsgTeamAct, arg: dir, act: "gravity" });
    }
}
exports.Snakecopter = Snakecopter;
