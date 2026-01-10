import Patcher from "./Patching/Patcher";
import glitch, { loadTransitionSfx, updateGlitch } from "./Graphical/Transition";
import AssetManager, { internalModpackName } from "./StellarAssetManager";
import { createModpack, Modpack } from "./Modding/Modpack";
import Zone from "./Graphical/Zone";
import musicPlayer from "./Music/MusicPlayer";
import { DebugDrawer } from "./Patching/DebugDrawer";
import PerformanceMetrics from "./PerformanceMetrics";
import { Music } from "./Music/Music";
import { InterstellarSettings } from "./Settings";
import { switchToTheme } from "./Modding/Theme";
import { ModpackManager } from "./Modding/ModpackManager";
import { createTexturePack, TexturePack } from "./Modding/TexturePack";
import StellarAssetManager from "./StellarAssetManager";
import ModpackConfig from "./Modding/ModdingTypes/ModpackConfig";
import StellarAPI, { InterstellarPacketAPI, InterstellarDrednotSettingsAPI } from "./API/StellarAPI";
import DebugMenu from "./DebugMenu";
import InterstellarScriptingMod from "./API/InterstellarScriptingMod";
import { revealInterstellarExports } from "./API/APILinker";
import StellarEventManager from "./API/StellarEventManager";
import { TriggerEvent } from "./API/InterstellarEvents";
import UIEventDispatcher from "./Patching/UIEventDispatcher";
import StellarCommandsManager from "./API/StellarCommandsManager";import ModpackImporter from "./Modding/ModpackImporter";
import Devpack from "./API/Devpack";
import __wbg_init from "@InterstellarInternals";
import { LOADED_TEXTURES } from "./Modding/Textures";
import { gl } from "./Graphical/WebGLHelpers";
StellarCommandsManager;


type Modpacks = Modpack | TexturePack

/* Interstellar Main */
class Interstellar {
    drednotCanvas: HTMLCanvasElement;
    patcher = Patcher;
    settingsManager: InterstellarSettings = new InterstellarSettings();
    api = StellarAPI
    uiEventDispatcher = new UIEventDispatcher();
    // @ts-ignore
    debugDrawer: DebugDrawer;
    displayBGName: string = "None !";
    assetManager = AssetManager;
    modpackManager = new ModpackManager();

    zoneOverrides: Record<string, Zone> = {};
    moddedNameZones: Record<string, Zone> = {};
    menuZones: string[] = [];
    loadedModpacks: Modpacks[] = [];
    canonicalZone: string = "";
    font: FontFace | undefined;
    
    started: boolean = false;
    fullyLoaded: boolean = false;
    currentZone: Zone | null = null;

    debugMenu = new DebugMenu();
    isFirefox: boolean = false;

    scriptingMods: Record<string, InterstellarScriptingMod> = {};
    url = localStorage.getItem("interstellar-extension-url") ?? ""

    isTestDred = location.hostname == "test.drednot.io"
    connectServer = -1;
    ingame = false;
    dev: boolean = false;

    build: number;
    constructor() {
        // @ts-ignore
        window.Interstellar = this;
        let splits = document.getElementById("debugMenuOpener")!!.innerHTML.split(".");
        this.build = Number.parseInt(splits[splits.length - 1]!!);
        let dsaSettings = localStorage.getItem("dredark_user_settings");
        if (dsaSettings) this.connectServer = JSON.parse(dsaSettings).preferred_server;
        else this.connectServer = 0;
        this.dev = localStorage.getItem("interstellarDEV") == "true";
        console.log("Interstellar dev mode?", this.dev, "for build", this.build);
        const gameContainer = document.querySelector("#game-container")!! as HTMLDivElement;
        gameContainer.oncontextmenu = () => {return false};
        this.drednotCanvas = document.querySelector("#canvas-game")!! as HTMLCanvasElement;
    }
    init() {
        switchToTheme({});
    }
    // Called when internal is loaded
    async loaded() {
        await __wbg_init({module_or_path: sessionStorage.getItem("interstellarwasm")!!});
        StellarAPI.Packet = new InterstellarPacketAPI();
        StellarAPI.DrednotSettings = new InterstellarDrednotSettingsAPI();
        loadTransitionSfx();
        PerformanceMetrics.split("Transition SFX");
        revealInterstellarExports();
        const enabledMods: string[] = JSON.parse(localStorage.getItem("interstellarEnabledMods") ?? "[\"interstellar.internal\", \"interstellar.qol\"]");
        localStorage.setItem("interstellarEnabledMods", JSON.stringify(enabledMods))

        let brokenMods = [];
        for (const modid of enabledMods) {
            if (modid == "interstellar.internal") {
                const flattenedModpack: Record<string, {blob: Blob, [key: string]: any}> = {};
                for (const [path, file] of Object.entries(AssetManager.internal!!)) {
                    const split = path.split("/");
                    if (split[0] == internalModpackName) {
                        split.shift();
                        flattenedModpack[split.join("/")] = file;
                    }
                }
                this.loadedModpacks.unshift(await createModpack(flattenedModpack, internalModpackName, "internal"));
                for (const path of Object.keys(flattenedModpack)) {
                    delete AssetManager.internal![internalModpackName + "/" + path];
                }
                PerformanceMetrics.split("Preloaded [RP] Strawberry Jam");
            } else if (modid == "interstellar.qol") {
                const flattenedModpack: Record<string, {blob: Blob, [key: string]: any}> = {};
                for (const [path, file] of Object.entries(AssetManager.internal!!)) {
                    const split = path.split("/");
                    if (split[0] == "InterstellarQOL") {
                        split.shift();
                        flattenedModpack[split.join("/")] = file;
                    }
                }
                this.loadedModpacks.unshift(await createModpack(flattenedModpack, "InterstellarQOL", "internal"));
                for (const path of Object.keys(flattenedModpack)) {
                    delete AssetManager.internal!["InterstellarQOL/" + path];
                }
                PerformanceMetrics.split("Preloaded [RP] Interstellar QOL");
            } else if (modid == "interstellar.devpack") {
                try {
                    await Devpack.load();
                    this.loadedModpacks.push(Devpack.modpack!!);
                } catch (e) {
                    brokenMods.push("interstellar.devpack");
                    console.error(e);
                    setTimeout(() => {
                        StellarAPI.UI.showPrompt("Failed to load devpack", `Failed to load devpack: ${e}\nThe mod has been disabled for you.`, () => {})
                    }, 1000);
                }
            } else {
                if (!StellarAssetManager.database!!.objectStoreNames.contains(modid)) {
                    brokenMods.push(modid);
                    continue;
                }
                let assetStore = await StellarAssetManager.loadAssetStore(modid)
                const configGetter = await assetStore["interstellar.json"];
                if (!configGetter) {
                    brokenMods.push(modid);
                    continue;
                }
                let config: ModpackConfig = JSON.parse(await configGetter.blob.text());
                if (config.texture_pack) {
                    this.loadedModpacks.unshift(await createTexturePack(assetStore));
                    PerformanceMetrics.split(`Preloaded [TP] ${config.name}`);
                } else {
                    this.loadedModpacks.unshift(await createModpack(assetStore, undefined, modid));
                    for (const path of Object.keys(assetStore)) {
                        delete assetStore[path];
                    }
                    PerformanceMetrics.split(`Preloaded [RP] ${config.name}`);
                }
            }
        }

        brokenMods.forEach(mod => {
            const index = enabledMods.indexOf(mod);
            if (index != -1) enabledMods.splice(index, 1);
        })
        localStorage.setItem("interstellarEnabledMods", JSON.stringify(enabledMods));

        PerformanceMetrics.split("Modpacks preloaded");

        if (this.font) {
            await this.font.load();
            document.fonts.add(this.font);
            document.body.style.fontFamily = `"${this.font.family}", monospace`;
        }

        PerformanceMetrics.split("Internal Modpack creation");
        this.modpackManager.init();
        PerformanceMetrics.end();
        PerformanceMetrics.pushBlankLine();
        PerformanceMetrics.pushBlankLine();
        this.started = true;
        setTimeout(this.backgroundLoader.bind(this), 0);
    }

    async backgroundLoader() {
        await this.patcher.waitRequires;
        PerformanceMetrics.push(`Async load:`);
        PerformanceMetrics.split(`Loading modpacks`);
        StellarEventManager.dispatchTrigger(TriggerEvent.LOAD);

        let textureCache: Record<string, Blob> = {};
        for (const modpack of this.loadedModpacks) { 
            await Interstellar.yield();
            try {
                await modpack.load(textureCache);
            } catch (e) {
                this.api.UI.showPrompt("Error", `Failed to load ${modpack.config.id} (${modpack.config.name}):\n\n${e}\n\nCheck console for more information!`, ()=>{})
                console.error(e);
            }
            PerformanceMetrics.split(`Loaded ${modpack.config.name} (${modpack.config.id})`);
        }
        delete AssetManager.internal!!["StrawberryJamPack"];
        console.log(AssetManager.internal);
        for (const key of Object.keys(textureCache)) {
            delete textureCache[key];
        }
        this.fullyLoaded = true;
        PerformanceMetrics.split(`All modpacks loaded`);
        const usedMusic: Music[] = [];
        for (const [dred, z] of Object.entries(this.zoneOverrides)) {
            this.moddedNameZones[z.displayName] = z;
            for (const subzone of z.subzones) {
                if (!usedMusic.includes(subzone.music!)) usedMusic.push(subzone.music!);
            }
        }
        PerformanceMetrics.split(`Mapped zones`);
        this.teleport(this.menuZones[StellarAPI.getSelectedServer()]!!);
        PerformanceMetrics.split(`Completed async load, loading music...`);
        await Interstellar.yield();
        await musicPlayer.loadMusic(usedMusic);
        PerformanceMetrics.split(`Finished loading music!`);
        PerformanceMetrics.end();

        let texture_mem = 0;
        LOADED_TEXTURES.forEach(textureBlob => {
            texture_mem += textureBlob.size;
        });
        LOADED_TEXTURES.clear();
        LOADED_TEXTURES.memory = texture_mem;

        // Delete musiccache if still exists
        console.log("Deleting musiccache");
        await new Promise<void>((resolve, reject) => {
            const req = indexedDB.deleteDatabase("musiccache");
            req.onsuccess = () => resolve();
            req.onerror = () => {
                console.error("Failed to delete musiccache", req.error);
                reject(req.error);
            };
        });
        console.log("Done!");
    }


    frameTime: number = 0;
    drawBackgrounds() {
        this.frameTime = 0;
        if (!this.currentZone) return;
        let start = performance.now();
        const state = {
            program: gl.getParameter(gl.CURRENT_PROGRAM),
            arrayBuffer: gl.getParameter(gl.ARRAY_BUFFER_BINDING),
            texture: gl.getParameter(gl.TEXTURE_BINDING_2D),
            activeTexture: gl.getParameter(gl.ACTIVE_TEXTURE),
            // Save vertex attribute state
            vertexAttrib0: {
                enabled: gl.getVertexAttrib(0, gl.VERTEX_ATTRIB_ARRAY_ENABLED),
                buffer: gl.getVertexAttrib(0, gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING),
                size: gl.getVertexAttrib(0, gl.VERTEX_ATTRIB_ARRAY_SIZE),
                stride: gl.getVertexAttrib(0, gl.VERTEX_ATTRIB_ARRAY_STRIDE),
                offset: gl.getVertexAttribOffset(0, gl.VERTEX_ATTRIB_ARRAY_POINTER)
            },
            vertexAttrib1: {
                enabled: gl.getVertexAttrib(1, gl.VERTEX_ATTRIB_ARRAY_ENABLED),
                buffer: gl.getVertexAttrib(1, gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING),
                size: gl.getVertexAttrib(1, gl.VERTEX_ATTRIB_ARRAY_SIZE),
                stride: gl.getVertexAttrib(1, gl.VERTEX_ATTRIB_ARRAY_STRIDE),
                offset: gl.getVertexAttribOffset(1, gl.VERTEX_ATTRIB_ARRAY_POINTER)
            },
            blend: gl.getParameter(gl.BLEND),
            blendSrc: gl.getParameter(gl.BLEND_SRC_ALPHA),
            blendDst: gl.getParameter(gl.BLEND_DST_ALPHA)
        };

        this.currentZone.render();
        
        // Restore everything
        gl.useProgram(state.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, state.arrayBuffer);
        gl.bindTexture(gl.TEXTURE_2D, state.texture);
        gl.activeTexture(state.activeTexture);
        
        // Restore vertex attributes
        if (state.vertexAttrib0.enabled) {
            gl.enableVertexAttribArray(0);
            gl.bindBuffer(gl.ARRAY_BUFFER, state.vertexAttrib0.buffer);
            gl.vertexAttribPointer(0, state.vertexAttrib0.size, gl.FLOAT, false, 
                state.vertexAttrib0.stride, state.vertexAttrib0.offset);
        } else {
            gl.disableVertexAttribArray(0);
        }
        
        if (state.vertexAttrib1.enabled) {
            gl.enableVertexAttribArray(1);
            gl.bindBuffer(gl.ARRAY_BUFFER, state.vertexAttrib1.buffer);
            gl.vertexAttribPointer(1, state.vertexAttrib1.size, gl.FLOAT, false,
                state.vertexAttrib1.stride, state.vertexAttrib1.offset);
        } else {
            gl.disableVertexAttribArray(1);
        }
        
        if (!state.blend) gl.disable(gl.BLEND);
        this.frameTime += performance.now() - start;
    }

    endTick() {
        if (!this.started) return;
        let start = performance.now();
        updateGlitch();
        if (this.currentZone) this.currentZone.tick();
        this.debugDrawer.updateInterstellarFrameTime((performance.now() - start) + this.frameTime)
    }

    teleport(name: string) {
        if (this.zoneOverrides[name]) {
            if (this.currentZone) this.currentZone.teleportToZone(this.zoneOverrides[name]);
            else {
                this.zoneOverrides[name].createZone();
                let activeZone = this.zoneOverrides[name];
                activeZone.subzones[activeZone.currentIndex]?.background.load();
            }
        }
    }

    static log(...args: any[]) {
        console.log("Interstellar: " , ...args)
    }

    static async yield() {
        await new Promise(resolve => setTimeout(resolve, 0));
    }

    async yield() {
        await Interstellar.yield();
    }

    sendChatLog(message: string) {
        StellarAPI.UI.writeChat(`<b>[<span style="color: #ff7aac">Interstellar</span>]:&nbsp;</b>${message}`)
    }

    tryImport(e: any) {
        // This is blatently stolen from drednot.
        try {
            let t = e.webkitGetAsEntry();
            if (t != null) {
                if (t.isDirectory) {
                    StellarAPI.UI.showPrompt("Import Pack?", `Do you want to import the directory '${t.name}' as a modpack?`, () => {
                        this.modpackManager.open();
                        ModpackImporter.importDirectory(t);
                    })
                    return true
                }
            }
        } catch (l) {}
        let s = e.getAsFile();
        if (s != null && (s.type == "application/x-zip-compressed" || s.type == "application/zip")) {
            StellarAPI.UI.showPrompt("Import Pack?", `Do you want to import the archive '${s.name}' as a modpack?`, async () => {
                this.modpackManager.open();
                ModpackImporter.importZip(s);
            });
            return true
        }
        return false
    }
}
export default new Interstellar();
