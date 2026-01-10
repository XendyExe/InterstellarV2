import { BackgroundSpriteConfig } from "../Modding/ModdingTypes/BackgroundConfig";
import { gl } from "./WebGLHelpers";
import WebGLTextureAtlas, { AtlasEntry, BakedTexture } from "./WebGLTextureAtlas";

const TWOPI = Math.PI * 2;

export abstract class WebGLBackgroundBaseSprite {
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

    config: BackgroundSpriteConfig;

    bgw: number;
    bgh: number;
    bgwh: number;
    bghh: number;

    currentTexture: number = 0;

    animatedDelta: number = 0;
    abstract frames: number;
    pixelArt: boolean;

    constructor(config: BackgroundSpriteConfig, bgw: number, bgh: number, pixelArt: boolean) {
        this.pixelArt = pixelArt;
        this.config = config;
        this.bgw = bgw; this.bgwh = this.bgw / 2;
        this.bgh = bgh; this.bghh = this.bgh / 2;
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

    tick(px: number, py: number, time: number) {
        let t = this.mt ? Math.floor(time/this.mt) : 0;
        let bob = Math.sin(time * TWOPI * this.bobt + this.bobo);
        this.x = this.ox + (px * this.px) + (this.mx * t) + (bob * this.bobx);
        this.y = this.oy + (py * this.py) + (this.my * t) + (bob * this.boby);

        if (this.animatedDelta != 0) {
            this.currentTexture = Math.floor(time / this.animatedDelta) % this.frames;
        }
    }

    abstract loadSpriteFromBlob(blob: Blob): any;
    abstract loadAnimatedFromBlob(blobs: Blob[]): any;
    abstract loadSpritesheetFromBlob(json: Blob, blob: Blob): any;
    abstract dispose(): any;
}


export class WebGLBackgroundSprite extends WebGLBackgroundBaseSprite {
    atlas: WebGLTextureAtlas;
    atlasEntries: AtlasEntry[] = []; // Store entries, not baked textures
    frames = 0;
    tileX: boolean = false;
    tileY: boolean = false;
    
    constructor(config: BackgroundSpriteConfig, bgw: number, bgh: number, pixelArt: boolean, sharedAtlas: WebGLTextureAtlas) {
        super(config, bgw, bgh, pixelArt);
        this.atlas = sharedAtlas;
        this.tileX = config.tile?.includes("x") ?? false;
        this.tileY = config.tile?.includes("y") ?? false;
    }

    async loadSpriteFromBlob(blob: Blob) {
        let bitmap = await createImageBitmap(blob);
        
        if (this.tileX || this.tileY) {
            bitmap = await this.addTilingPadding(bitmap);
        }
        
        const entry = this.atlas.addImage(bitmap);
        this.atlasEntries.push(entry);
        this.frames = this.atlasEntries.length;
    }

    async loadAnimatedFromBlob(blobs: Blob[]) {
        let width = 0;
        let height = 0;
        for (const blob of blobs) {
            let bitmap = await createImageBitmap(blob);
            if (width == 0) {
                width = bitmap.width;
                height = bitmap.height;
            }
            if (bitmap.width != width || bitmap.height != height) {
                throw "Animated sprite textures must be the same size";
            }
            
            if (this.tileX || this.tileY) {
                const padded = await this.addTilingPadding(bitmap);
                bitmap.close();
                bitmap = padded;
            }
            
            const entry = this.atlas.addImage(bitmap);
            this.atlasEntries.push(entry);
        }
        
        this.frames = this.atlasEntries.length;
        this.animatedDelta = 1 / this.config.animated!!.fps;
    }

    async loadSpritesheetFromBlob(json: Blob, blob: Blob) {
        let bitmap = await createImageBitmap(blob);
        const spritesheet = JSON.parse(await json.text());
        const frameNames = spritesheet.animations[this.config.animated!!.spritesheet!!.animation_name]!!;

        let width = 0;
        let height = 0;
        for (const frameName of frameNames) {
            const frame_data = spritesheet.frames[frameName]!!.frame!!;
            if (width == 0) {
                width = frame_data.w;
                height = frame_data.h;
            }
            if (frame_data.w != width || frame_data.h != height) {
                throw "Animated sprite textures must be the same size";
            }
            let subBitmap = await this.extractSubimage(bitmap, frame_data.x, frame_data.y, frame_data.w, frame_data.h);
            
            if (this.tileX || this.tileY) {
                const padded = await this.addTilingPadding(subBitmap);
                subBitmap = padded;
            }
            
            const entry = this.atlas.addImage(subBitmap);
            this.atlasEntries.push(entry);
        }
        
        this.frames = this.atlasEntries.length;
        this.animatedDelta = 1 / this.config.animated!!.fps;
    }
    
    getCurrentTexture(): BakedTexture | null {
        if (this.atlasEntries.length === 0) return null;
        const entry = this.atlasEntries[this.currentTexture];
        if (!entry) return null;
        return entry as BakedTexture;
    }

    private async addTilingPadding(bitmap: ImageBitmap): Promise<ImageBitmap> {
        const padding = 1;
        const newWidth = bitmap.width + padding * 2;
        const newHeight = bitmap.height + padding * 2;
        
        const canvas = new OffscreenCanvas(newWidth, newHeight);
        const ctx = canvas.getContext('2d')!;
        
        // Draw main image in center
        ctx.drawImage(bitmap, padding, padding);
        
        // Repeat edges for seamless tiling
        // Left edge
        ctx.drawImage(bitmap, 0, 0, 1, bitmap.height, 0, padding, padding, bitmap.height);
        // Right edge
        ctx.drawImage(bitmap, bitmap.width - 1, 0, 1, bitmap.height, newWidth - padding, padding, padding, bitmap.height);
        // Top edge
        ctx.drawImage(bitmap, 0, 0, bitmap.width, 1, padding, 0, bitmap.width, padding);
        // Bottom edge
        ctx.drawImage(bitmap, 0, bitmap.height - 1, bitmap.width, 1, padding, newHeight - padding, bitmap.width, padding);
        
        // Corners
        ctx.drawImage(bitmap, 0, 0, 1, 1, 0, 0, padding, padding);
        ctx.drawImage(bitmap, bitmap.width - 1, 0, 1, 1, newWidth - padding, 0, padding, padding);
        ctx.drawImage(bitmap, 0, bitmap.height - 1, 1, 1, 0, newHeight - padding, padding, padding);
        ctx.drawImage(bitmap, bitmap.width - 1, bitmap.height - 1, 1, 1, newWidth - padding, newHeight - padding, padding, padding);
        
        return await createImageBitmap(canvas);
    }

    private async extractSubimage(bitmap: ImageBitmap, x: number, y: number, w: number, h: number): Promise<ImageBitmap> {
        const canvas = new OffscreenCanvas(w, h);
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(bitmap, x, y, w, h, 0, 0, w, h);
        return await createImageBitmap(canvas);
    }

    dispose() {
        // Atlas is shared, don't dispose it here
        this.atlasEntries = [];
    }
}