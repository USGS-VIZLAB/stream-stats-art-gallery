
// Globals
const geocodeAPIURL = "https://maps.googleapis.com/maps/api/geocode/json?address="; // New Google API URL
const key = "&key=" + config.geocodeKey;

// Functions
let toRadians = degrees => degrees * Math.PI / 180;
let toDegrees = radians => radians * 180 / Math.PI;
let distance = (lat1, lon1, lat2, lon2, unit) => {
    if ((lat1 == lat2) && (lon1 == lon2)) {
        return 0;
    } else {
        // start
        let startLat = toRadians(lat1);
        let startLng = toRadians(lon1);
        // destination
        let destLat = toRadians(lat2);
        let destLng = toRadians(lon2);

        // haversine
        let theta = lon1-lon2;
        let radtheta = Math.PI * theta/180;
        let dist = Math.sin(startLat) * Math.sin(destLat) + Math.cos(startLat) * Math.cos(destLat) * Math.cos(radtheta);
        if (dist > 1) {
            dist = 1;
        }
        dist = Math.acos(dist);
        dist = dist * 180/Math.PI;
        dist = dist * 60 * 1.1515;
        if (unit=="K") { 
            dist = dist * 1.609344; 
            thisUint = "kilometers"
        } else if (unit=="N") { 
            dist = dist * 0.8684; 
            thisUnit = "nautical miles"
        } else { 
            thisUnit = "miles"
        };
        // bearing
        y = Math.sin(destLng - startLng) * Math.cos(destLat);
        x = Math.cos(startLat) * Math.sin(destLat) -
                Math.sin(startLat) * Math.cos(destLat) * Math.cos(destLng - startLng);
        brng = Math.atan2(y, x);
        brng = toDegrees(brng);
        return {"units": thisUnit, "distance": +dist.toFixed(4), "bearing": +((brng+360) % 360).toFixed(2) };
    }
}

// First, get location
// const getLocation = async () => {
//         // get location from input
//         let city = document.getElementById("city").value;
//         let state = document.getElementById("state").value;
//         console.log(city, state);

//         let url = geocodeAPIURL + "+" + city + ",+" + state + key;
//         console.log(url)

//         //promise!
//         fetch(url)
//             .then(response => { 
//                 return response.json() 
//             })
//             .then(json => { // convert api response to a gps point
//                 let point = { // includes lat and long plus bounding box
//                     lat: json.results[0].geometry.location.lat,
//                     long: json.results[0].geometry.location.lng,
//                     north: +(json.results[0].geometry.location.lat+.1).toFixed(4),
//                     east: +(json.results[0].geometry.location.lng+.1).toFixed(4),
//                     south: +(json.results[0].geometry.location.lat-.1).toFixed(4),
//                     west: +(json.results[0].geometry.location.lng-.1).toFixed(4)
//                 }
//                 console.log(point, "is our point from the getLocation Promise")
//                 return point;
//             })
//             .catch(err => console.log(err));
//     };

// const getGages = new Promise((resolve,reject) => {
//         fetch("data/ref_gages.json")
//             .then(response => response.json())
//             .then(json => {
//                 console.log(json, "inside the getGages Promise");
//                 return json;
//             })        
//             .catch(err => console.log(err));
//     })

const getGages = d3.csv("data/ref_gages.csv").then(data => { return data; }).catch(err => console.log(err));

const makeBlob = async () => {

    // get location from input
    let city = document.getElementById("city").value;
    let state = document.getElementById("state").value;
    console.log(city, state);

    let url = geocodeAPIURL + "+" + city + ",+" + state + key;
    console.log(url)

    let origin = {};
    //promise!
    await fetch(url)
        .then(response => { 
            return response.json() 
        })
        .then(json => { // convert api response to a gps point
            let point = { // includes lat and long plus bounding box
                lat: +json.results[0].geometry.location.lat.toFixed(4),
                long: +json.results[0].geometry.location.lng.toFixed(4),
                north: +(json.results[0].geometry.location.lat+.1).toFixed(4),
                east: +(json.results[0].geometry.location.lng+.1).toFixed(4),
                south: +(json.results[0].geometry.location.lat-.1).toFixed(4),
                west: +(json.results[0].geometry.location.lng-.1).toFixed(4)
            }
            origin = point;
            return point; // returns the point!!
        })
        .catch(err => console.log(err));

    console.log(origin, "origin")

    let gages = [];
    // now use this point on each gage
    await d3.csv("data/ref_gages.csv", function(gage, index){
        gage.originPoint = origin;
        gage.distanceToOrigin = distance(origin.lat, origin.long, gage.LAT_GAGE, gage.LONG_GAGE)
        gages.push(gage)
        
    })
    console.log(gages, "gages")
    let smallestDistToGage = indexOf(d3.min(gages, function(d){ return d.distanceToOrigin.distance}));
    console.log(nearestGage, "nearest Gage")
    
}


// OLD STUFF NOT WORKING

// const newGages = getGages
//     .then(function(gages){
//         return Promise.all(gages.map(function(thisGage){
//             // console.log(thisGage,"results???")
//         }))
//     })

// // Promises in order
// const promises = [getGages];
// // const makeBlob = Promise.all(promises)
// //     .then(function(data) { console.log(data, "value")})

// // const makeBlob = getGages.then(function(value) {
// //     console.log(value, "value")
// // })

// const makeBlob = async () => {
//     const promises = [newGages];
//     Promise.all(promises)
//         .then(values => console.log(values, "inside make blob"))
//         .catch(err => console.log(err))

// }

// // async function makeBlob() {
// //     // return new Promise((resolve,reject) => {
// //     //     getLocation(resolve);
// //     // });

// //     let promises = [getLocation(), getGages()]
// //     Promise.all(promises)
// //         .then(response => {
// //             console.log(response)
// //         })
// // }




let button = d3.select("#button-location")
    .on("click", makeBlob)
    // .on("click", makeBlob)


