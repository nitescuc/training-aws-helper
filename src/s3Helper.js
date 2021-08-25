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
        const HyperParameters = Object.assign({}, {
            sagemaker_region: '"eu-west-1"',
            use_generator: 'false',
            count_to_generate: '100',
            slide: '2'
        }, (this.config.HyperParameters || {}));
        const job = await sagemaker.createTrainingJob({
            AlgorithmSpecification: {
                TrainingInputMode: 'File',
                TrainingImage: this.config.TrainingImage
            },
            OutputDataConfig: {
                S3OutputPath: `s3://${this.config.Bucket}/model`
            },
            ResourceConfig: {
                InstanceType: 'ml.p2.xlarge',
                InstanceCount: 1,
                VolumeSizeInGB: 5
            },
            RoleArn: this.config.RoleArn,
            StoppingCondition: {
                MaxRuntimeInSeconds: 3600,
                MaxWaitTimeInSeconds: 3600
            },
            TrainingJobName,
            HyperParameters,
            InputDataConfig: [{
                ChannelName: 'train', 
                DataSource: { 
                    S3DataSource: { 
                        S3DataType: 'S3Prefix', 
                        S3Uri: s3Prefix, 
                        S3DataDistributionType: 'FullyReplicated' 
                    }
                } 
            }],
            EnableManagedSpotTraining: this.config.EnableManagedSpotTraining,
            CheckpointConfig: {
                S3Uri: `s3://${this.config.Bucket}/partial`
            }
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