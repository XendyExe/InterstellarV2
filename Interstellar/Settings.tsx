interface InterstellarSettingTypes {
    musicVolume: number,
    disableZoneBackgrounds: boolean,
    disableFilters: boolean,
    disableComplexGFX: boolean,
    disableTelemetry: boolean,
    disableInterstellarBadge: boolean,
    disableCycleZones: boolean,
    disableGlitchEffect: boolean
}

const defaultSettings: InterstellarSettingTypes = {
    musicVolume: 0.15,
    disableZoneBackgrounds: false,
    disableFilters: false,
    disableComplexGFX: false,
    disableTelemetry: false,
    disableInterstellarBadge: false,
    disableCycleZones: false,
    disableGlitchEffect: false,
}

export class InterstellarSettings {
    // @ts-ignore
    settings: InterstellarSettingTypes 
    constructor() {
        this.load();
    }

    createState(state: Record<string, any>) {
        this.load();
        state.I_musicVolume = this.settings.musicVolume;
        state.I_disableZoneBackgrounds = this.settings.disableZoneBackgrounds;
        state.I_disableFilters = this.settings.disableFilters;
        state.I_disableComplexGFX = this.settings.disableComplexGFX;
        state.I_disableTelemetry = this.settings.disableTelemetry;
        state.I_disableInterstellarBadge = this.settings.disableInterstellarBadge;
        state.I_disableCycleZones = this.settings.disableCycleZones;
        state.I_disableGlitchEffect = this.settings.disableGlitchEffect;
    }

    update() {
        localStorage.setItem("interstellarSettings", JSON.stringify(this.settings));
    }

    setDefault() {
        this.settings = JSON.parse(JSON.stringify(defaultSettings));
        localStorage.setItem("interstellarSettings", JSON.stringify(defaultSettings));
        return;
    }

    load() {
        let stored = localStorage.getItem("interstellarSettings");
        if (!stored) {
            this.setDefault();
            return;
        }
        let json;
        try {
            json = JSON.parse(stored)
        } catch {
            this.setDefault();
            return;
        }
        for (const [name, def] of Object.entries(defaultSettings)) {
            if (json[name] === void 0) json[name] = def;
        }

        let def_keys = Object.keys(defaultSettings);
        for (const key of Object.keys(json)) {
            // @ts-ignore
            if (!def_keys.includes(key)) delete json[key];
        }

        this.settings = json;
        localStorage.setItem("interstellarSettings", JSON.stringify(json));
    }
}