import PostProcessor from "./PostProcessor";

export default class BlitProcessor extends PostProcessor {
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
                
                void main() {
                    outColor = texture(u_texture, v_texCoord);
                }
            `)
    }
}