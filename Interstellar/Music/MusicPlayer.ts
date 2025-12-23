import { TriggerEvent } from "../API/InterstellarEvents";
import StellarEventManager from "../API/StellarEventManager";
import Interstellar from "../Interstellar";
import { InterstellarLoadingScreen } from "../InterstellarLoadingScreen";
import { createNotification } from "../Modding/StellarNotif";
import StellarAssetManager from "../StellarAssetManager";
import { Music } from "./Music";

export interface MusicCache {
    used: boolean;
    length: number;
    entries: number;
    name: string;
}

const workletCode = `
class TickProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.framesUntilTick = 0;
    this.framesPerTick = sampleRate * 0.05; // 20 Hz
  }

  process(inputs, outputs) {
    this.framesUntilTick += 128;

    if (this.framesUntilTick >= this.framesPerTick) {
      this.framesUntilTick -= this.framesPerTick;

      // Audio-context time when tick occurred
      const tickTime = currentTime;
      this.port.postMessage(tickTime);
    }

    return true;
  }
}

registerProcessor('tick-20hz', TickProcessor);
`;

class MusicPlayer {
    audioContext: AudioContext;
    private pendingPlay: Music | null = null;
    private isUnlocked: boolean = false;
    musics: Music[] = [];
    loader: Promise<void>;
    ready = false;

    musicCacheDB: IDBDatabase | undefined;
    musicCache: Record<string, MusicCache> = {};

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
        this.loader = this.setupAudioCache();
        this.setupUnlockListeners();
    }
    async loadMusic(toBeLoaded: Music[]) {
        const blob = new Blob([workletCode], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        await this.audioContext.audioWorklet.addModule(url);
        const node = new AudioWorkletNode(this.audioContext, 'tick-20hz');
        node.port.onmessage = (e) => {
            this.tick(0.05);
        };

        const progress = new InterstellarLoadingScreen("Caching music...", "Setting up audio cache...");
        await this.setupAudioCache();
        let count = 0;
        let total = toBeLoaded.length;
        progress.setProgress(count, total);
        for (const music of toBeLoaded) {
            progress.setTitle(`Caching music (${count + 1}/${total})`)
            await music.load(progress);
            count += 1;
            progress.setProgress(count, total);
        }
        progress.setDescription("Pruning Audio Cache: Opening database")
        await this.pruneAudioCache(progress);
        progress.complete();
        this.ready = true;
    }

    async setupAudioCache() {
        await new Promise((resolve, reject) => {
            const request = indexedDB.open("musiccache");
            request.onupgradeneeded = (event) => {
                this.musicCacheDB = request.result;
            };
            request.onsuccess = () => {
                this.musicCacheDB = request.result;
                resolve(request.result);
            };
            request.onerror = () => {
                throw `Failed to create music cache database! Your browser may not be compatable!\n ${request.error}`;
            };
        });
        const objectStores = this.musicCacheDB?.objectStoreNames;
        if (objectStores) for (const hash of objectStores) {
            const transaction = this.musicCacheDB!.transaction(hash, "readonly");
            const store = transaction.objectStore(hash);
            const request = store.get("manifest");
            const manifest: any = await new Promise((resolve, reject) => {
                request.onsuccess = () => resolve( request.result );
                request.onerror = reject;
            })!;
            this.musicCache[hash] = {
                used: false,
                length: manifest.length,
                entries: manifest.entries,
                name: manifest.name
            }
        }
    }
    async pushCache(name: string, hash: string, length: number, left: Int16Array[], right: Int16Array[]) {
        const currentVersion = this.musicCacheDB?.version || 1;
        this.musicCacheDB?.close();
        const newVersion = currentVersion + 1;
        this.musicCacheDB = await new Promise((resolve, reject) => {
            const request = indexedDB.open("musiccache", newVersion);
            request.onupgradeneeded = (event) => {
                const db = request.result;
                if (!db.objectStoreNames.contains(hash)) {
                    db.createObjectStore(hash);
                }
            };
            request.onsuccess = () => {
                this.musicCacheDB = request.result;
                resolve(request.result);
            };
            request.onerror = () => reject(request.error);
        });
        const transaction = this.musicCacheDB!.transaction(hash, "readwrite");
        const store = transaction.objectStore(hash);
        const request = store.put({
            length: length,
            entries: left.length,
            name: name
        }, "manifest");
        this.musicCache[hash] = {
            used: false,
            length: length,
            entries: left.length,
            name: name
        }
        let tasks = [new Promise((resolve, reject) => {
            request.onsuccess = () => resolve( request.result );
            request.onerror = reject;
        })!];
        for (let i = 0; i < left.length; i++) {
            tasks.push(this.putIntoStore(store, i.toString(), [left[i], right[i]]));
        }
        await Promise.all(tasks);
    }
    async putIntoStore(store: IDBObjectStore, key: string, value: any) {
        return new Promise((resolve, reject) => {
            let request = store.put(value, key);
            request.onsuccess = resolve;
            request.onerror = reject;
        })
    }
    async pruneAudioCache(loading: InterstellarLoadingScreen) {
        let remove = []
        for (const hash of Object.keys(this.musicCache)) {
            if (!this.musicCache[hash]?.used) {
                remove.push(hash);
            }
        }
        if (remove.length > 0) {
            const currentVersion = this.musicCacheDB!.version;
            this.musicCacheDB?.close();
            
            const newVersion = currentVersion + 1;
            
            await new Promise((resolve, reject) => {
                const request = indexedDB.open("musiccache", newVersion);
                
                request.onupgradeneeded = (event) => {
                    const db = request.result;
                    let count = 0;
                    let total = remove.length;
                    loading.setDescription(`Pruning Audio Cache: Deleting object stores (${count}/${total})`)
                    loading.setProgress(count, total);
                    for (const hash of remove) {
                        db.deleteObjectStore(hash);
                        delete this.musicCache[hash];
                        count++;
                        loading.setDescription(`Pruning Audio Cache: Deleting object stores (${count}/${total})`)
                        loading.setProgress(count, total);
                    }
                };
                
                request.onsuccess = () => {
                    this.musicCacheDB = request.result;
                    resolve(request.result);
                };
                
                request.onerror = () => reject(request.error);
            });

        }
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
        const adjusteddt = dt / 0.05;
        const focused = document.hasFocus() && document.visibilityState == "visible";
        for (let music of this.musics) {
            music.tick(adjusteddt, focused, Interstellar.settingsManager.settings.musicVolume);
        }
        StellarEventManager.dispatchTrigger(TriggerEvent.CONSTANT_TICK);
    }

    async checkCache(id: string) {
        await this.loader;
    }

}

const musicPlayer = new MusicPlayer();


export default musicPlayer;