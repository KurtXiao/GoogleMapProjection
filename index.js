const GoogleMapProjection = require('./src/GoogleMapProjection');

let projection = new GoogleMapProjection(35.098, -117.561, 6, 1000, 1000);
let arr =
    ['./data/KVEF_SDUS85_N0HEYX_201711220008',
    './data/KHNX_SDUS86_N0HHNX_201711222106',
    './data/KLOX_SDUS86_N0HVTX_201711220110',
    './data/KSGX_SDUS86_N0HNKX_201711221428'
];
projection.addPlots(arr);
