import { h } from "preact";
import Interstellar from "../Interstellar";
import ModConfiguration, { BaseModSetting } from "./ModConfiguration";
import StellarAPI from "./StellarAPI";

export const settingsModels: {name: string, model_name: string}[] = [];

export class IndividualModAPI {
    telemetry: any;
    modid: string;
    modname: string;
    constructor(modid: string, modname: string) {
        this.modid = modid,
        this.modname = modname;
    }

    setConfiguration(options: Record<string, BaseModSetting<any>>) {
        if (!Interstellar.modsAreConfigurable) throw "Mods can only set configuration during preload";
        StellarAPI.UI.registerSettingsModel("interstellar-settings-" + this.modid, <ModConfiguration modId="test" options={Object.values(options)} modname={this.modname}/>)
        settingsModels.push({name: `${this.modname} settings`, model_name: "interstellar-settings-" + this.modid})
    }

    requestTelemetry(): any {
        if (Interstellar.telemetry.isDisabled()) return null;
        const telemetry =  {
            onOpen: ()=>{},
            onMessage: (msg: any)=>{},
            onError: (err: any)=>{},
            onClose: ()=>{}
        }
        this.telemetry = telemetry;
        return telemetry;
    }
}

export default class InterstellarScriptingMod {
    modAPI: IndividualModAPI;
    constructor(api: IndividualModAPI) {
        this.modAPI = api;
    }

    async preload() {

    }

    async load() {

    }
}