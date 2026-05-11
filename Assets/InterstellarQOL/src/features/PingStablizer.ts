import StellarCommandsManager, { BaseCommand, IntArgument } from "@interstellar/StellarCommandsManager";
import InterstellarQOL from "..";
import StellarEventManager from "@interstellar/StellarEventManager";
import { SocketMessageRecieveEvent } from "@interstellar/InterstellarEvents";
import StellarAPI from "@interstellar/StellarAPI";

class PingStablizeCommand extends BaseCommand {
    name = "stablizeping"
    alias = [""]
    testOnly = false;
    arguments = [new IntArgument("count")]

    obj: PingStablizer;
    constructor(obj: PingStablizer) {
        super();
        this.obj = obj;
    }
    execute(packet_count: number) {
        this.obj.stablize_to = packet_count;
        InterstellarQOL.logMessage(`Stablizing ping to ${packet_count * 50} ms`)
    }
}

class PingStablizer {
    stablize_to = 0

    constructor() {
        StellarCommandsManager.registerCommand(new PingStablizeCommand(this));
        StellarEventManager.addEventListener(SocketMessageRecieveEvent, this.on_packet.bind(this));
    }

    snapshot_queue: any[] = [];
    on_packet(event: SocketMessageRecieveEvent) {
        if (this.stablize_to == 0) return;
        const message = event.message;
        if (message.type != StellarAPI.Packet.SvMsgSnapshot) return;
        const world = message.world;
        const full = message.full;
        const command_number = message.command_number;
        if (command_number == -1) {
            return;
        }
        console.log("Snapshot", world, "on command", command_number, "input", StellarAPI.Input.getInputObject().next_cmd_number, "latest predicted", StellarAPI.Game.getLatestPredictedCommandNumber())
    }
}

export default PingStablizer;