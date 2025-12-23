"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const InterstellarEvents_1 = require("@interstellar/InterstellarEvents");
const StellarAPI_1 = __importDefault(require("@interstellar/StellarAPI"));
const StellarEventManager_1 = __importDefault(require("@interstellar/StellarEventManager"));
const _1 = __importDefault(require("."));
const CREW_CONTROL_COOLDOWN = 100; // ms
const addRefId = ["kick", "ban", "unban", "guest", "crew", "cap"];
class StellarQOL {
    constructor() {
        this.lastActionTime = 0;
        this.queue = [];
        this.actions = [];
        StellarEventManager_1.default.addEventListener(InterstellarEvents_1.CrewListUpdateEvent, this.onCrewListUpdate.bind(this));
        StellarEventManager_1.default.addTriggerListener(InterstellarEvents_1.TriggerEvent.CONSTANT_TICK, this.constantTick.bind(this));
    }
    kickPlayer(name) {
        this.actions.push({ type: "kick", args: [name] });
    }
    banPlayer(name) {
        this.actions.push({ type: "ban", args: [name] });
    }
    unbanPlayer(name) {
        this.actions.push({ type: "unban", args: [name] });
    }
    guestPlayer(name) {
        this.actions.push({ type: "guest", args: [name] });
    }
    crewPlayer(name) {
        this.actions.push({ type: "crew", args: [name] });
    }
    capPlayer(name) {
        this.actions.push({ type: "cap", args: [name] });
    }
    onCrewListUpdate(event) {
        if (this.actions.length == 0)
            return;
        const me = event.playerList[StellarAPI_1.default.playerName().toLowerCase()];
        for (const action of this.actions) {
            if (addRefId.includes(action.type)) {
                const entry = event.playerList[action.args[0].toLowerCase()];
                if (!entry) {
                    _1.default.logMessage(`Couldn't ${action.type} "${action.args[0]}": Failed to find player.`);
                    continue;
                }
                if (action.type == "cap" && entry.team_rank == 3) {
                    _1.default.logMessage(`Couldn't ${action.type} "${action.args[0]}": Player is already cap.`);
                    continue;
                }
                if (action.type == "crew" && entry.team_rank == 1) {
                    _1.default.logMessage(`Couldn't ${action.type} "${action.args[0]}": Player is already crew.`);
                    continue;
                }
                if (action.type == "guest" && entry.team_rank == 0) {
                    _1.default.logMessage(`Couldn't ${action.type} "${action.args[0]}": Player is already guest.`);
                    continue;
                }
                if (entry.team_rank == 3 && entry.captain_rank <= me.captain_rank) {
                    _1.default.logMessage(`Couldn't ${action.type} "${action.args[0]}": ${action.args[0]} has a higher or equal captain rank than you!`);
                    continue;
                }
                if (action.type == "kick" && entry.online_count == 0) {
                    _1.default.logMessage(`Couldn't ${action.type} "${action.args[0]}": ${action.args[0]} isn't online!`);
                    continue;
                }
                action.args.push(entry.ref_id);
                if (entry.team_rank == 3 && action.type == "ban") {
                    this.queue.push({ type: "guest", args: action.args });
                    this.queue.push(action);
                }
                else if (entry.team_rank == 3 && action.type == "kick") {
                    this.queue.push({ type: "guest", args: action.args });
                    this.queue.push(action);
                    this.queue.push({ type: "cap", args: action.args });
                }
                else
                    this.queue.push(action);
            }
            else {
            }
        }
        this.actions.length = 0;
    }
    constantTick() {
        if (this.queue.length > 0 && Date.now() - this.lastActionTime > CREW_CONTROL_COOLDOWN) {
            const action = this.queue.shift();
            switch (action.type) {
                case "ban":
                    StellarAPI_1.default.sendPacket({
                        type: StellarAPI_1.default.Packet.ClMsgTeamAct,
                        act: "ban",
                        arg: action.args[1]
                    });
                    break;
                case "kick":
                    StellarAPI_1.default.sendPacket({
                        type: StellarAPI_1.default.Packet.ClMsgTeamAct,
                        act: "kick",
                        arg: action.args[1]
                    });
                    break;
                case "unban":
                    StellarAPI_1.default.sendPacket({
                        type: StellarAPI_1.default.Packet.ClMsgTeamAct,
                        act: "unban",
                        arg: action.args[1]
                    });
                    break;
                case "guest":
                    StellarAPI_1.default.sendPacket({
                        type: StellarAPI_1.default.Packet.ClMsgTeamAct,
                        act: "set_rank",
                        arg: action.args[1],
                        rank: 0
                    });
                    break;
                case "crew":
                    StellarAPI_1.default.sendPacket({
                        type: StellarAPI_1.default.Packet.ClMsgTeamAct,
                        act: "set_rank",
                        arg: action.args[1],
                        rank: 1
                    });
                    break;
                case "cap":
                    StellarAPI_1.default.sendPacket({
                        type: StellarAPI_1.default.Packet.ClMsgTeamAct,
                        act: "set_rank",
                        arg: action.args[1],
                        rank: 3
                    });
                    break;
            }
            this.lastActionTime = Date.now();
        }
    }
}
exports.default = new StellarQOL();
