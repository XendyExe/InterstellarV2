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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommands = registerCommands;
const StellarCommandsManager_1 = __importStar(require("@interstellar/StellarCommandsManager"));
const __1 = __importDefault(require(".."));
const StellarAPI_1 = __importDefault(require("@interstellar/StellarAPI"));
const StellarQOL_1 = __importDefault(require("../StellarQOL"));
class GravityCommand extends StellarCommandsManager_1.BaseCommand {
    constructor() {
        super(...arguments);
        this.name = "gravity";
        this.alias = ["grav"];
        this.testOnly = false;
        this.argToIndex = {
            "up": 1,
            "left": 2,
            "right": 3,
            "down": 0,
            "0": 0,
            "1": 1,
            "2": 2,
            "3": 3,
            "^": 1,
            "<": 2,
            ">": 3,
            "v": 0,
            "lf": 2,
            "rt": 3,
            "dn": 0
        };
        this.arguments = [new StellarCommandsManager_1.OptionsArgument("direction", Object.keys(this.argToIndex), ["0", "1", "2", "3"])];
    }
    execute(direction) {
        __1.default.logMessage("Changed gravity!");
        console.log();
        StellarAPI_1.default.sendPacket({ type: StellarAPI_1.default.Packet.ClMsgTeamAct, arg: this.argToIndex[direction], act: "gravity" });
    }
}
class LeaveCommand extends StellarCommandsManager_1.BaseCommand {
    constructor() {
        super(...arguments);
        this.name = "leave";
        this.alias = [];
        this.testOnly = false;
        this.arguments = [];
    }
    execute() {
        StellarAPI_1.default.Game.leaveShip();
    }
}
class PrivateCommand extends StellarCommandsManager_1.BaseCommand {
    constructor() {
        super(...arguments);
        this.name = "private";
        this.alias = [];
        this.testOnly = false;
        this.arguments = [];
    }
    execute() {
        __1.default.logMessage("Set ship to private!");
        StellarAPI_1.default.sendPacket({
            type: StellarAPI_1.default.Packet.ClMsgTeamAct,
            act: "set_privacy",
            arg: 1
        });
    }
}
class PublicCommand extends StellarCommandsManager_1.BaseCommand {
    constructor() {
        super(...arguments);
        this.name = "public";
        this.alias = [];
        this.testOnly = false;
        this.arguments = [];
    }
    execute() {
        __1.default.logMessage("Set ship to public!");
        StellarAPI_1.default.sendPacket({
            type: StellarAPI_1.default.Packet.ClMsgTeamAct,
            act: "set_privacy",
            arg: 0
        });
    }
}
class BetterBanCommand extends StellarCommandsManager_1.BaseCommand {
    constructor() {
        super(...arguments);
        this.name = "ban";
        this.alias = [];
        this.testOnly = false;
        this.arguments = [new StellarCommandsManager_1.PlayerArgument("player")];
        this.requireCaptain = true;
    }
    execute(player) {
        StellarAPI_1.default.sendPacket({
            type: StellarAPI_1.default.Packet.ClMsgTeamAct,
            act: "player_list",
            arg: null
        });
        StellarQOL_1.default.banPlayer(player);
    }
}
class BetterKickCommand extends StellarCommandsManager_1.BaseCommand {
    constructor() {
        super(...arguments);
        this.name = "kick";
        this.alias = [];
        this.testOnly = false;
        this.arguments = [new StellarCommandsManager_1.PlayerArgument("player")];
        this.requireCaptain = true;
    }
    execute(player) {
        StellarAPI_1.default.sendPacket({
            type: StellarAPI_1.default.Packet.ClMsgTeamAct,
            act: "player_list",
            arg: null
        });
        StellarQOL_1.default.kickPlayer(player);
    }
}
class UnbanCommand extends StellarCommandsManager_1.BaseCommand {
    constructor() {
        super(...arguments);
        this.name = "unban";
        this.alias = ["pardon"];
        this.testOnly = false;
        this.arguments = [new StellarCommandsManager_1.PlayerArgument("player")];
        this.requireCaptain = true;
    }
    execute(player) {
        StellarAPI_1.default.sendPacket({
            type: StellarAPI_1.default.Packet.ClMsgTeamAct,
            act: "player_list",
            arg: null
        });
        StellarQOL_1.default.unbanPlayer(player);
    }
}
class GuestCommand extends StellarCommandsManager_1.BaseCommand {
    constructor() {
        super(...arguments);
        this.name = "guest";
        this.alias = [];
        this.testOnly = false;
        this.arguments = [new StellarCommandsManager_1.PlayerArgument("player")];
        this.requireCaptain = true;
    }
    execute(player) {
        StellarAPI_1.default.sendPacket({
            type: StellarAPI_1.default.Packet.ClMsgTeamAct,
            act: "player_list",
            arg: null
        });
        StellarQOL_1.default.guestPlayer(player);
    }
}
class CrewCommand extends StellarCommandsManager_1.BaseCommand {
    constructor() {
        super(...arguments);
        this.name = "crew";
        this.alias = [];
        this.testOnly = false;
        this.arguments = [new StellarCommandsManager_1.PlayerArgument("player")];
        this.requireCaptain = true;
    }
    execute(player) {
        StellarAPI_1.default.sendPacket({
            type: StellarAPI_1.default.Packet.ClMsgTeamAct,
            act: "player_list",
            arg: null
        });
        StellarQOL_1.default.crewPlayer(player);
    }
}
class CapCommand extends StellarCommandsManager_1.BaseCommand {
    constructor() {
        super(...arguments);
        this.name = "captain";
        this.alias = ["cap"];
        this.testOnly = false;
        this.arguments = [new StellarCommandsManager_1.PlayerArgument("player")];
        this.requireCaptain = true;
    }
    execute(player) {
        StellarAPI_1.default.sendPacket({
            type: StellarAPI_1.default.Packet.ClMsgTeamAct,
            act: "player_list",
            arg: null
        });
        StellarQOL_1.default.capPlayer(player);
    }
}
class ChangeFireModeCommand extends StellarCommandsManager_1.BaseCommand {
    constructor() {
        super(...arguments);
        this.name = "changefiremode";
        this.alias = ["cfm"];
        this.testOnly = false;
        this.arguments = [new StellarCommandsManager_1.OptionsArgument("mode", ["continuous", "volley", "toggle"])];
    }
    execute(option) {
        if (option == "continuous") {
            __1.default.logMessage("Turret mode set to continuous!");
            StellarAPI_1.default.DrednotSettings.getSettings().turret_mode = StellarAPI_1.default.DrednotSettings.TurretModes.ContinuousFire;
        }
        else if (option == "volley") {
            __1.default.logMessage("Turret mode set to volley!");
            StellarAPI_1.default.DrednotSettings.getSettings().turret_mode = StellarAPI_1.default.DrednotSettings.TurretModes.VolleyFire;
        }
        else if (option == "toggle") {
            if (StellarAPI_1.default.DrednotSettings.getSettings().turret_mode == StellarAPI_1.default.DrednotSettings.TurretModes.ContinuousFire) {
                __1.default.logMessage("Turret mode set to volley!");
                StellarAPI_1.default.DrednotSettings.getSettings().turret_mode = StellarAPI_1.default.DrednotSettings.TurretModes.VolleyFire;
            }
            else {
                __1.default.logMessage("Turret mode set to continuous!");
                StellarAPI_1.default.DrednotSettings.getSettings().turret_mode = StellarAPI_1.default.DrednotSettings.TurretModes.ContinuousFire;
            }
        }
    }
}
function registerCommands() {
    StellarCommandsManager_1.default.registerCommand(new GravityCommand());
    StellarCommandsManager_1.default.registerCommand(new LeaveCommand());
    StellarCommandsManager_1.default.registerCommand(new PrivateCommand());
    StellarCommandsManager_1.default.registerCommand(new PublicCommand());
    StellarCommandsManager_1.default.removeCommand("ban");
    StellarCommandsManager_1.default.removeCommand("kick");
    StellarCommandsManager_1.default.registerCommand(new BetterBanCommand());
    StellarCommandsManager_1.default.registerCommand(new BetterKickCommand());
    StellarCommandsManager_1.default.registerCommand(new UnbanCommand());
    StellarCommandsManager_1.default.registerCommand(new GuestCommand());
    StellarCommandsManager_1.default.registerCommand(new CrewCommand());
    StellarCommandsManager_1.default.registerCommand(new CapCommand());
    StellarCommandsManager_1.default.registerCommand(new ChangeFireModeCommand());
}
