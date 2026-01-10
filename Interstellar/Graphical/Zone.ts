import ZoneBackground from "./ZoneBackground";
import Interstellar from "../Interstellar";
import glitch, { glitchEx } from "./Transition";
import { Music } from "../Music/Music";
import { Textures } from "../Modding/Textures";
import { switchToTheme } from "../Modding/Theme";

export interface SubZone {
    name: string;
    color: number;
    description: string;
    background: ZoneBackground;
    // filter: Filter[];
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
    }

    teleportToZone(other: Zone) {
        glitchEx(300, async () => {
            let bg = other.subzones[other.currentIndex]?.background;
            if (bg) {
                await bg.load();
            }
        }, async () => {
            this.active = false;
            for (const subzone of this.subzones) {
                if (subzone.music) subzone.music.deactivate();
                if (subzone.background) subzone.background.unload();
            }
            other.createZone();
        });
    }

    createZone() {
        console.log("Creating zone", this.displayName);
        this.update();
        this.active = true;
        for (let i = 0; i < this.subzones.length; i++) {
            const subzone = this.subzones[i]!!;
            const background = subzone.background;
            if (i == this.currentIndex) {
                if (subzone.music) {
                    subzone.music.activate();
                }
                subzone.textures.switchToTexture();
                switchToTheme(subzone.theme);
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
                    if (this.useSmoothTransition) {
                        if (background.alpha < 1) background.alpha += 0.02;

                        if (background.alpha > 0.5 && this.transitionTarget != this.currentIndex) {
                            if (this.subzones[this.currentIndex]!!.music) this.subzones[this.currentIndex]!!.music!!.deactivate();
                            this.currentIndex = this.transitionTarget;
                            this.subzones[this.currentIndex]?.background.load();
                            if (this.subzones[this.currentIndex]!!.music) this.subzones[this.currentIndex]!!.music!!.activate();
                            this.subzones[this.currentIndex]?.textures.switchToTexture();
                            // Interstellar.graphics.game.filters = this.subzones[this.currentIndex]?.filter;
                            switchToTheme(this.subzones[this.currentIndex]!.theme);
                        }
                    }
                    else {
                        background.alpha = 1;
                        if (this.transitionTarget != this.currentIndex) {
                            if (this.subzones[this.currentIndex]!!.music) this.subzones[this.currentIndex]!!.music!!.deactivate();
                            this.currentIndex = this.transitionTarget;
                            glitchEx(300, async () => {
                                let bg = this.subzones[this.currentIndex]?.background;
                                if (bg) {
                                    await bg.load();
                                }
                            }, async () => {
                                if (this.active) if (this.subzones[this.currentIndex]!!.music) {
                                    this.subzones[this.currentIndex]!!.music!!.activate();
                                    this.subzones[this.currentIndex]?.textures.switchToTexture();
                                    // Interstellar.graphics.game.filters = this.subzones[this.currentIndex]?.filter;
                                    switchToTheme(this.subzones[this.currentIndex]!.theme);
                                }
                            })
                        }
                    }
                }
                else {
                    if (background.alpha > 0) {
                        if (this.useSmoothTransition) background.alpha -= 0.05;
                        else background.alpha = 0;
                        if (background.alpha <= 0) {
                            if (background) {
                                background.unload();
                            }
                        }
                    }
                }
            }
        }
        this.update();
    }

    update() {}

    render() {
        this.subzones.forEach((sub, i) => {
            if (i == this.currentIndex) return;
            sub.background.render();
        });
        // Render active background ON TOP.
        this.subzones[this.currentIndex]?.background.render();
    }
}

export default Zone;