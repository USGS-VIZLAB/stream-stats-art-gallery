

class Chart {
    
    constructor(opts) {
        // load in arguments from config object
        this.data = opts.data;
        this.element = opts.element;
        // create the chart
        this.draw();
    }
    
    draw() {
        // define width, height and margin
        this.width = this.element.offsetWidth;
        this.height = this.width / 2;
        this.margin = {
            top: 20,
            right: 75,
            bottom: 45,
            left: 50
        };

        // set up parent element and SVG
        this.element.innerHTML = '';
        const svg = d3.select(this.element).append('svg');
        svg.attr('width',  this.width);
        svg.attr('height', this.height);

        // we'll actually be appending to a <g> element
        this.plot = svg.append('g')
            .attr('transform',`translate(${this.margin.left},${this.margin.top})`);

        // create the other stuff
        this.createScales();
        this.addAxes();
        this.addLine();
    }
    
    createScales() {
        // shorthand to save typing later
        const m = this.margin;
        
        // calculate max and min for data
        const xExtent = d3.extent(this.data, d => d[0]);
        const yExtent = d3.extent(this.data, d => d[1]);

        // force zero baseline if all data points are positive
        if (yExtent[0] > 0) { yExtent[0] = 0; };

        this.xScale = d3.scaleTime()
            .range([0, this.width-m.right])
            .domain(xExtent);

        this.yScale = d3.scaleLinear()
            .range([this.height-(m.top+m.bottom), 0])
            .domain(yExtent);
    }

    addAxes() {
        const m = this.margin;

        // create and append axis elements
        // this is all pretty straightforward D3 stuff
        const xAxis = d3.axisBottom()
            .scale(this.xScale)
            .ticks(d3.timeMonth);

        const yAxis = d3.axisLeft()
            .scale(this.yScale)
            .tickFormat(d3.format("d"));

        this.plot.append("g")
            .attr("class", "x axis")
            .attr("transform", `translate(0, ${this.height-(m.top+m.bottom)})`)
            .call(xAxis);

        this.plot.append("g")
            .attr("class", "y axis")
            .call(yAxis)
    }
    
    addLine() {
        const line = d3.line()
            .x(d => this.xScale(d[0]))
            .y(d => this.yScale(d[1]));

        this.plot.append('path')
            // use data stored in `this`
            .datum(this.data)
            .classed('line',true)
            .attr('d',line)
            // set stroke to specified color, or default to red
            .style('stroke', this.lineColor || 'red');
    }
    
    // the following are "public methods"
    // which can be used by code outside of this file

    setColor(newColor) {
        this.plot.select('.line')
            .style('stroke', newColor);
        
        // store for use when redrawing
        this.lineColor = newColor;
    }

    setData(newData) {
        this.data = newData;

        // full redraw needed
        this.draw();
    }
}


const chart = new Chart({
    element: document.querySelector('.chart-container'),
    data: [
        [new Date(2016,0,1), 10],
        [new Date(2016,1,1), 70],
        [new Date(2016,2,1), 30],
        [new Date(2016,3,1), 10],
        [new Date(2016,4,1), 40]
    ]
});
// change line colour on click
d3.selectAll('button.color').on('click', function(){
    const color = d3.select(this).text().split(' ')[0];
    chart.setColor( color );
});
// change data on click to something randomly-generated
d3.selectAll('button.data').on('click', () => {
    chart.setData([
        [new Date(2016,0,1), Math.random()*100],
        [new Date(2016,1,1), Math.random()*100],
        [new Date(2016,2,1), Math.random()*100],
        [new Date(2016,3,1), Math.random()*100],
        [new Date(2016,4,1), Math.random()*100]
    ]);
});
// redraw chart on each resize
// in a real-world example, it might be worth ‘throttling’ this
// more info: http://sampsonblog.com/749/simple-throttle-function
d3.select(window).on('resize', () => chart.draw() );