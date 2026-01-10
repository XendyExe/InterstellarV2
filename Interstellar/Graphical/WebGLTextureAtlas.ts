import { gl } from "./WebGLHelpers";

export interface AtlasEntry {
    source?: ImageBitmap,
    x: number,
    y: number,
    width: number,
    height: number,
    sheet_x?: number,
    sheet_y?: number,
    u0?: number,
    v0?: number,
    u1?: number,
    v1?: number,
    hw?: number,
    hh?: number,
    tiling: boolean
}

export interface BakedTexture {
    width: number,
    height: number,
    u0: number,
    v0: number,
    u1: number,
    v1: number,
    hw: number,
    hh: number
}

interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

const MAX_IMAGE_SIZE = 4096;
const TILE_PAD = 0;
export const LOADED_ATLASES: WebGLTextureAtlas[] = [];

export default class WebGLTextureAtlas {
    entries: AtlasEntry[] = [];
    webglTexture: WebGLTexture | null = null;
    locked: boolean = false;

    width: number = 0;
    height: number = 0;
    private maxWidth: number = MAX_IMAGE_SIZE;
    private maxHeight: number = MAX_IMAGE_SIZE;
    private freeRects: Rect[] = [];
    private usedRects: Rect[] = [];
    private usedWidth: number = 0;
    private usedHeight: number = 0;

    constructor(initialSize: number = 256) {
        this.width = initialSize;
        this.height = initialSize;
        this.freeRects = [{ x: 0, y: 0, width: initialSize, height: initialSize }];
    }

    dispose() {
        this.locked = false;
        gl.deleteTexture(this.webglTexture);
        this.webglTexture = null;
        
        let i = LOADED_ATLASES
    }

    addImage(image: ImageBitmap, tiling: boolean = false) {
        if (this.locked) throw "Attempted to add an image to a locked TextureAtlas";
        if (image.width > MAX_IMAGE_SIZE || image.height > MAX_IMAGE_SIZE) {
            throw `Image is bigger than the max supported image size: ${MAX_IMAGE_SIZE}`;
        }
        const entry = {
            source: image,
            x: 0,
            y: 0,
            width: image.width,
            height: image.height,
            tiling
        };
        if (tiling) {
            entry.width += TILE_PAD * 2;
            entry.height += TILE_PAD * 2;
        }
        this.entries.push(entry);
        return entry;
    }

    addSubimage(source: ImageBitmap, x: number, y: number, width: number, height: number, tiling: boolean) {
        if (this.locked) throw "Attempted to add an image to a locked TextureAtlas";
        if (width > MAX_IMAGE_SIZE || height > MAX_IMAGE_SIZE) {
            throw `Subimage is bigger than the max supported image size: ${MAX_IMAGE_SIZE}`;
        }
        const entry = { source, x, y, width, height, tiling };
        if (tiling) {
            entry.width += TILE_PAD * 2;
            entry.height += TILE_PAD * 2;
        }
        this.entries.push(entry);
        return entry;
    }

    pack(pixelArt: boolean) {
        this.locked = true;
        const bitmaps = new Set<ImageBitmap>();
        const MAX_TEXTURE_SIZE = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        
        if (MAX_TEXTURE_SIZE < MAX_IMAGE_SIZE) {
            throw `Your webgl max texture size is less than ${MAX_IMAGE_SIZE}, which is not allowed`;
        }

        this.maxWidth = MAX_TEXTURE_SIZE;
        this.maxHeight = MAX_TEXTURE_SIZE;
        const padding = pixelArt ? 0 : 2;
        
        this.entries.sort((a, b) => (b.width * b.height) - (a.width * a.height));

        for (let i = 0; i < this.entries.length; i++) {
            const entry = this.entries[i]!;
            const rectWidth = entry.width + padding * 2;
            const rectHeight = entry.height + padding * 2;
            
            const result = this.packRect(rectWidth, rectHeight);
            
            if (!result) {
                throw `Failed to pack entry ${i} (${entry.width}x${entry.height}) - atlas overflow`;
            }

            entry.sheet_x = result.x + padding;
            entry.sheet_y = result.y + padding;

            if (entry.source) {
                bitmaps.add(entry.source);
            }
        }

        const size = this.getFinalSize();
        console.log(`Atlas: ${size.width}x${size.height}`);
        
        const canvas = new OffscreenCanvas(size.width, size.height);
        const ctx = canvas.getContext('2d')!;

        for (const entry of this.entries) {
            this.bakeTexture(entry, size.width, size.height);
            if (entry.source && entry.sheet_x !== undefined && entry.sheet_y !== undefined) {
                if (entry.tiling) {
                    ctx.drawImage(entry.source, entry.sheet_x + TILE_PAD, entry.sheet_y + TILE_PAD);
                    // // Left edge
                    // ctx.drawImage(entry.source, 0, 0, 1, entry.source.height, 0, TILE_PAD, TILE_PAD, entry.source.height);
                    // // Right edge
                    // ctx.drawImage(entry.source, entry.source.width - 1, 0, 1, entry.source.height, entry.width - TILE_PAD, TILE_PAD, TILE_PAD, entry.source.height);
                    // // Top edge
                    // ctx.drawImage(entry.source, 0, 0, entry.source.width, 1, TILE_PAD, 0, entry.source.width, TILE_PAD);
                    // // Bottom edge
                    // ctx.drawImage(entry.source, 0, entry.source.height - 1, entry.source.width, 1, TILE_PAD, entry.height - TILE_PAD, entry.source.width, TILE_PAD);
                    
                    // // Corners
                    // ctx.drawImage(entry.source, 0, 0, 1, 1, 0, 0, TILE_PAD, TILE_PAD);
                    // ctx.drawImage(entry.source, entry.source.width - 1, 0, 1, 1, entry.width - TILE_PAD, 0, TILE_PAD, TILE_PAD);
                    // ctx.drawImage(entry.source, 0, entry.source.height - 1, 1, 1, 0, entry.height - TILE_PAD, TILE_PAD, TILE_PAD);
                    // ctx.drawImage(entry.source, entry.source.width - 1, entry.source.height - 1, 1, 1, entry.width - TILE_PAD, entry.height - TILE_PAD, TILE_PAD, TILE_PAD);
                }
                else {
                    ctx.drawImage(
                        entry.source,
                        entry.x, entry.y, entry.width, entry.height,
                        entry.sheet_x, entry.sheet_y, entry.width, entry.height
                    );
                }
            }
        }
        this.width = size.width;
        this.height = size.height;

        const glTexture = gl.createTexture();
        if (!glTexture) throw "Failed to create WebGL texture";
        
        gl.bindTexture(gl.TEXTURE_2D, glTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
        
        if (pixelArt) {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        }
        
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        
        this.webglTexture = glTexture;

        bitmaps.forEach(elm => elm.close());
        this.entries.forEach(elm => delete elm.source);
        bitmaps.clear();

        LOADED_ATLASES.push();
    }

    private packRect(rectWidth: number, rectHeight: number): {x: number, y: number} | null {
        let result = this.tryPack(rectWidth, rectHeight);
        
        if (result) {
            this.usedWidth = Math.max(this.usedWidth, result.x + rectWidth);
            this.usedHeight = Math.max(this.usedHeight, result.y + rectHeight);
            return result;
        }

        while (!result && (this.width < this.maxWidth || this.height < this.maxHeight)) {
            if (!this.tryGrow(rectWidth, rectHeight)) break;
            result = this.tryPack(rectWidth, rectHeight);
        }

        if (result) {
            this.usedWidth = Math.max(this.usedWidth, result.x + rectWidth);
            this.usedHeight = Math.max(this.usedHeight, result.y + rectHeight);
            return result;
        }

        return null;
    }

    private tryPack(rectWidth: number, rectHeight: number): {x: number, y: number} | null {
        let bestRect: Rect | null = null;
        let bestShortSideFit = Infinity;
        let bestLongSideFit = Infinity;

        for (const freeRect of this.freeRects) {
            if (freeRect.width >= rectWidth && freeRect.height >= rectHeight) {
                const leftoverX = freeRect.width - rectWidth;
                const leftoverY = freeRect.height - rectHeight;
                const shortSideFit = Math.min(leftoverX, leftoverY);
                const longSideFit = Math.max(leftoverX, leftoverY);

                if (shortSideFit < bestShortSideFit || 
                    (shortSideFit === bestShortSideFit && longSideFit < bestLongSideFit)) {
                    bestRect = {
                        x: freeRect.x,
                        y: freeRect.y,
                        width: rectWidth,
                        height: rectHeight
                    };
                    bestShortSideFit = shortSideFit;
                    bestLongSideFit = longSideFit;
                }
            }
        }

        if (!bestRect) return null;

        this.placeRect(bestRect);
        return { x: bestRect.x, y: bestRect.y };
    }

    private placeRect(rect: Rect) {
        this.usedRects.push({ ...rect });

        let i = 0;
        while (i < this.freeRects.length) {
            if (this.splitFreeRect(i, rect)) {
                this.freeRects.splice(i, 1);
            } else {
                i++;
            }
        }

        this.pruneRects();
    }

    private splitFreeRect(freeRectIndex: number, usedRect: Rect): boolean {
        const freeRect = this.freeRects[freeRectIndex]!;
        
        if (!this.intersects(freeRect, usedRect)) return false;

        if (usedRect.x > freeRect.x) {
            this.freeRects.push({
                x: freeRect.x,
                y: freeRect.y,
                width: usedRect.x - freeRect.x,
                height: freeRect.height
            });
        }

        if (usedRect.x + usedRect.width < freeRect.x + freeRect.width) {
            this.freeRects.push({
                x: usedRect.x + usedRect.width,
                y: freeRect.y,
                width: (freeRect.x + freeRect.width) - (usedRect.x + usedRect.width),
                height: freeRect.height
            });
        }

        if (usedRect.y > freeRect.y) {
            this.freeRects.push({
                x: freeRect.x,
                y: freeRect.y,
                width: freeRect.width,
                height: usedRect.y - freeRect.y
            });
        }

        if (usedRect.y + usedRect.height < freeRect.y + freeRect.height) {
            this.freeRects.push({
                x: freeRect.x,
                y: usedRect.y + usedRect.height,
                width: freeRect.width,
                height: (freeRect.y + freeRect.height) - (usedRect.y + usedRect.height)
            });
        }

        return true;
    }

    private intersects(a: Rect, b: Rect): boolean {
        return !(a.x >= b.x + b.width ||
                 a.x + a.width <= b.x ||
                 a.y >= b.y + b.height ||
                 a.y + a.height <= b.y);
    }

    private isContainedIn(a: Rect, b: Rect): boolean {
        return a.x >= b.x && 
               a.y >= b.y &&
               a.x + a.width <= b.x + b.width &&
               a.y + a.height <= b.y + b.height;
    }

    private pruneRects() {
        for (let i = this.freeRects.length - 1; i >= 0; i--) {
            for (let j = this.freeRects.length - 1; j >= 0; j--) {
                if (i !== j && this.isContainedIn(this.freeRects[i]!, this.freeRects[j]!)) {
                    this.freeRects.splice(i, 1);
                    break;
                }
            }
        }
    }

    private tryGrow(rectWidth: number, rectHeight: number): boolean {
        const oldWidth = this.width;
        const oldHeight = this.height;

        const needsWidth = this.usedWidth + rectWidth > this.width;
        const needsHeight = this.usedHeight + rectHeight > this.height;

        let newWidth = this.width;
        let newHeight = this.height;

        if (needsWidth && this.width < this.maxWidth) {
            newWidth = Math.min(this.width * 2, this.maxWidth);
        }
        
        if (needsHeight && this.height < this.maxHeight) {
            newHeight = Math.min(this.height * 2, this.maxHeight);
        }

        if (newWidth === this.width && newHeight === this.height) {
            if (this.width < this.maxWidth) {
                newWidth = Math.min(this.width * 2, this.maxWidth);
            } else if (this.height < this.maxHeight) {
                newHeight = Math.min(this.height * 2, this.maxHeight);
            } else {
                return false;
            }
        }

        if (newWidth === oldWidth && newHeight === oldHeight) return false;

        this.grow(newWidth, newHeight);
        return true;
    }

    private grow(newWidth: number, newHeight: number) {
        const oldWidth = this.width;
        const oldHeight = this.height;
        
        this.width = newWidth;
        this.height = newHeight;

        for (const rect of this.freeRects) {
            if (rect.x + rect.width === oldWidth && newWidth > oldWidth) {
                rect.width += (newWidth - oldWidth);
            }

            if (rect.y + rect.height === oldHeight && newHeight > oldHeight) {
                rect.height += (newHeight - oldHeight);
            }
        }

        if (newWidth > oldWidth) {
            this.freeRects.push({
                x: oldWidth,
                y: 0,
                width: newWidth - oldWidth,
                height: newHeight
            });
        }

        if (newHeight > oldHeight) {
            this.freeRects.push({
                x: 0,
                y: oldHeight,
                width: oldWidth,
                height: newHeight - oldHeight
            });
        }

        this.pruneRects();
    }

    private getFinalSize(): {width: number, height: number} {
        const w = Math.ceil(this.usedWidth / 4) * 4;
        const h = Math.ceil(this.usedHeight / 4) * 4;
        return { 
            width: Math.min(w, this.maxWidth), 
            height: Math.min(h, this.maxHeight) 
        };
    }

    private bakeTexture(entry: AtlasEntry, texture_width: number, texture_height: number) {
        entry.u0 = entry.sheet_x! / texture_width;
        entry.u1 = (entry.sheet_x! + entry.width) / texture_width;
        entry.v0 = entry.sheet_y! / texture_height;
        entry.v1 = (entry.sheet_y! + entry.height) / texture_height;
        entry.hw = entry.width / 2;
        entry.hh = entry.height / 2;
    }
}