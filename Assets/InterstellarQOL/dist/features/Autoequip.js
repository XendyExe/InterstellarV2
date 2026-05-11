"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EquipmentSlot = void 0;
const InterstellarEvents_1 = require("@interstellar/InterstellarEvents");
const StellarAPI_1 = __importDefault(require("@interstellar/StellarAPI"));
const StellarEventManager_1 = __importDefault(require("@interstellar/StellarEventManager"));
const __1 = __importDefault(require(".."));
const StellarCommandsManager_1 = __importStar(require("@interstellar/StellarCommandsManager"));
var EquipmentSlot;
(function (EquipmentSlot) {
    EquipmentSlot["BACK"] = "Back";
    EquipmentSlot["FEET"] = "Feet";
    EquipmentSlot["HANDS"] = "Hands";
})(EquipmentSlot || (exports.EquipmentSlot = EquipmentSlot = {}));
function cheatGive(item) {
    StellarAPI_1.default.sendPacket({
        type: StellarAPI_1.default.Packet.ClMsgTeamAct,
        act: "cheat_give",
        arg: item
    });
}
class TestKitCommand extends StellarCommandsManager_1.BaseCommand {
    constructor(ae) {
        super();
        this.name = "testkit";
        this.alias = [""];
        this.testOnly = true;
        this.arguments = [];
        this.ae = ae;
    }
    execute(option) {
        __1.default.logMessage("Giving testkit...");
        this.ae.giveTestkit();
    }
}
class Autoequip {
    constructor() {
        this.items = [
            [108, "Backpack", EquipmentSlot.BACK],
            [109, "Speed Skates", EquipmentSlot.FEET],
            [110, "Booster Boots", EquipmentSlot.FEET],
            [111, "Launcher Gauntlets", EquipmentSlot.HANDS],
            [112, "Construction Gauntlets", EquipmentSlot.HANDS],
            [113, "Rocket Pack", EquipmentSlot.BACK],
            [114, "Hover Pack", EquipmentSlot.BACK]
        ];
        this.data = {};
        this.autoequipped = [];
        this.priorityEqupped = [];
        this.testkitting = false;
        this.items.forEach(elm => {
            this.data[elm[0]] = [elm[1], elm[2], false, false];
        });
        if (localStorage.getItem("isqol_autoequip")) {
            let json = JSON.parse(localStorage.getItem("isqol_autoequip"));
            json.forEach((elm) => {
                this.data[elm[0]][2] = elm[1];
                this.data[elm[0]][3] = elm[2];
            });
        }
        this.save();
        StellarEventManager_1.default.addEventListener(InterstellarEvents_1.InventoryChangeEvent, this.inventoryChange.bind(this));
        StellarEventManager_1.default.addEventListener(InterstellarEvents_1.JoinShipRequestEvent, (() => {
            this.autoequipped = [];
            this.priorityEqupped = [];
        }).bind(this));
        StellarCommandsManager_1.default.registerCommand(new TestKitCommand(this));
    }
    giveTestkit() {
        return __awaiter(this, void 0, void 0, function* () {
            this.testkitting = true;
            this.data["108"][2] = true;
            this.data["108"][3] = true;
            this.data["109"][2] = true;
            this.data["109"][3] = true;
            this.data["112"][2] = true;
            this.data["112"][3] = true;
            this.save();
            StellarAPI_1.default.sendPacket({
                type: StellarAPI_1.default.Packet.ClMsgTeamAct,
                act: "cheat_noclip",
                arg: null
            });
            yield new Promise((resolve, _) => setTimeout(resolve, 100));
            StellarAPI_1.default.sendPacket({
                type: StellarAPI_1.default.Packet.ClMsgTeamAct,
                act: "cheat_sandbox",
                arg: null
            });
            yield new Promise((resolve, _) => setTimeout(resolve, 100));
            cheatGive(117); // wrench
            yield new Promise((resolve, _) => setTimeout(resolve, 100));
            cheatGive(118); // shredder
            yield new Promise((resolve, _) => setTimeout(resolve, 100));
            cheatGive(108);
            yield new Promise((resolve, _) => setTimeout(resolve, 100));
            cheatGive(109);
            yield new Promise((resolve, _) => setTimeout(resolve, 100));
            cheatGive(112);
        });
    }
    inventoryChange(event) {
        let index = -1;
        for (let itemid of event.inventory) {
            index++;
            if (index > 15)
                break;
            if (itemid === null)
                continue;
            const item = itemid.toString();
            if (!this.data[item])
                continue;
            if (!this.autoequipped.includes(item) && !this.priorityEqupped.includes(this.data[item][1]) && this.data[item][2]) {
                let target = 0;
                switch (this.data[item][1]) {
                    case EquipmentSlot.BACK:
                        target = 19;
                        break;
                    case EquipmentSlot.FEET:
                        target = 21;
                        break;
                    case EquipmentSlot.HANDS:
                        target = 20;
                        break;
                }
                StellarAPI_1.default.Input.dragInventoryItem(index, target);
                __1.default.logMessage(`Autoequipped ${this.data[item][0]} !`);
                if (this.data[item][3])
                    this.priorityEqupped.push(this.data[item][1]);
                this.autoequipped.push(item);
            }
        }
    }
    save() {
        let savedata = [];
        for (const [key, value] of Object.entries(this.data)) {
            savedata.push([key, value[2], value[3]]);
        }
        localStorage.setItem("isqol_autoequip", JSON.stringify(savedata));
    }
}
exports.default = new Autoequip();
