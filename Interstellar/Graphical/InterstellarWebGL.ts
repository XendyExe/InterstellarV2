import Interstellar from "../Interstellar";
import BlitProcessor from "./PostProcessing/BlitProcessor";
import PostProcessor from "./PostProcessing/PostProcessor";
import TransitionPostProcessor from "./PostProcessing/TransitionProcessor";
import { gl } from "./WebGLHelpers";

const st = Date.now();
class Framebuffer {
    fbo: WebGLFramebuffer;
    texture: WebGLTexture;
    active: boolean = false;
    constructor() {
        this.fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);

        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, Interstellar.drednotCanvas.width, Interstellar.drednotCanvas.height, 0,
                    gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);

        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (status !== gl.FRAMEBUFFER_COMPLETE) {
            console.error("Framebuffer incomplete:", status);
            throw new Error("Framebuffer incomplete");
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    renderTo(other: Framebuffer | null, processor: PostProcessor) {
        this.active = false;
        if (other != null) other.active = true;
        gl.bindFramebuffer(gl.FRAMEBUFFER, other == null ? other : other.fbo);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(processor.program);
        processor.update((Date.now() - st) / 1000);
        gl.bindVertexArray(processor.vao);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.bindVertexArray(null);
    }
    resize() {
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(
            gl.TEXTURE_2D, 
            0, 
            gl.RGBA, 
            Interstellar.drednotCanvas.width, 
            Interstellar.drednotCanvas.height, 
            0,
            gl.RGBA, 
            gl.UNSIGNED_BYTE, 
            null
        );
        gl.bindTexture(gl.TEXTURE_2D, null);
    }
}

class InterstellarWebGL {
    private frameBufferWidth = 0;
    private frameBufferHeight = 0;
    // @ts-ignore
    private framebufferA: Framebuffer;
    // @ts-ignore
    private framebufferB: Framebuffer;
    // @ts-ignore
    private copyProcess: PostProcessor;
    // @ts-ignore
    private glitchProcessor: PostProcessor;
    private time = Date.now();
    activeProcessors: PostProcessor[] = [];
    glitching = false;

    constructor() {
        // @ts-ignore
        window.iwgl = this;
    }

    create() {
        this.framebufferA = new Framebuffer();
        this.framebufferB = new Framebuffer();
        this.copyProcess = new BlitProcessor();
        this.glitchProcessor = new TransitionPostProcessor();
        this.frameBufferWidth = Interstellar.drednotCanvas.width;
        this.frameBufferHeight = Interstellar.drednotCanvas.height;
    }

    frameTime = {
        backgrounds: 0,
        postprocess: 0,
        final: 0
    };
    program: WebGLProgram | null = null;
    renderPassBackgrounds() {
        if (!Interstellar.currentZone) return;
        let start = performance.now();
        if (this.frameBufferWidth != Interstellar.drednotCanvas.width || this.frameBufferHeight != Interstellar.drednotCanvas.height) {
            this.framebufferA.resize();
            this.framebufferB.resize();
            this.frameBufferWidth = Interstellar.drednotCanvas.width;
            this.frameBufferHeight = Interstellar.drednotCanvas.height;
        }
        this.framebufferA.active = true;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebufferA.fbo);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        this.program = gl.getParameter(gl.CURRENT_PROGRAM);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        Interstellar.currentZone.render();
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        this.frameTime.backgrounds = this.frameTime.backgrounds * 0.99 + (performance.now() - start) * 0.01;
        gl.useProgram(this.program);
    }
    renderPassPostProcessing() {
        let start = performance.now();
        this.program = gl.getParameter(gl.CURRENT_PROGRAM);
        this.activeProcessors.forEach(processor => this.applyPostProcess(processor))
        gl.useProgram(this.program);
        this.frameTime.postprocess = this.frameTime.postprocess * 0.99 + (performance.now() - start) * 0.01
    }
    renderPassBorders() {
    }
    endFrame() {
        this.program = gl.getParameter(gl.CURRENT_PROGRAM);
        let start = performance.now();
        if (this.glitching) this.getActiveFramebuffer()?.renderTo(null, this.glitchProcessor)
        else this.getActiveFramebuffer()?.renderTo(null, this.copyProcess);
        gl.useProgram(this.program);
        this.frameTime.final = this.frameTime.final * 0.99 + (performance.now() - start) * 0.01;
    }

    postProcessGame() {

    }
    postProcessBorders() {

    }

    getActiveFramebuffer() {
        if (this.framebufferA.active) return this.framebufferA;
        if (this.framebufferB.active) return this.framebufferB;
        return null;
    }
    getInactiveFramebuffer() {
        if (this.framebufferA.active) return this.framebufferB;
        if (this.framebufferB.active) return this.framebufferA;
        return null;
    }
    applyPostProcess(processor: PostProcessor) {
        this.getActiveFramebuffer()?.renderTo(this.getInactiveFramebuffer(), processor);
    }

}

export default new InterstellarWebGL();