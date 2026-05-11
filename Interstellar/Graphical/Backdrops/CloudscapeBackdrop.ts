import parseColor, { getB, getG, getR } from "../../Modding/ColorParser";
import Patcher from "../../Patching/Patcher";
import StellarAssetManager from "../../StellarAssetManager";
import InterstellarWebGL, { BUFF_STAGE } from "../InterstellarWebGL";
import { createProgram, gl } from "../WebGLHelpers";

// @ts-ignore
const CLOUDSCAPE_DATA: {
    texture: WebGLTexture,
    uvs: {
        leftUV: number,
        rightUV: number,
        topUV: number,
        bottomUV: number,
        width: number,
        height: number
    }[]
} = {};

const LEVEL_OF_DETAIL = 16;
export async function loadCloudscapeData() {
    const blob = StellarAssetManager.internal!!["render/cloudscapeAtlas.png"]!!.blob;
    const bitmap = await createImageBitmap(blob);
    CLOUDSCAPE_DATA.texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, CLOUDSCAPE_DATA.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    bitmap.close();

    CLOUDSCAPE_DATA.uvs = [
        {
            "topUV": 0,
            "bottomUV": 0.18484848484848485,
            "leftUV": 0,
            "rightUV": 0.6055276381909548,
            "width": 241,
            "height": 61
        },
        {
            "topUV": 0.3333333333333333,
            "bottomUV": 0.5757575757575758,
            "leftUV": 0,
            "rightUV": 1,
            "width": 398,
            "height": 80
        },
        {
            "topUV": 0.6666666666666666,
            "bottomUV": 1,
            "leftUV": 0,
            "rightUV": 0.628140703517588,
            "width": 250,
            "height": 110
        }
    ]
}

export interface LightningConfig {
    lightningMinDelay: number;
    lightningMaxDelay: number;
    lightningMinDuration: number;
    lightningMaxDuration: number;
    lightningIntensity: number;
    lightningFlashColor: number;
    lightningColors: number[];
}
export interface CloudscapeConfig {
    x: number;
    y: number;
    pz: number;
    innerRotation: number;
    outerRotation: number;
    rotationExponent: number;
    innerRadius: number;
    outerRadius: number;
    ringCount: number;
    density: number;
    bgColor: number;
    gradientColors: number[];
    lightning: LightningConfig | undefined | false | null;
}


export interface InternalLightningConfig {
    lightningMinDelay: number;
    lightningMaxDelay: number;
    lightningMinDuration: number;
    lightningMaxDuration: number;
    lightningIntensity: number;
    lightningFlashColor: [number, number, number, number];
    lightningColors: [number, number, number, number][];
}

export default class CloudscapeBackdrop {
    blitVao: WebGLVertexArrayObject;
    blitVbo: WebGLBuffer;
    program: WebGLProgram;
    blitProgram: WebGLProgram;
    locations: {
        attribs: Record<string, number>,
        uniforms: Record<string, WebGLUniformLocation>,
        blitUniforms: Record<string, WebGLUniformLocation>
    };
    vao: WebGLVertexArrayObject;
    vbo: WebGLBuffer;
    ibo: WebGLBuffer;
    colorTexture: WebGLTexture;
    framebuffer: WebGLFramebuffer;
    framebufferTexture: WebGLTexture;

    vertices: number[] = [];
    indices: number[] = [];
    colors: number[] = [];

    centerX: number;
    centerY: number;
    innerRotation: number;
    outerRotation: number;
    rotationExponent: number;
    innerRadius: number;
    outerRadius: number;
    ringCount: number;
    density: number;
    bgColor: [number, number, number, number];
    gradientColors: [number, number, number, number][];
    lightning: InternalLightningConfig | null;

    cloudLength = 0;
    width = 0;
    height = 0;
    pz = 1;
    
    constructor(config: Partial<CloudscapeConfig>, width: number, height: number) {
        this.width = width;
        this.height = height;
        this.centerX = config.x ?? 0;
        this.centerY = config.y ?? 0;
        this.innerRotation = config.innerRotation ?? 0.1;
        this.outerRotation = config.outerRotation ?? 0.1;
        this.rotationExponent = config.rotationExponent ?? 0.5;
        this.innerRadius = config.innerRadius ?? 10;
        this.outerRadius = config.outerRadius ?? 190;
        this.ringCount = config.ringCount ?? 50;
        this.density = config.density ?? 1;
        this.pz = config.pz ?? 1;
        const _bgColor = parseColor(config.bgColor ?? 0);
        this.bgColor = [getR(_bgColor), getG(_bgColor), getB(_bgColor), 1.0];
        this.gradientColors = (config.gradientColors?.map((s) => parseColor(s)) ?? [0]).map(color => [getR(color), getG(color), getB(color), 1.0]);
        if (config.lightning) {
            const _flash = parseColor(config.lightning.lightningFlashColor ?? 0xFFFFFF);
            this.lightning = {
                lightningColors: (config.lightning.lightningColors?.map((s) => parseColor(s)) ?? [0xFFFFFF]).map(color => [getR(color), getG(color), getB(color), 1.0]),
                lightningMinDelay: config.lightning.lightningMinDelay ?? 2, 
                lightningMaxDelay: config.lightning.lightningMaxDelay ?? 10, 
                lightningMinDuration: config.lightning.lightningMinDuration ?? 1, 
                lightningMaxDuration: config.lightning.lightningMaxDuration ?? 3,
                lightningIntensity: config.lightning.lightningIntensity ?? 1,
                lightningFlashColor: [getR(_flash), getG(_flash), getB(_flash), 1.0]
            }
        }
        else this.lightning = null;

        this.framebufferTexture = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, this.framebufferTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        this.framebuffer = gl.createFramebuffer()!;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.framebufferTexture, 0);

        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            console.error('Framebuffer incomplete');
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
         this.program = createProgram(
        `#version 300 es
            precision highp float;

            in vec2 a_polar;
            in vec2 a_uv;
            in vec2 a_ids;
            
            const vec2 resolution = vec2(${width}.0, ${height}.0);

            uniform vec2 u_offset;
            uniform float u_innerRotation;
            uniform float u_outerRotation;
            uniform float u_rotationExponent;
            uniform float u_time;
            uniform float u_ringCount;
            uniform float u_outerRadius;

            out vec2 v_uv;
            flat out int v_cloudId;

            void main() {
                float angle = a_polar.x;
                float distance = a_polar.y;
                int cloudId = int(a_ids.x);
                float ring = a_ids.y;
                
                float percent = ring / u_ringCount;
                float d_rotation = u_outerRotation - u_innerRotation;
                float speed = d_rotation * pow(abs(percent), u_rotationExponent) + u_innerRotation;
                
                angle -= speed * u_time;
                
                vec2 cartesian = vec2(cos(angle), sin(angle)) * distance;
                
                // Simple projection to normalized coordinates
                vec2 proj_offset = u_offset / (resolution / 2.0);
                float x = cartesian.x / (resolution.x / 2.0) + proj_offset.x;
                float y = -(cartesian.y / (resolution.y / 2.0) + proj_offset.y);
                
                gl_Position = vec4(x, y, 0.0, 1.0);
                v_uv = a_uv;
                v_cloudId = cloudId;
            }
            `,`#version 300 es
                precision highp float;
                
                in vec2 v_uv;
                flat in int v_cloudId;
                
                uniform sampler2D u_atlasTexture;
                uniform sampler2D u_colorTexture;
                uniform float u_colorBufferSize;
                
                out vec4 fragColor;
                
                void main() {
                    float uvx = (float(v_cloudId) + 0.5) / u_colorBufferSize;
                    vec4 cloudColor = texture(u_colorTexture, vec2(uvx, 0.5));
                    vec4 texColor = texture(u_atlasTexture, v_uv);
                    
                    fragColor = texColor * cloudColor;
                }
            `);


        this.blitProgram = createProgram(`#version 300 es
        precision highp float;
        
        in vec2 a_position;
        in vec2 a_uv;
        
        uniform vec2 u_resolution;
        const vec2 background_size = vec2(${width}.0, ${height}.0);
        uniform float u_zoomScale;
        
        out vec2 v_uv;
        
        void main() {
            vec2 scale = u_resolution / background_size;
            float maxScale = max(scale.x, scale.y);
            vec2 finalScale = (background_size * maxScale / u_resolution) * u_zoomScale;
            vec2 scaledPos = a_position * finalScale;
            gl_Position = vec4(scaledPos, 0.0, 1.0);
            v_uv = a_uv;
        }`,
        `#version 300 es
        precision highp float;
        
        in vec2 v_uv;
        uniform sampler2D u_texture;
        
        out vec4 fragColor;
        
        void main() {
            fragColor = texture(u_texture, v_uv);
        }`

        );

        const quadVertices = new Float32Array([
            -1.0, -1.0,  0.0, 0.0,
             1.0, -1.0,  1.0, 0.0,
            -1.0,  1.0,  0.0, 1.0,
             1.0,  1.0,  1.0, 1.0
        ]);

        this.blitVao = gl.createVertexArray()!;
        gl.bindVertexArray(this.blitVao);

        this.blitVbo = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.blitVbo);
        gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

        const posLoc = gl.getAttribLocation(this.blitProgram, 'a_position');
        const uvLoc = gl.getAttribLocation(this.blitProgram, 'a_uv');

        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 16, 0);

        gl.enableVertexAttribArray(uvLoc);
        gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 16, 8);

        gl.bindVertexArray(null);

        this.locations = {
            attribs: {
                polar: gl.getAttribLocation(this.program, 'a_polar'),
                uv: gl.getAttribLocation(this.program, 'a_uv'),
                ids: gl.getAttribLocation(this.program, 'a_ids'),
            },
            uniforms: {
                offset: gl.getUniformLocation(this.program, 'u_offset')!!,
                innerRotation: gl.getUniformLocation(this.program, 'u_innerRotation')!!,
                outerRotation: gl.getUniformLocation(this.program, 'u_outerRotation')!!,
                rotationExponent: gl.getUniformLocation(this.program, 'u_rotationExponent')!!,
                time: gl.getUniformLocation(this.program, 'u_time')!!,
                dimensions: gl.getUniformLocation(this.program, 'u_dimensions')!!,
                ringCount: gl.getUniformLocation(this.program, 'u_ringCount')!!,
                atlasTexture: gl.getUniformLocation(this.program, 'u_atlasTexture')!!,
                colorTexture: gl.getUniformLocation(this.program, 'u_colorTexture')!!,
                colorBufferSize: gl.getUniformLocation(this.program, 'u_colorBufferSize')!!
            },
            blitUniforms: {
                u_resolution: gl.getUniformLocation(this.blitProgram, "u_resolution")!!,
                u_zoomScale: gl.getUniformLocation(this.blitProgram, "u_zoomScale")!!
            }
        };
        this.cloudLength = 0;
        for (let r = 0; r < this.ringCount; r++) {
            const percent = r / this.ringCount;
            const radius = this.innerRadius + (this.outerRadius - this.innerRadius) * percent;
            
            if (this.density === 0) continue;

            const colorIndex = percent * (this.gradientColors.length - 1);
            const colorIndexFloor = Math.floor(colorIndex);
            const colorIndexCeil = Math.min(colorIndexFloor + 1, this.gradientColors.length - 1);
            const colorLerp = colorIndex - colorIndexFloor;
            
            const color = this.gradientColors[colorIndexFloor]!!.map((c, i) => 
                c + (this.gradientColors[colorIndexCeil]!![i]!! - c) * colorLerp
            );

            let rotation = Math.random() * Math.PI * 2;
            let angle = 0;

            while (angle < Math.PI * 2) {
                const textureIdx = Math.floor(Math.random() * CLOUDSCAPE_DATA.uvs.length);
                const texture = CLOUDSCAPE_DATA.uvs[textureIdx]!!;
                
                const halfHeight = texture.height / 2;
                const centralAngle = texture.width / radius;
                const step = centralAngle / LEVEL_OF_DETAIL;
                
                const baseVertexIndex = this.vertices.length / 6;
                
                for (let i = 0; i < LEVEL_OF_DETAIL; i++) {
                    const th = rotation + angle + (step * i);
                    const uvx = texture.leftUV + (texture.rightUV - texture.leftUV) * (i / (LEVEL_OF_DETAIL - 1));
                    
                    this.vertices.push(
                        th, radius - halfHeight,
                        uvx, texture.topUV,
                        this.cloudLength, r
                    );
                    
                    this.vertices.push(
                        th, radius + halfHeight,
                        uvx, texture.bottomUV,
                        this.cloudLength, r
                    );
                    
                    if (i < LEVEL_OF_DETAIL - 1) {
                        const o = baseVertexIndex + i * 2;
                        this.indices.push(o, o + 1, o + 2);
                        this.indices.push(o + 1, o + 2, o + 3);
                    }
                }
                
                this.colors.push(...color);
                this.cloudLength++;
                // todo implement lightning later
                // this.warpedClouds.push(new WarpedCloud(color));
                angle += centralAngle / this.density;
            }
        }

        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        this.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);

        const stride = 6 * 4;
        gl.enableVertexAttribArray(this.locations.attribs.polar!!);
        gl.vertexAttribPointer(this.locations.attribs.polar!!, 2, gl.FLOAT, false, stride, 0);
        
        gl.enableVertexAttribArray(this.locations.attribs.uv!!);
        gl.vertexAttribPointer(this.locations.attribs.uv!!, 2, gl.FLOAT, false, stride, 8);
        
        gl.enableVertexAttribArray(this.locations.attribs.ids!!);
        gl.vertexAttribPointer(this.locations.attribs.ids!!, 2, gl.FLOAT, false, stride, 16);

        this.ibo = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.indices), gl.STATIC_DRAW);

        this.colorTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.colorTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.cloudLength, 1, 0, gl.RGBA, gl.FLOAT, new Float32Array(this.colors));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);

    }

    lastTime = 0;
    startTime = Date.now();
    render() {
        const currentTime = Date.now();
        const time = (currentTime - this.startTime) / 1000;
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;



        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        gl.viewport(0, 0, this.width, this.height);
        gl.clearColor(...this.bgColor);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(this.program);
        gl.bindVertexArray(this.vao);

        // todo optimize this later
        gl.uniform2f(this.locations.uniforms.offset!!, this.centerX, this.centerY);
        gl.uniform1f(this.locations.uniforms.innerRotation!!, this.innerRotation);
        gl.uniform1f(this.locations.uniforms.outerRotation!!, this.outerRotation);
        gl.uniform1f(this.locations.uniforms.rotationExponent!!, this.rotationExponent);
        gl.uniform1f(this.locations.uniforms.time!!, time);
        gl.uniform1f(this.locations.uniforms.ringCount!!, this.ringCount);
        gl.uniform1f(this.locations.uniforms.colorBufferSize!!, this.cloudLength);

        // todo and this
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, CLOUDSCAPE_DATA.texture);
        gl.uniform1i(this.locations.uniforms.atlasTexture!!, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.colorTexture);
        gl.uniform1i(this.locations.uniforms.colorTexture!!, 1);

        gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_INT, 0);
        // THIS IS VERY IMPORTANT TO REGAIN STATE OR WHATEVER.
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        
        // Blit to game buffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, InterstellarWebGL.getFramebuffer(BUFF_STAGE.GAME_BUFFER).fbo);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.useProgram(this.blitProgram);
        gl.bindVertexArray(this.blitVao);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.framebufferTexture);
        gl.uniform2f(this.locations.blitUniforms.u_resolution!!, gl.canvas.width, gl.canvas.height);
        gl.uniform1f(this.locations.blitUniforms.u_zoomScale!!, (Patcher.zoom * 2 * this.pz) + 1);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    destroy() {
        gl.deleteProgram(this.program);
        gl.deleteBuffer(this.vbo);
        gl.deleteBuffer(this.ibo);
        gl.deleteTexture(this.colorTexture);
        gl.deleteVertexArray(this.vao);
        // @ts-ignore for debug purposes, after destroy this shouldn't be used again anyways
        this.vertices = null;
    }
}