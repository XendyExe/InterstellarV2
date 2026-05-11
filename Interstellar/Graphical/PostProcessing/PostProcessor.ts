import { createProgram, gl } from "../WebGLHelpers";

export default class PostProcessor {
    program: WebGLProgram;
    positionLocation: number;
    vao: WebGLVertexArrayObject;
    constructor(vertex: string, fragment: string) {
        this.program = createProgram(vertex, fragment);
        this.vao = gl.createVertexArray()!;
        gl.bindVertexArray(this.vao);

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

        const positions = new Float32Array([
            -1, -1,
             1, -1,
            -1,  1,
            -1,  1,
             1, -1,
             1,  1,
        ]);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        this.positionLocation = gl.getAttribLocation(this.program, 'a_position');
        gl.enableVertexAttribArray(this.positionLocation);
        gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);

        gl.bindVertexArray(null);
    }
    update(time: number) {
        
    }
}