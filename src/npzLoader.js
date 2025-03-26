export class npzLoader {
    async load(url) {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        return this.parseNPZ(new Uint8Array(buffer));
    }

    parseNPZ(data) {
        const archive = {};
        let offset = 0;

        while (offset < data.length - 30) {
            const header = this.parseZipHeader(data, offset);
            if (!header) break;

            const filename = this.readFilename(
                data,
                offset + 30,
                header.filenameLength,
            );
            if (filename.endsWith(".npy")) {
                const start =
                    offset + 30 + header.filenameLength + header.extraLength;
                const end = start + header.compressedSize;
                const npyData = data.slice(start, end);
                const array = this.parseNpy(npyData);
                archive[filename.replace(".npy", "")] = array;
            }

            offset +=
                30 +
                header.filenameLength +
                header.extraLength +
                header.compressedSize;
        }

        return archive;
    }

    parseZipHeader(data, offset) {
        const view = new DataView(data.buffer);
        const signature = view.getUint32(offset, true);
        if (signature !== 0x04034b50) return null; // Local file header signature

        return {
            version: view.getUint16(offset + 4, true),
            flags: view.getUint16(offset + 6, true),
            compression: view.getUint16(offset + 8, true),
            lastModTime: view.getUint16(offset + 10, true),
            lastModDate: view.getUint16(offset + 12, true),
            crc32: view.getUint32(offset + 14, true),
            compressedSize: view.getUint32(offset + 18, true),
            uncompressedSize: view.getUint32(offset + 22, true),
            filenameLength: view.getUint16(offset + 26, true),
            extraLength: view.getUint16(offset + 28, true),
        };
    }

    readFilename(data, offset, length) {
        return String.fromCharCode.apply(
            null,
            data.subarray(offset, offset + length),
        );
    }

    parseNpy(data) {
        const view = new DataView(data.buffer);
        const magic = String.fromCharCode(
            ...new Uint8Array(data.subarray(0, 6)),
        );
        if (magic !== "\x93NUMPY") throw new Error("Invalid NPY magic string");

        const major = data[6];
        if (major !== 1 && major !== 2)
            throw new Error("Unsupported NPY version");

        const headerLength =
            major === 1 ? view.getUint16(8, true) : view.getUint32(8, true);
        const headerStr = String.fromCharCode(
            ...data.subarray(10, 10 + headerLength),
        );
        const header = this.parseNpyHeader(headerStr);

        const dataOffset = 10 + headerLength + (major === 1 ? 2 : 4);
        return this.parseNpyData(data.subarray(dataOffset), header);
    }

    parseNpyHeader(headerStr) {
        const header = headerStr
            .replace(/'/g, '"')
            .replace(/True/g, "true")
            .replace(/False/g, "false")
            .replace(/, *}/g, "}")
            .replace(/\(/g, "[")
            .replace(/\)/g, "]");

        return JSON.parse(header);
    }

    parseNpyData(data, header) {
        const dtype = header.descr.match(/[|<>]?(u?)(int|float)(\d+)/);
        if (!dtype) throw new Error("Unsupported data type");

        // eslint-disable-next-line  @typescript-eslint/no-unused-vars
        const [_, unsigned, type, bits] = dtype;
        const constructor = this.getTypedArrayConstructor(
            type,
            parseInt(bits) / 8,
            unsigned,
        );

        return new constructor(
            data.buffer,
            data.byteOffset,
            data.byteLength / (parseInt(bits) / 8),
        );
    }

    getTypedArrayConstructor(type, bytes, unsigned) {
        const map = {
            int: {
                1: Int8Array,
                2: Int16Array,
                4: Int32Array,
                8: BigInt64Array,
            },
            uint: {
                1: Uint8Array,
                2: Uint16Array,
                4: Uint32Array,
                8: BigUint64Array,
            },
            float: {
                4: Float32Array,
                8: Float64Array,
            },
        };

        return map[unsigned ? "uint" : type][bytes];
    }
}
