import { LOADED_BITMAPS } from "../Graphical/WebGLZoneBackground";
import parseColor from "../Modding/ColorParser";
import musicPlayer from "../Music/MusicPlayer";
import PerformanceMetrics, { stellarFormatLoadTimes } from "../PerformanceMetrics";
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
const color = parseColor("#ff94bd");

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
    interstellarFrameTime: number = 0;
    updateTotalFrameTime(t: number) {
        this.frameTimeTotal = this.frameTimeTotal * 0.99 + t * 0.01
    }

    updateInterstellarFrameTime(t: number) {
        this.interstellarFrameTime = this.interstellarFrameTime * 0.99 + t * 0.01;
    }

    drawTickTime(t: string, a: any, l: number) {
        var $;
        let r = ($ = a.tick_quota) !== null && $ !== void 0 ? $ : TickerTime.time.tick_delta_ms;
        let n = Math.floor(a.tick_time / r * 100);
        Graphics.drawTextSS(`${t}: tick = ${a.tick_time}ms / ${r}ms (${n}%); cpu = ${a.cpu_load}%; relay time = ${a.relay_time}ms`, x, l, color, 10)
    }

    drawDebugInfo(network: any, ship: any, world: any, relay: any) {
        if (network != null) {
            Graphics.drawTextSS("Network Data Rate: " + network.netDataRate + " bps", x, 60, color, 14)
        }
        let u = (InputManager.next_cmd_number - WorldManager.LATEST_PREDICTED_COMMAND) * TickerTime.time.tick_delta_ms;
        let ry = 90;
        Graphics.drawTextSS("Estimated Turnaround Time: " + u + " ms", x, ry, color, 14); ry += 30;
        Graphics.drawTextSS("Frame Time: " + this.frameTimeTotal.toFixed(2) + " ms", x, ry, color, 14); ry += 25;
        Graphics.drawTextSS("Interstellar Rendering: " + this.interstellarFrameTime.toFixed(2) + " ms (" + (((this.interstellarFrameTime/this.frameTimeTotal) * 100).toFixed(2)) + "%)", x, ry, color, 10); ry += 20;
        if (ship != null) {
            this.drawTickTime("Ship", ship, ry)
        }
        ry += 20;
        if (world != null) {
            this.drawTickTime("Overworld", world, ry)
        }
        ry += 20;
        if (relay != null) {
            Graphics.drawTextSS(`Relay: cpu = ${relay.cpu_load}%`, x, ry, color, 10)
        }
        ry += 20;
        Graphics.drawTextSS("Interstellar Music: ", x, ry, color, 14);
        ry += 20;
        musicPlayer.requestDebugData = true;
        if (musicPlayer.debug_data == null) {
            Graphics.drawTextSS(`Loading processor debug data...`, x, ry, color, 10);
            ry += 20;
        } else {
            Graphics.drawTextSS(`Memory usage: ${formatBytes(musicPlayer.debug_data.wasm_mem + musicPlayer.debug_data.cache_mem)}`, x, ry, color, 10);
            ry += 14;
            Graphics.drawTextSS(`Wasm: ${formatBytes(musicPlayer.debug_data.wasm_mem)} | JS Cache: ${formatBytes(musicPlayer.debug_data.cache_mem)}`, x, ry, color, 7);
            ry += 18;
        }
        if (musicPlayer.debug_data != null) {
            let music = musicPlayer.debug_data.loaded_song;
            if (music !== null) {
                let result = `${music.name}: ${format_music_samples(music.time % music.length)} - ${format_music_samples(music.length)} // Avg. Buff=${Math.floor(music.buffer_length)}/4096`;
                let tags = ""
                if (music.active) tags += "A"
                if (music.playing) tags += "P"
                if (music.resampler) tags += "R"
                if (tags != "") tags = "[" + tags + "] "
                result = tags + result
                Graphics.drawTextSS(result, x, ry, color, 10);
                ry += 20;
            }
            Graphics.drawTextSS("Caches:", x, ry, color, 10);
            ry += 20;
            for (let cache of musicPlayer.debug_data.caches) {
                let result = `${cache.name}: ${cache.completion}/${cache.length}`;
                Graphics.drawTextSS(result, x, ry, color, 10);
                ry += 20;
            }
            if (musicPlayer.debug_data.caches.length == 0) {
                Graphics.drawTextSS("No caches playing...", x, ry, color, 10);
            }
        }
        
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

        let sX = 1000;
        let sY = 90;
        let canvas_memory = 0;
        let bitmap_memory = 0;
        for (const bitmap of LOADED_BITMAPS) {
            bitmap_memory += bitmap.width * bitmap.height * 4;
        }
        const canvases = document.querySelectorAll('canvas');
        canvases.forEach((canvas, i) => {
            canvas_memory += canvas.width * canvas.height * 4;
        });
        // @ts-ignore
        const js_heap_used = performance.memory.usedJSHeapSize ?? 0;
        // @ts-ignore
        const js_heap_allocated = performance.memory.totalJSHeapSize ?? 0;
        // js heap tends to add about 3mb
        let music_player_mem = 3000000;
        if (musicPlayer.debug_data != null) {
            music_player_mem += musicPlayer.debug_data.wasm_mem + musicPlayer.debug_data.cache_mem;
        }

        Graphics.drawTextSS(`Total analyzable memory: ${formatBytes(canvas_memory + bitmap_memory + canvas_memory + js_heap_allocated, )}`, sX, sY, color, 14); sY += 25;
        Graphics.drawTextSS(`JS Heap: ${formatBytes(js_heap_used)}/${formatBytes(js_heap_allocated)}`, sX, sY, color, 10); sY += 20;
        Graphics.drawTextSS(`Music: ${formatBytes(music_player_mem)}`, sX, sY, color, 10); sY += 20;
        Graphics.drawTextSS(`Bitmaps: ${formatBytes(bitmap_memory)}`, sX, sY, color, 10); sY += 20;
        Graphics.drawTextSS(`Canvases: ${formatBytes(canvas_memory)}`, sX, sY, color, 10); sY += 20;


        // let loadX = 1000;
        // Graphics.drawTextSS("Interstellar load times:", loadX, 60, color, 14)
        // let loadY = 90;
        // for (const line of PerformanceMetrics.text) {
        //     if (line) Graphics.drawTextSS(line, loadX, loadY, color, 10);
        //     loadY += 20;
        // }
    }
}
