import { InventoryChangeEvent, JoinShipRequestEvent } from "@interstellar/InterstellarEvents";
import StellarAPI from "@interstellar/StellarAPI";
import StellarEventManager from "@interstellar/StellarEventManager";
import InterstellarQOL from "..";

export enum EquipmentSlot {
    BACK = "Back", 
    FEET = "Feet", 
    HANDS = "Hands"
}

class Autoequip {
    items: [number, string, EquipmentSlot][] = [
        [108, "Backpack", EquipmentSlot.BACK],
        [109, "Speed Skates", EquipmentSlot.FEET],
        [110, "Booster Boots", EquipmentSlot.FEET],
        [111, "Launcher Gauntlets", EquipmentSlot.HANDS],
        [112, "Construction Gauntlets", EquipmentSlot.HANDS],
        [113, "Rocket Pack", EquipmentSlot.BACK],
        [114, "Hover Pack", EquipmentSlot.BACK]
    ]

    data: Record<string, [string, EquipmentSlot, boolean, boolean]> = {}
    autoequipped: string[] = [];
    priorityEqupped: EquipmentSlot[] = [];
    constructor() {
        this.items.forEach(elm => {
            this.data[elm[0]] = [elm[1], elm[2], false, false]
        });
        if (localStorage.getItem("isqol_autoequip")) {
            let json = JSON.parse(localStorage.getItem("isqol_autoequip")!!);
            json.forEach((elm: [string, boolean, boolean]) => {
                this.data[elm[0]]!![2] = elm[1]
                this.data[elm[0]]!![3] = elm[2]
            })
        }
        this.save();
        StellarEventManager.addEventListener(InventoryChangeEvent, this.inventoryChange.bind(this));
        StellarEventManager.addEventListener(JoinShipRequestEvent, (() => {
            this.autoequipped = [];
            this.priorityEqupped = [];
        }).bind(this))
    }

    inventoryChange(event: InventoryChangeEvent) {
        let index = -1;
        for (let itemid of event.inventory) {
            index++;
            if (index > 15) break;
            if (itemid === null) continue;
            const item = itemid.toString();
            if (!this.data[item]) continue;
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
                StellarAPI.Input.dragInventoryItem(index, target);
                InterstellarQOL.logMessage(`Autoequipped ${this.data[item][0]} !`)
                if (this.data[item][3]) this.priorityEqupped.push(this.data[item][1]);
                this.autoequipped.push(item)
            }
        }
    } 

    save() {
        let savedata: [string, boolean, boolean][] = [];
        for (const [key, value] of Object.entries(this.data)) {
            savedata.push([key, value[2], value[3]])
        }
        localStorage.setItem("isqol_autoequip", JSON.stringify(savedata))
    }
}

export default new Autoequip();