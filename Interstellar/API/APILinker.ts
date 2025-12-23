import CycleZone from "../Graphical/CycleZone";
import NavZone from "../Graphical/NavZone";
import Zone from "../Graphical/Zone";
import ZoneBackground from "../Graphical/ZoneBackground";
import Interstellar from "../Interstellar";
import { createEventExports } from "./InterstellarEvents";
import InterstellarScriptingMod from "./InterstellarScriptingMod";
import StellarAPI from "./StellarAPI";
import StellarCommandsManager, { Argument, BaseCommand, FloatArgument, IntArgument, OptionsArgument, PlayerArgument, StringArgument } from "./StellarCommandsManager";
import StellarEventManager from "./StellarEventManager";

export const scriptingModFunctions: Record<string, any> = {};
export const scriptingModExports: Record<string, any> = {};
export function scriptingModRequires(path: string): any {
    if (!scriptingModExports[path]) {
        scriptingModExports[path] = {};
        if (!scriptingModFunctions[path]) throw new Error(`Failed to import script "${path}"`)
        scriptingModFunctions[path](scriptingModRequires, scriptingModExports[path])
    }
    return scriptingModExports[path]
}

function createInterstellarExport() {
    const exports = {};
    Object.defineProperty(exports, "__esModule", { value: true });
    return exports;
}
function linkInterstellarDefault(name: string, object: any) {
    scriptingModExports[name] = createInterstellarExport();
    scriptingModExports[name].default = object
    return scriptingModExports[name]
}
export function revealInterstellarExports() {
    linkInterstellarDefault("@interstellar/InterstellarScriptingMod", InterstellarScriptingMod);
    linkInterstellarDefault("@interstellar/StellarAPI", StellarAPI);
    linkInterstellarDefault("@interstellar/Zone", Zone);
    linkInterstellarDefault("@interstellar/NavZone", NavZone);
    linkInterstellarDefault("@interstellar/CycleZone", CycleZone);
    linkInterstellarDefault("@interstellar/ZoneBackground", ZoneBackground);
    scriptingModExports["@interstellar/InterstellarEvents"] = createEventExports();
    linkInterstellarDefault("@interstellar/StellarEventManager", StellarEventManager);

    const cmdExports = linkInterstellarDefault("@interstellar/StellarCommandsManager", StellarCommandsManager);
    cmdExports.Argument = Argument;
    cmdExports.OptionsArgument = OptionsArgument
    cmdExports.IntArgument = IntArgument
    cmdExports.FloatArgument = FloatArgument
    cmdExports.StringArgument = StringArgument
    cmdExports.BaseCommand = BaseCommand
    cmdExports.PlayerArgument = PlayerArgument;

    // :sparkles: the danger zone :sparkles:
    // @ts-ignore
    Interstellar.patcher.preact = scriptingModExports["preact"] = require("preact");
    // @ts-ignore
    Interstellar.patcher.msgpack = scriptingModExports["msgpack"] = require("msgpack");
    // @ts-ignore
    scriptingModExports["pixi.js"] = window.PIXI;
}
