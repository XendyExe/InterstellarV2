export default function parseColor(value: string | number): number {
    if (typeof value === "number") {
        return value >>> 0; // ensure unsigned 32-bit
    }

    value = value.trim().toLowerCase();

    // Handle hex codes: #rgb, #rrggbb, rgb, rrggbb
    if (value.startsWith("#")) value = value.slice(1);
    if (/^[0-9a-f]{3}$/i.test(value)) {
        // expand shorthand like f0a → ff00aa
        value = value.split("").map(c => c + c).join("");
    }
    if (/^[0-9a-f]{6}$/i.test(value)) {
        return parseInt(value, 16);
    }

    // Handle rgb(r, g, b)
    const rgbMatch = value.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
    if (rgbMatch) {
        const r = Math.min(255, parseInt(rgbMatch[1]!, 10));
        const g = Math.min(255, parseInt(rgbMatch[2]!, 10));
        const b = Math.min(255, parseInt(rgbMatch[3]!, 10));
        return (r << 16) | (g << 8) | b;
    }

    throw new Error(`Unsupported color format: ${value}`);
}

export function getR(c: number) { return ((c >> 16) & 0xff) / 255; }
export function getG(c: number) { return ((c >> 8) & 0xff) / 255; }
export function getB(c: number) { return (c & 0xff) / 255; }