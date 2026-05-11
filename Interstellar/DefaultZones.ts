import Zone, { SubZone } from "./Graphical/Zone";
import ZoneBackground from "./Graphical/ZoneBackground";
import { Textures } from "./Modding/Textures";
import parseColor, { getR, getG, getB } from "./Modding/ColorParser";
import { gl } from "./Graphical/WebGLHelpers";

export class DefaultBackground extends ZoneBackground {
    bg_color: [number, number, number];
    constructor(bg_color: [number, number, number]) {
        super(100, 100, true);
        this.bg_color = bg_color;
    }

    override render(): void {
        gl.clearColor(...this.bg_color, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.clearColor(0, 0, 0, 0);
    }
}

let defaultTextures = new Textures();

export const DEFAULT_ZONES: Record<string, DefaultZone> = {}
export class DefaultZone extends Zone {
    bg_rgb: [number, number, number];
    constructor(name: string, description: string, description_color: number, background_color: string) {
        let bg_color = parseColor(background_color);
        let bg_rgb: [number, number, number] = [getR(bg_color), getG(bg_color), getB(bg_color)];
        let subzone: SubZone = {
            name,
            color: description_color,
            description,
            background: new DefaultBackground(bg_rgb),

            textures: defaultTextures,
            music: null,
            theme: {},
            allProcessors: [],
            gameProcessors: [],
            bgProcessors: []
        }
        super([subzone], 0);
        this.displayColor = subzone.color;
        this.displayName = subzone.name;
        this.displayDescription = subzone.description;
        this.bg_rgb = bg_rgb;
        DEFAULT_ZONES[name] = this;
    }

    override tick(): void {}

    override render(): void {
        this.subzones[0]?.background.render(this.bg_rgb);
    }
}

export function createDefaultZones() {
    new DefaultZone("Freeport", "Safe Zone. Weapons Disabled.", 4521796, "#999999");
    new DefaultZone("Super Special Event Zone", "the abyss calls for you ...", 16777215, "#000000");

    new DefaultZone("Hummingbird", "Low-Risk Lawful", 4521796, "#188a83");
    new DefaultZone("Finch", "Medium-Risk Lawful", 16777028, "#609da0");
    new DefaultZone("Sparrow", "High-Risk Lawful", 16746564, "#485b8e");

    new DefaultZone("Raven", "High-Risk Anarchic", 16729156, "#6a486b");
    new DefaultZone("Falcon", "Very High-Risk Anarchic", 16729156, "#330405");

    new DefaultZone("Canary", "[Mission] High-Value Mining", 13197862, "#a19f6d");
    new DefaultZone("The Pits", "[Mission] Buried Treasure", 11541580, "#634439");
    new DefaultZone("Vulture", "[Mission] Bot Hordes", 0, "#378a38");

    new DefaultZone("Combat Simulator", "Ships are restored on exit.", 16729343, "#333333");
    return DEFAULT_ZONES;
}