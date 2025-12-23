"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSettings = setupSettings;
exports.settingsEventListener = settingsEventListener;
const StellarAPI_1 = __importDefault(require("@interstellar/StellarAPI"));
const preact_1 = require("preact");
const Autoequip_1 = __importDefault(require("./features/Autoequip"));
const Keybinds_1 = __importDefault(require("./features/Keybinds"));
class KeybindsComponent extends preact_1.Component {
    keybindsEntry(props) {
        const data = props.data;
        return (0, preact_1.h)("tr", null,
            (0, preact_1.h)("th", null,
                (0, preact_1.h)("input", { type: "checkbox", checked: data.control, onChange: (e) => { data.control = e.target.checked; Keybinds_1.default.save(); } })),
            (0, preact_1.h)("th", null,
                (0, preact_1.h)("input", { type: "checkbox", checked: data.alt, onChange: (e) => { data.alt = e.target.checked; Keybinds_1.default.save(); } })),
            (0, preact_1.h)("th", null,
                (0, preact_1.h)("input", { type: "checkbox", checked: data.shift, onChange: (e) => { data.shift = e.target.checked; Keybinds_1.default.save(); } })),
            (0, preact_1.h)("th", null,
                (0, preact_1.h)("a", { onClick: (e) => {
                        Keybinds_1.default.editKey(e.target, data);
                    } }, data.key)),
            (0, preact_1.h)("th", null,
                (0, preact_1.h)("a", { onClick: (e) => {
                        Keybinds_1.default.editCommand(e.target, data);
                    } },
                    "/",
                    data.command)));
    }
    render() {
        Keybinds_1.default.load();
        return (0, preact_1.h)("div", { class: "window darker" },
            (0, preact_1.h)("div", { class: "close" },
                (0, preact_1.h)("button", { class: "btn-red", onClick: () => { Keybinds_1.default.closeMenu(); StellarAPI_1.default.UI.toggleUI(); } }, "Close")),
            (0, preact_1.h)("h2", null, "Keybinds"),
            (0, preact_1.h)("p", null, "Keybinds allows you to run any command by holding down some combination of keys. Interstellar adds many custom commands."),
            (0, preact_1.h)("p", null, "Click the keys/commands to edit them."),
            (0, preact_1.h)("button", { onClick: () => {
                    Keybinds_1.default.keybinds.push({
                        disabled: false,
                        shift: false,
                        control: false,
                        alt: false,
                        key: "None",
                        command: "CHANGE ME"
                    });
                    // This is really dumb
                    StellarAPI_1.default.UI.toggleUI("");
                    StellarAPI_1.default.UI.toggleUI("isqol-keybinds");
                } }, "Add Keybind"),
            (0, preact_1.h)("table", { style: {
                    border: "1px solid white",
                    borderCollapse: "collapse",
                } },
                (0, preact_1.h)("tr", null,
                    (0, preact_1.h)("th", null, "Ctrl?"),
                    (0, preact_1.h)("th", null, "Alt?"),
                    (0, preact_1.h)("th", null, "Shift?"),
                    (0, preact_1.h)("th", null, "Key"),
                    (0, preact_1.h)("th", null, "Command")),
                ...Object.values(Keybinds_1.default.keybinds).map((elm) => {
                    return (0, preact_1.h)(this.keybindsEntry, { data: elm });
                })));
    }
    constructor() {
        super({});
        this.state = {};
    }
}
class AutoequipComponent extends preact_1.Component {
    eqcheckbox(props) {
        const data = props.data;
        return (0, preact_1.h)("tr", null,
            (0, preact_1.h)("th", null, data[1]),
            (0, preact_1.h)("th", null, data[0]),
            (0, preact_1.h)("th", null,
                (0, preact_1.h)("input", { type: "checkbox", onChange: (event) => {
                        data[2] = event.target.checked;
                        Autoequip_1.default.save();
                    }, checked: data[2] })),
            (0, preact_1.h)("th", null,
                (0, preact_1.h)("input", { type: "checkbox", onChange: (event) => {
                        data[3] = event.target.checked;
                        Autoequip_1.default.save();
                    }, checked: data[3] })));
    }
    render() {
        return (0, preact_1.h)("div", { class: "window darker" },
            (0, preact_1.h)("div", { class: "close" },
                (0, preact_1.h)("button", { class: "btn-red", onClick: () => { StellarAPI_1.default.UI.toggleUI(); } }, "Close")),
            (0, preact_1.h)("h2", null, "Autoequip"),
            (0, preact_1.h)("p", null, "Interstellar will autoequip these items to your character when you join a ship and pick these up FOR THE FIRST TIME. Priority equips ensures that it will switch to that item even if another item is selected to be equipped, and will not switch to any other items."),
            (0, preact_1.h)("table", { style: {
                    border: "1px solid white",
                    borderCollapse: "collapse",
                } },
                (0, preact_1.h)("tr", null,
                    (0, preact_1.h)("th", null, "Slot"),
                    (0, preact_1.h)("th", null, "Item"),
                    (0, preact_1.h)("th", null, "Autoequip?"),
                    (0, preact_1.h)("th", null, "Priority?")),
                ...Object.values(Autoequip_1.default.data).map((elm) => {
                    return (0, preact_1.h)(this.eqcheckbox, { data: elm });
                })));
    }
    constructor() {
        super();
    }
}
function setupSettings() {
    StellarAPI_1.default.UI.registerSettingsModel("isqol-keybinds", (0, preact_1.h)(KeybindsComponent, null));
    StellarAPI_1.default.UI.registerSettingsModel("isqol-autoequip", (0, preact_1.h)(AutoequipComponent, null));
}
let enableGrief = ((_a = localStorage.getItem("isqol-enableGriefWarnings")) !== null && _a !== void 0 ? _a : "true") == "true";
StellarAPI_1.default.DrednotSettings.setEnableGriefingWarning(enableGrief);
function settingsEventListener(event) {
    var _a;
    enableGrief = ((_a = localStorage.getItem("isqol-enableGriefWarnings")) !== null && _a !== void 0 ? _a : "true") == "true";
    StellarAPI_1.default.UI.preactAppendChild(event.gameplaySettings, (0, preact_1.h)(preact_1.Fragment, null,
        (0, preact_1.h)("button", { onClick: () => {
                StellarAPI_1.default.UI.toggleUI("isqol-keybinds");
            } }, "Keybinds"),
        (0, preact_1.h)("button", { onClick: () => {
                StellarAPI_1.default.UI.toggleUI("isqol-autoequip");
            } }, "Autoequip")));
    const interstellarButton = StellarAPI_1.default.UI.preactGetChildWithID(event.displaySettings, "manageInterstellarButton");
    StellarAPI_1.default.UI.preactInsertBefore(event.displaySettings, interstellarButton, (0, preact_1.h)(preact_1.Fragment, null,
        (0, preact_1.h)("p", null,
            (0, preact_1.h)("label", null,
                (0, preact_1.h)("b", null, "Show griefing warning: "),
                (0, preact_1.h)("input", { type: "checkbox", onChange: (e) => {
                        const enable = e.target.checked;
                        StellarAPI_1.default.DrednotSettings.setEnableGriefingWarning(enable);
                        localStorage.setItem("isqol-enableGriefWarnings", enable ? "true" : "false");
                    }, checked: enableGrief })))));
}
