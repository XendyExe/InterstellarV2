import { Music } from "../../Music/Music";

interface GenericZone {
    music?: string;
    music_start?: number;
    textures?: Record<string, string>;
    filters?: Record<string, Record<string, any>>;
    background?: string;
    color?: string | number;
    theme?: string
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
    filters: Record<string, Record<string, any>>;
    theme: Record<string, string>
} 