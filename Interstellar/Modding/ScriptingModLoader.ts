import { scriptingModExports, scriptingModFunctions, scriptingModRequires } from "../API/APILinker";
import InterstellarScriptingMod, { IndividualModAPI } from "../API/InterstellarScriptingMod";
import StellarAPI from "../API/StellarAPI";
import { BlobContainer } from "../API/Utils";
import Interstellar from "../Interstellar";
import { Modpack } from "./Modpack";
import { parsePath, parsePathFromFile } from "./PathParser";

export async function loadScriptingMod(mod: Modpack): Promise<InterstellarScriptingMod | null> {
    const modid = mod.config.id;
    const scriptingType = mod.config.scripting!!.toLowerCase();
    const entrypoint = mod.config.entrypoint!!

    if (scriptingType == "commonjs") return await loadCommonJSMod(modid, entrypoint, mod);
    else throw `Unrecognized scripting type "${scriptingType}" when loading ${mod.config.id} (${mod.config.name})`
}


// CommonJS scripting importing
async function loadCommonJSMod(modid: string, entrypoint: string, mod: Modpack): Promise<InterstellarScriptingMod | null> {
    entrypoint = parsePath(entrypoint, "");
    let importQueue;
    try {
        importQueue = await getCommonJS(modid, entrypoint, mod);
    } catch (e) {
            Interstellar.reportFailed(modid, `Failed to load/parse commonjs mod at "${modid}/${entrypoint}"`, e);
        return null;
    }
    while (importQueue.length > 0) {
        let path = importQueue.shift()!!;
        try {
            (await getCommonJS(modid, path, mod)).forEach((link) => {
                if (!scriptingModFunctions[modid + "/" + link] && !importQueue.includes(link)) {
                    importQueue.push(link);
                }
            })
        } catch (e) {
            Interstellar.reportFailed(modid, `Failed to load/parse commonjs mod at "${modid}/${path}"`, e);
            return null;
        }
    }
    const abspath = `${modid}/${entrypoint}`;
    try {
        const entrypointModule = scriptingModRequires(abspath);
        let moddingAPI = new IndividualModAPI(modid, mod.config.name);
        return Interstellar.scriptingMods[modid] = new entrypointModule.default(moddingAPI);
    } catch (e) {
        Interstellar.reportFailed(modid, `Failed to run commonjs mod at "${modid}"`, e);
        return null;
    }
}
const commonjsregex = /require\((["'`])(.*?)["'`]\)/gm
async function getCommonJS(modid: string, path: string, mod: Modpack): Promise<string[]> {
    const jsFile = await mod.getFile(path);
    if (!jsFile) throw `Failed to find js file ${path}`
    let js: string = await jsFile.blob.text();
    const linked: string[] = []
    js = js.replaceAll(commonjsregex, (match, quote, module) => {
        if (module == "preact/hooks") module = "preact";
        if (
            module.startsWith("@interstellar") ||
            module == "preact" ||
            module == "msgpack"
        ) return `require(${quote}${module}${quote})`
        if (/^[./]+$/.test(module)) module += "/index"; // whyyyyyyy
        module += ".js"
        const absPath = parsePathFromFile(module, path)
        linked.push(absPath);
        return `require(${quote}${modid}/${absPath}${quote})`;
    })
    scriptingModFunctions[modid + "/" + path] = new Function("require", "exports", js)
    return linked
}