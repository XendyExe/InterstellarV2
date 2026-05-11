import { Attributes, Component, ComponentChildren, h, MouseEventHandler, Ref, VNode } from "preact";
import StellarAPI from "./StellarAPI";

export abstract class BaseModSetting<T> {
    value: T;
    name: string;
    description: string;
    onChange: any;
    constructor(name: string, description: string, defaultValue: T) {
        this.name = name;
        this.description = description;
        this.value = defaultValue;
    }

    abstract deserialize(value: any): any;
    abstract serialize(): any;
    abstract getRender(state: any, setState: any, requestSerialize: any): VNode;
}

export class BooleanModSetting extends BaseModSetting<boolean> {
    deserialize(value: any) {
        if (value === true || value === false) this.value = value;
    }
    serialize() {
        return this.value;
    }
    getRender(state: any, setState: any, requestSerialize: any): VNode {
        return <div>
            <span>{this.name} <input type="checkbox" checked={state[this.name]} onChange={(e) => {
                if (!e.target) return;
                let target = e.target!! as HTMLInputElement;
                this.value = target.checked;
                setState({[this.name]: this.value})
                requestSerialize();
                if (this.onChange) this.onChange();
            }}></input></span>
            <p>{this.description}</p>
        </div>
    }

}

export class DropdownModSetting extends BaseModSetting<string> {
    options: string[];
    constructor(name: string, description: string, defaultValue: any, options: string[]) {
        super(name, description, defaultValue);
        this.options = options;
    }
    deserialize(value: any) {
        if (this.options.includes(value)) this.value = value;
    }
    serialize() {
        return this.value;
    }
    getRender(state: any, setState: any, requestSerialize: any): VNode {
        return <div>
            <span>{this.name} <select onChange={(e) => {
                if (!e.target) return;
                let target = e.target!! as HTMLSelectElement;
                this.value = this.options[target.selectedIndex]!!;
                setState({[this.name]: this.value})
                requestSerialize();
                if (this.onChange) this.onChange();
            }}>
                {...this.options.map((v) => <option value={v} selected={v == state[this.name]}>v</option>)}
            </select></span>
            <p>{this.description}</p>
        </div>
    }

}

export class SliderModSetting extends BaseModSetting<number> {
    min: number;
    max: number;
    step: number;
    constructor(name: string, description: string, defaultValue: any, min: number, max: number, step: number) {
        super(name, description, defaultValue);
        this.min = min;
        this.max = max;
        this.step = step;
    }
    deserialize(value: any) {
        if (Number.isFinite(value) && this.min <= value && value <= this.max) this.value = value;
    }
    serialize() {
        return this.value;
    }
    getRender(state: any, setState: any): VNode {
        throw new Error("Method not implemented.");
    }   
}

export class InputModSetting extends BaseModSetting<string> {
    deserialize(value: any) {
        this.value = value;
    }
    serialize() {
        return this.value;
    }
    getRender(state: any, setState: any): VNode {
        throw new Error("Method not implemented.");
    }
}

export class ButtonModSetting extends BaseModSetting<null> {
    onClick: MouseEventHandler<HTMLButtonElement>;
    constructor(name: string, description: string, onClick: MouseEventHandler<HTMLButtonElement>) {
        super(name, description, null);
        this.onClick = onClick;
    }

    deserialize(value: any) {}
    serialize() {}

    getRender(state: any, setState: any): VNode {
        return <div><button onClick={this.onClick}>{this.name}</button><p>{this.description}</p></div>
    }
}

type Props = {
  modId: string;
  modname: string;
  options: BaseModSetting<any>[];
};
export default class ModConfiguration extends Component<Props> {
    options: BaseModSetting<any>[]
    localStorageKey: string;
    modname: string;
    constructor(props: Props) {
        super(props);
        const options = props.options;
        const modId = props.modId;
        this.modname = props.modname;
        this.options = options;
        let names: string[] = [];
        for (let option of options) {
            if (names.includes(option.name)) throw "Mod options must have different names";
            names.push(option.name);
        }
        this.localStorageKey = "INTERSTELLAR_SETTING(" + modId + ")";
        let stored = localStorage.getItem(this.localStorageKey);
        if (!stored) { stored = "{}"; }
        let json;
        try {
            json = JSON.parse(stored)
        } catch {
            json = {}
        }
        const state: any = {};
        for (const option of options) {
            if (json[option.name] !== void 0) option.deserialize(json[option.name]);
            // @ts-ignore
            state[option.name] = option.value;
        }
        this.state = state;
    }
    render(props?: Readonly<Attributes & { children?: ComponentChildren; ref?: Ref<any>; }> | undefined, state?: Readonly<{}> | undefined, context?: any): ComponentChildren {
        console.log(state);
        return <div class="window darker">
            <div class="close">
                <button class="btn-red" onClick={() => StellarAPI.UI.toggleUI()}>
                    Close
                </button>
            </div>
            <h2>Settings for {this.modname}</h2>
            <section>
            {...this.options.map((option) => option.getRender(state, this.setState.bind(this), this.save.bind(this)))}
            </section>
        </div>
    }

    save() {
        const saveJson: Record<string, any> = {};
        for (let option of this.options) {
            saveJson[option.name] = option.serialize();
        }
        localStorage.setItem(this.localStorageKey, JSON.stringify(saveJson));
    }
}

export function createModConfigurationExports() {
    const exports: Record<string, any> = {};
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = ModConfiguration;
    exports.BaseModSetting = BaseModSetting;
    exports.BooleanModSetting = BooleanModSetting;
    exports.DropdownModSetting = DropdownModSetting;
    exports.SliderModSetting = SliderModSetting;
    exports.InputModSetting = InputModSetting;
    exports.ButtonModSetting = ButtonModSetting;
    return exports;
}