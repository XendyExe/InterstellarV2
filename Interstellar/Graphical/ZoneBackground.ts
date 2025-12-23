import { Container } from 'pixi.js';
import Interstellar from '../Interstellar';

class ZoneBackground {
    private created: boolean = false;
    width: number;
    height: number;
    isPixelArt: boolean;
    container: Container;
    style: string = "";
    constructor(width: number, height: number, isPixelArt: boolean) {
        this.width = width;
        this.height = height;
        this.isPixelArt = isPixelArt;
        this.container = new Container();
        this.container.pivot.set(this.width/2, this.height/2);
        this.container.zIndex = -100;
    }
    resize(zoom: number) {
        zoom = (zoom * 2) + 1;
        let w = Interstellar.drednotCanvas.width;
        let h = Interstellar.drednotCanvas.height;
        let scaleX = w / this.width;
        let scaleY = h / this.height;
        scaleX *= zoom;
        scaleY *= zoom;
        this.container.position.set(w/2, h/2)
        const scale = Math.max(scaleX, scaleY);
        this.container.scale.set(scale);
    }

    create() {
        
    }
    update() {
        this.resize(Interstellar.patcher.zoom);
        this.tick();
    }
    tick() {
    }
    start() {

    }
    onSwitch() {}
}

export default ZoneBackground;