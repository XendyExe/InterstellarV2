import PostProcessor from "./PostProcessor";
import { gl } from "../WebGLHelpers";

const vertexShader = `#version 300 es
in vec2 a_position;
out vec2 v_texCoord;

void main() {
    v_texCoord = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const fragmentShader = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform sampler2D u_displacementMap;
uniform vec2 u_resolution;

uniform float u_seed;
uniform float u_offset;
uniform float u_direction;
uniform float u_aspect;

uniform float u_saturation;

uniform vec2 u_pixelSize;

uniform vec2 u_redOffset;
uniform vec2 u_greenOffset;
uniform vec2 u_blueOffset;

vec2 mapCoord(vec2 coord) {
    return coord * u_resolution;
}

vec2 unmapCoord(vec2 coord) {
    return coord / u_resolution;
}

vec2 pixelate(vec2 coord, vec2 size) {
    return floor(coord / size) * size;
}

void main() {
    vec2 uv = v_texCoord;
    vec2 coord = mapCoord(uv);
    coord = pixelate(coord, u_pixelSize);
    vec2 pixelatedUV = unmapCoord(coord);
    
    vec2 finalUV = pixelatedUV;
    if (u_offset > 0.0) {
        vec2 glitchCoord = (pixelatedUV * u_resolution) / u_resolution;
        
        float sinDir = sin(u_direction);
        float cosDir = cos(u_direction);
        
        float cx = glitchCoord.x - 0.5;
        float cy = (glitchCoord.y - 0.5) * u_aspect;
        float ny = (-sinDir * cx + cosDir * cy) / u_aspect + 0.5;
        
        ny = ny > 1.0 ? 2.0 - ny : (ny < 0.0 ? -ny : ny);
        
        vec4 dc = texture(u_displacementMap, vec2(0.5, ny));
        float displacement = (dc.r - dc.g) * (u_offset / u_resolution.x);
        
        finalUV = pixelatedUV + vec2(cosDir * displacement, sinDir * displacement * u_aspect);
    }
    
    finalUV = clamp(finalUV, 0.0, 1.0);
    
    // 3. RGB Split effect
    float seedR = 1.0 - u_seed * 0.4;
    float seedG = 1.0 - u_seed * 0.3;
    float seedB = 1.0 - u_seed * 0.2;
    
    vec2 offsetR = u_redOffset * seedR / u_resolution;
    vec2 offsetG = u_greenOffset * seedG / u_resolution;
    vec2 offsetB = u_blueOffset * seedB / u_resolution;
    
    float r = texture(u_texture, clamp(finalUV + offsetR, 0.0, 1.0)).r;
    float g = texture(u_texture, clamp(finalUV + offsetG, 0.0, 1.0)).g;
    float b = texture(u_texture, clamp(finalUV + offsetB, 0.0, 1.0)).b;
    float a = texture(u_texture, clamp(finalUV, 0.0, 1.0)).a;
    
    vec3 color = vec3(r, g, b);
    fragColor = vec4(color, a);
}
`;

// copious amount of ai slop because i cannot be bothered to figure out how post processing shaders work rn -w-
export default class TransitionPostProcessor extends PostProcessor {
    // Uniform locations
    private resolutionLocation: WebGLUniformLocation | null;
    private displacementMapLocation: WebGLUniformLocation | null;
    private seedLocation: WebGLUniformLocation | null;
    private offsetLocation: WebGLUniformLocation | null;
    private directionLocation: WebGLUniformLocation | null;
    private aspectLocation: WebGLUniformLocation | null;
    private saturationLocation: WebGLUniformLocation | null;
    private pixelSizeLocation: WebGLUniformLocation | null;
    private redOffsetLocation: WebGLUniformLocation | null;
    private greenOffsetLocation: WebGLUniformLocation | null;
    private blueOffsetLocation: WebGLUniformLocation | null;

    private displacementTexture: WebGLTexture;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    
    private _slices: number = 5;
    private _sizes: Float32Array = new Float32Array(5);
    private _offsets: Float32Array = new Float32Array(5);
    private sampleSize: number = 512;
    private minSize: number = 8;
    private average: boolean = false;

    public seed: number = 0.313;
    public offset: number = 200;
    public direction: number = 0;
    public saturation: number = 0.5;
    public pixelSize: { x: number; y: number } = { x: 8, y: 8 };
    public redOffset: { x: number; y: number } = { x: 20, y: 20 };
    public greenOffset: { x: number; y: number } = { x: 0, y: 0 };
    public blueOffset: { x: number; y: number } = { x: -20, y: -20 };

    constructor() {
        super(vertexShader, fragmentShader);
        this.canvas = document.createElement('canvas');
        this.canvas.width = 4;
        this.canvas.height = this.sampleSize;
        this.ctx = this.canvas.getContext('2d')!;

        // Create displacement texture
        this.displacementTexture = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, this.displacementTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.bindTexture(gl.TEXTURE_2D, null);

        // Get uniform locations
        this.resolutionLocation = gl.getUniformLocation(this.program, 'u_resolution');
        this.displacementMapLocation = gl.getUniformLocation(this.program, 'u_displacementMap');
        this.seedLocation = gl.getUniformLocation(this.program, 'u_seed');
        this.offsetLocation = gl.getUniformLocation(this.program, 'u_offset');
        this.directionLocation = gl.getUniformLocation(this.program, 'u_direction');
        this.aspectLocation = gl.getUniformLocation(this.program, 'u_aspect');
        this.saturationLocation = gl.getUniformLocation(this.program, 'u_saturation');
        this.pixelSizeLocation = gl.getUniformLocation(this.program, 'u_pixelSize');
        this.redOffsetLocation = gl.getUniformLocation(this.program, 'u_redOffset');
        this.greenOffsetLocation = gl.getUniformLocation(this.program, 'u_greenOffset');
        this.blueOffsetLocation = gl.getUniformLocation(this.program, 'u_blueOffset');

        // Initialize glitch with the default slices
        this.slices = 20; // Set to 20 like your PixiJS code
    }

    private randomizeSizes(): void {
        const arr = this._sizes;
        const last = this._slices - 1;
        const size = this.sampleSize;
        const min = Math.min(this.minSize / size, 0.9 / this._slices);

        if (this.average) {
            const count = this._slices;
            let rest = 1;

            for (let i = 0; i < last; i++) {
                const averageWidth = rest / (count - i);
                const w = Math.max(averageWidth * (1 - (Math.random() * 0.6)), min);
                arr[i] = w;
                rest -= w;
            }
            arr[last] = rest;
        } else {
            let rest = 1;
            const ratio = Math.sqrt(1 / this._slices);

            for (let i = 0; i < last; i++) {
                const w = Math.max(ratio * rest * Math.random(), min);
                arr[i] = w;
                rest -= w;
            }
            arr[last] = rest;
        }

        this.shuffle();
    }

    private shuffle(): void {
        const arr = this._sizes;
        const last = this._slices - 1;

        for (let i = last; i > 0; i--) {
            const rand = (Math.random() * i) >> 0;
            const temp = arr[i];
            arr[i] = arr[rand]!!;
            arr[rand] = temp!!;
        }
    }

    private randomizeOffsets(): void {
        for (let i = 0; i < this._slices; i++) {
            this._offsets[i] = Math.random() * (Math.random() < 0.5 ? -1 : 1);
        }
    }

    public refresh(): void {
        this.randomizeSizes();
        this.randomizeOffsets();
        this.redraw();
    }

    private redraw(): void {
        const size = this.sampleSize;
        this.ctx.clearRect(0, 0, 4, size);

        let y = 0;
        for (let i = 0; i < this._slices; i++) {
            const offset = Math.floor(this._offsets[i]!! * 256);
            const height = this._sizes[i]!! * size;
            const red = offset > 0 ? offset : 0;
            const green = offset < 0 ? -offset : 0;

            this.ctx.fillStyle = `rgba(${red}, ${green}, 0, 1)`;
            this.ctx.fillRect(0, y >> 0, 4, (height + 1) >> 0);
            y += height;
        }

        // Update texture
        gl.bindTexture(gl.TEXTURE_2D, this.displacementTexture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            this.canvas
        );
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    get slices(): number {
        return this._slices;
    }

    set slices(value: number) {
        if (this._slices === value) return;
        this._slices = value;
        this._sizes = new Float32Array(value);
        this._offsets = new Float32Array(value);
        this.refresh();
    }

    lastResX = 0;
    lastResY = 0;
    uploaded = false;
    update() {
        const width = gl.canvas.width;
        const height = gl.canvas.height;
        this.refresh();
        
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.displacementTexture);
        if (this.displacementMapLocation) {
            gl.uniform1i(this.displacementMapLocation, 1);
        }
        gl.activeTexture(gl.TEXTURE0);

        if (this.resolutionLocation && this.aspectLocation && (this.lastResX != width || this.lastResY != height)) {
            gl.uniform2f(this.resolutionLocation, width, height);
            gl.uniform1f(this.aspectLocation, height / width);
            this.lastResX = width;
            this.lastResY = height;
        }

        if (!this.uploaded) {
            if (this.seedLocation) {
                gl.uniform1f(this.seedLocation, this.seed);
                this.uploaded = this.uploaded && true;
            } else this.uploaded = false;
            if (this.offsetLocation) {
                gl.uniform1f(this.offsetLocation, this.offset);
                this.uploaded = this.uploaded && true;
            } else this.uploaded = false;
            if (this.directionLocation) {
                gl.uniform1f(this.directionLocation, this.direction);
                this.uploaded = this.uploaded && true;
            } else this.uploaded = false;
            if (this.saturationLocation) {
                gl.uniform1f(this.saturationLocation, this.saturation);
                this.uploaded = this.uploaded && true;
            } else this.uploaded = false;
            if (this.pixelSizeLocation) {
                gl.uniform2f(this.pixelSizeLocation, this.pixelSize.x, this.pixelSize.y);
                this.uploaded = this.uploaded && true;
            } else this.uploaded = false;
            if (this.redOffsetLocation) {
                gl.uniform2f(this.redOffsetLocation, this.redOffset.x, this.redOffset.y);
                this.uploaded = this.uploaded && true;
            } else this.uploaded = false;
            if (this.greenOffsetLocation) {
                gl.uniform2f(this.greenOffsetLocation, this.greenOffset.x, this.greenOffset.y);
                this.uploaded = this.uploaded && true;
            } else this.uploaded = false;
            if (this.blueOffsetLocation) {
                gl.uniform2f(this.blueOffsetLocation, this.blueOffset.x, this.blueOffset.y);
                this.uploaded = this.uploaded && true;
            } else this.uploaded = false;
        }
    }
}