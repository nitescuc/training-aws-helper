const request = require('request-promise-native');
const archiver = require('archiver');
const { Writable } = require('stream');

class S3WritableStream extends Writable {
    constructor(options) {
        super(options);
        this.config = options;
        this._accumulator = [];
        this._totalLength = 0;
        this._partLength = 10 * 1024 * 1024;
        this._partNumber = 0;
    }
    _write(chunk, encoding, callback) {
        const cb = typeof encoding === 'function' ? encoding : callback;
        this._accumulator.push(chunk);
        this._totalLength += chunk.length;
        if (this._totalLength > this._partLength) this.writePart(this._accumulator, cb);
        else cb && cb();
    }
    _writev(chunks, cb) {
        chunks.forEach(chunk => {
            this._accumulator.push(chunk);
            this._totalLength += chunk.length;    
        });
        if (this._totalLength > this._partLength) this.writePart(this._accumulator, cb);
        else cb && cb();
    }
    _final(cb) {
        this.writePart(cb, true);
    }

    async getUploadId() {
        if (this._uploadId) return this._uploadId;

        const result = JSON.parse(await request.post({
            url: this.config.api.createUploadUrl,
            headers: {
                'x-api-key': this.config.api.key,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                filename: this.config.destinationFilename
            })
        }));
        console.log('UploadResult', result);
        return result.uploadId;
    }
    async writeChuncks() {
        // get signedurl
        // request put
    }
    async completeMultipart() {
        const result = JSON.parse(await request.post({
            url: this.config.api.completeUploadUrl,
            headers: {
                'x-api-key': this.config.api.key,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                filename: this.config.destinationFilename,
                uploadId: this._uploadId
            })
        }));
        return true;
    }

    writePart(cb, isLast) {
        this.getUploadId()
            .then((uploadId) => {
                this._uploadId = uploadId;
                return this.writeChunks();
            })
            .then(() => {
                if (isLast) return this.completeMultipart();
                else return true;
            })
            .then(() => {
                this._accumulator = [];
                this._totalLength = 0;
                this._partNumber += 1;
                cb && cb();
            })
            .catch(e => console.error('Part upload error', e));
    }
}

class S3Helper {
    constructor(config) {
        this.config = config;
    }

    async uploadFolderToZip(sourceFolder, destinationFilename) {
/*        const result = JSON.parse(await request.post({
            url: this.config.apiUrl,
            headers: {
                'x-api-key': this.config.apiKey,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                method: 'putObject',
                filename: destinationFilename
            })
        }));*/
        return new Promise((resolve, reject) => {
            const archive = archiver('zip');
            archive.pipe(new S3WritableStream({ ...this.config, destinationFilename }));
            archive.directory(sourceFolder);
            archive.finalize();    
        });
    }
}

module.exports = { S3Helper };