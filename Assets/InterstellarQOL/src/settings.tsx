import { RenderSettingsEvent } from "@interstellar/InterstellarEvents";
import StellarAPI from "@interstellar/StellarAPI";
import { h, Fragment, Component, Attributes, ComponentChildren, Ref } from "preact";
import Autoequip, { EquipmentSlot } from "./features/Autoequip";
import Keybinds, { Keybind } from "./features/Keybinds";


class KeybindsComponent extends Component {
    keybindsEntry(props: any) {
        const data: Keybind = props.data;
        return <tr>
            <th><input type="checkbox" checked={data.control} onChange={(e) => {data.control = (e.target as HTMLInputElement).checked; Keybinds.save()}}/></th>
            <th><input type="checkbox" checked={data.alt} onChange={(e) => {data.alt = (e.target as HTMLInputElement).checked; Keybinds.save()}}/></th>
            <th><input type="checkbox" checked={data.shift} onChange={(e) => {data.shift = (e.target as HTMLInputElement).checked; Keybinds.save()}}/></th>
            <th><a onClick={(e) => {
                Keybinds.editKey(e.target as HTMLAnchorElement, data);
            }}>{data.key}</a></th>
            <th><a onClick={(e) => {
                Keybinds.editCommand(e.target as HTMLAnchorElement, data);
            }}>/{data.command}</a></th>
        </tr>
    }
    render(): ComponentChildren {
        Keybinds.load();
        return <div class="window darker">
            <div class="close">
                <button class="btn-red" onClick={() => {Keybinds.closeMenu();StellarAPI.UI.toggleUI()}}>Close</button>
            </div>
            <h2>Keybinds</h2>
            <p>Keybinds allows you to run any command by holding down some combination of keys. Interstellar adds many custom commands.</p>
            <p>Click the keys/commands to edit them.</p>
            <button onClick={() => {
                Keybinds.keybinds.push({
                    disabled: false,
                    shift: false,
                    control: false,
                    alt: false,
                    key: "None",
                    command: "CHANGE ME"
                })
                // This is really dumb
                StellarAPI.UI.toggleUI("");
                StellarAPI.UI.toggleUI("isqol-keybinds");
            }}>Add Keybind</button>
            <table style={{
                border: "1px solid white",
                borderCollapse: "collapse",
            }}>
                <tr>
                    <th>Ctrl?</th>
                    <th>Alt?</th>
                    <th>Shift?</th>
                    <th>Key</th>
                    <th>Command</th>
                </tr>
                {...Object.values(Keybinds.keybinds).map((elm) => {
                    return <this.keybindsEntry data={elm}/>
                })}
            </table>
        </div>
    }

    constructor() {
        super({});
        this.state = {};
    }
}

class AutoequipComponent extends Component {
    eqcheckbox(props: any) {
        const data: [string, EquipmentSlot, boolean, boolean] = props.data;
        return <tr>
            <th>{data[1]}</th>
            <th>{data[0]}</th>
            <th><input type="checkbox" onChange={(event) => {
                data[2] = (event.target as HTMLInputElement).checked;
                Autoequip.save();
            }} checked={data[2]}/></th>
            <th><input type="checkbox" onChange={(event) => {
                data[3] = (event.target as HTMLInputElement).checked;
                Autoequip.save();
            }} checked={data[3]}/></th>
        </tr>
    }
    render(): ComponentChildren {
        return <div class="window darker">
            <div class="close">
                <button class="btn-red" onClick={() => {StellarAPI.UI.toggleUI()}}>Close</button>
            </div>
            <h2>Autoequip</h2>
            <p>Interstellar will autoequip these items to your character when you join a ship and pick these up FOR THE FIRST TIME. Priority equips ensures that it will switch to that item even if another item is selected to be equipped, and will not switch to any other items.</p>
            <table style={{
                border: "1px solid white",
                borderCollapse: "collapse",
            }}>
                <tr>
                    <th>Slot</th>
                    <th>Item</th>
                    <th>Autoequip?</th>
                    <th>Priority?</th>
                </tr>
                {...Object.values(Autoequip.data).map((elm) => {
                    return <this.eqcheckbox data={elm}/>
                })}
            </table>
        </div>
    }

    constructor() {
        super();
    }
}

export function setupSettings() {
    StellarAPI.UI.registerSettingsModel("isqol-keybinds", <KeybindsComponent/>);
    StellarAPI.UI.registerSettingsModel("isqol-autoequip", <AutoequipComponent/>);
}

let enableGrief = (localStorage.getItem("isqol-enableGriefWarnings") ?? "true") == "true";
StellarAPI.DrednotSettings.setEnableGriefingWarning(enableGrief);
export function settingsEventListener(event: RenderSettingsEvent) {
    enableGrief = (localStorage.getItem("isqol-enableGriefWarnings") ?? "true") == "true";
    StellarAPI.UI.preactAppendChild(event.gameplaySettings, 
        <>
            <button onClick={() => {
                StellarAPI.UI.toggleUI("isqol-keybinds");
            }}>Keybinds</button>
            <button onClick={() => {
                StellarAPI.UI.toggleUI("isqol-autoequip");
            }}>Autoequip</button>
        </>
    )
    const interstellarButton = StellarAPI.UI.preactGetChildWithID(event.displaySettings, "manageInterstellarButton")!!;
    StellarAPI.UI.preactInsertBefore(event.displaySettings, interstellarButton, <>
        <p><label><b>Show griefing warning: </b><input type="checkbox" onChange={(e) => {
            const enable = (e.target as HTMLInputElement).checked;
            StellarAPI.DrednotSettings.setEnableGriefingWarning(enable);
            localStorage.setItem("isqol-enableGriefWarnings", enable ? "true" : "false")
        }} checked={enableGrief}/></label></p>
    </>)
}