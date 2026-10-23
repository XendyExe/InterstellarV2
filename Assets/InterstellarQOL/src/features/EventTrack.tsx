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

function useEventTrack() {
    const [events, setEvents] = useState<EventSnapshot>({});
    const [status, setStatus] = useState<ConnectionStatus>("connecting");

    useEffect(() => {
        let stopped = false;
        let socket: WebSocket | undefined;
        let retryTimer: ReturnType<typeof setTimeout> | undefined;
        let hasConnected = false;
        let retryDelay = 1_000;

        function connect() {
            if (stopped) return;

            setStatus(hasConnected ? "reconnecting" : "connecting");

            const connection = new WebSocket(WS_URL);
            socket = connection;

            connection.onmessage = ({ data }) => {
                if (stopped || socket !== connection) return;

                try {
                    const message: unknown = JSON.parse(data);
                    if (!message || typeof message !== "object") return;

                    const record = message as Record<string, unknown>;

                    if (typeof record.name === "string" && isEventState(record)) {
                        // Live update: { name, event, time, three_min }
                        const name = record.name;
                        const state = {
                            event: record.event,
                            time: record.time,
                        };

                        setEvents(previous => ({
                            ...previous,
                            [name]: state,
                        }));
                    } else {
                        // Initial snapshot: { trackerName: { event, time }, ... }
                        const snapshot: EventSnapshot = {};

                        for (const [name, state] of Object.entries(record)) {
                            if (!isEventState(state)) return;
                            snapshot[name] = state;
                        }

                        setEvents(snapshot);
                    }

                    hasConnected = true;
                    retryDelay = 1_000;
                    setStatus("connected");
                } catch (error) {
                    console.warn("Invalid event tracker message:", error);
                }
            };

            connection.onerror = () => connection.close();

            connection.onclose = () => {
                if (stopped || socket !== connection) return;

                setStatus(hasConnected ? "reconnecting" : "connecting");
                retryTimer = setTimeout(connect, retryDelay);
                retryDelay = Math.min(retryDelay * 2, 30_000);
            };
        }

        connect();

        return () => {
            stopped = true;
            clearTimeout(retryTimer);
            socket?.close();
        };
    }, []);

    return { events, status };
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