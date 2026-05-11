import Interstellar from "../Interstellar";
import StellarAssetManager from "../StellarAssetManager";
import InterstellarWebGL from "./InterstellarWebGL";

// let transitionFilters: Filter[] = [];
// const TransitionAdjustmentFilter = new AdjustmentFilter();
// let TransitionGlitchFilter = new GlitchFilter();
// TransitionGlitchFilter.enabled = false;
// const TransitionPixelateFilter = new PixelateFilter();
// const TransitionRGBSplitFilter = new RGBSplitFilter();
// TransitionAdjustmentFilter.saturation = 0.5;

// TransitionGlitchFilter.seed = 0.313;
// TransitionGlitchFilter.slices = 20;
// TransitionGlitchFilter.offset = 200;

// // @ts-ignore idk why this is complaining, it works
// TransitionPixelateFilter.size.x = 10;
// // @ts-ignore idk why this is complaining, it works
// TransitionPixelateFilter.size.y = 10;

// TransitionRGBSplitFilter.red.x = 20;
// TransitionRGBSplitFilter.red.y = 20;
// TransitionRGBSplitFilter.blue.x = -20;
// TransitionRGBSplitFilter.blue.y = -20;
// transitionFilters.push(TransitionAdjustmentFilter);
// transitionFilters.push(TransitionGlitchFilter);
// transitionFilters.push(TransitionPixelateFilter);
// transitionFilters.push(TransitionRGBSplitFilter);

const transitionSFX: HTMLAudioElement[] = [];
let loaded = false;
export function loadTransitionSfx() {
    for (let i = 1; i <= 12; i++) {
        const path = `audio/glitch/medium_main_${(("" + i).length == 1 ? "0": "") + i}.wav`;
        const entry = StellarAssetManager.internal![path];
        const url = URL.createObjectURL(entry!!.blob);
        transitionSFX.push(new Audio(url));
    }
    loaded = true;
}
function glitch(time: number, callback=() => void 0) {
    if (!loaded) return;
    (document.querySelector("#big-ui-container")!! as HTMLDivElement).style.opacity = "20%";
    InterstellarWebGL.glitching = true;
    let audio = transitionSFX[Math.floor(Math.random()*transitionSFX.length)]!!;
    audio.volume = JSON.parse(localStorage.getItem("dredark_user_settings")!!).volume * 0.2;
    audio.play();
    setTimeout(() => {
        (document.querySelector("#big-ui-container")!! as HTMLDivElement).style.opacity = "100%";
        InterstellarWebGL.glitching = false;
        if (callback) callback();
    }, time);
}

export async function glitchEx(time: number, preback: () => Promise<void>, callback: () => Promise<void>) {
    if (!loaded) return;
    (document.querySelector("#big-ui-container")!! as HTMLDivElement).style.opacity = "20%";
    InterstellarWebGL.glitching = true;
    let audio = transitionSFX[Math.floor(Math.random()*transitionSFX.length)]!!;
    audio.volume = JSON.parse(localStorage.getItem("dredark_user_settings")!!).volume * 0.2;
    audio.play();
    let currentTime = Date.now();
    await preback();
    let wait = time + (Date.now()-currentTime);
    if (wait > 0) await new Promise((resolve, _) => { setTimeout(resolve, wait)});
    (document.querySelector("#big-ui-container")!! as HTMLDivElement).style.opacity = "100%";
    InterstellarWebGL.glitching = false;
    await callback();
}

export function updateGlitch() {
    // if (TransitionGlitchFilter.enabled) TransitionGlitchFilter.refresh();
}
export default glitch;