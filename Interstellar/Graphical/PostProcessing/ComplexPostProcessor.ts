import { Framebuffer, InterstellarWebGL } from "../InterstellarWebGL";


export default abstract class ComplexPostProcessor {
    abstract render(igl: InterstellarWebGL, buffer: Framebuffer, time: number): void;
}