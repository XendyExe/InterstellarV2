import { JoinShipRequestEvent, RenderBigShipEntryEvent, RenderShiplistSidebarEvent, RenderSmallShipEntryEvent, TriggerEvent, FilterShipEvent } from "@interstellar/InterstellarEvents";
import StellarAPI from "@interstellar/StellarAPI";
import StellarEventManager from "@interstellar/StellarEventManager";
import { Attributes, Component, ComponentChildren, h, Ref, RenderableProps,  } from "preact";
import { Dispatch, StateUpdater, useState } from "preact/hooks";

type Props = {
    shipTags: ShipTags,
    parent: Component
}
class ShipTagSidebar extends Component<Props> {
    parent: ShipTags;
    parentElement: Component;
    constructor(props: Props) {
        super(props);
        this.parent = props.shipTags;
        this.parentElement = props.parent;
    }
    render(props?: RenderableProps<Props, any> | undefined, state?: Readonly<{tags: string[]}> | undefined, context?: any): ComponentChildren {
        return <section>
            <h3>Ship Tags</h3>
            <div style={{
                display: "flex",
                flexDirection: "column"
            }}>
                {...this.parent.shipTags.tags.map(tag => <span>
                <button onClick={() => {
                    StellarAPI.UI.showPrompt("Delete tag " + tag + "?", "Are you sure you want to delete this tag? This will remove it from all ships!", () => {
                        this.parent.removeTag(tag);
                        this.forceUpdate();
                    })
                }}>X</button>
                <input type="checkbox" onChange={(e) => {
                let target = e.target as HTMLInputElement;
                this.parentElement.forceUpdate();
                if (target.checked) this.parent.filterSearch.add(tag);
                else this.parent.filterSearch.delete(tag);
            }}/> {tag}</span>)}
            </div>

            <div><p>Create new tag:</p><input id="isqol-tag-create"/><button onClick={() => {
                const element = document.getElementById("isqol-tag-create") as HTMLInputElement;
                const tagName = element.value.trim();
                if (tagName.length == 0) return StellarAPI.UI.showPrompt("Invalid Tag", "Tags cannot be empty!", ()=>{});
                if (this.parent.shipTags.tags.includes(tagName)) return StellarAPI.UI.showPrompt("Invalid Tag", "Tag already exists", ()=>{});
                this.parent.shipTags.tags.push(tagName);
                this.parent.save();
                this.forceUpdate();
            }}>Create</button></div>
            <div>Right click on ships to assign tags to them. Use checkboxes to filter by tags. Click the X to delete the tag.</div>
        </section>
    }
}

type ShipTagEditorProps = {
    parent: ShipTags,
    update: any,
    hex_code: string,
    name: string
}
class ShipTagEditor extends Component<ShipTagEditorProps> {
    render(props: ShipTagEditorProps, state?: Readonly<{}> | undefined, context?: any): ComponentChildren {
        let ship = props.parent.shipTags.ships[props.hex_code] ?? (props.parent.shipTags.ships[props.hex_code] = []);
        return <div>
            <h2>Edit tags for ship {props.name} {`{${props.hex_code}}`}</h2>
            <div style={{
                display: "flex",
                flexDirection: "column"
            }}>
                {...props.parent.shipTags.tags.map(tag => <span>
                        <input onChange={(e) => {
                            let target = e.target as HTMLInputElement;
                            if (target.checked) {
                                if (!ship.includes(tag)) ship.push(tag);
                            } else {
                                let index = ship.indexOf(tag);
                                if (index != -1) ship.splice(index, 1);
                            }
                            props.update();
                            props.parent.save();
                        }} type="checkbox" checked={ship.includes(tag)}/>
                        {tag}
                    </span>
                )}
            </div>
        </div>
    }
    constructor(props: ShipTagEditorProps) {
        super(props);
    }
    
}

export default class ShipTags {
    shipTags: {tags: string[], ships: Record<string, string[]>} = {tags: [], ships: {}};
    filterSearch: Set<string> = new Set();
    proballyUnsafe: any = null;
    updateUnsafe() {
        if (this.proballyUnsafe) this.proballyUnsafe.forceUpdate();
    }
    constructor() {
        this.load();
        StellarEventManager.addEventListener(RenderBigShipEntryEvent, this.renderBigShip.bind(this))
        StellarEventManager.addEventListener(RenderSmallShipEntryEvent, this.renderSmallShip.bind(this))
        StellarEventManager.addEventListener(RenderShiplistSidebarEvent, this.renderSidebar.bind(this))
        StellarEventManager.addEventListener(FilterShipEvent, this.filterShip.bind(this))
    }

    filterShip(event: FilterShipEvent) {
        let ship_tags = this.shipTags.ships[event.data.ship.hex_code] ?? [];
        for (let filter of this.filterSearch) {
            if (!ship_tags.includes(filter)) event.removeFromShipyard();
        }
    }

    load() {
        let storage = localStorage.getItem("isqol-shiptags");
        if (storage) {
            try {
                this.shipTags = JSON.parse(storage);
                return;
            }
            catch {}
        }
        this.shipTags = {tags: ["Favorite"], ships: {}};
    }
    renderBigShip(event: RenderBigShipEntryEvent) {
        let props = (event.component.props as any);
        // @ts-ignore
        event.node.props.onContextMenu = this.createShipTagEditor(props.hex_code, props.name, this.updateUnsafe.bind(this));
        // @ts-ignore
        let tagContainer = event.node.props.children[0].props.children;
        if (tagContainer && this.shipTags.ships[props.hex_code]) {
            for (let tag of this.shipTags.ships[props.hex_code]!!) tagContainer.push(<div><span style="color: rgb(0, 255, 0);">{tag}</span></div>)
        }
    }

    renderSmallShip(event: RenderSmallShipEntryEvent) {
        let props = (event.component.props as any);
        // @ts-ignore
        event.node.props.onContextMenu = this.createShipTagEditor(props.hex_code, props.name, ()=>{});
    }

    createShipTagEditor(shipHex: string, shipName: string, update: any) {
        return (event: Event) => {
            event.preventDefault();
            StellarAPI.UI.openModal(<ShipTagEditor parent={this} hex_code={shipHex} name={shipName} update={update}/>)
        }
    }
    removeTag(tag: string) {
        let i = this.shipTags.tags.indexOf(tag);
        if (i == -1) return;
        this.shipTags.tags.splice(i, 1);
        for (let ship of Object.keys(this.shipTags.ships)) this.shipTags.ships[ship] = this.shipTags.ships[ship]!!.filter(a => a != tag);
        this.save();
        this.updateUnsafe();
    }
    save() {
        const compressedTags: Record<string, string[]> = {};
        for (let [key, value] of Object.entries(this.shipTags.ships)) {
            if (value.length > 0) compressedTags[key] = value;
        }
        localStorage.setItem("isqol-shiptags", JSON.stringify({tags: this.shipTags.tags, ships: compressedTags}));
    }
    renderSidebar(event: RenderShiplistSidebarEvent) {
        this.proballyUnsafe = event.component;
        (event.node.props.children as any[]).push(<ShipTagSidebar shipTags={this} parent={event.component}/>)
    }
}