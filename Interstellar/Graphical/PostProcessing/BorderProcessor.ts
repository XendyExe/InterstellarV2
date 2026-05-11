import { BasePostProcessingConfig } from "../../Modding/ModdingTypes/ZoneConfig";
import Patcher from "../../Patching/Patcher";
import { InterstellarWebGL, Framebuffer, BUFF_STAGE } from "../InterstellarWebGL";
import { createProgram, gl } from "../WebGLHelpers";
import ColorOverlayProcessor from "./ColorOverlayProcessor";
import ComplexPostProcessor from "./ComplexPostProcessor";
import PostProcessor from "./PostProcessor";

// https://learnopengl.com/Advanced-Lighting/Bloom
export class BorderGlowProcessor extends ComplexPostProcessor {
    blurProgram: PostProcessor;
    colorOverlayProcessor = new ColorOverlayProcessor(0.0, 0.0, 0.0);
    private blurriness: number = 5;
    private blurPasses: number = 6;
    private opacity: number = 0.4;

    blurHoriz = false;
    finalPass = false;
    constructor() {
        super();
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
                uniform sampler2D u_dst_texture;
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
                        vec4 dst = texture(u_dst_texture, v_texCoord);
                        fragColor = vec4(result * u_opacity * dst.a, 1.0 * dst.a);
                    }
                }
            `);
    }

    // Buffer is the border buffer
    render(igl: InterstellarWebGL, buffer: Framebuffer, time: number): void {
        buffer.renderTo(igl.getInactiveFramebuffer(), this.colorOverlayProcessor);
        
        const bloomBuffer = igl.getInactiveFramebuffer();
        igl.getFramebuffer(BUFF_STAGE.GAME_BUFFER).copyTo(bloomBuffer, igl.copyProcess, BUFF_STAGE.PROCESSOR);

        gl.useProgram(this.blurProgram.program);
        gl.uniform1f(gl.getUniformLocation(this.blurProgram.program, 'u_radius'), this.blurriness);
        gl.uniform1f(gl.getUniformLocation(this.blurProgram.program, 'u_opacity'), this.opacity);
        gl.uniform1f(gl.getUniformLocation(this.blurProgram.program, 'u_final'), 0.0);
        for (let i = 0; i < this.blurPasses; i++) {
            gl.uniform1f(gl.getUniformLocation(this.blurProgram.program, 'u_horizontal'), 1.0);
            igl.getFramebuffer(BUFF_STAGE.PROCESSOR).renderTo(igl.getInactiveFramebuffer(), this.blurProgram);
            gl.uniform1f(gl.getUniformLocation(this.blurProgram.program, 'u_horizontal'), 0.0);
            if (i + 1 < this.blurPasses) igl.getFramebuffer(BUFF_STAGE.PROCESSOR).renderTo(igl.getInactiveFramebuffer(), this.blurProgram);
        }

        // This sucks and gives me brain damage
        // surely theres a better way to write this but alas my mind is pink strawberry goop
        gl.uniform1f(gl.getUniformLocation(this.blurProgram.program, 'u_final'), 1.0);
        const processor = igl.getFramebuffer(BUFF_STAGE.PROCESSOR);
        const midground = igl.getFramebuffer(BUFF_STAGE.MIDGROUND_BUFFER);
        const finalBuffer = igl.getInactiveFramebuffer();
        processor.stage = BUFF_STAGE.NONE;
        gl.bindFramebuffer(gl.FRAMEBUFFER, finalBuffer.fbo);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(this.blurProgram.program);
        gl.bindVertexArray(this.blurProgram.vao);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, processor.texture);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, midground.texture);
        gl.uniform1i(gl.getUniformLocation(this.blurProgram.program, 'u_dst_texture'), 1);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.bindVertexArray(null);
        processor.stage = BUFF_STAGE.NONE;
        midground.stage = BUFF_STAGE.NONE;
        finalBuffer.stage = BUFF_STAGE.MIDGROUND_BUFFER;
    }
}