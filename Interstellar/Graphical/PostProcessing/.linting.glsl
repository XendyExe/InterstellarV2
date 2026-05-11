#version 300 es
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
                            result += texture(u_texture, v_texCoord + vec2(clamp(tex_offset.x * float(i), 0.0, 1.0), 0.0)).rgb * weight[i];
                            result += texture(u_texture, v_texCoord - vec2(clamp(tex_offset.x * float(i), 0.0, 1.0), 0.0)).rgb * weight[i];
                        }
                    }
                    else
                    {
                        for(int i = 1; i < 5; ++i)
                        {
                            result += texture(u_texture, v_texCoord + vec2(0.0, clamp(tex_offset.y * float(i), 0.0, 1.0))).rgb * weight[i];
                            result += texture(u_texture, v_texCoord - vec2(0.0, clamp(tex_offset.y * float(i), 0.0, 1.0))).rgb * weight[i];
                        }
                    }
                    
                    if (u_final < 0.5) fragColor = vec4(result, 1.0);
                    else {
                        fragColor = vec4(result * u_opacity, 1.0);
                    }
                }