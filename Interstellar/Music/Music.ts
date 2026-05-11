import musicPlayer from "./MusicPlayer";
import StellarAssetManager from "../StellarAssetManager";
import Devpack from "../API/Devpack";

export class Music {
    id: number = -1;
    active: boolean = false;
    loaded: boolean = false;

    hash: string;
    name: string;
    assetStore: string;
    path: string;
    start_time: number;
    constructor(path: string, hash: string, startTime: number) {
        this.hash = hash;
        let split = path.split("/");
        this.assetStore = split.shift()!;
        this.name = split.pop()!;
        this.path = split.join("/") + "/" + this.name;
        if (this.assetStore == "interstellar.internal") {
            this.assetStore = "internal";
            this.path = "StrawberryJamPack/" + this.path;
        } 
        split = this.name.split(".");
        this.start_time = startTime;

        musicPlayer.musics.push(this);
    }
    async load() {
        let blob: Blob;
        if (this.assetStore != "interstellar.devpack") {
            await StellarAssetManager.openDatabase();
            const transaction = StellarAssetManager.database!!.transaction(this.assetStore, "readonly");
            const store = transaction.objectStore(this.assetStore);
            blob = await new Promise((resolve, reject) => {
            const request = store.get(this.path);
                request.onerror = reject;
                request.onsuccess = (e) => { resolve(request.result.blob) }
            });
            await StellarAssetManager.closeDatabase();
        } else {
            blob = (await Devpack.getFile(this.path)).blob;
        }
        musicPlayer.node!!.port.postMessage({
            type: "music_enable",
            name: (new TextEncoder()).encode(this.name),
            hash: (new TextEncoder()).encode(this.hash),
            bytes: new Uint8Array(await blob.arrayBuffer()),
            start_time: this.start_time
        });
        this.id = musicPlayer.current_index;
        musicPlayer.current_index++;
    }
    async activate() {
        musicPlayer.play(this);
    }

    async play () {
        await musicPlayer.loadedPromise;
        await this.load();
    }

    async tick() {

    }

    deactivate() {
        musicPlayer.node!!.port.postMessage({type: "music_disable", hash: (new TextEncoder()).encode(this.hash)});
    }
}
