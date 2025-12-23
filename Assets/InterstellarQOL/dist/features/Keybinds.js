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
exports.DEFAULT_KEYBINDS = void 0;
const InterstellarEvents_1 = require("@interstellar/InterstellarEvents");
const StellarAPI_1 = __importDefault(require("@interstellar/StellarAPI"));
const StellarCommandsManager_1 = __importDefault(require("@interstellar/StellarCommandsManager"));
const StellarEventManager_1 = __importDefault(require("@interstellar/StellarEventManager"));
const __1 = __importDefault(require(".."));
exports.DEFAULT_KEYBINDS = [
    {
        disabled: false,
        shift: false,
        control: false,
        alt: false,
        key: "KeyF",
        command: "changeFireMode toggle"
    },
    {
        disabled: false,
        shift: false,
        control: false,
        alt: true,
        key: "ArrowLeft",
        command: "gravity left"
    },
    {
        disabled: false,
        shift: false,
        control: false,
        alt: true,
        key: "ArrowUp",
        command: "gravity up"
    },
    {
        disabled: false,
        shift: false,
        control: false,
        alt: true,
        key: "ArrowRight",
        command: "gravity right"
    },
    {
        disabled: false,
        shift: false,
        control: false,
        alt: true,
        key: "ArrowDown",
        command: "gravity down"
    },
    {
        disabled: false,
        shift: false,
        control: true,
        alt: false,
        key: "KeyS",
        command: "save"
    }
];
const blacklistedKeys = [
    "ShiftLeft", "ShiftRight", "AltLeft", "AltRight", "ControlLeft", "ControlRight"
];
class Keybinds {
    constructor() {
        this.keybinds = exports.DEFAULT_KEYBINDS;
        this.settingCommand = null;
        this.settingKey = null;
        window.addEventListener("keydown", this.onKeyPress.bind(this));
        StellarEventManager_1.default.addEventListener(InterstellarEvents_1.ChatMessageSendEvent, this.onMessageSend.bind(this));
        StellarEventManager_1.default.addEventListener(InterstellarEvents_1.ChatCloseEvent, this.onChatClose.bind(this));
        this.load();
    }
    load() {
        let data = localStorage.getItem("isqol-keybinds");
        if (data) {
            this.keybinds = JSON.parse(data);
        }
    }
    onChatClose(event) {
        this.settingCommand = null;
    }
    onMessageSend(event) {
        if (!this.settingCommand)
            return;
        event.cancelEvent();
        if (event.msg.startsWith("/"))
            event.msg = event.msg.slice(1);
        this.settingCommand.command = event.msg;
        this.settingCommand = null;
        this.save();
        StellarAPI_1.default.UI.toggleUI("isqol-keybinds");
    }
    closeMenu() {
        this.settingKey = null;
    }
    onKeyPress(event) {
        if (this.settingKey) {
            event.preventDefault();
            const key = event.code;
            if (blacklistedKeys.includes(key))
                return;
            this.settingKey[0].innerHTML = key;
            this.settingKey[1].key = key;
            this.settingKey = null;
            this.save();
            return;
        }
        if (event.repeat || document.activeElement != document.body)
            return;
        const control = event.ctrlKey;
        const shift = event.shiftKey;
        const alt = event.altKey;
        const code = event.code;
        this.keybinds.forEach((keybind) => {
            if ((!keybind.disabled && keybind.alt == alt && keybind.shift == shift && keybind.control == control && keybind.key == code)) {
                console.log("Executing Keybind", keybind);
                let result = StellarCommandsManager_1.default.executeCommand("/" + keybind.command);
                if (result)
                    StellarAPI_1.default.sendPacket({ type: StellarAPI_1.default.Packet.ClMsgChat, msg: result });
                event.preventDefault();
            }
        });
    }
    editKey(target, data) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("Editing key");
            this.settingKey = [target, data];
            target.innerHTML = "> <";
        });
    }
    editCommand(target, data) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("Editing command");
            __1.default.logMessage("Please type the full command you want to execute when using this keybind:");
            StellarAPI_1.default.UI.toggleUI();
            StellarAPI_1.default.UI.openChat();
            StellarAPI_1.default.UI.getChatInputElement().value = "/";
            StellarCommandsManager_1.default.chatChanged("/");
            this.settingCommand = data;
        });
    }
    save() {
        const copy = [...this.keybinds].filter(k => k.command != "CHANGE ME");
        localStorage.setItem("isqol-keybinds", JSON.stringify(copy));
    }
}
exports.default = new Keybinds();
