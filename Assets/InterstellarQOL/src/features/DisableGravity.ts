import StellarEventManager from "@interstellar/StellarEventManager";
import {SocketMessageRecieveEvent, SocketMessageSendEvent} from "@interstellar/InterstellarEvents";
import StellarAPI from "@interstellar/StellarAPI";
import InterstellarQOL from "../index";

export default class DisableGravity {
    disabled = false;
    constructor() {
        StellarEventManager.addEventListener(SocketMessageRecieveEvent, this.packetReceive.bind(this));
        StellarEventManager.addEventListener(SocketMessageSendEvent, this.packetSend.bind(this));
    }

    packetReceive(event: SocketMessageRecieveEvent) {
        if (event.message.type == StellarAPI.Packet.SvMsgMotd) {
            let disabled = event.message.text.includes("[NOGRAVITY]");
            if (this.disabled != disabled) {
                this.disabled = disabled;
                if (this.disabled) InterstellarQOL.logMessage("Gravity packets have been disabled !")
                else InterstellarQOL.logMessage("Gravity packets have been re-enabled !")
            }
        }
    }

    packetSend(event: SocketMessageSendEvent) {
        if (!this.disabled) return;
        if (event.message.type == StellarAPI.Packet.ClMsgTeamAct && event.message.act == "gravity") {
            InterstellarQOL.logMessage("Attempted to do a gravity change that was canceled due to [NOGRAVITY] in MOTD !")
            event.cancelEvent();
        }

    }
}