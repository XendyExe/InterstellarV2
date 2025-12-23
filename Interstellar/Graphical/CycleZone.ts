import Zone, { SubZone } from "./Zone";

export default class CycleZone extends Zone {
    style: number[];
    time: number;
    cycleIndex: number = 0;
    lastCycleTime: number = Date.now();
    constructor(subzones: SubZone[], style: number[], cycleTime: number, currentIndex?: number) {
        super(subzones, currentIndex);
        this.style = style;
        this.time = cycleTime * 1000;
    }
    update(): void {
        if (this.lastCycleTime + this.time < Date.now()) {
            this.lastCycleTime = Date.now();
            this.updateCycle();
        }
    }
    updateCycle() {
        this.cycleIndex = (this.cycleIndex + 1) % this.style.length;
        this.transitionTarget = this.style[this.cycleIndex]!!;
    }
}