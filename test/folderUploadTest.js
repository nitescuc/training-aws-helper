const { S3Helper } = require('../src/s3Helper');
const path = require('path');


const s3Helper = new S3Helper({
    Bucket: 'robocars',
    TrainingImage: '263430657496.dkr.ecr.eu-west-1.amazonaws.com/robocars:1.12.3-gpu-py3',
    RoleArn: 'arn:aws:iam::263430657496:role/service-role/AmazonSageMaker-ExecutionRole-20180512T173485',
    HyperParameters: {
        'enhance_image_count': '50000',
        'use_generator': 'false',
        'slide': '2',
        'crop': '100',
        'break_range': '15',
        'apply_clahe': 'true',
        'model_name': '"model"'
    },
    EnableManagedSpotTraining: true
});
s3Helper.on('progress', progress => console.log(progress));
s3Helper.on('job_status', status => console.log(status));
/*s3Helper.uploadFolderToZip('/Users/az02289/d2/data/home', 'test/test.zip').then(() => {
    return s3Helper.createTrainingJob('s3://robocars/test');
}).then(result => {
    console.log('CreateJob result', result);
}).catch(e => console.error('Error', e));
*/
s3Helper.createTrainingJob('s3://robocars/data/tub_12_19-11-30').then(result => {
    console.log('CreateJob result', result);
}).catch(e => console.error('Error', e));

/*
slide: '2'
enhance_image_count: '50000'
break_range: '15'
apply_clahe: 'true'
crop: '100'
model_name: 'model'
*/