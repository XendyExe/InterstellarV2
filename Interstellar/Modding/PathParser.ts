export function parsePathFromFile(path: string, rel: string) {
    let reletiveSplits = splitPath(rel);
    reletiveSplits.pop();
    const splits = [...reletiveSplits, ...splitPath(path)];
    return parsePathSplits(splits);
}

export function parsePath(path: string, rel: string) {
    const splits = [...splitPath(rel), ...splitPath(path)];
    return parsePathSplits(splits);
}

export function parsePathSplits(splits: string[]) {
    const result: string[] = [];
    for (const path of splits) {
        if (path == "~") result.length = 0;
        else if (path == ".") continue;
        else if (path == "..") result.pop();
        else result.push(path);
    }
    return result.filter(s=>s).join("/")
}
export function splitPath(path: string) {
    return path.trim().split(/[\\/]/);
}