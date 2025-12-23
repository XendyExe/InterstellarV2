import { Component, VNode } from "preact";
import StellarEventManager from "./StellarEventManager";
import Interstellar from "../Interstellar";
import { PlayerListEntry } from "./Utils";

export enum TriggerEvent {
    FRAME_START,
    FRAME_END,
    LOAD,
    CONSTANT_TICK
}

export abstract class BaseEvent {
    dispatch() {
        StellarEventManager.dispatchEvent(this);
    }
}

export abstract class UIEvent extends BaseEvent {
    node: VNode
    component: Component
    constructor(component: Component, elm: VNode) {
        super();
        this.component = component;
        this.node = elm;
    }
}

export abstract class CancelableEvent extends BaseEvent{
    private canceled = false;
    cancelEvent() {
        this.canceled = true;
    }

    isCanceled() {
        return this.canceled;
    }
}

export class SocketOpenEvent extends BaseEvent {
    socket: WebSocket;
    constructor(ws: WebSocket) {
        super();
        this.socket = ws;
    }
}
export class SocketMessageRecieveEvent extends CancelableEvent {
    message: any;
    constructor(m: any) {
        super();
        this.message = m;
    }
}
export class SocketMessageSendEvent extends CancelableEvent {
    message: any;
    constructor(m: any) {
        super();
        this.message = m;
    }
}
export class SocketCloseEvent extends BaseEvent {
    socket: WebSocket;
    constructor(ws: WebSocket) {
        super();
        this.socket = ws;
    }
}

export class ChatMessageRecieveEvent extends CancelableEvent {
    static parser = new DOMParser();
    raw: any;
    packet: any;
    constructor(raw: any, p: any) {
        super();
        this.raw = raw;
        this.packet = p;
    }

    getText(): string { 
        return ChatMessageRecieveEvent.parser.parseFromString(this.getHTML(), "text/html").body.textContent;
    }

    getHTML(): string {
        return Interstellar.patcher.textformatter.formatText(this.raw);
    }
}

export class ChatMessageSendEvent extends CancelableEvent {
    msg: string
    constructor(msg: string) {
        super();
        this.msg = msg;
    }
}

export class JoinShipEvent extends BaseEvent {
    name: string
    hex: string
    constructor(n: string, h: string) {
        super();
        this.name = n
        this.hex = h;
    }
}

export class JoinShipRequestEvent extends CancelableEvent {
    server: number | null;
    data: any;
    constructor(s: number | null, d: any) {
        super();
        this.server = s;
        this.data = d;
    }
}

export class InventoryChangeEvent extends BaseEvent {
    oldInventory: (number | null)[];
    inventory: (number | null)[];
    inventoryState: any;
    
    constructor(o: (number | null)[], i: (number | null)[], s: any) {
        super();
        this.oldInventory = o;
        this.inventory = i;
        this.inventoryState = s; 
    }
}

export class CrewListUpdateEvent extends BaseEvent {
    list: PlayerListEntry[];
    playerList: Record<string, PlayerListEntry> = {};
    constructor(c: any[]) {
        super();
        this.list = c;
        this.list.forEach(elm => this.playerList[elm.discrim.toLowerCase()] = elm);
    }
}

export class ChatCloseEvent extends BaseEvent{}

export class RenderSettingsEvent extends UIEvent {
    accountSettings: VNode = (this.node.props.children as VNode[])[2]!!;
    audioSettings: VNode = (this.node.props.children as VNode[])[3]!!;
    gameplaySettings: VNode = (this.node.props.children as VNode[])[4]!!;
    displaySettings: VNode = (this.node.props.children as VNode[])[5]!!;
    inputSettings: VNode = (this.node.props.children as VNode[])[6]!!;
}

export class RenderCrewListEvent extends UIEvent {}
export class RenderCrewControlEvent extends UIEvent {}
export class RenderShipSettingsEvent extends UIEvent {}
export class RenderLauncherPUIEvent extends UIEvent {}
export class RenderSignPUIEvent extends UIEvent {}
export class RenderCraftingPUIEvent extends UIEvent {}
export class RenderBlueprintPUIEvent extends UIEvent {}

export class RenderBigShipEntryEvent extends UIEvent {}
export class RenderSmallShipEntryEvent extends UIEvent {}
export class RenderShiplistSidebarEvent extends UIEvent {}
export class RenderShiplistAdSlotEvent extends UIEvent {}

export class ProcessMOTDEvent extends BaseEvent {
    motd: string;
    constructor(d: string) {
        super();
        this.motd = d;
    }
}

export class RenderInventoryEvent extends UIEvent {}

export function createEventExports() {
    const exports: Record<string, any> = {};
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SocketOpenEvent = SocketOpenEvent;
    exports.SocketMessageRecieveEvent = SocketMessageRecieveEvent;
    exports.SocketMessageSendEvent = SocketMessageSendEvent;
    exports.SocketCloseEvent = SocketCloseEvent;
    exports.JoinShipRequestEvent = JoinShipRequestEvent;
    exports.JoinShipEvent = JoinShipEvent;
    exports.TriggerEvent = TriggerEvent;
    exports.CrewListUpdateEvent = CrewListUpdateEvent;
    exports.ChatMessageSendEvent = ChatMessageSendEvent;
    exports.ChatMessageRecieveEvent = ChatMessageRecieveEvent;
    exports.ChatCloseEvent = ChatCloseEvent;

    exports.RenderSettingsEvent = RenderSettingsEvent;
    exports.RenderCrewListEvent = RenderCrewListEvent;
    exports.RenderCrewControlEvent = RenderCrewControlEvent;
    exports.RenderShipSettingsEvent = RenderShipSettingsEvent;
    exports.RenderShiplistSidebarEvent = RenderShiplistSidebarEvent;
    exports.RenderBigShipEntryEvent = RenderBigShipEntryEvent;
    exports.RenderSmallShipEntryEvent = RenderSmallShipEntryEvent;
    exports.RenderLauncherPUIEvent = RenderLauncherPUIEvent;
    exports.RenderSignPUIEvent = RenderSignPUIEvent;
    exports.RenderCraftingPUIEvent = RenderCraftingPUIEvent;
    exports.RenderBlueprintPUIEvent = RenderBlueprintPUIEvent;
    exports.RenderShiplistAdSlotEvent = RenderShiplistAdSlotEvent;
    exports.ProcessMOTDEvent = ProcessMOTDEvent;

    exports.RenderInventoryEvent = RenderInventoryEvent;
    exports.InventoryChangeEvent = InventoryChangeEvent;
    return exports;
}