import { AnimatedSprite, Assets, Sprite, Spritesheet, Texture, TextureSourceLike, TilingSprite } from "pixi.js";
import ZoneBackground from "./ZoneBackground";
import { BackgroundSprite } from "../Modding/ModdingTypes/BackgroundConfig";
import { Modpack } from "../Modding/Modpack";

const tileOptions = ["", "x", "y", "xy"];
const TWOPI = Math.PI * 2;
export class ModpackSprite {
    sprite: Sprite | TilingSprite | AnimatedSprite | undefined;
    mx: number;
    my: number;
    mt: number;
    px: number;
    py: number;
    bobx: number;
    boby: number;
    bobt: number;
    bobo: number;
    tile: number = 0;

    x: number = 0;
    y: number = 0;

    ox: number;
    oy: number;

    config: BackgroundSprite;

    constructor(config: BackgroundSprite, bgw: number, bgh: number) {
        this.config = config;
        this.ox = config.x ?? 0;
        this.oy = config.y ?? 0;

        this.mx = config.mx ?? 0;
        this.my = config.my ?? 0;
        this.mt = config.mt ?? 0;
        this.px = config.px ?? 0;
        this.py = config.py ?? 0;
        this.bobx = config.bobx ?? 0;
        this.boby = config.boby ?? 0;
        this.bobt = config.bobt ? 1 / config.bobt : 0;
        this.bobo = config.bobo ?? 0;
    }

    async loadSprite(blob: Blob, bgw: number, bgh: number, pixel: boolean) {
        let tile = this.config.tile ?? "";
        let bitmap = await createImageBitmap(blob);
        let baseTexture = Texture.from(bitmap);
        baseTexture.source.scaleMode = pixel ? "nearest" : "linear";
        
        if (tile) {
            this.sprite = new TilingSprite({
                texture: baseTexture,
                width: bgw,
                height: bgh
            });
            this.tile = tileOptions.indexOf(tile);
        } else {
            this.sprite = Sprite.from(baseTexture);
        }
    }

    async loadAnimated(blobs: Blob[], bgw: number, bgh: number, pixel: boolean) {
        const textures: Texture[] = [];
        for (let blob of blobs) {
            let bitmap = await createImageBitmap(blob);
            let texture = Texture.from(bitmap);
            texture.source.scaleMode = pixel ? "nearest" : "linear";
            textures.push(texture)
        }
        const animatedSprite = new AnimatedSprite(textures);
        await this.finalizeAnimatedSprite(animatedSprite, bgw, bgh);
    }

    async loadSpritesheet(json: Blob, blob: Blob, bgw: number, bgh: number, pixel: boolean) {
        let bitmap = await createImageBitmap(blob);
        let baseTexture = Texture.from(bitmap);
        baseTexture.source.scaleMode = pixel ? "nearest" : "linear";
        const spritesheet = new Spritesheet(baseTexture, JSON.parse(await json.text()));
        await spritesheet.parse();
        const frames = spritesheet.animations[this.config.animated!!.spritesheet!!.animation_name]!!;
        const animatedSprite = new AnimatedSprite(frames);
        await this.finalizeAnimatedSprite(animatedSprite, bgw, bgh);
    }

    async finalizeAnimatedSprite(animatedSprite: AnimatedSprite, bgw: number, bgh: number) {
        let tile = this.config.tile ?? "";
        animatedSprite.animationSpeed = this.config.animated!!.fps / 60;
        animatedSprite.loop = true;
        animatedSprite.play();

        if (tile) {
            this.sprite = new TilingSprite({
                texture: animatedSprite.texture,
                width: bgw,
                height: bgh
            });
            this.tile = tileOptions.indexOf(tile);
        } else {
            this.sprite = animatedSprite;
        }
    }

    tick(px: number, py: number, time: number) {
        let t = this.mt ? Math.floor(time/this.mt) : 0;
        let bob = Math.sin(time * TWOPI * this.bobt + this.bobo);
        this.x = (px * this.px) + (this.mx * t) + (bob * this.bobx);
        this.y = (py * this.py) + (this.my * t) + (bob * this.boby);

        if (this.tile & 1) (this.sprite as TilingSprite).tilePosition.x = this.ox + this.x;
        else this.sprite!!.x = this.ox + this.x;
        if (this.tile & 2) (this.sprite as TilingSprite).tilePosition.y = this.oy + this.y;
        else this.sprite!!.y = this.oy + this.y;
    }
}

export class ModpackZoneBackground extends ZoneBackground {
    sprites: ModpackSprite[] = [];
    loading: Promise<void>[] = [];
    startTime: number = Date.now();
    constructor(width: number, height: number, isPixelArt: boolean) {
        super(width, height, isPixelArt);
    }

    addSprite(data: BackgroundSprite, blob: Blob) {
        const sprite = new ModpackSprite(data, this.width, this.height);
        this.loading.push(sprite.loadSprite(blob, this.width, this.height, this.isPixelArt));
        this.sprites.push(sprite);
    }

    addAnimatedSprites(data: BackgroundSprite, blobs: Blob[]) {
        const sprite = new ModpackSprite(data, this.width, this.height);
        this.loading.push(sprite.loadAnimated(blobs, this.width, this.height, this.isPixelArt));
        this.sprites.push(sprite);
    }

    addSpritesheetSprites(data: BackgroundSprite, blob: Blob, json: Blob) {
        const sprite = new ModpackSprite(data, this.width, this.height);
        this.loading.push(sprite.loadSpritesheet(json, blob, this.width, this.height, this.isPixelArt));
        this.sprites.push(sprite);
    }

    sortSprites() {
        let layer = this.sprites.length;
        for (const sprite of this.sprites) {
            sprite.sprite!!.zIndex = layer;
            layer -= 1;
            this.container.addChild(sprite.sprite!!);
        }
        this.container.sortChildren();
    }
    tick(): void {
        this.sprites.forEach(sprite=>sprite.tick(0, 0, (this.startTime - Date.now()) / 1000));
    }
    onSwitch() {
        this.startTime = Date.now();
    }
}
