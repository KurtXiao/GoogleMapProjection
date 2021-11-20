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
     * @returns Map the bitmap of google static map.
     */
    async plotMap() {
        if(this.map !== null) return this.map;
        let image = await JIMP.read(this.setParams());
        this.map = image.bitmap;
        return this.map;
    }
    /**
     * Draw a hurricane plot.
     * @param data nexrad data from downloader.
     * @returns Nexrad a canvas object of nexrad plot.
     */
    async plotFile(data) {
        const tmp = new Level2Radar(data);
        const nexrad = plot(tmp, 'REF', {background: 'white'}).REF.canvas;
        return (nexrad
            .getContext('2d')
            .getImageData(0, 0, NEXRAD_SIZE, NEXRAD_SIZE));
    }
    /**
     * Add multiple hurricane plots onto the current google static map.
     * @param radars an array of radars on the current google static map.
     */
     async addPlots(radars) {
         if(radars.length === 0) {
             await this.plotMap();
             this.draw();
         }
         else {
             await this.downloadNexrad(radars);
             for(let i = 0; i < this.nexrad.length; ++i) {
                 await this.addHurricane(this.nexrad[i][0], this.nexrad[i][1]);
             }
             this.draw();
         }
    }
    /**
     * Add a single hurricane plot onto the current google static map.
     * @param radar name of NEXRAD radar.
     * @param data  content of the NEXRAD file from downloader.
     */
     async addHurricane(radar, data) {
        let latCen = utils.RadarLocation.RadarLocation[radar][0];
        let lngCen = utils.RadarLocation.RadarLocation[radar][1];
        let boundingBox = utils.getBoundingBox(latCen, lngCen, RANGE);
        let xMin = utils.pixelsAt(0, boundingBox.minLng, this.settings).x;
        let xMax = utils.pixelsAt(0, boundingBox.maxLng, this.settings).x;
        let yMin = utils.pixelsAt(boundingBox.minLat, 0, this.settings).y;
        let yMax = utils.pixelsAt(boundingBox.maxLat, 0, this.settings).y;
        // plot nexrad first
        let nexrad = await this.plotFile(data);
        // plot the map
        let map = await this.plotMap();
        let mapImage = await new JIMP({data: map.data, width: map.width, height: map.height});
        let plot = await JIMP.read(nexrad);
        for (let i = xMin; i <= xMax; ++i) {
            for (let j = yMin; j <= yMax; ++j) {
                let mapX = Math.floor(i / this.settings.scale) + mapImage.bitmap.width / 2;
                let mapY = mapImage.bitmap.height / 2 - Math.floor(j / this.settings.scale);
                // only consider xy within the boundaries of google map image
                if (mapX >= 0 && mapX <= mapImage.bitmap.width && mapY >= 0 && mapY <= mapImage.bitmap.height) {
                    let lat = utils.coordsAt(0, j, this.settings).lat;
                    let lng = utils.coordsAt(i, 0, this.settings).lon;
                    let disX = utils.getDistanceFromLatLonInKm(latCen, lng, latCen, lngCen);
                    let x = Math.round(disX / PIXELWIDTH);
                    if (lng < lngCen) x *= -1;
                    let disY = utils.getDistanceFromLatLonInKm(lat, lngCen, latCen, lngCen);
                    let y = Math.round(disY / PIXELWIDTH);
                    if (lat < latCen) y *= -1;
                    // int for white === 4294967295
                    if (plot.getPixelColor(x + (NEXRAD_SIZE / 2), (NEXRAD_SIZE / 2) - y) !== 4294967295) {
                        mapImage.setPixelColor(plot.getPixelColor(x + (NEXRAD_SIZE / 2), (NEXRAD_SIZE / 2) - y), mapX, mapY);
                    }
                }
            }
            this.map = mapImage.bitmap;
        }
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
     */
    async downloadNexrad(radars) {
        this.nexrad = [];
        let arr = [];
        for(let i = 0; i < radars.length; ++i) {
            arr.push(this.downloadSingle(radars[i]));
        }
        await Promise.all(arr);
    }
    /**
     * A helper method for downloadNexrad that downloads for a single radar station.
     * @param radar name of NEXRAD radar.
     */
    async downloadSingle(radar) {
        const today = new Date();
        const tomorrow = new Date(today.getTime() + (24 * 60 * 60 * 1000));
        let params = {
            Bucket: BUCKET,
            Delimiter: '/',
            Prefix: `${tomorrow.getFullYear()}/${tomorrow.getMonth() + 1}/${tomorrow.getDate()}/${radar}/`
        };
        let dataTomorrow = await s3.listObjects(params).promise();
        if(dataTomorrow.Contents.length === 0) {
            params = {
                Bucket: BUCKET,
                Delimiter: '/',
                Prefix: `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}/${radar}/`
            };
            let dataToday = await s3.listObjects(params).promise();
            if(dataToday.Contents.length !== 0) {
                let nexradKey = dataToday.Contents[dataToday.Contents.length - 1].Key;
                if(nexradKey.substr(nexradKey.length - 3) === 'MDM') {
                    nexradKey = dataToday.Contents[dataToday.Contents.length - 2].Key;
                }
                let nexradToday = await s3.getObject({Bucket: BUCKET, Key: nexradKey}).promise();
                this.nexrad.push([radar, nexradToday.Body]);
            }
        }
        else {
            let nexradKey = dataTomorrow.Contents[dataTomorrow.Contents.length - 1].Key;
            if(nexradKey.substr(nexradKey.length - 3) === 'MDM') {
                nexradKey = dataTomorrow.Contents[dataTomorrow.Contents.length - 2].Key;
            }
            let nexradTomorrow = await s3.getObject({Bucket: BUCKET, Key: nexradKey}).promise();
            this.nexrad.push([radar, nexradTomorrow.Body]);
        }
    }
    /**
     * Gets all radars on the current map.
     * @returns Res an array of radars on the current map.
     */
    getRadars() {
        let latMin = utils.coordsAt(0, this.settings.height / -2, this.settings).lat;
        let latMax = utils.coordsAt(0, this.settings.height, this.settings).lat;
        let lngMin = utils.coordsAt(this.settings.width / -2, 0, this.settings).lon;
        let lngMax = utils.coordsAt(this.settings.width / 2, 0, this.settings).lon;
        let res = [];
        for(let i in utils.RadarLocation.RadarLocation) {
            if(utils.RadarLocation.RadarLocation[i][0] > latMin
                && utils.RadarLocation.RadarLocation[i][0] < latMax
                && utils.RadarLocation.RadarLocation[i][1] > lngMin
                && utils.RadarLocation.RadarLocation[i][1] < lngMax) {
                res.push(i);
            }
        }
        return res;
    }
    /**
     * Plots all radars on the current map.
     */
    plotAll() {
        this.addPlots(this.getRadars());
    }
}

module.exports = GoogleMapProjection;
