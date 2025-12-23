import parseColor from "../Modding/ColorParser";
import musicPlayer from "../Music/MusicPlayer";
import PerformanceMetrics, { stellarFormatLoadTimes } from "../PerformanceMetrics";

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
        let musicY = 260;
        for (let music of musicPlayer.musics) {
            if (!music.playing && !music.active) continue;

            let tags = "";
            if (music.getTickLock()) tags += "T"
            if (music.activating) tags += "A"
            if (music.focusVolume == 0) tags += "V"
            if (music.fadeVolume == 0) tags += "F"
        
            if (tags != "") tags = "[" + tags + "]"
            if (music.playing) Graphics.drawTextSS(`[Playing] ${tags} ${music.name}: t=${music.currentTime.toFixed(2)} load=${stellarFormatLoadTimes(music.lastChunkLoadTime)} buff#=${music.lastLoadedBuffer} // ${music.ticker}`, x, musicY, color, 10);
            else if (music.active) Graphics.drawTextSS(`[Idle] ${tags} ${music.name} // ${music.ticker}`, x, musicY, color, 10);
            musicY += 20;
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
