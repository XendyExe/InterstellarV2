export class InterstellarLoadingScreen {
    private _title: string;
    private _description: string;
    private _element: HTMLDivElement;
    private _container: HTMLDivElement;
    private progressElement: HTMLProgressElement;
    private titleElement: HTMLHeadingElement;
    private descriptionElement: HTMLSpanElement;
    constructor(title: string, description: string) {
        this._title = title;
        this._description = description;
        let activeElement = document.activeElement;
        if (activeElement instanceof HTMLElement) {
            activeElement.blur()
        }

        this._element = document.createElement("div");
        this._element.classList.add("modal-container");

        this._container = document.createElement("div");
        this._container.classList.add("modal-window", "window", "darker");
        this._container.style.display = "flex";
        this._container.style.flexDirection = "column";
        this._container.style.alignItems = "center";
        this._container.style.overflowWrap = "anywhere";

        this.progressElement = document.createElement("progress");
        this.progressElement.style.width = "100%";
        this.titleElement = document.createElement("h1");
        this.titleElement.innerText = title;
        this.descriptionElement = document.createElement("span");
        this.descriptionElement.innerText = description;

        this._container.appendChild(this.titleElement);
        this._container.appendChild(this.progressElement);
        this._container.appendChild(this.descriptionElement);

        this._element.appendChild(this._container);
        document.body.prepend(this._element);
    }

    setDescription(text: string) {
        this.descriptionElement.innerText = text;
    }

    setProgress(count: number, total: number) {
        this.progressElement.value = count;
        this.progressElement.max = total;
    }

    setUnbounded() {
        this.progressElement.removeAttribute("value");
    }

    setTitle(text: string) {
        this.titleElement.innerText = text;
    }

    complete() {
        this._element.remove();
    }
}