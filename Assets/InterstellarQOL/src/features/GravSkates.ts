import { TriggerEvent } from "@interstellar/InterstellarEvents";
import StellarAPI from "@interstellar/StellarAPI";
import StellarEventManager from "@interstellar/StellarEventManager";
import InterstellarQOL from "..";


class GravSkates {
    private enabled: boolean = false;
    currentGrav = -1;
    startGrav = 0;
    constructor() {
        StellarEventManager.addTriggerListener(TriggerEvent.FRAME_START, this.tick.bind(this));
    }

    tick() {
        if (!this.enabled) return;
        let grav = -1;
        if (StellarAPI.Input.keyDown("KeyW") || StellarAPI.Input.keyDown("KeyS")) grav = (this.startGrav + 2) % 4;
        else if (StellarAPI.Input.keyDown("KeyA") || StellarAPI.Input.keyDown("KeyD")) grav = this.startGrav;
        if (this.currentGrav != grav && grav != -1) {
            StellarAPI.sendPacket({type: StellarAPI.Packet.ClMsgTeamAct, arg: grav, act: "gravity"})
            this.currentGrav = grav;
        }
    }

    enable() {
        this.enabled = true;
        InterstellarQOL.logMessage("Enabled grav skates!")
    }
    disable() {
        this.enabled = false;
        InterstellarQOL.logMessage("Disabled grav skates!")
        StellarAPI.sendPacket({type: StellarAPI.Packet.ClMsgTeamAct, arg: this.startGrav, act: "gravity"})
    }
}
const gravSkates = new GravSkates();

export default gravSkates;