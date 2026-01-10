export let gl: WebGL2RenderingContext;
export function helper_setwebgl(_gl:WebGL2RenderingContext) {
    gl = _gl;
}

export function createShader(type: number, src: string) {
    const s = gl.createShader(type)!!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        throw gl.getShaderInfoLog(s);
    }
    return s;
}

export function createProgram(vsSrc: string, fsSrc: string) {
    const p = gl.createProgram();
    gl.attachShader(p, createShader(gl.VERTEX_SHADER, vsSrc));
    gl.attachShader(p, createShader(gl.FRAGMENT_SHADER, fsSrc));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        throw gl.getProgramInfoLog(p);
    }
    return p;
}

export function createRenderShaders() {
    const vs = `#version 300 es
layout(location = 0) in vec2 a_pos;
layout(location = 1) in vec2 a_uv;

// Per-instance attributes
layout(location = 2) in vec2 i_offset;
layout(location = 3) in vec2 i_scale;
layout(location = 4) in vec4 i_uvBounds;    // u0, v0, u1, v1 (atlas region)
layout(location = 5) in vec2 i_tileRepeat;  // repeatX, repeatY
layout(location = 6) in vec2 i_tileOffset;  // offsetU, offsetV
layout(location = 7) in vec2 i_tileMask; // (x, y): 1 = tile, 0 = clamp

uniform vec2 u_resolution;
uniform vec2 u_bgSize;
uniform float u_zoomScale;

out vec2 v_uv;
out vec4 v_uvBounds;
out vec2 v_tileMask;

void main() {
  vec2 scale = u_resolution / u_bgSize;
  float maxScale = max(scale.x, scale.y);
  vec2 finalScale = (u_bgSize * maxScale / u_resolution) * u_zoomScale;
  
  vec2 scaledPos = a_pos * i_scale;
  vec2 worldPos = (scaledPos + i_offset) * finalScale;
  
  // Pass through for fragment shader
  v_uv = a_uv * i_tileRepeat + i_tileOffset;
  v_uvBounds = i_uvBounds;
  
  gl_Position = vec4(worldPos, 0.0, 1.0);
  v_tileMask = i_tileMask;
}
`;

const fs = `#version 300 es
precision mediump float;

uniform sampler2D u_tex;
in vec2 v_uv;
in vec4 v_uvBounds;
in vec2 v_tileMask;
out vec4 fragColor;

void main() {
    vec2 uvSize = v_uvBounds.zw - v_uvBounds.xy;

    vec2 uv;
    uv.x = mix(clamp(v_uv.x, 0.0, 1.0), fract(v_uv.x), v_tileMask.x);
    uv.y = mix(clamp(v_uv.y, 0.0, 1.0), fract(v_uv.y), v_tileMask.y);

    vec2 finalUV = v_uvBounds.xy + uv * uvSize;
    fragColor = texture(u_tex, finalUV);
}
  `
    let sprite_program = createProgram(vs, fs);
    return { sprite: sprite_program }
}