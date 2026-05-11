import Interstellar from "../Interstellar";

export class StellarNotif {
    private _title: string;
    private _color: string;
    private _description: string;
    constructor(title: string, color: string, description: string) {
        this._title = title;
        this._color = color;
        this._description = description;
        this.log();
    }

    async setDescription(description: string) {
        this._description = description;
        this.log();
        Interstellar.yield();
    }

    async setProgress(name: string, progress: number, max: number) {
        Interstellar.yield();
    }
    
    complete() {
        
    }

    log(){
        console.log(`Stellar notif:\n${this._title}\n${this._description}`)
    }

}

export function createNotification(title:string, description: string, color:string): StellarNotif {
    return new StellarNotif(title, color, description);
}