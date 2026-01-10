import Zone, { SubZone } from "../Graphical/Zone";
import Interstellar from "../Interstellar";
import { BackgroundConfig } from "./ModdingTypes/BackgroundConfig";
import ModpackConfig from "./ModdingTypes/ModpackConfig";
import { PsudoSubzone, SubzoneConfig, ZoneConfig } from "./ModdingTypes/ZoneConfig";
import CycleZone from "../Graphical/CycleZone";
import NavZone from "../Graphical/NavZone";
import { Music } from "../Music/Music";
import parseColor from "./ColorParser";
import { Textures } from "./Textures";
import { parsePath, parsePathFromFile } from "./PathParser";
import { loadScriptingMod } from "./ScriptingModLoader";
import { BlobContainer } from "../API/Utils";
import InterstellarScriptingMod from "../API/InterstellarScriptingMod";
import { WebGLZoneBackground } from "../Graphical/WebGLZoneBackground";

export class Modpack {
    // @ts-ignore
    config: ModpackConfig;
    // @ts-ignore
    urlCache: Record<string, string> = {};
    scripting: InterstellarScriptingMod | undefined
    // @ts-ignore
    getFile: Function;
    // @ts-ignore
    cleanFiles: Function;
    // Inits and prepatches things that needs to be patched
    devpack: boolean = false;
    assetStoreName: string;
    internalName: string | undefined;

    constructor(assetStoreName: string, internalName?: string | undefined) {
        this.assetStoreName = assetStoreName;
        this.internalName = internalName;
    }

    async initdevpack(getFilesFunction: Function, internal: boolean, cleanFilesFunction: Function, nonvalidation=true) {
        this.devpack = true;
        return await this.init(getFilesFunction, internal, cleanFilesFunction, nonvalidation);
    }

    async init(getFilesFunction: Function, internal: boolean, cleanFilesFunction: Function, nonvalidation=true): Promise<Modpack> {
        this.getFile = getFilesFunction;
        this.cleanFiles = cleanFilesFunction;
        this.config = JSON.parse(await (await this.getFile("interstellar.json"))!!.blob.text());
        if (this.devpack) this.config.id = "interstellar.devpack";
        console.log("Preloading modpack", this.config!!.name);
        if (this.config.id.trim().startsWith("interstellar.") && !internal) throw "Modpack id cannot start with \"interstellar.\"";
        if (this.config.audio) {
            for (const [audio, path] of Object.entries(this.config.audio)) {
                const loc = parsePath(path, "");
                const blob = await this.getFile(loc);
                if (!blob) throw `Failed to find audio file location ${path} -> ${loc}`
                Interstellar.patcher.audioOverrides[audio] = await this.getFileURL(loc);
            }
        }
        if (this.config.font) {
            let name = "interstellarFont";
            let path = parsePath(this.config.font, "");
            if (nonvalidation) Interstellar.font = new FontFace(name, `url(${await this.getFileURL(path)})`);
        }

        if (this.config.scripting && nonvalidation) {
            this.scripting = await loadScriptingMod(this)
            await this.scripting!!.preload();
        }
        return this;
    }
    async load(textureCache: Record<string, Blob>, nonvalidation=true) {
        console.log("Loading modpack", this.config!!.name);
        if (this.scripting) await this.scripting.load();

        if (this.config.zones) await this.loadZones(textureCache, nonvalidation);
        await this.cleanFiles();
        for (const url of Object.values(this.urlCache)) {
            URL.revokeObjectURL(url);
        }
        console.log("Unloaded assets from " + this.config.id);
    }

    async loadZones(textureCache: Record<string, Blob>, nonvalidation=true) {
        for (const [zoneOverride, configPathRaw] of Object.entries(this.config.zones!!)) {
            const configPath = parsePath(configPathRaw, "");
            const config: ZoneConfig = await this.readJson(configPath);
            let defaultZoneColor = parseColor(config.color);
            const defaultName = config.name;
            const defaultDescription = config.description;
            if (!defaultName || !defaultDescription) throw "Zones must have a name and description";

            const psudoSubzones: PsudoSubzone[] = [];
            const backgroundMap: Map<string, WebGLZoneBackground | null> = new Map();
            let configMusic: Music | null = null;
            if (config.music) {
                let path = parsePathFromFile(config.music, configPath);
                let file = await this.getFile(path)!!;
                if (!file) throw `Failed to get music from ${path}`;
                configMusic = new Music(this.config.id + "/" + path, file.hash, config.music_start ?? 0);
            }
            for (const subzoneConfig of config.subzones) {
                let name = subzoneConfig.name ?? config.name;
                let description = subzoneConfig.description ?? config.description;
                let background = subzoneConfig.background ?? config.background;
                let music = configMusic ?? null;
                let themeRaw = subzoneConfig.theme ?? config.theme ?? {};
                let theme = {};
                if (typeof themeRaw == "string") {
                    theme = JSON.parse(await (await this.getFile(parsePathFromFile(themeRaw, configPath)))!.blob.text())
                } else theme = themeRaw;
                if (subzoneConfig.music) {
                    let musicPath = parsePathFromFile(subzoneConfig.music, configPath);
                    let musicFile = await this.getFile(parsePathFromFile(subzoneConfig.music, configPath))!!;
                    if (!musicFile) throw `Failed to get music from ${musicPath}`;
                    music = new Music(this.config.id + "/" + musicPath, musicFile.hash, subzoneConfig.music_start ?? config.music_start ?? 0);
                }
                let subzoneColor = subzoneConfig.color ?? defaultZoneColor ?? 0;
                subzoneColor = parseColor(subzoneColor);
                let textures = subzoneConfig.textures ?? config.textures ?? {};
                let filters = subzoneConfig.filters ?? config.filters ?? {};
                if (!background) throw "Subzone is missing a background and there is no default background";
                background = parsePathFromFile(background, configPath);
                backgroundMap.set(background, null);
                psudoSubzones.push({name, description, background, music, textures, filters, color: subzoneColor, theme});
            }
            for (const bgConfigPathRaw of backgroundMap.keys()) {
                const bgConfig: BackgroundConfig = await this.readJson(bgConfigPathRaw);
                const background = new WebGLZoneBackground(bgConfigPathRaw, bgConfig, this.assetStoreName, bgConfig.width, bgConfig.height, bgConfig.isPixelArt ?? false, this.internalName);
                backgroundMap.set(bgConfigPathRaw, background);
            }
            const subzones: SubZone[] = [];
            for (const subzone of psudoSubzones) {
                // const filters: Filter[] = [];
                // for (const [filterName, filterProperties] of Object.entries(subzone.filters)) {
                //     // @ts-ignore
                //     const filterClass = PIXI.filters[filterName];
                //     // @ts-ignore
                //     const filter = new filterClass();
                //     for (const [propName, propValue] of Object.entries(filterProperties)) {
                //         filter[propName] = propValue;
                //     }
                //     filters.push(filter);
                // }
                
                const bg = backgroundMap.get(subzone.background);
                const textures = new Textures();

                for (let [override, blob] of Object.entries(textureCache)) {
                    textures.addTexture(override, blob);
                }

                for (let [override, path] of Object.entries(subzone.textures)) {
                    path = parsePathFromFile(path, configPath);
                    if (!await this.getFile(path)) throw `Failed to find texture at ${path}`;
                    textures.addTexture(override, (await this.getFile(path))!.blob)
                }

                subzones.push({
                    name: subzone.name,
                    description: subzone.description,
                    background: bg!!,
                    // filter: filters,
                    textures: textures,
                    music: subzone.music,
                    color: subzone.color,
                    theme: subzone.theme
                })
            }
            let createdZone: Zone | null = null;
            if (config.cycle_style) {
                let cycleTime = config.cycle_time ?? 60;
                createdZone = new CycleZone(subzones, config.cycle_style, cycleTime);
            } else if (config.use_nav) {
                createdZone = new NavZone(subzones, 0);
                if (config.nav_default) (createdZone as NavZone).navDefault = config.nav_default;
            } else {
                createdZone = new Zone(subzones, 0)
            }
            createdZone.displayName = config.name;
            createdZone.displayDescription = config.description;
            createdZone.displayColor = defaultZoneColor;
            createdZone.useSmoothTransition = config.smooth_transition ?? false;
            if (nonvalidation) {
                Interstellar.zoneOverrides[zoneOverride] = createdZone;
                if (this.config.menu) {
                    Interstellar.menuZones = this.config.menu;
                }
            }
        }
    }
    
    async getFileURL(path: string) {
        const file = await this.getFile(path);
        if (!file) throw `Failed to find file ${path}`
        if (!this.urlCache[path]) this.urlCache[path] = URL.createObjectURL(file.blob);
        return this.urlCache[path];
    }

    async readJson(path: string) {
        if (!await this.getFile(path)) throw `Could not find json at ${path}`;
        try {
            return JSON.parse(await (await this.getFile(path))!!.blob.text());
        } catch (e) {
            throw `Failed to read json at ${path}:\n${e}`;
        }
    }
}

export async function createModpack(flattened: Record<string, BlobContainer>, internal_name: string | undefined, assetStoreName: string): Promise<Modpack> {
    const getFileFunction = async (path: string) => {
        return flattened[path];
    }
    const cleanFilesFunction = async () => {
        for (let key of Object.keys(flattened)) {
            delete flattened[key];
        }
    }
    return await (new Modpack(assetStoreName, internal_name)).init(getFileFunction, !!internal_name, cleanFilesFunction);
}