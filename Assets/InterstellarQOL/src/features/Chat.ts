import {SocketMessageRecieveEvent, WriteChatEvent} from "@interstellar/InterstellarEvents";
import StellarEventManager from "@interstellar/StellarEventManager";
import InterstellarQOL from "../index";
import StellarCommandManager, {
    BaseCommand,
    OptionsArgument,
    PlayerArgument
} from "@interstellar/StellarCommandsManager";
import StellarAPI from "@interstellar/StellarAPI";

const GOOGLE_TRANSLATE = "<svg xmlns=\"http://www.w3.org/2000/svg\" width='12px' height='12px' x=\"0\" y=\"0\" viewBox=\"0 0 998.1 998.3\" xml:space=\"preserve\">\n" +
    "  <path fill=\"#DBDBDB\" d=\"M931.7 998.3c36.5 0 66.4-29.4 66.4-65.4V265.8c0-36-29.9-65.4-66.4-65.4H283.6l260.1 797.9h388z\"/>\n" +
    "  <path fill=\"#DCDCDC\" d=\"M931.7 230.4c9.7 0 18.9 3.8 25.8 10.6 6.8 6.7 10.6 15.5 10.6 24.8v667.1c0 9.3-3.7 18.1-10.6 24.8-6.9 6.8-16.1 10.6-25.8 10.6H565.5L324.9 230.4h606.8m0-30H283.6l260.1 797.9h388c36.5 0 66.4-29.4 66.4-65.4V265.8c0-36-29.9-65.4-66.4-65.4z\"/>\n" +
    "  <polygon fill=\"#4352B8\" points=\"482.3,809.8 543.7,998.3 714.4,809.8\"/>\n" +
    "  <path fill=\"#607988\" d=\"M936.1 476.1V437H747.6v-63.2h-61.2V437H566.1v39.1h239.4c-12.8 45.1-41.1 87.7-68.7 120.8-48.9-57.9-49.1-76.7-49.1-76.7h-50.8s2.1 28.2 70.7 108.6c-22.3 22.8-39.2 36.3-39.2 36.3l15.6 48.8s23.6-20.3 53.1-51.6c29.6 32.1 67.8 70.7 117.2 116.7l32.1-32.1c-52.9-48-91.7-86.1-120.2-116.7 38.2-45.2 77-102.1 85.2-154.2H936v.1z\"/>\n" +
    "  <path fill=\"#4285F4\" d=\"M66.4 0C29.9 0 0 29.9 0 66.5v677c0 36.5 29.9 66.4 66.4 66.4h648.1L454.4 0h-388z\"/>\n" +
    "  <linearGradient id=\"a\" gradientUnits=\"userSpaceOnUse\" x1=\"534.3\" y1=\"433.2\" x2=\"998.1\" y2=\"433.2\">\n" +
    "    <stop offset=\"0\" stop-color=\"#fff\" stop-opacity=\".2\"/>\n" +
    "    <stop offset=\"1\" stop-color=\"#fff\" stop-opacity=\".02\"/>\n" +
    "  </linearGradient>\n" +
    "  <path fill=\"url(#a)\" d=\"M534.3 200.4h397.4c36.5 0 66.4 29.4 66.4 65.4V666L534.3 200.4z\"/>\n" +
    "  <path fill=\"#EEEEEE\" d=\"M371.4 430.6c-2.5 30.3-28.4 75.2-91.1 75.2-54.3 0-98.3-44.9-98.3-100.2s44-100.2 98.3-100.2c30.9 0 51.5 13.4 63.3 24.3l41.2-39.6c-27.1-25-62.4-40.6-104.5-40.6-86.1 0-156 69.9-156 156s69.9 156 156 156c90.2 0 149.8-63.3 149.8-152.6 0-12.8-1.6-22.2-3.7-31.8h-146v53.4l91 .1z\"/>\n" +
    "  <radialGradient id=\"b\" cx=\"65.208\" cy=\"19.366\" r=\"1398.271\" gradientUnits=\"userSpaceOnUse\">\n" +
    "    <stop offset=\"0\" stop-color=\"#fff\" stop-opacity=\".1\"/>\n" +
    "    <stop offset=\"1\" stop-color=\"#fff\" stop-opacity=\"0\"/>\n" +
    "  </radialGradient>\n" +
    "  <path fill=\"url(#b)\" d=\"M931.7 200.4H518.8L454.4 0h-388C29.9 0 0 29.9 0 66.5v677c0 36.5 29.9 66.4 66.4 66.4h415.9l61.4 188.4h388c36.5 0 66.4-29.4 66.4-65.4V265.8c0-36-29.9-65.4-66.4-65.4z\"/>\n" +
    "</svg>";

interface ChatEntry {
    html: string;
    element: HTMLParagraphElement;
    chatContent: HTMLSpanElement;
    translatedChatContent: HTMLSpanElement;
    count: number;
    countElement: HTMLSpanElement;
    lastEditTime: number;
    recentTimeout: number;
    translate: Promise<void> | null;
    showingTranslated: boolean;
    blockContainer: HTMLDivElement | null;
}
class Chat {
    autotranslate: boolean = localStorage.getItem("isqol-autotrans") === "true";
    translatecode: string = localStorage.getItem("isqol-translatecode") ?? "en";
    lastBlockContainer: HTMLDivElement | null = null;

    private _chatContent = document.getElementById("chat-content")!!;
    private chat: ChatEntry[] = [];
    private translateAll: HTMLButtonElement = document.createElement("button");
    private tabbedOut: ChatEntry[] = [];
    constructor() {
        StellarEventManager.addEventListener(WriteChatEvent, this.onDrednotWriteChat.bind(this));
        StellarEventManager.addEventListener(SocketMessageRecieveEvent, this.onPacket.bind(this));
        StellarCommandManager.registerCommand(new MuteCommand());
        StellarCommandManager.registerCommand(new UnmuteCommand());
        StellarCommandManager.registerCommand(new ListmuteCommand());
        const style = document.createElement("style");

        style.textContent = `
            .isqol-chat-count {
                padding-left: 4px;
                opacity: 50%;
            }
            .chat-actions {
                position: absolute;
                top: 0px;
                right: 0px;
            
                display: flex;
                gap: 6px;
            
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.15s ease;
            }
            
            .chat-message:hover .chat-actions {
                opacity: 1;
                pointer-events: auto;
            }
            
            .chat-actions button {
                font-size: 12px;
                padding: 2px 6px;
                cursor: pointer;
            }
            
            .chat-message {
                position: relative;
                display: block;
            }
            
            .isqol-trans-icon {
                top: 2px;
                right: 4px;
            }
            #chat.closed #chat-content .blocked-opener {
                display: none !important;
            }
            
            .blocked-opener {
                font-size: 12px;
                width: 100%;
                display: flex;
                justify-content: center;
                opacity: 0.75;
                text-decoration: underline;
            }
            
            .blocked-container {
                background-color: #00000088;
            }
            #chat.closed #chat-content p.recent {
                overflow: auto;
            }
        `;

        document.head.appendChild(style);

        this.translateAll.innerHTML = "Translate All";
        this.translateAll.onclick = () => {
            if (this.autotranslate) {
                this.translateAll.innerHTML = "Translate All";
                this.autotranslate = false;
                localStorage.setItem("isqol-autotrans", this.autotranslate ? "true" : "false")
                for (let i = this.chat.length - 1; i >= 0; i--) {
                    let message = this.chat[i]!!;
                    if (message.showingTranslated) {
                        message.showingTranslated = false;
                        message.chatContent.style.display = "";
                        message.translatedChatContent.style.display = "none";
                    }
                }
            } else {
                this.translateAll.innerHTML = "Untranslate All";
                this.autotranslate = true;
                localStorage.setItem("isqol-autotrans", this.autotranslate ? "true" : "false")
                for (let i = this.chat.length - 1; i >= 0; i--) {
                    let message = this.chat[i]!!;
                    if (!message.showingTranslated) {
                        this.translateEntry(message);
                        message.showingTranslated = true;
                        message.chatContent.style.display = "none";
                        message.translatedChatContent.style.display = "";
                    }
                }
            }
        }
        document.querySelector("#chat-send")!!.after(this.translateAll);

        window.addEventListener("focus", this.onFocus.bind(this));
    }

    onPacket(event: SocketMessageRecieveEvent) {
        if (event.message.type == StellarAPI.Packet.SvMsgChat) {
            if (event.message.bubble && event.message.text.length == 2) {
                let t = event.message.text[0].c;
                if (t[1] && t[1] == ": ") {
                    t = t[0];
                    for (let elm of t) {
                        if (elm.t && elm.t.startsWith("bdi")) {
                            let user = elm.c;
                            if (Chat.getBlockedList().includes(user.toLowerCase())) {
                                event.message.bubble = null;
                            }
                            break;
                        }
                    }
                }
            }
        }
    }

    onFocus() {
        const entries = [...this.tabbedOut];
        this.tabbedOut.length = 0;
        for (let entry of entries) {
            entry.element.classList.remove("recent");
            this.makeRecent(entry);
            setTimeout(() => {
                entry.element.style.backgroundColor = "";
            }, 20000);
        }
    }

    onDrednotWriteChat(event: WriteChatEvent) {
        event.cancelEvent();
        this.writeChatInnerHTML(event.html);
    }

    writeChatInnerHTML(message: string) {
        let time = Date.now();
        for (let i = this.chat.length - 1; i >= 0; i--) {
            let entry = this.chat[i]!
            if (time - entry.lastEditTime > 10000) { break; };
            if (entry.html === message) {
                this.incrementMessageCount(entry);
                this.chat.splice(i, 1);
                this.chat.push(entry);
                if (entry.blockContainer != null) {
                    if (entry.blockContainer.children.length == 1) {
                        this._chatContent.removeChild(entry.blockContainer.parentElement!!);
                    } else {
                        entry.blockContainer.removeChild(entry.element);
                    }
                    this.pushIntoBlockContainer(entry);
                }
                return;
            }
        }
        let chatElement = document.createElement("p");
        chatElement.classList.add("chat-message");
        let messageContainer: HTMLSpanElement = document.createElement("span");
        let translateContainer: HTMLSpanElement = document.createElement("span");
        let countContainer: HTMLSpanElement = document.createElement("span");
        let actions = document.createElement("div");
        actions.classList.add("chat-actions");
        let btn1 = document.createElement("button");
        btn1.innerHTML = GOOGLE_TRANSLATE;
        actions.appendChild(btn1);
        chatElement.appendChild(actions);
        countContainer.classList.add("isqol-chat-count");
        chatElement.appendChild(messageContainer);
        chatElement.appendChild(translateContainer);
        chatElement.appendChild(countContainer);
        translateContainer.innerText = "Translating..."
        translateContainer.style.display = "none";
        messageContainer.innerHTML = message;
        let entry: ChatEntry = {
            html: message,
            element: chatElement,
            chatContent: messageContainer,
            translatedChatContent: translateContainer,
            count: 1,
            countElement: countContainer,
            lastEditTime: time,
            recentTimeout: 0,
            translate: null,
            showingTranslated: false,
            blockContainer: null
        }
        btn1.onclick = () => {
            this.translateEntry(entry);
            if (entry.showingTranslated) {
                entry.translatedChatContent.style.display = "none";
                entry.chatContent.style.display = "";
                entry.showingTranslated = false;
            } else {
                entry.chatContent.style.display = "none";
                entry.translatedChatContent.style.display = "";
                entry.showingTranslated = true;
            }
        }

        if (this.autotranslate) {
            entry.chatContent.style.display = "none";
            entry.translatedChatContent.style.display = "";
            entry.showingTranslated = true;
            this.translateEntry(entry);
        }

        const wasAtBottom = this._chatContent.scrollHeight - this._chatContent.clientHeight <= this._chatContent.scrollTop + 1;
        this.chat.push(entry)
        if (messageContainer.childNodes.length == 2) {
            let user = null;
            let firstChild = messageContainer.children[0]!!;
            if (firstChild.tagName == "B") {
                for (let child of firstChild.children) {
                    if (child.tagName == "BDI" && isPlayerName(child)) {
                        user = child.innerHTML;
                    }
                }
            }
            if (user != null && Chat.getBlockedList().includes(user.toLowerCase())) {
                return this.pushIntoBlockContainer(entry);
            }
        }
        this.lastBlockContainer = null;
        this.makeRecent(entry);
        this._chatContent.appendChild(chatElement);
        if (wasAtBottom) {
            this._chatContent.scrollTop = this._chatContent.scrollHeight - this._chatContent.clientHeight;
        }
    }

    incrementMessageCount(entry: ChatEntry) {
        entry.count += 1;
        entry.countElement.innerText = `(x${entry.count})`;
        entry.lastEditTime = Date.now();
        if (entry.recentTimeout != 0) clearTimeout(entry.recentTimeout);
        if (entry.blockContainer === null) {
            const wasAtBottom = this._chatContent.scrollHeight - this._chatContent.clientHeight <= this._chatContent.scrollTop + 1;
            this.makeRecent(entry);
            this._chatContent.appendChild(entry.element);
            if (wasAtBottom) {
                this._chatContent.scrollTop = this._chatContent.scrollHeight - this._chatContent.clientHeight;
            }
        }
    }

    makeRecent(entry: ChatEntry) {
        if (document.visibilityState == "hidden") {
            entry.element.classList.add("recent");
            entry.element.style.backgroundColor = "#4d1616";
            this.tabbedOut.push(entry);
        } else {
            entry.element.classList.add("recent");
            entry.recentTimeout = setTimeout(() => {
                entry.element.classList.remove("recent");
                entry.recentTimeout = 0;
            }, 10000)
        }
    }


    translateEntry(entry: ChatEntry) {
        if (entry.translate !== null) return;
        entry.translate = (async () => {
            const clone = entry.chatContent.cloneNode(true);

            const walker = document.createTreeWalker(
                clone,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: (node) => {
                        const parent = node.parentElement;
                        if (!parent) {
                            return NodeFilter.FILTER_REJECT;
                        }

                        if (parent.closest(".user-badge-small")) {
                            return NodeFilter.FILTER_REJECT;
                        }

                        if (
                            parent.tagName === "BDI" &&
                            isPlayerName(parent)
                        ) {
                            return NodeFilter.FILTER_REJECT;
                        }

                        return NodeFilter.FILTER_ACCEPT;
                    }
                }
            );

            let tasks: Promise<void>[] = [];
            let textNode;

            while ((textNode = walker.nextNode())) {
                const node = textNode;

                tasks.push((async () => {
                    node.textContent = await this.translate(node.textContent!!);
                })());
            }
            try {
                await Promise.all(tasks);
            } catch (error) {
                console.error(error);
                (clone as HTMLElement).innerHTML = "Failed to translate: check console!";
            }
            (clone as HTMLSpanElement).style.cssText = entry.translatedChatContent.style.cssText;
            (clone as HTMLElement).innerHTML = "<svg class=\"isqol-trans-icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"12px\" height=\"12px\" viewBox=\"3.8 3.8 17.4 17.4\" fill=\"none\">\n" +
                "<path d=\"M5.5 16.5H19.5M5.5 8.5H19.5M4.5 12.5H20.5M12.5 20.5C12.5 20.5 8 18.5 8 12.5C8 6.5 12.5 4.5 12.5 4.5M12.5 4.5C12.5 4.5 17 6.5 17 12.5C17 18.5 12.5 20.5 12.5 20.5M12.5 4.5V20.5M20.5 12.5C20.5 16.9183 16.9183 20.5 12.5 20.5C8.08172 20.5 4.5 16.9183 4.5 12.5C4.5 8.08172 8.08172 4.5 12.5 4.5C16.9183 4.5 20.5 8.08172 20.5 12.5Z\" stroke=\"white\" stroke-width=\"1.2\"/>\n" +
                "</svg>" + (clone as HTMLElement).innerHTML;
            entry.element.replaceChild(clone, entry.translatedChatContent);
            entry.translatedChatContent = clone as HTMLSpanElement;

        })();
    }

    private cache: Map<string, string> = new Map<string, string>();
    private async translate(text: string): Promise<string> {
        return this.cache.get(text) ?? await this.fetchTranslate(text);
    }

    private async fetchTranslate(text: string): Promise<string> {
        let endsWithSpace = text.endsWith(" ");
        let startsWithSpace = text.startsWith(" ");
        text = text.trim()
        let endsWithBracket = text.endsWith("[");
        if (endsWithBracket) {
            text = text.slice(0, -1);
        }
        let request = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${this.translatecode}&dt=t&q=${encodeURIComponent(text)}`);
        let json = await request.json();
        if (!json[0]) throw new Error("Failed to translate: Result json is " + JSON.stringify(json));
        let result = json[0].map((subarray: string[])=> subarray[0]).join('\n');
        if (endsWithBracket) {
            result += "[";
        }
        if (endsWithSpace) {
            result += " ";
        }
        if (startsWithSpace) {
            result = " " + result;
        }
        this.cache.set(text, result);
        return result;
    }

    swapTranslateCode() {
        this.cache.clear();
        for (let message of this.chat) {
            message.translate = null;
            message.translatedChatContent.innerHTML = "Translating...";
            if (message.showingTranslated) {
                this.translateEntry(message);
            }
        }
    }

    static getBlockedList(): string[] {
        try {
            return JSON.parse(localStorage.getItem("isqol-blocked") ?? "[]")
        } catch (e) {
            return [];
        }
    }

    pushIntoBlockContainer(entry: ChatEntry) {
        if (this.lastBlockContainer === null) {
            let container = document.createElement("div");
            let blockContainer = document.createElement("div");
            blockContainer.style.display = "none";
            let opener = document.createElement("a");
            opener.innerHTML = `- 1 muted message(s) -`
            opener.classList.add("blocked-opener");
            blockContainer.classList.add("blocked-container");
            opener.onclick = () => {
                blockContainer.style.display = blockContainer.style.display == "none" ? "" : "none";
            }
            container.appendChild(opener);
            container.appendChild(blockContainer);
            blockContainer.appendChild(entry.element);
            this.lastBlockContainer = blockContainer;
            this._chatContent.appendChild(container);
            entry.blockContainer = blockContainer;
        } else {
            this.lastBlockContainer.appendChild(entry.element);
            this.lastBlockContainer.parentElement!!.children[0]!!.innerHTML = `- ${this.lastBlockContainer.children.length} muted message(s) -`;
            entry.blockContainer = this.lastBlockContainer;
        }
    }
}

const SKIP_SUFFIXES = [
    ": ",
    " joined the ship.",
    " was kicked from the ship by",
    " was banned from the ship by",
    " was un-banned from the ship by",
    " left the ship.",
    " was demoted to Guest by",
    " was demoted to Crew by",
    " was promoted to Crew by",
    " was promoted to Captain by",
    "."
];
function isPlayerName(bdi: Element): boolean {
    let sibling = nextMeaningfulSibling(bdi);

    if (!sibling) return false;

    if (
        sibling instanceof HTMLElement &&
        sibling.classList.contains("user-badge-small")
    ) {
        return true;
    }

    if (sibling.nodeType === Node.TEXT_NODE) {
        const text = sibling.textContent ?? "";
        return SKIP_SUFFIXES.some(suffix =>
            text.startsWith(suffix)
        );
    }

    return false;
}

function nextMeaningfulSibling(node: Node): Node | null {
    let current = node.nextSibling;

    while (current) {
        if (
            current.nodeType === Node.TEXT_NODE &&
            current.textContent?.trim() === ""
        ) {
            current = current.nextSibling;
            continue;
        }

        return current;
    }

    return null;
}


class MuteCommand extends BaseCommand {
    name = "mute"
    alias = []
    testOnly = false;
    arguments = [new PlayerArgument("player")];
    execute(player: string) {
        player = player.toLowerCase().trim();
        if (player == "" || player.length < 3 || player.length > 20) {
            InterstellarQOL.logMessage(`Invalid player to mute: "${player}"`)
            return;
        }
        let blocked = Chat.getBlockedList();
        blocked.push(player);
        localStorage.setItem("isqol-blocked", JSON.stringify(blocked));
        InterstellarQOL.logMessage(`Muted \"${player}\"`);
    }
}

class UnmuteCommand extends BaseCommand {
    name = "unmute"
    alias = []
    testOnly = false;
    arguments = [new OptionsArgument("options", new Proxy([], {
            get(target, prop) {
                const list = Chat.getBlockedList();
                if (prop === "length") return list.length;
                // @ts-ignore
                if (typeof list[prop] === "function") {
                    // @ts-ignore
                    return list[prop].bind(list);
                }
                // @ts-ignore
                return list[prop];
            },
            set() {
                throw new Error("This list is read-only");
            },

            deleteProperty() {
                throw new Error("This list is read-only");
            }
        }),
        [],
        true
    )]
    execute(player: string) {
        let blocked = Chat.getBlockedList();
        let index = blocked.indexOf(player);
        if (index > -1) {
            blocked.splice(index, 1);
            InterstellarQOL.logMessage(`Unmuted "${player}"`)
            localStorage.setItem("isqol-blocked", JSON.stringify(blocked));
        } else {
            InterstellarQOL.logMessage(`"${player}" is not muted.`)
        }
    }
}

class ListmuteCommand extends BaseCommand {
    name = "listmute"
    alias = ["mutelist"]
    testOnly = false;
    arguments = [];
    execute() {
        let blocked = Chat.getBlockedList();
        InterstellarQOL.logMessage("Muted users:")
        for (let block of blocked) {
            InterstellarQOL.logMessage(`- ${block}`)
        }
    }
}

export default new Chat();