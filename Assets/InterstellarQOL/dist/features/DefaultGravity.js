"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const InterstellarEvents_1 = require("@interstellar/InterstellarEvents");
const StellarAPI_1 = __importDefault(require("@interstellar/StellarAPI"));
const StellarEventManager_1 = __importDefault(require("@interstellar/StellarEventManager"));
const preact_1 = require("preact");
const __1 = __importDefault(require(".."));
const grav = ["down", "up", "left", "right"];
class DefaultGravity {
    constructor() {
        // Ship id: grav, if grav is not down
        this.defaultGravs = {};
        StellarEventManager_1.default.addEventListener(InterstellarEvents_1.RenderShipSettingsEvent, this.onRenderShipSettings.bind(this));
        StellarEventManager_1.default.addEventListener(InterstellarEvents_1.JoinShipEvent, this.onJoinShip.bind(this));
        let saveData = localStorage.getItem("isqol-defaultGravity");
        if (saveData) {
            this.defaultGravs = JSON.parse(saveData);
        }
    }
    onJoinShip(event) {
        if (this.defaultGravs[event.hex]) {
            let dir = this.defaultGravs[event.hex];
            __1.default.logMessage(`Set ship default gravity: ${grav[dir]}`);
            StellarAPI_1.default.sendPacket({ type: StellarAPI_1.default.Packet.ClMsgTeamAct, arg: dir, act: "gravity" });
        }
    }
    onRenderShipSettings(event) {
        var _a;
        // @ts-ignore
        const c = event.node.props.children;
        const currentGrav = (_a = this.defaultGravs[StellarAPI_1.default.currentShip.hex]) !== null && _a !== void 0 ? _a : 0;
        StellarAPI_1.default.UI.preactAppendChild(c[c.length - 1], (0, preact_1.h)("section", null,
            (0, preact_1.h)("h3", { class: "h" }, "Default Ship Gravity"),
            (0, preact_1.h)("p", null,
                "InterstellarQOL allows you to set the default ship gravity, which you can set here: \u00A0",
                (0, preact_1.h)("select", { onChange: ((e) => {
                        this.defaultGravs[StellarAPI_1.default.currentShip.hex] = e.target.selectedIndex;
                        if (this.defaultGravs[StellarAPI_1.default.currentShip.hex] == 0)
                            delete this.defaultGravs[StellarAPI_1.default.currentShip.hex];
                        this.save();
                    }).bind(this) },
                    (0, preact_1.h)("option", { selected: currentGrav == 0 }, "Down"),
                    (0, preact_1.h)("option", { selected: currentGrav == 1 }, "Up"),
                    (0, preact_1.h)("option", { selected: currentGrav == 2 }, "Left"),
                    (0, preact_1.h)("option", { selected: currentGrav == 3 }, "Right")))));
    }
    save() {
        localStorage.setItem("isqol-defaultGravity", JSON.stringify(this.defaultGravs));
    }
}
exports.default = new DefaultGravity();
