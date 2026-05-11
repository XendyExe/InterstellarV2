"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const InterstellarEvents_1 = require("@interstellar/InterstellarEvents");
const StellarAPI_1 = __importDefault(require("@interstellar/StellarAPI"));
const StellarEventManager_1 = __importDefault(require("@interstellar/StellarEventManager"));
const preact_1 = require("preact");
class ShipTagSidebar extends preact_1.Component {
    constructor(props) {
        super(props);
        this.parent = props.shipTags;
        this.parentElement = props.parent;
    }
    render(props, state, context) {
        return (0, preact_1.h)("section", null,
            (0, preact_1.h)("h3", null, "Ship Tags"),
            (0, preact_1.h)("div", { style: {
                    display: "flex",
                    flexDirection: "column"
                } }, ...this.parent.shipTags.tags.map(tag => (0, preact_1.h)("span", null,
                (0, preact_1.h)("button", { onClick: () => {
                        StellarAPI_1.default.UI.showPrompt("Delete tag " + tag + "?", "Are you sure you want to delete this tag? This will remove it from all ships!", () => {
                            this.parent.removeTag(tag);
                            this.forceUpdate();
                        });
                    } }, "X"),
                (0, preact_1.h)("input", { type: "checkbox", onChange: (e) => {
                        let target = e.target;
                        this.parentElement.forceUpdate();
                        if (target.checked)
                            this.parent.filterSearch.add(tag);
                        else
                            this.parent.filterSearch.delete(tag);
                    } }),
                " ",
                tag))),
            (0, preact_1.h)("div", null,
                (0, preact_1.h)("p", null, "Create new tag:"),
                (0, preact_1.h)("input", { id: "isqol-tag-create" }),
                (0, preact_1.h)("button", { onClick: () => {
                        const element = document.getElementById("isqol-tag-create");
                        const tagName = element.value.trim();
                        if (tagName.length == 0)
                            return StellarAPI_1.default.UI.showPrompt("Invalid Tag", "Tags cannot be empty!", () => { });
                        if (this.parent.shipTags.tags.includes(tagName))
                            return StellarAPI_1.default.UI.showPrompt("Invalid Tag", "Tag already exists", () => { });
                        this.parent.shipTags.tags.push(tagName);
                        this.parent.save();
                        this.forceUpdate();
                    } }, "Create")),
            (0, preact_1.h)("div", null, "Right click on ships to assign tags to them. Use checkboxes to filter by tags. Click the X to delete the tag."));
    }
}
class ShipTagEditor extends preact_1.Component {
    render(props, state, context) {
        var _a;
        let ship = (_a = props.parent.shipTags.ships[props.hex_code]) !== null && _a !== void 0 ? _a : (props.parent.shipTags.ships[props.hex_code] = []);
        return (0, preact_1.h)("div", null,
            (0, preact_1.h)("h2", null,
                "Edit tags for ship ",
                props.name,
                " ",
                `{${props.hex_code}}`),
            (0, preact_1.h)("div", { style: {
                    display: "flex",
                    flexDirection: "column"
                } }, ...props.parent.shipTags.tags.map(tag => (0, preact_1.h)("span", null,
                (0, preact_1.h)("input", { onChange: (e) => {
                        let target = e.target;
                        if (target.checked) {
                            if (!ship.includes(tag))
                                ship.push(tag);
                        }
                        else {
                            let index = ship.indexOf(tag);
                            if (index != -1)
                                ship.splice(index, 1);
                        }
                        props.update();
                        props.parent.save();
                    }, type: "checkbox", checked: ship.includes(tag) }),
                tag))));
    }
    constructor(props) {
        super(props);
    }
}
class ShipTags {
    updateUnsafe() {
        if (this.proballyUnsafe)
            this.proballyUnsafe.forceUpdate();
    }
    constructor() {
        this.shipTags = { tags: [], ships: {} };
        this.filterSearch = new Set();
        this.proballyUnsafe = null;
        this.load();
        StellarEventManager_1.default.addEventListener(InterstellarEvents_1.RenderBigShipEntryEvent, this.renderBigShip.bind(this));
        StellarEventManager_1.default.addEventListener(InterstellarEvents_1.RenderSmallShipEntryEvent, this.renderSmallShip.bind(this));
        StellarEventManager_1.default.addEventListener(InterstellarEvents_1.RenderShiplistSidebarEvent, this.renderSidebar.bind(this));
        StellarEventManager_1.default.addEventListener(InterstellarEvents_1.FilterShipEvent, this.filterShip.bind(this));
    }
    filterShip(event) {
        var _a;
        let ship_tags = (_a = this.shipTags.ships[event.data.ship.hex_code]) !== null && _a !== void 0 ? _a : [];
        for (let filter of this.filterSearch) {
            if (!ship_tags.includes(filter))
                event.removeFromShipyard();
        }
    }
    load() {
        let storage = localStorage.getItem("isqol-shiptags");
        if (storage) {
            try {
                this.shipTags = JSON.parse(storage);
                return;
            }
            catch (_a) { }
        }
        this.shipTags = { tags: ["Favorite"], ships: {} };
    }
    renderBigShip(event) {
        let props = event.component.props;
        // @ts-ignore
        event.node.props.onContextMenu = this.createShipTagEditor(props.hex_code, props.name, this.updateUnsafe.bind(this));
        // @ts-ignore
        let tagContainer = event.node.props.children[0].props.children;
        if (tagContainer && this.shipTags.ships[props.hex_code]) {
            for (let tag of this.shipTags.ships[props.hex_code])
                tagContainer.push((0, preact_1.h)("div", null,
                    (0, preact_1.h)("span", { style: "color: rgb(0, 255, 0);" }, tag)));
        }
    }
    renderSmallShip(event) {
        let props = event.component.props;
        // @ts-ignore
        event.node.props.onContextMenu = this.createShipTagEditor(props.hex_code, props.name, () => { });
    }
    createShipTagEditor(shipHex, shipName, update) {
        return (event) => {
            event.preventDefault();
            StellarAPI_1.default.UI.openModal((0, preact_1.h)(ShipTagEditor, { parent: this, hex_code: shipHex, name: shipName, update: update }));
        };
    }
    removeTag(tag) {
        let i = this.shipTags.tags.indexOf(tag);
        if (i == -1)
            return;
        this.shipTags.tags.splice(i, 1);
        for (let ship of Object.keys(this.shipTags.ships))
            this.shipTags.ships[ship] = this.shipTags.ships[ship].filter(a => a != tag);
        this.save();
        this.updateUnsafe();
    }
    save() {
        const compressedTags = {};
        for (let [key, value] of Object.entries(this.shipTags.ships)) {
            if (value.length > 0)
                compressedTags[key] = value;
        }
        localStorage.setItem("isqol-shiptags", JSON.stringify({ tags: this.shipTags.tags, ships: compressedTags }));
    }
    renderSidebar(event) {
        this.proballyUnsafe = event.component;
        event.node.props.children.push((0, preact_1.h)(ShipTagSidebar, { shipTags: this, parent: event.component }));
    }
}
exports.default = ShipTags;
