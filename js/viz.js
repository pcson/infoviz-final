/*
Copyright (C) 2014  Ian MacFarland and Paul Son

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

// define some dimensions for padding and proportions
var grid = 12, col = 100, w = col * grid, h = 650, pad = 10;
// panel widths
var povw = col * 4, tensionw = col * 5, flatw = col * 1, outlinew = col * 2; // multipliers should add up to grid

// initialize the svg
var svg = d3.select("body").insert("svg", "script:first-of-type");
svg.attr({"width": w, "height": h});

// add the panels for each viz
var pov = svg.append('g').attr("class", "pov top");
var tension = svg.append('g').attr("class", "tension top").attr("transform", "translate("+ (povw) +",0)");
var flat = svg.append('g').attr("class", "flat top").attr("transform", "translate("+ (povw + tensionw) +",0)");
var outline = svg.append('g').attr("class", "outline top").attr("transform", "translate("+ (povw + tensionw + flatw) +",0)");

// add static elements (axes and labels and shit like that)
// code tk

// get the data async and populate the viz
var data, narrators;
d3.json("js/data.json", function(error, json) {
    if (error) return console.warn(error);

    //************************************
    // data wrangling

    // swap median word count for placeholder value
    var wordcounts = [];
    json.forEach(function(d){
        if (d.words != 10) wordcounts.push(d.words);
    })
    // console.log(wordcounts);
    var mediancount = d3.median(wordcounts);
    var baseline = 0;

    json.forEach(function(d){
        if (d.words == 10) d.words = mediancount;

        // add baseline shift to data for stacking
        d.base = baseline;
        baseline += +d.words;
    })

    // nest the data by narrator to make character timelines
    narrators = d3.nest()
        .key(function(d){ return d.narrator.toLowerCase(); })
        .entries(json);


    //***********************************
    // scales

    var flatBarScale = d3.scale.linear()
        .domain([0, json[json.length - 1].base + json[json.length - 1].words ])
        .range([pad, h - pad]);


    // Sets the Y Coordinates
    function vScaleCenter(d){
        // aligned with centers of flatBarScale segments
        return flatBarScale(d.base) + (flatBarScale(d.words) / 2);
    }

    // Creates the width
    function timelineWidth(panelw) {
        return (panelw - (pad * 2)) / narrators.length;
    }

    var pov_tlinec = timelineWidth(povw) / 2;
    var tension_tlinec = timelineWidth(tensionw) / 2;

    function makePanelScale(panelw){
        // helper function for code reuse to scale to panel widths
        return d3.scale.linear()
            .domain([0, narrators.length - 1]) // accepts i of narrators
            .range([pad, panelw - pad - timelineWidth(panelw)]);
    }

    var povScale = makePanelScale(povw);
    var tensionScale = makePanelScale(tensionw);
    var outlineScale = makePanelScale(outlinew);

    var colorScale = d3.scale.category10(); // temporary; will choose real colors later
    var narratorlist = [];
    narrators.forEach(function(d,i,a){
        narratorlist.push(charToClass(d.key));
    });
    colorScale.domain(narratorlist);

    var tensionLineWidth = d3.scale.linear()
        .domain([0,7])
        .range([0, tension_tlinec]);


    //**************************************
    // functions
    // This function are being called to draw it out on each row/y-axis

    function makeDots(d,i){
        var tline = d3.select("g.pov g." + charToClass(d.narrator));

        // draw dots in corresponding rows on the timelines for narrators
        tline.append("circle")
            .datum(d)
            .attr('r', 6)
            .attr('opacity', 0.9)
            .attr('cx', pov_tlinec)
            .attr('cy', vScaleCenter)
            .attr('fill', colorScale(charToClass(d.narrator)));

        // draw smaller character dots
        d.characters.forEach(function(c,i,a){
            if (narratorlist.indexOf(charToClass(c)) == -1) return false;
            var tline = d3.select("g.pov g." + charToClass(c));
            tline.append("circle")
                .datum(d)
                .attr('r', 3)
                .attr('opacity', 0.4)
                .attr('cx', pov_tlinec)
                .attr('cy', vScaleCenter)
                .attr('fill', colorScale(charToClass(c)));
        });
    }


    /// Stuff you edited
    function makeOutline(d){
       // append outline text to each flat bar segment; transition if necessary
       d3.select(this.parentNode)
            .append("text")
            .text( function(d) {return d.chapter_id})
            .attr('fill', 'black')
            .attr('font-size', '20px')
            .attr("y",vScaleCenter)
            .attr("x", flatw + 10)
    }

    function makeThemes(d) {
        // append theme text to each flat bar segment; transition if necessary
    }

    function makeContextualPopup(d,i){
        // do that
    }

    function charToClass(name){
        return name.trim().replace(' ', '_').toLowerCase();
    }


    //*********************************************
    // start making shit

    // timelines in pov and tension panels: one for each narrator
    d3.selectAll("g.pov, g.tension").selectAll('g')
        .data(narrators)
        .enter()
        .append("g")
        .attr("class", function(d){return charToClass(d.key) + " timeline";})
        .attr("transform", function(d,i){
            if (d3.select(this.parentNode).classed("pov")){
                var shift = povScale(i);
            } else if (d3.select(this.parentNode).classed("tension")){
                var shift = tensionScale(i);
            }
            return "translate(" + shift + ",0)";
        });


    d3.selectAll('g.pov g.timeline')
        .append('line')
        .attr('x1', pov_tlinec)
        .attr('y1', pad)
        .attr('x2', pov_tlinec)
        .attr('y2', function(d,i){
            return flatBarScale.range()[1];
        })
        .attr('class', 'axis');

    d3.selectAll('g.tension g.timeline')
        .append('line')
        .attr('x1', tension_tlinec)
        .attr('y1', pad)
        .attr('x2', tension_tlinec)
        .attr('y2', function(d,i){
            return flatBarScale.range()[1];
        })
        .attr('class', 'axis');

    // make pov path
    // path generator
    var povline = d3.svg.line()
        .x(function(d){
            // This is drawing the path between nodes. This is what you have to do to get the x coordinates
            // Width + padding amount.
            return povScale(narratorlist.indexOf(charToClass(d.narrator))) + pov_tlinec;
        })
        .y(vScaleCenter)
        .interpolate('linear');

    pov.datum(json)
        .append("path")
        .attr("d", povline)
        .attr("class", "pov");

    // flat bar
    // this loop populates the other panels because the bar has everything
    flat.selectAll("g")
        .data(json)
        .enter()
        .append("g")
            .append("rect")
            .attr("x", pad)
            .attr("width", flatw - pad*2)
            .attr("class", function(d){
                return charToClass(d.narrator);
            })
            .attr("height", function(d){
                return flatBarScale(d.words);
            })
            .attr("y", function(d){
                return flatBarScale(d.base);
            })
            .attr("fill", function(d){
                return colorScale(charToClass(d.narrator));
            })
            .each(makeDots) // fill in timelines
            .each(makeOutline) // fill in text outline
            .each(makeThemes) // fill in theme tags
            .each(makeContextualPopup); // fill in contextual info for hover/click
            // todo: make segments draggable

    // draw tension lines
    tension.selectAll('g.timeline')
        .datum(function(d){return d.values;})
        .append("polygon")
        .attr("points", function(d){
            var points = ""
            d.forEach(function(c,i,a){
                points += (tension_tlinec - tensionLineWidth(c.tension));
                points += " " + vScaleCenter(c) + " ";
            });
            d.reverse();
            d.forEach(function(c,i,a){
                points += (tension_tlinec + tensionLineWidth(c.tension));
                points += " " + vScaleCenter(c) + " ";
            });
            d.reverse();
            return points;
        })
        .attr("fill", function(d){ return colorScale(charToClass(d[0].narrator)); })
        .attr("stroke", function(d){ return colorScale(charToClass(d[0].narrator)); });
});
