 import { AdvertClickEvent, RenderAdvertsEvent } from "@interstellar/InterstellarEvents";
import StellarEventManager from "@interstellar/StellarEventManager";

class TogglableBillboards {
    enabled: boolean = true;

    constructor() {
        StellarEventManager.addEventListener(RenderAdvertsEvent, ((event: RenderAdvertsEvent) => {
            if (!this.enabled) event.cancelEvent();
        }).bind(this))
        StellarEventManager.addEventListener(AdvertClickEvent, ((event: AdvertClickEvent) => {
            if (!this.enabled) event.cancelEvent();
        }).bind(this))
    }
}
export default new TogglableBillboards();