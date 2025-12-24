import Interstellar from "../Interstellar";
import { Modpack } from "../Modding/Modpack";
import { ModManifest } from "../Modding/ModpackManager";
import { parsePath } from "../Modding/PathParser";
import { AssetStoreData } from "../StellarAssetManager";
import StellarAPI from "./StellarAPI";

class Devpack {
    // @ts-ignore
    assetTree: AssetStoreData = {};
    dirurl: string = "";
    modpack: Modpack | undefined;
    async load() {
        this.dirurl = Interstellar.url + "moddev/";
        const enableJSON = await (await fetch(this.dirurl + "enable.json")).json();
        const enable = enableJSON.enabled;
        if (!enable) throw "Devpack is not enabled, see enable.json inside the moddev folder!";
        const devpackVersion = +(await (await fetch(this.dirurl + "__devpack__/version.txt")).text());
        console.log("this uesr is running devpack", devpackVersion);
        this.modpack = await (new Modpack()).initdevpack(this.getFile.bind(this), true, () => {})
    }

    async getFile(path: string) {
        if (!this.assetTree[path]) this.assetTree[path] = {
            blob: await (await fetch(this.dirurl + path)).blob(),
            hash: path.replaceAll("/", "_").replaceAll(".", "_")
        }
        return this.assetTree[path]
    }

    async getManifest(): Promise<ModManifest | null> {
        this.dirurl = Interstellar.url + "moddev/";
        try {
            const enableJSON = await (await fetch(this.dirurl + "enable.json")).json();
            const enable = enableJSON.enabled;
            if (!enable) return null;
        } catch (e) {
            return null;
        }
        const files = Object.values(this.assetTree);
        let size = 0;
        for (const file of files) size += file.blob.size;
        const stellarData = await (await fetch(this.dirurl + "interstellar.json")).json();
        const manifest: ModManifest = {
            name: stellarData.name,
            creator: stellarData.creator,
            id: "interstellar.devpack",
            description: stellarData.description,
            scripting: !!stellarData.scripting,
            interstellar: !(stellarData.non_interstellar ?? false),
            resourcePack: !!stellarData.zones,
            texturePack: (stellarData.non_interstellar || !!stellarData.texture_pack),
            size: size,
            fileCount: files.length
        }
        if (stellarData.icon) {
            manifest.icon = this.dirurl + parsePath(stellarData.icon, "");
        }
        return manifest;
    }
}

export default new Devpack();