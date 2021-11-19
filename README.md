# GoogleMapProjection
# GoogleMapProjection

GoogleMapProjection plots REF images on a google static map.

## Directories

    GoogleMapProjection
        |—— outputs                     // where the composition of images is put
            |—— result.png              // the final result
        |—— src                         // source code
            |—— GoogleMapProjection.js  // the GoogleMapProjection class
        |—— utils                       // helper functions
            |—— index.js                // where all helper functions are exported
            |—— LatLng.js               // helper functions for latlng computations
            |—— netsblox.js             // helper functions copied from netsBlox
            |—— constants.js            // a file that holds the Lat/Lng of each radar constants.js
            |—— nexrad-level-2-data     // the nexrad-level-2-data library whose source code is edited
            |—— nexrad-level-2-plot     // the nexrad-level-2-plot library whose source code is edited
        |—— index.js
        |—— packeage.json
        |—— package-lock.json
        |—— README.md


## Process of Projection

This part is basically the same as that for level-3 plot.
To paste a nexrad plot onto a static google map, we follow these steps:

    1. get the bounding box in LatLng given the LatLng of the center of the nexrad radar
        1) the central LatLng of the nexrad radar can be acquired from /utils/constants.js
        2) the bounding box is always 920km x 920km, the source is from nexrad-level-2-plot:

![230km](./readmeImgs/230km.png)

    2. transform the bounding box from LatLng to XY
        1) we use the helper functions in netsblox.js to accomplish this
    
    3. for each pixel xy within the bounding box, transform it back to LatLng, get the corresponding pixel on nexrad plot from Latlng, paste the color of that pixel onto xy
        1) nexrad plot is just plain 2D, because nexrad-level-2-plot does not perform any additional processing when it draws the plot

![draw](./readmeImgs/draw.png)

           "ctx.strokeStyle = palette[Math.round(thisSample * paletteScale)];" sets the color of the arc

           "ctx.arc(0, 0, (idx + data.radialPackets[0].firstBin) / scale, startAngle, endAngle);" draws the arc the radius 
            is just idx, as data.radialPackets[0].firstBin is almost always 0 and scale is 1 for a 1800x1800 plot, which is the standard condition

           moreover, I am not seeing the official documentation for nexrad data does not talk about projection anywhere, 
            which further convinces me that nexrad plot is just a plain 2D image of its products

        2) since nexrad plot does not involve distortion, and it covers the range of 460km(radius), we can get the distance 
            in km that a pixel represents; we can easily locate a specific pixel on nexrad plot given LatLng

## How the Downloader Works

The mechanism of current downloader:

    1. use aws-sdk to download data from AWS
    
    2. a "day" defined in the bucket is from 6pm yesterday to 6pm today, thus, every time we download up-to-date date, 
       we check whether there is a "tommorrow"
    
    3. if there is, download data using the key of "tomorrow"
    
    4. otherwise, download data using the key of "today"

## Unfinished Parts

    Here is my overall plan:
    1) every time there is a google static map, we should be able to obtain the area it covers based on its center
       location and zoom level
    2) we iterate through every radar in /utils/constants.js and put all radars in the current google map into an array
    3) we run GoogleMapProjection.addPlots(arr) using the array from step 2
    4) we repeat the process every once in a while or whenever the google map changes
    
    Right now, I haven't finished the part of obtaining the area that a google map covers.
    The other parts are finished.

## Potential Improvements

These are aspects of my code where I am not sure whether there is room for improvements

    1. The current downloader only download up-to-date files. Should it be able to cache data and download previous files?

    2. I think my use of Promise is efficient, but the readability must have been sacrified. Is this a minor issue or 
       should I pursue another approach?

## Potential Problems

    Here is one potential problem. The nexrad-level-2-plot library only supports 'REF' products. Thus, right now I am 
    only plotting 'REF' products. There is no possibility to display other products. Is is ok to just display 'REF' plots?
    I assume the fact that it is the only product fully supported implies that it is the one that is most frequently used.
    
           
      
    


    