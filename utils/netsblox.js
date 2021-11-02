
// This file contains helper functions borrowed from the netsBlox project.

const SphericalMercator = require('sphericalmercator');
const merc = new SphericalMercator({size:256});

function getXFromLongitude(longitude, mapInfo) {
    let pixels = pixelsAt(0, longitude, mapInfo);
    return pixels.x;
}

function getYFromLatitude(latitude, mapInfo) {
    let pixels = pixelsAt(latitude, 0, mapInfo);
    return pixels.y;
}

function getImageCoordinates(latitude, longitude, mapInfo) {
    let pixels = pixelsAt(latitude, longitude, mapInfo);
    return [pixels.x, pixels.y];
}

function coordsAt(x, y, map) {
    x = Math.ceil(x / map.scale);
    y = Math.ceil(y / map.scale);
    let centerLl = [map.center.lon, map.center.lat];
    let centerPx = merc.px(centerLl, map.zoom);
    let targetPx = [centerPx[0] + parseInt(x), centerPx[1] - parseInt(y)];
    let targetLl = merc.ll(targetPx, map.zoom); // long lat
    let coords = {lat: targetLl[1], lon: targetLl[0]};
    if (coords.lon < -180) coords.lon = coords.lon + 360;
    if (coords.lon > 180) coords.lon = coords.lon - 360;
    return coords;
}


function pixelsAt(lat, lon, mapInfo) {
    let curPx = merc.px([mapInfo.center.lon, mapInfo.center.lat], mapInfo.zoom);
    let targetPx = merc.px([lon, lat], mapInfo.zoom);
    let pixelsXY = {x: (targetPx[0] - curPx[0]), y: -(targetPx[1] - curPx[1])};
    pixelsXY = {x: pixelsXY.x * mapInfo.scale, y: pixelsXY.y * mapInfo.scale};
    return pixelsXY;
}


function getLongitudeFromX(x, mapInfo){
    let coords = coordsAt(x, 0, mapInfo);
    return coords.lon;
};

function getLatitudeFromY(y, mapInfo){
    let coords = coordsAt(0, y, mapInfo);
    return coords.lat;
};


module.exports = {
    getXFromLongitude,
    getYFromLatitude,
    coordsAt,
    pixelsAt,
    getImageCoordinates,
    getLatitudeFromY,
    getLongitudeFromX
}
