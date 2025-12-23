const match = window.location.pathname.match(/\/?invite\/([a-zA-Z_0-9-]*)/);
const loadVanilla = localStorage.getItem("interstellarLoadVanilla") === "true";
if (match) {
    const invite = match[1];
    history.replaceState(null, "", `${window.location.origin}/?invite=${invite}`);
}

if (loadVanilla) {
    console.log("%cGoodbye %cInter%cstellar", "color: #AAAAAA", "color: #FFFFFF", "color: #FF7AAC");
    localStorage.setItem("interstellarLoadVanilla", false);
} else {
    // Prevent drednot from loading
    window.stop();
    console.log("%cWelcome to %cInter%cstellar", "color: #AAAAAA", "color: #FFFFFF", "color: #FF7AAC");
    document.documentElement.innerHTML = '';
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("modloader.js");
    (document.head || document.documentElement).appendChild(script);
}
