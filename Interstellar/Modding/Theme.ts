const defaultTheme = {
    "--craft-color": "#222",
    "--craft-border-color": "black",
    "--craft-border-hover-color": "yellow",
    "--craft-disabled-color": "#411",
    "--craft-highlighted-border-color": "lime",
    "--craft-patreon-color": "#742",
    "--craft-resource-bar-bg": "black",
    "--craft-resource-bar-border-color": "black",
    "--craft-resource-label-bg": "#ddd",
    "--ui-border-color": "white",
    "--model-container-bg": "rgba(1, 1, 1, 0.5)",

    "--btn-color": "linear-gradient(#666, #000 200%)",
    "--btn-meme-color": "linear-gradient(#a4a, #000 200%)",
    "--btn-red-color": "linear-gradient(#a44, #000 200%)",
    "--btn-orange-color": "linear-gradient(#b84, #000 200%)",
    "--btn-yellow-color": "linear-gradient(#994, #000 200%)",
    "--btn-green-color": "linear-gradient(#4a4, #000 200%)",
    "--btn-blue-color": "linear-gradient(#488, #000 200%)",
    "--btn-pink-color": "linear-gradient(#a4a, #000 200%)",

    "--btn-text-color": "white",
    "--btn-meme-text-color": "white",
    "--btn-red-text-color": "white",
    "--btn-orange-text-color": "white",
    "--btn-yellow-text-color": "white",
    "--btn-green-text-color": "white",
    "--btn-blue-text-color": "white",
    "--btn-pink-text-color": "white",

    "--darker-bg": "rgb(25, 35, 45)",
    "--dark-bg": "rgba(25, 35, 45, 0.9)",
    "--dark-links": "yellow",
    "--recent-chat-bg": "rgba(25, 35, 45, 0.9)",
    "--chat-autocomplete-active": "#008",
    "--chat-autocomplete-hover": "#222",
    "--team-highlighted": "red",
    "--inventory-item-color": "#aaa",
    "--inventory-item-active": "#8f8",
    "--station-ui": "#000"
}

export function switchToTheme(overrides: Record<string, string>) {
    const theme = Object.assign({ ...defaultTheme }, overrides)
    for (const [key, value] of Object.entries(theme)) {
        document.documentElement.style.setProperty(key, value);
    }
}