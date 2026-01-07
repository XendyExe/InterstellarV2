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
        Graphics.drawTextSS("Estimated Turnaround Time: " + u + " ms", x, 90, color, 14);
        Graphics.drawTextSS("Frame Time: " + this.frameTimeTotal.toFixed(2) + " ms", x, 120, color, 14);
        Graphics.drawTextSS("Interstellar Rendering: " + this.interstellarFrameTime.toFixed(2) + " ms (" + (((this.interstellarFrameTime/this.frameTimeTotal) * 100).toFixed(2)) + "%)", x, 145, color, 10);
        if (ship != null) {
            this.drawTickTime("Ship", ship, 170)
        }
        if (world != null) {
            this.drawTickTime("Overworld", world, 190)
        }
        if (relay != null) {
            Graphics.drawTextSS(`Relay: cpu = ${relay.cpu_load}%`, x, 210, color, 10)
        }
        Graphics.drawTextSS("Interstellar Music: ", x, 240, color, 14);
        musicPlayer.requestDebugData = true;
        let musicY = 260;
        if (musicPlayer.debug_data == null) {
            Graphics.drawTextSS(`Loading processor debug data...`, x, musicY, color, 10);
        } else {
            Graphics.drawTextSS(`Memory usage: ${formatBytes(musicPlayer.debug_data.memory)}`, x, musicY, color, 10);
        }
        musicY += 20;
        if (musicPlayer.debug_data != null) {
            for (let music of musicPlayer.debug_data.loaded_songs) {
                let result = `${music.name}: ${format_music_samples(music.time)} - ${format_music_samples(music.length)} // Avg. Buff=${Math.floor(music.buffer_length)}/4096`;
                let tags = ""
                if (music.active) tags += "A"
                if (music.unloading) tags += "U"
                if (music.playing) tags += "P"
                if (music.resampler) tags += "R"
                if (tags != "") tags = "[" + tags + "] "
                result = tags + result
                Graphics.drawTextSS(result, x, musicY, color, 10);
                musicY += 20;
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
        let loadX = 1000;
        Graphics.drawTextSS("Interstellar load times:", loadX, 60, color, 14)
        let loadY = 90;
        for (const line of PerformanceMetrics.text) {
            if (line) Graphics.drawTextSS(line, loadX, loadY, color, 10);
            loadY += 20;
        }
    }
}
