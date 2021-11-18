const AWS = require('aws-sdk');
const bucketName = 'noaa-nexrad-level2';

AWS.config.update({accessKeyId: 'AKIAULYK6YJBMWQW6FIU', secretAccessKey: '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', region: 'us-east-1'});
const s3 = new AWS.S3();
const params = {
    Bucket: bucketName,
    Delimiter: '/',
    Prefix: '2021/11/18/KHNX/'
};
s3.listObjects(params, function(err, data) {
    if(err) console.log(err);
    else {
        let nexradKey = data.Contents[data.Contents.length - 1].Key;
        s3.getObject({Bucket: bucketName, Key: nexradKey}, function(err, data) {
            if(err) console.log(err)
            else {
                let nexradData = data;
                console.log(nexradData);
            }
        })
    }
})
