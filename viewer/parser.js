const MHTParser = {
    parse: function(buffer) {
        // Decode as Latin-1 to preserve exact bytes for boundary splitting
        const decoder = new TextDecoder('iso-8859-1');
        const fileContent = decoder.decode(buffer);

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
        let rootContentLocation = "";
        const assets = []; 

        // 3. Process each part
        for (let i = 1; i < parts.length - 1; i++) {
            const part = parts[i];
            
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
            const contentType = headers['content-type'] || 'text/plain';
            const encoding = (headers['content-transfer-encoding'] || '').toLowerCase();
            let location = headers['content-location'] || headers['content-id'];
            
            if (location) {
                location = location.replace(/^<|>$/g, '');
            }

            // Extract charset if present
            let charset = 'windows-1252'; 
            const charsetMatch = contentType.match(/charset=["']?([\w-]+)["']?/i);
            if (charsetMatch) {
                charset = charsetMatch[1];
            }

            // 4. Handle based on content type
            if (contentType.includes('text/html') || contentType.includes('text/plain')) {
                if (encoding === 'quoted-printable') {
                    body = this.decodeQuotedPrintable(body, charset);
                } else if (encoding === 'base64') {
                    body = this.decodeBase64Text(body, charset);
                } else {
                    // Raw text that was decoded as iso-8859-1. Re-decode if it's utf-8.
                    if (charset.toLowerCase() === 'utf-8') {
                        try {
                            const bytes = new Uint8Array(body.length);
                            for (let j = 0; j < body.length; j++) {
                                bytes[j] = body.charCodeAt(j);
                            }
                            body = new TextDecoder('utf-8').decode(bytes);
                        } catch(e) {}
                    }
                }
                
                if (contentType.includes('text/html') && !rootHtml) {
                    rootHtml = body;
                    rootContentLocation = location;
                }
            } else {
                // Asset (image, css, etc)
                if (location) {
                    let dataUri = '';
                    if (encoding === 'base64') {
                        body = body.replace(/\s/g, '');
                        dataUri = `data:${contentType.split(';')[0]};base64,${body}`;
                    } else if (encoding === 'quoted-printable') {
                        let text = this.decodeQuotedPrintable(body, charset);
                        dataUri = `data:${contentType.split(';')[0]},${encodeURIComponent(text)}`;
                    } else {
                        dataUri = `data:${contentType.split(';')[0]},${encodeURIComponent(body)}`;
                    }
                    assets.push({ location, dataUri });
                }
            }
        }

        if (!rootHtml) {
            throw new Error("No HTML content found in MHT");
        }

        // 5. Rewrite HTML to use Data URIs
        let rewrittenHtml = rootHtml;
        for (const asset of assets) {
            if (!asset.location) continue;
            
            const locationRegex = new RegExp(this.escapeRegExp(asset.location), 'gi');
            rewrittenHtml = rewrittenHtml.replace(locationRegex, asset.dataUri);
            
            if (!asset.location.startsWith('cid:')) {
                const cidRegex = new RegExp('cid:' + this.escapeRegExp(asset.location), 'gi');
                rewrittenHtml = rewrittenHtml.replace(cidRegex, asset.dataUri);
            }
        }

        return rewrittenHtml;
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
        
        try {
            return new TextDecoder(charset || 'windows-1252').decode(new Uint8Array(bytes));
        } catch(e) {
            return new TextDecoder('windows-1252').decode(new Uint8Array(bytes));
        }
    },

    decodeBase64Text: function(str, charset) {
        try {
            const binaryString = atob(str.replace(/\s/g, ''));
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return new TextDecoder(charset || 'windows-1252').decode(bytes);
        } catch(e) {
            return str;
        }
    },

    escapeRegExp: function(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
};
