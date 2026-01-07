export function clamp(num: number, min: number, max: number) {
    return Math.max(Math.min(num, max), min)
}

export function formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = parseFloat((bytes / Math.pow(k, i)).toFixed(decimals));

    return `${value} ${sizes[i]}`;
}

export function roundTo(num: number, digits: number) {
    let v = Math.pow(10, digits);
    return Math.floor(num * v) / v;
}