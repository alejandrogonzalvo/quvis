// import * as pako from 'pako'; // Pako no longer needed for this simplified version

export class npzLoader {
    async load(url) {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        console.log("[npzLoader] Fetched buffer, size:", buffer.byteLength);
        return this.parseNPZ(new Uint8Array(buffer));
    }

    parseNPZ(data) {
        const archive = {};
        let offset = 0;
        console.log("[npzLoader] Starting NPZ parse (uncompressed). Data length:", data.length);
        let fileCount = 0;

        while (offset < data.length - 30) { 
            const header = this.parseZipHeader(data, offset);
            if (!header) {
                console.log("[npzLoader] No more valid ZIP headers or invalid signature at offset:", offset);
                break;
            }
            fileCount++;
            console.log(
                `[npzLoader] Found ZIP entry ${fileCount}, ` +
                `filenameLength: ${header.filenameLength}, ` +
                `compressedSize: ${header.compressedSize}, ` +
                `uncompressedSize: ${header.uncompressedSize}, ` +
                `compression: ${header.compression}` // flags removed for brevity
            );

            const filename = this.readFilename(
                data,
                offset + 30,
                header.filenameLength,
            );
            console.log("[npzLoader] Entry filename:", filename);

            if (filename.endsWith(".npy")) {
                console.log(`[npzLoader] Processing .npy file: ${filename}`);
                const entryDataStart =
                    offset + 30 + header.filenameLength + header.extraLength;
                
                if (entryDataStart > data.length) {
                    console.error(`[npzLoader] Calculated entryDataStart ${entryDataStart} for ${filename} exceeds data length ${data.length}. Skipping.`);
                    offset += (30 + header.filenameLength + header.extraLength + Math.max(0, header.compressedSize)); 
                    continue;
                }
                
                // For uncompressed NPZ from np.savez, compression is 0 (Stored)
                // and compressedSize should equal uncompressedSize.
                // The actual data for the NPY file is header.uncompressedSize bytes long.
                const npyFileLength = header.uncompressedSize; 
                if (header.compression !== 0) {
                     console.warn(`[npzLoader] Expected compression method 0 (Stored) but got ${header.compression} for ${filename}. Will attempt to read uncompressedSize anyway.`);
                }
                if (header.compressedSize !== header.uncompressedSize && header.compressedSize !== 0xFFFFFFFF /*ignore Zip64 marker if it appears*/) {
                    console.warn(`[npzLoader] For Stored file ${filename}, compressedSize (${header.compressedSize}) != uncompressedSize (${header.uncompressedSize}). Using uncompressedSize.`);
                }

                const availableDataForEntry = data.length - entryDataStart;
                if (npyFileLength > availableDataForEntry) {
                    console.error(`[npzLoader] NPY file length ${npyFileLength} for ${filename} (from uncompressedSize) exceeds available data ${availableDataForEntry}. Skipping.`);
                    offset += (30 + header.filenameLength + header.extraLength + header.compressedSize); // Use original compressedSize for offset advancement
                    continue;
                }

                let npyFileBytes = data.subarray(entryDataStart, entryDataStart + npyFileLength);

                console.log(`[npzLoader] NPY data buffer for ${filename} has length: ${npyFileBytes.length}`);

                try {
                    const array = this.parseNpy(npyFileBytes, filename); 
                    archive[filename.replace(".npy", "")] = array;
                    console.log(`[npzLoader] Successfully parsed and stored: ${filename.replace(".npy", "")}`);
                } catch (e) {
                    console.error(`[npzLoader] Error parsing NPY content for ${filename}:`, e);
                }
            } else {
                console.log(`[npzLoader] Skipping non .npy file: ${filename}`);
            }
            // Advance offset by what the header claims is the size of this entry ON DISK (compressedSize)
            offset += (30 + header.filenameLength + header.extraLength + header.compressedSize); 
        }
        if (fileCount === 0 && data.length > 0) {
            console.warn("[npzLoader] Parsed NPZ, but found no ZIP entries. Is the file a valid ZIP archive?");
        }
        console.log("[npzLoader] Finished NPZ parse. Archive object:", archive);
        return archive;
    }

    parseZipHeader(data, offset) {
        if (offset + 30 > data.length) {
            // console.log("[npzLoader.parseZipHeader] Data too short for header at offset:", offset); // Too noisy if it's just end of file
            return null;
        }
        const view = new DataView(data.buffer, data.byteOffset + offset, data.length - offset);
        
        const signature = view.getUint32(0, true);
        if (signature !== 0x04034b50) {
            // console.log(`[npzLoader.parseZipHeader] Invalid signature ${signature.toString(16)} at data offset: ${offset}`); // Can be noisy
            return null;
        }

        const compressedSize = view.getUint32(18, true); 
        const uncompressedSize = view.getUint32(22, true);

        // Raw byte logging removed for simplified version, but can be re-added if needed
        // if (offset === 0) { ... }

        return {
            version: view.getUint16(4, true),
            flags: view.getUint16(6, true),
            compression: view.getUint16(8, true),
            // lastModTime, lastModDate, crc32 removed for brevity, not used by current logic
            compressedSize: compressedSize,
            uncompressedSize: uncompressedSize,
            filenameLength: view.getUint16(26, true),
            extraLength: view.getUint16(28, true),
        };
    }

    readFilename(data, offset, length) {
        if (offset + length > data.length) return "ErrorReadingFilename";
        return String.fromCharCode.apply(
            null,
            data.subarray(offset, offset + length),
        );
    }

    parseNpy(data, filename) { 
        const view = new DataView(data.buffer, data.byteOffset, data.byteLength); 
        
        if (data.length < 10) throw new Error(`NPY data too short for header (length: ${data.length}) for ${filename || 'unknown file'}`);

        const magic = String.fromCharCode.apply(null, data.subarray(0, 6));
        if (magic !== "\x93NUMPY") throw new Error(`Invalid NPY magic string for ${filename || 'unknown file'}`);

        const major = data[6];
        if (major !== 1 && major !== 2 && major !== 3) 
            throw new Error(`Unsupported NPY major version ${major} for ${filename || 'unknown file'}`);

        let headerLength;
        let headerStartOffset = 8; 
        if (major === 1 || major === 2) {
            headerLength = view.getUint16(headerStartOffset, true); 
            headerStartOffset += 2; 
        } else { 
            headerLength = view.getUint32(headerStartOffset, true); 
            headerStartOffset += 4; 
        }
        
        if (headerStartOffset + headerLength > data.length) {
            throw new Error(`Calculated NPY header length (${headerLength}) from offset ${headerStartOffset} exceeds NPY data segment (length: ${data.length}) for ${filename || 'unknown file'}.`);
        }

        const headerStrBytes = data.subarray(headerStartOffset, headerStartOffset + headerLength);
        const headerStr = new TextDecoder('utf-8').decode(headerStrBytes);
        const header = this.parseNpyHeader(headerStr, filename);

        const dataOffset = headerStartOffset + headerLength; 
        return this.parseNpyData(data.subarray(dataOffset), header, filename);
    }

    parseNpyHeader(headerStr, filename) {
        console.log(`[npzLoader] NPY header string for ${filename || 'unknown file'} before replacements:`, headerStr);
        
        let jsonCandidate = headerStr;
        jsonCandidate = jsonCandidate.replace(/'/g, '"');
        jsonCandidate = jsonCandidate.replace(/True/g, "true");
        jsonCandidate = jsonCandidate.replace(/False/g, "false");
        jsonCandidate = jsonCandidate.replace(/None/g, "null");
        jsonCandidate = jsonCandidate.replace(/\(/g, "[");
        jsonCandidate = jsonCandidate.replace(/\)/g, "]");
        jsonCandidate = jsonCandidate.replace(/,\s*\]/g, "]");
        jsonCandidate = jsonCandidate.replace(/,\s*\}/g, "}");
        jsonCandidate = jsonCandidate.replace(/([0-9]+)L(?=\s*[,}\]])/g, "$1");

        console.log(`[npzLoader] NPY header string for ${filename || 'unknown file'} after replacements (JSON candidate):`, jsonCandidate);

        try {
            return JSON.parse(jsonCandidate);
        } catch (e) {
            console.error(`[npzLoader] JSON.parse failed for ${filename || 'unknown file'}. Candidate string was:`, jsonCandidate, "Original error:", e);
            throw new Error(`Failed to parse NPY header for ${filename} (after replacements): ${e.message}. Original header: <${headerStr}>. Processed header: <${jsonCandidate}>`); 
        }
    }

    parseNpyData(data, header, filename) { 
        const dtypeMatch = header.descr.match(/[|<>]?(u?)(int|float|S|U|O|b|bool|datetime64|timedelta64)([\d_]*)/i);
        if (!dtypeMatch) throw new Error(`Unsupported data type description '${header.descr}' in NPY header for ${filename || 'unknown file'}`);

        const [_, signOrEndian, typeCategory, typeLengthStr] = dtypeMatch;

        if (typeCategory.toUpperCase() === 'O') {
            // For this simplified version, if we get an Object array, we assume it contains pickled strings by NumPy
            // This is hard to parse directly. The Python script should save strings as <U or S type directly.
            // If operations_payload was saved as np.array([json_string]), its dtype should be <U... or |S...
            console.warn(`[npzLoader] Encountered dtype 'object' (O) for ${filename || 'unknown file'}. Expecting a string type (<U or |S) for JSON payload. Attempting to treat as string if shape is () or (1,).`);
            // If shape is () (scalar) or (1,) it might be our single JSON string wrapped as an object.
            // This path is tricky. Let's rely on string parsing below for <U or |S types.
            // For now, return empty if we hit this unexpectedly for the main payload.
            if (filename.includes('operations_payload')) return [];
        }
        
        if (typeCategory.toUpperCase() === 'S' || typeCategory.toUpperCase() === 'U') {
            const itemLength = parseInt(typeLengthStr) || 1; 
            if (itemLength === 0) throw new Error(`String type ${typeCategory} has itemLength 0 for ${filename || 'unknown file'}`);
            
            const numItems = Math.floor(data.byteLength / itemLength); // Use Math.floor for safety
            if (data.byteLength % itemLength !== 0 && !(typeCategory.toUpperCase() === 'S' && itemLength ===1)) {
                console.warn(`[npzLoader] String data bytelength (${data.byteLength}) for ${filename || 'unknown file'} is not a multiple of item length (${itemLength}). Might parse ${numItems} full items.`);
            }
            const strings = [];
            const decoder = typeCategory.toUpperCase() === 'U' ? new TextDecoder('utf-32le') : new TextDecoder('utf-8');
            
            for (let i = 0; i < numItems; i++) {
                const start = i * itemLength;
                const end = start + itemLength;
                const stringBytesRaw = data.subarray(start, end);
                let stringBytesProcessed = stringBytesRaw;

                if (typeCategory.toUpperCase() === 'U') {
                    let actualCharLength = 0;
                    for(let k=0; k < itemLength / 4; k++){ 
                        if(stringBytesRaw[k*4] === 0 && stringBytesRaw[k*4+1] === 0 && stringBytesRaw[k*4+2] === 0 && stringBytesRaw[k*4+3] === 0){
                            break;
                        }
                        actualCharLength++;
                    }
                    stringBytesProcessed = stringBytesRaw.subarray(0, actualCharLength * 4);
                } else { 
                    let firstNull = stringBytesRaw.indexOf(0);
                    if (firstNull !== -1) {
                        stringBytesProcessed = stringBytesRaw.subarray(0, firstNull);
                    }
                }
                strings.push(decoder.decode(stringBytesProcessed));
            }
            console.log(`[npzLoader] Parsed ${strings.length} strings for ${filename || 'unknown file'}. First item:`, strings.length > 0 ? strings[0].substring(0,100) + '...' : 'N/A');
            return strings; // This will be an array of strings. If only one JSON string, it's an array of one element.
        }
        
        const littleEndian = header.descr[0] === '<' || header.descr[0] === '|'; 
        let bits = parseInt(typeLengthStr); 
        if (isNaN(bits) && (typeCategory === "bool" || typeCategory === "b")) bits = 8; 

        const bytes = bits / 8;
        if (bytes === 0 && !(typeCategory === "bool" || typeCategory === "b")) { 
            throw new Error(`Calculated 0 bytes per element for dtype '${header.descr}' in ${filename || 'unknown file'}`);
        }
        
        const constructor = this.getTypedArrayConstructor(typeCategory, bytes, signOrEndian === 'u', littleEndian);
        if (!constructor) {
             throw new Error(`Failed to find a TypedArray constructor for dtype '${header.descr}', typeCat '${typeCategory}', bytes ${bytes} for ${filename || 'unknown file'}`);
        }

        if (data.byteLength === 0) { // Handle empty data array for a numeric type
             console.warn(`[npzLoader] Numerical data array for ${filename} is empty (0 bytes). Returning empty typed array.`);
             return new constructor(0);
        }
        if (bytes === 0 && data.byteLength > 0) { // Avoid division by zero if bytes is unexpectedly zero but data exists
            throw new Error(`Element size is 0 bytes but data array is not empty for ${filename}. Dtype: ${header.descr}`);
        }
        if (data.byteLength % bytes !== 0) {
            console.warn(`[npzLoader] Numerical data bytelength (${data.byteLength}) for ${filename || 'unknown file'} is not a multiple of element size (${bytes} bytes) for dtype '${header.descr}'. Data might be truncated or misaligned.`);
        }
        
        return new constructor(data.buffer, data.byteOffset, Math.floor(data.byteLength / bytes)); // Use Math.floor for num elements
    }

    getTypedArrayConstructor(type, bytes, unsigned, littleEndian) { 
        const typeLower = type.toLowerCase();
        if (typeLower.startsWith("int") || typeLower.startsWith("uint")) {
            const signed = !unsigned && !typeLower.startsWith("uint"); 
            switch (bytes) {
                case 1: return signed ? Int8Array : Uint8Array;
                case 2: return signed ? Int16Array : Uint16Array;
                case 4: return signed ? Int32Array : Uint32Array;
                case 8: return signed ? BigInt64Array : BigUint64Array;
            }
        } else if (typeLower.startsWith("float")) {
            switch (bytes) {
                case 4: return Float32Array;
                case 8: return Float64Array;
            }
        } else if (typeLower === "bool" || typeLower === "b") { 
            return Uint8Array;
        }
        console.warn(`[npzLoader] No TypedArray constructor found for type: ${type}, bytes: ${bytes}, unsigned: ${unsigned}`);
        return null;
    }
}
