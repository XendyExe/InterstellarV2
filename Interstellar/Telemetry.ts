import StellarAPI from "./API/StellarAPI";
import Interstellar from "./Interstellar";

const INTERSTELLAR_DEV_URL = "https://cosmogram.fomx.dev/api/interstellar_telemetry"
const INTERSTELLAR_PROD_URL = "https://cosmogram.fomx.dev/api/interstellar_telemetry"

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
    badgeUsers: string[] = [];

    constructor() {
        this.url = INTERSTELLAR_PROD_URL;
    }

    async do_telemetry() {
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
        let account = Interstellar.isTestDred ? (await (await fetch("https://test.drednot.io/account/status")).json()).account : (await (await fetch("https://drednot.io/account/status")).json()).account;
        let response = await fetch(this.url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                // Account can be null if the user isn't logged in, which we do not really care about
                name: account?.name,
                color: account?.color,
                mods: loadedMods,
                gpu: getGPUInfo(),
                // i think headers can be weird sometimes
                user_agent: navigator.userAgent,
                test: Interstellar.isTestDred
            })
        });
        this.badgeUsers = JSON.parse(await response.text());
    }
}