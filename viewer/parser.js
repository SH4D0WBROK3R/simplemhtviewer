const MHTParser = {
    // Injected into the saved page: nothing remote may load (offline viewer, no tracking).
    CSP: '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data:; style-src \'unsafe-inline\' data:; font-src data:; media-src data:; frame-src data:">',

    parse: function(buffer) {
        // One char per byte, to split on boundaries without losing data. Not
        // TextDecoder('iso-8859-1'): browsers map that label to windows-1252,
        // which turns bytes 0x80-0x9F into other chars that can't be turned back.
        const u8 = new Uint8Array(buffer);
        let fileContent = '';
        for (let i = 0; i < u8.length; i += 32768) {
            fileContent += String.fromCharCode.apply(null, u8.subarray(i, i + 32768));
        }

        // 1. Find the boundary
        let boundary = "";
        const boundaryMatch = fileContent.match(/boundary="?([^"\r\n]+)"?/i);
        if (boundaryMatch && boundaryMatch[1]) {
            boundary = boundaryMatch[1];
        } else {
            const fallbackMatch = fileContent.match(/^--(.+)$/m);
            if (fallbackMatch) {
                boundary = fallbackMatch[1].trim();
            } else {
                throw new Error("Could not find multipart boundary");
            }
        }

        // 2. Split into parts
        const parts = fileContent.split('--' + boundary);

        let rootHtml = "";
        const assets = [];

        // 3. Process each part (part 0 is the preamble; "--" is the closing marker)
        for (let i = 1; i < parts.length; i++) {
            const part = parts[i];
            if (part.startsWith('--')) continue;

            const headerEndIndex = part.indexOf('\r\n\r\n');
            const headerEndIndexLF = part.indexOf('\n\n');

            let splitIndex = headerEndIndex;
            let splitLen = 4;

            if (headerEndIndex === -1 || (headerEndIndexLF !== -1 && headerEndIndexLF < headerEndIndex)) {
                splitIndex = headerEndIndexLF;
                splitLen = 2;
            }

            if (splitIndex === -1) continue;

            const headersStr = part.substring(0, splitIndex);
            let body = part.substring(splitIndex + splitLen);

            const headers = this.parseHeaders(headersStr);
            const contentType = (headers['content-type'] || 'text/plain').toLowerCase();
            const mime = contentType.split(';')[0].trim();
            const encoding = (headers['content-transfer-encoding'] || '').toLowerCase();
            let location = headers['content-location'] || headers['content-id'];

            if (location) {
                location = location.replace(/^<|>$/g, '');
            }

            // Charset if declared. Empty = undeclared (decodeBytes tries strict UTF-8 first).
            let charset = '';
            const charsetMatch = contentType.match(/charset=["']?([\w-]+)["']?/i);
            if (charsetMatch) {
                charset = charsetMatch[1];
            }

            // 4. Handle based on content type
            if (mime === 'text/html' || mime === 'text/plain') {
                if (encoding === 'quoted-printable') {
                    body = this.decodeQuotedPrintable(body, charset);
                } else if (encoding === 'base64') {
                    body = this.decodeBase64Text(body, charset);
                } else {
                    body = this.decodeBytes(this.latin1ToBytes(body), charset);
                }

                if (mime === 'text/html' && !rootHtml) {
                    rootHtml = body;
                }
            } else if (location) {
                // Asset (image, css, etc)
                let dataUri;
                if (encoding === 'base64') {
                    dataUri = `data:${mime};base64,${body.replace(/\s/g, '')}`;
                } else {
                    const text = encoding === 'quoted-printable'
                        ? this.decodeQuotedPrintable(body, charset)
                        : this.decodeBytes(this.latin1ToBytes(body), charset);
                    dataUri = `data:${mime};charset=utf-8,${encodeURIComponent(text)}`;
                }
                assets.push({ location, dataUri });
            }
        }

        if (!rootHtml) {
            throw new Error("No HTML content found in MHT");
        }

        // 5. Rewrite HTML to use Data URIs: one pass, longest location first,
        //    so cost does not grow with (assets x page size).
        const map = new Map();
        for (const a of assets) {
            const key = a.location.toLowerCase();
            if (!map.has(key)) map.set(key, a.dataUri);
            if (!key.startsWith('cid:') && !map.has('cid:' + key)) map.set('cid:' + key, a.dataUri);
        }

        let html = rootHtml;
        if (map.size) {
            const pattern = [...map.keys()]
                .sort((a, b) => b.length - a.length)
                .map(k => this.escapeRegExp(k))
                .join('|');
            // function replacer: "$&" etc. in a data URI must not be interpreted
            html = html.replace(new RegExp(pattern, 'gi'), m => map.get(m.toLowerCase()));
        }

        // 6. Lock the page down (after <head>, not before the doctype: that would force quirks mode)
        const headTag = /<head(\s[^>]*)?>/i;
        return headTag.test(html) ? html.replace(headTag, m => m + this.CSP) : this.CSP + html;
    },

    parseHeaders: function(headersStr) {
        const headers = {};
        const lines = headersStr.split(/\r?\n/);
        let currentHeader = '';
        let currentValue = '';

        for (const line of lines) {
            if (line.match(/^\s+/)) {
                currentValue += ' ' + line.trim();
            } else {
                if (currentHeader) {
                    headers[currentHeader] = currentValue;
                }
                const splitIndex = line.indexOf(':');
                if (splitIndex !== -1) {
                    currentHeader = line.substring(0, splitIndex).toLowerCase().trim();
                    currentValue = line.substring(splitIndex + 1).trim();
                } else {
                    currentHeader = '';
                    currentValue = '';
                }
            }
        }
        if (currentHeader) {
            headers[currentHeader] = currentValue;
        }
        return headers;
    },

    // String read as Latin-1 -> the original bytes.
    latin1ToBytes: function(str) {
        const bytes = new Uint8Array(str.length);
        for (let i = 0; i < str.length; i++) {
            bytes[i] = str.charCodeAt(i) & 0xFF;
        }
        return bytes;
    },

    // Bytes -> string. When the charset is missing or is one of the usual Latin
    // charsets (often a wrong label on UTF-8 content), try strict UTF-8 first;
    // if the bytes are not valid UTF-8, use the declared charset.
    decodeBytes: function(bytes, charset) {
        const cs = (charset || '').toLowerCase();
        if (!cs || /^(utf-?8|us-ascii|windows-1252|iso-8859-1|latin1)$/.test(cs)) {
            try {
                return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
            } catch (e) { /* not valid UTF-8 */ }
        }
        try {
            return new TextDecoder(cs || 'windows-1252').decode(bytes);
        } catch (e) {
            return new TextDecoder('windows-1252').decode(bytes);
        }
    },

    decodeQuotedPrintable: function(str, charset) {
        str = str.replace(/=\r?\n/g, '');

        const bytes = [];
        for (let i = 0; i < str.length; i++) {
            if (str[i] === '=' && i + 2 < str.length) {
                const hex = str.substring(i + 1, i + 3);
                if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
                    bytes.push(parseInt(hex, 16));
                    i += 2;
                    continue;
                }
            }
            bytes.push(str.charCodeAt(i) & 0xFF);
        }

        return this.decodeBytes(new Uint8Array(bytes), charset);
    },

    decodeBase64Text: function(str, charset) {
        try {
            return this.decodeBytes(this.latin1ToBytes(atob(str.replace(/\s/g, ''))), charset);
        } catch(e) {
            return str;
        }
    },

    escapeRegExp: function(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
};
