import { VNode } from "preact";
import Interstellar from "../Interstellar";
import { CurrentShipData, PlayerListEntry } from "./Utils";
import StellarCommandsManager from "./StellarCommandsManager";

class InterstellarUIAPI {
    settingModels: Record<string, VNode> = {};
    showPrompt(title: string, description: string, callback: Function) {
        Interstellar.patcher.promptManager.openPrompt(title, description, callback);
    }
    openPromptEx(title: string, msg: string, type: any, callback: Function, fail_callback: Function) {
        Interstellar.patcher.promptManager.openPromptEx(title, msg, type, callback, fail_callback);
    }
    openPromptConfirm(title: string, description: string, callback: Function) {
        Interstellar.patcher.promptManager.openPromptConfirm(title, description, callback);
    }

    openModal(model: VNode, error=false, unclosable=false) {
        Interstellar.patcher.promptManager.openModal(model, error, unclosable);
    }
    closeModel() {
        Interstellar.patcher.promptManager.closeModal();
    }

    registerSettingsModel(name: string, model: VNode) {
        this.settingModels[name] = model;
    }

    preactAppendChild(parent: VNode, node: VNode) {
        const children = this.preactNormalizeChildren(parent.props.children);
        children.push(node);
        parent.props.children = children;
    }
    preactInsertBefore(parent: VNode, referenceNode: VNode, node: VNode) {
        const children = this.preactNormalizeChildren(parent.props.children);

        const index = children.indexOf(referenceNode);
        if (index === -1) {
            throw new Error('referenceNode is not a child of parent');
        }

        children.splice(index, 0, node);
        parent.props.children = children;
    }
    preactInsertAfter(parent: VNode, referenceNode: VNode, node: VNode) {
        const children = this.preactNormalizeChildren(parent.props.children);

        const index = children.indexOf(referenceNode);
        if (index === -1) {
            throw new Error('referenceNode is not a child of parent');
        }

        children.splice(index + 1, 0, node);
        parent.props.children = children;
    }
    preactPrependChild(parent: VNode, node: VNode) {
        const children = this.preactNormalizeChildren(parent.props.children);
        children.unshift(node);
        parent.props.children = children;
    }
    preactGetChildWithID(vnode: VNode, id: string): VNode | null {
        // @ts-ignore
        if (vnode.props && vnode.props.id === id) {
            return vnode;
        }
        const children = vnode.props?.children;
        if (!children) return null;
        const childArray = Array.isArray(children) ? children : [children];

        for (const child of childArray) {
            if (child && typeof child === 'object') {
                const found = this.preactGetChildWithID(child as VNode, id);
                if (found) return found;
            }
        }
        return null;
    }

    preactNormalizeChildren(children: any): VNode[] {
        if (children == null) return [];
        return Array.isArray(children) ? children : [children];
    }


    toggleUI(model?: string){
        // @ts-ignore
        window.toggleUI(model);
    }

    openChat() { Interstellar.patcher.htmluifunctions.openChat(); }
    closeChat() { Interstellar.patcher.htmluifunctions.closeChat(); }
    writeChat(innerHTML: string) { Interstellar.patcher.htmluifunctions.writeChat(innerHTML); } 
    getChatInputElement(): HTMLInputElement {
        return StellarCommandsManager.chatInputElement;
    }
    isChatInputFocused(): boolean {
        return document.activeElement == this.getChatInputElement();
    }
}

class InterstellarInputAPI {
    keyDown(keyCode: string): boolean {
        return Interstellar.patcher.inputManager.input.input.key_down(keyCode);
    }
    keyPressed(keyCode: string): boolean {
        return Interstellar.patcher.inputManager.input.input.key_pressed(keyCode);
    }
    keyPressedFrame(keyCode: string): boolean {
        return Interstellar.patcher.inputManager.input.input.key_pressed_frame(keyCode);
    }
    mouseX(): number {
        return Interstellar.patcher.inputManager.input.input.mouse_x();
    }
    mouseY(): number {
        return Interstellar.patcher.inputManager.input.input.mouse_y();
    }
    mouseButtonDown(mouseButton: number): boolean {
        return Interstellar.patcher.inputManager.input.input.mouse_button_down(mouseButton);
    }
    mouseButtonPressed(mouseButton: number): boolean {
        return Interstellar.patcher.inputManager.input.input.mouse_button_pressed(mouseButton);
    }
    mouseButtonPressedFrame(mouseButton: number): boolean {
        return Interstellar.patcher.inputManager.input.input.mouse_button_pressed_frame(mouseButton);
    }
    mouseButtonReleasedFrame(mouseButton: number) {
        return Interstellar.patcher.inputManager.input.input.mouse_button_released_frame(mouseButton);
    }

    dragInventoryItem(sourceSlot: number, targetSlot: number, split = false) {
        Interstellar.patcher.inputManager.input.drag_info = {
            source: sourceSlot,
            target: targetSlot,
            split: split
        }
    }

    getInputObject(): any {
        return Interstellar.patcher.inputManager.input;
    }
    getInternalInputObject(): any {
        return Interstellar.patcher.inputManager.input.input;
    }
}

export class InterstellarPacketAPI {
    ClMsgCtrlCmd = Interstellar.patcher.socketmsgtypes.MsgType.ClMsgCtrlCmd;
    ClMsgHeartbeat = Interstellar.patcher.socketmsgtypes.MsgType.ClMsgHeartbeat;
    ClMsgChat = Interstellar.patcher.socketmsgtypes.MsgType.ClMsgChat;
    ClMsgComms = Interstellar.patcher.socketmsgtypes.MsgType.ClMsgComms;
    ClMsgTeamAct = Interstellar.patcher.socketmsgtypes.MsgType.ClMsgTeamAct;
    ClMsgPUICommand = Interstellar.patcher.socketmsgtypes.MsgType.ClMsgPUICommand;
    ClMsgBlockSettings = Interstellar.patcher.socketmsgtypes.MsgType.ClMsgBlockSettings;
    ClMsgOutfitRequest = Interstellar.patcher.socketmsgtypes.MsgType.ClMsgOutfitRequest;
    ClMsgEntConfig = Interstellar.patcher.socketmsgtypes.MsgType.ClMsgEntConfig;
    ClMsgBlueprint = Interstellar.patcher.socketmsgtypes.MsgType.ClMsgBlueprint;
    ClMsgPvPTeam = Interstellar.patcher.socketmsgtypes.MsgType.ClMsgPvPTeam;
    ClMsgMuteWarning = Interstellar.patcher.socketmsgtypes.MsgType.ClMsgMuteWarning;
    SvMsgSetPaintColor = Interstellar.patcher.socketmsgtypes.MsgType.SvMsgSetPaintColor;
    SvMsgCommsBubble = Interstellar.patcher.socketmsgtypes.MsgType.SvMsgCommsBubble;
    SvMsgOutfitResponse = Interstellar.patcher.socketmsgtypes.MsgType.SvMsgOutfitResponse;
    SvMsgItemManifest = Interstellar.patcher.socketmsgtypes.MsgType.SvMsgItemManifest;
    SvMsgLabScores = Interstellar.patcher.socketmsgtypes.MsgType.SvMsgLabScores;
    SvMsgLockdownOverrideWarning = Interstellar.patcher.socketmsgtypes.MsgType.SvMsgLockdownOverrideWarning;
    SvMsgRelayStats = Interstellar.patcher.socketmsgtypes.MsgType.SvMsgRelayStats;
    SvMsgFileDownload = Interstellar.patcher.socketmsgtypes.MsgType.SvMsgFileDownload;
    SvMsgSnapshot = Interstellar.patcher.socketmsgtypes.MsgType.SvMsgSnapshot;
    SvMsgCamFocus = Interstellar.patcher.socketmsgtypes.MsgType.SvMsgCamFocus;
    SvMsgWorldInfo = Interstellar.patcher.socketmsgtypes.MsgType.SvMsgWorldInfo;
    SvMsgWorldBlocks = Interstellar.patcher.socketmsgtypes.MsgType.SvMsgWorldBlocks;
    SvMsgChat = Interstellar.patcher.socketmsgtypes.MsgType.SvMsgChat;
    SvMsgCaptainInfo = Interstellar.patcher.socketmsgtypes.MsgType.SvMsgCaptainInfo;
    SvMsgMotd = Interstellar.patcher.socketmsgtypes.MsgType.SvMsgMotd;
    SvMsgPressureInfo = Interstellar.patcher.socketmsgtypes.MsgType.SvMsgPressureInfo;
    ClMsgSpawnPlayer = Interstellar.patcher.socketmsgtypes.MsgType.ClMsgSpawnPlayer;
    ClMsgEndSession = Interstellar.patcher.socketmsgtypes.MsgType.ClMsgEndSession;
    ClMsgShipControl = Interstellar.patcher.socketmsgtypes.MsgType.ClMsgShipControl;
    ClMsgGetAnchor = Interstellar.patcher.socketmsgtypes.MsgType.ClMsgGetAnchor;
    ClMsgUpdateAnchor = Interstellar.patcher.socketmsgtypes.MsgType.ClMsgUpdateAnchor;
    ClMsgSubSpawnDrop = Interstellar.patcher.socketmsgtypes.MsgType.ClMsgSubSpawnDrop;
    ClMsgShipDestruct = Interstellar.patcher.socketmsgtypes.MsgType.ClMsgShipDestruct;
    ClMsgShipDecay = Interstellar.patcher.socketmsgtypes.MsgType.ClMsgShipDecay;
    ClMsgToggleSlew = Interstellar.patcher.socketmsgtypes.MsgType.ClMsgToggleSlew;
    ClMsgPickupRequest = Interstellar.patcher.socketmsgtypes.MsgType.ClMsgPickupRequest;
    ClMsgCombatRating = Interstellar.patcher.socketmsgtypes.MsgType.ClMsgCombatRating;
    ClMsgThrustInfo = Interstellar.patcher.socketmsgtypes.MsgType.ClMsgThrustInfo;
    ClMsgRequestRelocate = Interstellar.patcher.socketmsgtypes.MsgType.ClMsgRequestRelocate;
    SvMsgCtrlXfer = Interstellar.patcher.socketmsgtypes.MsgType.SvMsgCtrlXfer;
    SvMsgKillSession = Interstellar.patcher.socketmsgtypes.MsgType.SvMsgKillSession;
    SvMsgResetShip = Interstellar.patcher.socketmsgtypes.MsgType.SvMsgResetShip;
    SvMsgKillConnection = Interstellar.patcher.socketmsgtypes.MsgType.SvMsgKillConnection;
    SvMsgComms = Interstellar.patcher.socketmsgtypes.MsgType.SvMsgComms;
    SvMsgPickupAvailable = Interstellar.patcher.socketmsgtypes.MsgType.SvMsgPickupAvailable;
    SvMsgPickupUnavailable = Interstellar.patcher.socketmsgtypes.MsgType.SvMsgPickupUnavailable;
    SvMsgPickupSend = Interstellar.patcher.socketmsgtypes.MsgType.SvMsgPickupSend;
    SvMsgDocked = Interstellar.patcher.socketmsgtypes.MsgType.SvMsgDocked;
    SvMsgEventWon = Interstellar.patcher.socketmsgtypes.MsgType.SvMsgEventWon;
    SvMsgEnableEliminationCrit = Interstellar.patcher.socketmsgtypes.MsgType.SvMsgEnableEliminationCrit;
    SvMsgProfileRelay = Interstellar.patcher.socketmsgtypes.MsgType.SvMsgProfileRelay;
    SvMsgPvPTeamLog = Interstellar.patcher.socketmsgtypes.MsgType.SvMsgPvPTeamLog;
    SvMsgHarmShields = Interstellar.patcher.socketmsgtypes.MsgType.SvMsgHarmShields;
    ShMsgSubSpawnShot = Interstellar.patcher.socketmsgtypes.MsgType.ShMsgSubSpawnShot;
    ShMsgResizeShip = Interstellar.patcher.socketmsgtypes.MsgType.ShMsgResizeShip;
    ShMsgInternalRPC = Interstellar.patcher.socketmsgtypes.MsgType.ShMsgInternalRPC;
}

class InterstellarGameAPI {
    sentCrewControlRequest = false;
    cachedCrewControl: PlayerListEntry[] = [];
    cachedPlayers: Set<string> = new Set();
    getLocalWorld(): any {
        return Interstellar.patcher.worldManager.world_manager.getWorld(
            Interstellar.patcher.worldManager.LOCAL_PLAYER_INFO.world
        );
    }
    getLocalOnlinePlayerNames(): string[] {
        let world = this.getLocalWorld();
        if (world == null) return [];
        const names = world.entityComponents.find_player_names("", Interstellar.patcher.accountManager.getAccount().name)
        names.sort();
        return names;
    }
    leaveShip(): any {
        // @ts-ignore
        window.returnToMenu();
    }
}

class TurretModes {
    ContinuousFire = Interstellar.patcher.usersettingsmanager.TurretMode.ContinuousFire
    VolleyFire = Interstellar.patcher.usersettingsmanager.TurretMode.VolleyFire
}
export class InterstellarDrednotSettingsAPI {
    TurretModes = new TurretModes();
    getSettings() {
        return Interstellar.patcher.usersettingsmanager.USER_SETTINGS
    }
    setEnableGriefingWarning(enabled: boolean) {
        Interstellar.patcher.enableGriefMessages = enabled;
    }
}

class StellarAPI {
    websocket: WebSocket | undefined;
    UI: InterstellarUIAPI = new InterstellarUIAPI();
    Input: InterstellarInputAPI = new InterstellarInputAPI();
    Game: InterstellarGameAPI = new InterstellarGameAPI();
    // @ts-ignore
    DrednotSettings: InterstellarDrednotSettingsAPI;
    // @ts-ignore
    Packet: InterstellarPacketAPI;

    currentShip: CurrentShipData | null = null;

    async joinShip(server: number | null, data: any) {
        await Interstellar.patcher.joinShip(server, data)
    }

    sendPacket(packet: any) {
        this.websocket?.send(Interstellar.patcher.msgpack.encode(packet));
    }

    isCaptain() {
        return (document.querySelector("#team_manager_button") as HTMLButtonElement)!!.style.display != "none"
    }
    playerName(): string {
        return Interstellar.patcher.accountManager.getAccount().name;
    }
    getSelectedServer(): number {
        return Interstellar.connectServer;
    }
}

export default new StellarAPI();