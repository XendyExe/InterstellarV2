"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const InterstellarScriptingMod_1 = __importDefault(require("@interstellar/InterstellarScriptingMod"));
const RejoinButton_1 = __importDefault(require("./features/RejoinButton"));
const InterstellarEvents_1 = require("@interstellar/InterstellarEvents");
const StellarEventManager_1 = __importDefault(require("@interstellar/StellarEventManager"));
const settings_1 = require("./settings");
const CrewCounter_1 = __importDefault(require("./features/CrewCounter"));
const Commands_1 = require("./features/Commands");
const StellarAPI_1 = __importDefault(require("@interstellar/StellarAPI"));
const DefaultGravity_1 = __importDefault(require("./features/DefaultGravity"));
const Snakecopter_1 = require("./features/Snakecopter");
const Keybinds_1 = __importDefault(require("./features/Keybinds"));
const ClickableLinks_1 = __importDefault(require("./features/ClickableLinks"));
const ZoomOpacity_1 = __importDefault(require("./features/ZoomOpacity"));
const PaintHelper_1 = __importDefault(require("./features/PaintHelper"));
const GravSkates_1 = __importDefault(require("./features/GravSkates"));
const HideShip_1 = __importDefault(require("./features/HideShip"));
const Antiafk_1 = __importDefault(require("./features/Antiafk"));
const EventTrack_1 = __importDefault(require("./features/EventTrack"));
const ModConfiguration_1 = require("@interstellar/ModConfiguration");
const Autoresponse_1 = __importDefault(require("./features/Autoresponse"));
const ShipTags_1 = __importDefault(require("./features/ShipTags"));
const OnlineList_1 = __importDefault(require("./features/OnlineList"));
const Chat_1 = __importDefault(require("./features/Chat"));
const DisableGravity_1 = __importDefault(require("./features/DisableGravity"));
class InterstellarQOL extends InterstellarScriptingMod_1.default {
    constructor() {
        super(...arguments);
        this.rejoinButton = new RejoinButton_1.default();
        this.crewCounter = new CrewCounter_1.default();
        this.defaultGravity = DefaultGravity_1.default;
        this.snakecopter = new Snakecopter_1.Snakecopter();
        this.keybinds = Keybinds_1.default;
        this.clickableLInks = new ClickableLinks_1.default();
        this.zoomOpacity = ZoomOpacity_1.default;
        this.paintHelper = PaintHelper_1.default;
        this.gravSkates = GravSkates_1.default;
        this.hideShip = HideShip_1.default;
        this.antiafk = new Antiafk_1.default();
        this.eventtrack = new EventTrack_1.default();
        this.autoresponse = new Autoresponse_1.default(this);
        this.shiptags = new ShipTags_1.default();
        // speedrun = new PitsSpeedrun();
        this.onlineList = new OnlineList_1.default();
        // pingstablizer = new Pingtablizer();
        this.chat = Chat_1.default;
        this.nograv = new DisableGravity_1.default();
        this.options = {
            sillyAutoresponse: new ModConfiguration_1.BooleanModSetting("Silly Autoresponse", "Enable silly autorespones. Silly autoresponses has a cooldown of 60 seconds.", true),
            // translateLanguage: new InputModSetting("Translate to", "What language to translate to? Please enter language codes, like en for english, ru for russian, etc. See https://en.wikipedia.org/wiki/List_of_ISO_639_language_codes", "en");
            button1: new ModConfiguration_1.ButtonModSetting("Keybinds", "Open the keybind menu", () => { StellarAPI_1.default.UI.toggleUI("isqol-keybinds"); }),
            button2: new ModConfiguration_1.ButtonModSetting("Autoequip", "Open the autoequip menu", () => { StellarAPI_1.default.UI.toggleUI("isqol-autoequip"); }),
        };
    }
    preload() {
        return __awaiter(this, void 0, void 0, function* () {
            (0, settings_1.setupSettings)();
            StellarEventManager_1.default.addEventListener(InterstellarEvents_1.RenderSettingsEvent, settings_1.settingsEventListener);
            (0, Commands_1.registerCommands)();
            this.modAPI.setConfiguration(this.options);
        });
    }
    load() {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
    static logMessage(message) {
        StellarAPI_1.default.UI.writeChat(`<b>[<span style="color: #ff7aac">InterstellarQOL</span>]:&nbsp;</b>${message}`);
    }
}
exports.default = InterstellarQOL;
