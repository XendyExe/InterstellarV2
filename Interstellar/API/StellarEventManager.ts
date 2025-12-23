import { BaseEvent, TriggerEvent } from "./InterstellarEvents";

type EventCtor<T extends BaseEvent = BaseEvent> = new (...args: any[]) => T;
class StellarEventManager {
    eventListeners: Record<string, Function[]> = {};
    private counter = 0;
    private eventRemovalMap: Record<number, [string, Function]> = {};
    triggerListeners: Partial<Record<TriggerEvent, Function[]>> = {};
    private triggerRemovalMap: Record<number, [TriggerEvent, Function]> = {};

    dispatchEvent(event: BaseEvent) {
        const key = event.constructor.name;
        this.eventListeners[key]?.forEach(func=>func(event));
    }

    dispatchTrigger(trigger: TriggerEvent) {
        this.triggerListeners[trigger]?.forEach(func=>func());
    }

    addEventListener(event: EventCtor, func: Function): number {
        let eventKey = event.name;
        if (this.eventListeners[eventKey]) {
            if (this.eventListeners[eventKey]!!.includes(func)) throw new Error("Attempted to register a function multiple times in a single event");
            this.eventListeners[eventKey]!!.push(func)
        }
        else this.eventListeners[eventKey] = [func]
        let id = this.counter++;
        this.eventRemovalMap[id] = [eventKey, func]
        return id;
    }

    addTriggerListener(event: TriggerEvent, func: Function): number {
        if (this.triggerListeners[event]) {
            if (this.triggerListeners[event]!!.includes(func)) throw new Error("Attempted to register a function multiple times in a single event");
            this.triggerListeners[event]!!.push(func)
        }
        else this.triggerListeners[event] = [func]
        let id = this.counter++;
        this.triggerRemovalMap[id] = [event, func]
        return id;
    }

    removeEventListener(id: number): boolean {
        if (!this.eventRemovalMap[id]) return false;
        let event = this.eventRemovalMap[id]!![0];
        let func = this.eventRemovalMap[id]!![1];
        if (!this.eventListeners[event]) return false;
        if (!this.eventListeners[event].includes(func)) return false;
        const index = this.eventListeners[event].indexOf(func);
        if (index == -1) return false;
        this.eventListeners[event].splice(index, 1)
        return true;
    }

    removeTriggerListener(id: number): boolean {
        if (!this.triggerRemovalMap[id]) return false;
        let event = this.triggerRemovalMap[id]!![0];
        let func = this.triggerRemovalMap[id]!![1];
        if (!this.triggerListeners[event]) return false;
        if (!this.triggerListeners[event].includes(func)) return false;
        const index = this.triggerListeners[event].indexOf(func);
        if (index == -1) return false;
        this.triggerListeners[event].splice(index, 1)
        return true;
    }
}

export default new StellarEventManager();