const JIMP = require('jimp');
const { Level2Radar } = require('../utils/nexrad-level-2-data');
const { plot } = require('../utils/nexrad-level-2-plot');
const utils = require('../utils/index');
const AWS = require('aws-sdk');

const NEXRAD_SIZE = 3600;
const PRECISION = 7;
const APIKEY = "AIzaSyDn0rwuFU4XbHCGkOucJ66s9KT2qzBxO2E";
// the range of nexrad-level-3-plot is 460km for radius
const RANGE = 460;
// the width of a pixel for nexrad-level-3-plot
const PIXELWIDTH = RANGE / (NEXRAD_SIZE / 2);
const BUCKET = 'noaa-nexrad-level2';
// configure aws-sdk
AWS.config.update({accessKeyId: 'AKIAULYK6YJBMWQW6FIU', secretAccessKey: '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', region: 'us-east-1'});
const s3 = new AWS.S3();


function toPrecision(number, precisionLimit) {
    return parseFloat(number).toFixed(precisionLimit);
}

class GoogleMapProjection {
    constructor(lat, lon, zoom, width, height) {
        // this line is directly copied from Netsblox project
        const scale = width <= 640 && height <= 640 ? 1 : 2;
        this.settings = {
            center: {
                lat: toPrecision(lat, PRECISION),
                lon: toPrecision(lon, PRECISION)
            },
            width: (width / scale),
            height: (height / scale),
            zoom: zoom,
            scale: scale,
            mapType: "terrain"
        }
        this.map = null;
        this.nexrad = [];
    }
    /**
     * Set the url for google static map.
     * @returns Url the url for google static map
     */
    setParams() {
        return `https://maps.googleapis.com/maps/api/staticmap?`
            + `center=${this.settings.center.lat},${this.settings.center.lon}`
            + `&size=${this.settings.width}x${this.settings.height}`
            + `&key=${APIKEY}`
            + `&zoom=${this.settings.zoom}`
            + `&maptype=${this.settings.mapType}`;
    }
    /**
     * Plot the google static map.
     * @returns Map a promise of the bitmap of google static map.
     */
    plotMap() {
        return new Promise((resolve => {
            JIMP.read(this.setParams()).then(image => {
                this.map = this.map === null ? image.bitmap : this.map;
                resolve(this.map);
            });
        }));
    }
    /**
     * Draw a hurricane plot.
     * @param data nexrad data from downloader.
     * @returns Nexrad a promise of a canvas object of nexrad plot.
     */
    plotFile(data) {
        return new Promise(resolve => {
            const tmp = new Level2Radar(data);
            const nexrad = plot(tmp, 'REF', {background: 'white'}).REF.canvas;
            resolve(nexrad
                .getContext('2d')
                .getImageData(0, 0, NEXRAD_SIZE, NEXRAD_SIZE));
        });
    }
    /**
     * Add multiple hurricane plots onto the current google static map.
     * @param radars an array of radars on the current google static map.
     */
    addPlots(radars) {
        this.downloadNexrad(radars).then(() => {
            for(let i = 0, p = Promise.resolve(); i <= this.nexrad.length; ++i) {
                if(i === this.nexrad.length) {
                    p.then(() => {
                        this.draw();
                    })
                }
                else {
                    p = p.then(() => {
                        return new Promise(resolve => {
                            resolve(this.addHurricane(this.nexrad[i][0], this.nexrad[i][1]));
                        })
                    })
                }
            }
        });
    }
    /**
     * Add a single hurricane plot onto the current google static map.
     * @param radar name of NEXRAD radar.
     * @param data  content of the NEXRAD file from downloader.
     * @returns Pic a promise of a the bitmap of the composite picture.
     */
    addHurricane(radar, data) {
        let latCen = utils.RadarLocation.RadarLocation[radar][0];
        let lngCen = utils.RadarLocation.RadarLocation[radar][1];
        let boundingBox = utils.getBoundingBox(latCen, lngCen, RANGE);
        let xMin = utils.getXFromLongitude(boundingBox.minLng, this.settings);
        let xMax = utils.getXFromLongitude(boundingBox.maxLng, this.settings);
        let yMin = utils.getYFromLatitude(boundingBox.minLat, this.settings);
        let yMax = utils.getYFromLatitude(boundingBox.maxLat, this.settings);
        return new Promise(resolve => {
            // plot nexrad first
            this.plotFile(data)
                .then((nexrad) => {
                    // plot the map
                    this.plotMap().then((map) => {
                        new JIMP({data: map.data, width: map.width, height: map.height}, (err0, mapImage) => {
                            if (err0) console.log(1, err0);
                            else {
                                JIMP.read(nexrad, (err1, plot) => {
                                    if(err1) console.log(2, err1);
                                    else {
                                        for(let i = xMin; i <= xMax; ++i) {
                                            for(let j = yMin; j <= yMax; ++j) {
                                                let mapX = Math.floor(i / this.settings.scale) + mapImage.bitmap.width / 2;
                                                let mapY = mapImage.bitmap.height / 2 - Math.floor(j / this.settings.scale);
                                                // only consider xy within the boundaries of google map image
                                                if(mapX >= 0 && mapX <= mapImage.bitmap.width && mapY >= 0 && mapY <= mapImage.bitmap.height) {
                                                    let lat = utils.getLatitudeFromY(j, this.settings);
                                                    let lng = utils.getLongitudeFromX(i, this.settings);
                                                    let disX = utils.getDistanceFromLatLonInKm(latCen, lng, latCen, lngCen);
                                                    let x = Math.round(disX / PIXELWIDTH);
                                                    if(lng < lngCen) x *= -1;
                                                    let disY = utils.getDistanceFromLatLonInKm(lat, lngCen, latCen, lngCen);
                                                    let y = Math.round(disY / PIXELWIDTH);
                                                    if(lat < latCen) y *= -1;
                                                    // int for white === 4294967295
                                                    if(plot.getPixelColor(x + (NEXRAD_SIZE / 2), (NEXRAD_SIZE / 2) - y) !== 4294967295) {
                                                        mapImage.setPixelColor(plot.getPixelColor(x + (NEXRAD_SIZE / 2), (NEXRAD_SIZE / 2) - y), mapX, mapY);
                                                    }
                                                }
                                            }
                                            this.map = mapImage.bitmap;
                                            resolve(this.map);
                                        }
                                    }
                                })
                            }
                        });
                    });
                });
        });
    }
    /**
     * Draw the final plot based on bitmap of google static map.
     */
    draw() {
        new JIMP({data: this.map.data, width: this.map.width, height: this.map.height}, (err0, mapImage) => {
            mapImage.write('./outputs/result.png');
        })
    }
    /**
     * An auto-downloader of up-to-date NEXRAD files.
     * @param radars the radars whose up-to-date files we want to download.
     * @returns Res a promise that resolves when all files are downloaded.
     */
    downloadNexrad(radars) {
        this.nexrad = [];
        return new Promise(resolve => {
            let arr = [];
            for(let i = 0; i < radars.length; ++i) {
                arr.push(this.downloadSingle(radars[i]));
            }
            Promise.all(arr).then(() => {
                resolve();
            })
        })
    }
    /**
     * A helper method for downloadNexrad that downloads for a single radar station.
     * @param radar name of NEXRAD radar.
     * @returns Res a promise that resolves when the up-to-date file of the selected radar is downloaded.
     */
    downloadSingle(radar) {
        const today = new Date();
        const tomorrow = new Date(today.getTime() + (24 * 60 * 60 * 1000));
        return new Promise(((resolve, reject) => {
            let params = {
                Bucket: BUCKET,
                Delimiter: '/',
                Prefix: `${tomorrow.getFullYear()}/${tomorrow.getMonth() + 1}/${tomorrow.getDate()}/${radar}/`
            };
            s3.listObjects(params, (err1, data1) => {
                if(err1) reject(err1);
                else {
                    if(data1.Contents.length === 0) {
                        params = {
                            Bucket: BUCKET,
                            Delimiter: '/',
                            Prefix: `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}/${radar}/`
                        };
                        s3.listObjects(params, (err2, data2) => {
                            if(err2) reject(err2);
                            else {
                                if(data2.Contents.length !== 0) {
                                    let nexradKey = data2.Contents[data2.Contents.length - 1].Key;
                                    if(nexradKey.substr(nexradKey.length - 3) === 'MDM') {
                                        nexradKey = data2.Contents[data2.Contents.length - 2].Key;
                                    }
                                    s3.getObject({Bucket: BUCKET, Key: nexradKey}, (err3, data3) => {
                                        if(err3) console.log(err3)
                                        else {
                                            this.nexrad.push([radar, data3.Body]);
                                            resolve();
                                        }
                                    })
                                }
                            }
                        })
                    }
                    else {
                        let nexradKey = data1.Contents[data1.Contents.length - 1].Key;
                        if(nexradKey.substr(nexradKey.length - 3) === 'MDM') {
                            nexradKey = data1.Contents[data1.Contents.length - 2].Key;
                        }
                        s3.getObject({Bucket: BUCKET, Key: nexradKey}, (err4, data4) => {
                            if(err4) reject(err4)
                            else {
                                this.nexrad.push([radar, data4.Body]);
                                resolve();
                            }
                        })
                    }
                }
            })
        }));
    }
}

module.exports = GoogleMapProjection;
