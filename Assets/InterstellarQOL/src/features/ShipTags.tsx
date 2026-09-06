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
                <input type="checkbox" title="Show ONLY ships with this tag" onChange={(e) => {
                let target = e.target as HTMLInputElement;
                this.parentElement.forceUpdate();
                if (target.checked) this.parent.filterSearch.add(tag);
                else this.parent.filterSearch.delete(tag);
            }}/>
                <button title={this.parent.hideSearch.has(tag) ? `Hiding ships tagged “${tag}” — click to show them` : `Hide every ship tagged “${tag}”`}
                    style={"display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;padding:0;margin:0 3px;border-radius:4px;cursor:pointer;vertical-align:middle;line-height:0;" + (this.parent.hideSearch.has(tag) ? "background:#c0392b;border:1px solid #e74c3c;color:#fff;" : "background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.20);color:#dfe7e2;")}
                    onClick={() => {
                        if (this.parent.hideSearch.has(tag)) this.parent.hideSearch.delete(tag);
                        else this.parent.hideSearch.add(tag);
                        this.parent.save();
                        this.parentElement.forceUpdate(); // re-run the shipyard filter
                        this.forceUpdate();                // refresh this button's active state
                    }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                </button> {tag}</span>)}
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
            <div>Right click on ships to assign tags to them. The checkbox filters to only that tag; the eye-off button hides every ship with that tag (stays hidden until you click it again). Click the X to delete the tag.</div>
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
    hideSearch: Set<string> = new Set(); // tags whose ships are HIDDEN — the inverse of filterSearch; persisted
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
        // hide modifier: if a ship carries ANY tag marked "hide", drop it from the shipyard
        for (let hidden of this.hideSearch) {
            if (ship_tags.includes(hidden)) { event.removeFromShipyard(); break; }
        }
    }

    load() {
        let storage = localStorage.getItem("isqol-shiptags");
        if (storage) {
            try {
                this.shipTags = JSON.parse(storage);
            }
            catch {}
        }
        if (!this.shipTags || !this.shipTags.tags) this.shipTags = {tags: ["Favorite"], ships: {}};
        // restore the persisted "hide these tags" modifiers (only for tags that still exist)
        try {
            const hidden = JSON.parse(localStorage.getItem("isqol-shiptags-hidden") ?? "[]");
            if (Array.isArray(hidden)) this.hideSearch = new Set(hidden.filter(t => this.shipTags.tags.includes(t)));
        }
        catch {}
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
        this.filterSearch.delete(tag);
        this.hideSearch.delete(tag);
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
        localStorage.setItem("isqol-shiptags-hidden", JSON.stringify([...this.hideSearch]));
    }
    renderSidebar(event: RenderShiplistSidebarEvent) {
        this.proballyUnsafe = event.component;
        (event.node.props.children as any[]).push(<ShipTagSidebar shipTags={this} parent={event.component}/>)
    }
}
