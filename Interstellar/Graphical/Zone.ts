import { Filter } from "pixi.js";

import ZoneBackground from "./ZoneBackground";
import Interstellar from "../Interstellar";
import glitch from "./Transition";
import { Music } from "../Music/Music";
import { Textures } from "../Modding/Textures";
import { switchToTheme } from "../Modding/Theme";

export interface SubZone {
    name: string;
    color: number;
    description: string;
    background: ZoneBackground;
    filter: Filter[];
    textures: Textures;
    music: Music | null;
    theme: Record<string, string>
}

class Zone {
    displayName: string = "";
    displayDescription: string = "";
    displayColor: number = 0;
    subzones: SubZone[];

    active: boolean = false;
    useSmoothTransition: boolean = true;
    currentMusic: any | null = null;
    currentIndex: number = 0;
    transitionTarget: number = 0;
    constructor(subzones: SubZone[], currentIndex = 0) {
        this.subzones = subzones;
        this.currentIndex = currentIndex;
        this.transitionTarget = currentIndex;

        subzones.forEach(zone => {
            zone.background.start();
        })
    }

    teleportToZone(other: Zone) {
        glitch(300, () => {
            this.active = false;
            for (const subzone of this.subzones) {
                if (subzone.music) subzone.music.deactivate();
            }
            Interstellar.graphics.background.removeChildren();
            if (other) other.createZone();
        })
    }

    createZone() {
        this.active = true;
        this.subzones[this.currentIndex]?.background.onSwitch();
        for (let i = 0; i < this.subzones.length; i++) {
            const subzone = this.subzones[i]!!;
            const background = subzone.background;
            Interstellar.graphics.background.addChild(background.container);
            if (i == this.currentIndex) {
                background.container.zIndex = 10000;
                background.container.alpha = 1;
                Interstellar.graphics.game.filters = subzone.filter;
                if (subzone.music) {
                    subzone.music.activate();
                }
                subzone.textures.switchToTexture();
                switchToTheme(subzone.theme);
            }
            else {
                background.container.zIndex = 0;
                background.container.alpha = 0;
            }
        }
        Interstellar.currentZone = this;
    }

    tick() {
        for (let i = 0; i < this.subzones.length; i++) this.subzones[i]?.background.update();
        if (this.active) {
            Interstellar.displayBGName = this.subzones[this.currentIndex]?.name!!;
            for (let i = 0; i < this.subzones.length; i++) {
                const subzone = this.subzones[i]!!;
                const background = subzone.background;
                if (i == this.currentIndex) {
                    background.container.zIndex = 10000;
                    if (this.useSmoothTransition) {
                        if (background.container.alpha < 1) background.container.alpha += 0.02;
                        if (background.container.alpha > 0.5 && this.transitionTarget != this.currentIndex) {
                            if (this.subzones[this.currentIndex]!!.music) this.subzones[this.currentIndex]!!.music!!.deactivate();
                            this.currentIndex = this.transitionTarget;
                            this.subzones[this.currentIndex]?.background.onSwitch();
                            if (this.subzones[this.currentIndex]!!.music) this.subzones[this.currentIndex]!!.music!!.activate();
                            this.subzones[this.currentIndex]?.textures.switchToTexture();
                            Interstellar.graphics.game.filters = this.subzones[this.currentIndex]?.filter;
                            switchToTheme(this.subzones[this.currentIndex]!.theme);
                        }
                    }
                    else {
                        background.container.alpha = 1;
                        if (this.transitionTarget != this.currentIndex) {
                            if (this.subzones[this.currentIndex]!!.music) this.subzones[this.currentIndex]!!.music!!.deactivate();
                            this.currentIndex = this.transitionTarget;
                            glitch(300, () => {
                                this.subzones[this.currentIndex]?.background.onSwitch();
                                if (this.active) if (this.subzones[this.currentIndex]!!.music) {
                                    this.subzones[this.currentIndex]!!.music!!.activate();
                                    this.subzones[this.currentIndex]?.textures.switchToTexture();
                                    Interstellar.graphics.game.filters = this.subzones[this.currentIndex]?.filter;
                                    switchToTheme(this.subzones[this.currentIndex]!.theme);
                                }
                            });
                        }
                    }
                }
                else {
                    background.container.zIndex = 0;
                    if (background.container.alpha > 0) {
                        if (this.useSmoothTransition) background.container.alpha -= 0.05;
                        else background.container.alpha = 0;
                    }
                }
            }
        }
        this.update();
    }

    update() {}
}

export default Zone;