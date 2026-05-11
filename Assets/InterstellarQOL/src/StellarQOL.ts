import { CrewListUpdateEvent, TriggerEvent } from "@interstellar/InterstellarEvents";
import StellarAPI from "@interstellar/StellarAPI";
import StellarEventManager from "@interstellar/StellarEventManager";
import InterstellarQOL from ".";

interface CrewControlAction {
    type: string;
    args: any[];
}
const CREW_CONTROL_COOLDOWN = 100; // ms
const addRefId = ["kick", "ban", "unban", "guest", "crew", "cap"]
class StellarQOL {
    private lastActionTime: number = 0;
    private queue: CrewControlAction[] = [];
    private actions: CrewControlAction[] = [];

    constructor() {
        StellarEventManager.addEventListener(CrewListUpdateEvent, this.onCrewListUpdate.bind(this));
        StellarEventManager.addTriggerListener(TriggerEvent.CONSTANT_TICK, this.constantTick.bind(this));
    }

    kickPlayer(name: string) {
        this.actions.push({type: "kick", args: [name]})
    }
    banPlayer(name: string) {
        this.actions.push({type: "ban", args: [name]})
    }
    unbanPlayer(name: string) {
        this.actions.push({type: "unban", args: [name]})
    }
    guestPlayer(name: string) {
        this.actions.push({type: "guest", args: [name]})
    }
    crewPlayer(name: string) {
        this.actions.push({type: "crew", args: [name]})
    }
    capPlayer(name: string) {
        this.actions.push({type: "cap", args: [name]})
    }

    onCrewListUpdate(event: CrewListUpdateEvent) {
        if (this.actions.length == 0) return;
        const me = event.playerList[StellarAPI.playerName().toLowerCase()]!!;
        for (const action of this.actions) {
            if (addRefId.includes(action.type)) {
                const entry = event.playerList[action.args[0].toLowerCase()];
                if (!entry) {
                    InterstellarQOL.logMessage(`Couldn't ${action.type} "${action.args[0]}": Failed to find player.`);
                    continue;
                }
                if (action.type == "cap" && entry.team_rank == 3) {
                    InterstellarQOL.logMessage(`Couldn't ${action.type} "${action.args[0]}": Player is already cap.`);
                    continue;
                }
                if (action.type == "crew" && entry.team_rank == 1) {
                    InterstellarQOL.logMessage(`Couldn't ${action.type} "${action.args[0]}": Player is already crew.`);
                    continue;
                }
                if (action.type == "guest" && entry.team_rank == 0) {
                    InterstellarQOL.logMessage(`Couldn't ${action.type} "${action.args[0]}": Player is already guest.`);
                    continue;
                }
                if (entry.team_rank == 3 && entry.captain_rank <= me.captain_rank) {
                    InterstellarQOL.logMessage(`Couldn't ${action.type} "${action.args[0]}": ${action.args[0]} has a higher or equal captain rank than you!`);
                    continue;
                }
                if (action.type == "kick" && entry.online_count == 0) {
                    InterstellarQOL.logMessage(`Couldn't ${action.type} "${action.args[0]}": ${action.args[0]} isn't online!`);
                    continue;
                }
                action.args.push(entry.ref_id);
                if (entry.team_rank == 3 && action.type == "ban") {
                    this.queue.push({type: "guest", args: action.args})
                    this.queue.push(action);
                }
                else if (entry.team_rank == 3 && action.type == "kick") {
                    this.queue.push({type: "guest", args: action.args})
                    this.queue.push(action);
                    this.queue.push({type: "cap", args: action.args})
                }
                else this.queue.push(action);
            } else {

            }
        }
        this.actions.length = 0;
    }

    constantTick() {
        if (this.queue.length > 0 && Date.now() - this.lastActionTime > CREW_CONTROL_COOLDOWN) {
            const action = this.queue.shift()!!;
            switch (action.type) {
                case "ban":
                    StellarAPI.sendPacket({
                        type: StellarAPI.Packet.ClMsgTeamAct,
                        act: "ban",
                        arg: action.args[1]
                    })
                    break;
                case "kick":
                    StellarAPI.sendPacket({
                        type: StellarAPI.Packet.ClMsgTeamAct,
                        act: "kick",
                        arg: action.args[1]
                    })
                    break;
                case "unban":
                    StellarAPI.sendPacket({
                        type: StellarAPI.Packet.ClMsgTeamAct,
                        act: "unban",
                        arg: action.args[1]
                    })
                    break;
                case "guest":
                    StellarAPI.sendPacket({
                        type: StellarAPI.Packet.ClMsgTeamAct,
                        act: "set_rank",
                        arg: action.args[1],
                        rank: 0
                    })
                    break
                case "crew":
                    StellarAPI.sendPacket({
                        type: StellarAPI.Packet.ClMsgTeamAct,
                        act: "set_rank",
                        arg: action.args[1],
                        rank: 1
                    })
                    break
                case "cap":
                    StellarAPI.sendPacket({
                        type: StellarAPI.Packet.ClMsgTeamAct,
                        act: "set_rank",
                        arg: action.args[1],
                        rank: 3
                    })
                    break
            }
            this.lastActionTime = Date.now();
        }
    }
}

export default new StellarQOL();