const GoogleMapProjection = require('./src/GoogleMapProjection');

let projection = new GoogleMapProjection(35.098, -117.561, 6, 1000, 1000);
let arr = ['./data/KVEF_SDUS85_N0HEYX_201711220008', './data/KHNX_SDUS86_N0HHNX_201711222106'];
projection.addPlots(arr);


