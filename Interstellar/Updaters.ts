import { GeneratedAssetTree } from "./GeneratedAssetTree";
import Interstellar from "./Interstellar";
import { InterstellarLoadingScreen } from "./InterstellarLoadingScreen";
import { AssetStoreData } from "./StellarAssetManager";
import { INTERSTELLAR_URL } from "./StellarConstants";

export async function devUpdate(updateData: AssetStoreData, update: string[], loadingScreen: InterstellarLoadingScreen) {
    const res = await fetch(INTERSTELLAR_URL + "assets", {
        method: "POST",
        body: JSON.stringify(update)
    });
    loadingScreen.setDescription(`Waiting for ${update.length} files...`)
    const formData = await res.formData();
    let manifest = null;
    
    let count = 0;
    for (const [path, file] of formData.entries()) {
        if (path == "INTERSTELLAR_ASSET_MANIFEST") {
            manifest = JSON.parse(await (file as Blob).text());
            continue;
        }
        loadingScreen.setTitle(`Installing (${count}/${update.length})`)
        loadingScreen.setProgress(count, update.length);
        loadingScreen.setDescription(`Installing ${path}`)
        updateData[path.replaceAll("\\", "")] = {"blob": file as Blob, "hash": manifest[path]}
        count++;
    }
}

const r2url = "https://pub-9b659d7f5419438c877e601951e5e352.r2.dev/"
export async function cloudflareUpdate(updateData: AssetStoreData, update: string[], loadingScreen: InterstellarLoadingScreen) {
    const CONCURRENCY_LIMIT = 6;
    let completed = 0;
    const total = update.length;
    
    const queue = [...update];

    const worker = async () => {
        while (queue.length > 0) {
            const path = queue.shift();
            if (!path) break;

            try {
                const request = await fetch(r2url + path);
                const hash = GeneratedAssetTree[path]!!;
                const blob = await request.blob();
                
                updateData[path] = { blob, hash };
            } catch (err) {
                console.error(`Failed to download ${path}, repushing to queue...`, err);
                queue.push(path);
            } finally {
                completed++;
                loadingScreen.setTitle(`Downloading (${completed}/${total})`);
                loadingScreen.setProgress(completed, total);
                loadingScreen.setDescription(`Downloaded ${path}`);
            }
        }
    };

    const workers = Array(Math.min(CONCURRENCY_LIMIT, total))
        .fill(null)
        .map(() => worker());

    await Promise.all(workers);
}