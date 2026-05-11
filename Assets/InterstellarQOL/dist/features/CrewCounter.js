"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const InterstellarEvents_1 = require("@interstellar/InterstellarEvents");
const StellarAPI_1 = __importDefault(require("@interstellar/StellarAPI"));
const StellarEventManager_1 = __importDefault(require("@interstellar/StellarEventManager"));
const preact_1 = require("preact");
class CrewCounter {
    constructor() {
        StellarEventManager_1.default.addEventListener(InterstellarEvents_1.RenderCrewListEvent, this.renderCrewList.bind(this));
    }
    renderCrewList(event) {
        let captains = 0;
        let crew = 0;
        let guests = 0;
        let banned = 0;
        let online = 0;
        let offline = 0;
        let total = 0;
        event.component.state.player_list.forEach((player) => {
            if (player.team_rank == 3)
                captains++;
            else if (player.team_rank == 1)
                crew++;
            else if (player.team_rank == 0)
                guests++;
            else if (player.team_rank == 4)
                banned++;
            if (player.online_count > 0)
                online++;
            else
                offline++;
            total++;
        });
        const teamPlayersElement = StellarAPI_1.default.UI.preactGetChildWithID(event.node, "team_players");
        const children = StellarAPI_1.default.UI.preactNormalizeChildren(teamPlayersElement.props.children);
        StellarAPI_1.default.UI.preactInsertBefore(teamPlayersElement, children[children.length - 1], (0, preact_1.h)("span", null,
            "\u00A0",
            (0, preact_1.h)("span", { style: { color: "#8FF" } },
                "Captains: ",
                captains),
            "\u00A0",
            (0, preact_1.h)("span", { style: { color: "#FF8" } },
                "Crew: ",
                crew),
            "\u00A0",
            (0, preact_1.h)("span", { style: { color: "#CCC" } },
                "Guests: ",
                guests),
            "\u00A0",
            (0, preact_1.h)("span", { style: { color: "#F00" } },
                "Banned: ",
                banned),
            "\u00A0",
            (0, preact_1.h)("span", { style: { color: "#FFF" } },
                "Online: ",
                online),
            "\u00A0",
            (0, preact_1.h)("span", { style: { color: "#FFF" } },
                "Total: ",
                total)));
    }
}
exports.default = CrewCounter;
