import { RenderPassEvent, RenderPassOneEvent, RenderPassThreeEvent, RenderPassTwoEvent } from "@interstellar/InterstellarEvents";
import StellarAPI from "@interstellar/StellarAPI";
import StellarCommandsManager, { Argument, BaseCommand, OptionsArgument } from "@interstellar/StellarCommandsManager";
import StellarEventManager from "@interstellar/StellarEventManager";

class HideShipCommand extends BaseCommand{
    name = "shipvis"
    alias = ["shipvisability"];
    arguments = [new OptionsArgument("", ["hide", "show"])];
    testOnly = false;
    execute(arg: string) {
        if (arg == "hide") hideShip.hidden = true;
        else hideShip.hidden = false;
    }
    
}

class HideShip {
    hidden: boolean = false;
    constructor() {
        StellarEventManager.addEventListener(RenderPassOneEvent, this.cancelEnabled.bind(this));
        StellarEventManager.addEventListener(RenderPassTwoEvent, this.cancelEnabled.bind(this));
        StellarEventManager.addEventListener(RenderPassThreeEvent, this.cancelEnabled.bind(this));

        StellarCommandsManager.registerCommand(new HideShipCommand());
    }

    cancelEnabled(event: RenderPassEvent) {
        if (!this.hidden) return;
        let localWorld = StellarAPI.Game.getLocalWorld();
        if (event.world.id == localWorld.id) event.cancelEvent();
    }
}

const hideShip = new HideShip();

export default hideShip;