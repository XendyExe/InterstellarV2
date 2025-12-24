import Devpack from "../API/Devpack";
import Interstellar from "../Interstellar";
import { InterstellarLoadingScreen } from "../InterstellarLoadingScreen";
import StellarAssetManager, { AssetStoreData, internalModpackName } from "../StellarAssetManager";
import ModpackConfig from "./ModdingTypes/ModpackConfig";
import { Modpack } from "./Modpack";
import ModpackImporter from "./ModpackImporter";
import { parsePath } from "./PathParser";
import { createNotification } from "./StellarNotif";
function formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = parseFloat((bytes / Math.pow(k, i)).toFixed(decimals));

    return `${value} ${sizes[i]}`;
}

function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

const areArraysEqual = (arr1: any[], arr2: any[]) => {
    if (arr1 === arr2) return true;
    if (arr1.length !== arr2.length) return false;
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) {
            return false;
        }
    }
    return true;
};

const iconCache: Record<string, string> = {};
export interface ModManifest {
    name: string;
    creator: string;
    id: string;
    icon?: string;
    description?: string;
    scripting: boolean;
    texturePack: boolean;
    interstellar: boolean;
    resourcePack: boolean;
    immovable?: boolean;

    fileCount: number,
    size: number
}
export class ModpackManager {
    container: HTMLDivElement | undefined;
    unloadedContainer: HTMLElement | undefined;
    loadedContainer: HTMLElement | undefined;
    defaultIcon: string = "";
    drednotIcon: string = "";

    m_interstellarIcon: string = "";
    m_texturePackIcon: string = "";
    m_resourcePackIcon: string = "";
    m_scriptingPackIcon: string = "";

    deleteModIcon: string = "";

    update: Function[] = [];
    currentLoadedMods: string[] = [];


    constructor() {
        window.addEventListener("resize", this.resize.bind(this));
    }

    getEnabledModNames(): string[] {
        const enabledMods: string[] = JSON.parse(localStorage.getItem("interstellarEnabledMods") ?? "[]");
        enabledMods.push("interstellar.dsa");
        return enabledMods; 
    }

    init() {
        this.defaultIcon = URL.createObjectURL(StellarAssetManager.internal!["icons/defaultMod.png"]!.blob)
        this.drednotIcon = URL.createObjectURL(StellarAssetManager.internal!["icons/drednotMod.png"]!.blob)
        this.deleteModIcon = URL.createObjectURL(StellarAssetManager.internal!["icons/actions/deleteMod.svg"]!.blob)
        this.m_interstellarIcon = URL.createObjectURL(StellarAssetManager.internal!["icons/interstellar.png"]!.blob)
        this.m_texturePackIcon = URL.createObjectURL(StellarAssetManager.internal!["icons/textures.png"]!.blob)
        this.m_resourcePackIcon = URL.createObjectURL(StellarAssetManager.internal!["icons/backgrounds.png"]!.blob)
        this.m_scriptingPackIcon = URL.createObjectURL(StellarAssetManager.internal!["icons/scripting.png"]!.blob)
    }
    processModConfig(store: AssetStoreData, storeName: string, stellarData: ModpackConfig, mods: ModManifest[]) {
        let size = 0;
        let values = Object.values(store);
        let filecount = 0;
        if (stellarData.id == "interstellar.internal") {
            for (const [path, file] of Object.entries(store)) {
                if (!path.startsWith("StrawberryJamPack/")) continue;
                size += file.blob.size;
                filecount++;
            }
        } else if (stellarData.id == "interstellar.qol") {
            for (const [path, file] of Object.entries(store)) {
                if (!path.startsWith("InterstellarQOL/")) continue;
                size += file.blob.size;
                filecount++;
            }
        } else {
            for (const file of values) {
                size += file.blob.size;
                filecount++;
            }
        }
        const manifest: ModManifest = {
            name: stellarData.name,
            creator: stellarData.creator,
            id: stellarData.id,
            description: stellarData.description,
            scripting: !!stellarData.scripting,
            interstellar: !(stellarData.non_interstellar ?? false),
            resourcePack: !!stellarData.zones,
            texturePack: (stellarData.non_interstellar || !!stellarData.texture_pack),
            size: size,
            fileCount: filecount
        }
        if (stellarData.icon) {
            let path = storeName == "internal" ? internalModpackName + "/" + parsePath(stellarData.icon, "") : parsePath(stellarData.icon, "");
            let blob = store[path]!.blob;
            manifest.icon = iconCache[path] ?? (iconCache[path] = blob ? URL.createObjectURL(blob) : this.defaultIcon);
        }
        mods.push(manifest);
    }
    async discoverMods() {
        const stores = Interstellar.assetManager.database?.objectStoreNames ?? ["internal"];
        const enabledModNames: string[] = this.getEnabledModNames();
        this.currentLoadedMods = enabledModNames;
        const mods: ModManifest[] = [{
            icon: this.drednotIcon,
            name: "Deep Space Airships",
            creator: "cogg",
            id: "interstellar.dsa",
            description: "Base game + Interstellar. This is not moveable",
            scripting: true,
            interstellar: true,
            texturePack: false,
            resourcePack: false,
            immovable: true,
            fileCount: 2,
            size: 900000 + 2100000
        }];
        for (let storeName of stores) {
            let store = await Interstellar.assetManager.loadAssetStore(storeName);
            if (storeName == "internal") {
                this.processModConfig(store, storeName, JSON.parse(await store[internalModpackName + "/interstellar.json"]!.blob.text()), mods)
                this.processModConfig(store, storeName, JSON.parse(await store["InterstellarQOL/interstellar.json"]!.blob.text()), mods)
            } else {
                this.processModConfig(store, storeName, JSON.parse(await store["interstellar.json"]!.blob.text()), mods)
            }
        }

        const internalManifest = await Devpack.getManifest();
        if (internalManifest != null) mods.push(internalManifest);
        
        let disabledMods = [];
        for (let mod of mods) {
            if (!enabledModNames.includes(mod.id)) {
                disabledMods.push(mod)
            }
        }
        disabledMods.sort((a, b) => a.name.localeCompare(b.name))
        for (let disabled of disabledMods) this.createModEntry(disabled, this.unloadedContainer!!);
        for (let enabled of enabledModNames) {
            for (let mod of mods) {
                if (mod.id == enabled) {
                    this.createModEntry(mod, this.loadedContainer!!);
                }
            }
        }
        this.updateUI();
    }

    resize() {
        if (this.container) {
            let s = Math.min(window.innerWidth/1200, window.innerHeight / 900, 1);
            this.container.style.scale = "" + s;
        }
    }

    async open() {
        // @ts-ignore
        window.toggleUI();
        if (this.container) {
            this.container.style.display = "";
            return;
        }
        console.log("Opening modpack manager");
        this.update.length = 0;

        this.container = document.createElement("div");
        this.resize();
        document.body.appendChild(this.container);
        this.container.classList.add("dark");
        this.container.classList.add("window");
        this.container.classList.add("IS-modcontainer");
        this.container.innerHTML = `
        <div class="close">
            <button class="btn-blue" id="IS_MODPACK_SAVE">Save</button>
            <button class="btn-red" id="IS_MODPACK_CLOSE">Close</button>
        </div>
        <h2>Mod Management</h2>
        <div>
            Use this menu to specify what order to load mods in. Mods at the top are given higher priority 
            (will override mods below if there is conflict). Click on the mod titles to see more information + management.
            You can drag zip files or directories onto the game to load them, or click the button below:
        </div>
        <div>ZIP modpack import: <input id="IS-mod-upload-input" type="file" accept=".zip,application/zip" /></div>
        `;

        const wrapper = document.createElement("div");
        wrapper.classList.add("IS-modwrapper");
        this.container.appendChild(wrapper);

        function createModContainer(title: string) {
            let container = document.createElement("section");
            container.classList.add("IS-moddetailscontainer");
            container.innerHTML = `<h3 style="margin:0 0 8px 0;">${title}</h3>`;
            return container;
        }

        const unloaded = createModContainer("Unloaded Mods");
        this.unloadedContainer = document.createElement("div");
        this.unloadedContainer.id = "is_unloaded_mods";
        unloaded.appendChild(this.unloadedContainer);

        const loaded = createModContainer("Loaded Mods");
        this.loadedContainer = document.createElement("div");
        this.loadedContainer.id = "is_loaded_mods";
        loaded.appendChild(this.loadedContainer);

        wrapper.appendChild(unloaded);
        wrapper.appendChild(loaded);

        (document.getElementById("IS_MODPACK_CLOSE") as HTMLButtonElement).onclick = (() => {
            if (!(document.getElementById('IS_MODPACK_SAVE') as HTMLButtonElement).disabled) {
                Interstellar.patcher.promptManager.openPrompt("Exit without saving", "Close without saving? Your changes will be reverted", () => {
                    this.close();
                })
            }
            else this.close();
        }).bind(this);
        (document.getElementById('IS_MODPACK_SAVE') as HTMLButtonElement).onclick = (() => {
            Interstellar.patcher.promptManager.openPrompt("Save new config", "Are you sure you want to save? Your game will be reloaded.", () => {
                this.currentLoadedMods = [];
                for (let i = 0; i < this.loadedContainer!.children.length; i++) {
                    const child = this.loadedContainer!.children.item(i)!!;
                    this.currentLoadedMods.push(child.getAttribute("mod")!);
                }
                this.currentLoadedMods.pop();
                localStorage.setItem("interstellarEnabledMods", JSON.stringify(this.currentLoadedMods));
                console.log("reloading!");
                location.reload();
            })
        }).bind(this);
        (document.getElementById('IS_MODPACK_SAVE') as HTMLButtonElement).disabled = true;

        const input = document.getElementById("IS-mod-upload-input") as HTMLInputElement;
        input.addEventListener("change", (e) => {
            if (input.files!!.length > 0) {
                ModpackImporter.importZip(input.files!!.item(0)!!);
            }
        })
        
        await this.discoverMods();
    }
    close() {
        this.container!.style.display = "none";
        this.container?.remove();
        this.container = undefined;
    }

    async exportModToZip(id: string) {
        await Interstellar.patcher.internalModFileManager.modFileDB.prepareZipLib();
        const stores = Interstellar.assetManager.database?.objectStoreNames ?? ["internal"];
        const progress = new InterstellarLoadingScreen(`Exporting mod...`, `Locating mod ${id}`);
        for (let storeName of stores) {
            let store = await Interstellar.assetManager.loadAssetStore(storeName);
            let stellarData: ModpackConfig;
            if (storeName == "internal") {
                stellarData = JSON.parse(await store[internalModpackName + "/interstellar.json"]!.blob.text());
                if (stellarData.id != id) {
                    stellarData = JSON.parse(await store["InterstellarQOL/interstellar.json"]!.blob.text());
                    if (stellarData.id != id) continue;
                }
            } else {
                stellarData = JSON.parse(await store["interstellar.json"]!.blob.text());
                if (stellarData.id != id) continue;
            }
            // @ts-ignore
            const zip: any = new JSZip();
            
            let count = 0;
            let total = Object.values(store).length;
            for (const [key, value] of Object.entries(store)) {
                if (storeName == "internal") {
                    if (
                        !(id == "interstellar.internal" && key.startsWith(internalModpackName + "/")) &&
                        !(id == "interstellar.qol" && key.startsWith("InterstellarQOL/"))
                    ) continue;
                    let path = key.slice(id == "interstellar.internal" ? internalModpackName.length + 1 : "interstellarQOL/".length)
                    progress.setDescription(`Zipping ${path}... (${count}/${total})`)
                    progress.setProgress(count + 1, total)
                    count += 1;
                    zip.file(path, value.blob)
                } else {
                    progress.setDescription(`Zipping ${key}... (${count}/${total})`)
                    progress.setProgress(count + 1, total)
                    count += 1;
                    zip.file(key, value.blob)
                }
            }

            progress.setDescription(`Generating zip file`);
            progress.setUnbounded();
            let file = await zip.generateAsync({type:"blob"});
            progress.setDescription(`Downloading file!`);
            downloadBlob(file, (storeName == "internal" ? (id == "interstellar.internal" ? internalModpackName : "InterstellarQOL") : stellarData.id) + ".zip")
            progress.complete();
            return;
        }
    }

    // I know this is streight cancer
    createModEntry(manifest: ModManifest, parent: HTMLElement) {
        let container = document.createElement("div");
        container.classList.add("IS-modentry-container");
        let overview = document.createElement("div");
        overview.classList.add("IS-modentry-overview");
        const createMovementButton = ((direction: "up" | "down" | "left" | "right") => {
            const button = document.createElement("div");
            button.classList.add("IS-move-button", `IS-move-${direction}`);
            const arrowMap = {
                up: "▲",
                down: "▼",
                left: "◀",
                right: "▶"
            };
            button.textContent = arrowMap[direction];

            button.onclick = ((e: Event) => {
                e.stopPropagation();
                let index = 0;
                for (index; index < container.parentElement!.children.length; index++) {
                    if (container.parentElement!.children[index]?.getAttribute("mod") == manifest.id) {
                        break;
                    }
                }
                if (direction == "right") {
                    if (container.parentElement!.id != "is_unloaded_mods") return;
                    this.unloadedContainer?.removeChild(container);
                    this.loadedContainer?.prepend(container);
                }
                else if (direction == "left") {
                    if (container.parentElement!.id != "is_loaded_mods") return;
                    this.loadedContainer?.removeChild(container);
                    this.unloadedContainer?.prepend(container);
                }
                else if (direction == "up") {
                    if (container.parentElement!.id != "is_loaded_mods") return;
                    this.loadedContainer?.removeChild(container);
                    this.loadedContainer?.insertBefore(container, this.loadedContainer!.children[index - 1]!);
                }
                else if (direction == "down") {
                    if (container.parentElement!.id != "is_loaded_mods") return;
                    this.loadedContainer?.removeChild(container);
                    this.loadedContainer?.insertBefore(container, this.loadedContainer!.children[index + 1]!);
                }
                this.updateUI();
            }).bind(this);

            return button;
        }).bind(this);
        const img = document.createElement("div");
        img.style.backgroundImage = `url("${manifest.icon ?? this.defaultIcon}")`
        img.classList.add("IS-modentry-icon");
        overview.appendChild(img);

        const buttonUp = createMovementButton("up");
        const buttonDown = createMovementButton("down");
        const buttonLeft = createMovementButton("left");
        const buttonRight = createMovementButton("right");

        img.appendChild(buttonUp);
        img.appendChild(buttonDown);
        img.appendChild(buttonLeft);
        img.appendChild(buttonRight);

        const text = document.createElement("div");
        text.classList.add("IS-modentry-text");

        const name = document.createElement("span");
        name.innerHTML = `<span style="margin-right: 8px;">${manifest.name}</span>`;
        name.classList.add("IS-modentry-name");

        if (manifest.interstellar) {    
            name.appendChild(this.createTooltipIcon(this.m_interstellarIcon, "Interstellar"));
        }
        if (manifest.scripting) {
            name.appendChild(this.createTooltipIcon(this.m_scriptingPackIcon, "Runs scripts"));
        }
        if (manifest.texturePack) {
            name.appendChild(this.createTooltipIcon(this.m_texturePackIcon, "Texture Pack"));
        }
        if (manifest.resourcePack) {
            name.appendChild(this.createTooltipIcon(this.m_resourcePackIcon, "Resource Pack"));
        }

        const creator = document.createElement("span");
        creator.textContent = `Creator: ${manifest.creator}`;
        creator.classList.add("IS-modentry-creator");

        const id = document.createElement("span");
        id.textContent = `ID: ${manifest.id}`;
        id.classList.add("IS-modentry-creator");

        const detailContainer = document.createElement("div");
        detailContainer.classList.add("IS-mod-detail-container");
        const descriptionContainer = document.createElement("div");
        if (manifest.description) descriptionContainer.innerText = manifest.description;
        else descriptionContainer.innerHTML = "<span style='color: gray'>No description provided</span>";
        detailContainer.style.display = "none";
        detailContainer.appendChild(descriptionContainer);
        const footer = document.createElement("div");
        footer.classList.add("IS-mod-detail-footer");
        const fileDetails = document.createElement("span");
        fileDetails.innerText = `${manifest.fileCount} files // ${formatBytes(manifest.size)} ${manifest.id.startsWith('interstellar.') ? '(Internal packs cannot be deleted)' : (this.currentLoadedMods.includes(manifest.id) ? '(Mods must be unloaded to delete)' : "")}`
        const deleteMod = document.createElement("span");
        deleteMod.innerHTML = "<a>Delete</a> // "
        deleteMod.onclick = () => {
            Interstellar.patcher.promptManager.openPrompt("Delete Mod", "Are you sure you want to delete this mod? This action is irreversable!", async () => {
                await StellarAssetManager.deleteAssetStore(manifest.id, "interstellar");
                this.close();
                this.open();
            })
        }
        if (!manifest.id.startsWith("interstellar.")) footer.appendChild(deleteMod);
        const exportMod = document.createElement("span");
        exportMod.innerHTML = "<a>Export</a> // "
        exportMod.onclick = (async () => {
            console.log("Export mod");
            await this.exportModToZip(manifest.id);
        }).bind(this);
        if (!manifest.immovable) footer.appendChild(exportMod);
        footer.appendChild(fileDetails);
        detailContainer.appendChild(footer)

        text.appendChild(name);
        text.appendChild(creator);
        text.appendChild(id);
        overview.appendChild(text);
        container.appendChild(overview);
        container.appendChild(detailContainer);

        const h = "106px";
        container.style.height = h;
        overview.onclick = () => {
            container.style.height = container.style.height == h ? "auto" : h;
            detailContainer.style.display = detailContainer.style.display == "none" ? "" : "none";
        }

        container.setAttribute("mod", manifest.id);
        container.setAttribute("title", manifest.name);
        const update = () => {
            if (manifest.id == "interstellar.dsa") {
                buttonLeft.style.display = buttonRight.style.display = buttonUp.style.display = buttonDown.style.display = "none";
            }
            else if (container.parentElement!.id == "is_loaded_mods") {
                deleteMod.style.display = "none";
                buttonRight.style.display = "none";
                let i = 0;
                for (i; i < container.parentElement!.children.length; i++) {
                    if (container.parentElement!.children[i]?.getAttribute("mod") == manifest.id) {
                        break;
                    }
                }
                buttonUp.style.display = i == 0 ? "none" : "";
                buttonLeft.style.display = "";
                buttonDown.style.display = container.parentElement!.children[i + 1]?.getAttribute("mod") == "interstellar.dsa" ? "none" : "";
            } else {
                buttonLeft.style.display = buttonUp.style.display = buttonDown.style.display = "none";
                buttonRight.style.display = "";
                if (this.getEnabledModNames().includes(manifest.id)) deleteMod.style.display = "none";
                else deleteMod.style.display = "";
            }
        }
        parent.appendChild(container);
        this.update.push(update)
        update();

        return container;
    }

    updateUI() {
        this.currentLoadedMods = [];
        this.update.forEach(u => u());

        for (let i = 0; i < this.loadedContainer!.children.length; i++) {
            const child = this.loadedContainer!.children.item(i)!!;
            this.currentLoadedMods.push(child.getAttribute("mod")!);
        }

        const children = Array.from(this.unloadedContainer!.children);
        children.sort((a, b) => {
            const titleA = a.getAttribute("title")?.toLowerCase() ?? "";
            const titleB = b.getAttribute("title")?.toLowerCase() ?? "";
            return titleA.localeCompare(titleB);
        });
        for (const child of children) {
            this.unloadedContainer!.appendChild(child);
        }

        let changed = areArraysEqual(this.getEnabledModNames(), this.currentLoadedMods);
        (document.getElementById('IS_MODPACK_SAVE') as HTMLButtonElement).disabled = changed;
        console.log(this.getEnabledModNames(), this.currentLoadedMods);
    }

    createTooltipIcon(icon: string, text: string) {
        const container = document.createElement("div");
        container.innerHTML = `<img src="${icon}" alt="Info" class="IS-tooltip-icon">
                                <span class="IS-tooltip-text">${text}</span>`
        container.classList.add("IS-tooltip-container");
        container.onclick = (e) => {
            e.stopPropagation();
        };
        return container;
    }

    createAlert(title: string, description: string): boolean {
        return confirm(`${title}\n\n${description}`)
    }
}