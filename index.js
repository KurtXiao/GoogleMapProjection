const GoogleMapProjection = require('./src/GoogleMapProjection');



let projection = new GoogleMapProjection(35.098, -117.561, 6, 2000, 2000);
let radars = ['KEYX', 'KHNX', 'KVBX', 'KVTX'];

projection.addPlots(radars);
//projection.plotAll();


