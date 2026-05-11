import StellarAPI from "./API/StellarAPI";
import Interstellar from "./Interstellar";

// @ts-ignore
const msgpack: any = require("msgpack");

const INTERSTELLAR_DEV_URL = "wss://interstellarbackend.fomx.dev/ws"
const INTERSTELLAR_PROD_URL = "wss://interstellarbackend.fomx.dev/ws"


enum PacketType {
    ClMsgHandshake = 1,
    SvMsgHandshake = 2,
    SvMsgMissionEvent = 3,
    ClMsgReportError = 4,
    SvMsgDebugLog = 5,
    // Mabye in the future
    ClMsgJoinGroup = 6,
    ClMsgLeaveGroup = 7,
    SvMsgGroupChange = 8,

    // Badge stuff
    SvMsgPushInterstellarBadge = 9
}

enum CloseType {
    ServerEnded = 51400,
    ProtocolError = 51401
}
function getGPUInfo() {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl");

    if (!gl) return null;

    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (!debugInfo) return null;

    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

    const loseCtx = gl.getExtension("WEBGL_lose_context");
    if (loseCtx) loseCtx.loseContext();

    return { vendor, renderer };
}


export default class Telemetry {
    url = "";
    websocket: WebSocket | null = null;
    
    eventSchema: Record<string, string> = {};
    eventState: Record<string, {time: number, event: string}> = {};
    badgeUsers: string[] = [];
    connected: boolean = false;


    constructor() {
    }
    connect() {
        if (Interstellar.settingsManager.settings.disableTelemetry) return;
        this.url = Interstellar.dev ? INTERSTELLAR_DEV_URL : INTERSTELLAR_PROD_URL
        if (this.websocket != null && !(this.websocket.readyState == this.websocket.CLOSED || this.websocket.readyState == this.websocket.CLOSING)) return;
        console.log("Connecting to telemetry...");
        this.websocket = new WebSocket(this.url);
        this.websocket.binaryType = "arraybuffer";  
        this.websocket.onopen = this.open.bind(this);
        this.websocket.onclose = this.close.bind(this);
        this.websocket.onmessage = this.message.bind(this);
        this.websocket.onerror = this.error.bind(this);
    }

    isDisabled() {
        return Interstellar.settingsManager.settings.disableTelemetry;
    }

    async open(ev: Event) {
        let loadedMods = [];
        for (let mod of Interstellar.loadedModpacks) {
            loadedMods.push({
                name: mod.config.name,
                description: mod.config.description,
                creator: mod.config.creator,
                id: mod.config.id,
                scripting: mod.config.scripting !== undefined,
                texture_pack: mod.config.texture_pack === true
            });
        }
        // It is too early to call StellarAPI.playerName, have to fetch ourselves
        // should prob fix this by just having interstellar fetch player name but ehh
        // effort -w-
        let account = (await (await fetch("https://drednot.io/account/status")).json()).account;
        this.send({
            type: PacketType.ClMsgHandshake,
            // Account can be null if the user isn't logged in, which we do not really care about
            name: account?.name,
            color: account?.color,
            mods: loadedMods,
            gpu: getGPUInfo(),
            // i think headers can be weird sometimes
            user_agent: navigator.userAgent
        });
    }

    close(ev: CloseEvent) {
        let closeReason = ev.code;
        let clean = ev.wasClean;
        console.log("Telemetry disconnected", closeReason, clean);
        if (!clean) {
            console.log("Disconnected uncleanly, reconnecting!")
            setTimeout(this.connect.bind(this), 5000)
        }
        this.connected = false;
    }

    message(ev: MessageEvent) {
        let data = msgpack.decode(ev.data);
        let type: PacketType = data.type;
        switch (type) {
            case PacketType.SvMsgHandshake: 
                this.eventSchema = data.event_schema;
                this.eventState = data.event_state;
                this.badgeUsers = data.badge_users;
                this.connected = true;
                break;
            case PacketType.SvMsgMissionEvent: 
                this.eventState[data.tracker] = {
                    time: data.time,
                    event: data.event
                }
                break;
            case PacketType.SvMsgDebugLog:
                console.log("Server Telemetry Debug: ", data.message)
                break;
            case PacketType.SvMsgPushInterstellarBadge:
                this.badgeUsers.push(data.name)
                break;
        }
    }
    
    error(ev: Event) {
        
    }

    send(message: any) {
        if (this.websocket == null) return;
        this.websocket.send(msgpack.encode(message));
    }
}