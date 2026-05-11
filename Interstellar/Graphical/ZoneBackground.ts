import Interstellar from '../Interstellar';

class ZoneBackground {
    width: number;
    height: number;
    isPixelArt: boolean;
    alpha: number = 0;
    constructor(width: number, height: number, isPixelArt: boolean) {
        this.width = width;
        this.height = height;
        this.isPixelArt = isPixelArt;
    }
    update() {

    }
    render(defaultFillColor: [number, number, number]) {
        
    }
    async load() {

    }
    async unload() {}
}

export default ZoneBackground;