import InterstellarScriptingMod from "@interstellar/InterstellarScriptingMod"
import RejoinButton from "./features/RejoinButton";
import { RenderSettingsEvent, SocketMessageRecieveEvent, SocketOpenEvent } from "@interstellar/InterstellarEvents"
import StellarEventManager from "@interstellar/StellarEventManager"
import { settingsEventListener, setupSettings } from "./settings";
import CrewCounter from "./features/CrewCounter";
import { registerCommands } from "./features/Commands";
import StellarAPI from "@interstellar/StellarAPI";
import DefaultGravity from "./features/DefaultGravity";
import { Snakecopter } from "./features/Snakecopter";
import Keybinds from "./features/Keybinds";
import ClickableLinks from "./features/ClickableLinks";
import ZoomOpacity from "./features/ZoomOpacity";
import PaintHelper from "./features/PaintHelper";
import gravSkates from "./features/GravSkates";
import hideShip from "./features/HideShip";

export default class InterstellarQOL extends InterstellarScriptingMod {
    rejoinButton = new RejoinButton();
    crewCounter = new CrewCounter();
    defaultGravity = DefaultGravity;
    snakecopter = new Snakecopter();
    keybinds = Keybinds;
    clickableLInks = new ClickableLinks();
    zoomOpacity = ZoomOpacity;
    paintHelper = PaintHelper;
    gravSkates = gravSkates;
    hideShip = hideShip;

    async preload(): Promise<void> {
        setupSettings();
        StellarEventManager.addEventListener(SocketOpenEvent, this.socketOpen.bind(this));
        StellarEventManager.addEventListener(RenderSettingsEvent, settingsEventListener);
        registerCommands()
    }

    async load(): Promise<void> {
        StellarEventManager.addEventListener(SocketMessageRecieveEvent, (event: SocketMessageRecieveEvent) => {
            let packet = event.message;
            if (packet.type == StellarAPI.Packet.SvMsgSnapshot) return;
            if (packet.type == StellarAPI.Packet.SvMsgWorldBlocks) {
            }
        })
    }

    socketOpen(event: SocketOpenEvent) {
        console.log(event);
    }

    static logMessage(message: string) {
        StellarAPI.UI.writeChat(`<b>[<span style="color: #ff7aac">InterstellarQOL</span>]:&nbsp;</b>${message}`)
    }
}