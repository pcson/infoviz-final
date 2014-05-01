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

    // add baseline shift to data for stacking
    var baseline = 0;
    json.forEach(function(d){
        d.base = baseline;
        baseline += +d.words;
    });

    // nest the data by narrator to make character timelines
    var narrators = d3.nest()
        .key(function(d){ return d.character; })
        .entries(json);


    //***********************************
    // scales

    var flatBarScale = d3.scale.linear()
        .domain([0, json[json.length - 1].base + json[json.length - 1].words ])
        .range([0, h]);

    function vScaleCenter(d,i){
        // aligned with centers of flatBarScale segments
        return flatBarScale(d.base) + (flatBarScale(d.words) / 2);
    }

    function timelineWidth(panelw) {
        return (panelw - (pad * 2)) / narrators.length;
    }

    function makePanelScale(panelw){
        // helper function for code reuse to scale to panel widths
        return d3.scale.linear()
            .domain([0, narrators.length - 1]) // accepts i of narrators
            .range([pad, panelw - pad - timelineWidth(panelw)]);
    }

    var povScale = makePanelScale(povw);
    var tensionScale = makePanelScale(tensionw);
    var outlineScale = makePanelScale(outlinew);


    //**************************************
    // functions
    function makeDots(d,i){
        var tlinec = timelineWidth(povw) / 2;
        // draw dots in corresponding rows on the timelines
        var tline = d3.select("g.pov g." + d.character);
        tline.append("circle")
            .datum(d)
            .attr('r', 10)
            .attr('cx', tlinec)
            .attr('cy', vScaleCenter);
    }

    function makeOutline(d,i){
        outline.append("text")
            .datum(d)
            .text(function(d){
                return d.id;
            })
            .attr("y", vScaleCenter)
    }

    function makeTensionLines(d,i){
        var tline = d3.select("g.tension g." + d.character);
        // add points to each tline, i have no idea
    }

    function makeThemes(d,i) {
        // do that
    }

    function makeContextualPopup(d,i){
        // do that
    }


    //*********************************************
    // start making shit

    // timelines in pov and tension panels: one for each narrator
    d3.selectAll("g.pov, g.tension").selectAll('g')
        .data(narrators)
        .enter()
        .append("g")
        .attr("class", function(d){return d.key + " timeline";})
        .attr("transform", function(d,i){
            console.log(this.parentNode);
            if (d3.select(this.parentNode).classed("pov")){
                var shift = povScale(i);
            } else if (d3.select(this.parentNode).classed("tension")){
                var shift = tensionScale(i);
            }
            return "translate(" + shift + ",0)";
        });

    // flat bar
    // this loop populates all the other panels because the bar has everything
    flat.selectAll("rect")
        .data(json)
        .enter()
        .append("rect")
            .attr("x", pad)
            .attr("width", flatw - pad*2)
            .attr("class", function(d){
                return d.character;
            })
            .attr("height", function(d){
                return flatBarScale(d.words);
            })
            .attr("y", function(d){
                return flatBarScale(d.base);
            })
            .each(makeDots) // fill in timelines
            .each(makeOutline) // fill in text outline
            .each(makeTensionLines) // fill in tension lines
            .each(makeThemes) // fill in theme tags
            .each(makeContextualPopup); // fill in contextual info for hover/click
            // todo: make segments draggable
});
