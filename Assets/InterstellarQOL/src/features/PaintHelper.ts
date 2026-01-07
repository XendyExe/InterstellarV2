import { SocketCloseEvent, TriggerEvent } from "@interstellar/InterstellarEvents";
import StellarAPI from "@interstellar/StellarAPI";
import StellarCommandsManager, { Argument, BaseCommand } from "@interstellar/StellarCommandsManager";
import StellarEventManager from "@interstellar/StellarEventManager";
import InterstellarQOL from "..";
import gravSkates from "./GravSkates";
// stolen from dredart
export const PAINT_COLORS: [number, number, number][] = [[222, 165, 164], [214, 145, 136], [173, 111, 105], [128, 64, 64], [77, 0, 0], [77, 25, 0], [128, 0, 0], [144, 30, 30], [186, 1, 1], [179, 54, 54], [179, 95, 54], [255, 0, 0], [216, 124, 99], [255, 64, 64], [255, 128, 128], [255, 195, 192], [195, 153, 83], [128, 85, 64], [128, 106, 64], [77, 51, 38], [77, 51, 0], [128, 42, 0], [155, 71, 3], [153, 101, 21], [213, 70, 0], [218, 99, 4], [255, 85, 0], [237, 145, 33], [255, 179, 31], [255, 128, 64], [255, 170, 128], [255, 212, 128], [181, 179, 92], [77, 64, 38], [77, 77, 0], [128, 85, 0], [179, 128, 7], [183, 162, 20], [179, 137, 54], [238, 230, 0], [255, 170, 0], [255, 204, 0], [255, 255, 0], [255, 191, 64], [255, 255, 64], [223, 190, 111], [255, 255, 128], [234, 218, 184], [199, 205, 144], [128, 128, 64], [77, 77, 38], [64, 77, 38], [128, 128, 0], [101, 114, 32], [141, 182, 0], [165, 203, 12], [179, 179, 54], [191, 201, 33], [206, 255, 0], [170, 255, 0], [191, 255, 64], [213, 255, 128], [248, 249, 156], [253, 254, 184], [135, 169, 107], [106, 128, 64], [85, 128, 64], [51, 77, 38], [51, 77, 0], [67, 106, 13], [85, 128, 0], [42, 128, 0], [103, 167, 18], [132, 222, 2], [137, 179, 54], [95, 179, 54], [85, 255, 0], [128, 255, 64], [170, 255, 128], [210, 248, 176], [143, 188, 143], [103, 146, 103], [64, 128, 64], [38, 77, 38], [25, 77, 0], [0, 77, 0], [0, 128, 0], [34, 139, 34], [3, 192, 60], [70, 203, 24], [54, 179, 54], [54, 179, 95], [0, 255, 0], [64, 255, 64], [119, 221, 119], [128, 255, 128], [64, 128, 85], [64, 128, 106], [38, 77, 51], [0, 77, 26], [0, 77, 51], [0, 128, 43], [23, 114, 69], [0, 171, 102], [28, 172, 120], [11, 218, 81], [0, 255, 85], [80, 200, 120], [64, 255, 128], [128, 255, 170], [128, 255, 212], [168, 227, 189], [110, 174, 161], [64, 128, 128], [38, 77, 64], [38, 77, 77], [0, 77, 77], [0, 128, 85], [0, 166, 147], [0, 204, 153], [0, 204, 204], [54, 179, 137], [54, 179, 179], [0, 255, 170], [0, 255, 255], [64, 255, 191], [64, 255, 255], [128, 255, 255], [133, 196, 204], [93, 138, 168], [64, 106, 128], [38, 64, 77], [0, 51, 77], [0, 128, 128], [0, 85, 128], [0, 114, 187], [8, 146, 208], [54, 137, 179], [33, 171, 205], [0, 170, 255], [100, 204, 219], [64, 191, 255], [128, 212, 255], [175, 238, 238], [64, 85, 128], [38, 51, 77], [0, 26, 77], [0, 43, 128], [0, 47, 167], [54, 95, 179], [40, 106, 205], [0, 127, 255], [0, 85, 255], [49, 140, 231], [73, 151, 208], [64, 128, 255], [113, 166, 210], [100, 149, 237], [128, 170, 255], [182, 209, 234], [146, 161, 207], [64, 64, 128], [38, 38, 77], [0, 0, 77], [25, 0, 77], [0, 0, 128], [42, 0, 128], [0, 0, 205], [54, 54, 179], [95, 54, 179], [0, 0, 255], [28, 28, 240], [106, 90, 205], [64, 64, 255], [133, 129, 217], [128, 128, 255], [177, 156, 217], [150, 123, 182], [120, 81, 169], [85, 64, 128], [106, 64, 128], [51, 38, 77], [51, 0, 77], [85, 0, 128], [137, 54, 179], [85, 0, 255], [138, 43, 226], [167, 107, 207], [127, 64, 255], [191, 64, 255], [148, 87, 235], [170, 128, 255], [153, 85, 187], [140, 100, 149], [128, 64, 128], [64, 38, 77], [77, 38, 77], [77, 0, 77], [128, 0, 128], [159, 0, 197], [179, 54, 179], [184, 12, 227], [170, 0, 255], [255, 0, 255], [255, 64, 255], [213, 128, 255], [255, 128, 255], [241, 167, 254], [128, 64, 106], [105, 45, 84], [77, 38, 64], [77, 0, 51], [128, 0, 85], [162, 0, 109], [179, 54, 137], [202, 31, 123], [255, 0, 170], [255, 29, 206], [233, 54, 167], [207, 107, 169], [255, 64, 191], [218, 112, 214], [255, 128, 213], [230, 168, 215], [145, 95, 109], [128, 64, 85], [77, 38, 51], [77, 0, 25], [128, 0, 42], [215, 0, 64], [179, 54, 95], [255, 0, 127], [255, 0, 85], [255, 0, 40], [222, 49, 99], [208, 65, 126], [215, 59, 62], [255, 64, 127], [249, 90, 97], [255, 128, 170], [17, 17, 17], [34, 34, 34], [51, 51, 51], [68, 68, 68], [85, 85, 85], [102, 102, 102], [119, 119, 119], [136, 136, 136], [153, 153, 153], [170, 170, 170], [187, 187, 187], [204, 204, 204], [221, 221, 221], [238, 238, 238], [255, 255, 255]];
export function getColor(index: number): number {
    let color = PAINT_COLORS[index];
    if (!color) return 0;
    return (color[0] << 16) | (color[1] << 8) | color[2];
}

class GetPaintCommand extends BaseCommand {
    name = "getpaint";
    alias = [];
    arguments = [];
    testOnly = false;
    execute() {
        let world = StellarAPI.Game.getLocalWorld();
        if (!world) {
            InterstellarQOL.logMessage("Not in a ship!");
            return;
        }
        let width = world.block_w;
        let height = world.block_h;
        const name = StellarAPI.currentShip?.name;
        const hex = StellarAPI.currentShip?.hex;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d")!!;
        canvas.width = width;
        canvas.height = height;
        const imageData = context.createImageData(width, height);
        const data = imageData.data;
        for (let py = 0; py < height; py++) {
            for (let px = 0; px < width; px++) {
                let color = PAINT_COLORS[StellarAPI.Game.getColor(px, py)]!!;
                const index = ((height - py - 1) * width + px) * 4;
                data[index] = color[0];
                data[index + 1] = color[1];
                data[index + 2] = color[2];
                data[index + 3] = 255;
            }
        }
        context.putImageData(imageData, 0, 0);
        const exportData = canvas.toDataURL("image/png");
        const newTab = window.open();
        newTab!!.document.documentElement.innerHTML = `
        <head>
            <title>Paint of ${name} {${hex}}</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&display=swap" rel="stylesheet">
            <style>
                html {font-family: Lexend, sans-serif;}
                body {
                    display: flex;
                    flex-direction: column;
                    width: 100%;
                    overflow: hidden;
                    height: 100%;
                    justify-content: center;
                    align-items: center;
                    background: #111827;
                    color:white;
                    margin: 0;
                }
                a:link { color: #c2f4ff; }
                a:visited { color: #c2f4ff; }
                a:hover { color: #98c2cb; }
                a:active { color: #c2f4ff; }
                .main {
                    background: #1f2937;
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 12px;

                    width: 100%;
                    height: 100%;
                    max-width: 100vw;
                    max-height: 100vh;

                    box-sizing: border-box;
                }
                pre {
                    overflow-x: auto;
                    max-width: 100%;
                }
                    
                img {
                    flex: 1 1 auto;
                    max-width: 100%;
                    max-height: 100%;
                    width: auto;
                    height: auto;
                    object-fit: contain;
                    image-rendering: pixelated;
                }
            </style>
        </head>
        <body>
            <div class="main">
                <h1>Paint of ${name} {${hex}} (${width}, ${height})</h1>
                <img src="${exportData}" alt="Generated Image"/>
            </div>
        </body>
        `
        InterstellarQOL.logMessage("Opened tab!");
    }
    
}

class PaintCommand extends BaseCommand {
    name = "paint";
    alias = [];
    arguments = [];
    testOnly = false;
    execute() {
        paintHelper.toggleMenu();
    }
}

const FLOATING_ELEMENT = `
<style>
    #isqol-paint-menu {
        width: 300px;
        height: 500px;
        overflow: auto;
        overflow-x: hidden;
        pointer-events: all;
        border-radius: 4px;
    }

    #isqol-paint-dropzone {
        width: 100%;
        height: 200px;
        border: 2px dashed #fff;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        user-select: none;
    }

    #isqol-paint-dropzone.dragover {
        border-color: #4f46e5;
        background: rgba(79, 70, 229, 0.05);
    }
    
    .isqol-paint-wrapper {
        padding: 8px;
    }

    #isqol-paint-table {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 4px;
    }

    .isqol-paint-color-entry {
        width: 80px;
        height: 40px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        border-radius: 8px;
        text-shadow: 0 0 10px black;
    }
    
    .isqol-paint-color-entry.selected {
        outline: 2px solid white;
    }
    
    .isqol-paint-color-data {
        font-size: 8px;
    }

    .isqol-paint-filtercontainer {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        border: 1px solid white
    }

    #isqol-paint-ox, #isqol-paint-oy {
        width: 50px;
    }
</style>
<div id="isqol-paint-menu" class="dark">
    <div id="isqol-paint-first" class="isqol-paint-wrapper">
        <h2>Paint tool !</h2>
        <div id="isqol-paint-dropzone">
            <p>Click or drag an image here</p>
            <input id="isqol-fileinput" type="file" accept="image/*" hidden/>
        </div>
        <p>Much of the image processing code was based off of Dredart by I am Shrek [kapixar]</p>
        <p>Please go to <a href="https://kapixar.github.io/DredArt/" target="_blank">https://kapixar.github.io/DredArt/</a> to generate your images.</p>
    </div>
    <div id="isqol-paint-second" class="isqol-paint-wrapper"> 
        <h3>Paint Tool !</h3>
        <button id="isqol-paint-preview-mode">Enable preview</button>
        <p>Grav Skates: <input type="checkbox" id="isqol-paint-gravskates"></p>
        <p>Grav Skates sets your gravity so you are always moving horizontally, so speed skates work!</p>
        <div class="isqol-paint-offset-container">
            <span>X:<span>
            <input id="isqol-paint-ox" type="text" inputmode="numeric" pattern="\\d*">
            <span>Y:<span>
            <input id="isqol-paint-oy" type="text" inputmode="numeric" pattern="\\d*">
        </div>
        <p id="isqol-paint-incorrect">Incorrect tiles: 0</p>
        <div class="isqol-paint-filtercontainer">
            <div>Filter by color</div>
            <span>
                Sort by:
                <select id="isqol-paint-filter-sorter">
                    <option value="incorrect">Incorrect</option>
                    <option value="total">Total</option>
                    <option value="index">Index</option>
                </select>
            </span>
            <div id="isqol-paint-table">
            </div>
        </div>
    </div>
</div>
`

interface ColorData {
    color: number,
    incorrect: number,
    total: number,
    renderedIncorrect: number,
    element: HTMLDivElement | null,
    datacount: HTMLDivElement | null
}

class PaintHelper {
    painting = false;
    offsetX = 1;
    offsetY = 1;
    paintW = 0;
    paintH = 0;
    paint: number[][] = [];
    colors: Record<number, ColorData> = {};
    filterColor: number = -1;

    menuParent: HTMLDivElement;
    menu: HTMLDivElement;
    menuX = 0;
    menuY = 0;
    incorrect = 0;
    previewMode = false;

    menufirst: HTMLDivElement;
    menusecond: HTMLDivElement;
    previewModeButton: HTMLButtonElement;
    incorrectText: HTMLParagraphElement;
    painttable: HTMLDivElement;
    sortselect: HTMLSelectElement;
    offsetxelement: HTMLInputElement;
    offsetyelement: HTMLInputElement;
    
    lastIncorrectNumber: number = 0;

    sortMode = -1;

    constructor() {
        StellarEventManager.addTriggerListener(TriggerEvent.DRAW_TOP, this.tick.bind(this));
        StellarCommandsManager.registerCommand(new GetPaintCommand());
        StellarCommandsManager.registerCommand(new PaintCommand());
        StellarEventManager.addEventListener(SocketCloseEvent, (() => {this.previewMode = false;}).bind(this))

        this.menuParent = document.createElement("div");
        this.menuParent.style.position = "absolute";
        this.menuParent.style.display = "none";
        this.menuParent.style.zIndex = "99999999";
        this.menuParent.style.pointerEvents = "none";
        this.menuParent.innerHTML = FLOATING_ELEMENT;
        document.body.appendChild(this.menuParent);

        this.menufirst = document.getElementById("isqol-paint-first") as HTMLDivElement;
        this.menusecond = document.getElementById("isqol-paint-second") as HTMLDivElement;
        this.menusecond.style.display = "none";
        this.previewModeButton = document.getElementById("isqol-paint-preview-mode") as HTMLButtonElement;
        this.incorrectText = document.getElementById("isqol-paint-incorrect") as HTMLParagraphElement;
        this.previewModeButton.onclick = (() => {
            if (this.previewMode) return;
            StellarAPI.UI.showPrompt("Enable preview?", "Preview mode will replace your current ship paint with the finished pixel art, for you to preview the ship's paint. It is not recommended to paint in this mode, since this mode will desync your client. Rejoin to disable this mode.", (() => {
                this.previewMode = true;
            }).bind(this));
        }).bind(this);

        this.menu = document.getElementById("isqol-paint-menu") as HTMLDivElement;
        this.painttable = document.getElementById("isqol-paint-table") as HTMLDivElement;
        this.sortselect = document.getElementById("isqol-paint-filter-sorter") as HTMLSelectElement;
        this.offsetxelement = document.getElementById("isqol-paint-ox") as HTMLInputElement;
        this.offsetyelement = document.getElementById("isqol-paint-oy") as HTMLInputElement;
        document.getElementById("isqol-paint-gravskates")!!.onchange = (e) => {
            let elm = e.target as HTMLInputElement;
            if (elm.checked) gravSkates.enable();
            else gravSkates.disable();
        }

        this.offsetxelement.onchange = () => {
            this.offsetX = Number.parseInt(this.offsetxelement.value)
        }
        this.offsetyelement.onchange = () => {
            this.offsetY = Number.parseInt(this.offsetyelement.value)
        }
        let mx = -1;
        let my = -1;
        this.menu.onmousedown = (event) => {
            mx = event.clientX;
            my = event.clientY;
        }
        document.addEventListener("mousemove", (event) => {
            if (mx != -1) {
                this.menu.style.transform = `translate(${this.menuX + event.clientX - mx}px, ${this.menuY + event.clientY - my}px)`;
            }
        });
        document.addEventListener("mouseup", (event) => {
            if (mx == -1) return;
            this.menuX += event.clientX - mx;
            this.menuY += event.clientY - my;
            this.menu.style.transform = `translate(${this.menuX}px, ${this.menuY}px)`;
            mx = -1;
            my = -1;
        });
        const dropzone = document.getElementById("isqol-paint-dropzone")!!;

        const fileinput = document.getElementById("isqol-fileinput")!!;
        dropzone.onclick = () => { fileinput.click(); }
        fileinput.addEventListener("change", ((e: any) => {
            this.handleFiles(e.target.files);
        }).bind(this));
        dropzone.addEventListener("dragover", (e) => {
            e.preventDefault();
            dropzone.classList.add("dragover");
        });

        dropzone.addEventListener("dragleave", () => {
            dropzone.classList.remove("dragover");
        });

        dropzone.addEventListener("drop", ((e: any) => {
            e.preventDefault();
            dropzone.classList.remove("dragover");
            this.handleFiles(e.dataTransfer.files);
        }).bind(this));
    }

    inputError(text: string) {
        StellarAPI.UI.showPrompt("Failed to import image", text, ()=>{})
    }

    async handleFiles(files: FileList) {
        if (files.length == 0) return;
        let file = files.item(0)!!;
        if (!file.type.startsWith("image/")) {
            this.inputError("Not an image file!");
            return;
        }
        let source = await validateImage(file);
        if (typeof source == "string") return this.inputError(source);
        this.paint = source;
        console.log(this.paint);
        this.paintW = this.paint[0]!!.length;
        this.paintH = this.paint.length;
        this.painting = true;
        this.menufirst.style.display = "none";
        this.menusecond.style.display = "";
        this.sortMode = -1;
        this.painttable.innerHTML = "";
        this.colors = {};
        this.offsetxelement.value = "1";
        this.offsetyelement.value = "1";
        this.offsetX = 1;
        this.offsetY = 1;
        for (let x = 0; x < this.paintW; x++) {
            for (let y = 0; y < this.paintH; y++) {
                let color = this.paint[x]!![y]!!;
                if (this.colors[color]) this.colors[color].total++;
                else this.colors[color] = {
                    color: color,
                    incorrect: 0,
                    total: 1,
                    renderedIncorrect: -1,
                    element: null,
                    datacount: null
                }
            }
        }
    }
    toggleMenu() {
        this.menuParent.style.display = this.menuParent.style.display == "" ? "none" : "";
    }
    tick() {
        let world = StellarAPI.Game.getLocalWorld();
        if ((!world || !this.painting || this.menuParent.style.display)) return;
        this.incorrect = 0;
        for (const data of Object.values(this.colors)) {
            data.incorrect = 0;
        }
        for (let x = 0; x < this.paintW; x++) {
            for (let y = 0; y < this.paintH; y++) {
                let px = x + this.offsetX;
                let py = y + this.offsetY;
                let paint = StellarAPI.Game.getColor(px, py);
                let targetPaint = this.paint[x]!![y]!!;
                if (paint != targetPaint) {
                    this.colors[targetPaint]!!.incorrect++;
                    if ((this.filterColor == -1 || this.filterColor == targetPaint)) {
                        let hex = targetPaint.toString(16).toUpperCase().padStart(2, "0");
                        StellarAPI.Game.drawText(hex, px + 0.5, py + 0.5, getColor(targetPaint), 10);
                    }
                    this.incorrect += 1;
                    if (this.previewMode) {
                        StellarAPI.Game.setColor(px, py, targetPaint);
                    }
                }
            }
        }

        for (const data of Object.values(this.colors)) {
            if (data.element == null || data.datacount == null) {
                data.element = document.createElement("div");
                data.element.classList.add("isqol-paint-color-entry");
                let color_hex = data.color.toString(16).toUpperCase().padStart(2, "0");
                data.element.innerHTML = `<div class="isqol-paint-color-title">${color_hex}</div>`
                data.datacount = document.createElement("div");
                data.datacount.classList.add("isqol-paint-color-data");
                data.element.appendChild(data.datacount);
                let color = PAINT_COLORS[data.color]!!;
                data.element.style.backgroundColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`
                data.element.setAttribute("i", data.color.toString());
                this.painttable.appendChild(data.element);

                data.element.onclick = () => {
                    if (this.filterColor == data.color) {
                        this.filterColor = -1;
                        data.element?.classList.remove("selected");
                        return;
                    }
                    if (this.filterColor != -1) {
                        this.colors[this.filterColor]?.element?.classList.remove("selected");
                    }
                    this.filterColor = data.color;
                    data.element?.classList.add("selected");
                }
            }
            if (data.renderedIncorrect != data.incorrect) {
                data.renderedIncorrect = data.incorrect;
                data.datacount.innerText = `${data.total - data.incorrect}/${data.total}`
            }
        }

        if (this.incorrect != this.lastIncorrectNumber) {
            this.lastIncorrectNumber = this.incorrect;
            this.incorrectText.innerText = "Incorrect tiles: " + this.incorrect;
        }

        if (this.sortMode != this.sortselect.selectedIndex) {
            let mode = this.sortselect.selectedOptions.item(0)!!.value;
            console.log("resorting paint list by mode", mode);
            let sortedChildren: Element[] = [];
            switch (mode) {
                case "incorrect":
                    sortedChildren = Array.from(this.painttable.children).sort((a, b) => {
                        let colorA = this.colors[Number.parseInt(a.getAttribute("i")!!)]!!;
                        let colorB = this.colors[Number.parseInt(b.getAttribute("i")!!)]!!;
                        return colorB.incorrect - colorA.incorrect;
                    });
                    break;
                case "total":
                    sortedChildren = Array.from(this.painttable.children).sort((a, b) => {
                        let colorA = this.colors[Number.parseInt(a.getAttribute("i")!!)]!!;
                        let colorB = this.colors[Number.parseInt(b.getAttribute("i")!!)]!!;
                        return colorB.total - colorA.total;
                    });
                    break;
                case "index":
                    sortedChildren = Array.from(this.painttable.children).sort((a, b) => {
                        let colorA = this.colors[Number.parseInt(a.getAttribute("i")!!)]!!;
                        let colorB = this.colors[Number.parseInt(b.getAttribute("i")!!)]!!;
                        return colorA.color - colorB.color;
                    });
                    break;
            }
            sortedChildren.forEach(child => {
                this.painttable.appendChild(child);
            });
            this.sortMode = this.sortselect.selectedIndex;
        }
    }
    

}

const canvasSettings = { colorSpace: 'srgb' };
function pxIndex(x: number, y: number, w: number) {
    return (x + y * w) * 4;
}
function findIndex(a: any) {
    for (let s = 0; s < 255; s++) if (Math.abs(a[0] - PAINT_COLORS[s]!![0]) <= 1 && Math.abs(a[1] - PAINT_COLORS[s]!![1]) <= 1 && Math.abs(a[2] - PAINT_COLORS[s]!![2]) <= 1) return s;
    return 256;
}
async function validateImage(file: File) {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;

    try {
        await new Promise((resolve, reject) => {
            img.onerror = reject;
            img.onload = resolve;
        })
    } catch {
        return "Failed to read image, did you drag and drop from discord?";
    }
    URL.revokeObjectURL(url);

    // Stolen from dredart
    if (img.width > 1600 || img.height > 1625) {
        return 'Too large image!';
    }
    if (img.width < 20 || img.height < 45) {
        return 'Too small image!';
    }
    const source = document.createElement('canvas');
    source.width = img.width / 20;
    source.height = (img.height - 25) / 20;

    const scanner = document.createElement('canvas');
    scanner.width = img.width;
    scanner.height = img.height - 25;
    const scanCtx = scanner.getContext('2d', canvasSettings) as CanvasRenderingContext2D;
    scanCtx.drawImage(img, 0, 0);
    const sD = scanCtx.getImageData(0, 0, scanner.width, scanner.height).data;
    let result = [];
    for (let x = 0; x < scanner.width; x += 20) {
        let w = [];
        for (let y = 0; y < scanner.height; y += 20) {
            const i = pxIndex(x, y, scanner.width);
            const color = findIndex([sD[i], sD[i + 1], sD[i + 2]]);
            if (color === 256) return 'Image contains colors that don\'t exist in Dredark color palette. Use DredArt for pixel arts.';
            if (sD[i + 3] !== 255) return 'Image contains transparency. No transparency is allowed. Use DredArt for pixel arts.';
            w.push(color);
        }
        w.reverse();
        result.push(w);
    }
    return result;
}


const paintHelper = new PaintHelper();

export default paintHelper;