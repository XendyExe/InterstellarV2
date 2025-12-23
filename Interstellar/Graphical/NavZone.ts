import Interstellar from "../Interstellar";
import Zone, { SubZone } from "./Zone";

export default class NavZone extends Zone {
    navDefault: number = 1;
    constructor(subzones: SubZone[], currentIndex?: number) {
        super(subzones, currentIndex);
    }
    update(): void {
        let target = Interstellar.patcher.navDestination - 1;
        if (target < 0 || target > 4) target = this.navDefault;
        this.transitionTarget = target;
    }
}