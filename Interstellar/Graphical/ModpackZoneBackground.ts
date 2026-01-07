import { AnimatedSprite, Assets, Sprite, Spritesheet, Texture, TextureSourceLike, TilingSprite } from "pixi.js";
import ZoneBackground from "./ZoneBackground";
import { BackgroundConfig, BackgroundSprite } from "../Modding/ModdingTypes/BackgroundConfig";
import { Modpack } from "../Modding/Modpack";
import Interstellar from "../Interstellar";
import { parsePathFromFile, popFirstFolder } from "../Modding/PathParser";
import { BlobContainer } from "../API/Utils";
import StellarAssetManager, { AssetStoreData } from "../StellarAssetManager";

const tileOptions = ["", "x", "y", "xy"];
const TWOPI = Math.PI * 2;

export const LOADED_BITMAPS: ImageBitmap[] = [];
export class ModpackSprite {
    sprite: Sprite | TilingSprite | AnimatedSprite | undefined;
    bitmaps: ImageBitmap[] = [];
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
        let baseTexture = Texture.from(bitmap, true);
        this.bitmaps.push(bitmap);
        LOADED_BITMAPS.push(bitmap);
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
            let texture = Texture.from(bitmap, true);
            this.bitmaps.push(bitmap);
            LOADED_BITMAPS.push(bitmap);
            texture.source.scaleMode = pixel ? "nearest" : "linear";
            textures.push(texture)
        }
        const animatedSprite = new AnimatedSprite(textures);
        await this.finalizeAnimatedSprite(animatedSprite, bgw, bgh);
    }

    async loadSpritesheet(json: Blob, blob: Blob, bgw: number, bgh: number, pixel: boolean) {
        let bitmap = await createImageBitmap(blob);
        let baseTexture = Texture.from(bitmap, true);
        this.bitmaps.push(bitmap);
        LOADED_BITMAPS.push(bitmap);
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

    dispose() {
        this.sprite?.destroy({
            children: true,
            texture: true,
            textureSource: true,
            context: true,
            style: true
        });

        while (this.bitmaps.length > 0) {
            let pop = this.bitmaps.pop()!!;
            let i = LOADED_BITMAPS.indexOf(pop);
            pop.close();
            LOADED_BITMAPS.splice(i, 1);
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

interface GetTask {
    path: string[],
    handler: (...blobs: Blob[]) => void;
}

export class ModpackZoneBackground extends ZoneBackground {
    config_path: string;
    config: BackgroundConfig;
    object_store: string;
    internal_name: string | undefined;
    sprites: ModpackSprite[] = [];
    loading: Promise<void>[] = [];
    startTime: number = Date.now();

    loaded: boolean = false;
    locked: boolean = false;
    unload_locked: boolean = false;
    constructor(config_path: string, config: BackgroundConfig, object_store: string, width: number, height: number, isPixelArt: boolean, internal_name: string | undefined) {
        super(width, height, isPixelArt);
        this.config_path = config_path;
        this.config = config;
        this.object_store = object_store;
        this.internal_name = internal_name;
    }

    async load() {
        if (this.locked || this.loaded) return;
        this.locked = true;
        console.log("Loading background from asset store", this.object_store);
        const tasks: GetTask[] = [];
        for (const sprite of this.config.sprites) {
            if (sprite.path) {
                const _path = this.internal_name + "/" + parsePathFromFile(sprite.path, this.config_path);
                tasks.push({
                    path: [_path],
                    handler: (file) => {
                        this.addSprite(sprite, file)
                    }
                });
            } 
            else if (sprite.animated) {
                if (sprite.animated.sprites) {
                    const request = sprite.animated.sprites.map(elm => this.internal_name + "/" + parsePathFromFile(elm, this.config_path));
                    tasks.push({
                        path: request,
                        handler: (...blobs) => {
                            this.addAnimatedSprites(sprite, blobs);
                        }
                    });
                } else if (sprite.animated.spritesheet) {
                    const blobpath = this.internal_name + "/" + parsePathFromFile(sprite.animated.spritesheet.image, this.config_path);
                    const jsonpath = this.internal_name + "/" + parsePathFromFile(sprite.animated.spritesheet.json, this.config_path);
                    tasks.push({
                        path: [blobpath, jsonpath],
                        handler: (blob, json) => {
                            this.addSpritesheetSprites(sprite, blob, json)
                        }
                    });
                }
            } else {
                throw "Sprite isn't animated or static."
            }
        }
        const requests: Set<string> = new Set();
        const assets: Record<string, BlobContainer> = {};
        tasks.forEach(elm => elm.path.forEach(path => requests.add(path)));

        const transaction = StellarAssetManager.database!!.transaction(this.object_store, "readonly");
        const store = transaction.objectStore(this.object_store);
        await new Promise<void>((resolve, reject) => {
            const request = store.openCursor();
            request.onerror = function(event) {
                reject(`Failed to load request an AssetStore: ${request.error}`);
            };
            request.onsuccess = function(event) {
                let cursor = request.result;
                if (cursor) {
                    let key = cursor.primaryKey as string;
                    if (requests.has(key)) {
                        assets[key] = cursor.value as BlobContainer;
                    }
                    cursor.continue();
                }
                else {
                    resolve();
                }
            };
        })

        tasks.forEach(task => {
            let args = task.path.map(p => {
                let file = assets[p];
                if (!file) throw `Failed to find file ${p} when reading ${this.config_path}`;
                return file.blob;
            });
            task.handler(...args);
        });
        
        await Promise.all(this.loading);
        this.sortSprites();

        this.loading.length = 0;
        for (let key of Object.keys(assets)) {
            delete assets[key];
        }
        requests.clear();
        this.loaded = true;
        this.locked = false;
        if (this.unload_locked) this.unload();
    }

    unload() {
        if (this.locked) {
            this.unload_locked = true;
            return;
        }
        if (!this.loaded) return;
        this.sprites.forEach((sprite) => {sprite.dispose()})
        this.container.removeChildren();
        this.sprites = [];
        this.loaded = false;
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
        if (!this.loaded) return;
        let position = Interstellar.patcher.getPlayerPosition();
        this.sprites.forEach(sprite=>sprite.tick(-position.x, position.y, (this.startTime - Date.now()) / 1000));
    }
    onSwitch() {
        this.startTime = Date.now();
        this.load();
    }
}
