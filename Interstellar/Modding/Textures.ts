import Interstellar from "../Interstellar";


const blacklisted = [
    "bg_gradient.png", "star.png"
]

interface LoadedTextures extends Set<Blob> {
    memory?: number;
}
export const LOADED_TEXTURES: LoadedTextures = new Set();
export class Textures {
    textures: Record<string, Blob> = {}
    constructor() {
    }
    
    addTexture(path: string, blob: Blob) {
        this.textures[path] = blob;
        LOADED_TEXTURES.add(blob);
    }

    switchToTexture() {
        const modFileDB = Interstellar.patcher.internalModFileManager.modFileDB;
        modFileDB.deleteAllFiles();
        for (const [path, texture] of Object.entries(this.textures)) {
            if (blacklisted.includes(path)) continue;
            let p = "/img/" + path;
            modFileDB.saveFile(texture, p);
        }
        modFileDB.syncFilesWithUI();
    }
}