interface InterstellarSettingTypes {
    musicVolume: number
}

const defaultSettings = {
    musicVolume: 0.15
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
    }

    update() {
        console.log("Saving interstellar settings!");
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

        for (const key of Object.keys(json)) {
            // @ts-ignore
            if (!defaultSettings[key]) delete json[key];
        }

        this.settings = json;
        localStorage.setItem("interstellarSettings", JSON.stringify(json));
    }
}