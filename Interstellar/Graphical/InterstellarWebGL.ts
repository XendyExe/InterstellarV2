import { DEFAULT_ZONES } from "../DefaultZones";
import Interstellar from "../Interstellar";
import BlitProcessor from "./PostProcessing/BlitProcessor";
 import BloomProcessor from "./PostProcessing/BloomProcessor";
import { BorderGlowProcessor } from "./PostProcessing/BorderProcessor";
import ComplexPostProcessor from "./PostProcessing/ComplexPostProcessor";
import PostProcessor from "./PostProcessing/PostProcessor";
import TransitionPostProcessor from "./PostProcessing/TransitionProcessor";
import { gl } from "./WebGLHelpers";

const st = Date.now();

// What data is this framebuffer storing rn?
export enum BUFF_STAGE {
    NONE,
    GAME_BUFFER,
    MIDGROUND_BUFFER,
    PROCESSOR
}

export class Framebuffer {
    id: number;
    fbo: WebGLFramebuffer;
    texture: WebGLTexture;
    stage: BUFF_STAGE = BUFF_STAGE.NONE;
    constructor(id: number) {
        this.id = id;
        this.fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);

        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, Interstellar.drednotCanvas.width, Interstellar.drednotCanvas.height, 0,
                    gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);

        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (status !== gl.FRAMEBUFFER_COMPLETE) {
            console.error("Framebuffer incomplete:", status);
            throw new Error("Framebuffer incomplete");
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    renderTo(other: Framebuffer | null, processor: PostProcessor) {
        const safeToClear = other != null && other.stage == BUFF_STAGE.NONE;
        if (safeToClear) other.stage = this.stage;
        this.stage = BUFF_STAGE.NONE;
        gl.bindFramebuffer(gl.FRAMEBUFFER, other == null ? other : other.fbo);
        if (safeToClear) gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(processor.program);
        processor.update((Date.now() - st) / 1000);
        gl.bindVertexArray(processor.vao);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.bindVertexArray(null);
    }
    copyTo(other: Framebuffer, processor: PostProcessor, stage: BUFF_STAGE) {
        other.stage = stage;
        gl.bindFramebuffer(gl.FRAMEBUFFER, other == null ? other : other.fbo);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(processor.program);
        processor.update((Date.now() - st) / 1000);
        gl.bindVertexArray(processor.vao);
        gl.activeTexture(gl.TEXTURE0);
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

export class InterstellarWebGL {
    private frameBufferWidth = 0;
    private frameBufferHeight = 0;
    // May the framebuffer juggle commence.
    private framebuffers: Framebuffer[] = [];
    // @ts-ignore
    copyProcess: PostProcessor;
    // @ts-ignore
    borderProcessor: ComplexPostProcessor;
    // @ts-ignore
    private glitchProcessor: PostProcessor;
    allProcessors: (PostProcessor | ComplexPostProcessor)[] = [];
    gameProcessors: (PostProcessor | ComplexPostProcessor)[] = [];
    bgProcessors: (PostProcessor | ComplexPostProcessor)[] = [];
    glitching = false;
    debugProcess: (PostProcessor | ComplexPostProcessor) | null = null;

    constructor() {
        // @ts-ignore
        window.iwgl = this;
    }

    buffers: number = 0;
    pushBuffer() {
        this.framebuffers.push(new Framebuffer(this.buffers));
        this.buffers += 1;
    }

    create() {
        while (this.buffers < 4) {
            this.pushBuffer();
        }

        this.copyProcess = new BlitProcessor();
        this.glitchProcessor = new TransitionPostProcessor();
        this.borderProcessor = new BorderGlowProcessor();
        this.frameBufferWidth = Interstellar.drednotCanvas.width;
        this.frameBufferHeight = Interstellar.drednotCanvas.height;

        if (this.debugProcess) {
            // @ts-ignore
            window.debugShader = this.debugProcess;
        }
    }

    frameTime = {
        backgrounds: 0,
        postprocess: 0,
        borders: 0,
        final: 0
    };
    program: WebGLProgram | null = null;
    postProcessed = false;
    renderPassBackgrounds() {
        let start = performance.now();
        this.postProcessed = false;
        if (this.frameBufferWidth != Interstellar.drednotCanvas.width || this.frameBufferHeight != Interstellar.drednotCanvas.height) {
            this.framebuffers.forEach(buff => buff.resize());
            this.frameBufferWidth = Interstellar.drednotCanvas.width;
            this.frameBufferHeight = Interstellar.drednotCanvas.height;
        }
        const gamebuffer = this.getInactiveFramebuffer();
        gamebuffer.stage = BUFF_STAGE.GAME_BUFFER;
        gl.bindFramebuffer(gl.FRAMEBUFFER, gamebuffer.fbo);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        if (Interstellar.currentZone) {
            this.program = gl.getParameter(gl.CURRENT_PROGRAM);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            let fill_color = DEFAULT_ZONES[Interstellar.canonicalZone]?.bg_rgb ?? [1, 0, 0];
            Interstellar.currentZone.render(fill_color);
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            gl.useProgram(this.program);
        }
        const midbuffer = this.getInactiveFramebuffer();
        midbuffer.stage = BUFF_STAGE.MIDGROUND_BUFFER;
        gl.bindFramebuffer(gl.FRAMEBUFFER, midbuffer.fbo);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        this.frameTime.backgrounds = this.frameTime.backgrounds * 0.99 + (performance.now() - start) * 0.01;
    }
    renderPassPostProcessing() {
        if (Interstellar.settingsManager.settings.disableFilters) {
            this.program = gl.getParameter(gl.CURRENT_PROGRAM);
            this.frameTime.postprocess = 0;
            this.postProcessed = true;
            const midbuffer = this.getFramebuffer(BUFF_STAGE.MIDGROUND_BUFFER);
            midbuffer.renderTo(this.getFramebuffer(BUFF_STAGE.GAME_BUFFER), this.copyProcess);
            midbuffer.stage = BUFF_STAGE.NONE;
            gl.useProgram(this.program);
            return;
        }
        let start = performance.now();
        this.program = gl.getParameter(gl.CURRENT_PROGRAM);

        this.postProcessed = true;
        const gameProcessors = [...this.gameProcessors];

        let lastProcessor = gameProcessors.pop() ?? this.copyProcess;
        if (lastProcessor instanceof ComplexPostProcessor) {
            gameProcessors.push(lastProcessor);
            lastProcessor = this.copyProcess;
        }
        gameProcessors.forEach(processor => this.applyPostProcess(BUFF_STAGE.MIDGROUND_BUFFER, processor));
        const midbuffer = this.getFramebuffer(BUFF_STAGE.MIDGROUND_BUFFER);
        midbuffer.renderTo(this.getFramebuffer(BUFF_STAGE.GAME_BUFFER), lastProcessor);
        midbuffer.stage = BUFF_STAGE.NONE;
        this.allProcessors.forEach(processor => this.applyPostProcess(BUFF_STAGE.GAME_BUFFER, processor))
        if (this.debugProcess) this.applyPostProcess(BUFF_STAGE.GAME_BUFFER, this.debugProcess);

        gl.useProgram(this.program);
        this.frameTime.postprocess = this.frameTime.postprocess * 0.99 + (performance.now() - start) * 0.01
    }
    renderPassStartBorders() {
        if (Interstellar.settingsManager.settings.disableComplexGFX) {
            this.frameTime.borders = 0;
            return;
        }
        const midbuffer = this.getInactiveFramebuffer();
        midbuffer.stage = BUFF_STAGE.MIDGROUND_BUFFER;
        gl.bindFramebuffer(gl.FRAMEBUFFER, midbuffer.fbo);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }
    renderPassBorders() {
        if (Interstellar.settingsManager.settings.disableComplexGFX) return;
        let start = performance.now();
        this.program = gl.getParameter(gl.CURRENT_PROGRAM);
        this.applyPostProcess(BUFF_STAGE.MIDGROUND_BUFFER, this.borderProcessor);
        this.getFramebuffer(BUFF_STAGE.MIDGROUND_BUFFER).renderTo(this.getFramebuffer(BUFF_STAGE.GAME_BUFFER), this.copyProcess);
        gl.useProgram(this.program);
        this.frameTime.borders = (this.frameTime.borders * 0.99) + (performance.now() - start) * 0.01;
    }
    endFrame() {
        if (!this.postProcessed) this.renderPassPostProcessing();
        this.program = gl.getParameter(gl.CURRENT_PROGRAM);
        let start = performance.now();
        const gamebuffer = this.getFramebuffer(BUFF_STAGE.GAME_BUFFER);
            
        gl.bindFramebuffer(gl.FRAMEBUFFER, gamebuffer.fbo);
        if (this.glitching && !Interstellar.settingsManager.settings.disableGlitchEffect) gamebuffer!!.renderTo(null, this.glitchProcessor)
        else gamebuffer!!.renderTo(null, this.copyProcess);
        gl.useProgram(this.program);
        this.frameTime.final = this.frameTime.final * 0.99 + (performance.now() - start) * 0.01;
    }
    getFramebuffer(stage: BUFF_STAGE) {
        for (const buffer of this.framebuffers) {
            if (buffer.stage == stage) return buffer;
        }
        console.log(this.framebuffers.map(f => f.stage));
        throw `No more framebuffers of that stage: ${stage}`;
    }
    getInactiveFramebuffer() {
        for (const buffer of this.framebuffers) {
            if (buffer.stage == BUFF_STAGE.NONE) return buffer;
        }
        console.log(this.framebuffers.map(f => f.stage));
        throw "No more inactive framebuffers, assign more at start?";
    }
    applyPostProcess(stage: BUFF_STAGE, processor: (PostProcessor | ComplexPostProcessor)) {
        if (processor instanceof PostProcessor) {
            this.getFramebuffer(stage).renderTo(this.getInactiveFramebuffer(), processor)
        } else {
            processor.render(this, this.getFramebuffer(stage), (Date.now() - st) / 1000)
        }
    }

}

export default new InterstellarWebGL();