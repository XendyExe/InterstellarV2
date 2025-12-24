import StellarCommandManager, { Argument, BaseCommand, OptionsArgument, PlayerArgument } from "@interstellar/StellarCommandsManager";
import InterstellarQOL from "..";
import StellarAPI from "@interstellar/StellarAPI";
import StellarQOL from "../StellarQOL";

class GravityCommand extends BaseCommand {
    name = "gravity";
    alias = ["grav"];
    testOnly = false;
    argToIndex: Record<string, number> = {
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
    }
    arguments = [new OptionsArgument("direction", Object.keys(this.argToIndex), ["0", "1", "2", "3"])];
    execute(direction: string) {
        InterstellarQOL.logMessage("Changed gravity!");
        console.log()
        StellarAPI.sendPacket({type: StellarAPI.Packet.ClMsgTeamAct, arg: this.argToIndex[direction], act: "gravity"})
    }
}

class LeaveCommand extends BaseCommand {
    name = "leave"
    alias = []
    testOnly = false;
    arguments = [];
    execute() {
        StellarAPI.Game.leaveShip();
    }
}

class PrivateCommand extends BaseCommand {
    name = "private"
    alias = []
    testOnly = false;
    arguments = [];
    execute() {
        InterstellarQOL.logMessage("Set ship to private!")
        StellarAPI.sendPacket({
            type: StellarAPI.Packet.ClMsgTeamAct,
            act: "set_privacy",
            arg: 1
        })
    }
}

class PublicCommand extends BaseCommand {
    name = "public"
    alias = []
    testOnly = false;
    arguments = [];
    execute() {
        InterstellarQOL.logMessage("Set ship to public!")
        StellarAPI.sendPacket({
            type: StellarAPI.Packet.ClMsgTeamAct,
            act: "set_privacy",
            arg: 0
        })
    }
}

class BetterBanCommand extends BaseCommand {
    name = "ban"
    alias = []
    testOnly = false;
    arguments = [new PlayerArgument("player")];
    requireCaptain = true;
    execute(player: string) {
        StellarAPI.sendPacket({
            type: StellarAPI.Packet.ClMsgTeamAct,
            act: "player_list",
            arg: null
        });
        StellarQOL.banPlayer(player);
    }
}

class BetterKickCommand extends BaseCommand {
    name = "kick"
    alias = []
    testOnly = false;
    arguments = [new PlayerArgument("player")];
    requireCaptain = true;
    execute(player: string) {
        StellarAPI.sendPacket({
            type: StellarAPI.Packet.ClMsgTeamAct,
            act: "player_list",
            arg: null
        });
        StellarQOL.kickPlayer(player);
    }
}

class UnbanCommand extends BaseCommand {
    name = "unban"
    alias = ["pardon"]
    testOnly = false;
    arguments = [new PlayerArgument("player")];
    requireCaptain = true;
    execute(player: string) {
        StellarAPI.sendPacket({
            type: StellarAPI.Packet.ClMsgTeamAct,
            act: "player_list",
            arg: null
        });
        StellarQOL.unbanPlayer(player);
    }
}

class GuestCommand extends BaseCommand {
    name = "guest"
    alias = []
    testOnly = false;
    arguments = [new PlayerArgument("player")];
    requireCaptain = true;
    execute(player: string) {
        StellarAPI.sendPacket({
            type: StellarAPI.Packet.ClMsgTeamAct,
            act: "player_list",
            arg: null
        });
        StellarQOL.guestPlayer(player);
    }
}
class CrewCommand extends BaseCommand {
    name = "crew"
    alias = []
    testOnly = false;
    arguments = [new PlayerArgument("player")];
    requireCaptain = true;
    execute(player: string) {
        StellarAPI.sendPacket({
            type: StellarAPI.Packet.ClMsgTeamAct,
            act: "player_list",
            arg: null
        });
        StellarQOL.crewPlayer(player);
    }
}
class CapCommand extends BaseCommand {
    name = "captain"
    alias = ["cap"]
    testOnly = false;
    arguments = [new PlayerArgument("player")];
    requireCaptain = true;
    execute(player: string) {
        StellarAPI.sendPacket({
            type: StellarAPI.Packet.ClMsgTeamAct,
            act: "player_list",
            arg: null
        });
        StellarQOL.capPlayer(player);
    }
}

class ChangeFireModeCommand extends BaseCommand {
    name = "changefiremode"
    alias = ["cfm"]
    testOnly = false
    arguments = [new OptionsArgument("mode", ["continuous", "volley", "toggle"])]
    execute(option: string) {
        if (option == "continuous") {
            InterstellarQOL.logMessage("Turret mode set to continuous!");
            StellarAPI.DrednotSettings.getSettings().turret_mode = StellarAPI.DrednotSettings.TurretModes.ContinuousFire;
        }
        else if (option == "volley") {
            InterstellarQOL.logMessage("Turret mode set to volley!");
            StellarAPI.DrednotSettings.getSettings().turret_mode = StellarAPI.DrednotSettings.TurretModes.VolleyFire;
        }
        else if (option == "toggle") {
            if (StellarAPI.DrednotSettings.getSettings().turret_mode == StellarAPI.DrednotSettings.TurretModes.ContinuousFire) {
                InterstellarQOL.logMessage("Turret mode set to volley!");
                StellarAPI.DrednotSettings.getSettings().turret_mode = StellarAPI.DrednotSettings.TurretModes.VolleyFire;
            } else {
                InterstellarQOL.logMessage("Turret mode set to continuous!");
                StellarAPI.DrednotSettings.getSettings().turret_mode = StellarAPI.DrednotSettings.TurretModes.ContinuousFire;
            }
        }
    }
}

class GetOnlinePlayersCommand extends BaseCommand {
    name = "onlinelist"
    alias = []
    testOnly = false;
    arguments = []
    execute() {
        InterstellarQOL.logMessage("Online players: " + StellarAPI.Game.getLocalOnlinePlayerNames().join(", "))
    } 
}

export function registerCommands() {
    StellarCommandManager.registerCommand(new GravityCommand());
    StellarCommandManager.registerCommand(new LeaveCommand());
    StellarCommandManager.registerCommand(new PrivateCommand());
    StellarCommandManager.registerCommand(new PublicCommand());
    StellarCommandManager.removeCommand("ban");
    StellarCommandManager.removeCommand("kick");
    StellarCommandManager.registerCommand(new BetterBanCommand());
    StellarCommandManager.registerCommand(new BetterKickCommand());
    StellarCommandManager.registerCommand(new UnbanCommand());
    StellarCommandManager.registerCommand(new GuestCommand());
    StellarCommandManager.registerCommand(new CrewCommand());
    StellarCommandManager.registerCommand(new CapCommand());
    StellarCommandManager.registerCommand(new ChangeFireModeCommand());
    StellarCommandManager.registerCommand(new GetOnlinePlayersCommand());
}