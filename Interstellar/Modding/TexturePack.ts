import Interstellar from "../Interstellar";
import ModpackConfig from "./ModdingTypes/ModpackConfig";
import { Modpack } from "./Modpack";

interface BlobContainer {
    blob: Blob;
    [key: string]: any;
}

export class TexturePack {
    // @ts-ignore
    config: ModpackConfig;
    files: Record<string, Blob> = {};
    constructor() {
        
    }
    async init(flattened: Record<string, BlobContainer>): Promise<TexturePack> {
        const config = flattened["interstellar.json"];
        if (!config) throw "Texture pack is missing an interstellar.json!";
        this.config = JSON.parse(await config.blob.text());
        for (const [key, blob] of Object.entries(flattened)) {
            this.files[key.slice(4)] = blob.blob;
        }
        console.log(this.files);
        return this;
    }
    async load(cache: Record<string, Blob>) {
        let textures = Object.values(Interstellar.zoneOverrides).map(zone => zone.subzones).flat().map(subzone=>subzone.textures)
        for (const [path, file] of Object.entries(this.files)) {
            for (const texture of textures) {
                texture.addTexture(path, file);
            }
            cache[path] = file; 
        }
    }
}

export async function createTexturePack(flattened: Record<string, BlobContainer>): Promise<TexturePack> {
    return await (new TexturePack()).init(flattened)
}