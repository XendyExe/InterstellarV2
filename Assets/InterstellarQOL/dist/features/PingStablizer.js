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
const StellarCommandsManager_1 = __importStar(require("@interstellar/StellarCommandsManager"));
const __1 = __importDefault(require(".."));
const StellarEventManager_1 = __importDefault(require("@interstellar/StellarEventManager"));
const InterstellarEvents_1 = require("@interstellar/InterstellarEvents");
const StellarAPI_1 = __importDefault(require("@interstellar/StellarAPI"));
class PingStablizeCommand extends StellarCommandsManager_1.BaseCommand {
    constructor(obj) {
        super();
        this.name = "stablizeping";
        this.alias = [""];
        this.testOnly = false;
        this.arguments = [new StellarCommandsManager_1.IntArgument("count")];
        this.obj = obj;
    }
    execute(packet_count) {
        this.obj.stablize_to = packet_count;
        __1.default.logMessage(`Stablizing ping to ${packet_count * 50} ms`);
    }
}
class PingStablizer {
    constructor() {
        this.stablize_to = 0;
        this.snapshot_queue = [];
        StellarCommandsManager_1.default.registerCommand(new PingStablizeCommand(this));
        StellarEventManager_1.default.addEventListener(InterstellarEvents_1.SocketMessageRecieveEvent, this.on_packet.bind(this));
    }
    on_packet(event) {
        if (this.stablize_to == 0)
            return;
        const message = event.message;
        if (message.type != StellarAPI_1.default.Packet.SvMsgSnapshot)
            return;
        const world = message.world;
        const full = message.full;
        const command_number = message.command_number;
        if (command_number == -1) {
            return;
        }
        console.log("Snapshot", world, "on command", command_number, "input", StellarAPI_1.default.Input.getInputObject().next_cmd_number, "latest predicted", StellarAPI_1.default.Game.getLatestPredictedCommandNumber());
    }
}
exports.default = PingStablizer;
