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
import Antiafk from "./features/Antiafk";
import PingStablizer from "./features/PingStablizer";
import EventTrack from "./features/EventTrack";
import { BaseModSetting, BooleanModSetting, ButtonModSetting, InputModSetting } from "@interstellar/ModConfiguration";
import Autoresponse from "./features/Autoresponse";
import ShipTags from "./features/ShipTags";
import PitsSpeedrun from "./features/PitsSpeedrun";
import OnlineList from "./features/OnlineList";
import Chat from "./features/Chat";
import DisableGravity from "./features/DisableGravity";
import StellarCommandsManager, { BaseCommand } from "@interstellar/StellarCommandsManager";

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
    antiafk = new Antiafk();
    eventtrack = new EventTrack();
    autoresponse = new Autoresponse(this);
    shiptags = new ShipTags();
    // speedrun = new PitsSpeedrun();
    onlineList = new OnlineList();
    // pingstablizer = new Pingtablizer();
    chat = Chat;
    nograv = new DisableGravity();

    options = {
        sillyAutoresponse: new BooleanModSetting("Silly Autoresponse", "Enable silly autorespones. Silly autoresponses has a cooldown of 60 seconds.", true),
        // translateLanguage: new InputModSetting("Translate to", "What language to translate to? Please enter language codes, like en for english, ru for russian, etc. See https://en.wikipedia.org/wiki/List_of_ISO_639_language_codes", "en");
        button1: new ButtonModSetting("Keybinds", "Open the keybind menu", () => {StellarAPI.UI.toggleUI("isqol-keybinds")}),
        button2: new ButtonModSetting("Autoequip", "Open the autoequip menu", () => {StellarAPI.UI.toggleUI("isqol-autoequip")}),
    }
    async preload(): Promise<void> {
        setupSettings();
        StellarEventManager.addEventListener(RenderSettingsEvent, settingsEventListener);
        registerCommands();

        this.modAPI.setConfiguration(this.options)
    }

    async load(): Promise<void> {
    }

    static logMessage(message: string) {
        StellarAPI.UI.writeChat(`<b>[<span style="color: #ff7aac">InterstellarQOL</span>]:&nbsp;</b>${message}`)
    }
}