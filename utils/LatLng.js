Number.prototype.degreeToRadius = function () {
    return this * (Math.PI / 180);
};

Number.prototype.radiusToDegree = function () {
    return (180 * this) / Math.PI;
};
/**
 * Get the bounding box of the current LatLng with a given distance.
 * @param   fsLatitude      latitude
 * @param   fsLongitude     longitude
 * @param   fiDistanceInKM  distance from center in km
 * @returns boundingBox     an object containing the four corners of the bounding box
 */
function getBoundingBox(fsLatitude, fsLongitude, fiDistanceInKM) {

    if (fiDistanceInKM === null || fiDistanceInKM === undefined || fiDistanceInKM === 0)
        fiDistanceInKM = 1;

    let MIN_LAT, MAX_LAT, MIN_LON, MAX_LON, ldEarthRadius, ldDistanceInRadius, lsLatitudeInDegree, lsLongitudeInDegree,
        lsLatitudeInRadius, lsLongitudeInRadius, lsMinLatitude, lsMaxLatitude, lsMinLongitude, lsMaxLongitude, deltaLon;

    // coordinate limits
    MIN_LAT = (-90).degreeToRadius();
    MAX_LAT = (90).degreeToRadius();
    MIN_LON = (-180).degreeToRadius();
    MAX_LON = (180).degreeToRadius();

    // Earth's radius (km)
    ldEarthRadius = 6378.1;

    // angular distance in radians on a great circle
    ldDistanceInRadius = fiDistanceInKM / ldEarthRadius;

    // center point coordinates (deg)
    lsLatitudeInDegree = fsLatitude;
    lsLongitudeInDegree = fsLongitude;

    // center point coordinates (rad)
    lsLatitudeInRadius = lsLatitudeInDegree.degreeToRadius();
    lsLongitudeInRadius = lsLongitudeInDegree.degreeToRadius();

    // minimum and maximum latitudes for given distance
    lsMinLatitude = lsLatitudeInRadius - ldDistanceInRadius;
    lsMaxLatitude = lsLatitudeInRadius + ldDistanceInRadius;

    // minimum and maximum longitudes for given distance
    lsMinLongitude = void 0;
    lsMaxLongitude = void 0;

    // define deltaLon to help determine min and max longitudes
    deltaLon = Math.asin(Math.sin(ldDistanceInRadius) / Math.cos(lsLatitudeInRadius));

    if (lsMinLatitude > MIN_LAT && lsMaxLatitude < MAX_LAT) {
        lsMinLongitude = lsLongitudeInRadius - deltaLon;
        lsMaxLongitude = lsLongitudeInRadius + deltaLon;
        if (lsMinLongitude < MIN_LON) {
            lsMinLongitude = lsMinLongitude + 2 * Math.PI;
        }
        if (lsMaxLongitude > MAX_LON) {
            lsMaxLongitude = lsMaxLongitude - 2 * Math.PI;
        }
    }

    // a pole is within the given distance
    else {
        lsMinLatitude = Math.max(lsMinLatitude, MIN_LAT);
        lsMaxLatitude = Math.min(lsMaxLatitude, MAX_LAT);
        lsMinLongitude = MIN_LON;
        lsMaxLongitude = MAX_LON;
    }

    return {
        minLat: lsMinLatitude.radiusToDegree(),
        minLng: lsMinLongitude.radiusToDegree(),
        maxLat: lsMaxLatitude.radiusToDegree(),
        maxLng: lsMaxLongitude.radiusToDegree()
    };
}


/**
 * Get the distance between two points in LatLng
 * @param   lat1      latitude of the first point
 * @param   lon1      longitude of the first point
 * @param   lat2      latitude of the second point
 * @param   lon2      longitude of the second point
 * @returns distance  distance between the two points in km
 */
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2-lat1);  // deg2rad below
    var dLon = deg2rad(lon2-lon1);
    var a =
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon/2) * Math.sin(dLon/2)
    ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI/180)
}


module.exports = {
    getBoundingBox,
    getDistanceFromLatLonInKm
};
