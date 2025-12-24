import Interstellar from "../Interstellar";
import { InterstellarLoadingScreen } from "../InterstellarLoadingScreen";
import StellarAssetManager, { AssetStoreData } from "../StellarAssetManager";
import ModpackConfig from "./ModdingTypes/ModpackConfig";
import { Modpack } from "./Modpack";
function stringToHex(str: string) {
  return [...str]
    .map(ch => ch.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("");
}
class ModpackImporter {
    async importDirectory(dir: FileSystemDirectoryEntry) {
        let loadingScreen = new InterstellarLoadingScreen("Importing mod...", "Reading directory...");
        let files: [string, File][] = [];
        await this.readDirectoryRecursive(dir, files, loadingScreen);
        let flatten: AssetStoreData = {};
        let start = Date.now();
        let total = files.length;
        let count = 0;
        for (const [fullPath, blob] of files) {
            loadingScreen.setTitle(`Importing mod (${count}/${total})`)
            loadingScreen.setDescription(`Unzipping ${blob.name}`)
            let hash = `${start}.${count}.${total}.${Math.floor(Math.random() * 255)}`
            let path = fullPath.startsWith("/") ? fullPath.slice(1) : fullPath;
            flatten[path] = {blob: blob, hash: stringToHex(hash)};
            count++;
            loadingScreen.setProgress(count, total);
        }
        await this.importModpack(dir.name, flatten, loadingScreen);
    }

    // This makes me want to explode more.
    async readDirectoryRecursive(dir: FileSystemDirectoryEntry, result: [string, File][], loadingScreen: InterstellarLoadingScreen) {
        loadingScreen.setDescription("Loading file entries in " + dir.fullPath)
        let entries = await this.readDirectoryEntries(dir);
        for (const fileEntry of entries) {
            if (fileEntry.name === "__MACOSX" || fileEntry.name === ".DS_Store") continue;
            if (fileEntry.isDirectory) {
                await this.readDirectoryRecursive(fileEntry as FileSystemDirectoryEntry, result, loadingScreen)
            } else {
                loadingScreen.setDescription("Reading " + fileEntry.fullPath)
                result.push([fileEntry.fullPath.replaceAll("\\", "/"), await this.getFile(fileEntry as FileSystemFileEntry)])
            }
        }
    }
    // -w-
    private getFile(entry: FileSystemFileEntry): Promise<File> {
        return new Promise((resolve, reject) => {
            entry.file(resolve, reject);
        });
    }

    // This makes me want to explode.
    async readDirectoryEntries(dir: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> {
        return new Promise((resolve, reject) => {
            const reader = dir.createReader();
            const allEntries: FileSystemEntry[] = [];
            const readBatch = () => {
                reader.readEntries(
                    (entries) => {
                        if (entries.length === 0) {
                            resolve(allEntries);
                        } else {
                            allEntries.push(...entries);
                            readBatch();
                        }
                    },
                    reject
                );
            };
            readBatch();
        });
    }

    async importZip(file: File) {
        await Interstellar.patcher.internalModFileManager.modFileDB.prepareZipLib();
        let loadingScreen = new InterstellarLoadingScreen("Importing mod...", "Unzipping");
        try {
            let folder = await Interstellar.patcher.internalModFileManager.modFileDB.zipCtor.loadAsync(file);
            let files: any[] = Object.values(folder.files);

            let flatten: AssetStoreData = {};
            let total = files.length;
            let count = 0;
            loadingScreen.setProgress(count, total);
            let start = Date.now();
            for (const zipFile of files) {
                if (zipFile.dir || zipFile.name.startsWith("__MACOSX/") || zipFile.name.endsWith(".DS_Store")) continue;
                loadingScreen.setTitle(`Importing mod (${count}/${total})`)
                const blob = await zipFile.async("blob");
                loadingScreen.setDescription(`Unzipping ${zipFile.name}`)
                let hash = `${start}.${count}.${total}.${Math.floor(Math.random() * 255)}`
                flatten[zipFile.name.replaceAll("\\", "/")] = {blob: blob, hash: stringToHex(hash)};
                count++;
                loadingScreen.setProgress(count, total);
            }
            await this.importModpack(file.name, flatten, loadingScreen);
        } catch (s) {
            console.log(s);
            loadingScreen.complete();
            Interstellar.patcher.promptManager.openPrompt("Error", "Failed to read archive.", () => {})
        }
    }

    async importModpack(name: string, pack: AssetStoreData, loading: InterstellarLoadingScreen) {
        let config: ModpackConfig;
        loading.setDescription("Finding config...")

        let basePath = "";
        let foundConfig = false;
        // interstellar.json should always be at the root of the folder
        for (const path of Object.keys(pack)) {
            if (path == "interstellar.json" || path.endsWith("/interstellar.json")) {
                foundConfig = true;
                if (basePath == "") basePath = path.slice(0, path.lastIndexOf("interstellar.json"));
                else {
                    loading.complete();
                    Interstellar.patcher.promptManager.openPrompt("Error", "This mod has multiple interstellar.jsons, which is not allowed!", () => {})
                    return;
                }
            }
        }
        // Look for /img folder as close to root as possible for vanilla packs
        if (!foundConfig) {
            const imgpaths = [];
            for (const path of Object.keys(pack)) {
                if (path.includes("img/")) {
                    let p = path.split("img/")[0]!!;
                    if (p.endsWith("/")) p = p.slice(0, -1);
                    imgpaths.push(p)
                }
            }

            let bestPathSize = Number.MAX_SAFE_INTEGER;
            let bestPath = "";

            for (const path of imgpaths) {
                let splits = path.split("/");
                if (splits.length < bestPathSize) {
                    bestPathSize = splits.length;
                    bestPath = path;
                }
            }

            basePath = bestPath;
        }
        if (!basePath.endsWith("/") && basePath != "") basePath += "/";
        if (!pack[basePath + "interstellar.json"]) {
            console.log("Pack doesn't have an interstellar.json!", {...pack})
            config = {
                name: name,
                creator: "unknown",
                id: `imported.${Date.now()}.${Math.floor(Math.random() * 1000)}`,
                description: "An imported vanilla texture pack, missing the interstellar json config.",
                non_interstellar: true,
                texture_pack: true
            };
            pack[basePath + "interstellar.json"] = {blob: new Blob([JSON.stringify(config)], { type: "application/json" }), hash: ""};
        } else config = JSON.parse(await pack[basePath + "interstellar.json"]!!.blob.text());
        
        if (config.id.startsWith("interstellar.")) {
            loading.complete();
            Interstellar.patcher.promptManager.openPrompt("Error", "Cannot import a mod with id starting with interstellar.", () => {})
            return;
        }

        if (basePath != "") {
            console.log("Fixing basepath...", basePath)
            const brokenPaths = Object.keys(pack);
            for (const brokenPath of brokenPaths) {
                pack[brokenPath.slice(basePath.length)] = pack[brokenPath]!!
                delete pack[brokenPath];
            }
        }

        if (config.texture_pack) await this.importTexturePack(config, pack, loading);
        else await this.importResourcePack(config, pack, loading)
    }

    async importTexturePack(config: ModpackConfig, pack: AssetStoreData, loading: InterstellarLoadingScreen) {
        loading.setTitle("Loading texture pack...");
        loading.setDescription("Removing extranious files");
        const keys = Object.keys(pack);
        for (const key of keys) {
            if (key.startsWith("img/") || key == "interstellar.json") continue;
            delete pack[key];
        }
        if (Object.values(pack).length == 1) {
            loading.complete();
            Interstellar.patcher.promptManager.openPrompt("Error", "This texture pack has no drednot textures! Make sure you imported the right file!", () => {});
            return;
        }
        loading.setDescription("Saving!");
        await StellarAssetManager.pushAssetStore(config.id, pack);
        loading.complete();
        Interstellar.modpackManager.close();
        Interstellar.modpackManager.open();
    }

    async importResourcePack(config: ModpackConfig, pack: AssetStoreData, loading: InterstellarLoadingScreen) {
        loading.setTitle("Loading resource pack...");
        loading.setUnbounded();
        loading.setDescription("Validating preload...");
        let validation;
        try {
            const getFileFunction = async (path: string) => {
                return pack[path];
            }
            validation = await (new Modpack()).init(getFileFunction, false, () => {}, false);
        } catch (s) {
            console.log(s);
            loading.complete();
            Interstellar.patcher.promptManager.openPrompt("Error", "Resource pack failed validation at preload:\n" + s, () => {})
            return;
        }
        async function validateLoad(validation: Modpack) {
            try {
                await validation.load({}, false);
            } catch (s) {
                console.log(s);
                loading.complete();
                Interstellar.patcher.promptManager.openPrompt("Error", "Resource pack failed validation at load:\n" + s, () => {})
                return;
            }
            loading.setDescription("Saving!");
            console.log(pack);
            await StellarAssetManager.pushAssetStore(config.id, pack);
            loading.complete();
            Interstellar.modpackManager.close();
            Interstellar.modpackManager.open();
        }
        if (validation.config.scripting) {
            loading.complete();
            Interstellar.patcher.promptManager.openPrompt("Warning: Scripting mod", "This mod you are attempting to import is a scripting mod. This means it will attempt to run scripts, and have complete access to your game. Interstellar is not responsible for any malicous mods you exterally import. Make sure you trust the person you are importing this mod from.", () => {
                loading = new InterstellarLoadingScreen("Loading resource pack...", "Validating load...");
                validateLoad(validation)
            })
            return;
        }
        loading.setDescription("Validating load...");
        await validateLoad(validation)

    }
}

export default new ModpackImporter()