"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EquipmentSlot = void 0;
const InterstellarEvents_1 = require("@interstellar/InterstellarEvents");
const StellarAPI_1 = __importDefault(require("@interstellar/StellarAPI"));
const StellarEventManager_1 = __importDefault(require("@interstellar/StellarEventManager"));
const __1 = __importDefault(require(".."));
var EquipmentSlot;
(function (EquipmentSlot) {
    EquipmentSlot["BACK"] = "Back";
    EquipmentSlot["FEET"] = "Feet";
    EquipmentSlot["HANDS"] = "Hands";
})(EquipmentSlot || (exports.EquipmentSlot = EquipmentSlot = {}));
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
