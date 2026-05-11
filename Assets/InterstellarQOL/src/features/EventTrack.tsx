import StellarAPI from "@interstellar/StellarAPI";
import { Component, ComponentChildren, h } from "preact";
import { useState, useEffect } from 'preact/hooks';

const PORTAL_CLOSE_TIME = 30.0 * 60.0
const ALERT_TIME = 3 * 60.0  // 3 minutes
function formatTimeMMSS(seconds: number) {
    let minutes = Math.floor(seconds / 60.0)
    let secs = seconds % 60.0
    return `${minutes}:${secs.toString().padStart(2, "0")}`
}
export function getFormattedEventTime(event_time: number, event_name: string) {
    let cycles = 0;
    let diff = event_time - (Date.now() / 1000);
    while (diff < 0) {
        diff += 2700.0
        event_time += 2700.0
        cycles += 1
    }
    let is_uncertain = cycles >= 2
    diff = Math.round(diff)
    if (diff < ALERT_TIME) {
        if (cycles == 0) return ["🟡", `${event_name} opening in ${formatTimeMMSS(diff)}`]
        else["🟡", `Unknown. Guess: `]
    }
    else if (diff < PORTAL_CLOSE_TIME) {
        if (is_uncertain) return ["🔴", `Unknown. Guess: ${formatTimeMMSS(diff)}`];
        else return ["🔴", `in ${formatTimeMMSS(diff)} (Portals closed)`]
    }
    else {
        diff -= PORTAL_CLOSE_TIME;
        if (is_uncertain) return ["🟢", `Unknown. Guess: ${formatTimeMMSS(diff)} (Portals open)`];
        else return ["🟢", `${event_name}. Portals closing in ${formatTimeMMSS(diff)}`]
    }
    return ["???", "???"]
}

function EventTrackServer(props: any) {
    const id = props.id;
    const name = props.name;
    const state = StellarAPI.Telemetry.getEventState()[id]!!;
    const [text, setText] = useState(getFormattedEventTime(state.time, state.event));

    useEffect(() => {
        const interval = setInterval(() => {
            const state = StellarAPI.Telemetry.getEventState()[id]!!;
            setText(() => getFormattedEventTime(state.time, state.event)!!)
        }, 250);

        return () => clearInterval(interval);
    }, [text]);

    return <tr>
        <td>{text[0]}</td>
        <td>{name}</td>
        <td>{text[1]}</td>
    </tr>
}


function EventTrackComponent(props: any) {
    const getTrackerTable = () => {
        if (StellarAPI.Telemetry.isDisabled()) {
            return [false, <p>Interstellar telemetry is disabled. Cannot get event track data.</p>];
        }
        if (!StellarAPI.Telemetry.connected()) {
            return [false, <p>Connecting to telemetry...</p>];
        }

        return [
            true,
            <table>
                {Object.entries(StellarAPI.Telemetry.getEventSchema()).map(([id, name]) =>
                    <EventTrackServer id={id} name={name} />
                )}
            </table>
        ];
    };

    const [componentData, setComponentData] = useState(getTrackerTable());

    useEffect(() => {
        const interval = setInterval(() => {
            console.log("Refreshing et");
            const data = getTrackerTable();
            if (data[0]) clearInterval(interval);
            setComponentData(data);
        }, 500);

        return () => clearInterval(interval);
    }, []);

    return (
        <div class="window darker">
            <div class="close">
                <button class="btn-red" onClick={() => StellarAPI.UI.toggleUI()}>
                    Close
                </button>
            </div>
            <h2>Event Trackers</h2>
            {componentData[1]}
        </div>
    );
}

export default class EventTrack {
    eventTrackButton: HTMLButtonElement
    constructor() {
        StellarAPI.UI.registerSettingsModel("isqol-event-track", <EventTrackComponent />);
        this.eventTrackButton = document.createElement("button");
        this.eventTrackButton.innerHTML = `<i class="far fa-question-circle"> </i> Event Track`
        this.eventTrackButton.classList.add("btn-small");
        this.eventTrackButton.onclick = () => { StellarAPI.UI.toggleUI("isqol-event-track"); };
        document.querySelector("#content-bottom > div.button-container")?.prepend(this.eventTrackButton);
    }
}