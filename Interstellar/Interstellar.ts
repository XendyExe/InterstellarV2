import { Application, Container, Sprite } from "pixi.js";
import Patcher from "./Patching/Patcher";
import { loadTransitionSfx, updateGlitch } from "./Graphical/Transition";
import AssetManager, { internalModpackName } from "./StellarAssetManager";
import { createModpack, Modpack } from "./Modding/Modpack";
import Zone from "./Graphical/Zone";
import musicPlayer from "./Music/MusicPlayer";
import { DebugDrawer } from "./Patching/DebugDrawer";
import PerformanceMetrics from "./PerformanceMetrics";
import { Music } from "./Music/Music";
import PatchUI from "./Patching/PatchUI";
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
import StellarCommandsManager from "./API/StellarCommandsManager"; StellarCommandsManager;

interface Graphics {
    game: Container,
    background: Container,
    drednot_sprite: Sprite
}

type Modpacks = Modpack | TexturePack

/* Interstellar Main */
class Interstellar {
    application: Application;
    drednotCanvas: HTMLCanvasElement;
    graphics: Graphics;
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
    
    appStartPromise: Promise<void>;
    started: boolean = false;
    fullyLoaded: boolean = false;
    currentZone: Zone | null = null;
    lastCanvasWidth: number = 0;
    lastCanvasHeight: number = 0;

    debugMenu = new DebugMenu();
    isFirefox: boolean = false;

    scriptingMods: Record<string, InterstellarScriptingMod> = {};

    isTestDred = location.hostname == "test.drednot.io"
    connectServer = -1;
    ingame = false;
    dev: boolean = false;
    constructor() {
        let dsaSettings = localStorage.getItem("dredark_user_settings");
        if (dsaSettings) this.connectServer = JSON.parse(dsaSettings).preferred_server;
        else this.connectServer = 0;
        this.dev = localStorage.getItem("interstellarDEV") == "true";
        console.log("Interstellar dev mode?", this.dev);
        const gameContainer = document.querySelector("#game-container")!! as HTMLDivElement;
        gameContainer.oncontextmenu = () => {return false};
        this.drednotCanvas = document.querySelector("#canvas-game")!! as HTMLCanvasElement;
        const interstellarCanvas = document.createElement("canvas");
        interstellarCanvas.oncontextmenu = () => {return false}
        interstellarCanvas.style.pointerEvents = "none";
        this.drednotCanvas.parentNode!!.insertBefore(interstellarCanvas, this.drednotCanvas);
        this.drednotCanvas.style.opacity = "0";

        this.application = new Application();
        this.appStartPromise = this.application.init({
            view: interstellarCanvas,
            resizeTo: window,
            autoStart: false
        })
        this.graphics = {
            game: new Container(),
            background: new Container(),
            drednot_sprite: Sprite.from(this.drednotCanvas)
        };
        this.graphics.drednot_sprite.texture.source.alphaMode = "premultiplied-alpha"
        this.graphics.drednot_sprite.zIndex = 0;
        this.graphics.background.zIndex = -100;
        this.graphics.game.addChild(this.graphics.drednot_sprite);
        this.graphics.game.addChild(this.graphics.background);
        this.graphics.game.sortChildren();
        this.application.stage.addChild(this.graphics.game);
    }
    init() {
        switchToTheme({});
    }
    // Called when internal is loaded
    async loaded() {
        if (getComputedStyle(document.querySelector("#top-bar")!!).animation == '0.7s ease 0s 1 normal none running slideTopBarIn') {
            alert("You seem to be using Shrekdark, which is not supported. Please disable that extension to use Interstellar! If this is incorrect, please create a bug report in the Interstellar server.\n\nShrekdark will produce a massive rectangle in the middle of your screen.")
        }
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
                this.loadedModpacks.unshift(await createModpack(flattenedModpack, true));
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
                this.loadedModpacks.unshift(await createModpack(flattenedModpack, true));
                for (const path of Object.keys(flattenedModpack)) {
                    delete AssetManager.internal!["InterstellarQOL/" + path];
                }
                PerformanceMetrics.split("Preloaded [RP] Interstellar QOL");
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
                    this.loadedModpacks.unshift(await createModpack(assetStore, false));
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

        PerformanceMetrics.split("Modpacks preloaded");

        if (this.font) {
            await this.font.load();
            document.fonts.add(this.font);
            document.body.style.fontFamily = `"${this.font.family}", monospace`;
        }

        PerformanceMetrics.split("Internal Modpack creation");
        await this.appStartPromise;
        this.modpackManager.init();
        PerformanceMetrics.end();
        PerformanceMetrics.pushBlankLine();
        PerformanceMetrics.pushBlankLine();
        this.started = true;
        setTimeout(this.backgroundLoader.bind(this), 0);
    }

    async backgroundLoader() {
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
    }
    endTick() {
        if (!this.started) return;
        PatchUI.setMenuOpacity(this.patcher.gameActive ? this.patcher.zoom : 1);
        let start = performance.now();
        updateGlitch();
        if (this.currentZone) this.currentZone.tick();
        if (this.drednotCanvas.width !== this.lastCanvasWidth || this.drednotCanvas.height !== this.lastCanvasHeight) {
            this.graphics.drednot_sprite.texture.destroy(false);
            this.graphics.drednot_sprite.texture = Sprite.from(this.drednotCanvas).texture;
            
            this.lastCanvasWidth = this.drednotCanvas.width;
            this.lastCanvasHeight = this.drednotCanvas.height;
        }
        else this.graphics.drednot_sprite.texture.source.update();
        this.application.render();
        this.debugDrawer.updateInterstellarFrameTime(performance.now() - start)
    }

    teleport(name: string) {
        if (this.zoneOverrides[name]) {
            if (this.currentZone) this.currentZone.teleportToZone(this.zoneOverrides[name]);
            else this.zoneOverrides[name].createZone();
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
}
export default new Interstellar();
