
/////////////////////////////////
// Declare any variables that need to be Global, ie, accessible outside of any particular functions.
//////////////////////////////////

var emptyAPI = "https://waterservices.usgs.gov/nwis/dv/?format=json";
var start = '';
var startDate = '';
var end = '';
var endDate = '';
var paramCode = '00060'; // discharge in cubic feet per second
var colorScheme = ["#4f0b56","#482a70","#41498a","#3287bd","#4da4b1","#67c2a5","#8acda4","#acd7a3","#c8e19e","#e4ea99","#f7eda9","#fcde89","#ffc28a","#e5ccf5", /*"#eeb4d1",*/"#f79cac","#ae3a7d","#890965","#760a60","#620a5b","#420f4e"];
var gageSiteNos = [];

// I'm also going to declare a few timing variables for the animation
var frequency = 1 * 1000;  // 1 second
var dataMax = 31; // 31 days in the array
var flow =[]; // empty array, but makes this variable globally accessible once we push values to it.
var rawAPIdata = []; // empty array, but makes this variable globally accessible once we push values to it.
var dates = []; // an empty array of dates that we'll push info to

// Prompts for the date input 
var prompts = [
    "What about a famous date?", 
    "What is your best friend's birthday?",
    "The summer of 1988 brought a country-wide drought.  Try a date some time in July.",
    "Try during Hurricane Katrina - August 2004",
    "Do you have a pet? Try their birthday date.",
    "Try Black Sunday, April 14th, 1935 - the worst dust storm of the Dust Bowl", 
    "The Mississippi River's worst flood ever started in May 1993 - try that.",
    "What about the huge floods in February and March of 2019?"
];

// shuffle the prompt array on each refresh of the page
function shuffleArray(array) {  
    let counter = array.length;
    // While there are elements in the array
    while (counter > 0) {
        // Pick a random index
        let index = Math.floor(Math.random() * counter);
        // Decrease counter by 1
        counter--;
        // And swap the last element with it
        let temp = array[counter];
        array[counter] = array[index];
        array[index] = temp;
    }
    return array;
}
shuffleArray(prompts);

var promptIndex = 0; 


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
var margin = {top: 20, right: 50, bottom: 0, left: 50}; // A wild OBJECT appears!  Notice the curly braces which gives you the clue.
var width = window.innerWidth;
var height = d3.min([window.innerHeight, 1000]) - margin.top - margin.bottom;

// Append an svg dynamically to the div, so it gets resized on each button push
var svg = d3.select("#streamgraph")
    .append("svg")
    .classed("streamgraph-svg","true")
    .attr("width", width)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(0," + margin.top + ")");

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

// Create a reusable function to collect all timeseries values and put them in their respective HUC array
function getHUCArray(hucArray, huc_no, timeseries) {
    timeseries.forEach(function(gage) {  // Another forEach loop, since timeseries is still an array
        //console.log("8ish.This gage is", gage);
        var this_huc = gage.huc02; // see what HUC 2 we're dealing with for each gage in the loop
        //console.log("8ish. This gage's HUC2 is", this_huc);
        var this_timeseries = gage.values[0].value; // grab the timeseries too
        //console.log("8ish. This gage's timeseries is", this_timeseries);
        var this_data = this_timeseries.map(function(v) {  // We use the map method to pull out 
            //console.log("8ish. 'v' is each of the 31 measurements in this timeseries that we're dealing with in this iteration of the loop. 'v' is an object.",v);
            if(this_huc == huc_no) { // if the HUC code matches the one I provded in the beginning, then it's good!
                v.dateTime = v.dateTime.substring(0,10) // This takes the date of each measurement and just shortens it to a more readable format as YYYY-DD-MM without the time, which is meaningless
                hucArray.push(v); // This takes each gage's timeseries (an object) and push it as another item in the array we've selected based on the HUC 2 code.
            }                      
        }); 
    });
};

// Make a reusable function that aggregates flow at the huc2 level
function getTotalFlow(hucArray, hucIDstring, allDates, birthdayFlow) {
    if (hucArray.length >= 1) { // This starts the loop only if there are objects in the array to sum.  If there were no measurements in this HUC 2, then it doesn't break, it just will keep the discharge measurement for that day and HUC in birthdayFlow array as 0.
        for (var i = 0; i <= allDates.length-1; i++) {
            // in the first step, allDates[0] is YYYY-MM-DD of start date
            
            var todaysMeasurements = hucArray.filter(function(measurement) { // doing only HUC01 array
                return measurement.dateTime === allDates[i];
            })
            var flows = todaysMeasurements.map(function(flows) {
                return +flows.value;                        
            })
            
            var totalFlow = Math.floor(flows.reduce(function(accumulator,flow) {
                return accumulator + flow;
            }))
            
            // console.log(birthdayFlow[i][property], "this")
            birthdayFlow[i][hucIDstring] = totalFlow; // This assigns the aggregated flow to the particular day in the array (birthdayFlow[i]) which has a property with the same name as the hucArray.  There's probably a more elegant way to do this, but this [hucIDstring] bracket notation needs a string so whatever!
        }
    }
};  




/////////////////////////////////
// Fetch and Use data
//////////////////////////////////

// make one function that gets called when the button gets pushed

function fetchData() { // no arguments because as part of the function, we'll select the value of whatever's in the input

    
    /////////////////////////////////
    // 1. Clear any variables we need (that might have data stored from a previous click)
    ///////////////////////////////// 


    // Declare a bunch of variables so they exist, but don't give them any values. This overwrites any pre-existing data that was there from the last time this function ran.
    var birthday = ''; // will be in Javascript date format
    start = ''; // will be in Javascript date format. These have already been declared, but we should clear them in case this is the second time the data are being grabbed.
    end = ''; // will be in Javascript date format
    startDate = ''; // will be converted to Long String
    endDate = ''; // will be converted to Long String
    var allDates = []; // will be an ARRAY of the dates, 
    var sitey = ""; // the final, filled-in API query
    var birthdayFlow = []; // will be an ARRAY, where each 
    var timeseries = [];

    /////////////////////////////////
    // 2. Get Date from document and convert it to what the code needs
    //////////////////////////////////   
    
    // Grab the value input by the user and assign it to the variable "birthday", converting it to a date object in the process
    birthday = new Date(document.getElementById("birthdate").value); 
   
    // Let's get a month worth of dates to pull! Make dates for 15 days before and after birthday
    birthday = addDays(birthday, 1); // need to adjust by 1 for some reason
    start = addDays(birthday, - 15);
    end = addDays(birthday, 15);       

    
    // Now apply that function to the start and end dates
    startDate = getYYYYMMDD(start);
    endDate = getYYYYMMDD(end);


    /////////////////////////////////
    // 3. Pre-make a data structure that will plug nicely into the streamgraph.
    //////////////////////////////////

    // While we're at it, let's make an array of all the dates we're going to pull data for!  We won't need it for the actual API call, but we will need this array for plotting a streamgraph
    allDates = [
        getYYYYMMDD(start), 
        getYYYYMMDD(addDays(start,1)), 
        getYYYYMMDD(addDays(start,2)), 
        getYYYYMMDD(addDays(start,3)), 
        getYYYYMMDD(addDays(start,4)), 
        getYYYYMMDD(addDays(start,5)), 
        getYYYYMMDD(addDays(start,6)), 
        getYYYYMMDD(addDays(start,7)), 
        getYYYYMMDD(addDays(start,8)), 
        getYYYYMMDD(addDays(start,9)), 
        getYYYYMMDD(addDays(start,10)), 
        getYYYYMMDD(addDays(start,11)), 
        getYYYYMMDD(addDays(start,12)), 
        getYYYYMMDD(addDays(start,13)), 
        getYYYYMMDD(addDays(start,14)), 
        getYYYYMMDD(birthday), 
        getYYYYMMDD(addDays(end,-14)), 
        getYYYYMMDD(addDays(end,-13)), 
        getYYYYMMDD(addDays(end,-12)), 
        getYYYYMMDD(addDays(end,-11)), 
        getYYYYMMDD(addDays(end,-10)), 
        getYYYYMMDD(addDays(end,-9)), 
        getYYYYMMDD(addDays(end,-8)), 
        getYYYYMMDD(addDays(end,-7)), 
        getYYYYMMDD(addDays(end,-6)), 
        getYYYYMMDD(addDays(end,-5)), 
        getYYYYMMDD(addDays(end,-4)), 
        getYYYYMMDD(addDays(end,-3)), 
        getYYYYMMDD(addDays(end,-2)), 
        getYYYYMMDD(addDays(end,-1)), 
        getYYYYMMDD(end)
    ];
   
    // We've already declared birthdayFlow above, and made it an empty array. This populates it as an array of objects, with properties that we can now call on later
    // I am not smart enough to come up with this on my own!  I just looked at a streamgraph example in d3, console.logged the data that fed it, and it was in this structure.
    // So this is just reverse engineering data that we have to fit into an existing thing that works. Maybe not the most elegant way to do it. 
    birthdayFlow = [
        {dateFull:start, date:allDates[0], huc01:0,huc02:0,huc03:0,huc04:0,huc05:0,huc06:0,huc07:0,huc08:0,huc09:0,huc10:0,huc11:0,huc12:0,huc13:0,huc14:0,huc15:0,huc16:0,huc17:0,huc18:0,huc19:0,huc20:0,huc21:0},
        {dateFull:addDays(start,1), date:allDates[1], huc01:0,huc02:0,huc03:0,huc04:0,huc05:0,huc06:0,huc07:0,huc08:0,huc09:0,huc10:0,huc11:0,huc12:0,huc13:0,huc14:0,huc15:0,huc16:0,huc17:0,huc18:0,huc19:0,huc20:0,huc21:0},
        {dateFull:addDays(start,2), date:allDates[2], huc01:0,huc02:0,huc03:0,huc04:0,huc05:0,huc06:0,huc07:0,huc08:0,huc09:0,huc10:0,huc11:0,huc12:0,huc13:0,huc14:0,huc15:0,huc16:0,huc17:0,huc18:0,huc19:0,huc20:0,huc21:0},
        {dateFull:addDays(start,3), date:allDates[3], huc01:0,huc02:0,huc03:0,huc04:0,huc05:0,huc06:0,huc07:0,huc08:0,huc09:0,huc10:0,huc11:0,huc12:0,huc13:0,huc14:0,huc15:0,huc16:0,huc17:0,huc18:0,huc19:0,huc20:0,huc21:0},
        {dateFull:addDays(start,4), date:allDates[4], huc01:0,huc02:0,huc03:0,huc04:0,huc05:0,huc06:0,huc07:0,huc08:0,huc09:0,huc10:0,huc11:0,huc12:0,huc13:0,huc14:0,huc15:0,huc16:0,huc17:0,huc18:0,huc19:0,huc20:0,huc21:0},
        {dateFull:addDays(start,5), date:allDates[5], huc01:0,huc02:0,huc03:0,huc04:0,huc05:0,huc06:0,huc07:0,huc08:0,huc09:0,huc10:0,huc11:0,huc12:0,huc13:0,huc14:0,huc15:0,huc16:0,huc17:0,huc18:0,huc19:0,huc20:0,huc21:0},
        {dateFull:addDays(start,6), date:allDates[6], huc01:0,huc02:0,huc03:0,huc04:0,huc05:0,huc06:0,huc07:0,huc08:0,huc09:0,huc10:0,huc11:0,huc12:0,huc13:0,huc14:0,huc15:0,huc16:0,huc17:0,huc18:0,huc19:0,huc20:0,huc21:0},
        {dateFull:addDays(start,7), date:allDates[7], huc01:0,huc02:0,huc03:0,huc04:0,huc05:0,huc06:0,huc07:0,huc08:0,huc09:0,huc10:0,huc11:0,huc12:0,huc13:0,huc14:0,huc15:0,huc16:0,huc17:0,huc18:0,huc19:0,huc20:0,huc21:0},
        {dateFull:addDays(start,8), date:allDates[8], huc01:0,huc02:0,huc03:0,huc04:0,huc05:0,huc06:0,huc07:0,huc08:0,huc09:0,huc10:0,huc11:0,huc12:0,huc13:0,huc14:0,huc15:0,huc16:0,huc17:0,huc18:0,huc19:0,huc20:0,huc21:0},
        {dateFull:addDays(start,9), date:allDates[9], huc01:0,huc02:0,huc03:0,huc04:0,huc05:0,huc06:0,huc07:0,huc08:0,huc09:0,huc10:0,huc11:0,huc12:0,huc13:0,huc14:0,huc15:0,huc16:0,huc17:0,huc18:0,huc19:0,huc20:0,huc21:0},
        {dateFull:addDays(start,10), date:allDates[10], huc01:0,huc02:0,huc03:0,huc04:0,huc05:0,huc06:0,huc07:0,huc08:0,huc09:0,huc10:0,huc11:0,huc12:0,huc13:0,huc14:0,huc15:0,huc16:0,huc17:0,huc18:0,huc19:0,huc20:0,huc21:0},
        {dateFull:addDays(start,11), date:allDates[11], huc01:0,huc02:0,huc03:0,huc04:0,huc05:0,huc06:0,huc07:0,huc08:0,huc09:0,huc10:0,huc11:0,huc12:0,huc13:0,huc14:0,huc15:0,huc16:0,huc17:0,huc18:0,huc19:0,huc20:0,huc21:0},
        {dateFull:addDays(start,12), date:allDates[12], huc01:0,huc02:0,huc03:0,huc04:0,huc05:0,huc06:0,huc07:0,huc08:0,huc09:0,huc10:0,huc11:0,huc12:0,huc13:0,huc14:0,huc15:0,huc16:0,huc17:0,huc18:0,huc19:0,huc20:0,huc21:0},
        {dateFull:addDays(start,13), date:allDates[13], huc01:0,huc02:0,huc03:0,huc04:0,huc05:0,huc06:0,huc07:0,huc08:0,huc09:0,huc10:0,huc11:0,huc12:0,huc13:0,huc14:0,huc15:0,huc16:0,huc17:0,huc18:0,huc19:0,huc20:0,huc21:0},
        {dateFull:addDays(start,14), date:allDates[14], huc01:0,huc02:0,huc03:0,huc04:0,huc05:0,huc06:0,huc07:0,huc08:0,huc09:0,huc10:0,huc11:0,huc12:0,huc13:0,huc14:0,huc15:0,huc16:0,huc17:0,huc18:0,huc19:0,huc20:0,huc21:0},
        {dateFull:birthday, date:allDates[15], huc01:0,huc02:0,huc03:0,huc04:0,huc05:0,huc06:0,huc07:0,huc08:0,huc09:0,huc10:0,huc11:0,huc12:0,huc13:0,huc14:0,huc15:0,huc16:0,huc17:0,huc18:0,huc19:0,huc20:0,huc21:0},
        {dateFull:addDays(end,-14), date:allDates[16], huc01:0,huc02:0,huc03:0,huc04:0,huc05:0,huc06:0,huc07:0,huc08:0,huc09:0,huc10:0,huc11:0,huc12:0,huc13:0,huc14:0,huc15:0,huc16:0,huc17:0,huc18:0,huc19:0,huc20:0,huc21:0},
        {dateFull:addDays(end,-13), date:allDates[17], huc01:0,huc02:0,huc03:0,huc04:0,huc05:0,huc06:0,huc07:0,huc08:0,huc09:0,huc10:0,huc11:0,huc12:0,huc13:0,huc14:0,huc15:0,huc16:0,huc17:0,huc18:0,huc19:0,huc20:0,huc21:0},
        {dateFull:addDays(end,-12), date:allDates[18], huc01:0,huc02:0,huc03:0,huc04:0,huc05:0,huc06:0,huc07:0,huc08:0,huc09:0,huc10:0,huc11:0,huc12:0,huc13:0,huc14:0,huc15:0,huc16:0,huc17:0,huc18:0,huc19:0,huc20:0,huc21:0},
        {dateFull:addDays(end,-11), date:allDates[19], huc01:0,huc02:0,huc03:0,huc04:0,huc05:0,huc06:0,huc07:0,huc08:0,huc09:0,huc10:0,huc11:0,huc12:0,huc13:0,huc14:0,huc15:0,huc16:0,huc17:0,huc18:0,huc19:0,huc20:0,huc21:0},
        {dateFull:addDays(end,-10), date:allDates[20], huc01:0,huc02:0,huc03:0,huc04:0,huc05:0,huc06:0,huc07:0,huc08:0,huc09:0,huc10:0,huc11:0,huc12:0,huc13:0,huc14:0,huc15:0,huc16:0,huc17:0,huc18:0,huc19:0,huc20:0,huc21:0},
        {dateFull:addDays(end,-9), date:allDates[21], huc01:0,huc02:0,huc03:0,huc04:0,huc05:0,huc06:0,huc07:0,huc08:0,huc09:0,huc10:0,huc11:0,huc12:0,huc13:0,huc14:0,huc15:0,huc16:0,huc17:0,huc18:0,huc19:0,huc20:0,huc21:0},
        {dateFull:addDays(end,-8), date:allDates[22], huc01:0,huc02:0,huc03:0,huc04:0,huc05:0,huc06:0,huc07:0,huc08:0,huc09:0,huc10:0,huc11:0,huc12:0,huc13:0,huc14:0,huc15:0,huc16:0,huc17:0,huc18:0,huc19:0,huc20:0,huc21:0},
        {dateFull:addDays(end,-7), date:allDates[23], huc01:0,huc02:0,huc03:0,huc04:0,huc05:0,huc06:0,huc07:0,huc08:0,huc09:0,huc10:0,huc11:0,huc12:0,huc13:0,huc14:0,huc15:0,huc16:0,huc17:0,huc18:0,huc19:0,huc20:0,huc21:0},
        {dateFull:addDays(end,-6), date:allDates[24], huc01:0,huc02:0,huc03:0,huc04:0,huc05:0,huc06:0,huc07:0,huc08:0,huc09:0,huc10:0,huc11:0,huc12:0,huc13:0,huc14:0,huc15:0,huc16:0,huc17:0,huc18:0,huc19:0,huc20:0,huc21:0},
        {dateFull:addDays(end,-5), date:allDates[25], huc01:0,huc02:0,huc03:0,huc04:0,huc05:0,huc06:0,huc07:0,huc08:0,huc09:0,huc10:0,huc11:0,huc12:0,huc13:0,huc14:0,huc15:0,huc16:0,huc17:0,huc18:0,huc19:0,huc20:0,huc21:0},
        {dateFull:addDays(end,-4), date:allDates[26], huc01:0,huc02:0,huc03:0,huc04:0,huc05:0,huc06:0,huc07:0,huc08:0,huc09:0,huc10:0,huc11:0,huc12:0,huc13:0,huc14:0,huc15:0,huc16:0,huc17:0,huc18:0,huc19:0,huc20:0,huc21:0},
        {dateFull:addDays(end,-3), date:allDates[27], huc01:0,huc02:0,huc03:0,huc04:0,huc05:0,huc06:0,huc07:0,huc08:0,huc09:0,huc10:0,huc11:0,huc12:0,huc13:0,huc14:0,huc15:0,huc16:0,huc17:0,huc18:0,huc19:0,huc20:0,huc21:0},
        {dateFull:addDays(end,-2), date:allDates[28], huc01:0,huc02:0,huc03:0,huc04:0,huc05:0,huc06:0,huc07:0,huc08:0,huc09:0,huc10:0,huc11:0,huc12:0,huc13:0,huc14:0,huc15:0,huc16:0,huc17:0,huc18:0,huc19:0,huc20:0,huc21:0},
        {dateFull:addDays(end,-1), date:allDates[29], huc01:0,huc02:0,huc03:0,huc04:0,huc05:0,huc06:0,huc07:0,huc08:0,huc09:0,huc10:0,huc11:0,huc12:0,huc13:0,huc14:0,huc15:0,huc16:0,huc17:0,huc18:0,huc19:0,huc20:0,huc21:0},
        {dateFull:end, date:allDates[30], huc01:0,huc02:0,huc03:0,huc04:0,huc05:0,huc06:0,huc07:0,huc08:0,huc09:0,huc10:0,huc11:0,huc12:0,huc13:0,huc14:0,huc15:0,huc16:0,huc17:0,huc18:0,huc19:0,huc20:0,huc21:0}
    ];


    /////////////////////////////////
    // 4. Read a CSV to get a list of gage sites
    //////////////////////////////////
    d3.csv("data/ref_gages.csv", function(gages) { 
        
        // Get list of site numbers to add to the url.  We can use the .map() function!
        var gageSites = gages.map(function(g) { return g.site_no; });
        gageSiteNos.push(gageSites);
        // This is exactly what we need for NWIS, which says it can pull data for multiple gages as long as you provide a list of sites...separated by a comma! Which is how an array is formatted!!!
    
        /////////////////////////////////
        // 5. Compile all the chunks of the NWIS API url
        //////////////////////////////////

        //var urlCounty = "&countyCd=" + countyCd;
        var urlSites = "&sites=" + gageSites; // this attaches the array of site numbers
        var urlStartDate = "&startDT=" + startDate; // this attaches the start date in YYYY-MM-DD
        var urlEndDate = "&endDT=" + endDate; // this attaches the end date in YYYY-MM-DD
        var urlStatCD = "&statCd=00003" // 00003 means "mean" values
        var urlParam = "&PARAMETERcD=" + paramCode; // we declared above to only want discharge
        //var urlSiteType = "&siteType=" + siteType;
        //var urlSiteStatus = "&siteStatus=" + siteStatus;

        // Compile the URL
        sitey = emptyAPI + urlSites + urlStartDate + urlEndDate + urlStatCD + urlParam;
        /////////////////////////////////
        // 6. Call the API and get the actual discharge data!
        //////////////////////////////////
        d3.json(sitey, function(error, apiData) { 
           
            // Notice the extremely nested nature of this dataset. Objects and Arrays all the way down. 
            // I'll push this data to a globally accesible variable so we can play with the raw data elsewhere on the page.
            rawAPIdata.push(apiData);
            // console.log(apiData,"api")

            // let's just grab the timeseries out of the data, rather than all the extra metadata
            //timeseries = apiData; // EXERCISE : let's go get just the timeseries. Use the console to explore the data structure and fill out this line. Answer is below. 
            timeseries = apiData.value.timeSeries;
            
            /////////////////////////////////
            // 7. Do some data wrangling - push out any bad data
            //////////////////////////////////
            var badGages = []; // make empty array to populate with a list of gages with incomplete data
            
            // forEach!!! This is an array method that is essentially a for-loop, but fancier.
            timeseries.forEach(function(gage, index) { // This translates to: "Take the array of objects called timeseries. Go item-by-item in the array.  Each item we'll call 'gage' and keep track of the index. "
                var array = gage.values[0].value;  // Each item in the array (ie, 'gage') is actually nested data.  As we go item-by-item, pull out just the array of timeseries values and assign that array to the variable 'array'.  Ignore the rest of the metadata.
                //console.log("7a. This is each array we're dealing with as we go gage-by-gage in the timeseries", array);
                if(array.length !== 31 ) { // Check to see if there aren't exactly 31 measurements.  If not...
                    badGages.push(gage.name); // ... take the gage name of this particular gage, and push it into the array of "bad gages"...
                    timeseries.splice(index, 1); // ... then go back to the original timeseries and remove 1 item from that array, specifically the item with this index. They will always match!
                }
                
                //console.log("7a. While we're here, let's grab the HUC code. Where is it in this nested dataset?", gage);
                // gage.huc02 = gage; // EXERCISE : let's go get the huc code from this gage we're dealing with. Use the console to explore the data structure and fill out this line. Answer is below.
                gage.huc02 = gage.sourceInfo.siteProperty[1].value.slice(0,2); // And while we're here, go ahead and add a property that lists the HUC02 for each gage by slicing the first two numbers from the huc_cd
            });
           
            /////////////////////////////////
            // 8. More data wrangling - sort all the timeseries values into arrays grouped by HUC2.
            //////////////////////////////////
        
            var huc01 = []; // These are empty arrays
            var huc02 = [];
            var huc03 = [];
            var huc04 = [];
            var huc05 = [];
            var huc06 = [];
            var huc07 = [];
            var huc08 = [];
            var huc09 = [];
            var huc10 = [];
            var huc11 = [];
            var huc12 = [];
            var huc13 = [];
            var huc14 = [];
            var huc15 = [];
            var huc16 = [];
            var huc17 = [];
            var huc18 = [];
            var huc19 = [];
            var huc20 = [];
            var huc21 = [];

            // Get huc arrays for all hucs
            getHUCArray(huc01,01, timeseries);
            getHUCArray(huc02,02, timeseries);
            getHUCArray(huc03,03, timeseries);
            getHUCArray(huc04,04, timeseries);
            getHUCArray(huc05,05, timeseries);
            getHUCArray(huc06,06, timeseries);
            getHUCArray(huc07,07, timeseries);
            getHUCArray(huc08,08, timeseries);
            getHUCArray(huc09,09, timeseries);
            getHUCArray(huc10,10, timeseries);
            getHUCArray(huc11,11, timeseries);
            getHUCArray(huc12,12, timeseries);
            getHUCArray(huc13,13, timeseries);
            getHUCArray(huc14,14, timeseries);
            getHUCArray(huc15,15, timeseries);
            getHUCArray(huc16,16, timeseries);
            getHUCArray(huc17,17, timeseries);
            getHUCArray(huc18,18, timeseries);
            getHUCArray(huc19,19, timeseries);
            getHUCArray(huc20,20, timeseries);
            getHUCArray(huc21,21, timeseries);

            /////////////////////////////////
            // 9. More data wrangling - aggregate all the measurements so we get a single timeseries for the HUC
            //////////////////////////////////
            getTotalFlow(huc01,"huc01", allDates, birthdayFlow);
            getTotalFlow(huc02,"huc02", allDates, birthdayFlow);
            getTotalFlow(huc03,"huc03", allDates, birthdayFlow);
            getTotalFlow(huc04,"huc04", allDates, birthdayFlow);
            getTotalFlow(huc05,"huc05", allDates, birthdayFlow);
            getTotalFlow(huc06,"huc06", allDates, birthdayFlow);
            getTotalFlow(huc07,"huc07", allDates, birthdayFlow);
            getTotalFlow(huc08,"huc08", allDates, birthdayFlow);
            getTotalFlow(huc09,"huc09", allDates, birthdayFlow);
            getTotalFlow(huc10,"huc10", allDates, birthdayFlow);
            getTotalFlow(huc11,"huc11", allDates, birthdayFlow);
            getTotalFlow(huc12,"huc12", allDates, birthdayFlow);
            getTotalFlow(huc13,"huc13", allDates, birthdayFlow);
            getTotalFlow(huc14,"huc14", allDates, birthdayFlow);
            getTotalFlow(huc15,"huc15", allDates, birthdayFlow);
            getTotalFlow(huc16,"huc16", allDates, birthdayFlow);
            getTotalFlow(huc17,"huc17", allDates, birthdayFlow);
            getTotalFlow(huc18,"huc18", allDates, birthdayFlow);
            getTotalFlow(huc19,"huc19", allDates, birthdayFlow);
            getTotalFlow(huc20,"huc20", allDates, birthdayFlow);
            getTotalFlow(huc21,"huc21", allDates, birthdayFlow);

            // console.log(birthdayFlow)
            /////////////////////////////////
            // 9. Draw!
            //////////////////////////////////

            d3.select("#streamgraph").style("display","block"); // first make the block for the streamgraph appear in the DOM
            
            /////////////////////////////////
            // 1. Add a property called 'columns' upon which the streamgraph data will be stacked
            //////////////////////////////////

            // So if an array is...just a special kind of object...can we add properties to it? YES WE CAN!!! 
            birthdayFlow.columns = [
                "huc01",
                "huc02",
                "huc03",
                "huc04",
                "huc05",
                "huc06",
                "huc07",
                "huc08",
                "huc09",
                "huc10",
                "huc11",
                "huc12",
                "huc13",
                "huc14",
                "huc15",
                "huc16",
                "huc17",
                "huc18",
                "huc19",
                "huc20",
                "huc21"
            ];
            // I would never have figured out that I needed this on my own, but I noticed in the streamgraph d3 example that the data has a property called columns upon which the data is later stacked.
            // So this step ^ is just reverse engineering.

            /////////////////////////////////
            // 2. Draw Chart []
            //////////////////////////////////
            // Unfortunately I don't have enter-update-exit down pat, so I'm just gonna draw this once.

            // List of groups = header of the csv files
            var keys = birthdayFlow.columns
            // Add X axis
            var x = d3.scaleTime()
                .domain([start, end]) // set the beginning and end by accessing the values stored in the global 'dates' variable. It needs the javascript object format, not the YYYY-MM-DD format we made elsewhere
                .range([0,width]); // give us 200px of wiggle room during the animation for us to push new data by the time the new junction arrives
            
            // append a "group" to the svg to contain the ticks, and then draw them
            svg.append("g")
                .attr("class","tick-label")
                .attr("transform", "translate(0," + height*0.8 + ")")
                .call(d3.axisBottom(x)
                    .tickSize(-height*.1)
                    .tickFormat(d3.timeFormat("%B %d, %Y"))
                    .tickValues([birthday])) // this needs to dynamically update
                .select(".domain").remove()

            // Add Y axis
            var y = d3.scaleLinear()
                .domain([-300000, 300000]) // we could definitely calculate this dynamically with d3.max, but I'm being lazy
                .range([height,0]);
        
            // Declare a color palette
            var color = d3.scaleOrdinal()
                .domain(keys)
                .range(colorScheme);
        
            // Now D3 is doing something weird called Stacking that we need for streamgraphs. Don't ask me about it.
            var stackedData = d3.stack()
                .offset(d3.stackOffsetSilhouette)
                .keys(keys)
                (birthdayFlow)
        
            // Reusable area generator - we are getting closer to drawing a thing! Don't know much about this part tho.
            var area = d3.area()
                .x(function(d) { 
                    // console.log("What even is d?", d)
                    return x(d.data.dateFull); 
                })
                .y0(function(d) { return y(d[0]); })
                .y1(function(d) { return y(d[1]); })
                .curve(d3.curveMonotoneX)




            /////////////////////////////////
            // 3. Make some variables that are actually just functions which can be called when we draw the svg
            //////////////////////////////////

            // create a lookup function
            function getHUCname(hucIDnum){
                var filtered = HUCInfo.filter(function(huc) { // take the HUCInfo array of objects, and filter items. We're using the argument 'huc' to represent the fact that each item in the array is a whole huc.  We'll store the one item we get in the variable 'filtered'
                    return huc.no === hucIDnum; // return only the ONE object in the array where the number (.no) matches the provided hucIDnum exactly
                })
                if(filtered.length == 1) { // checking to make sure that there's ONE thing in the variable 'filtered' variable
                    return filtered[0].name; // return the value in the ".name" property
                }
            }

            // create a tooltip
            var Tooltip = svg
                .append("text")
                .attr("x", 30)
                .attr("y", height*0.8 + 11)
                .attr("class", "tooltip")
                .style("opacity", 0)
                .style("z-index",100)

            // Three function that change the tooltip when user hover / move / leave a cell
            var mouseover = function(d) {
                Tooltip.style("opacity", 1)
                d3.selectAll(".flow").style("opacity", .2)
                d3.select(this)
                    .style("opacity", 1)
            }
            var mousemove = function(d,i) {
                grp = keys[i]
                Tooltip.text(getHUCname(grp.slice(3,5)))
            }
            var mouseleave = function(d) {
                Tooltip.style("opacity", 0)
                d3.selectAll(".flow").style("opacity", 1).style("stroke", "none")
            }
            


            /////////////////////////////////
            // 4. Drumroll....let's draw the svg!
            //////////////////////////////////
                
            // Draw the areas
            svg
                .selectAll(".flow")
                .data(stackedData)
                .enter()
                .append("path")
                    .attr("class", "flow")
                    .style("fill", function(d) { return color(d.key); })
                    .attr("d", area)
                    .on("mouseover", mouseover)
                    .on("mousemove", mousemove)
                    .on("mouseleave", mouseleave);
        
            d3.selectAll(".flow")
                .transition()
                .duration(frequency)
                .ease(d3.easeExpOut)
                .attr("d",area)

            d3.selectAll(".tick-label")
                .transition()
                .duration(1) // very short duration
                .call(d3.axisBottom(x)
                    .tickSize(-height*.01)
                    .tickFormat(d3.timeFormat("%B %d, %Y"))
                    .tickValues([birthday]))
                    .select(".domain").remove()
        
            //Prompt Randomizer
            if (promptIndex == prompts.length-1) {
                promptIndex = 0;
            } else { promptIndex += 1; }           

            // Finally, when it's all done
            d3.select("#prompt").html(prompts[promptIndex]);
            d3.select("#go-button").html("See Another")
            d3.select("#historical-gallery").style("display", "block")

        // end the d3.json function
        });

    // end the d3.csv function
    });

// End fetchData() function
}



// function drawStreamgraph() { // again, no arguments because we've pushed the data to a globally scoped variable, "flow"
