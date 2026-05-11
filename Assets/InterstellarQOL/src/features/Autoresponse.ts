import StellarEventManager from "@interstellar/StellarEventManager";
import InterstellarQOL from "..";
import { ChatMessageRecieveEvent, JoinShipEvent } from "@interstellar/InterstellarEvents";
import StellarAPI from "@interstellar/StellarAPI";

export default class Autoresponse {
    mod: InterstellarQOL
    lastMessageTime = 0;
    constructor(mod: InterstellarQOL) {
        this.mod = mod;

        StellarEventManager.addEventListener(ChatMessageRecieveEvent, this.onMessage.bind(this));
        StellarEventManager.addEventListener(JoinShipEvent, this.onShipJoin.bind(this));
    }

    onShipJoin(event: JoinShipEvent) {
        this.lastMessageTime = 0;
    }

    onMessage(event: ChatMessageRecieveEvent) {
        if (!this.mod.options.sillyAutoresponse.value || Date.now() - this.lastMessageTime < 60000) return;
        let text = event.getText();
        if (text.endsWith(": meow") && !text.includes(StellarAPI.playerName())) {
            StellarAPI.sendChat("mrrow :3", true);
            this.lastMessageTime = Date.now();
        }
        if (text.endsWith(": mrrow") && !text.includes(StellarAPI.playerName())) {
            StellarAPI.sendChat("meoww :3", true);
            this.lastMessageTime = Date.now();
        }
    }
}