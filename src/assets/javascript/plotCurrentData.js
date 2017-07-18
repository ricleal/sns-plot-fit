import * as d3 from 'd3';
import fd from './fitData';

export default {
    methods: {
        plotCurrentData: function (parameters) {

            //Remove any elements previously plotted
            d3.select("svg").remove();
            d3.select(".tooltip").remove();

            // console.log("Plotting data...");

            //Set chart dimensions
            var margin = {
                    top: 30,
                    right: 150, //this is to accomodate the right sidebar
                    bottom: 50,
                    left: 50
                },
                width = 1250 - margin.left - margin.right,
                height = 600 - margin.top - margin.bottom;

            var data = parameters.data; //regular data to plot

            // Filter any infinity values before plotting, this will happen when transforming log data = 0
            data = data.filter((d) => Number.isFinite(d.y) && Number.isFinite(d.x) && d.y > 0);


            var xScale = parameters.scales.xScale;
            xScale.range([0,width]); //scales according to fit type
            var yScale = parameters.scales.yScale;
            yScale.range([height, 0]); //scales according to fit type
            var xTitle = parameters.titles.xTitle; //xTitle according to label
            var yTitle = parameters.titles.yTitle; //yTitle according to label
            
            // Pull data to be fitted if there is a file selected to be fit
            // Pull equation for fitting data
            var isFit = parameters.fileToFit !== null && parameters.fitConfiguration.equation !== null;
            if(isFit) {
                var dataToFit = data.filter((d) => d.name === parameters.fileToFit);
                var equation = parameters.fitConfiguration.equation;
                var margin2 = { top: 20, bottom: 20, left: 20, right: 20};
                var height2 = 600 - margin2.top - margin2.bottom;
                var xScale2 = d3.scaleLinear().range([0, width]);
                var yScale2 = d3.scaleLinear().range([height2, 0]);
                var xAxis2 = d3.axisBottom(xScale2);
                
                var slider = svg.append("g")
                .attr("class", "slider")
                .attr("transform", "translate(" + margin2.left + "," + (margin2.top-20) + ")");
    
                var brush = d3.brushX()
                    .extent([
                        [0, 0],
                        [width, height2]
                    ])
                    .on("brush end", brushed);

                xScale2.domain(xScale.domain());
                yScale2.domain(yScale.domain());

                console.log("Data to Fit (" + parameters.fileToFit + "):", dataToFit);
                console.log("Fitting equation:", equation);
            }

            //Set Axes
            var xAxis = d3.axisBottom(xScale).ticks(10).tickSize(-height),
                yAxis = d3.axisLeft(yScale).ticks(10).tickSize(-width);

            //Add tool tip and hide it until invoked
            var tooltip = d3.select("div.plot").append("div")
                .attr("class", "tooltip")
                .style("opacity", 0)
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            //Add main chart area
            var svg = d3.select("div.plot").append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            //Add clip path so points/line do not exceed plot boundaries
            svg.append("defs").append("clipPath")
                .attr("id", "clip")
                .append("rect")
                .attr("width", width)
                .attr("height", height);

            //Add plot area
            svg.append("rect")
                .attr("class", "plotbg")
                .attr("width", width)
                .attr("height", height)
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            //Add Axis and Gridline section
            var axis = svg.append("g");

            //Add zoom window
            svg.append('rect')
                .attr('class', 'zoom')
                .attr('width', width)
                .attr('height', height)
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
                .call(d3.zoom().on("zoom", zoomed));

            //Add Error-bars Section
            var errorlines = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
            
            //Add Group to Plot Line/Points
            var plot = svg.append("g")
                .attr("class", "chart");

            //Add a Line Plot Function
            var plotLine = d3.line()
                .x(function (d) {
                    return xScale(d.x);
                })
                .y(function (d) {
                    return yScale(d.y);
                });

            xScale.domain(d3.extent(data, function (d) {
                return d.x;
            }));
            yScale.domain(d3.extent(data, function(d) {
                return d.y;
            }));

            //Add X Axis
            axis.append("g")
                .attr("transform", "translate(" + margin.left + "," + (height + margin.top) + ")")
                .attr("class", "axis axis--x")
                .call(xAxis);

            //Add Y Axis
            axis.append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
                .attr("class", "axis axis--y")
                .call(yAxis);

            //Add Y Axis Label
            svg.append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", 0)
                .attr("x", 0 - (height / 2))
                .attr("dy", "1em")
                .style("text-anchor", "middle")
                .style("font-weight", "bold")
                .text(yTitle);

            //Add X Axis Label
            svg.append("text")
                .attr("transform",
                    "translate(" + ((width + margin.left + margin.left) / 2) + " ," +
                    (height + margin.top + margin.bottom/1.5) + ")")
                .style("text-anchor", "middle")
                .style("font-weight", "bold")
                .text(xTitle);

            //Add Chart Title
            svg.append("text")
                .attr("class", "charttitle")
                .attr("transform",
                    "translate(" + ((width + margin.left + margin.left) / 2) + " ," +
                    (margin.top / 1.5) + ")")
                .text(yTitle + " vs " + xTitle);

          
            // Nest the entries by name
            var dataNest = d3.nest()
                .key(function (d) {
                    return d.name;
                })
                .entries(data);

            // Set Color Scale
            // color domain is set in order for filenames to have
            // assigned colors. If this wasn't set and a filename
            // was unselected from the list, the plot would re-assign
            // color values to the plots causing confusion at first glance
            // reference: https://stackoverflow.com/questions/20590396/d3-scale-category10-not-behaving-as-expected
            
            var color = d3.scaleOrdinal(d3.schemeCategory20)
                .domain(parameters.colorDomain);

            // Loop through each name / key
           
            dataNest.forEach(function (d, i) {

                //Add line plot
                plot.append("path")
                    .attr("clip-path", "url(#clip)")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
                    .datum(d.values)
                    .attr("class", "pointlines")
                    .attr("class", function() { return d.key + "-line"; })
                    .attr("d", plotLine)
                    .style("fill", "none")
                    .style("stroke", function () {
                        return d.color = color(d.key);
                    });;

                //Add error lines
                errorlines.append("g")
                    .selectAll(".error")
                    .data(d.values)
                    .enter()
                    .append('line')
                    .attr("clip-path", "url(#clip)")
                    .attr('class', 'error')
                    .attr('x1', function (d) {
                        return xScale(d.x);
                    })
                    .attr('x2', function (d) {
                        return xScale(d.x);
                    })
                    .attr('y1', function (d) {
                        return yScale(d.y + d.error);
                    })
                    .attr('y2', function (d) {
                        if(d.y - d.error < 0 && parameters.titles.yTitle === "Log(Y)") {
                            // console.log("Below zero! d.y = " + d.y + " | d.error = " + d.error + "| d.y - d.error = " + (d.y - d.error));
                            return yScale(d.y)
                        } else {
                            return yScale(d.y - d.error);
                        }
                    })
                    .style("stroke", function () {
                        return d.color = color(d.key);
                    });

                    // Add error tick top
                    // When calculating error capsizes, the '4' is chosen to match
                    // the radius of the points, which is also 4 pixels.
                    // The reason to +/- after scaling is the xScale(d.x) takes the
                    // data value and converts it to a pixel value, thus subtracting by same units:
                    // xScale(d.x) - 4 = pixel_value - pixel_value
                    // This leads to uniform capsizes no matter the scaling/transforming of data,
                    // which is not the case if xScale(d.x - 4) is used.
                    errorlines.append("g")
                    .selectAll(".error-tick-top")
                    .data(d.values)
                    .enter()
                    .append('line')
                    .attr("clip-path", "url(#clip)")
                    .attr('class', 'error-tick-top')
                    .attr('x1', function (d) {
                        return xScale(d.x) - 4;
                    })
                    .attr('x2', function (d) {
                        return xScale(d.x) + 4;
                    })
                    .attr('y1', function (d) {
                        return yScale(d.y + d.error);
                    })
                    .attr('y2', function (d) {
                        return yScale(d.y + d.error);
                    })
                    .style("stroke", function () {
                        return d.color = color(d.key);
                    });

                    //Add error tick bottom
                    errorlines.append("g")
                    .selectAll(".error-tick-bottom")
                    .data(d.values)
                    .enter()
                    .append('line')
                    .attr("clip-path", "url(#clip)")
                    .attr('class', 'error-tick-bottom')
                    .filter( function(d) {
                        if(parameters.titles.yTitle === "Log(Y)") {
                            return d.y - d.error > 0;
                        } else {
                            return true;
                        }
                    })
                    .attr('x1', function (d) {
                        return xScale(d.x) - 4;
                    })
                    .attr('x2', function (d) {
                        return xScale(d.x) + 4;
                    })
                    .attr('y1', function (d) {
                        return yScale(d.y - d.error);
                    })
                    .attr('y2', function (d) {
                        return yScale(d.y - d.error);
                    })
                    .style("stroke", function () {
                        return d.color = color(d.key);
                    });

                    //Add Scatter plot
                    plot.append("g")
                        .attr("clip-path", "url(#clip)")
                        .attr("class", "dot")
                        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
                        .selectAll("dot")
                        .data(d.values)
                        .enter()
                        .append("circle")
                        .attr("r", 4)
                        .attr("cx", function (d) {
                            return xScale(d.x);
                        })
                        .attr("cy", function (d) {
                            return yScale(d.y);
                        })
                        .attr("class", function(d) { return d.name + "-dot" })
                        .style("stroke", "white")
                        .style("stroke-width", "1px")
                        .style("opacity", 1)
                        .style("fill", function () {
                            return d.color = color(d.key);
                        })
                        .on("mouseover", function (d) {

                            d3.select(this).attr("r", 6);

                            tooltip.transition()
                                .duration(200)
                                .style("opacity", 1);
                            tooltip.html("Name: " + d.name + "<br/>" + "X: " + d.x.toFixed(6) + "<br/>" + "Y: " + d.y.toFixed(6) + "<br/>" + "Error: " + d.error.toFixed(6))
                                .style("left", (d3.event.pageX - 140) + "px")
                                .style("top", (d3.event.pageY - 110) + "px");
                        })
                        .on("mouseout", function (d) {
                            d3.select(this).attr("r", 4);

                            tooltip.transition()
                                .duration(500)
                                .style("opacity", 0);
                        });;
                    
                    // Code to Plot Fitted Line
                    if(isFit){
                        // Fit data and return points to plot fitted line
                        var fitLineData = fd.fitData(dataToFit, equation, minX, maxX);

                        // Append fitted line
                        var fitLine = plot.append("g");
                        fitLine.append("line")
                                .attr("clip-path", "url(#clip)")
                                .attr("class", "fitLine")
                                .attr("x1", xScale(lg.ptA.x))
                                .attr("y1", yScale(lg.ptA.y))
                                .attr("x2", xScale(lg.ptB.x))
                                .attr("y2", yScale(lg.ptB.y));
                    }

                    // Code to Add Slider Brush
                    if(isFit) {
                        var sliderdots = slider.append("g");
                        sliderdots.selectAll("dotslider")
                            .data(data)
                            .enter().append("line")
                            .attr('class', 'dotslider')
                            .attr("x1", function(d) { return xScale2(d.x); })
                            .attr("y1", height2)
                            .attr("x2", function(d) { return xScale2(d.x); })
                            .attr("y2", 0);

                        slider.append("g")
                            .attr("class", "axis axis--x")
                            .attr("transform", "translate(0," + height2 + ")")
                            .call(xAxis2);

                        slider.append("g")
                            .attr("class", "brush")
                            .call(brush)
                            .call(brush.move, xScale.range());
                    }

                    // Add the Legend
                    var legend = plot.append("g");

                    legend.append("rect")
                        .attr("x", width + margin.left + 20)
                        .attr("y", (margin.bottom + margin.top) + i * 25)
                        .attr("class", "legend")
                        .style("fill", function () {
                            return d.color = color(d.key);
                        })
                        .attr("height", "8px")
                        .attr("width", "8px");

                    legend.append("text")
                        .attr("x", width + margin.left + 35)
                        .attr("y", (margin.bottom + margin.top + 8) + i * 25)
                        .attr("class", "legend")
                        .style("fill", function () {
                            return d.color = color(d.key);
                        })
                        .style("font-size", "12px")
                        .style("font-weight", "bold")
                        .text(d.key)
                        .on("mouseover", function() {
                            d3.selectAll("circle").style("opacity", 0.2);
                            d3.selectAll(".error").style("opacity", 0.2);
                            d3.selectAll(".error-tick-top").style("opacity", 0.2);
                            d3.selectAll(".error-tick-bottom").style("opacity", 0.2);
                            d3.selectAll(".pointlines").style("opacity", 0.2);
                            d3.selectAll("." + d.key + "-line").style("stroke-width", "2px").style("opacity", 1);
                            d3.selectAll("." + d.key + "-dot").attr("r", 5).style("opacity", 1);
                            d3.select(this).style("font-size", "13px");
                        })
                        .on("mouseout", function() {
                            d3.selectAll(".error").style("opacity", 1);
                            d3.selectAll(".error-tick-top").style("opacity", 1);
                            d3.selectAll(".error-tick-bottom").style("opacity", 1);
                            d3.selectAll("circle").style("opacity", 1);
                            d3.selectAll(".pointlines").style("opacity", 1);
                            d3.selectAll("." + d.key + "-line").style("stroke-width", "1px");
                            d3.selectAll("." + d.key + "-dot").attr("r", 4);
                            d3.select(this).style("font-size", "12px");  
                        });

            });

            function zoomed() {
                // re-scale axes during zoom
                axis.select(".axis--y").transition()
                    .duration(50)
                    .call(yAxis.scale(d3.event.transform.rescaleY(yScale)));

                axis.select(".axis--x").transition()
                    .duration(50)
                    .call(xAxis.scale(d3.event.transform.rescaleX(xScale)));

                // re-draw scatter plot;
                var new_yScale = d3.event.transform.rescaleY(yScale);
                var new_xScale = d3.event.transform.rescaleX(xScale);
                plot.selectAll("circle")
                    .attr("cy", function (d) {
                        return new_yScale(d.y);
                    })
                    .attr("cx", function (d) {
                        return new_xScale(d.x);
                    });

                //re-draw line
                var new_plotLine = d3.line()
                    .x(function (d) {
                        return new_xScale(d.x);
                    })
                    .y(function (d) {
                        return new_yScale(d.y);
                    });

                plot.selectAll(".pointlines")
                    .attr("d", new_plotLine);

                //re-draw error
                errorlines.selectAll('.error')
                    .attr('x1', function (d) {
                        return new_xScale(d.x);
                    })
                    .attr('x2', function (d) {
                        return new_xScale(d.x);
                    })
                    .attr('y1', function (d) {
                        return new_yScale(d.y + d.error);
                    })
                    .attr('y2', function (d) {
                        if(d.y - d.error < 0 && parameters.titles.yTitle === "Log(Y)") {
                            // console.log("Below zero! d.y = " + d.y + " | d.error = " + d.error + "| d.y - d.error = " + (d.y - d.error));
                            return new_yScale(d.y)
                        } else {
                            return new_yScale(d.y - d.error);
                        }
                    });
                
                //re-draw error tick top
                errorlines.selectAll(".error-tick-top")
                    .attr('x1', function (d) {
                        return new_xScale(d.x) - 4;
                    })
                    .attr('x2', function (d) {
                        return new_xScale(d.x) + 4;
                    })
                    .attr('y1', function (d) {
                        return new_yScale(d.y + d.error);
                    })
                    .attr('y2', function (d) {
                        return new_yScale(d.y + d.error);
                    });

                //re-draw error tick bottom
                errorlines.selectAll(".error-tick-bottom")
                    .filter( function(d) {
                        if(parameters.titles.yTitle === "Log(Y)") {
                            return d.y - d.error > 0;
                        } else {
                            return true;
                        }
                    })
                    .attr('x1', function (d) {
                        return new_xScale(d.x) - 4;
                    })
                    .attr('x2', function (d) {
                        return new_xScale(d.x) + 4;
                    })
                    .attr('y1', function (d) {
                        return new_yScale(d.y - d.error);
                    })
                    .attr('y2', function (d) {
                        return new_yScale(d.y - d.error);
                    });

                //Code to re-draw fitted line
                if(isFit){
                    var new_fitLineFunction = d3.line()
                    .x(function (d) {
                        return new_xScale(d.x);
                    })
                    .y(function (d) {
                        return new_yScale(d.y);
                    });

                plot.selectAll(".pointlines")
                    .attr("d", new_plotLine);
                }
            }

                //create brush function redraw scatterplot with selection
                function brushed() {
                    var selection = d3.event.selection;

                    if (selection !== null) {
                        var e = d3.event.selection.map(xScale2.invert, xScale2);
                        // console.log("Extent selected", e);

                        slider.selectAll(".dotslider")
                            .classed("selected-slider", function (d) {
                                return e[0] <= d.x && d.x <= e[1];
                            })

                        plot.selectAll(".dot")
                            .classed("selected", function (d) {
                                return e[0] <= d.x && d.x <= e[1];
                            }).attr("d", function(d) {
                                if( e[0] <= d.x && d.x <= e[1]) {
                                    return triangleGenerator(); 
                                } else { 
                                    return circleGenerator(); }
                            });

                        let new_dataToFit = dataToFit.filter(function(d) {
                            return e[0] <= d.x && d.x <= e[1];
                        })
                        
                        fitLineData = fd.fitData(new_dataToFit, equation, minX, maxX);

                        d3.select(".fitLine").transition()
                            .attr("x1", xScale(lg.ptA.x))
                            .attr("y1", yScale(lg.ptA.y))
                            .attr("x2", xScale(lg.ptB.x))
                            .attr("y2", yScale(lg.ptB.y));
                    }
                }

        }
    }
}