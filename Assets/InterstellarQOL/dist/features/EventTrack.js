"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFormattedEventTime = getFormattedEventTime;
const StellarAPI_1 = __importDefault(require("@interstellar/StellarAPI"));
const preact_1 = require("preact");
const hooks_1 = require("preact/hooks");
const PORTAL_CLOSE_TIME = 30.0 * 60.0;
const ALERT_TIME = 3 * 60.0; // 3 minutes
function formatTimeMMSS(seconds) {
    let minutes = Math.floor(seconds / 60.0);
    let secs = seconds % 60.0;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
}
function getFormattedEventTime(event_time, event_name) {
    let cycles = 0;
    let diff = event_time - (Date.now() / 1000);
    while (diff < 0) {
        diff += 2700.0;
        event_time += 2700.0;
        cycles += 1;
    }
    let is_uncertain = cycles >= 2;
    diff = Math.round(diff);
    if (diff < ALERT_TIME) {
        if (cycles == 0)
            return ["🟡", `${event_name} opening in ${formatTimeMMSS(diff)}`];
        else
            ["🟡", `Unknown. Guess: `];
    }
    else if (diff < PORTAL_CLOSE_TIME) {
        if (is_uncertain)
            return ["🔴", `Unknown. Guess: ${formatTimeMMSS(diff)}`];
        else
            return ["🔴", `in ${formatTimeMMSS(diff)} (Portals closed)`];
    }
    else {
        diff -= PORTAL_CLOSE_TIME;
        if (is_uncertain)
            return ["🟢", `Unknown. Guess: ${formatTimeMMSS(diff)} (Portals open)`];
        else
            return ["🟢", `${event_name}. Portals closing in ${formatTimeMMSS(diff)}`];
    }
    return ["???", "???"];
}
function EventTrackServer(props) {
    const id = props.id;
    const name = props.name;
    const state = StellarAPI_1.default.Telemetry.getEventState()[id];
    const [text, setText] = (0, hooks_1.useState)(getFormattedEventTime(state.time, state.event));
    (0, hooks_1.useEffect)(() => {
        const interval = setInterval(() => {
            const state = StellarAPI_1.default.Telemetry.getEventState()[id];
            setText(() => getFormattedEventTime(state.time, state.event));
        }, 250);
        return () => clearInterval(interval);
    }, [text]);
    return (0, preact_1.h)("tr", null,
        (0, preact_1.h)("td", null, text[0]),
        (0, preact_1.h)("td", null, name),
        (0, preact_1.h)("td", null, text[1]));
}
function EventTrackComponent(props) {
    const getTrackerTable = () => {
        if (StellarAPI_1.default.Telemetry.isDisabled()) {
            return [false, (0, preact_1.h)("p", null, "Interstellar telemetry is disabled. Cannot get event track data.")];
        }
        if (!StellarAPI_1.default.Telemetry.connected()) {
            return [false, (0, preact_1.h)("p", null, "Connecting to telemetry...")];
        }
        return [
            true,
            (0, preact_1.h)("table", null, Object.entries(StellarAPI_1.default.Telemetry.getEventSchema()).map(([id, name]) => (0, preact_1.h)(EventTrackServer, { id: id, name: name })))
        ];
    };
    const [componentData, setComponentData] = (0, hooks_1.useState)(getTrackerTable());
    (0, hooks_1.useEffect)(() => {
        const interval = setInterval(() => {
            console.log("Refreshing et");
            const data = getTrackerTable();
            if (data[0])
                clearInterval(interval);
            setComponentData(data);
        }, 500);
        return () => clearInterval(interval);
    }, []);
    return ((0, preact_1.h)("div", { class: "window darker" },
        (0, preact_1.h)("div", { class: "close" },
            (0, preact_1.h)("button", { class: "btn-red", onClick: () => StellarAPI_1.default.UI.toggleUI() }, "Close")),
        (0, preact_1.h)("h2", null, "Event Trackers"),
        componentData[1]));
}
class EventTrack {
    constructor() {
        var _a;
        StellarAPI_1.default.UI.registerSettingsModel("isqol-event-track", (0, preact_1.h)(EventTrackComponent, null));
        this.eventTrackButton = document.createElement("button");
        this.eventTrackButton.innerHTML = `<i class="far fa-question-circle"> </i> Event Track`;
        this.eventTrackButton.classList.add("btn-small");
        this.eventTrackButton.onclick = () => { StellarAPI_1.default.UI.toggleUI("isqol-event-track"); };
        (_a = document.querySelector("#content-bottom > div.button-container")) === null || _a === void 0 ? void 0 : _a.prepend(this.eventTrackButton);
    }
}
exports.default = EventTrack;
