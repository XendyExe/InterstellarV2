import { TriggerEvent } from "../API/InterstellarEvents";
import StellarEventManager from "../API/StellarEventManager";
import Interstellar from "../Interstellar";
import StellarAssetManager from "../StellarAssetManager";
import { Music } from "./Music";

export interface MusicDebugData {
    name: string,
    started: boolean,
    time: bigint,
    length: bigint,
    playing: boolean,
    pause_time_song?: bigint,
    pause_time_start?: bigint,
    buffer_length: number,
    resampler: boolean,
    active: boolean,
    unloading: boolean
}

export interface CacheDebugData {
    name: string,
    completion: number,
    length: number
}

export interface ProcessorDebugData {
    wasm_mem: number,
    cache_mem: number,
    loaded_song: MusicDebugData,
    caches: CacheDebugData[]
}


class MusicPlayer {
    audioContext: AudioContext;
    requestDebugData: boolean = false;
    private debugCounter = 0;
    private pendingPlay: Music | null = null;
    private isUnlocked: boolean = false;
    musics: Music[] = [];
    ready = false;
    current_index = 0;
    loadedPromise: Promise<any>;
    private _loadedResolve: any;
    debug_data: ProcessorDebugData | null = null; 

    node: AudioWorkletNode | null = null;

    set_master_volume = 0;
    set_focused = false;

    async waitUntilReady(): Promise<void> {
        return new Promise((resolve, reject) => {
            const loop = () => {
                if (this.ready) resolve();
                else setTimeout(loop.bind(this), 50);
            }
            loop();
        })
    }

    constructor() {
        this.audioContext = new AudioContext({sampleRate: 48000});
        this.setupUnlockListeners();
        this.loadedPromise = new Promise((resolve, _) => {this._loadedResolve = resolve; })
    }
    async loadMusic(toBeLoaded: Music[]) {
        let initResolve: any, initReject: any;
        const initPromise = new Promise((resolve, reject) => {
            initResolve = resolve;
            initReject = reject;
        });

        let blob = new Blob([StellarAssetManager.internal!!["music/worklet.js"]!!.blob], {type:"text/javascript"});
        const url = URL.createObjectURL(blob);
        console.log(url);
        await this.audioContext.audioWorklet.addModule(url);


        const wasmResponse = StellarAssetManager.internal!!["music/music.wasm"]!!.blob
        const wasmBytes = await wasmResponse.arrayBuffer();
        this.node = new AudioWorkletNode(this.audioContext, 'interstellar-music', {
            outputChannelCount: [2]
        });
        console.log(this.node);
        this.node.port.onmessage = (e) => {
            if (e.data.type === 'initialized') {
                initResolve();
            } else if (e.data.type === 'error') {
                initReject(e.data.error);
            } else if (e.data.type === "tick") {
                this.tick(0.05);
            } else if (e.data.type === "debug") {
                this.debug_data = e.data.data;
            }
        };

        this.node.port.postMessage({
            type: 'init',
            wasmBytes: wasmBytes
        });
        this.node.connect(this.audioContext.destination);
        await initPromise;
        // @ts-ignore
        window.queryInternalMusic = () => {
            this.node!!.port.postMessage({type: "debug"})
        }
        this.ready = true;
        this._loadedResolve();
    }

    private setupUnlockListeners(): void {
        const unlockEvents = ["click", "touchstart", "keydown"];
        const tryUnlock = async () => {
            if (this.isUnlocked) return;

            try {
                if (this.audioContext && this.audioContext.state === "suspended") {
                    await this.audioContext.resume();
                }
                this.isUnlocked = true;
                unlockEvents.forEach((event) => {
                    document.removeEventListener(event, tryUnlock);
                });
                if (this.pendingPlay) {
                    const trackToPlay = this.pendingPlay;
                    this.pendingPlay = null;
                    this.play(trackToPlay);
                }
            } catch (error) {
                console.error("Failed to unlock:", error);
            }
        };

        unlockEvents.forEach((event) => {
            document.addEventListener(event, tryUnlock, { once: false });
        });
    }
    play(music: Music) {
        if (this.audioContext.state === "suspended" && !this.isUnlocked) {
            this.pendingPlay = music;
            return null;
        }
        try {
            return music.play();
        } catch (error) {
            this.pendingPlay = music;
            return null;
        }
    }

    tick(dt: number) {
        const focused = document.hasFocus() && document.visibilityState == "visible";
        this.debugCounter++;
        if (this.debugCounter >= 5) {
            if (this.requestDebugData) {
                this.requestDebugData = false;
                this.node!!.port.postMessage({type: "debug", focus: focused});
            }
            else if (this.debug_data != null) this.debug_data = null;
        }
        if (focused !== this.set_focused) {
            this.node!!.port.postMessage({type: "focus", focus: focused});
            this.set_focused = focused;
        }
        if (Interstellar.settingsManager.settings.musicVolume != this.set_master_volume) {
            this.node!!.port.postMessage({type: "master_volume", volume: Interstellar.settingsManager.settings.musicVolume});
            this.set_master_volume = Interstellar.settingsManager.settings.musicVolume
        }
        for (let music of this.musics) {
            music.tick();
        }
        StellarEventManager.dispatchTrigger(TriggerEvent.CONSTANT_TICK);
    }
}

const musicPlayer = new MusicPlayer();


export default musicPlayer;