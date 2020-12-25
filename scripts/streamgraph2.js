/////////////////////////////////
// Declare any variables that need to be Global, ie, accessible outside of any particular functions.
//////////////////////////////////
var colorScheme = ["#4f0b56","#482a70","#41498a","#3287bd","#4da4b1","#67c2a5","#8acda4","#acd7a3","#c8e19e","#e4ea99","#f7eda9","#fcde89","#ffc28a","#e5ccf5", /*"#eeb4d1",*/"#f79cac","#ae3a7d","#890965","#760a60","#620a5b","#420f4e"];
var gageSites = [];

// I'm also going to declare a few timing variables for the animation
var frequency = 1 * 1000;  // 1 second
var dataMax = 31; // 31 days in the array
var flow =[]; // empty array, but makes this variable globally accessible once we push values to it.
var rawAPIdata = []; // empty array, but makes this variable globally accessible once we push values to it.
var dates = []; // an empty array of dates that we'll push info to

// We also are probably going to need these data structures later, so I'm just gonna declare them here for funsies.
var HUCInfo = [  // this is an array of objects
    {no:"01",id:"huc01", name:"New England Region"},
    {no:"02",id:"huc02", name:"Mid Atlantic Region"},
    {no:"03",id:"huc03", name:"South Atlantic-Gulf Region"},
    {no:"04",id:"huc04", name:"Great Lakes Region"},
    {no:"05",id:"huc05", name:"Ohio Region"},
    {no:"06",id:"huc06", name:"Tennessee Region"},
    {no:"07",id:"huc07", name:"Upper Mississippi Region"},
    {no:"08",id:"huc08", name:"Lower Mississippi"},
    {no:"09",id:"huc09", name:"Souris-Red-Rainy Region"},
    {no:"10",id:"huc10", name:"Missouri Region"},
    {no:"11",id:"huc11", name:"Arkansas-White-Red Region"},
    {no:"12",id:"huc12", name:"Texas-Gulf Region"},
    {no:"13",id:"huc13", name:"Rio Grande Region"},
    {no:"14",id:"huc14", name:"Upper Colorado Region"},
    {no:"15",id:"huc15", name:"Lower Colorado Region"},
    {no:"16",id:"huc16", name:"Great Basin Region"},
    {no:"17",id:"huc17", name:"Pacific Northwest Region"},
    {no:"18",id:"huc18", name:"California Region"},
    {no:"19",id:"huc19", name:"Alaska Region"},
    {no:"20",id:"huc20", name:"Hawaii Region"},
    {no:"21",id:"huc21", name:"Carribbean-Puerto Rico Region"}
];

// For the SVG
var width = window.innerWidth;
var height = d3.min([window.innerHeight, 1000])

// Append an svg dynamically to the div, so it gets resized on each button push
var svg = d3.select("#streamgraph")
    .append("svg")
    .classed("streamgraph-svg","true")
    .attr("width", width)
    .attr("height", height)
    .append("g");

/////////////////////////////////
// Reusable Functions we'll want to use in more than one function
//////////////////////////////////

// Function to get a new date a certain number of days from another date
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
// Get Date Array
//////////////////////////////////
var birthday = new Date(document.getElementById("birthdate").value);
var allDates = [];
function getDates(birthdayObj, length) {
    var startingDate = addDays(birthdayObj,-15);
    for (i=0; i<dataMax; i++) {
        var this_date = addDays(birthdayObj,(-15+i));
        allDates.push(this_date);
    };
}
getDates(birthday, dataMax);

/////////////////////////////////
// Compile API call
//////////////////////////////////
var paramCode = '00060'; // discharge in cubic feet per second
var emptyAPI = "https://waterservices.usgs.gov/nwis/dv/?format=json";
var urlStartDate = "&startDT=" + getYYYYMMDD(allDates[0]); // this attaches the start date in YYYY-MM-DD
var urlEndDate = "&endDT=" + getYYYYMMDD(allDates[allDates.length-1]); // this attaches the end date in YYYY-MM-DD
var urlStatCD = "&statCd=00003" // 00003 means "mean" values
var urlParam = "&PARAMETERcD=" + paramCode; // we declared above to only want discharge


/////////////////////////////////
// Read in Promises
//////////////////////////////////


var promises = [    
    d3.csv("data/ref_gages.csv")
]

Promise.all(promises).then(function(data) {
    var gages = data[0];
    

    var gageSites = gages.map(function(g) { return g.site_no; });
   
    return gageSites;
}).then(function(gageSites){  // Compile the API Call
    // Compile the array of gage sites into the url for the API
    var urlSites = "&sites=" + gageSites; // this attaches the array of site numbers
    // Compile the URL
    sitey = emptyAPI + urlSites + urlStartDate + urlEndDate + urlStatCD + urlParam;
    console.log(sitey, "sitey")
    var rawData = [];
    d3.json(sitey, function(error, apiData){ 
        console.log(apiData, "api call")
        rawData.push(apiData);
    });

    return rawData; // THIS IS WHAT GETS PASSED INTO THE UPDATE
    
}).then(function(updates) {  // THIS IS THE UPDATED DRAW

    // Update Chart
    console.log(updates,"this is what got passed to the second promise")
})

// d3.csv("data/ref_gages.csv", function(gages) { 
        
//     // Get list of site numbers to add to the url.  We can use the .map() function!
//     var gageSiteNos = gages.map(function(g) { return g.site_no; });
//     gageSites.push(gageSiteNos);
    
// });



/////////////////////////////////
// Create as single function for calling the API and drawing the updated chart
//////////////////////////////////

function fetchData() {
    // console.log(gageSites, "sites");


}