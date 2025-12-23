export interface BlobContainer {
    blob: Blob;
    [key: string]: any;
}

export function arraysEqual(a: any[], b: any[]): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;

    for (var i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

export interface InputDragInfo {
    source: number
    target: number
    split: boolean
}

export interface CurrentShipData {
    name: string;
    hex: string;
}

export interface PlayerListEntry {
    alias_discrims: [string, number][],
    captain_rank: number,
    discrim: string,
    discrim_color: number,
    extra_aliases: number | null,
    items: number[],
    online_count: number,
    ref_id: number,
    team_rank: number,
    time: number
}