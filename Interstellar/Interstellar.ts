import Patcher from "./Patching/Patcher";
import glitch, { glitchEx, loadTransitionSfx, updateGlitch } from "./Graphical/Transition";
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
import { LOADED_TEXTURES } from "./Modding/Textures";import { loadCloudscapeData } from "./Graphical/Backdrops/CloudscapeBackdrop";
import { createDefaultZones, DEFAULT_ZONES } from "./DefaultZones";
import Telemetry from "./Telemetry";
;
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

    failedLoading: [string, string, any][] = []

    build: number;
    telemetry = new Telemetry();
    badge_url = ""

    lastDelta = 0;
    deltaTime = 1;
    constructor() {
        // @ts-ignore
        window.Interstellar = this;
        let splits = document.getElementById("debugMenuOpener")!!.innerHTML.split(".");
        this.build = Number.parseInt(splits[splits.length - 1]!!);
        let dsaSettings = localStorage.getItem("dredark_user_settings");
        if (dsaSettings) this.connectServer = JSON.parse(dsaSettings).preferred_server;
        else this.connectServer = 0;
        this.dev = localStorage.getItem("interstellarDEV") == "true";
        const titleStyle = `font-family:Lexend,sans-sarif;font-size:40px;font-weight:bold;color:#C0L0R;`
        // @ts-ignore
        const gameVersion = require("GAME_VERSION").GAME_VERSION;
        console.log(
            `%cIn%cter%cstel%clar %c:3\n%cRunning${this.dev ? " [DEV]" : ""} build ${this.build}\n%cGame version: ${gameVersion}`,
            titleStyle.replace("C0L0R", "ff7aac"),titleStyle.replace("C0L0R", "ff9ec3"),titleStyle.replace("C0L0R", "ffbdd6"),titleStyle.replace("C0L0R", "ffe3ed"),titleStyle.replace("C0L0R", "ffffff"),
            "font-family: Lexend, sans-sarif; font-size:15px;",
            "font-family: Lexend, sans-sarif; font-size:15px;"
        );
        const gameContainer = document.querySelector("#game-container")!! as HTMLDivElement;
        gameContainer.oncontextmenu = () => {return false};
        this.drednotCanvas = document.querySelector("#canvas-game")!! as HTMLCanvasElement;
    }
    init() {
        switchToTheme({});
    }
    modsAreConfigurable = true;
    // Called when internal is loaded
    async loaded() {
        await __wbg_init({module_or_path: sessionStorage.getItem("interstellarwasm")!!});
        StellarAPI.Packet = new InterstellarPacketAPI();
        StellarAPI.DrednotSettings = new InterstellarDrednotSettingsAPI();
        loadTransitionSfx();
        this.badge_url = URL.createObjectURL(StellarAssetManager.internal!!["icons/badge.png"]!!.blob)
        PerformanceMetrics.split("Transition SFX");
        revealInterstellarExports();
        const enabledMods: string[] = JSON.parse(localStorage.getItem("interstellarEnabledMods") ?? "[\"interstellar.internal\", \"interstellar.qol\"]");
        localStorage.setItem("interstellarEnabledMods", JSON.stringify(enabledMods))
        let default_zones = createDefaultZones();
        for (let [key, value] of Object.entries(default_zones)) {
            this.zoneOverrides[key] = value;
        }
        this.menuZones = ["Super Special Event Zone", "Super Special Event Zone"]
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
        this.modsAreConfigurable = false;
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
        await this.patcher.waitWebGL;
        await loadCloudscapeData();
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

        for (let [modid, msg, err] of this.failedLoading) {
            StellarAPI.UI.openPromptEx(`Failed to load mod`, `${msg}\nPlease check console for stack trace/information.\n${err.stack}`, Patcher.promptManager.PromptType.Danger | Patcher.promptManager.PromptType.Formatted, () => {}, () => {});
        }
        
        this.assetManager.closeDatabase();
        this.telemetry.connect();
    }
    
    startTick() {
        this.deltaTime = performance.now() - this.lastDelta;
        this.lastDelta = performance.now();
        this.debugDrawer.drawingDebugInfo = false;
    }

    endTick() {
        if (!this.started) return;
        if (this.currentZone) this.currentZone.tick();

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

    reload_zone() {
        if (!this.currentZone) return;
        glitchEx(300, async () => {
            let subzone = this.currentZone!!.subzones[this.currentZone!!.currentIndex]!!;
            await subzone.background?.unload();
        }, async () => {
            let subzone = this.currentZone!!.subzones[this.currentZone!!.currentIndex]!!;
            await subzone.background?.load();
        });
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

    finalize_frame() {
        if (this.debugDrawer.drawingDebugInfo && !this.debugDrawer.showing) {
            this.debugDrawer.showing = true;
            this.debugDrawer.debuggerElement.style.display = "";

        }
        else if (!this.debugDrawer.drawingDebugInfo && this.debugDrawer.showing) {
            this.debugDrawer.showing = false;
            this.debugDrawer.debuggerElement.style.display = "none";

        }
    }

    reportFailed(modid: string, message: string, error: any) {
        console.error(message);
        console.error(error);
        this.failedLoading.push([modid, message, error]);
    }

    getBadgeURL() {
        return this.badge_url
    }
}
export default new Interstellar();