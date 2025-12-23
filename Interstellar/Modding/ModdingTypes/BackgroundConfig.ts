export interface BobConfig {
    
}
export interface Spritesheet {
    image: string;
    json: string;
    animation_name: string;
}
export interface AnimatedSprite {
    sprites?: string[];
    spritesheet?: Spritesheet;
    fps: number;
}
export interface BackgroundSprite {
    path?: string;
    animated?: AnimatedSprite;
    x?: number;
    y?: number;
    tile?: "x" | "y" | "xy";
    px?: number;
    py?: number;
    mx?: number;
    my?: number;
    mt?: number;
    bobx?: number;
    boby?: number;
    bobt?: number;
    bobo?: number;
}
export interface BackgroundConfig {
    width: number;
    height: number;
    isPixelArt?: boolean;
    sprites: BackgroundSprite[];
}