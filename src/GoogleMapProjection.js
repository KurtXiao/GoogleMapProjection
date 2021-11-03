const request = require('request');
const JIMP = require('jimp');
const fs = require('fs');
const parser = require('nexrad-level-3-data');
const { plot, writePngToFile } = require('nexrad-level-3-plot');
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
     */
    plotMap() {
        request(this.setParams()).pipe(fs.createWriteStream('./outputs/googleMap.png'));
    }
    /**
     * Draw a hurricane plot.
     * @param filePath path of the file
     */
    plotFile(filePath) {
        const file = fs.readFileSync(filePath);
        const plott = plot(file, {size: 1800, background: 'white', lineWidth: 2});
        writePngToFile("./outputs/tmp.png", plott);
    }
    /**
     * Add multiple hurricane plots onto the current google static map.
     * @param arr an array of paths for hurricane plots
     */
    addPlots(arr) {
        for(let i = 0; i < arr.length; ++i) {
            setTimeout(() => {
                this.addHurricane(arr[i]);
            }, i * 2000);
        }
    }
    /**
     * Add a single hurricane plot onto the current google static map.
     * @param filePath path of the file
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
        // plot the map first
        new Promise((resolve, reject) => {
            let params = this.setParams();
            fs.stat('./outputs/googleMap.png', function(err, stat) {
                if(err == null) {
                    resolve();
                } else if(err.code === 'ENOENT') {
                    request(params).pipe(fs.createWriteStream('./outputs/googleMap.png'));
                    setTimeout(() => {
                        resolve();
                    }, 1000);
                } else {
                    console.log('Error: ', err.code);
                }
            });
        }).then(() => {
            return new Promise(((resolve, reject) => {
                this.plotFile(filePath);
                setTimeout(() => {
                    resolve();
                }, 500);
            }));
        }).then(() => {
            JIMP.read('./outputs/googleMap.png', (err0, mapImage) => {
                if (err0) console.log(1, err0);
                else {
                    JIMP.read('./outputs/tmp.png', (err1, plot) => {
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
                            }
                            mapImage.write('./outputs/googleMap.png');
                        }
                    })
                }
            });
        });
    }
}

module.exports = GoogleMapProjection;
