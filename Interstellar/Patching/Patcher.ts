import { get_internals, give_world_manager } from "@InterstellarInternals";
import {
    AdvertClickEvent,
    ChatCloseEvent,
    ChatMessageRecieveEvent,
    ChatMessageSendEvent,
    CrewListUpdateEvent,
    FilterShipEvent,
    JoinShipEvent,
    JoinShipRequestEvent,
    ProcessAdvertsEvent,
    ProcessMOTDEvent,
    RenderAdvertsEvent,
    RenderPassOneEvent,
    RenderPassThreeEvent,
    RenderPassTwoEvent,
    SocketCloseEvent,
    SocketMessageRecieveEvent, SocketMessageSendEvent,
    SocketOpenEvent,
    TriggerEvent,
    WriteChatEvent
} from "../API/InterstellarEvents";
import StellarAPI from "../API/StellarAPI";
import StellarCommandsManager from "../API/StellarCommandsManager";
import StellarEventManager from "../API/StellarEventManager";
import Interstellar from "../Interstellar";
import { DREDNOT_ZONES } from "../StellarConstants";
import { DebugDrawer, LoadDebugRequires } from "./DebugDrawer";
import { gl, helper_setwebgl } from "../Graphical/WebGLHelpers";
import InterstellarWebGL from "../Graphical/InterstellarWebGL";


const joinShipServerMessage = /Joined ship '(.*?)' {([0-9A-F]+)}$/
const joinMessage = /(\[(Captain|Crew)\])?(#?[a-zA-Z0-9-_ ]+) joined the ship\./;
class Patcher {
    webgl: WebGL2RenderingContext | undefined = undefined;

    audioOverrides: Record<string, string> = {};
    imageOverrides: Record<string, string> = {};
    zoom: number = 1;

    navDestination: number = 0;
    playerX: number = 0;
    playerY: number = 0;
    shipX: number = 0;
    shipY: number = 0;

    internalModFileManager: any;
    promptManager: any;
    inputManager: any;
    preact: any;
    msgpack: any;
    worldManager: any;
    accountManager: any;
    // @ts-ignore
    socketmsgtypes: any = require("SocketMsgTypes");
    htmluifunctions: any;
    textformatter: any;
    graphics: any;
    // @ts-ignore
    usersettingsmanager: any = require("UserSettingManager");
    gameActive = false;
    enableGriefMessages = true;
    sendChatCallback: any;

    interstellarInternals: any;

    resolveWaitRequires: any;
    waitRequires = new Promise<void>((resolve) => {this.resolveWaitRequires = resolve;})

    resolveWebGL: any;
    waitWebGL = new Promise<void>((resolve) => {this.resolveWebGL = resolve;})

    constructor() {
        // Idk why i need to do this
        document.getElementById("motd-toggle")!!.classList.remove("close");
        document.getElementById("motd-toggle")!!.classList.add("btn-small");
    }

    loadRequires() {
        // @ts-ignore
        this.internalModFileManager = require("ModFileDatabase");
        this.internalModFileManager.modFileDB.deleteAllFiles();
        // @ts-ignore
        this.promptManager = require("PromptManager");
        // @ts-ignore
        this.inputManager = require("InputManager");
        // @ts-ignore
        this.worldManager = require("WorldManager");
        // @ts-ignore
        give_world_manager(this.worldManager);
        // @ts-ignore
        this.accountManager = require("AccountManager");
        // @ts-ignore
        this.htmluifunctions = require("HTMLUIFunctions");
        // @ts-ignore
        this.graphics = require("Graphics");
        // @ts-ignore
        this.textformatter = require("TextFormatter");
        this.interstellarInternals = get_internals();
        this.resolveWaitRequires();
    }

    setWebgl(_gl: WebGL2RenderingContext) {
        this.webgl = _gl;
        helper_setwebgl(_gl)
        // @ts-ignore
        window.game_webgl = _gl;
        InterstellarWebGL.create();
        this.resolveWebGL();
        return _gl;
    }

    getNavDestination() {
        return this.interstellarInternals.nav_destination;
    }

    toggleUIPatch(model: string, current: any) {
        return StellarAPI.UI.settingModels[model] ?? current;
    }

    trigger_frame_start() {
        StellarEventManager.dispatchTrigger(TriggerEvent.FRAME_START);
        const gl = this.webgl!!;
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        InterstellarWebGL.renderPassBackgrounds();
        Interstellar.startTick();
    }

    trigger_frame_end(cl: any) {
        StellarEventManager.dispatchTrigger(TriggerEvent.FRAME_END)
        this.gameActive = cl.isGameActive();
        this.zoom = this.gameActive ? cl.local_cam_zoom : 0;
        this.navDestination = this.getNavDestination();
        InterstellarWebGL.endFrame();
        Interstellar.endTick();
    }

    finalize_frame() {
        Interstellar.finalize_frame();
    }

    patchAssetTables(images: Record<string, string>, audio: Record<string, string>) {
        this.imageOverrides["bg_gradient.png"] = "";
        this.imageOverrides["huge_sign.png"] = "";
        this.imageOverrides["star.png"] = "";
        Object.assign(images, this.imageOverrides);
        Object.assign(audio, this.audioOverrides);
    }

    handleMessage(message: any): any {
        if (message.type == StellarAPI.Packet.SvMsgChat) {
            const raw = message.text;
            const e = new ChatMessageRecieveEvent(raw, message);
            const text = e.getText();
            let match;
            if (match = text.match(joinShipServerMessage)) {
                StellarAPI.currentShip = {
                    name: match[1]!!,
                    hex: match[2]!!,
                    health: 0,
                    max_health: 0,
                    warp_time: 0,
                    max_warp_time: 0
                };
                StellarAPI.Game.getLocalOnlinePlayerNames().forEach(player=>StellarAPI.Game.cachedPlayers.add(player));
                (new JoinShipEvent(match[1]!!, match[2]!!)).dispatch();
            } else if (match = text.match(joinMessage)) {
                StellarAPI.Game.cachedPlayers.add(match[3]!!)
            }
            if (!Interstellar.settingsManager.settings.disableInterstellarBadge) {
                let text_section;
                if ((((text_section = message.text[0]?.c[0]) || (text_section = message.text.c[0])) ?? null) !== null) {
                    let hasBadge = false;
                    let name = text_section[text_section.length - 1];
                    if (name.b) { name = text_section[text_section.length - 2]; hasBadge = true;}
                    name = name.c;
                    if (Interstellar.telemetry.badgeUsers.includes(name)) {
                        if (hasBadge) {
                            text_section[text_section.length - 1].b.unshift("interstellar");
                        }
                        else text_section.push({"b": ["interstellar"]})
                    }
                }
            }
            e.dispatch();
            e.packet.text = e.raw;
            if (e.isCanceled()) return false;
        } else if (message.type == StellarAPI.Packet.SvMsgCaptainInfo) {
            if (message.submessage.type == "player_list") {
                StellarAPI.Game.sentCrewControlRequest = true;
                message.submessage.player_list.forEach((elm: any) => {
                    for (let t = 0; t < StellarAPI.Game.cachedCrewControl.length; t++) {
                        if (StellarAPI.Game.cachedCrewControl[t]!!.ref_id == elm.ref_id) {
                            if (elm._removed) {
                                StellarAPI.Game.cachedCrewControl.splice(t, 1)
                            } else {
                                StellarAPI.Game.cachedCrewControl[t] = elm
                            }
                            return
                        }
                    }
                    if (!elm._removed) {
                        StellarAPI.Game.cachedCrewControl.push(elm)
                    }
                });
                StellarAPI.Game.cachedCrewControl.forEach(elm => {StellarAPI.Game.cachedPlayers.add(elm.discrim)});
                if (document.activeElement === StellarCommandsManager.chatInputElement) StellarCommandsManager.chatChanged(StellarCommandsManager.chatInputElement.value);
                (new CrewListUpdateEvent(StellarAPI.Game.cachedCrewControl)).dispatch();
            }
        }
        // @ts-ignore
        if (window.debug_packets && message.type != StellarAPI.Packet.SvMsgSnapshot && message.type != StellarAPI.Packet.SvMsgRelayStats) {
            console.log("recv", message);
        }
        const e = new SocketMessageRecieveEvent(message);
        e.dispatch();
        return e.isCanceled() ? false : message;
    }

    chatQueue: any[] = [];
    lastChatTime = 0;
    handleMessageSend(message: any) {
        let event = new SocketMessageSendEvent(message);
        event.dispatch();
        if (event.isCanceled()) {
            return null;
        }

        // @ts-ignore
        if (message.type == StellarAPI.Packet.ClMsgChat) {
            if (this.chatQueue.length > 0 || Date.now() - this.lastChatTime < 1000) {
                Interstellar.sendChatLog(`[Chat Queue] Your message was queued. (length=${this.chatQueue.length + 1})`);
                this.chatQueue.push(message);
                return null;
            }
            this.lastChatTime = Date.now();
        }
        return message;
    }
    socketclose(event: any) {
        Interstellar.ingame = false;
        const e = new SocketCloseEvent(event);
        StellarAPI.websocket = void 0;
        e.dispatch();

        const menuZone = Interstellar.menuZones[StellarAPI.getSelectedServer()] ?? Interstellar.menuZones[0];
        if (menuZone) {
            Interstellar.currentZone!!.teleportToZone(Interstellar.zoneOverrides[menuZone]!!);
            Interstellar.canonicalZone = menuZone;
        }
    }

    
    processMOTD(motd: string) {
        const e = new ProcessMOTDEvent(motd);
        e.dispatch();
        return e.motd;
    }

    socketopen(websocket: WebSocket) {
        Interstellar.ingame = true;
        const e = new SocketOpenEvent(websocket);
        StellarAPI.websocket = websocket;
        e.dispatch();
    }

    async joinShip(server: number | null, data: any) {
        // @ts-ignore
        await window.z_joinshipfunction(server, data);
    }

    onJoinShip(server: number | null, data: any): boolean {
        const e = new JoinShipRequestEvent(server, data);
        e.dispatch();
        if (!e.isCanceled()) {
            StellarAPI.Game.sentCrewControlRequest = false;
            StellarAPI.Game.cachedPlayers.clear();
        }
        return !e.isCanceled();
    }    
    getPlayerPosition() {
        return {
            x: this.interstellarInternals.px,
            y: this.interstellarInternals.py
        }
    }


    patchNavNames(zone: number) {
        // todo this is like unsafe and everything but also like i dont care
        // @ts-ignore
        const index = DREDNOT_ZONES[zone];
        if (index) {
            if (Interstellar.zoneOverrides[index]) return Interstellar.zoneOverrides[index].displayName;
            else return index;
        }
        return "<error>";
    }

    onChatClose() {
        (new ChatCloseEvent()).dispatch();
        StellarCommandsManager.onChatClose();
    }

    onSendChat(message: string): string {
        const e = new ChatMessageSendEvent(message);
        e.dispatch();
        if (e.isCanceled()) return "";
        message = e.msg;
        message = StellarCommandsManager.onMessageSend(message);
        return message;
    }

    patchZoneDescription(zone: string) {
        if (zone == "[No Zone Selected]") {
            return ["", 16777215]
        }
        if (Interstellar.zoneOverrides[zone]) {
            return [Interstellar.zoneOverrides[zone].displayDescription, Interstellar.zoneOverrides[zone].displayColor];
        }
        if (Interstellar.moddedNameZones[zone]) {
            return [Interstellar.moddedNameZones[zone].displayDescription, Interstellar.moddedNameZones[zone].displayColor];
        }
        if (zone == "The Pits") {
            return ["[Mission] Buried Treasure", 11541580]
        }
        if (zone == "The Nest") {
            return ["Safe Zone. Weapons Disabled.", 4521796]
        }
        if (zone.startsWith("Combat Simulator")) {
            return ["Ships are restored on exit.", 16729343]
        }
        let n = zone.split(" ")[0];
        switch (n) {
            case "Hummingbird":
                return ["Low-Risk Lawful", 4521796];
            case "Finch":
                return ["Medium-Risk Lawful", 16777028];
            case "Sparrow":
                return ["High-Risk Lawful", 16746564];
            case "Raven":
                return ["High-Risk Anarchic", 16729156];
            case "Falcon":
                return ["Very High-Risk Anarchic", 16729156];
            case "Canary":
                return ["[Mission] High-Value Mining", 13197862];
            case "Vulture":
                return ["[Mission] Bot Hordes", 0]
        }
        return ["???", 16777215]
    }

    drawZoneText(overworld: any, graphics: any, x: number) {
        let name: string = overworld.entityComponents.world_name();
        if (name != Interstellar.canonicalZone) {
            Interstellar.canonicalZone = name;
            Interstellar.teleport(name);
        }
        let zone = Interstellar.currentZone;
        if (!zone) return;
        let subzone = zone.subzones[zone.currentIndex]!!;
        let zoneName = subzone.name;
        if (zone.collapse_tiers) {
            if (name.endsWith(" I")) zoneName += " I"
            else if (name.endsWith(" II")) zoneName += " II"
            else if (name.endsWith(" III")) zoneName += " III"
        }
        graphics.graphics.drawTextSS(zoneName, x, 65, subzone.color);
        graphics.graphics.drawTextSS(subzone.description, x, 85, subzone.color)
    }

    patchDebug() {
        this.loadRequires();
        LoadDebugRequires();
        Interstellar.debugDrawer = new DebugDrawer();
    }

    renderAdverts(): boolean {
        let e = new RenderAdvertsEvent();
        e.dispatch();
        return !e.isCanceled();
    }

    processAdverts(data: any) {
        (new ProcessAdvertsEvent(data)).dispatch();
    }

    clickAdverts(url: string, hover_sign: any) {
        let e = new AdvertClickEvent(url, hover_sign);
        e.dispatch();
        return e.isCanceled() ? null : e.url;
    }

    drawOnTop() {
        StellarEventManager.dispatchTrigger(TriggerEvent.DRAW_TOP);
    }

    rp1(world: any) {
        let e = new RenderPassOneEvent(world);
        e.dispatch();
        return !e.isCanceled()
    }
    rp2(world: any) {
        let e = new RenderPassTwoEvent(world);
        e.dispatch();
        return !e.isCanceled()
    }
    rp3(world: any) {
        let e = new RenderPassThreeEvent(world);
        e.dispatch();
        return !e.isCanceled()
    }

    postprocess() {
        InterstellarWebGL.renderPassPostProcessing();
    }

    startBorderRender() {
        InterstellarWebGL.renderPassStartBorders();
    }
    endBorderRender() {
        InterstellarWebGL.renderPassBorders();
    }
    update_ship_info(health: number, max_health: number, warp_time: number, max_warp_time: number, overworld: any, ship_world: any) {
        if (StellarAPI.currentShip) {
            StellarAPI.currentShip.health = health;
            StellarAPI.currentShip.max_health = max_health;
            StellarAPI.currentShip.warp_time = warp_time;
            StellarAPI.currentShip.max_warp_time = max_warp_time;
        }
    }

    doShipyardFilters(props: any) {
        let event = new FilterShipEvent(props);
        event.dispatch();
        return event.removed;
    }

    onWriteChat(element: string) {
        let event = new WriteChatEvent(element);
        event.dispatch();
        return event.isCanceled();
    }
    
}
export default new Patcher();