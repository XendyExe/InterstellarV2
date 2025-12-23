import Interstellar from "./Interstellar";

export default class DebugMenu {
    dragmenu: HTMLDivElement = document.createElement("div");
    x = 0;
    y = 0;
    constructor() {
        this.dragmenu.style.display = "none";
        this.dragmenu.style.position = "absolute";
        this.dragmenu.style.zIndex = "999999999";
        this.dragmenu.style.minWidth = "64px";
        this.dragmenu.style.minHeight = "64px";
        this.dragmenu.classList.add("dark");
        this.dragmenu.innerHTML = `
            <div><h1 id="devtoolstitle">Dev Tools</h1></div>
            <div>
                <h2>Zone switcher<h2>
                <button class="zoneswitchbutton">The Nest</button>
                <br/>
                <button class="zoneswitchbutton">Hummingbird</button>
                <button class="zoneswitchbutton">Finch</button>
                <button class="zoneswitchbutton">Sparrow</button>
                <br/>
                <button class="zoneswitchbutton">Raven</button>
                <button class="zoneswitchbutton">Falcon</button>
                <br/>
                <button class="zoneswitchbutton">Canary</button>
                <button class="zoneswitchbutton">The Pits</button>
                <button class="zoneswitchbutton">Vulture</button>
                <br/>
                <button class="zoneswitchbutton">Super Special Event Zone</button>
                <br/>
                <button class="zoneswitchbutton">Combat Testing Zone</button>
            </div>
            <div>Dev server? <input id="usedevservercheckbox" type="checkbox"></div>
        `
        document.body.appendChild(this.dragmenu);

        document.querySelectorAll(".zoneswitchbutton").forEach((elm: any) => {
            elm.onclick = () => {
                const zone = Interstellar.zoneOverrides[elm.innerText.trim()];
                if (!zone) {
                    console.log(zone, "no exist")
                    return;
                }
                Interstellar.currentZone?.teleportToZone(zone!!);
            }
        });

        const devserver = document.getElementById("usedevservercheckbox") as HTMLInputElement;
        devserver.checked = localStorage.getItem("interstellarDEV") == "true"

        devserver.onchange = () => {
            localStorage.setItem("interstellarDEV", devserver.checked+"");
        }
        const dragtitle = document.getElementById("devtoolstitle")!!;
        let mx = -1;
        let my = -1;
        dragtitle.onmousedown = (event) => {
            mx = event.clientX;
            my = event.clientY;
        }

        document.addEventListener("mousemove", (event) => {
            if (mx != -1) {
                this.dragmenu.style.transform = `translate(${this.x + event.clientX - mx}px, ${this.y + event.clientY - my}px)`;
            }
        });
        document.addEventListener("mouseup", (event) => {
            if (mx == -1) return;
            this.x += event.clientX - mx;
            this.y += event.clientY - my;
            this.dragmenu.style.transform = `translate(${this.x}px, ${this.y}px)`;
            mx = -1;
            my = -1;
        });
        (document.getElementById("debugMenuOpener") as HTMLAnchorElement).onclick = () => {
            this.dragmenu.style.display = this.dragmenu.style.display == "" ? "none" : "";
        }
    }
}