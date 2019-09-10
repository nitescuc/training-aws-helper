const { S3Helper } = require('../src/s3Helper');
const path = require('path');


const s3Helper = new S3Helper({
    Bucket: 'robocars'
});
s3Helper.on('progress', progress => console.log(progress));
//s3Helper.uploadFolderToZip(path.join(__dirname, '..', 'src'), 'test/test.zip');
s3Helper.uploadFolderToZip('/Users/az02289/d2/data/home', 'test/test.zip');
