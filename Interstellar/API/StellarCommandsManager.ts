import Interstellar from "../Interstellar";
import StellarAPI from "./StellarAPI";

export abstract class Argument<T> {
    abstract autocomplete(split: string): string[];
    abstract extractValue(split: string): T;
    name: string;
    constructor(name: string) {
        this.name = name;
    }
}

export class OptionsArgument extends Argument<string> {
    options: string[];
    hidden: string[]
    constructor(name: string, options: string[], hidden: string[] = []) {
        super(name);
        this.options = options;
        this.hidden = hidden;
    }

    autocomplete(split: string): string[] {
        return this.options.filter((arg) => {
            return arg.startsWith(split) && !this.hidden.includes(arg);
        })
    }
    extractValue(split: string) {
        if (this.options.includes(split)) return split;
        throw `${split} is not an option of ${this.options}`;
    }
}

export class IntArgument extends Argument<number> {
    autocomplete(split: string): string[] {
        if (!isNaN(+split) && +split == Math.floor(+split)) {
            return [`$<${this.name}: Integer>`]
        }
        return [`$Error: Requires integer!`]
    }
    extractValue(split: string): number {
        if (!isNaN(+split) && +split == Math.floor(+split)) return +split;
        throw `\"${split}\" is not an integer!`;
    }
}

export class FloatArgument extends Argument<number> {
    autocomplete(split: string): string[] {
        if (!isNaN(+split)) {
            return [`$<${this.name}: Number>`]
        }
        return [`$Error: Requires integer!`]
    }
    extractValue(split: string): number {
        if (!isNaN(+split)) return +split;
        throw `\"${split}\" is not a number!`;
    }
}

export class StringArgument extends Argument<string> {
    autocomplete(split: string): string[] {
        return [`$<${this.name}: String>`]
    }
    extractValue(split: string): string {
        return split;
    }
}

export class PlayerArgument extends Argument<string> {
    autocomplete(split: string): string[] {
        if (!StellarAPI.Game.sentCrewControlRequest) {
            StellarAPI.sendPacket({
                type: StellarAPI.Packet.ClMsgTeamAct,
                act: "player_list",
                arg: null
            });
            StellarAPI.Game.sentCrewControlRequest = true;
        }
        const result = [...StellarAPI.Game.cachedPlayers].filter(name => name.toLowerCase().startsWith(split.toLowerCase()));
        return result.length == 0 ? ["$<possibly offline player...>"] : result; 
    }
    extractValue(split: string): string {
        return split;
    }
}


export abstract class BaseCommand {
    abstract name: string;
    abstract alias: string[];
    abstract arguments: Argument<any>[];
    abstract testOnly: boolean;
    requireCaptain = false;
    abstract execute(...any: any): string | undefined | void;
}

export class DrednotCommand extends BaseCommand {
    name: string;
    alias: string[];
    testOnly: boolean;
    arguments: Argument<any>[];

    constructor(name: string, aliases: string[], testOnly: boolean, args: Argument<any>[], requireCaptain = false) {
        super();
        this.name = name;
        this.alias = aliases;
        this.testOnly = testOnly;
        this.arguments = args;
        this.requireCaptain = requireCaptain;
    }

    execute(...args: string[]) {
        const command = "/" + this.name + " " + args.join(" ");
        console.log("executing drednot command", `"${command}"`);
        return command.trim();
    }
}

export class WarpCommand extends BaseCommand {
    name = "warp";
    alias = [];
    testOnly = false;
    requireCaptain = false;
    arguments = [new OptionsArgument("option", ["", "cancel", "reset"])];

    execute(arg: string) {
        if (arg == "cancel") arg = "reset"; 
        const command = "/" + this.name + " " + arg;
        return command.trim();
    }
}

class StellarCommandsManager {
    chatAutocompleteElement: HTMLDivElement = (document.getElementById("chat-autocomplete") as HTMLDivElement)!!;
    chatInputElement: HTMLInputElement = (document.getElementById("chat-input") as HTMLInputElement)!!;
    activeAutocomplete: HTMLDivElement | null = null;
    possibleAutocomplete: string[] = []
    autoIndex = -1;
    inputSplits: string[] = [""];
    

    pullingChatHistory = false;
    registeredCommands: BaseCommand[] = [];
    currentChatHistory = -1;
    chatHistory: string[] = [];

    allCommands: Record<string, BaseCommand> = {};

    constructor() {
        this.chatInputElement.addEventListener("keydown", ((event: KeyboardEvent) => {
            if (event.key == "Tab") {
                event.preventDefault();
                if (this.possibleAutocomplete.length <= 0) return;
                this.autocomplete();
            }
            else if (event.key == "Escape") {
                // @ts-ignore
                require("HTMLUIFunctions").closeChat();
            }
            else if (event.key == "ArrowUp") {
                event.preventDefault();
                if (this.activeAutocomplete) {
                    this.autoIndex -= 2;
                    if (this.autoIndex < -1) this.autoIndex = this.possibleAutocomplete.length - 2;
                    this.autocomplete();
                } else {
                    if (this.currentChatHistory == -1) {
                        this.chatHistory.unshift(this.chatInputElement.value);
                        this.currentChatHistory = 1;
                    } else this.currentChatHistory++;
                    if (this.currentChatHistory == this.chatHistory.length) this.currentChatHistory = this.chatHistory.length - 1;
                    this.chatInputElement.value = this.chatHistory[this.currentChatHistory]!!;
                    this.chatChanged(this.chatInputElement.value)
                }
            }
            else if (event.key == "ArrowDown") {
                event.preventDefault();
                if (this.activeAutocomplete) this.autocomplete();
                else {
                    if (this.currentChatHistory == -1) return;
                    if (this.currentChatHistory == 1) {
                        this.chatInputElement.value = this.chatHistory.shift()!!;
                        this.chatChanged(this.chatInputElement.value)
                        this.currentChatHistory = -1;
                        return;
                    } else this.currentChatHistory--;
                    this.chatInputElement.value = this.chatHistory[this.currentChatHistory]!!;
                    this.chatChanged(this.chatInputElement.value)
                }
            }
        }).bind(this));
        this.chatInputElement.addEventListener("input", (() => {
            if (this.currentChatHistory != -1) {
                this.chatHistory.shift();
                this.currentChatHistory = -1;
            }
            this.chatChanged(this.chatInputElement.value);
        }).bind(this))

        this.registeredCommands.push(new DrednotCommand("outfit", [], false, []))
        this.registeredCommands.push(new DrednotCommand("invite", ["inv"], false, [], true))
        this.registeredCommands.push(new DrednotCommand("debug", [], false, [new OptionsArgument("arg", ["gfx", "ctx", "vmem", "profile"])]))
        this.registeredCommands.push(new DrednotCommand("save", [], false, [], true))
        this.registeredCommands.push(new DrednotCommand("loader_cycle_time", [], false, [new IntArgument("ticks")], true))
        this.registeredCommands.push(new DrednotCommand("lockdown", ["lock"], false, [new IntArgument("ticks")], true))
        this.registeredCommands.push(new WarpCommand());
        this.registeredCommands.push(new DrednotCommand("mosaic3783", ["mosaic"], false, [], true))
        this.registeredCommands.push(new DrednotCommand("skip", [], false, [], true))
        
        this.registeredCommands.push(new DrednotCommand("ban", [], false, [new PlayerArgument("player")], true))
        this.registeredCommands.push(new DrednotCommand("kick", [], false, [new PlayerArgument("player")], true))

        this.registeredCommands.push(new DrednotCommand("skew", [], true, [], true));
        this.registeredCommands.push(new DrednotCommand("noclip", [], true, [], true));
        this.registeredCommands.push(new DrednotCommand("home", [], true, [], true));

        this.registeredCommands.forEach(element => {
            this.allCommands[element.name] = element;
            element.alias.forEach(alias => this.allCommands[alias] = element);
        });
    }

    onChatClose() {
        if (this.currentChatHistory != -1) {
            this.chatHistory.shift();
            this.currentChatHistory = -1;
        }
    }

    onMessageSend(text: string): string {
        if (this.chatHistory[0] != text) this.chatHistory.unshift(text);
        if (text.startsWith("/")) return this.executeCommand(text);
        return text;
    }

    chatChanged(text: string) {
        if (text[0] == "/") {
            text = text.substring(1);
            text = text.replace(/ +(?= )/g,'');
            this.inputSplits = text.split(" ");
            this.possibleAutocomplete = this.generateAutocompletes();
            this.possibleAutocomplete.sort();
            this.chatAutocompleteElement.innerHTML = "";
            this.chatAutocompleteElement.style.display = "";
            this.autoIndex = -1;
            for (let auto of this.possibleAutocomplete) {
                let autoelement = document.createElement("p");
                autoelement.innerText = auto.startsWith("$") ? auto.replace("$", "") : auto;
                autoelement.onclick = (event)=>{ event.preventDefault(); };
                this.chatAutocompleteElement.appendChild(autoelement)
            }
            this.updateActiveAutoComplete();
        }
        else {
            this.possibleAutocomplete = [];
            this.autoIndex = -1;
            this.inputSplits = [];
            this.chatAutocompleteElement.innerHTML = "";
            this.chatAutocompleteElement.style.display = "none";
            this.updateActiveAutoComplete();
        }
    }

    private generateAutocompletes(): string[] {
        if (this.inputSplits.length == 1) {
            const cmd = this.inputSplits[0]!!.toLowerCase();
            return Object.entries(this.allCommands).filter((elm) => {return elm[0].startsWith(cmd) && !(!Interstellar.isTestDred && elm[1].testOnly) && !(elm[1].requireCaptain && !StellarAPI.isCaptain())}).map(elm => elm[0]);
        } else {
            const cmd = this.findCommand(this.inputSplits[0]!!.toLowerCase());
            if (!cmd || this.inputSplits.length - 1 > cmd.arguments.length) return [];
            if (cmd.requireCaptain && !StellarAPI.isCaptain()) return ["$This command requires captain."]
            const argument = cmd.arguments[this.inputSplits.length - 2]!!;
            return argument.autocomplete(this.inputSplits[this.inputSplits.length - 1]!!)
        }
    }

    private updateActiveAutoComplete() {
        if (this.autoIndex == -1) {
            if (this.activeAutocomplete) {
                this.activeAutocomplete.classList.remove("active")
                this.activeAutocomplete = null;
            }
            return;
        }
        if (this.activeAutocomplete) this.activeAutocomplete.classList.remove("active")
        this.activeAutocomplete = (this.chatAutocompleteElement.children[this.autoIndex] as HTMLDivElement);
        if (this.activeAutocomplete) this.activeAutocomplete.classList.add("active");
    }

    registerCommand(command: BaseCommand) {
        this.registeredCommands.push((command as unknown) as BaseCommand);
        this.allCommands[command.name] = command
        command.alias.forEach(name => this.allCommands[name] = command);
    }

    removeCommand(name: string) {
        const command = this.findCommand(name);
        if (!command) throw `Failed to find command ${name}`;
        delete this.allCommands[command.name]
        command.alias.forEach(name => delete this.allCommands[name]);
        this.registeredCommands.splice(this.registeredCommands.indexOf(command), 1);
    }

    private autocomplete() {
        this.autoIndex++;
        const completes = this.possibleAutocomplete.filter(elm => !elm.startsWith("$"))
        if (completes.length == 0) return;
        if (this.autoIndex > completes.length - 1) this.autoIndex = 0;
        let splits = [...this.inputSplits]
        splits.pop()
        this.chatInputElement.value = "/" + (splits.join(" ").trim() + " " + completes[this.autoIndex]).trim();
        this.updateActiveAutoComplete();
    }

    private findCommand(command: string): BaseCommand | undefined {
        let cmd = command.toLowerCase();
        return Object.entries(this.allCommands).filter((elm) => {return elm[0] == cmd}).map(elm => elm[1])[0];
    }
    
    executeCommand(text: string): string {
        let splits = text.split(" ");
        splits[0] = splits[0]!!.slice(1);
        let cmd = splits.shift()!!;
        let command = this.findCommand(cmd);
        if (!command) {
            Interstellar.sendChatLog("Unknown command \"" + cmd.toLowerCase() + "\"")
            return ""
        }
        if (command.testOnly && !Interstellar.isTestDred) {
            Interstellar.sendChatLog(`${cmd.toLowerCase()} is a test only command!`)
            return ""
        }
        if (command.requireCaptain && !StellarAPI.isCaptain()) {
            Interstellar.sendChatLog(`${cmd.toLowerCase()} requires you to be captain!`)
            return ""
        }
        try {
            let args = command.arguments.map((arg, index) => arg.extractValue(splits[index] ?? ""));
            let commandResult = command.execute(...args);
            return commandResult ?? "";
        } catch (e) {
            console.error(e);
            Interstellar.sendChatLog("Failed to execute command: " + e)
            return "";
        }
    }
}

export default new StellarCommandsManager();