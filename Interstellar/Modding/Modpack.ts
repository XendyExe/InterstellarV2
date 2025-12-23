import { Filter } from "pixi.js/lib/filters/Filter";
import { ModpackZoneBackground } from "../Graphical/ModpackZoneBackground";
import Zone, { SubZone } from "../Graphical/Zone";
import Interstellar from "../Interstellar";
import { BackgroundConfig, BackgroundSprite } from "./ModdingTypes/BackgroundConfig";
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

export class Modpack {
    // @ts-ignore
    config: ModpackConfig;
    // @ts-ignore
    files: Record<string, BlobContainer>;
    urlCache: Record<string, string> = {};
    scripting: InterstellarScriptingMod | undefined
    constructor() {

    }
    // Inits and prepatches things that needs to be patched
    async init(flattened: Record<string, BlobContainer>, internal: boolean, nonvalidation=true): Promise<Modpack> {
        if (!flattened["interstellar.json"]) {
            console.log(flattened);
            throw "Modpack is missing init json"
        }
        this.config = JSON.parse(await flattened["interstellar.json"]?.blob.text());
        this.files = flattened;
        console.log("Preloading modpack", this.config!!.name);
        if (this.config.id == "internal") throw "Modpack id cannot be \"internal\"";
        if (this.config.id.trim().startsWith("interstellar.") && !internal) throw "Modpack id cannot start with \"interstellar.\"";
        if (this.config.audio) {
            for (const [audio, path] of Object.entries(this.config.audio)) {
                const loc = parsePath(path, "");
                const blob = this.files[loc];
                if (!blob) throw `Failed to find audio file location ${path} -> ${loc}`
                Interstellar.patcher.audioOverrides[audio] = this.getFileURL(loc);
            }
        }
        if (this.config.font) {
            let name = "interstellarFont";
            let path = parsePath(this.config.font, "");
            if (nonvalidation) Interstellar.font = new FontFace(name, `url(${this.getFileURL(path)})`);
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
        for (let key of Object.keys(this.files)) {
            delete this.files[key];
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
            const backgroundMap: Map<string, ModpackZoneBackground | null> = new Map();
            let configMusic: Music | null = null;
            if (config.music) {
                let path = parsePathFromFile(config.music, configPath);
                let file = this.files[path]!!;
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
                    theme = JSON.parse(await this.files[parsePathFromFile(themeRaw, configPath)]!.blob.text())
                } else theme = themeRaw;
                if (subzoneConfig.music) {
                    let musicPath = parsePathFromFile(subzoneConfig.music, configPath);
                    let musicFile = this.files[parsePathFromFile(subzoneConfig.music, configPath)]!!;
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
            const loadingPromise = [];
            for (const bgConfigPathRaw of backgroundMap.keys()) {
                const bgConfig: BackgroundConfig = await this.readJson(bgConfigPathRaw);
                const background = new ModpackZoneBackground(bgConfig.width, bgConfig.height, bgConfig.isPixelArt ?? false);
                for (const sprite of bgConfig.sprites) {
                    if (sprite.path) {
                        const _path = parsePathFromFile(sprite.path, bgConfigPathRaw);
                        let file = this.files[_path];
                        if (!file) throw `Failed to find file ${_path}`;
                        background.addSprite(sprite, file.blob);
                    } 
                    else if (sprite.animated) {
                        if (sprite.animated.sprites) {
                            let blobs: Blob[] = [];
                            sprite.animated.sprites.forEach(elm => {
                                const _path = parsePathFromFile(elm, bgConfigPathRaw);
                                let file = this.files[_path];
                                if (!file) throw `Failed to find file ${_path}`;
                                blobs.push(file.blob)
                            });
                            background.addAnimatedSprites(sprite, blobs);
                        } else if (sprite.animated.spritesheet) {
                            const _blobpath = parsePathFromFile(sprite.animated.spritesheet.image, bgConfigPathRaw);
                            const _jsonpath = parsePathFromFile(sprite.animated.spritesheet.json, bgConfigPathRaw);
                            const _blobfile = this.files[_blobpath];
                            const _jsonfile = this.files[_jsonpath];
                            if (!_blobfile) throw `Failed to find spritesheet image ${_blobpath}`;
                            if (!_jsonfile) throw `Failed to find spritesheet image ${_jsonpath}`;
                            let blob = _blobfile.blob;
                            let json = _jsonfile.blob;
                            background.addSpritesheetSprites(sprite, blob, json)
                        }
                    } else {
                        throw "Sprite isn't animated or static."
                    }
                }
                backgroundMap.set(bgConfigPathRaw, background);
                loadingPromise.push(...background.loading)
            }
            await Promise.all(loadingPromise);
            for (const background of backgroundMap.values()) {
                background!!.sortSprites();
            }
            const subzones: SubZone[] = [];
            for (const subzone of psudoSubzones) {
                const filters: Filter[] = [];
                for (const [filterName, filterProperties] of Object.entries(subzone.filters)) {
                    // @ts-ignore
                    const filterClass = PIXI.filters[filterName];
                    // @ts-ignore
                    const filter = new filterClass();
                    for (const [propName, propValue] of Object.entries(filterProperties)) {
                        filter[propName] = propValue;
                    }
                    filters.push(filter);
                }
                
                const bg = backgroundMap.get(subzone.background);
                const textures = new Textures();

                for (let [override, blob] of Object.entries(textureCache)) {
                    textures.addTexture(override, blob);
                }

                for (let [override, path] of Object.entries(subzone.textures)) {
                    path = parsePathFromFile(path, configPath);
                    if (!this.files[path]) throw `Failed to find texture at ${path}`;
                    textures.addTexture(override, this.files[path]!.blob)
                }

                subzones.push({
                    name: subzone.name,
                    description: subzone.description,
                    background: bg!!,
                    filter: filters,
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
    
    getFileURL(path: string) {
        const file = this.files[path];
        if (!file) throw `Failed to find file ${path}`
        if (!this.urlCache[path]) this.urlCache[path] = URL.createObjectURL(file.blob);
        return this.urlCache[path];
    }

    async readJson(path: string) {
        if (!this.files[path]) throw `Could not find json at ${path}`;
        try {
            return JSON.parse(await this.files[path]!!.blob.text());
        } catch (e) {
            throw `Failed to read json at ${path}:\n${e}`;
        }
    }
}

export async function createModpack(flattened: Record<string, BlobContainer>, internal: boolean): Promise<Modpack> {
    return await (new Modpack()).init(flattened, internal);
}