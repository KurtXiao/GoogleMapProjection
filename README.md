# GoogleMapProjection

GoogleMapProjection is a class for pasting nexrad level 3 plots onto a given google map.

## Directories

    GoogleMapProjection
        |—— data                        // where the nexrad-level-3-data files are stored\
        |—— outputs                     // where the composition of images is put
            |—— googleMap.png           // the final result
            |—— tmp.png                 // a temporary picture for nexrad-level-3-plot
        |—— src                         // source code
            |—— GoogleMapProjection.js  // the GoogleMapProjection class
        |—— utils                       // helper functions
            |—— index.js                // where all helper functions are exported
            |—— LatLng.js               // helper functions for latlng computations
            |—— netsblox.js             // helper functions copied from netsBlox
        |—— index.js
        |—— packeage.json
        |—— package-lock.json
        |—— README.md


## Process of Projection
    
To paste a nexrad plot onto a static google map, we follow these steps:

    1. get the bounding box in LatLng given the LatLng of the center of the nexrad plot
        1) the central LatLng of the nexrad plot can be acquired from nexrad-level-3-data
        2) the bounding box is always 460km x 460km, the source is from nexrad-level-3-plot:
       
![230km](./readmeImgs/230km.png)
      
    2. transform the bounding box from LatLng to XY
        1) we use the helper functions in netsblox.js to accomplish this
    
    3. for each pixel xy within the bounding box, transform it back to LatLng, get the corresponding pixel on nexrad plot from Latlng, paste the color of that pixel onto xy
        1) nexrad plot is just plain 2D, because nexrad-level-3-plot does not perform any additional processing when it draws the plot
           
![draw](./readmeImgs/draw.png)
           
           "ctx.strokeStyle = palette[Math.round(thisSample * paletteScale)];" sets the color of the arc

           "ctx.arc(0, 0, (idx + data.radialPackets[0].firstBin) / scale, startAngle, endAngle);" draws the arc the radius 
            is just idx, as data.radialPackets[0].firstBin is almost always 0 and scale is 1 for a 1800x1800 plot, which is the standard condition

           moreover, I am not seeing the official documentation for nexrad data does not talk about projection anywhere, 
            which further convinces me that nexrad plot is just a plain 2D image of its products

        2) since nexrad plot does not involve distortion, and it covers the range of 230km(radius), we can get the distance 
            in km that a pixel represents; we can easily locate a specific pixel on nexrad plot given LatLng
           
      
    


    
