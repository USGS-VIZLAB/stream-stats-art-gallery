
/////////////////////////////////
// SETUP 
//////////////////////////////////

// Set Up Globals
const geocodeAPIURL = "https://maps.googleapis.com/maps/api/geocode/json?address="; // New Google API URL
const key = "&key=" + config.geocodeKey;
const nwisAPIURL = "https://waterservices.usgs.gov/nwis/dv/?format=json";
const paramCode = '00060'; // discharge in cubic feet per second
const colorScheme = ["#4f0b56","#482a70","#41498a","#3287bd","#4da4b1","#67c2a5","#8acda4","#acd7a3","#c8e19e","#e4ea99","#f7eda9","#fcde89","#ffc28a","#e5ccf5", /*"#eeb4d1",*/"#f79cac","#ae3a7d","#890965","#760a60","#620a5b","#420f4e"];

// Unique Blob SVG sizes
// var margin = {top: 30, right: 30, bottom: 30, left: 30};
// var width = 230;
// var height = 230;


var margin = { top: 50, right: 80, bottom: 50, left: 80 },
				width = Math.min(700, window.innerWidth / 4) - margin.left - margin.right,
				height = Math.min(width, window.innerHeight - margin.top - margin.bottom);



/////////////////////////////////
// Helper Functions
//////////////////////////////////

// calculating distance between geographic points
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


// Add Days
function addDays (date, daysToAdd) {
    var _24HoursInMilliseconds = 86400000; // conversion count
    return new Date(date.getTime() + daysToAdd * _24HoursInMilliseconds); // new Date() is Javascript's date object!
};

// Make a function that converts a date obejct YYYY-MM-DD format because that's what NWIS needs for the API call
function getYYYYMMDD(d0){
    var d = new Date(d0)
    return new Date(d.getTime() - d.getTimezoneOffset() * 60 * 1000).toISOString().split('T')[0]
}

/////////////////////////////////
// Function to fetch data and draw the blobs
//////////////////////////////////

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

    // get anomalies data
    let anomalies = [];
    await d3.csv("data/hcdn_flow_scaled.csv", function(year, index){
        anomalies.push(year);
    })
     
    // Get gages
    let gages = [];
    // now use this point on each gage
    await d3.csv("data/ref_gages.csv", function(gage, index){
        gage.originPoint = origin;
        gage.distanceToOrigin = distance(origin.lat, origin.long, gage.LAT_GAGE, gage.LONG_GAGE)
        gages.push(gage)
        
    })
    gages.sort((a,b) => (a.distanceToOrigin.distance > b.distanceToOrigin.distance) ? 1:-1)
    let closeGages = gages.slice(0,3); // get the closest 2 gage. Can increase to do more
    console.log(closeGages, "close gage") 

    
    // Compile data for NWIS API calls
    let birthday = new Date(document.getElementById("birthdate").value);
    let birthYear = birthday.getFullYear();
    let birthStart = birthYear + "-01-01"
    let birthEnd = birthYear + "-12-31"
    console.log(birthStart, "year")
    let flowMeasurements = []

    // Call NWIS for this year
    // await d3.json(sitey, function(nwis){
    //     console.log(nwis, "nwis")
    // })

    // Call NWIS for your birth year





    // Declare some scales and whatnot
    let radRatio = 1;
    let radiusScale = d3.scaleOrdinal()
        .domain([])
        .range([]);

    // // Draw SVG
    // var blobSVG = d3.select("#blobs")
    //     .selectAll("uniqueBlob")
    //     .data(closeGages)
    //     .enter()
    //     .append("svg")
    //         .attr()
    
    // Begin Test




    var data = [
        { name: 'Allocated budget',
            axes: [
                {axis: 'Sales', value: 42},
                {axis: 'Marketing', value: 20},
                {axis: 'Development', value: 60},
                {axis: 'Customer Support', value: 26},
                {axis: 'Information Technology', value: 35},
                {axis: 'Administration', value: 20}
            ],
        color: '#26AF32'
        },
        { name: 'Actual Spending',
            axes: [
                {axis: 'Sales', value: 50},
                {axis: 'Marketing', value: 45},
                {axis: 'Development', value: 20},
                {axis: 'Customer Support', value: 20},
                {axis: 'Information Technology', value: 25},
                {axis: 'Administration', value: 23}
            ],
        color: '#762712'
        },
        { name: 'Further Test',
            axes: [
                {axis: 'Sales', value: 32},
                {axis: 'Marketing', value: 62},
                {axis: 'Development', value: 35},
                {axis: 'Customer Support', value: 10},
                {axis: 'Information Technology', value: 20},
                {axis: 'Administration', value: 28}
            ],
        color: '#2a2fd4'
        }
    ];

console.log(data, 'fake data');

    //////////////////////////////////////////////////////////////
    ////// First example /////////////////////////////////////////
    ///// (not so much options) //////////////////////////////////
    //////////////////////////////////////////////////////////////
    var radarChartOptions = {
      w: 290,
      h: 350,
      margin: margin,
      levels: 5,
      roundStrokes: true,
        color: d3.scaleOrdinal().range(["#26AF32", "#762712", "#2a2fd4"]),
        format: '.0f'
    };

    // Draw the chart, get a reference the created svg element :
    let svg_radar1 = RadarChart("#blobs1", data, radarChartOptions);


    // End Test
}


/////////////////////////////////
// Activate makeBlob function on the button push
//////////////////////////////////

let button = d3.select("#button-location")
    .on("click", makeBlob)
    // .on("click", makeBlob)



/////////////////////////////////
// Scrap
//////////////////////////////////

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
// const getGages = d3.csv("data/ref_gages.csv").then(data => { return data; }).catch(err => console.log(err));


//
// const promises = [
//     d3.csv("data/ref_gages.csv"),
//     d3.csv("data/hcdn_flow_scaled.csv"), 

// ];


// Promise.all(promises).then(function(data) {
//     let gages = data[0];
//     let anomalies = data[1];
//     let origin = data[2];

//     console.log(anomalies, "anomalies")
// }).catch(err => console.log(err));




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
