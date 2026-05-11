import { BasePostProcessingConfig } from "../../Modding/ModdingTypes/ZoneConfig";
import { gl } from "../WebGLHelpers";
import PostProcessor from "./PostProcessor";

export interface LUTProcessorConfig extends BasePostProcessingConfig {
    path: string;
}
const LUT_SIZE = 32;
export default class LUTProcessor extends PostProcessor {
    texture: WebGLTexture | null = null;

    lutLocation: WebGLUniformLocation | null = null;
    constructor() {
        super(`#version 300 es
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
                out vec4 outColor;
                
                uniform sampler2D u_texture;
                uniform sampler2D u_lut;
                uniform float u_opacity;

                const float LUT_SIZE = ${LUT_SIZE}.0;
                const float LUT_WIDTH = ${LUT_SIZE * LUT_SIZE}.0;
                vec3 applyLUT(vec3 color) {
                    float greenSlice = color.g * (LUT_SIZE - 1.0);
                    
                    vec2 lutCoordLower = vec2(
                        (floor(greenSlice) * LUT_SIZE + color.r * (LUT_SIZE - 1.0) + 0.5) / LUT_WIDTH,
                        (color.b * (LUT_SIZE - 1.0) + 0.5) / LUT_SIZE
                    );
                    
                    vec2 lutCoordUpper = vec2(
                        (ceil(greenSlice) * LUT_SIZE + color.r * (LUT_SIZE - 1.0) + 0.5) / LUT_WIDTH,
                        (color.b * (LUT_SIZE - 1.0) + 0.5) / LUT_SIZE
                    );
                    
                    return mix(
                        texture(u_lut, lutCoordLower).rgb, 
                        texture(u_lut, lutCoordUpper).rgb, 
                        fract(greenSlice)
                    );
                }
                
                void main() {
                    vec4 samp = texture(u_texture, v_texCoord);
                    vec3 gradedColor = applyLUT(samp.rgb);
                    outColor = vec4(gradedColor, samp.a);
                }
            `)
    }
    async load(lut: Blob): Promise<LUTProcessor> {
        let bitmap = await createImageBitmap(lut);
        this.texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(this.lutLocation, 1);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            bitmap
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return this;
    }

    update(time: number): void {
        gl.activeTexture(gl.TEXTURE10);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(gl.getUniformLocation(this.program, 'u_lut'), 10);
        gl.activeTexture(gl.TEXTURE0);
    }
}