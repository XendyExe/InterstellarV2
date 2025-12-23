import { ChatCloseEvent, ChatMessageRecieveEvent, ChatMessageSendEvent, CrewListUpdateEvent, JoinShipEvent, JoinShipRequestEvent, ProcessMOTDEvent, SocketCloseEvent, SocketMessageRecieveEvent, SocketOpenEvent, TriggerEvent } from "../API/InterstellarEvents";
import StellarAPI from "../API/StellarAPI";
import StellarCommandsManager from "../API/StellarCommandsManager";
import StellarEventManager from "../API/StellarEventManager";
import Interstellar from "../Interstellar";
import { DREDNOT_ZONES, NAV_POINTER } from "../StellarConstants";
import { DebugDrawer, LoadDebugRequires } from "./DebugDrawer";

const joinShipServerMessage = /Joined ship '(.*?)' {([0-9A-F]+)}$/
const joinMessage = /(\[(Captain|Crew)\])?(#?[a-zA-Z0-9-_ ]+) joined the ship\./;
class Patcher {
    webgl: WebGLRenderingContext | undefined = undefined;
    wasmInstance: WebAssembly.Instance | undefined = undefined; 

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
    // @ts-ignore
    usersettingsmanager: any = require("UserSettingManager");;
    gameActive = false;
    enableGriefMessages = true;

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
        this.accountManager = require("AccountManager");
        // @ts-ignore
        this.htmluifunctions = require("HTMLUIFunctions");
        // @ts-ignore
        this.textformatter = require("TextFormatter");
    }

    setWebgl(gl: WebGLRenderingContext) {
        this.webgl = gl;
        return gl;
    }

    setWasmInstance(instance: WebAssembly.Instance) {
        this.wasmInstance = instance;
    }

    // fucking black magic
    getNavDestination() {
        // @ts-ignore
        let view = new DataView(this.wasmInstance!!.memory.buffer);
        return view.getUint32(NAV_POINTER, true);
    }

    toggleUIPatch(model: string, current: any) {
        return StellarAPI.UI.settingModels[model] ?? current;
    }

    trigger_frame_start() {
        StellarEventManager.dispatchTrigger(TriggerEvent.FRAME_START)
        const gl = this.webgl!!;
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }

    trigger_frame_end(cl: any) {
        StellarEventManager.dispatchTrigger(TriggerEvent.FRAME_END)
        this.gameActive = cl.isGameActive();
        this.zoom = this.gameActive ? cl.local_cam_zoom : 0;
        this.navDestination = this.getNavDestination();
        Interstellar.endTick();
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
                    hex: match[2]!!
                };
                StellarAPI.Game.getLocalOnlinePlayerNames().forEach(player=>StellarAPI.Game.cachedPlayers.add(player));
                (new JoinShipEvent(match[1]!!, match[2]!!)).dispatch();
            } else if (match = text.match(joinMessage)) {
                StellarAPI.Game.cachedPlayers.add(match[3]!!)
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
        const e = new SocketMessageRecieveEvent(message);
        e.dispatch();
        return e.isCanceled() ? false : message;
    }
    socketclose(event: any) {
        Interstellar.ingame = false;
        const e = new SocketCloseEvent(event);
        StellarAPI.websocket = void 0;
        e.dispatch();

        const menuZone = Interstellar.menuZones[StellarAPI.getSelectedServer()] ?? Interstellar.menuZones[0];
        if (menuZone) Interstellar.currentZone!!.teleportToZone(Interstellar.zoneOverrides[menuZone]!!);
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

    patchNavNames(zone: number) {
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
        graphics.graphics.drawTextSS(subzone.name, x, 65, subzone.color);
        graphics.graphics.drawTextSS(subzone.description, x, 85, subzone.color)
    }

    patchDebug() {
        this.loadRequires();
        LoadDebugRequires();
        Interstellar.debugDrawer = new DebugDrawer();
    }
}
export default new Patcher();