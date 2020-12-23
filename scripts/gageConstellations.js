// For the SVG
var width = window.innerWidth;
var height = window.innerWidth; // make a square
var frequency = 1 * 1000;
var startingPoint = [40.046352, -76.30794] // Lancaster PA -- we'll eventually get this dynamically with the json

// first example polar scatter plot
//https://github.com/Tello-Wharton/Polar-Scatter-Plot


// Converts from degrees to radians.
function toRadians(degrees) {
    return degrees * Math.PI / 180;
};
   
// Converts from radians to degrees.
function toDegrees(radians) {
    return radians * 180 / Math.PI;
}   

// Reusable haversine and bearing formula
function distance(lat1, lon1, lat2, lon2, unit) {
    if ((lat1 == lat2) && (lon1 == lon2)) {
        return 0;
    } else {
        // start
        var startLat = toRadians(lat1);
        var startLng = toRadians(lon1);
        // destination
        var destLat = toRadians(lat2);
        var destLng = toRadians(lon2);

        // haversine
        var theta = lon1-lon2;
        var radtheta = Math.PI * theta/180;
        var dist = Math.sin(startLat) * Math.sin(destLat) + Math.cos(startLat) * Math.cos(destLat) * Math.cos(radtheta);
        if (dist > 1) {
            dist = 1;
        }
        dist = Math.acos(dist);
        dist = dist * 180/Math.PI;
        dist = dist * 60 * 1.1515;
        if (unit=="K") { dist = dist * 1.609344 }
        if (unit=="N") { dist = dist * 0.8684 }

        // bearing
        y = Math.sin(destLng - startLng) * Math.cos(destLat);
        x = Math.cos(startLat) * Math.sin(destLat) -
                Math.sin(startLat) * Math.cos(destLat) * Math.cos(destLng - startLng);
        brng = Math.atan2(y, x);
        brng = toDegrees(brng);


        return {"distance": dist, "bearing": (brng+360) % 360 };
    }
}

// Read in Data
d3.csv("data/hcdn_flow_scaled.csv", function(anomalies) { 
        
    var gages = d3.nest()
        .key(function(d) { return d.site_no; })
        .entries(anomalies);
    

    gages.forEach(function(gage) {
        gage.lat = gage.values[0].LAT_GAGE;
        gage.long = gage.values[0].LONG_GAGE;
        gage.huc = gage.values[0].HUC02;
        gage.dataYears = gage.values[0].years_all;
    });

    console.log(gages, "gages", distance(startingPoint[0],startingPoint[1],gages[202].lat,gages[202].long));





});

// Data
var points = [
    [200,	180],
    [200,	225],
    [210,	225],
    [210,	180],
    [200,	270],
    [220,	180],
    [230,	180],
    [240,	180],
    [250,	180],
    [260,	180],
    [210,	270],
    [220,	225],
    [270,	180],
    [230,	225],
    [240,	225],
    [280,	180],
    [290,	180],
    [300,	180]

];

var svg = d3.select("#constellation")
    .append("svg")
    .attr("width", 900)
    .attr("height", 900);

var centerX = 400;
var centerY = 400;
var radius = 400;
var angles = [0, 90, 180, 270];
var directions = ["East","North","West","South"];

var convertToDirection = d3.scaleOrdinal()
    .domain(angles)
    .range(directions);

for (var angle = 0; angle < 360; angle+=90){

    var theta = (angle * Math.PI)/180;

    svg.append("line")
        .attr("x1", centerX)
        .attr("y1", centerY)
        .attr("x2", centerX + radius * Math.cos(theta))
        .attr("y2", centerY + radius * Math.sin(theta))
        .style("stroke","#535154")
        .style("stroke-width","1");

    svg.append("text")
        .text(convertToDirection(angle))
        .attr("x",20)
        .attr("y",20)
        .attr("transform", "translate(700,370) rotate(-" + angle + " -300 30)") //rotate(-" + angle + " -300 30)
        .attr('fill', '#535154');

}

function drawConstellation() {

    points.forEach(function(point){

        svg.append("circle")
            .attr("class","point")
            .attr("cx", centerX + point[0] * Math.cos(point[1] * Math.PI/180))
            .attr("cy", centerY + point[0] * Math.sin(point[1] * Math.PI/180))
            .attr("r", 3)
            .style("stroke","#396AB1")
            .style("fill","#396AB1");
    
    });

}
// can add circles out here too
svg.append("circle")
    .attr("class","point")
    .attr("cx", centerX)
    .attr("cy", centerY)
    // .attr("cx", centerX)
    // .attr("cy", centerY)
    .attr("r", 3)
    .style("stroke","#fff")
    .style("fill","none");


// pick dataset
var dataIndex = 1;


// Declare button 
d3.select("#constellation").append("button")
    .text("change data")
    .on("click",drawConstellation())


// drawConstellation(points)