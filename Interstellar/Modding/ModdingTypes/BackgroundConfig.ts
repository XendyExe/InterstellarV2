export interface BobConfig {
    
}
export interface SpritesheetConfig {
    image: string;
    json: string;
    animation_name: string;
}
export interface AnimatedSpriteConfig {
    sprites?: string[];
    spritesheet?: SpritesheetConfig;
    fps: number;
}
export interface BackgroundSpriteConfig {
    path?: string;
    animated?: AnimatedSpriteConfig;
    x?: number;
    y?: number;
    tile?: "x" | "y" | "xy";
    px?: number;
    py?: number;
    pxo?: number;
    pyo?: number;
    pz?: number;
    mx?: number;
    my?: number;
    mt?: number;
    bobx?: number;
    boby?: number;
    bobt?: number;
    bobo?: number;
    low_detail?: boolean;
    high_detail?: boolean;
}
export interface BackgroundConfig {
    width: number;
    height: number;
    isPixelArt?: boolean;
    fillColor?: string;
    sprites: BackgroundSpriteConfig[];
    backdrops?: any[];
}