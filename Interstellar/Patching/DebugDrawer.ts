import InterstellarWebGL from "../Graphical/InterstellarWebGL";
import { gl } from "../Graphical/WebGLHelpers";
import { WebGLZoneBackground } from "../Graphical/WebGLZoneBackground";
import Interstellar from "../Interstellar";
import parseColor from "../Modding/ColorParser";
import musicPlayer from "../Music/MusicPlayer";
import { formatBytes, roundTo } from "../StellarUtils";

// MOST CODE EVER SHUT UP.
// @ts-ignore
let TickerTime: any;
// @ts-ignore
let WorldManager: any;
// @ts-ignore
let Graphics: any;
// @ts-ignore
let InputManager: any;
export function LoadDebugRequires() {
    // @ts-ignore
    TickerTime = require("TickerTime");
    // @ts-ignore
    WorldManager = require("WorldManager");
    // @ts-ignore
    Graphics = require("Graphics").graphics;
    // @ts-ignore
    InputManager = require("InputManager").input;
}
const x = 500;
const color = parseColor("#ff7aac");

function format_music_samples(samples: bigint) {
    const ms = Number(samples) / 48;
    let totalSeconds = Math.floor(ms / 1000);
    let hours = Math.floor(totalSeconds / 3600);
    let minutes = Math.floor((totalSeconds % 3600) / 60);
    let seconds = Math.floor(totalSeconds % 60);
    let result = ""
    if (hours) result += `${hours}:`
    result += `${minutes}:`.padStart(3, "0");
    result += `${seconds}`.padStart(2, "0");
    return result;
}

export class DebugDrawer {
    frameTimeTotal: number = 0;
    actualFrameTime: number = 0;
    debugMenuDrawTime = 0;
    debuggerElement = document.createElement("pre");
    drawingDebugInfo = false;
    showing = false;
    constructor() {
        document.body.appendChild(this.debuggerElement);
        this.debuggerElement.style.pointerEvents = "none";
        this.debuggerElement.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
        this.debuggerElement.style.position = "absolute";
        this.debuggerElement.style.display = "none";
        this.debuggerElement.style.zIndex = "999999999";
        this.debuggerElement.style.color = "white";
        this.debuggerElement.style.transform = "translate(50px, 100px)"
        this.debuggerElement.style.padding = "10px"
    }
    updateTotalFrameTime(t: number) {
        this.frameTimeTotal = (this.frameTimeTotal) * 0.99 + (t - this.debugMenuDrawTime) * 0.01;
        this.actualFrameTime = (this.actualFrameTime) * 0.99 + t * 0.01;
        this.debugMenuDrawTime = 0;
    }
    
    shipTimeText(t: string, a: any) {
        var $;
        let r = ($ = a.tick_quota) !== null && $ !== void 0 ? $ : TickerTime.time.tick_delta_ms;
        let n = Math.floor(a.tick_time / r * 100);
        return `${t}: tick = ${a.tick_time}ms / ${r}ms (${n}%); cpu = ${a.cpu_load}%; relay time = ${a.relay_time}ms`

    }

    drawTickTime(t: string, a: any, l: number) {
        Graphics.drawTextSS(this.shipTimeText(t, a), x, l, color, 10)
    }
    

    frameAverage = 60;
    idleAverage = 1;
    actualIdleAverage = 1;
    drawDebugInfo(network: any, ship: any, world: any, relay: any) {
        this.drawingDebugInfo = true;
        if (ship != null) {
            let p = Math.floor(InputManager.mouse_pos_local.x);
            let d = Math.floor(InputManager.mouse_pos_local.y);
            Graphics.fillRect(4289448576, p + .5, d + .5, 1, 1);
            let s = ship.getMaterial(p, d).toString(16).padStart(2, "0");
            let S = ship.getShape(p, d).toString(16).padStart(2, "0");
            let m = ship.getDamage(p, d).toString(16).padStart(2, "0");
            let _ = ship.getColor(p, d).toString(16).padStart(2, "0");
            Graphics.drawText("(" + p + "," + d + ") " + s + ":" + S + ":" + m + ":" + _, p + .5, d + 1.5, color, 10)
        }
        return this.writeDebugInfo(network, ship, world, relay);
    }

    writeDebugInfo(network: any, ship: any, world: any, relay: any) {
        let graphicsInfoDrawTime = performance.now();
        let data = "";
        let indent = 0;
        let popped = false;
        function push(...args: any[]) {
            popped = false;
            data += " ".repeat(indent * 4) + args.join(" ") + "\n";
            indent += 1;
        }
        function pushSub(...args: any[]) {
            popped = false;
            data += " ".repeat(indent * 4) + args.join(" ") + "\n";
        }
        function pop() {
            if (!popped) data += "\n";
            popped = true;
            indent -= 1;
        }

        push("Network:")
        if (network != null) {
            pushSub("Network Data Rate:", network.netDataRate, "bps");
        }
        let u = (InputManager.next_cmd_number - WorldManager.LATEST_PREDICTED_COMMAND) * TickerTime.time.tick_delta_ms;
        pushSub("Estimated Turnaround Time:", u, "ms");
        this.frameAverage = this.frameAverage * 0.99 + (1000/Interstellar.deltaTime) * 0.01;
        this.idleAverage = this.idleAverage * 0.99 + (((Interstellar.deltaTime - this.frameTimeTotal) / Interstellar.deltaTime) * 100) * 0.01;
        this.actualIdleAverage = this.actualIdleAverage * 0.99 + (((Interstellar.deltaTime - this.actualFrameTime ) / Interstellar.deltaTime) * 100) * 0.01;
        pop();

        push("Server Performance:")
        if (ship != null) pushSub(this.shipTimeText("Ship", ship));
        if (world != null) pushSub(this.shipTimeText("Overworld", world));
        if (relay != null) pushSub(`Relay: cpu=${relay.cpu_load}%`);
        pop();

        push("Performance:");
        pushSub(`Frame Time: ${this.actualFrameTime.toFixed(2)} ms (${this.frameAverage.toFixed(2)} fps, ${this.actualIdleAverage.toFixed(2)}% idle)`);
        const frameTimeTotal = InterstellarWebGL.frameTime.backgrounds + InterstellarWebGL.frameTime.postprocess + InterstellarWebGL.frameTime.final + InterstellarWebGL.frameTime.borders;
        pushSub(`Interstellar Rendering: ${frameTimeTotal.toFixed(2)} ms (${((frameTimeTotal/this.frameTimeTotal) * 100).toFixed(2)}%)`);
        pushSub(``)
        pushSub(`Background: ${InterstellarWebGL.frameTime.backgrounds.toFixed(3)}ms`);
        pushSub(`Post Process: ${InterstellarWebGL.frameTime.postprocess.toFixed(3)}ms`);
        pushSub(`Borders: ${InterstellarWebGL.frameTime.borders.toFixed(3)}ms`);
        pushSub(`BlitTrans: ${InterstellarWebGL.frameTime.final.toFixed(3)}ms`);
        pop();

        push("Music:")
        musicPlayer.requestDebugData = true;
        if (musicPlayer.debug_data == null) {
            pushSub("Loading processor debug data...");
        } else {
            pushSub(`Memory usage: ${formatBytes(musicPlayer.debug_data.wasm_mem + musicPlayer.debug_data.cache_mem)}`);
            pushSub(`Wasm: ${formatBytes(musicPlayer.debug_data.wasm_mem)} | JS Cache: ${formatBytes(musicPlayer.debug_data.cache_mem)}`);
        }
        if (musicPlayer.debug_data != null) {
            let music = musicPlayer.debug_data.loaded_song;
            push("Tracks:")
            if (music !== null) {
                let result = `${music.name}: ${format_music_samples(music.time % music.length)} - ${format_music_samples(music.length)} // Avg. Buff=${Math.floor(music.buffer_length)}/4096`;
                let tags = ""
                if (music.active) tags += "A"
                if (music.playing) tags += "P"
                if (music.resampler) tags += "R"
                if (tags != "") tags = "[" + tags + "] "
                result = tags + result
                pushSub(result);
            }
            pop();
            push("Caches:")
            for (let cache of musicPlayer.debug_data.caches) {
                pushSub(`${cache.name}: ${cache.completion}/${cache.length}`);
            }
            if (musicPlayer.debug_data.caches.length == 0) {
                pushSub("No caches playing...");
            }
            pop();
        }
        pop();
        push("Active mods:")
        for (let modpack of Interstellar.loadedModpacks) {
            pushSub(modpack.config.id)
        }
        this.debuggerElement.innerHTML = data;
        this.debugMenuDrawTime = performance.now() - graphicsInfoDrawTime;
    }
}
