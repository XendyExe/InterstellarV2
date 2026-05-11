import PostProcessor from "../../Graphical/PostProcessing/PostProcessor";
import { Music } from "../../Music/Music";

export interface BasePostProcessingConfig {
    type: string,
    layer: string
}

interface GenericZone {
    music?: string;
    music_start?: number;
    textures?: Record<string, string>;
    background?: string;
    color?: string | number;
    theme?: string,
    postprocess: BasePostProcessingConfig[]
}
export interface SubzoneConfig extends GenericZone {
    name?: string;
    description?: string;
}

export interface ZoneConfig extends GenericZone {
    name: string;
    description: string;
    cycle_style?: number[];
    cycle_time?: number;
    use_nav?: boolean;
    nav_default?: number;
    smooth_transition?: boolean;
    color: string | number;
    subzones: SubzoneConfig[];
}

export interface PsudoSubzone {
    name: string;
    color: number;
    description: string;
    background: string;
    music: Music | null;
    textures: Record<string, string>;
    postprocess: BasePostProcessingConfig[],
    theme: Record<string, string>
} 