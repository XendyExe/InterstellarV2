import musicPlayer, { MusicCache } from "./MusicPlayer";
import StellarAssetManager from "../StellarAssetManager";
import { InterstellarLoadingScreen } from "../InterstellarLoadingScreen";
import Devpack from "../API/Devpack";
const CHUNK_LENGTH = 5; // seconds
const CHUNK_SAMPLE_LENGTH = 48000 * CHUNK_LENGTH;
function floatTo16BitPCM(float32Array: Float32Array): Int16Array {
    const output = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
        let s = float32Array[i]!;
        s = Math.max(-1, Math.min(1, s));
        output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output;
}
function int16ToFloat32(int16Array: Int16Array): Float32Array<ArrayBuffer> {
    const output = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
        const s = int16Array[i]!;
        output[i] = s < 0 ? s / 0x8000 : s / 0x7FFF;
    }
    return output;
}
export class Music {
    active: boolean = false;
    gainNode = musicPlayer.audioContext.createGain();
    private _volume: number = 0;
    focusVolume = 0;
    fadeVolume = 0;
    nextOutputAt: number = 0;
    nextNextOutputAt: number = 0;
    currentOutput: AudioBufferSourceNode | undefined;
    bufferNext: AudioBufferSourceNode | undefined;

    activating = false;

    currentTime = 0;
    private _pauseTime = -1;
    private _startPlayingTime = 0;
    private _startPlayingOffset = 0;
    private _musicLength = 0;
    lastLoadedBuffer = 0;
    get currentIndex() {
        return Math.floor(this.currentTime / CHUNK_LENGTH);
    }
    bufferStartTime = 0;
    playing = false;

    name: string;
    assetStore: string;
    path: string;
    hash: string;

    manifest: MusicCache | undefined;

    ticker = 0;

    lastChunkLoadTime = 0;
    getTickLock() {return this._tickLock;}
    constructor(path: string, hash: string, startTime: number) {
        this.hash = hash;
        this.currentTime = startTime;
        this.gainNode.connect(musicPlayer.audioContext.destination);
        this.gainNode.gain.value = this._volume;
        
        let split = path.split("/");
        this.assetStore = split.shift()!;
        this.name = split.pop()!;
        this.path = split.join("/") + "/" + this.name;
        if (this.assetStore == "interstellar.internal") {
            this.assetStore = "internal";
            this.path = "StrawberryJamPack/" + this.path;
        } 
        split = this.name.split(".");

        musicPlayer.musics.push(this);
    }
    async load(loading: InterstellarLoadingScreen) {
        if (!musicPlayer.musicCache[this.hash]) {
            let blob: Blob;
            loading.setDescription(`Reading ${this.name}...`)
            if (this.assetStore != "interstellar.devpack") {
                const transaction = StellarAssetManager.database!!.transaction(this.assetStore, "readonly");
                const store = transaction.objectStore(this.assetStore);
                blob = await new Promise((resolve, reject) => {
                const request = store.get(this.path);
                    request.onerror = reject;
                    request.onsuccess = (e) => { resolve(request.result.blob) }
                });
            } else {
                blob = (await Devpack.getFile(this.path)).blob;
            }
            loading.setDescription(`Splitting ${this.name}...`)
            const buffer = await musicPlayer.audioContext.decodeAudioData(await blob.arrayBuffer());
            const leftF32 = floatTo16BitPCM(buffer.getChannelData(0));
            const rightF32 = floatTo16BitPCM(buffer.getChannelData(1));
            const leftI16A: Int16Array[] = [];
            const rightI16A: Int16Array[] = [];
            const bufferLength = leftF32.length / CHUNK_SAMPLE_LENGTH
            const max = Math.floor(bufferLength);
            for (let i = 0; i < Math.floor(bufferLength); i++) {
                leftI16A.push(leftF32.slice(i * CHUNK_SAMPLE_LENGTH, (i + 1) * CHUNK_SAMPLE_LENGTH));
                rightI16A.push(rightF32.slice(i * CHUNK_SAMPLE_LENGTH, (i + 1) * CHUNK_SAMPLE_LENGTH));
            }
            leftI16A.push(leftF32.slice(max * CHUNK_SAMPLE_LENGTH, leftF32.length));
            rightI16A.push(rightF32.slice(max * CHUNK_SAMPLE_LENGTH, rightF32.length));
            loading.setDescription(`Caching ${this.name}...`)
            await musicPlayer.pushCache(this.name, this.hash, leftF32.length, leftI16A, rightI16A)
        }
        this.manifest = musicPlayer.musicCache[this.hash]!;
        this._musicLength = this.manifest.length / 48000;
        this.manifest.used = true;
    }
    async activate() {
        if (this.activating) {
            return;
        }
        this.activating = true;
        await musicPlayer.waitUntilReady();
        this.activating = false;
        this.active = true;
        this._tickLock = true;
        if (this.playing) return;
        this.tryPlay();
    }

    tryPlay() {
        musicPlayer.play(this);
    }
    async play() {
        console.log("Playing music", this.name)
        let startTime = this._pauseTime == -1 ? this.currentTime : this.currentTime + (musicPlayer.audioContext.currentTime - this._pauseTime);
        startTime = (startTime * 48000) % this.manifest!.length;
        this.currentTime = startTime / 48000;
        let current = await this.loadBuffer(this.currentIndex);
        let next = await this.loadBuffer(this.currentIndex + 1);
        this.currentOutput = current.source;
        this.bufferNext = next.source;
        const initialOffset = this.currentTime - (this.currentIndex * CHUNK_LENGTH);
        this.nextOutputAt = musicPlayer.audioContext.currentTime + (current.length / 48000) - initialOffset;
        this.nextNextOutputAt = this.nextOutputAt + (next.length / 48000);
        this._startPlayingTime = musicPlayer.audioContext.currentTime;
        this._startPlayingOffset = this.currentTime;
        this.currentOutput.start(0, initialOffset);
        this.bufferNext.start(this.nextOutputAt);
        this.lastLoadedBuffer = (this.currentIndex + 1) % this.manifest!.entries;
        this.playing = true;
        this._tickLock = false;
    }

    async loadNext() {
        this.currentOutput!.stop();
        this.currentOutput!.disconnect();
        this.currentOutput = this.bufferNext;
        let next = await this.loadBuffer(this.lastLoadedBuffer + 1);
        this.lastLoadedBuffer = (this.lastLoadedBuffer + 1) % this.manifest!.entries;
        this.bufferNext = next.source;
        this.nextNextOutputAt = this.nextOutputAt + (next.length / 48000);
        this.bufferNext.start(this.nextOutputAt);
    }

    async loadBuffer(index: number) {
        index = index % this.manifest!.entries;
        let t = performance.now();
        const transaction = musicPlayer.musicCacheDB!.transaction(this.hash, "readonly");
        const store = transaction.objectStore(this.hash);
        const request = store.get(index.toString());
        const result: Int16Array[] = await new Promise((resolve, reject) => {
            request.onsuccess = () => {resolve(request.result)}
            request.onerror = (e) => {reject(e)}
        })
        const buffer = new AudioBuffer({
            length: result[0]!.length,
            sampleRate: 48000,
            numberOfChannels: 2
        });
        buffer.copyToChannel(int16ToFloat32(result[0]!), 0);
        buffer.copyToChannel(int16ToFloat32(result[1]!), 1);
        this.lastChunkLoadTime = performance.now() - t;
        const source = new AudioBufferSourceNode(musicPlayer.audioContext);
        source.connect(this.gainNode);
        source.buffer = buffer;
        return {source: source, length: result[0]!.length};
    }

    private _tickLock = false;
    stopTime = -1;
    async tick(dt: number, focused: boolean, volumeSetting: number) {
        this.ticker += 1;
        if (this.ticker >= 100) this.ticker = 0;
        this.focusVolume = Math.min(Math.max(this.focusVolume + (focused ? 1 : -1) * 0.03 * dt, 0), 1);
        this.fadeVolume = Math.min(Math.max(this.fadeVolume + (this.active ? 1 : -1) * 0.025 * dt, 0), 1);
        const targetVolume = this.focusVolume * this.fadeVolume * volumeSetting
        if (this.playing) {
            this.volume = targetVolume;
            this.calculateCurrentTime();
            if (musicPlayer.audioContext.currentTime > this.nextOutputAt) {
                this.nextOutputAt = this.nextNextOutputAt;
                this.loadNext();
            }
            if (this.volume == 0) {
                this.stop();
                this._tickLock = false;
            } else this.stopTime = -1;
        }
        
        if (this.active && !this.playing && targetVolume > 0 && !this._tickLock) {
            this._tickLock = true;
            await this.play();
            this._tickLock = false;
        }
    }
    calculateCurrentTime() {
        this.currentTime = ((musicPlayer.audioContext.currentTime - this._startPlayingTime) + this._startPlayingOffset) % this._musicLength;
    }

    deactivate() {
        this.active = false;
    }

    stop() {
        this.calculateCurrentTime();
        this.playing = false;
        this.currentOutput?.stop();
        this.currentOutput?.disconnect();
        this.bufferNext?.stop();
        this.bufferNext?.disconnect();
        this.currentOutput = undefined;
        this.bufferNext = undefined;
        this._pauseTime = musicPlayer.audioContext.currentTime;
    }

    set volume(value: number) {
        this._volume = Math.max(0, Math.min(1, value));
        
        if (this.gainNode) {
            this.calculateGainVolume();
        }
    }
    
    calculateGainVolume() {
        this.gainNode.gain.value = this._volume;
    }
    
    get volume(): number {
        return this._volume;
    }
}
