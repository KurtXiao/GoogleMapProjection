const JIMP = require('jimp');
const fs = require('fs');
const parser = require('nexrad-level-3-data');
const { plot } = require('nexrad-level-3-plot');
const utils = require('../utils/index');


const PRECISION = 7;
const APIKEY = "AIzaSyDn0rwuFU4XbHCGkOucJ66s9KT2qzBxO2E";
// the range of nexrad-level-3-plot is 230km for radius
const RANGE = 230;
// the width of a pixel for nexrad-level-3-plot
const PIXELWIDTH = RANGE / 900;


function toPrecision(number, precisionLimit) {
    return parseFloat(number).toFixed(precisionLimit);
}

class GoogleMapProjection {
    constructor(lat, lon, zoom, width, height) {
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
     * @param filePath path of the file.
     * @returns Nexrad a promise of a canvas object of nexrad plot.
     */
    plotFile(filePath) {
        return new Promise(resolve => {
            const file = fs.readFileSync(filePath);
            resolve(plot(file, {size: 1800, background: 'white', lineWidth: 2})
                .getContext('2d')
                .getImageData(0, 0, 1800, 1800));
        });
    }
    /**
     * Add multiple hurricane plots onto the current google static map.
     * @param arr an array of paths for hurricane plots
     */
    addPlots(arr) {
        for(let i = 0, p = Promise.resolve(); i <= arr.length; ++i) {
            if(i === arr.length) {
                p.then(() => {
                    this.draw();
                })
            }
            else {
                p = p.then(() => {
                    return new Promise(resolve => {
                        resolve(this.addHurricane(arr[i]));
                    })
                })
            }
        }

    }
    /**
     * Add a single hurricane plot onto the current google static map.
     * @param filePath path of the file.
     * @returns Pic a promise of a the bitmap of the composite picture.
     */
    addHurricane(filePath) {
        const file = fs.readFileSync(filePath);
        const level3Data = parser(file);
        let latCen = level3Data.productDescription.latitude;
        let lngCen = level3Data.productDescription.longitude;
        let boundingBox = utils.getBoundingBox(latCen, lngCen, RANGE);
        let xMin = utils.getXFromLongitude(boundingBox.minLng, this.settings);
        let xMax = utils.getXFromLongitude(boundingBox.maxLng, this.settings);
        let yMin = utils.getYFromLatitude(boundingBox.minLat, this.settings);
        let yMax = utils.getYFromLatitude(boundingBox.maxLat, this.settings);
        return new Promise(resolve => {
            // plot nexrad first
            this.plotFile(filePath)
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
                                                    if(plot.getPixelColor(x + 900, 900 - y) !== 4294967295) {
                                                        mapImage.setPixelColor(plot.getPixelColor(x + 900, 900 - y), mapX, mapY);
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
}

module.exports = GoogleMapProjection;
