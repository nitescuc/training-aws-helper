const archiver = require('archiver');
const AWS = require('aws-sdk');
AWS.config.update({region: 'eu-west-1'});
const s3 = new AWS.S3();
const { PassThrough } = require('stream');
const EventEmitter = require('events');

class S3Helper extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
    }

    async uploadFolderToZip(sourceFolder, destinationFilename) {
        const pass = new PassThrough();
        const uploadManager = s3.upload({
            Bucket: this.config.Bucket,
            Key: destinationFilename,
            Body: pass
        }, {
            partSize: 10 * 1024 * 1024,
            queueSize: 1
        });

        const archive = archiver('zip');
        archive.on('end', () => {
            console.log('Ended', archive.pointer());
        })
        archive.pipe(pass);
        archive.directory(sourceFolder);
        archive.finalize();    
        
        uploadManager.on('httpUploadProgress', progress => this.emit('progress', progress));
        return uploadManager.promise();
    }
}

module.exports = { S3Helper };