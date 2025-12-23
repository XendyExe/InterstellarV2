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
class InterstellarQOL extends InterstellarScriptingMod_1.default {
    constructor() {
        super(...arguments);
        this.rejoinButton = new RejoinButton_1.default();
        this.crewCounter = new CrewCounter_1.default();
        this.defaultGravity = DefaultGravity_1.default;
        this.snakecopter = new Snakecopter_1.Snakecopter();
        this.keybinds = Keybinds_1.default;
        this.clickableLInks = new ClickableLinks_1.default();
    }
    preload() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("Hello interstellar QOL!");
            (0, settings_1.setupSettings)();
            StellarEventManager_1.default.addEventListener(InterstellarEvents_1.SocketOpenEvent, this.socketOpen.bind(this));
            StellarEventManager_1.default.addEventListener(InterstellarEvents_1.RenderSettingsEvent, settings_1.settingsEventListener);
            (0, Commands_1.registerCommands)();
        });
    }
    load() {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
    socketOpen(event) {
        console.log(event);
    }
    static logMessage(message) {
        StellarAPI_1.default.UI.writeChat(`<b>[<span style="color: #ff7aac">InterstellarQOL</span>]:&nbsp;</b>${message}`);
    }
}
exports.default = InterstellarQOL;
