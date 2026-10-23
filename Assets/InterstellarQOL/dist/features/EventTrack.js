"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFormattedEventTime = getFormattedEventTime;
const StellarAPI_1 = __importDefault(require("@interstellar/StellarAPI"));
const hooks_1 = require("preact/hooks");
const preact_1 = require("preact");
const WS_URL = "wss://cosmogram.fomx.dev/api/event_track_ws";
const CYCLE_TIME = 45 * 60;
const PORTAL_CLOSE_TIME = 30 * 60;
const ALERT_TIME = 3 * 60;
const TRACKERS = {
    "psis-tracker": "Persistent",
    "wipe-tracker": "Ephemeral",
    "test-tracker": "Test",
};
function isEventState(value) {
    if (!value || typeof value !== "object")
        return false;
    const state = value;
    return (typeof state.event === "string" &&
        typeof state.time === "number" &&
        Number.isFinite(state.time));
}
function useEventTrack() {
    const [events, setEvents] = (0, hooks_1.useState)({});
    const [status, setStatus] = (0, hooks_1.useState)("connecting");
    (0, hooks_1.useEffect)(() => {
        let stopped = false;
        let socket;
        let retryTimer;
        let hasConnected = false;
        let retryDelay = 1000;
        function connect() {
            if (stopped)
                return;
            setStatus(hasConnected ? "reconnecting" : "connecting");
            const connection = new WebSocket(WS_URL);
            socket = connection;
            connection.onmessage = ({ data }) => {
                if (stopped || socket !== connection)
                    return;
                try {
                    const message = JSON.parse(data);
                    if (!message || typeof message !== "object")
                        return;
                    const record = message;
                    if (typeof record.name === "string" && isEventState(record)) {
                        // Live update: { name, event, time, three_min }
                        const name = record.name;
                        const state = {
                            event: record.event,
                            time: record.time,
                        };
                        setEvents(previous => (Object.assign(Object.assign({}, previous), { [name]: state })));
                    }
                    else {
                        // Initial snapshot: { trackerName: { event, time }, ... }
                        const snapshot = {};
                        for (const [name, state] of Object.entries(record)) {
                            if (!isEventState(state))
                                return;
                            snapshot[name] = state;
                        }
                        setEvents(snapshot);
                    }
                    hasConnected = true;
                    retryDelay = 1000;
                    setStatus("connected");
                }
                catch (error) {
                    console.warn("Invalid event tracker message:", error);
                }
            };
            connection.onerror = () => connection.close();
            connection.onclose = () => {
                if (stopped || socket !== connection)
                    return;
                setStatus(hasConnected ? "reconnecting" : "connecting");
                retryTimer = setTimeout(connect, retryDelay);
                retryDelay = Math.min(retryDelay * 2, 30000);
            };
        }
        connect();
        return () => {
            stopped = true;
            clearTimeout(retryTimer);
            socket === null || socket === void 0 ? void 0 : socket.close();
        };
    }, []);
    return { events, status };
}
function formatTimeMMSS(seconds) {
    const rounded = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(rounded / 60);
    const secs = rounded % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
}
function getFormattedEventTime(eventTime, eventName, now = Date.now() / 1000) {
    if (!Number.isFinite(eventTime) || eventTime <= 0) {
        return ["⚪", "Unknown"];
    }
    const rawDiff = eventTime / 1000 - now;
    const cycles = rawDiff <= 0
        ? Math.floor(-rawDiff / CYCLE_TIME) + 1
        : 0;
    const diff = rawDiff + cycles * CYCLE_TIME;
    const uncertain = cycles >= 2;
    const guess = "Unknown. Guess: ";
    if (diff < ALERT_TIME) {
        const text = `${eventName} opening in ${formatTimeMMSS(diff)}`;
        return ["🟡", cycles > 0 ? guess + text : text];
    }
    if (diff < PORTAL_CLOSE_TIME) {
        const text = `Portals opening in ${formatTimeMMSS(diff)} (Portals closed)`;
        return ["🔴", uncertain ? guess + text : text];
    }
    const text = `${eventName}. Portals closing in ` +
        formatTimeMMSS(diff - PORTAL_CLOSE_TIME);
    return ["🟢", uncertain ? guess + text : text];
}
function EventTrackComponent() {
    const { events, status } = useEventTrack();
    const [now, setNow] = (0, hooks_1.useState)(() => Date.now() / 1000);
    (0, hooks_1.useEffect)(() => {
        const timer = setInterval(() => setNow(Date.now() / 1000), 250);
        return () => clearInterval(timer);
    }, []);
    return ((0, preact_1.h)("div", { class: "window darker" },
        (0, preact_1.h)("div", { class: "close" },
            (0, preact_1.h)("button", { class: "btn-red", onClick: () => StellarAPI_1.default.UI.toggleUI() }, "Close")),
        (0, preact_1.h)("h2", null, "Event Trackers"),
        status !== "connected" && ((0, preact_1.h)("p", null, status === "connecting"
            ? "Connecting to event trackers..."
            : "Reconnecting to event trackers... Showing last known state.")),
        (0, preact_1.h)("table", null,
            (0, preact_1.h)("tbody", null, Object.entries(TRACKERS).map(([id, name]) => {
                const state = events[id];
                const [indicator, text] = state
                    ? getFormattedEventTime(state.time, state.event, now)
                    : ["⚪", "Unknown"];
                return ((0, preact_1.h)("tr", { key: id },
                    (0, preact_1.h)("td", null, indicator),
                    (0, preact_1.h)("td", null, name),
                    (0, preact_1.h)("td", null, text)));
            })))));
}
class EventTrack {
    constructor() {
        var _a;
        StellarAPI_1.default.UI.registerSettingsModel("isqol-event-track", (0, preact_1.h)(EventTrackComponent, null));
        this.eventTrackButton = document.createElement("button");
        this.eventTrackButton.innerHTML =
            `<i class="far fa-question-circle"></i> Event Track`;
        this.eventTrackButton.classList.add("btn-small");
        this.eventTrackButton.onclick = () => {
            StellarAPI_1.default.UI.toggleUI("isqol-event-track");
        };
        (_a = document
            .querySelector("#content-bottom > div.button-container")) === null || _a === void 0 ? void 0 : _a.prepend(this.eventTrackButton);
    }
}
exports.default = EventTrack;
