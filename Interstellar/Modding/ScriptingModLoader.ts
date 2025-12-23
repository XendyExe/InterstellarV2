import { scriptingModExports, scriptingModFunctions, scriptingModRequires } from "../API/APILinker";
import InterstellarScriptingMod from "../API/InterstellarScriptingMod";
import { BlobContainer } from "../API/Utils";
import Interstellar from "../Interstellar";
import { Modpack } from "./Modpack";
import { parsePath, parsePathFromFile } from "./PathParser";

export async function loadScriptingMod(mod: Modpack): Promise<InterstellarScriptingMod> {
    const modid = mod.config.id;
    const scriptingType = mod.config.scripting!!.toLowerCase();
    const entrypoint = mod.config.entrypoint!!
    const files = mod.files;

    if (scriptingType == "commonjs") return await loadCommonJSMod(modid, entrypoint, files);
    else throw `Unrecognized scripting type "${scriptingType}" when loading ${mod.config.id} (${mod.config.name})`
}


// CommonJS scripting importing
async function loadCommonJSMod(modid: string, entrypoint: string, files: Record<string, BlobContainer>): Promise<InterstellarScriptingMod> {
    entrypoint = parsePath(entrypoint, "");
    const importQueue = await getCommonJS(modid, entrypoint, files);
    while (importQueue.length > 0) {
        let path = importQueue.shift()!!;
        (await getCommonJS(modid, path, files)).forEach((link) => {
            if (!scriptingModFunctions[modid + "/" + link] && !importQueue.includes(link)) {
                importQueue.push(link);
            }
        })
    }
    const abspath = `${modid}/${entrypoint}`;
    const entrypointModule = scriptingModRequires(abspath);
    return Interstellar.scriptingMods[modid] = new entrypointModule.default();
}
const commonjsregex = /require\((["'`])(.*?)["'`]\)/gm
async function getCommonJS(modid: string, path: string, files: Record<string, BlobContainer>): Promise<string[]> {
    const jsFile = await files[path];
    if (!jsFile) throw `Failed to find js file ${path}`
    let js = await jsFile.blob.text();
    const linked: string[] = []
    js = js.replaceAll(commonjsregex, (match, quote, module) => {
        if (
            module.startsWith("@interstellar") ||
            module == "preact" ||
            module == "msgpack" ||
            module == "pixi.js" ||
            module == "pixi-filters"
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