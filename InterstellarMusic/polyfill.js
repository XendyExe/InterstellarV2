function decodeUtf8(bytes) {
    let out = "";
    for (let i = 0; i < bytes.length;) {
        const b = bytes[i++];
        if (b < 0x80) {
            out += String.fromCharCode(b);
        } else if (b < 0xE0) {
            const b2 = bytes[i++] & 0x3F;
            out += String.fromCharCode(((b & 0x1F) << 6) | b2);
        } else if (b < 0xF0) {
            const b2 = bytes[i++] & 0x3F;
            const b3 = bytes[i++] & 0x3F;
            out += String.fromCharCode(((b & 0x0F) << 12) | (b2 << 6) | b3);
        } else {
            const b2 = bytes[i++] & 0x3F;
            const b3 = bytes[i++] & 0x3F;
            const b4 = bytes[i++] & 0x3F;
            let cp = ((b & 0x07) << 18) | (b2 << 12) | (b3 << 6) | b4;
            cp -= 0x10000;
            out += String.fromCharCode(
                0xD800 + (cp >> 10),
                0xDC00 + (cp & 0x3FF)
            );
        }
    }
    return out;
}


if (!globalThis.TextDecoder) {
    globalThis.TextDecoder = class TextDecoder {
        decode(arg) {
            if (typeof arg !== 'undefined') {
                return decodeUtf8(arg);
            } else {
                return '';
            }
        }
    };
}

if (!globalThis.TextEncoder) {
    globalThis.TextEncoder = class TextEncoder {
        encode(arg) {
            if (typeof arg !== 'undefined') {
                throw Error('TextEncoder stub called');
            } else {
                return new Uint8Array(0);
            }
        }
    };
}

export function nop() {
}
