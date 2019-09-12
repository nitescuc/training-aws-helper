const { S3Helper } = require('../src/s3Helper');
const path = require('path');


const s3Helper = new S3Helper({
    Bucket: 'robocars'
});
s3Helper.on('progress', progress => console.log(progress));
s3Helper.on('job_status', status => console.log(status));
/*s3Helper.uploadFolderToZip('/Users/az02289/d2/data/home', 'test/test.zip').then(() => {
    return s3Helper.createTrainingJob('s3://robocars/test');
}).then(result => {
    console.log('CreateJob result', result);
}).catch(e => console.error('Error', e));
*/
s3Helper.createTrainingJob('s3://robocars/test').then(result => {
    console.log('CreateJob result', result);
}).catch(e => console.error('Error', e));