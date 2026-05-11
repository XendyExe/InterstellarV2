import { RenderCrewListEvent } from "@interstellar/InterstellarEvents";
import StellarAPI from "@interstellar/StellarAPI";
import StellarEventManager from "@interstellar/StellarEventManager";
import { h } from "preact";

export default class CrewCounter {
    constructor() {
        StellarEventManager.addEventListener(RenderCrewListEvent, this.renderCrewList.bind(this))
    }

    renderCrewList(event: RenderCrewListEvent) {
        let captains = 0;
        let crew = 0;
        let guests = 0;
        let banned = 0;
        let online = 0;
        let offline = 0;
        let total = 0;

        (event.component.state as any).player_list.forEach((player: any) => {
            if (player.team_rank == 3) captains++;
            else if (player.team_rank == 1) crew++;
            else if (player.team_rank == 0) guests++;
            else if (player.team_rank == 4) banned++;
            if (player.online_count > 0) online++;
            else offline++;
            total++;
        });

        const teamPlayersElement = StellarAPI.UI.preactGetChildWithID(event.node, "team_players")!!
        const children = StellarAPI.UI.preactNormalizeChildren(teamPlayersElement.props.children);
        StellarAPI.UI.preactInsertBefore(teamPlayersElement, children[children.length - 1]!!, <span>&nbsp;
            <span style={{color: "#8FF"}}>Captains: {captains}</span>&nbsp;
            <span style={{color: "#FF8"}}>Crew: {crew}</span>&nbsp;
            <span style={{color: "#CCC"}}>Guests: {guests}</span>&nbsp;
            <span style={{color: "#F00"}}>Banned: {banned}</span>&nbsp;
            <span style={{color: "#FFF"}}>Online: {online}</span>&nbsp;
            <span style={{color: "#FFF"}}>Total: {total}</span>
        </span>)
    }
}