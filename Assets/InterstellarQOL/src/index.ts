import InterstellarScriptingMod from "@interstellar/InterstellarScriptingMod"
import RejoinButton from "./features/RejoinButton";
import { RenderSettingsEvent, SocketOpenEvent } from "@interstellar/InterstellarEvents"
import StellarEventManager from "@interstellar/StellarEventManager"
import { settingsEventListener, setupSettings } from "./settings";
import CrewCounter from "./features/CrewCounter";
import { registerCommands } from "./features/Commands";
import StellarAPI from "@interstellar/StellarAPI";
import DefaultGravity from "./features/DefaultGravity";
import { Snakecopter } from "./features/Snakecopter";
import Keybinds from "./features/Keybinds";
import ClickableLinks from "./features/ClickableLinks";

export default class InterstellarQOL extends InterstellarScriptingMod {
    rejoinButton = new RejoinButton();
    crewCounter = new CrewCounter();
    defaultGravity = DefaultGravity;
    snakecopter = new Snakecopter();
    keybinds = Keybinds;
    clickableLInks = new ClickableLinks();

    async preload(): Promise<void> {
        console.log("Hello interstellar QOL!");
        setupSettings();
        StellarEventManager.addEventListener(SocketOpenEvent, this.socketOpen.bind(this));
        StellarEventManager.addEventListener(RenderSettingsEvent, settingsEventListener);
        registerCommands()
    }

    async load(): Promise<void> {

    }

    socketOpen(event: SocketOpenEvent) {
        console.log(event);
    }

    static logMessage(message: string) {
        StellarAPI.UI.writeChat(`<b>[<span style="color: #ff7aac">InterstellarQOL</span>]:&nbsp;</b>${message}`)
    }
}