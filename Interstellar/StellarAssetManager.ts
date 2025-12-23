import {GeneratedAssetTreeLastUpdated, GeneratedAssetTree} from "./GeneratedAssetTree";
import Interstellar from "./Interstellar";
import { InterstellarLoadingScreen } from "./InterstellarLoadingScreen";
import { MUSIC_TYPES } from "./Modding/MusicAssetManager";
import PerformanceMetrics, { stellarFormatLoadTimes } from "./PerformanceMetrics";
import { devUpdate, cloudflareUpdate } from "./Updaters";
type AssetRecord = {
    blob: Blob;
    hash: string;
};
export type AssetStoreData = Record<string, AssetRecord>;
export const internalModpackName = "StrawberryJamPack";
class AssetManager {
    database: IDBDatabase | undefined;
    internal: AssetStoreData | undefined;
    urlTable: Record<string, string> = {};
    modAssetTable: Record<string, AssetStoreData> = {};
    async init() {
        PerformanceMetrics.push(`Network: ${stellarFormatLoadTimes(performance.now())}`);
        PerformanceMetrics.start("Blocking load:");
        this.internal = await this.loadAssetStore("internal");
        PerformanceMetrics.split("AssetManager // Loaded internal asset store");
        let lastUpdated = localStorage.getItem("stellarAssetsUT");
        let updateTime = lastUpdated ? Number.parseFloat(lastUpdated) : 0;
        if (updateTime <= GeneratedAssetTreeLastUpdated) {
            const data = await this.getUpdates();
            localStorage.setItem("stellarAssetsUT", (Date.now() / 1000).toString());
            PerformanceMetrics.split(`Applied possible updates: (${data[0]!}|${data[1]!}) `);
        }
        PerformanceMetrics.split("AssetManager // Done!");
        await Interstellar.loaded();
    }


    async getUpdates(): Promise<number[]> {
        let internalKeys = Object.keys(this.internal!!)
        let assetPaths = Object.keys(GeneratedAssetTree);
        let update = [];
        let remove = [];
        for (const [path, hash] of Object.entries(GeneratedAssetTree)) {
            if (internalKeys.includes(path)) {
                if (hash != this.internal!![path]?.hash) {
                    update.push(path);
                }
            } else {
                update.push(path)
            }
        }
        for (const key of internalKeys) {
            if (!assetPaths.includes(key)) {
                remove.push(key);
            }
        }
        if (update.length == 0 && remove.length == 0) {
            console.log("No updates needed!");
            return [0, 0];
        }
        
        console.log(`Found update of ${update.length} files, removing ${remove.length} files`);
        const loadingScreen = new InterstellarLoadingScreen("Downloading asset update...", `Choosing an update method...`)
        
        let updateData: AssetStoreData = {};
        if (update.length != 0) {
            if (Interstellar.dev) await devUpdate(updateData, update, loadingScreen);
            else await cloudflareUpdate(updateData, update, loadingScreen);
        }
        
        const transaction = this.database!!.transaction("internal", "readwrite");
        const store = transaction.objectStore("internal");
        let tasks: Promise<any>[] = []
        for (const [path, data] of Object.entries(updateData)) {
            if (path == "INTERSTELLAR_ASSET_MANIFEST") continue;
            this.internal!![path] = data;
            tasks.push(this.putIntoStore(store, path, data))
        }
        for (const r of remove) {
            tasks.push(this.removeFromStore(store, r));
            delete this.internal!![r];
        }
        loadingScreen.complete();
        return [update.length, remove.length];
    }

    async pushAssetStore(name: string, storeData: AssetStoreData) {
        await this.createAssetStore(name, "interstellar");
        const transaction = this.database!!.transaction(name, "readwrite");
        const store = transaction.objectStore(name);
        let tasks = [];
        for (const [path, data] of Object.entries(storeData)) {
            tasks.push(this.putIntoStore(store, path, data));
        }
        await Promise.all(tasks);
    }

    async loadAssetStore(name: string): Promise<AssetStoreData> {
        const transaction = this.database!!.transaction(name, "readonly");
        const store = transaction.objectStore(name);
        return new Promise((resolve, reject) => {
            const request = store.openCursor();
            request.onerror = function(event) {
                reject(`Failed to load request an AssetStore: ${request.error}`);
            };
            const result: AssetStoreData = {};
            request.onsuccess = function(event) {
                let cursor = request.result;
                if (cursor) {
                    let key = cursor.primaryKey as string;
                    let value = cursor.value as AssetRecord;
                    result[key] = value;
                    cursor.continue();
                }
                else {
                    resolve(result);
                }
            };
        })
    }

    async putIntoStore(store: IDBObjectStore, key: string, value: any) {
        return new Promise((resolve, reject) => {
            let request = store.put(value, key);
            request.onsuccess = resolve;
            request.onerror = reject;
        })
    }
    async removeFromStore(store: IDBObjectStore, key: string) {
        return new Promise((resolve, reject) => {
            let request = store.delete(key);
            request.onsuccess = resolve;
            request.onerror = reject;
        })
    }

    async initDatabase(): Promise<IDBDatabase> {
        if ('storage' in navigator && 'persist' in navigator.storage) {
            const isPersisted = await navigator.storage.persisted();
            if (!isPersisted) {
                const successful = await navigator.storage.persist();
                if (!successful) {
                    console.error("No persistant interstellar storage!!")
                }
            }
        }
        return new Promise((resolve, reject) => {
            const request = indexedDB.open("interstellar");
            request.onupgradeneeded = (event) => {
                this.database = request.result;

                if (!this.database.objectStoreNames.contains("internal")) {
                    this.database.createObjectStore("internal");
                }
            };
            request.onsuccess = () => {
                this.database = request.result;
                resolve(request.result);
            };
            request.onerror = () => {
                throw `Failed to create asset database! Your browser may not be compatable!\n ${request.error}`;
            };
        });
    }

    async createAssetStore(name: string, dbName="musiccache") {
        await this.reloadDatabaseWithUpgrade(dbName, (db) => {
            if (!db.objectStoreNames.contains(name)) {
                db.createObjectStore(name);
            }
        })
    }

    async deleteAssetStore(name: string, dbName="musiccache") {
        await this.reloadDatabaseWithUpgrade(dbName, (db) => {
            if (db.objectStoreNames.contains(name)) {
                db.deleteObjectStore(name);
            }
        })
    }

    async reloadDatabaseWithUpgrade(dbName: string, upgrade: (db: IDBDatabase)=>void) {
        const currentVersion = this.database?.version || 1;
        this.database?.close();
        this.database = await new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, currentVersion + 1);
            request.onupgradeneeded = (event) => {
                const db = request.result;
                upgrade(db);
            };
            request.onsuccess = () => {
                this.database = request.result;
                resolve(request.result);
            };
            request.onerror = () => reject(request.error);
        });

    }
}

export default new AssetManager();