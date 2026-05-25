"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSettings = setupSettings;
exports.settingsEventListener = settingsEventListener;
const StellarAPI_1 = __importDefault(require("@interstellar/StellarAPI"));
const preact_1 = require("preact");
const Autoequip_1 = __importDefault(require("./features/Autoequip"));
const Keybinds_1 = __importDefault(require("./features/Keybinds"));
const ToggleableBillboards_1 = __importDefault(require("./features/ToggleableBillboards"));
const Chat_1 = __importDefault(require("./features/Chat"));
let shouldReload = false;
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
                    data.command)),
            (0, preact_1.h)("th", null,
                (0, preact_1.h)("button", { class: "btn-red", onClick: () => {
                        Keybinds_1.default.keybinds.splice(props.index, 1);
                        Keybinds_1.default.save();
                        StellarAPI_1.default.UI.toggleUI("");
                        StellarAPI_1.default.UI.toggleUI("isqol-keybinds");
                    } }, "X")));
    }
    render() {
        if (!shouldReload) {
            Keybinds_1.default.load();
        }
        shouldReload = false;
        return (0, preact_1.h)("div", { class: "window darker" },
            (0, preact_1.h)("div", { class: "close" },
                (0, preact_1.h)("button", { class: "btn-red", onClick: () => { Keybinds_1.default.closeMenu(); StellarAPI_1.default.UI.toggleUI(); } }, "Close")),
            (0, preact_1.h)("h2", null, "Keybinds"),
            (0, preact_1.h)("p", null, "Keybinds allows you to run any command by holding down some combination of keys. Interstellar adds many custom commands."),
            (0, preact_1.h)("p", null, "Click the keys/commands to edit them."),
            (0, preact_1.h)("button", { onClick: () => {
                    Keybinds_1.default.keybinds.push(Keybinds_1.default.EMPTY_KEYBIND);
                    // This is really dumb
                    shouldReload = true;
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
                    (0, preact_1.h)("th", null, "Command"),
                    (0, preact_1.h)("th", null, "Del")),
                ...Object.values(Keybinds_1.default.keybinds).map((elm, index) => {
                    return (0, preact_1.h)(this.keybindsEntry, { data: elm, index: index });
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
let enableNestBillboards = ((_b = localStorage.getItem("isqol-enableNestBillboards")) !== null && _b !== void 0 ? _b : "true") == "true";
StellarAPI_1.default.DrednotSettings.setEnableGriefingWarning(enableGrief);
ToggleableBillboards_1.default.enabled = enableNestBillboards;
function settingsEventListener(event) {
    var _a, _b;
    enableGrief = ((_a = localStorage.getItem("isqol-enableGriefWarnings")) !== null && _a !== void 0 ? _a : "true") == "true";
    Chat_1.default.autotranslate = localStorage.getItem("isqol-autotrans") === "true";
    Chat_1.default.translatecode = (_b = localStorage.getItem("isqol-translatecode")) !== null && _b !== void 0 ? _b : "en";
    console.log(Chat_1.default.autotranslate);
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
    StellarAPI_1.default.UI.preactInsertBefore(event.displaySettings, interstellarButton, (0, preact_1.h)(preact_1.Fragment, null,
        (0, preact_1.h)("p", null,
            (0, preact_1.h)("label", null,
                (0, preact_1.h)("b", null, "Enable nest billboards: "),
                (0, preact_1.h)("input", { type: "checkbox", onChange: (e) => {
                        const enable = e.target.checked;
                        localStorage.setItem("isqol-enableNestBillboards", enable ? "true" : "false");
                        ToggleableBillboards_1.default.enabled = enable;
                    }, checked: enableNestBillboards })))));
    console.log(event.displaySettings);
    let children = StellarAPI_1.default.UI.preactNormalizeChildren(event.displaySettings);
    console.log(children);
    // @ts-ignore
    StellarAPI_1.default.UI.preactInsertAfter(event.displaySettings, event.displaySettings.props.children[0], (0, preact_1.h)(preact_1.Fragment, null,
        (0, preact_1.h)("p", null,
            (0, preact_1.h)("b", null, "Translate chat to:"),
            " ",
            (0, preact_1.h)("select", { name: "language", value: Chat_1.default.translatecode, onChange: (e) => {
                    Chat_1.default.translatecode = e.target.value;
                    localStorage.setItem("isqol-translatecode", e.target.value);
                    Chat_1.default.swapTranslateCode();
                } },
                (0, preact_1.h)("option", { value: "en" }, "English"),
                (0, preact_1.h)("option", { value: "ru" }, "\u0420\u0443\u0441\u0441\u043A\u0438\u0439"),
                (0, preact_1.h)("option", { value: "es" }, "Espa\u00F1ol"),
                (0, preact_1.h)("option", { value: "zh-CN" }, "\u4E2D\u6587\uFF08\u7B80\u4F53\uFF09"),
                (0, preact_1.h)("option", { value: "zh-TW" }, "\u4E2D\u6587\uFF08\u7E41\u9AD4\uFF09"),
                (0, preact_1.h)("option", { value: "hi" }, "\u0939\u093F\u0928\u094D\u0926\u0940"),
                (0, preact_1.h)("option", { value: "ar" }, "\u0627\u0644\u0639\u0631\u0628\u064A\u0629"),
                (0, preact_1.h)("option", { value: "pt" }, "Portugu\u00EAs"),
                (0, preact_1.h)("option", { value: "fr" }, "Fran\u00E7ais"),
                (0, preact_1.h)("option", { value: "de" }, "Deutsch"),
                (0, preact_1.h)("option", { value: "ja" }, "\u65E5\u672C\u8A9E"),
                (0, preact_1.h)("option", { value: "ko" }, "\uD55C\uAD6D\uC5B4"),
                (0, preact_1.h)("option", { value: "it" }, "Italiano"),
                (0, preact_1.h)("option", { value: "tr" }, "T\u00FCrk\u00E7e"),
                (0, preact_1.h)("option", { value: "vi" }, "Ti\u1EBFng Vi\u1EC7t"),
                (0, preact_1.h)("option", { value: "nl" }, "Nederlands"),
                (0, preact_1.h)("option", { value: "pl" }, "Polski"),
                (0, preact_1.h)("option", { value: "uk" }, "\u0423\u043A\u0440\u0430\u0457\u043D\u0441\u044C\u043A\u0430"),
                (0, preact_1.h)("option", { value: "el" }, "\u0395\u03BB\u03BB\u03B7\u03BD\u03B9\u03BA\u03AC"),
                (0, preact_1.h)("option", { value: "sv" }, "Svenska"),
                (0, preact_1.h)("option", { value: "fi" }, "Suomi"),
                (0, preact_1.h)("option", { value: "da" }, "Dansk"),
                (0, preact_1.h)("option", { value: "no" }, "Norsk"),
                (0, preact_1.h)("option", { value: "cs" }, "\u010Ce\u0161tina"),
                (0, preact_1.h)("option", { value: "ro" }, "Rom\u00E2n\u0103"),
                (0, preact_1.h)("option", { value: "hu" }, "Magyar"),
                (0, preact_1.h)("option", { value: "id" }, "Bahasa Indonesia"),
                (0, preact_1.h)("option", { value: "ms" }, "Bahasa Melayu"),
                (0, preact_1.h)("option", { value: "th" }, "\u0E44\u0E17\u0E22"),
                (0, preact_1.h)("option", { value: "he" }, "\u05E2\u05D1\u05E8\u05D9\u05EA"),
                (0, preact_1.h)("option", { value: "fa" }, "\u0641\u0627\u0631\u0633\u06CC"),
                (0, preact_1.h)("option", { value: "bn" }, "\u09AC\u09BE\u0982\u09B2\u09BE"),
                (0, preact_1.h)("option", { value: "ur" }, "\u0627\u0631\u062F\u0648"),
                (0, preact_1.h)("option", { value: "ta" }, "\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD"),
                (0, preact_1.h)("option", { value: "te" }, "\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41"),
                (0, preact_1.h)("option", { value: "ml" }, "\u0D2E\u0D32\u0D2F\u0D3E\u0D33\u0D02"),
                (0, preact_1.h)("option", { value: "kn" }, "\u0C95\u0CA8\u0CCD\u0CA8\u0CA1"),
                (0, preact_1.h)("option", { value: "gu" }, "\u0A97\u0AC1\u0A9C\u0AB0\u0ABE\u0AA4\u0AC0"),
                (0, preact_1.h)("option", { value: "mr" }, "\u092E\u0930\u093E\u0920\u0940"),
                (0, preact_1.h)("option", { value: "pa" }, "\u0A2A\u0A70\u0A1C\u0A3E\u0A2C\u0A40"),
                (0, preact_1.h)("option", { value: "bg" }, "\u0411\u044A\u043B\u0433\u0430\u0440\u0441\u043A\u0438"),
                (0, preact_1.h)("option", { value: "hr" }, "Hrvatski"),
                (0, preact_1.h)("option", { value: "sr" }, "\u0421\u0440\u043F\u0441\u043A\u0438"),
                (0, preact_1.h)("option", { value: "sk" }, "Sloven\u010Dina"),
                (0, preact_1.h)("option", { value: "sl" }, "Sloven\u0161\u010Dina"),
                (0, preact_1.h)("option", { value: "lt" }, "Lietuvi\u0173"),
                (0, preact_1.h)("option", { value: "lv" }, "Latvie\u0161u"),
                (0, preact_1.h)("option", { value: "et" }, "Eesti"),
                (0, preact_1.h)("option", { value: "sq" }, "Shqip"),
                (0, preact_1.h)("option", { value: "mk" }, "\u041C\u0430\u043A\u0435\u0434\u043E\u043D\u0441\u043A\u0438"),
                (0, preact_1.h)("option", { value: "af" }, "Afrikaans"),
                (0, preact_1.h)("option", { value: "sw" }, "Kiswahili"),
                (0, preact_1.h)("option", { value: "is" }, "\u00CDslenska"),
                (0, preact_1.h)("option", { value: "tl" }, "Filipino"))),
        (0, preact_1.h)("p", null,
            (0, preact_1.h)("label", null,
                (0, preact_1.h)("b", null, "Autotranslate: "),
                (0, preact_1.h)("input", { type: "checkbox", onChange: (e) => {
                        const enable = e.target.checked;
                        Chat_1.default.autotranslate = enable;
                        localStorage.setItem("isqol-autotrans", enable ? "true" : "false");
                    }, checked: Chat_1.default.autotranslate })))));
}
