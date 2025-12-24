import { ChatCloseEvent, ChatMessageSendEvent } from "@interstellar/InterstellarEvents"
import StellarAPI from "@interstellar/StellarAPI"
import StellarCommandsManager from "@interstellar/StellarCommandsManager"
import StellarEventManager from "@interstellar/StellarEventManager"
import InterstellarQOL from ".."
import { triangulateWithHoles } from "pixi.js"

export interface Keybind {
    disabled: boolean,
    shift: boolean
    control: boolean
    alt: boolean

    key: string
    command: string
}

export const DEFAULT_KEYBINDS: Keybind[] = [
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
]

const blacklistedKeys = [
    "ShiftLeft", "ShiftRight", "AltLeft", "AltRight", "ControlLeft", "ControlRight"
]
class Keybinds {
    EMPTY_KEYBIND = {
                    disabled: false,
                    shift: false,
                    control: false,
                    alt: false,
                    key: "None",
                    command: "CHANGE ME"
                }
    keybinds: Keybind[] = DEFAULT_KEYBINDS;

    settingCommand: Keybind | null = null;
    settingKey: [HTMLAnchorElement, Keybind] | null = null;
    constructor() {
        window.addEventListener("keydown", this.onKeyPress.bind(this));
        StellarEventManager.addEventListener(ChatMessageSendEvent, this.onMessageSend.bind(this));
        StellarEventManager.addEventListener(ChatCloseEvent, this.onChatClose.bind(this));
        this.load();
    }
    load() {
        let data = localStorage.getItem("isqol-keybinds");
        if (data) {
            this.keybinds = JSON.parse(data);
        }
    }
    onChatClose(event: ChatCloseEvent) {
        this.settingCommand = null;
    }
    onMessageSend(event: ChatMessageSendEvent) {
        if (!this.settingCommand) return;
        event.cancelEvent();
        if (event.msg.startsWith("/")) event.msg = event.msg.slice(1);
        this.settingCommand.command = event.msg;
        this.settingCommand = null;
        this.save();
        StellarAPI.UI.toggleUI("isqol-keybinds");
    }
    closeMenu() {
        this.settingKey = null;
    }
    onKeyPress(event: KeyboardEvent) {
        if (this.settingKey) {
            event.preventDefault();
            const key = event.code;
            if (blacklistedKeys.includes(key)) return;
            this.settingKey[0].innerHTML = key;
            this.settingKey[1].key = key;
            this.settingKey = null;
            this.save();
            return;
        }
        if (event.repeat || document.activeElement != document.body) return;
        const control = event.ctrlKey;
        const shift = event.shiftKey;
        const alt = event.altKey;
        const code = event.code;
        this.keybinds.forEach((keybind) => {
            if ((!keybind.disabled && keybind.alt == alt && keybind.shift == shift && keybind.control == control && keybind.key == code)) {
                console.log("Executing Keybind", keybind);
                let result = StellarCommandsManager.executeCommand("/" + keybind.command);
                if (result) StellarAPI.sendPacket({type: StellarAPI.Packet.ClMsgChat, msg: result});
                event.preventDefault();
            }
        })
    }
    async editKey(target: HTMLAnchorElement, data: Keybind) {
        console.log("Editing key");
        this.settingKey = [target, data];
        target.innerHTML = "> <";
    }
    async editCommand(target: HTMLAnchorElement, data: Keybind) {
        console.log("Editing command");
        InterstellarQOL.logMessage("Please type the full command you want to execute when using this keybind:");
        StellarAPI.UI.toggleUI();
        StellarAPI.UI.openChat();
        StellarAPI.UI.getChatInputElement().value = "/";
        StellarCommandsManager.chatChanged("/");
        this.settingCommand = data;
    }
    save() {
        const copy = [...this.keybinds].filter(k => k.command != "CHANGE ME" );
        localStorage.setItem("isqol-keybinds", JSON.stringify(copy));
    }
}

export default new Keybinds();