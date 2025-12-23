import { JoinShipEvent, RenderShipSettingsEvent } from "@interstellar/InterstellarEvents";
import StellarAPI from "@interstellar/StellarAPI";
import StellarEventManager from "@interstellar/StellarEventManager"
import { h, VNode } from "preact";
import InterstellarQOL from "..";

const grav = ["down", "up", "left", "right"]

class DefaultGravity {
    // Ship id: grav, if grav is not down
    defaultGravs: Record<string, number> = {};
    constructor() {
        StellarEventManager.addEventListener(RenderShipSettingsEvent, this.onRenderShipSettings.bind(this));
        StellarEventManager.addEventListener(JoinShipEvent, this.onJoinShip.bind(this));
        let saveData = localStorage.getItem("isqol-defaultGravity") 
        if (saveData) {
            this.defaultGravs = JSON.parse(saveData);
        }
    }

    onJoinShip(event: JoinShipEvent) {
        if (this.defaultGravs[event.hex]) {
            let dir = this.defaultGravs[event.hex]!!;
            InterstellarQOL.logMessage(`Set ship default gravity: ${grav[dir]}`)
            StellarAPI.sendPacket({type: StellarAPI.Packet.ClMsgTeamAct, arg: dir, act: "gravity"})
        }
    }

    onRenderShipSettings(event: RenderShipSettingsEvent) {
        // @ts-ignore
        const c: VNode[] = event.node.props.children;
        const currentGrav = this.defaultGravs[StellarAPI.currentShip!!.hex] ?? 0;
        StellarAPI.UI.preactAppendChild(c[c.length - 1]!!, <section>
            <h3 class="h">Default Ship Gravity</h3>
            <p>InterstellarQOL allows you to set the default ship gravity, which you can set here: &nbsp;
                <select onChange={((e: any) => {
                    this.defaultGravs[StellarAPI.currentShip!!.hex] = (e.target as HTMLSelectElement).selectedIndex;
                    if (this.defaultGravs[StellarAPI.currentShip!!.hex] == 0) delete this.defaultGravs[StellarAPI.currentShip!!.hex];
                    this.save();
                }).bind(this)}>
                    <option selected={currentGrav == 0}>Down</option>
                    <option selected={currentGrav == 1}>Up</option>
                    <option selected={currentGrav == 2}>Left</option>
                    <option selected={currentGrav == 3}>Right</option>
                </select>
            </p>
        </section>)
    }
    save() {
        localStorage.setItem("isqol-defaultGravity", JSON.stringify(this.defaultGravs))
    }
}

export default new DefaultGravity();