import { Filter } from "pixi.js";
import { AdjustmentFilter, RGBSplitFilter, PixelateFilter, GlitchFilter } from "pixi-filters";
import Interstellar from "../Interstellar";
import StellarAssetManager from "../StellarAssetManager";
// @ts-ignore This is world's dumbest workaround but if you control shift t open a tab it will break imports
if(!window.PIXI || !PIXI.filters)location.reload();

let transitionFilters: Filter[] = [];
const TransitionAdjustmentFilter = new AdjustmentFilter();
let TransitionGlitchFilter = new GlitchFilter();
const TransitionPixelateFilter = new PixelateFilter();
const TransitionRGBSplitFilter = new RGBSplitFilter();
TransitionAdjustmentFilter.saturation = 0.5;

TransitionGlitchFilter.seed = 0.313;
TransitionGlitchFilter.slices = 20;
TransitionGlitchFilter.offset = 200;

// @ts-ignore idk why this is complaining, it works
TransitionPixelateFilter.size.x = 10;
// @ts-ignore idk why this is complaining, it works
TransitionPixelateFilter.size.y = 10;

TransitionRGBSplitFilter.red.x = 20;
TransitionRGBSplitFilter.red.y = 20;
TransitionRGBSplitFilter.blue.x = -20;
TransitionRGBSplitFilter.blue.y = -20;
transitionFilters.push(TransitionAdjustmentFilter);
transitionFilters.push(TransitionGlitchFilter);
transitionFilters.push(TransitionPixelateFilter);
transitionFilters.push(TransitionRGBSplitFilter);

const transitionSFX: HTMLAudioElement[] = [];
let loaded = false;
export function loadTransitionSfx() {
    for (let i = 1; i <= 12; i++) {
        const path = `audio/glitch/medium_main_${(("" + i).length == 1 ? "0": "") + i}.wav`;
        const entry = StellarAssetManager.internal![path];
        // The first line of defense if the indexeddb was wiped
        if (!entry) {
            localStorage.removeItem("stellarAssetsUT");
            location.reload();
            return;
        }
        const url = URL.createObjectURL(entry.blob);
        transitionSFX.push(new Audio(url));
    }
    loaded = true;
}
function glitch(time: number, callback=() => void 0) {
    if (!loaded) return;
    (document.querySelector("#big-ui-container")!! as HTMLDivElement).style.opacity = "20%";
    TransitionGlitchFilter.enabled = true;
    let originalFilters: any = Interstellar.graphics.game.filters;
    if (Interstellar.graphics.game.filters == transitionFilters) {
        originalFilters = null;
    } else {
        Interstellar.graphics.game.filters = transitionFilters;

    }
    let audio = transitionSFX[Math.floor(Math.random()*transitionSFX.length)]!!;
    audio.volume = JSON.parse(localStorage.getItem("dredark_user_settings")!!).volume * 0.2;
    audio.play();
    setTimeout(() => {
        (document.querySelector("#big-ui-container")!! as HTMLDivElement).style.opacity = "100%";
        // @ts-ignore
        if (originalFilters) Interstellar.graphics.game.filters = originalFilters;
        TransitionGlitchFilter.enabled = false;
        if (callback) callback();
    }, time);
}
export function updateGlitch() {
    if (TransitionGlitchFilter.enabled) TransitionGlitchFilter.refresh();
}
export default glitch;