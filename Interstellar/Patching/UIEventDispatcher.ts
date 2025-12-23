import { Component, h, VNode } from "preact";
import { InventoryChangeEvent, RenderBigShipEntryEvent, RenderBlueprintPUIEvent, RenderCraftingPUIEvent, RenderCrewControlEvent, RenderCrewListEvent, RenderInventoryEvent, RenderLauncherPUIEvent, RenderSettingsEvent, RenderShiplistAdSlotEvent, RenderShiplistSidebarEvent, RenderShipSettingsEvent, RenderSignPUIEvent, RenderSmallShipEntryEvent } from "../API/InterstellarEvents";
import { arraysEqual } from "../API/Utils";
import Interstellar from "../Interstellar";

let fixed_shrekdark = false;
export default class UIEventDispatcher {
    renderSettings(component: Component, elm: VNode) {(new RenderSettingsEvent(component, elm)).dispatch()}
    renderCrewControl(component: Component,elm: VNode) {(new RenderCrewControlEvent(component, elm).dispatch())}
    renderCrewList(component: Component,elm: VNode) {(new RenderCrewListEvent(component, elm)).dispatch()}
    renderShiplistAdSlotEvent(component: Component,elm: VNode) {(new RenderShiplistAdSlotEvent(component, elm)).dispatch()}
    renderShipSettings(component: Component,elm: VNode) {(new RenderShipSettingsEvent(component, elm)).dispatch()}
    renderShiplistSidebar(component: Component,elm: VNode) {
        const server = (component.state as any).connect_server
        if (server != -1 && server != Interstellar.connectServer) {
            Interstellar.connectServer = server;
            Interstellar.currentZone?.teleportToZone(Interstellar.zoneOverrides[Interstellar.menuZones[server]!!]!!)
        }
        let extraMods = [];
        if (getComputedStyle(document.querySelector("#top-bar")!!).animation == '0.7s ease 0s 1 normal none running slideTopBarIn') {
            extraMods.push("shrekdark - breaks team manager");
            const team_menu = document.querySelector("#team_menu");
            if (team_menu && !fixed_shrekdark) {
                team_menu.remove();
                fixed_shrekdark = true;
            }
        }
        if (extraMods.length > 0) {
            (elm.props.children as any).push(h("section", null, 
                h("p", null, "Warning: It looks like you are using extra extensions that has questionable support. Xendy is not responsable for any bugs or issues that might be caused by these:"),
                ...extraMods.map(elm => h("ul", null, elm))
            ))
        }
        (new RenderShiplistSidebarEvent(component, elm)).dispatch()
    }
    renderBigShipEntryEvent(component: Component,elm: VNode) {(new RenderBigShipEntryEvent(component, elm)).dispatch()}
    renderSmallShipEntryEvent(component: Component,elm: VNode) {(new RenderSmallShipEntryEvent(component, elm)).dispatch()}
    renderLauncherPUIEvent(component: Component,elm: VNode) {(new RenderLauncherPUIEvent(component, elm)).dispatch()}
    renderSignPUIEvent(component: Component,elm: VNode) {(new RenderSignPUIEvent(component, elm)).dispatch()}
    renderCraftingPUIEvent(component: Component,elm: VNode) {(new RenderCraftingPUIEvent(component, elm)).dispatch()}
    renderBlueprintPUIEvent(component: Component,elm: VNode) {(new RenderBlueprintPUIEvent(component, elm)).dispatch()}

    private inventory: (number | null)[] = [];
    inventoryUpdate(component: Component, elm: VNode) {
        const state = component.state as any;
        if (state.inventory) {
            const inventory = state.inventory;
            if (!arraysEqual(this.inventory, inventory.items)) {
                (new InventoryChangeEvent(this.inventory, inventory.items, inventory)).dispatch();
                this.inventory = [...inventory.items];
            }
        }
        (new RenderInventoryEvent(component, elm)).dispatch();
    }
}