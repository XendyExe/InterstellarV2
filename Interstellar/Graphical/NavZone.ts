import Interstellar from "../Interstellar";
import Zone, {SubZone} from "./Zone";

const NAV_ZONE_INDEXES: Record<number, number> = {
    10: 0, // Hummingbird
    20: 1, // Finch
    30: 2, // Sparrow
    40: 3, // Raven
    50: 4, // Falcon
}

export default class NavZone extends Zone {
    navDefault: number = 1;
    constructor(subzones: SubZone[], currentIndex?: number) {
        super(subzones, currentIndex);
    }
    update(): void {
        this.transitionTarget = NAV_ZONE_INDEXES[Interstellar.patcher.navDestination] ?? this.navDefault;
    }
}