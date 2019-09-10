const { S3Helper } = require('../src/s3Helper');
const path = require('path');


const s3Helper = new S3Helper({
    api: {
        key: process.env.API_KEY,
        createUploadUrl: process.env.API_URL_CREATEUPLOAD
    }
});

(s3Helper.uploadFolderToZip(path.join(__dirname, '..', 'src'), 'test/test.zip')).then(() => console.log('finished promise'));
