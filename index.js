const GoogleMapProjection = require('./src/GoogleMapProjection');
const AWS = require('aws-sdk');
const {Level2Radar} = require("./utils/nexrad-level-2-data");
const { plot, writePngToFile} = require("./utils/nexrad-level-2-plot");
const fs = require('fs');



const bucketName = 'noaa-nexrad-level2';
AWS.config.update({accessKeyId: 'AKIAULYK6YJBMWQW6FIU', secretAccessKey: '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', region: 'us-east-1'});
const s3 = new AWS.S3();


let arr =
    ['./data/KEYX20211118_035751_V06',
        './data/KHNX20211110_072138_V06',
        './data/KVBX20211118_033909_V06',
        './data/KVTX20211118_035920_V06'
    ];


let projection = new GoogleMapProjection(35.098, -117.561, 6, 2000, 2000);
projection.addPlots(arr);

const params = {
    Bucket: bucketName,
    Delimiter: '/',
    Prefix: '2021/11/18/KHNX/'
};
new Promise(((resolve) => {
    s3.listObjects(params, function(err, data) {
        if(err) console.log(err);
        else {
            let nexradKey = data.Contents[data.Contents.length - 1].Key;
            s3.getObject({Bucket: bucketName, Key: nexradKey}, function(err, data) {
                if(err) console.log(err)
                else {
                    let nexradData = data;
                    resolve(nexradData);
                }
            })
        }
    })
})).then((nexradData) => {
    const data = new Level2Radar(nexradData.Body);
    const nexrad = plot(data, 'REF', {background: 'white'});
    writePngToFile('./outputs/test.png', nexrad.REF);
    //console.log(nexrad);
})
const file = fs.readFileSync('./data/KHNX20211118_063740_V06');
const aa = new Level2Radar(file);
const bb = plot(aa, 'REF', {background: 'white'});
writePngToFile('./outputs/test2.png', bb.REF);

