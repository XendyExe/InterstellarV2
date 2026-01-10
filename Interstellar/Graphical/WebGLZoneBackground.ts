import ZoneBackground from "./ZoneBackground";
import { BackgroundConfig, BackgroundSpriteConfig } from "../Modding/ModdingTypes/BackgroundConfig";
import Interstellar from "../Interstellar";
import { parsePathFromFile } from "../Modding/PathParser";
import { BlobContainer } from "../API/Utils";
import StellarAssetManager from "../StellarAssetManager";
import { WebGLBackgroundSprite } from "./WebGLSprite";
import { createRenderShaders, gl } from "./WebGLHelpers";
import Patcher from "../Patching/Patcher";
import WebGLTextureAtlas from "./WebGLTextureAtlas";

export const LOADED_BITMAPS: ImageBitmap[] = [];
interface GetTask {
    path: string[],
    handler: (...blobs: Blob[]) => void;
}


export class WebGLZoneBackground extends ZoneBackground {
    config_path: string;
    config: BackgroundConfig;
    object_store: string;
    internal_name: string | undefined;
    sprites: WebGLBackgroundSprite[] = [];
    loading: Promise<void>[] = [];
    startTime: number = Date.now();

    spriteRenderShader: WebGLProgram | null = null;
    u_resolution: WebGLUniformLocation | null = null;
    u_bgSize: WebGLUniformLocation | null = null;
    u_tex: WebGLUniformLocation | null = null;
    u_zoomScale: WebGLUniformLocation | null = null;
    u_tiling: WebGLUniformLocation | null = null;
    vbo: WebGLBuffer | null = null;

    quadVBO: WebGLBuffer | null = null;
    instanceVBO: WebGLBuffer | null = null;
    vao: WebGLVertexArrayObject | null = null;
    instanceData: Float32Array = new Float32Array(0);
    sharedAtlas: WebGLTextureAtlas = new WebGLTextureAtlas();

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
        let start = performance.now();
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
            request.onerror = function (event) {
                reject(`Failed to load request an AssetStore: ${request.error}`);
            };
            request.onsuccess = function (event) {
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
        this.sharedAtlas.pack(this.isPixelArt);
        this.sprites.reverse();

        const quadVertices = new Float32Array([
            -1, -1, 0, 0,  // bottom-left
            1, -1, 1, 0,  // bottom-right
            -1, 1, 0, 1,  // top-left
            -1, 1, 0, 1,  // top-left
            1, -1, 1, 0,  // bottom-right
            1, 1, 1, 1,  // top-right
        ]);

        this.quadVBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO);
        gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

        this.instanceVBO = gl.createBuffer();

        // 2. Setup VAO
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        // Bind the Quad VBO so the VAO knows where to pull a_pos and a_uv from
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO);

        // a_pos (location 0) - 2 floats, stride 16 (4*4), offset 0
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);

        // a_uv (location 1) - 2 floats, stride 16, offset 8 (2*4)
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);

        // Now bind instance vertices for the remaining attributes
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceVBO);

        // i_offset (location 2) - 2 floats
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 56, 0);
        gl.vertexAttribDivisor(2, 1);

        // i_scale (location 3) - 2 floats
        gl.enableVertexAttribArray(3);
        gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 56, 8);
        gl.vertexAttribDivisor(3, 1);

        // i_uvBounds (location 4)
        gl.enableVertexAttribArray(4);
        gl.vertexAttribPointer(4, 4, gl.FLOAT, false, 56, 16);
        gl.vertexAttribDivisor(4, 1);

        // i_tileRepeat (location 5)
        gl.enableVertexAttribArray(5);
        gl.vertexAttribPointer(5, 2, gl.FLOAT, false, 56, 32);
        gl.vertexAttribDivisor(5, 1);

        // i_tileOffset (location 6)
        gl.enableVertexAttribArray(6);
        gl.vertexAttribPointer(6, 2, gl.FLOAT, false, 56, 40);
        gl.vertexAttribDivisor(6, 1);

        gl.enableVertexAttribArray(7);
        gl.vertexAttribPointer(7, 2, gl.FLOAT, false, 56, 48);
        gl.vertexAttribDivisor(7, 1);

        gl.bindVertexArray(null);

        // Allocate instance data buffer
        this.instanceData = new Float32Array(this.sprites.length * 14);

        let renderShaders = createRenderShaders();
        this.spriteRenderShader = renderShaders.sprite;
        this.u_tex = gl.getUniformLocation(this.spriteRenderShader, "u_tex");
        this.u_resolution = gl.getUniformLocation(this.spriteRenderShader, "u_resolution");
        this.u_bgSize = gl.getUniformLocation(this.spriteRenderShader, "u_bgSize");
        this.u_zoomScale = gl.getUniformLocation(this.spriteRenderShader, "u_zoomScale");
        this.u_tiling = gl.getUniformLocation(this.spriteRenderShader, "u_tiling");
        this.vbo = gl.createBuffer();

        this.loading.length = 0;
        for (let key of Object.keys(assets)) {
            delete assets[key];
        }
        requests.clear();
        this.loaded = true;
        this.locked = false;
        console.log(`Loaded background in ${performance.now() - start}ms`);
        if (this.unload_locked) this.unload();
    }

    async unload() {
        if (this.locked) {
            this.unload_locked = true;
            return;
        }
        if (!this.loaded) return;
        this.sprites.forEach((sprite) => { sprite.dispose() })
        this.sprites = [];
        this.loaded = false;
        this.sharedAtlas.dispose();
    }

    addSprite(data: BackgroundSpriteConfig, blob: Blob) {
        const sprite = new WebGLBackgroundSprite(data, this.width, this.height, this.isPixelArt, this.sharedAtlas);
        this.loading.push(sprite.loadSpriteFromBlob(blob));
        this.sprites.push(sprite);
    }

    addAnimatedSprites(data: BackgroundSpriteConfig, blobs: Blob[]) {
        const sprite = new WebGLBackgroundSprite(data, this.width, this.height, this.isPixelArt, this.sharedAtlas);
        this.loading.push(sprite.loadAnimatedFromBlob(blobs));
        this.sprites.push(sprite);
    }

    addSpritesheetSprites(data: BackgroundSpriteConfig, blob: Blob, json: Blob) {
        const sprite = new WebGLBackgroundSprite(data, this.width, this.height, this.isPixelArt, this.sharedAtlas);
        this.loading.push(sprite.loadSpritesheetFromBlob(json, blob));
        this.sprites.push(sprite);
    }
    update(): void {
        if (!this.loaded) return;
        let position = Interstellar.patcher.getPlayerPosition();
        this.sprites.forEach(sprite => {
            sprite.tick(position.x, -position.y, (Date.now() - this.startTime) / 1000);
        });
    }


render() {
    if (!this.loaded) return;
    
    gl.useProgram(this.spriteRenderShader!!);
    gl.uniform2f(this.u_resolution!!, Interstellar.drednotCanvas.width, Interstellar.drednotCanvas.height);
    gl.uniform2f(this.u_bgSize!!, this.width, this.height);
    gl.uniform1f(this.u_zoomScale!!, Patcher.zoom + 1);
    gl.bindVertexArray(this.vao);
    
    const halfWidth = this.width / 2;
    const halfHeight = this.height / 2;
    let offset = 0;
    let instanceCount = 0;
    for (const sprite of this.sprites) {
        const tex = sprite.getCurrentTexture();
        if (!tex) continue;
        
        if (sprite.tileX || sprite.tileY) {
            // Tiling sprite
            const renderW = sprite.tileX ? this.width : tex.width;
            const renderH = sprite.tileY ? this.height : tex.height;
            const xRatio = renderW / this.width;
            const yRatio = renderH / this.height;
            const repeatX = renderW / tex.width;
            const repeatY = renderH / tex.height;

            const l = sprite.x - tex.hw!;
            const r = sprite.x + tex.hw!;
            const t = sprite.y - tex.hh!;
            const b = sprite.y + tex.hh!;
            
            const x0 = ((l + halfWidth) / this.width) * 2 - 1;
            const x1 = ((r + halfWidth) / this.width) * 2 - 1;
            const y0 = 1 - ((t + halfHeight) / this.height) * 2;
            const y1 = 1 - ((b + halfHeight) / this.height) * 2;
            
            const cx = (x0 + x1) / 2;
            const cy = (y0 + y1) / 2;
            const sx = (x1 - x0) / 2;
            const sy = (y1 - y0) / 2;
            
            const offsetU = sprite.tileX ? (sprite.x / tex.width) : 0;
            const offsetV = sprite.tileY ? (sprite.y / tex.height) : 0;
            
            this.instanceData[offset++] = sprite.tileX ? 0 : cx;
            this.instanceData[offset++] = sprite.tileY ? 0 : cy;
            this.instanceData[offset++] = sprite.tileX ? xRatio : sx;
            this.instanceData[offset++] = sprite.tileY ? -yRatio : sy;
            this.instanceData[offset++] = tex.u0!;
            this.instanceData[offset++] = tex.v0!;
            this.instanceData[offset++] = tex.u1!;
            this.instanceData[offset++] = tex.v1!;
            this.instanceData[offset++] = repeatX;
            this.instanceData[offset++] = repeatY;
            this.instanceData[offset++] = offsetU;
            this.instanceData[offset++] = offsetV;
            this.instanceData[offset++] = sprite.tileX ? 1 : 0;
            this.instanceData[offset++] = sprite.tileY ? 1 : 1;
        } else {
            // Normal sprite
            const l = sprite.x - tex.hw!;
            const r = sprite.x + tex.hw!;
            const t = sprite.y - tex.hh!;
            const b = sprite.y + tex.hh!;
            
            const x0 = ((l + halfWidth) / this.width) * 2 - 1;
            const x1 = ((r + halfWidth) / this.width) * 2 - 1;
            const y0 = 1 - ((t + halfHeight) / this.height) * 2;
            const y1 = 1 - ((b + halfHeight) / this.height) * 2;
            
            const cx = (x0 + x1) / 2;
            const cy = (y0 + y1) / 2;
            const sx = (x1 - x0) / 2;
            const sy = (y1 - y0) / 2;
            
            this.instanceData[offset++] = cx;
            this.instanceData[offset++] = cy;
            this.instanceData[offset++] = sx;
            this.instanceData[offset++] = sy;
            this.instanceData[offset++] = tex.u0!;
            this.instanceData[offset++] = tex.v0!;
            this.instanceData[offset++] = tex.u1!;
            this.instanceData[offset++] = tex.v1!;
            this.instanceData[offset++] = 1.0;
            this.instanceData[offset++] = 1.0;
            this.instanceData[offset++] = 0.0;
            this.instanceData[offset++] = 0.0;
            this.instanceData[offset++] = 0.0;
            this.instanceData[offset++] = 0.0;
        }
        instanceCount++;
    }
    
    if (instanceCount === 0) {
        gl.bindVertexArray(null);
        return;
    }
    
    // Upload instance data
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceVBO);
    gl.bufferData(gl.ARRAY_BUFFER, this.instanceData.subarray(0, offset), gl.DYNAMIC_DRAW);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sharedAtlas.webglTexture);
    gl.uniform1i(this.u_tex!!, 0);
    
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, instanceCount);
    
    gl.bindVertexArray(null);
}

}
