#version 300 es
precision highp float;

uniform highp sampler2DArray u_tex;
uniform float u_alpha;
in vec2 v_uv;
flat in int v_texLayer;
flat in vec4 v_textureUV;
in vec2 v_tiledOffset; 
flat in vec2 v_tileRepeat;
out vec4 fragColor;

void main() {
    vec2 uvSize = v_textureUV.zw - v_textureUV.xy;
    vec2 flippedUV = vec2(v_uv.x, 1.0 - v_uv.y);
    vec2 tiledUV = flippedUV * v_tileRepeat + v_tiledOffset;
    tiledUV = fract(tiledUV);
    vec2 uv = v_textureUV.xy + tiledUV * uvSize;

    vec4 samp = texture(u_tex, vec3(uv, v_texLayer));
    fragColor = vec4(samp.xyz, samp.a * u_alpha);
}