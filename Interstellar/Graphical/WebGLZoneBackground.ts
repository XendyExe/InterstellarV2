import { BlobContainer } from "../API/Utils";
import Interstellar from "../Interstellar";
import { BackgroundConfig, BackgroundSpriteConfig } from "../Modding/ModdingTypes/BackgroundConfig";
import { parsePathFromFile } from "../Modding/PathParser";
import StellarAssetManager from "../StellarAssetManager";
import { createProgram, gl } from "./WebGLHelpers";
import ZoneBackground from "./ZoneBackground";

// Imports from the testing
// import { drednotCanvas, gl } from ".";
// import { BackgroundConfig, BackgroundSpriteConfig } from "./BackgroundSpriet";
// import { BlobContainer, createProgram, parsePathFromFile } from "./InterstellarWebGL";
// import ZoneBackground from "./ZoneBackground";

/**
 * ==========================================================================================
 * WebGLStatic Background:
 * ==========================================================================================
 * The goal of the WebGLStaticBackground is to render the entire background in one draw call
 * while using shaders to handle the math of texture animations and tiling.
 * 
 * This will use a texture array of some (smaller) size, 2048 or 4096 to map the raw textures
 * into one atlas that the background can read from. This will also limit the max texture of
 * any individual texture to that size.
 * 
 * It is time to defeat pixi.js in both ram and performance. hopefully.
 */
const ATLAS_TEXTURE_SIZE = 4096;
const WEBGL_TESTING_WEBSITE = false;
// Padding is broken right now, will i fix it? prob not
const TILING_PADDING = 0;
const NONTILING_PADDING = 0;
interface GetTask {
    path: string[],
    handler: (...blobs: Blob[]) => Promise<RawSprite>;
}

interface Subtexture {
    bitmap: number,
    x: number,
    y: number,
    width: number,
    height: number
}

interface RawSprite {
    bitmaps: ImageBitmap[],
    subtextures: Subtexture[],
    tiling: string | undefined,
    width: number,
    height: number,
    config: BackgroundSpriteConfig,
    layer: number,
    padding: number
}

interface GPUSprite {
    x: number;
    y: number;
    width: number;
    height: number;
    tileX: boolean;
    tileY: boolean;
    frameCount: number;
    px: number;
    py: number;
    mx: number;
    my: number;
    mt: number;
    bobx: number;
    boby: number;
    bobt: number;
    bobo: number;
    fps: number;
    layer: number;

    startLayer: number;
    startX: number;
    startY: number;
    layerCount: number;
}

export class WebGLZoneBackground extends ZoneBackground {
    texture: WebGLTexture | null = null;
    atlasSize: { width: number; height: number } = { width: 0, height: 0 };
    atlasLayerCount: number = 0;
    spriteCount: number = 0;

    // WebGL resources
    instanceVBO: WebGLBuffer | null = null;
    quadVBO: WebGLBuffer | null = null;
    vao: WebGLVertexArrayObject | null = null;
    instanceData: Float32Array = new Float32Array(0);

    shader: WebGLProgram | null = null;
    uniforms: Record<string, WebGLUniformLocation | null> = {};
    shaderOrder: Record<string, [number, number]> = {};
    startTime: number = Date.now();

    config_path: string;
    config: BackgroundConfig;
    object_store: string;
    internal_name: string;

    constructor(config_path: string, config: BackgroundConfig, object_store: string, width: number, height: number, isPixelArt: boolean, internal_name: string | undefined) {
        super(width, height, isPixelArt);
        this.config_path = config_path;
        this.config = config;
        this.object_store = object_store;
        this.internal_name = internal_name ?? "";
    }

    performance: Record<string, number> = {};
    locked = false;
    loaded = false;
    unload_locked = false;
    override async load() {
        if (this.locked || this.loaded) return;
        console.log(`Loading ${this.config_path}`)
        this.locked = true;
        this.performance.start = performance.now();
        const rawSprites = await this.loadAssets();
        this.performance.assets = performance.now();
        console.log(`Loaded sprites in ${this.performance.assets - this.performance.start}ms`);
        const gpuSprites = await this.generateTextures(rawSprites);
        this.spriteCount = gpuSprites.length;
        this.performance.texture = performance.now();
        console.log(`Loaded textures in ${this.performance.texture - this.performance.assets}ms`);
        await this.loadGL(gpuSprites);
        this.performance.gl = performance.now();
        console.log(`Loaded GL in ${this.performance.gl - this.performance.texture}ms`);
        console.log(`Loaded background in ${this.performance.gl - this.performance.start}ms`);
        this.loaded = true;
        this.locked = false;
        if (this.unload_locked) {
            this.unload();
            this.unload_locked = false;
        }
    }

    /**
     * Loads assets from IndexedDB, returning a list of bitmaps and subtextures for further processing.
     * Validates that animated sprites are the same size.
     * @returns The raw sprites loaded from IndexedDB
     */
    async loadAssets(): Promise<RawSprite[]> {
        const tasks: GetTask[] = [];
        this.config.sprites.forEach((sprite, index) => {
            if (sprite.path) {
                const _path = this.internal_name + parsePathFromFile(sprite.path, this.config_path);
                tasks.push({
                    path: [_path],
                    handler: async (blob) => {
                        const bitmap = await createImageBitmap(blob);
                        let padding = sprite.tile ? TILING_PADDING * 2 : NONTILING_PADDING * 2;
                        return {
                            bitmaps: [bitmap],
                            subtextures: [{
                                bitmap: 0,
                                x: 0,
                                y: 0,
                                width: bitmap.width,
                                height: bitmap.height
                            }],
                            tiling: sprite.tile,
                            width: bitmap.width + padding,
                            height: bitmap.height + padding,
                            config: sprite,
                            layer: index,
                            padding
                        }
                    }
                });
            }
            else if (sprite.animated) {
                if (sprite.animated.sprites) {
                    const request = sprite.animated.sprites.map(elm => this.internal_name + parsePathFromFile(elm, this.config_path));
                    tasks.push({
                        path: request,
                        handler: async (...blobs) => {
                            let bitmaps = await Promise.all(blobs.map(blob => createImageBitmap(blob)));
                            let subtextures: Subtexture[] = bitmaps.map((bitmap, i) => ({
                                bitmap: i,
                                x: 0,
                                y: 0,
                                width: bitmap.width,
                                height: bitmap.height
                            }));
                            const size = subtextures.reduce((accumulator: [number, number], texture: Subtexture) => {
                                const thisSize: [number, number] = [texture.width, texture.height]
                                if (accumulator[0] == -1) accumulator = thisSize;
                                else if (accumulator[0] != thisSize[0] || accumulator[1] != thisSize[1]) {
                                    console.log(sprite, subtextures);
                                    throw `Animated sprites must be of same size, see console for more information.\Found size ${thisSize[0]}x${thisSize[1]}, expected ${accumulator[0]}x${accumulator[1]}`;
                                }
                                return accumulator;
                            }, [-1, -1]);
                            let padding = sprite.tile ? TILING_PADDING * 2 : NONTILING_PADDING * 2;
                            return {
                                bitmaps,
                                subtextures,
                                tiling: sprite.tile,
                                width: size[0] + padding,
                                height: size[1] + padding,
                                config: sprite,
                                layer: index,
                                padding
                            }
                        }
                    });
                } else if (sprite.animated.spritesheet) {
                    const blobpath = this.internal_name + parsePathFromFile(sprite.animated.spritesheet.image, this.config_path);
                    const jsonpath = this.internal_name + parsePathFromFile(sprite.animated.spritesheet.json, this.config_path);
                    tasks.push({
                        path: [blobpath, jsonpath],
                        handler: async (blob, json) => {
                            let bitmap = await createImageBitmap(blob);
                            const spritesheet = JSON.parse(await json.text());
                            const frameNames = spritesheet.animations[sprite.animated!!.spritesheet!!.animation_name]!!;
                            const subtextures = frameNames.map((frameName: string) => {
                                const frame_data = spritesheet.frames[frameName]!!.frame!!;
                                return {
                                    bitmap: 0,
                                    x: frame_data.x,
                                    y: frame_data.y,
                                    width: frame_data.w,
                                    height: frame_data.h
                                }
                            })
                            const size = subtextures.reduce((accumulator: [number, number], texture: Subtexture) => {
                                const thisSize: [number, number] = [texture.width, texture.height]
                                if (accumulator[0] == -1) accumulator = thisSize;
                                else if (accumulator[0] != thisSize[0] || accumulator[1] != thisSize[1]) {
                                    console.log(sprite, subtextures);
                                    throw `Animated sprites must be of same size, see console for more information.\Found size ${thisSize[0]}x${thisSize[1]}, expected ${accumulator[0]}x${accumulator[1]}`;
                                }
                                return accumulator;
                            }, [-1, -1]);
                            let padding = sprite.tile ? TILING_PADDING * 2 : NONTILING_PADDING * 2;
                            return {
                                bitmaps: [bitmap],
                                subtextures,
                                tiling: sprite.tile,
                                width: size[0] + padding,
                                height: size[1] + padding,
                                config: sprite,
                                layer: index,
                                padding
                            }
                        }
                    });
                }
            } else {
                throw "Sprite isn't animated or static."
            }
        });
        // @ts-ignore
        let assets: Record<string, BlobContainer> = {};

        if (WEBGL_TESTING_WEBSITE) {
            // @ts-ignore
            assets = window.ASSET_TREE;
        }
        else {
            const requests: Set<string> = new Set();
            tasks.forEach(elm => elm.path.forEach(path => requests.add(path)));
            // @ts-ignore
            const transaction = StellarAssetManager.database!!.transaction(this.object_store, "readonly");
            const store = transaction.objectStore(this.object_store);
            await new Promise<void>((resolve, reject) => {
                const request = store.openCursor();
                request.onerror = function () {
                    reject(`Failed to load request an AssetStore: ${request.error}`);
                };
                request.onsuccess = function () {
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
        }

        const loading: Promise<RawSprite>[] = [];
        tasks.forEach(task => {
            let args = task.path.map(p => {
                let file = assets[p];
                if (!file) throw `Failed to find file ${p} when reading ${this.config_path}`;
                return file.blob;
            });
            loading.push(task.handler(...args));
        });
        return await Promise.all(loading);
    }

    /**
     * Packs raw sprites into spritesheets, and creates the gl textures they use.
     * Also creates the vertex data of each sprite.
     * 
     * For now, this function packs all the textures into inefficent shelves for each sprite,
     * not taking account of sprite tail space. Mabye look into skyline shelves in the future?
     * @returns GPUSpries ready for GL loading
     */
    async generateTextures(sprites: RawSprite[]): Promise<GPUSprite[]> {
        const atlases: ImageData[] = [];
        const gpuSprites: GPUSprite[] = [];

        // Sort sprites by total height, then by total area
        sprites.sort((a, b) => {
            const a_height = Math.ceil((a.subtextures.length * a.width) / ATLAS_TEXTURE_SIZE) * a.height;
            const b_height = Math.ceil((b.subtextures.length * b.width) / ATLAS_TEXTURE_SIZE) * b.height;
            const heightDiff = b_height - a_height;
            if (heightDiff !== 0) return heightDiff;
            return (b.width * b.height) * (a.width * a.height);
        });

        const renderCanvas = new OffscreenCanvas(ATLAS_TEXTURE_SIZE, ATLAS_TEXTURE_SIZE);
        const ctx = renderCanvas.getContext("2d", {
            willReadFrequently: true,
            premultipliedAlpha: true,
            alpha: true
        })!!;

        let finalWidth = 0;
        let finalHeight = 0;
        let currentAtlasIndex = 0;
        const saveCurrentAtlas = async () => {
            const imageData = ctx.getImageData(0, 0, ATLAS_TEXTURE_SIZE, ATLAS_TEXTURE_SIZE);
            atlases.push(imageData);
            // await appendOffscreenCanvasToBody(renderCanvas);
            ctx.clearRect(0, 0, ATLAS_TEXTURE_SIZE, ATLAS_TEXTURE_SIZE);
            currentShelfY = 0;
            currentShelfX = 0;
            finalWidth = Math.max(finalWidth, maxWidth);
            finalHeight = Math.max(finalHeight, maxHeight);
            maxWidth = maxHeight = 0;
            currentShelfHeight = 0;
            currentAtlasIndex++;
        };


        let currentShelfY = 0;
        let currentShelfHeight = 0;
        let currentShelfX = 0;
        let maxWidth = 0;
        let maxHeight = 0;

        for (const sprite of sprites) {
            const gpuSprite: Partial<GPUSprite> = {};
            gpuSprite.startLayer = currentAtlasIndex;
            gpuSprite.layerCount = 0;
            gpuSprite.x = sprite.config.x ?? 0;
            gpuSprite.y = sprite.config.y ?? 0;
            const tiling = sprite.tiling ?? "";
            gpuSprite.tileX = tiling.includes("x");
            gpuSprite.tileY = tiling.includes("y");
            gpuSprite.px = sprite.config.px ?? 0;
            gpuSprite.py = sprite.config.py ?? 0;
            gpuSprite.mx = sprite.config.mx ?? 0;
            gpuSprite.my = sprite.config.my ?? 0;
            gpuSprite.mt = sprite.config.mt ?? 0;
            gpuSprite.bobx = sprite.config.bobx ?? 0;
            gpuSprite.boby = sprite.config.boby ?? 0;
            gpuSprite.bobt = (sprite.config.bobt && sprite.config.bobt !== 0) ? 1 / sprite.config.bobt : 0;
            gpuSprite.bobo = sprite.config.bobo ?? 0;
            gpuSprite.width = sprite.width;
            gpuSprite.height = sprite.height;
            gpuSprite.frameCount = sprite.subtextures.length;
            gpuSprite.fps = sprite.config.animated?.fps ?? 0;
            gpuSprite.layer = sprite.layer;

            const rows = Math.ceil((currentShelfX + sprite.subtextures.length * sprite.width) / ATLAS_TEXTURE_SIZE);
            const fitsOnCurrentShelf = currentShelfX + sprite.width <= ATLAS_TEXTURE_SIZE && rows == 1;

            if (!fitsOnCurrentShelf && currentShelfX > 0) {
                currentShelfY += currentShelfHeight;
                currentShelfX = 0;
                currentShelfHeight = 0;
            }

            const needsNewAtlas = currentShelfY + sprite.height > ATLAS_TEXTURE_SIZE;
            if (needsNewAtlas && (currentShelfY > 0 || currentShelfX > 0)) {
                await saveCurrentAtlas();
                ctx.clearRect(0, 0, ATLAS_TEXTURE_SIZE, ATLAS_TEXTURE_SIZE);
                currentShelfY = 0;
                currentShelfX = 0;
                currentShelfHeight = 0;
            }

            let textureIndex = 0;
            gpuSprite.startX = currentShelfX;
            gpuSprite.startY = currentShelfY;
            while (textureIndex < sprite.subtextures.length) {
                const startX = currentShelfX;
                const startY = currentShelfY;
                let x = startX;
                let y = startY;
                while (textureIndex < sprite.subtextures.length) {
                    if (x == 0 && y + sprite.height > ATLAS_TEXTURE_SIZE) break;
                    const texture = sprite.subtextures[textureIndex]!!;
                    const bitmap = sprite.bitmaps[texture.bitmap]!!;
                    const srcX = texture.x;
                    const srcY = texture.y;
                    const srcW = texture.width;
                    const srcH = texture.height;
                    const padding = sprite.padding;

                    if (padding > 0) {
                        ctx.drawImage(bitmap, srcX, srcY, srcW, srcH,
                            x + padding, y + padding, srcW, srcH);
                        ctx.drawImage(bitmap, srcX, srcY, 1, srcH,
                            x, y + padding, padding, srcH);
                        ctx.drawImage(bitmap, srcX + srcW - 1, srcY, 1, srcH,
                            x + sprite.width - padding, y + padding, padding, srcH);
                        ctx.drawImage(bitmap, srcX, srcY, srcW, 1,
                            x + padding, y, srcW, padding);
                        ctx.drawImage(bitmap, srcX, srcY + srcH - 1, srcW, 1,
                            x + padding, y + sprite.height - padding, srcW, padding);
                        ctx.drawImage(bitmap, srcX, srcY, 1, 1,
                            x, y, padding, padding);
                        ctx.drawImage(bitmap, srcX + srcW - 1, srcY, 1, 1,
                            x + sprite.width - padding, y, padding, padding);
                        ctx.drawImage(bitmap, srcX, srcY + srcH - 1, 1, 1,
                            x, y + sprite.height - padding, padding, padding);
                        ctx.drawImage(bitmap, srcX + srcW - 1, srcY + srcH - 1, 1, 1,
                            x + sprite.width - padding, y + sprite.height - padding,
                            padding, padding);
                    } else {
                        ctx.drawImage(bitmap, srcX, srcY, srcW, srcH,
                            x + padding, y + padding, srcW, srcH);
                    }
                    x += sprite.width;
                    maxWidth = Math.max(x, maxWidth);
                    if (x + sprite.width > ATLAS_TEXTURE_SIZE) {
                        x = 0;
                        y += sprite.height;
                    }
                    textureIndex += 1;
                }
                maxHeight = Math.max(x == 0 ? y : y + sprite.height, maxHeight);
                if (textureIndex < sprite.subtextures.length) {
                    gpuSprite.layerCount++;
                    await saveCurrentAtlas();
                } else {
                    if (x == 0) {
                        currentShelfX = 0;
                        currentShelfY = y;
                    } else {
                        currentShelfX = x;
                        currentShelfY = y;
                        currentShelfHeight = Math.max(currentShelfHeight, sprite.height);
                    }
                }
            }
            sprite.bitmaps.forEach(b => b.close());
            gpuSprites.push(gpuSprite as GPUSprite);
        }
        if (currentShelfY > 0 || currentShelfX > 0) {
            await saveCurrentAtlas();
        }
        let i = 0;
        this.texture = gl.createTexture();
        this.atlasLayerCount = atlases.length;
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.texture);
        gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, finalWidth, finalHeight, atlases.length);
        renderCanvas.width = finalWidth;
        renderCanvas.height = finalHeight;
        for (const bitmap of atlases) {
            // Extract only the used portion of the bitmap
            ctx.clearRect(0, 0, finalWidth, finalHeight)
            ctx.putImageData(bitmap, 0, 0, 0, 0, finalWidth, finalHeight);
            const croppedData = ctx.getImageData(0, 0, finalWidth, finalHeight);
            
            gl.texSubImage3D(
                gl.TEXTURE_2D_ARRAY,
                0,
                0, 0, i,
                finalWidth, finalHeight, 1,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                croppedData.data
            );
            i++;
        }
        if (this.isPixelArt) {
            gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        } else {
            gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        }
        gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        let rawMem = sprites.reduce((acc, elm) => acc + elm.width * elm.height * elm.subtextures.length, 0) * 4;
        let mem = finalWidth * finalHeight * 4 * atlases.length;
        this.atlasSize.width = finalWidth;
        this.atlasSize.height = finalHeight;
        console.log(`Successfully created ${finalWidth} x ${finalHeight} x ${atlases.length} static background atlas`);
        console.log("Uploaded gpu textures, memory:", mem, "bytes.");
        console.log(`That is ${(1 - mem / rawMem) * 100}% more than just not doing shit, ${rawMem}`);
        return gpuSprites;
    }

    /**
     * Creates the WebGL2 items to finalize rendering and uploads textures
     * @returns The raw sprites loaded from IndexedDB
     */
    async loadGL(sprites: GPUSprite[]) {
        sprites.sort((a, b) => b.layer - a.layer);
        // Create shader
        // @ts-ignore todo
        let vertex: string = await StellarAssetManager.internal["render/staticbackground.vert"]!!.blob.text();
        // @ts-ignore todo
        let fragment: string = await StellarAssetManager.internal["render/staticbackground.frag"]!!.blob.text();
        vertex = vertex.replace("const vec2 backgroundSize = vec2(0.0, 0.0);", `const vec2 backgroundSize = vec2(${atz(this.width)}, ${atz(this.height)});`);
        vertex = vertex.replace("const vec2 atlasSize = vec2(0.0, 0.0);", `const vec2 atlasSize = vec2(${atz(this.atlasSize.width)}, ${atz(this.atlasSize.height)});`);
        this.shader = createProgram(vertex, fragment);

        this.uniforms.u_resolution = gl.getUniformLocation(this.shader, "u_resolution");
        this.uniforms.u_player_pos = gl.getUniformLocation(this.shader, "u_player_pos");
        this.uniforms.u_zoomScale = gl.getUniformLocation(this.shader, "u_zoomScale");
        this.uniforms.u_time = gl.getUniformLocation(this.shader, "u_time");
        this.uniforms.u_alpha = gl.getUniformLocation(this.shader, "u_alpha");
        const quadVertices = new Float32Array([
            -1, -1, 0, 0,
            1, -1, 1, 0,
            -1, 1, 0, 1,
            -1, 1, 0, 1,
            1, -1, 1, 0,
            1, 1, 1, 1
        ]);
        this.quadVBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO);
        gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);
        // Create instance VBO
        this.instanceVBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceVBO);

        // Setup VAO
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);
        gl.vertexAttribDivisor(0, 0);
        gl.vertexAttribDivisor(1, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceVBO);


        // Build the shaders
        const sizes: Record<string, number> = {
            "float": 1,
            "vec2": 2,
            "vec3": 3,
            "vec4": 4,
        }
        this.shaderOrder = {};
        const shaderValues: Record<string, number[][]> = {}
        let shaderSize = 0;
        for (const match of vertex.matchAll(/layout\(location ?= *?(\d+)\) ? in ? ([a-z0-9]+) ? (.*?);/g)) {
            const location = Number.parseInt(match[1]!!);
            if (location == 0 || location == 1) continue;
            const type = match[2]!!;
            const size = sizes[type]!!;
            const name = match[3]!!;
            this.shaderOrder[name] = [size, location];
            shaderValues[name] = [];
            shaderSize += size;
        }
        const ordered = Object.entries(this.shaderOrder).sort((a, b) => a[1][1] - b[1][1]);

        this.instanceData = new Float32Array(sprites.length * shaderSize);
        this.buildInstanceData(sprites, shaderValues);
        let offset = 0;
        for (let i = 0; i < this.spriteCount; i++) {
            for (const [item, [size, location]] of ordered) {
                const shaderValue = shaderValues[item]!![i]!!;
                if (!shaderValue) throw `Couldn't find a value for ${item}`
                const actualSize = shaderValue.length;
                if (actualSize != size) {
                    throw `Expected ${size} floats for ${item}, found ${actualSize}.`
                }
                this.instanceData.set(shaderValue, offset);
                offset += size;
            }
        }
        offset = 0;
        for (const [item, [size, location]] of ordered) {
            gl.enableVertexAttribArray(location);
            gl.vertexAttribPointer(location, size, gl.FLOAT, false, shaderSize * 4, offset * 4);
            gl.vertexAttribDivisor(location, 1);
            offset += size;
        }
console.log("Setting up vertex attributes, spriteCount:", this.spriteCount, "instanceData length:", this.instanceData.length);

        gl.bufferData(gl.ARRAY_BUFFER, this.instanceData, gl.STATIC_DRAW);
        gl.bindVertexArray(null);
    }
    buildInstanceData(sprites: GPUSprite[], shaderData: Record<string, number[][]>) {
        let i = 0;
        for (const sprite of sprites) {
            i++;
            
            const halfWidth = this.width / 2;
            const halfHeight = this.height / 2;

            shaderData["i_offset"]!!.push([
                (sprite.x ?? 0) / halfWidth,
                -(sprite.y ?? 0) / halfHeight
            ]);

            shaderData["i_scale"]!!.push([
                (sprite.width / 2) / halfWidth,
                (sprite.height / 2) / halfHeight
            ]);

            shaderData["i_tileRepeat"]!!.push([ // Number of times to repeat tile to fill the screen
                sprite.tileX ? this.width / sprite.width : 1,
                sprite.tileY ? this.height / sprite.height : 1
            ]);

            shaderData["i_tileMask"]!!.push([
                sprite.tileX ? 1 : 0, // tile x
                sprite.tileY ? 1 : 0, // tile y
                sprite.tileX ? 0 : 1, // inverse tile x
                sprite.tileY ? 0 : 1  // inverse tile y
            ]);

            shaderData["i_movement"]!!.push([
                sprite.mx,     // mx
                sprite.my, // my
                sprite.mt                  // mt
            ]);

            shaderData["i_parallax"]!!.push([
                sprite.px,
                sprite.py
            ]);

            shaderData["i_bob"]!!.push([
                sprite.bobx / halfWidth,     // bobx
                -(sprite.boby / halfHeight), // boby
                sprite.bobt,                 // bobt
                sprite.bobo,                 // bobo
            ]);
            shaderData["i_animation1"]!!.push([
                sprite.frameCount,    // frame_count
                sprite.fps,    // fps
                sprite.width,  // frame_width_px
                sprite.height, // frame_height_px
            ]);
            shaderData["i_animation2"]!!.push([
                sprite.startLayer,
                this.atlasSize.width / sprite.width,
                sprite.startX,
                sprite.startY,
            ]);
            shaderData["i_animation3"]!!.push([
                0, 0
            ]);
        }
    }

    // GL states
    lastResolutionWidth = 0;
    lastResolutionHeight = 0;
    lastOpacity = 0;
    lastZoomScale = 0;
    override render() {
        if (!this.loaded || !this.shader || !this.vao) return;
        // console.log("rednering", this.config_path, this.shader);
        gl.useProgram(this.shader);
        const position = Interstellar.patcher.getPlayerPosition();
        const zoom = Interstellar.patcher.zoom * 2 + 1;
        const time = (Date.now() - this.startTime) / 1000;
        if (this.lastResolutionWidth != Interstellar.drednotCanvas.width || this.lastResolutionHeight != Interstellar.drednotCanvas.height) {
            gl.uniform2f(this.uniforms.u_resolution!, 
                this.lastResolutionWidth = Interstellar.drednotCanvas.width, 
                this.lastResolutionHeight = Interstellar.drednotCanvas.height
            );  
        }
        if (this.lastZoomScale != zoom) gl.uniform1f(this.uniforms.u_zoomScale!, this.lastZoomScale = zoom);
        if (this.lastOpacity != this.alpha) {
            gl.uniform1f(this.uniforms.u_alpha!!, this.alpha);
            this.lastOpacity = this.alpha;
        }

        gl.uniform2f(this.uniforms.u_player_pos!, position.x, -position.y);
        gl.uniform1f(this.uniforms.u_time!, time);
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.texture);
        gl.bindVertexArray(this.vao);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.spriteCount);
        gl.bindVertexArray(null);
    }
    async unload() {
        if (this.locked) {this.unload_locked = true; return;}
        console.log("unloading background", this.config_path);
        this.loaded = false;
        this.locked = false;
        if (this.texture) gl.deleteTexture(this.texture);
        if (this.instanceVBO) gl.deleteBuffer(this.instanceVBO);
        if (this.quadVBO) gl.deleteBuffer(this.quadVBO);
        if (this.vao) gl.deleteVertexArray(this.vao);
        if (this.shader) gl.deleteProgram(this.shader);
        this.lastResolutionWidth = 0;
        this.lastResolutionHeight = 0;
        this.lastZoomScale = 0;
        this.lastOpacity = 0;
        this.uniforms = {};
        this.shaderOrder = {};
        this.instanceData = new Float32Array(0);
        this.shader = this.vao = this.quadVBO = this.instanceVBO = this.texture = null;
    }

}

function atz(n: number) {
    return Number.isInteger(n) ? n.toString() + ".0" : n.toString();
}