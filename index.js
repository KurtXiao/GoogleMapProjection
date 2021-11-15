const GoogleMapProjection = require('./src/GoogleMapProjection');
const JIMP = require('jimp');
const { plot, writePngToFile } = require('nexrad-level-3-plot');
const fs = require('fs');
const Jimp = require("jimp");



let projection = new GoogleMapProjection(35.098, -117.561, 6, 1000, 1000);
let arr =
    ['./data/KVEF_SDUS85_N0HEYX_201711220008',
        './data/KHNX_SDUS86_N0HHNX_201711222106',
        './data/KLOX_SDUS86_N0HVTX_201711220110',
        './data/KSGX_SDUS86_N0HNKX_201711221428'
    ];
projection.addPlots(arr);
setTimeout(() => {
    projection.draw();
},9000);
/*
let tmp = null;
const url = "https://maps.googleapis.com/maps/api/staticmap?center=35.0980000,-117.5610000&size=500x500&key=AIzaSyDn0rwuFU4XbHCGkOucJ66s9KT2qzBxO2E&zoom=6&maptype=terrain";
JIMP.read(url).then(image => {
    new JIMP({data: image.bitmap.data, width: image.bitmap.width, height: image.bitmap.height}, ((err, img) => {
            img.write('./outputs/test.png');
        }
    ))
    //image.write('./outputs/test.png');
});

 */
/*
JIMP.read(tmp).then(image => {
    image.write('./outputs/test.png');
});
 */

/*
const filePath = "./data/KHNX_SDUS86_N0HHNX_201711222106";
const file = fs.readFileSync(filePath);
const plott = plot(file, {size: 1800, background: 'white', lineWidth: 2});
JIMP.read(plott).then(img => {
    img.write('./outputs/nexrad.png');
})
 */
