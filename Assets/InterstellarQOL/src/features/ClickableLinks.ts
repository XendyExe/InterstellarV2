import { ChatMessageRecieveEvent, ProcessMOTDEvent } from "@interstellar/InterstellarEvents";
import StellarAPI from "@interstellar/StellarAPI";
import StellarEventManager from "@interstellar/StellarEventManager";


const linkRegex = /(\bhttps?:\/\/[^\s<>"']+)/gi
export default class ClickableLinks {
    constructor() {
        StellarEventManager.addEventListener(ChatMessageRecieveEvent, this.onChat.bind(this));
        StellarEventManager.addEventListener(ProcessMOTDEvent, this.onRenderMOTD.bind(this));
    }

    onChat(event: ChatMessageRecieveEvent) {
        event.raw = this.processChat(event.raw);
    }

    processChat(data: any): any {
        if (typeof data === "string") {
            let match;
            const splits = data.split(linkRegex).filter(elm => elm != "");
            if (splits.length == 0) return data;
            else if (splits.length == 1) {
                if (match = data.match(linkRegex)) return {
                            t: `a href=${data} target="_blank" rel="noopener noreferrer" style='color: var(--dark-links)'`,
                            c: data
                        };
                return data;
            }
            else {
                return splits.map(elm => {
                    if (match = elm.match(linkRegex)) return {
                            t: `a href=${elm} target="_blank" rel="noopener noreferrer" style='color: var(--dark-links)'`,
                            c: elm
                        };
                    else return elm;
                })
            }
        }
        if (Array.isArray(data)) return data.map(this.processChat.bind(this));

        if (data && typeof data === "object") {
            data.c = this.processChat(data.c);
        }
        return data;
    }

    onRenderMOTD(event: ProcessMOTDEvent) {
        event.motd = event.motd.replace(/(https?:\/\/[^\s]+)/g, '<a style="color: var(--dark-links)" href="$1" target="_blank">$1</a>')
    }
}