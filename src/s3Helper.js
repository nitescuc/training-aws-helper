const archiver = require('archiver');
const AWS = require('aws-sdk');
AWS.config.update({region: 'eu-west-1'});
const s3 = new AWS.S3();
const sagemaker = new AWS.SageMaker();
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

    async createTrainingJob(s3Prefix) {
        const TrainingJobName = new Date().toISOString().replace(/:|\./g, '-');
        const job = await sagemaker.createTrainingJob({
            AlgorithmSpecification: {
                TrainingInputMode: 'File',
                TrainingImage: '263430657496.dkr.ecr.eu-west-1.amazonaws.com/robocars:1.8.0-gpu-py3'
            },
            OutputDataConfig: {
                S3OutputPath: 's3://robocars/model'
            },
            ResourceConfig: {
                InstanceType: 'ml.p2.xlarge',
                InstanceCount: 1,
                VolumeSizeInGB: 1
            },
            RoleArn: 'arn:aws:iam::263430657496:role/service-role/AmazonSageMaker-ExecutionRole-20180512T173485',
            StoppingCondition: {
                MaxRuntimeInSeconds: 3600
            },
            TrainingJobName,
            HyperParameters: {
                sagemaker_region: '"eu-west-1"',
                use_generator: 'false',
                count_to_generate: '100',
                slide: '2'
            },
            InputDataConfig: [{
                ChannelName: 'train', 
                DataSource: { 
                    S3DataSource: { 
                        S3DataType: 'S3Prefix', 
                        S3Uri: s3Prefix, 
                        S3DataDistributionType: 'FullyReplicated' 
                    }
                } 
            }]
        }).promise();
        
        const interval = setInterval(async () => {
            const status = await sagemaker.describeTrainingJob({
                TrainingJobName
            }).promise();
            if (status.TrainingJobStatus !== 'InProgress' && status.TrainingJobStatus !== 'Stopping') clearInterval(interval);
            this.emit('job_status', status);
        }, 10000);

        return { TrainingJobName, ...job };
    }
}

module.exports = { S3Helper };