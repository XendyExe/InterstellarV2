import StellarAPI from "@interstellar/StellarAPI";
import { useEffect, useState } from "preact/hooks";
import { h } from "preact";

const WS_URL = "wss://cosmogram.fomx.dev/api/event_track_ws";
const CYCLE_TIME = 45 * 60;
const PORTAL_CLOSE_TIME = 30 * 60;
const ALERT_TIME = 3 * 60;

const TRACKERS = {
    "psis-tracker": "Persistent",
    "wipe-tracker": "Ephemeral",
    "test-tracker": "Test",
};

type EventState = {
    event: string;
    time: number;
};

type EventSnapshot = Record<string, EventState>;

type ConnectionStatus = "connecting" | "connected" | "reconnecting";

function isEventState(value: unknown): value is EventState {
    if (!value || typeof value !== "object") return false;

    const state = value as Partial<EventState>;
    return (
        typeof state.event === "string" &&
        typeof state.time === "number" &&
        Number.isFinite(state.time)
    );
}

// This connection belongs to the mod, independently of the settings panel.
let events: EventSnapshot = {};
let status: ConnectionStatus = "connecting";
let socket: WebSocket | undefined;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let hasConnected = false;
let retryDelay = 1_000;
const listeners = new Set<() => void>();

function notifyListeners() {
    for (const listener of listeners) listener();
}

function startEventTrack() {
    if (socket || retryTimer !== undefined) return;

    status = hasConnected ? "reconnecting" : "connecting";
    notifyListeners();

    const connection = new WebSocket(WS_URL);
    socket = connection;

    connection.onmessage = ({ data }) => {
        if (socket !== connection) return;

        try {
            const message: unknown = JSON.parse(data);
            if (!message || typeof message !== "object" || Array.isArray(message)) return;

            const record = message as Record<string, unknown>;

            if (typeof record.name === "string" && isEventState(record)) {
                events = {
                    ...events,
                    [record.name]: { event: record.event, time: record.time },
                };
            } else {
                const snapshot: EventSnapshot = {};
                for (const [name, state] of Object.entries(record)) {
                    if (!isEventState(state)) return;
                    snapshot[name] = state;
                }
                events = snapshot;
            }

            hasConnected = true;
            retryDelay = 1_000;
            status = "connected";
            notifyListeners();
        } catch (error) {
            console.warn("Invalid event tracker message:", error);
        }
    };

    connection.onerror = () => {
        if (socket === connection) connection.close();
    };

    connection.onclose = () => {
        if (socket !== connection) return;
        socket = undefined;
        status = hasConnected ? "reconnecting" : "connecting";
        notifyListeners();
        retryTimer = setTimeout(() => {
            retryTimer = undefined;
            startEventTrack();
        }, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30_000);
    };
}

function useEventTrack() {
    const [state, setState] = useState(() => ({ events, status }));

    useEffect(() => {
        const update = () => setState({ events, status });
        listeners.add(update);
        startEventTrack();
        update();

        // Closing the panel only removes its subscription, leaving the socket alive.
        return () => { listeners.delete(update); };
    }, []);

    return state;
}

function formatTimeMMSS(seconds: number) {
    const rounded = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(rounded / 60);
    const secs = rounded % 60;

    return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function getFormattedEventTime(
    eventTime: number,
    eventName: string,
    now = Date.now() / 1_000,
): [string, string] {
    if (!Number.isFinite(eventTime) || eventTime <= 0) {
        return ["⚪", "Unknown"];
    }
    const rawDiff = eventTime / 1_000 - now;
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

    const text =
        `${eventName}. Portals closing in ` +
        formatTimeMMSS(diff - PORTAL_CLOSE_TIME);

    return ["🟢", uncertain ? guess + text : text];
}

function EventTrackComponent() {
    const { events, status } = useEventTrack();
    const [now, setNow] = useState(() => Date.now() / 1_000);

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now() / 1_000), 250);
        return () => clearInterval(timer);
    }, []);

    return (
        <div class="window darker">
            <div class="close">
                <button
                    class="btn-red"
                    onClick={() => StellarAPI.UI.toggleUI()}
                >
                    Close
                </button>
            </div>

            <h2>Event Trackers</h2>

            {status !== "connected" && (
                <p>
                    {status === "connecting"
                        ? "Connecting to event trackers..."
                        : "Reconnecting to event trackers... Showing last known state."}
                </p>
            )}

            <table>
                <tbody>
                    {Object.entries(TRACKERS).map(([id, name]) => {
                        const state = events[id];
                        const [indicator, text] = state
                            ? getFormattedEventTime(state.time, state.event, now)
                            : ["⚪", "Unknown"];

                        return (
                            <tr key={id}>
                                <td>{indicator}</td>
                                <td>{name}</td>
                                <td>{text}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export default class EventTrack {
    eventTrackButton: HTMLButtonElement;

    constructor() {
        startEventTrack();

        StellarAPI.UI.registerSettingsModel(
            "isqol-event-track",
            <EventTrackComponent />,
        );

        this.eventTrackButton = document.createElement("button");
        this.eventTrackButton.innerHTML =
            `<i class="far fa-question-circle"></i> Event Track`;
        this.eventTrackButton.classList.add("btn-small");
        this.eventTrackButton.onclick = () => {
            StellarAPI.UI.toggleUI("isqol-event-track");
        };

        document
            .querySelector("#content-bottom > div.button-container")
            ?.prepend(this.eventTrackButton);
    }
}