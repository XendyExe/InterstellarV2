import { RenderSettingsEvent } from "@interstellar/InterstellarEvents";
import StellarAPI from "@interstellar/StellarAPI";
import { Fragment, Component, Attributes, ComponentChildren, Ref, h } from "preact";
import Autoequip, { EquipmentSlot } from "./features/Autoequip";
import Keybinds, { Keybind } from "./features/Keybinds";
import ToggleableBillboards from "./features/ToggleableBillboards";
import Chat from "./features/Chat";

let shouldReload = false;
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
            <th><button class="btn-red" onClick={() => {
                Keybinds.keybinds.splice(props.index, 1);
                Keybinds.save();
                StellarAPI.UI.toggleUI("");
                StellarAPI.UI.toggleUI("isqol-keybinds");
            }}>X</button></th>
        </tr>
    }
    render(): ComponentChildren {
        if (!shouldReload) {
            Keybinds.load();
        }
        shouldReload = false;
        return <div class="window darker">
            <div class="close">
                <button class="btn-red" onClick={() => {Keybinds.closeMenu();StellarAPI.UI.toggleUI()}}>Close</button>
            </div>
            <h2>Keybinds</h2>
            <p>Keybinds allows you to run any command by holding down some combination of keys. Interstellar adds many custom commands.</p>
            <p>Click the keys/commands to edit them.</p>
            <button onClick={() => {
                Keybinds.keybinds.push(Keybinds.EMPTY_KEYBIND);
                // This is really dumb
                shouldReload = true;
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
                    <th>Del</th>
                </tr>
                {...Object.values(Keybinds.keybinds).map((elm, index) => {
                    return <this.keybindsEntry data={elm} index={index}/>
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
let enableNestBillboards = (localStorage.getItem("isqol-enableNestBillboards") ?? "true") == "true";
StellarAPI.DrednotSettings.setEnableGriefingWarning(enableGrief);
ToggleableBillboards.enabled = enableNestBillboards;
export function settingsEventListener(event: RenderSettingsEvent) {
    enableGrief = (localStorage.getItem("isqol-enableGriefWarnings") ?? "true") == "true";
    Chat.autotranslate = localStorage.getItem("isqol-autotrans") === "true";
    Chat.translatecode = localStorage.getItem("isqol-translatecode") ?? "en";
    console.log(Chat.autotranslate);

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
    StellarAPI.UI.preactInsertBefore(event.displaySettings, interstellarButton, <>
        <p><label><b>Enable nest billboards: </b><input type="checkbox" onChange={(e) => {
            const enable = (e.target as HTMLInputElement).checked;
            localStorage.setItem("isqol-enableNestBillboards", enable ? "true" : "false")
            ToggleableBillboards.enabled = enable;
        }} checked={enableNestBillboards}/></label></p>
    </>)
    console.log(event.displaySettings);
    let children = StellarAPI.UI.preactNormalizeChildren(event.displaySettings);
    console.log(children);
    // @ts-ignore
    StellarAPI.UI.preactInsertAfter(event.displaySettings, event.displaySettings.props.children[0]!!, <>
        <p><b>Translate chat to:</b> <select name="language"
                                             value={Chat.translatecode}
                                             onChange={(e) => {
                                                 Chat.translatecode = (e.target as HTMLSelectElement).value;
                                                 localStorage.setItem("isqol-translatecode", (e.target as HTMLSelectElement).value)
                                                 Chat.swapTranslateCode();
                                             }}>
            {/** Common / High-use languages */}
            <option value="en">English</option>
            <option value="ru">Русский</option>
            <option value="es">Español</option>
            <option value="zh-CN">中文（简体）</option>
            <option value="zh-TW">中文（繁體）</option>
            <option value="hi">हिन्दी</option>
            <option value="ar">العربية</option>
            <option value="pt">Português</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="ja">日本語</option>
            <option value="ko">한국어</option>
            <option value="it">Italiano</option>
            <option value="tr">Türkçe</option>
            <option value="vi">Tiếng Việt</option>

            {/** Other widely used languages */}
            <option value="nl">Nederlands</option>
            <option value="pl">Polski</option>
            <option value="uk">Українська</option>
            <option value="el">Ελληνικά</option>
            <option value="sv">Svenska</option>
            <option value="fi">Suomi</option>
            <option value="da">Dansk</option>
            <option value="no">Norsk</option>
            <option value="cs">Čeština</option>
            <option value="ro">Română</option>
            <option value="hu">Magyar</option>
            <option value="id">Bahasa Indonesia</option>
            <option value="ms">Bahasa Melayu</option>
            <option value="th">ไทย</option>
            <option value="he">עברית</option>
            <option value="fa">فارسی</option>
            <option value="bn">বাংলা</option>
            <option value="ur">اردو</option>

            {/** South Asian languages */}
            <option value="ta">தமிழ்</option>
            <option value="te">తెలుగు</option>
            <option value="ml">മലയാളം</option>
            <option value="kn">ಕನ್ನಡ</option>
            <option value="gu">ગુજરાતી</option>
            <option value="mr">मराठी</option>
            <option value="pa">ਪੰਜਾਬੀ</option>

            {/** Southeast / East European */}
            <option value="bg">Български</option>
            <option value="hr">Hrvatski</option>
            <option value="sr">Српски</option>
            <option value="sk">Slovenčina</option>
            <option value="sl">Slovenščina</option>
            <option value="lt">Lietuvių</option>
            <option value="lv">Latviešu</option>
            <option value="et">Eesti</option>
            <option value="sq">Shqip</option>
            <option value="mk">Македонски</option>

            {/** African languages (commonly supported in Google Translate) */}
            <option value="af">Afrikaans</option>
            <option value="sw">Kiswahili</option>

            {/** Other */}
            <option value="is">Íslenska</option>
            <option value="tl">Filipino</option>

        </select></p>

        <p><label><b>Autotranslate: </b><input type="checkbox" onChange={(e) => {
            const enable = (e.target as HTMLInputElement).checked;
            Chat.autotranslate = enable;
            localStorage.setItem("isqol-autotrans", enable ? "true" : "false")
        }} checked={Chat.autotranslate}/></label></p>
    </>)
}