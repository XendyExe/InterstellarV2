import { BasePostProcessingConfig } from "../../Modding/ModdingTypes/ZoneConfig";
import Patcher from "../../Patching/Patcher";
import { InterstellarWebGL, Framebuffer, BUFF_STAGE } from "../InterstellarWebGL";
import { createProgram, gl } from "../WebGLHelpers";
import ComplexPostProcessor from "./ComplexPostProcessor";
import PostProcessor from "./PostProcessor";

export interface BloomProcessorConfig extends BasePostProcessingConfig {
    threshold: number,
    blurriness: number,
    blurPasses: number,
    opacity: number
}
// https://learnopengl.com/Advanced-Lighting/Bloom
export default class BloomProcessor extends ComplexPostProcessor {
    extractBrightProgram: PostProcessor;
    blurProgram: PostProcessor;
    private threshold: number = 0.85;
    private blurriness: number = 4;
    private blurPasses: number = 7;
    private opacity: number = 0.2;

    blurHoriz = false;
    finalPass = false;
    constructor(config: Partial<BloomProcessorConfig> = {}) {
        super();
        this.threshold = config.threshold ?? 0.85;
        this.blurriness = config.blurriness ?? 4;
        this.blurPasses = config.blurPasses ?? 7;
        this.opacity = config.opacity ?? 1;
        this.extractBrightProgram = new PostProcessor(`#version 300 es
                in vec2 a_position;
                out vec2 v_texCoord;
                
                void main() {
                    v_texCoord = a_position * 0.5 + 0.5;
                    gl_Position = vec4(a_position, 0.0, 1.0);
                }
            `,
            `#version 300 es
                precision highp float;
                in vec2 v_texCoord;
                out vec4 fragColor;
                uniform sampler2D u_texture;
                uniform float u_threshold;
                
                void main() {
                    vec4 samp = texture(u_texture, v_texCoord);
                    float brightness = dot(samp.rgb, vec3(0.2126, 0.7152, 0.0722));
                    if(brightness > 0.85)
                        fragColor = vec4(samp.rgb, 1.0);
                    else
                        fragColor = vec4(0.0, 0.0, 0.0, 1.0);
                }
            `);
        this.blurProgram = new PostProcessor(`#version 300 es
                in vec2 a_position;
                out vec2 v_texCoord;
                
                void main() {
                    v_texCoord = a_position * 0.5 + 0.5;
                    gl_Position = vec4(a_position, 0.0, 1.0);
                }
            `, `#version 300 es
                precision highp float;
                const float weight[5] = float[] (0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);
                in vec2 v_texCoord;
                out vec4 fragColor;
                uniform sampler2D u_texture;
                uniform float u_horizontal;
                uniform float u_radius;
                uniform float u_final;
                uniform float u_opacity;

                void main() {
                    ivec2 tex_size = textureSize(u_texture, 0);
                    vec2 tex_offset = vec2(u_radius / float(tex_size.x), u_radius / float(tex_size.y)); // gets size of single texel
                    vec3 result = texture(u_texture, v_texCoord).rgb * weight[0]; // current fragment's contribution
                    if(u_horizontal < 0.5)
                    {
                        for(int i = 1; i < 5; ++i)
                        {
                            result += texture(u_texture, v_texCoord + vec2(tex_offset.x * float(i), 0.0)).rgb * weight[i];
                            result += texture(u_texture, v_texCoord - vec2(tex_offset.x * float(i), 0.0)).rgb * weight[i];
                        }
                    }
                    else
                    {
                        for(int i = 1; i < 5; ++i)
                        {
                            result += texture(u_texture, v_texCoord + vec2(0.0, tex_offset.y * float(i))).rgb * weight[i];
                            result += texture(u_texture, v_texCoord - vec2(0.0, tex_offset.y * float(i))).rgb * weight[i];
                        }
                    }
                    
                    if (u_final < 0.5) fragColor = vec4(result, 1.0);
                    else {
                        fragColor = vec4(result * u_opacity, 1.0);
                    }
                }
            `);
    }

    setUniforms = false;
    render(igl: InterstellarWebGL, buffer: Framebuffer, time: number): void {
        const zoom = Patcher.zoom * 0.5;
        const bloomBuffer = igl.getInactiveFramebuffer();
        if (!this.setUniforms) {
            gl.useProgram(this.extractBrightProgram.program);
            gl.uniform1f(gl.getUniformLocation(this.extractBrightProgram.program, 'u_threshold'), this.threshold);
        }
        buffer.copyTo(bloomBuffer, this.extractBrightProgram, BUFF_STAGE.PROCESSOR);

        gl.useProgram(this.blurProgram.program);
        gl.uniform1f(gl.getUniformLocation(this.blurProgram.program, 'u_radius'), this.blurriness * (zoom + 1));
        gl.uniform1f(gl.getUniformLocation(this.blurProgram.program, 'u_opacity'), this.opacity);
        gl.uniform1f(gl.getUniformLocation(this.blurProgram.program, 'u_final'), 0.0);
        for (let i = 0; i < this.blurPasses; i++) {
            gl.uniform1f(gl.getUniformLocation(this.blurProgram.program, 'u_horizontal'), 1.0);
            igl.getFramebuffer(BUFF_STAGE.PROCESSOR).renderTo(igl.getInactiveFramebuffer(), this.blurProgram);
            gl.uniform1f(gl.getUniformLocation(this.blurProgram.program, 'u_horizontal'), 0.0);
            if (i + 1 < this.blurPasses) igl.getFramebuffer(BUFF_STAGE.PROCESSOR).renderTo(igl.getInactiveFramebuffer(), this.blurProgram);
        }
        gl.uniform1f(gl.getUniformLocation(this.blurProgram.program, 'u_final'), 1.0);
        gl.blendFunc(gl.ONE, gl.ONE);
        igl.getFramebuffer(BUFF_STAGE.PROCESSOR).renderTo(buffer, this.blurProgram);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    }
}