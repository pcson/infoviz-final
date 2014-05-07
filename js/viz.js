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
var grid = 12, col = 100, w = col * grid, h = 900, pad = 10;
var headh = 75;

// panel widths
var povw = col * 4, tensionw = col * 5, flatw = col * 1, outlinew = col * 2; // multipliers should add up to grid
var barw = 40;

// initialize the svg
var svg = d3.select("body").insert("svg", "script:first-of-type");
svg.attr({"width": w, "height": h});

// add the panels for each viz
var pov = svg.append('g').attr("class", "pov top").attr("transform","translate(0,"+pad+")");
var tension = svg.append('g').attr("class", "tension top").attr("transform", "translate("+ (povw) +","+pad+")");
var flat = svg.append('g').attr("class", "flat_top").attr("transform", "translate("+ (povw + tensionw) +","+pad+")");
var outline = svg.append('g').attr("class", "outline top").attr("transform", "translate("+ (povw + tensionw + flatw) +","+pad+")");

// add static elements (axes and labels and shit like that)
// code tk
var state = "chapters";


// get the data async and populate the viz
var data, narrators;
d3.json("js/data.json", function(err, json) {
    if (err) return console.warn(err);

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
    function makeNarrators(dataset){
        return d3.nest()
            .key(function(d){ return d.narrator.toLowerCase(); })
            .sortKeys(d3.ascending)
            .entries(dataset);
    }
    narrators = makeNarrators(json);

    var narratorlist = [];
    narrators.forEach(function(d,i,a){
        narratorlist.push(d.key.toLowerCase());
    });
    old_narratorlist = narratorlist.slice();


    // remove characters who aren't narrators
    json.forEach(function(d,i,a){
        d.characters = d.characters.filter(function(v,i,a){
            // they are a narrator BUT not the current narrator
            return (narratorlist.indexOf(v.toLowerCase()) != -1) && (v != d.narrator.toLowerCase());
        });
        d.characters.forEach(function(v,i,a){
            a[i] = v.toLowerCase();
        })
    });

    function makeCharacters(dataset){
        var list = [];
        old_narratorlist.forEach(function(v,i,a){
            var obj = {"key": v, "values": []};
            dataset.forEach(function(c,i,a){
                if (c.characters.indexOf(v) != -1){
                    obj.values.push(c);
                }
            });
            list.push(obj);
        });

        return list;
    }
    characters = makeCharacters(json);

    //***********************************
    // scales

    var flatBarScale = d3.scale.linear()
        .domain([0, json[json.length - 1].base + json[json.length - 1].words ])
        .range([0, h - pad*2]);


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
    narratorlist.forEach(function(d,i,a){
        a[i] = charToClass(d);
    })
    colorScale.domain(narratorlist);

    var tensionLineWidth = d3.scale.linear()
        .domain([0,7])
        .range([0, tension_tlinec - (pad/2)]);


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

    function makePoints(d){
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
    }

    /// Stuff you edited
    function makeOutline(d){
       // append outline text to each flat bar segment; transition if necessary
       // this.parentNode == g
       d3.select(this.parentNode)
            .append("text")
            .text( function(d) {return d.chapter_id})
            .attr('font-size', '5px')
            .attr("font-family", "helvetica, arial, sans-serif")
            .attr("y",vScaleCenter)
            .attr("x", flatw + 10)
            .on("mouseover", mouseover)
            .on("mouseout", mouseout)
            .on("click", tool_tip);

            var button = d3.select(".flat_top").append("svg:circle")
            .attr("cx",280)
            .attr("cy", 10)
            .attr("r",10)
            .attr("fill", "orange")
            .on("click", theme_click);
    }

    function tool_tip(d) {
        d3.select("tspan")
                .style("visibility","visible")
                .style("opacity", 0.9)
                .style("font-size", "12px")
                .style("font-family", "Arial")
                .html(tool_text(d));
    }

    function tool_text(d) {
        return "Notes: " + d.notes + "<br/>" + " POV: " + d.pov;
    }

    function tool_off(d) {
            return d3.selectAll("tspan").style("visibility","hidden");
    }

    function mouseover(d) {
        var nodeSelection = d3.select(this).style({"font-size":'14px'});
        nodeSelection.select("text").style({"font-size":'5px'});
    }

    function mouseout(d) {
        var nodeSelection = d3.select(this).style({"font-size":'5px'});
        nodeSelection.select("text").style({"font-size":'14px'})
    }


    // 'this' refers to something else different from the this in makeOutline
    function theme_click(d) {
        if (state === "themes") {
            state = "chapters";
        } else {
            state = "themes";
        }
        flat.selectAll("g text")
            .each(function(d){
                var text = (state === "themes") ? d.themes : d.chapter_id;
                d3.select(this).text(text);
            });
    }



    function makeContextualPopup(d,i){
        // do that
    }

    function charToClass(name){
        return name.trim().replace(' ', '_').toLowerCase();
    }

    function baseSort(a,b){
        // sort dom elements in flatbar by their base values (restack after dragndrop)
        return a.base - b.base;
    }

    // dragging
    var drag = d3.behavior.drag()
        .origin(function(d){
            var target = d3.select(this).select('rect');
            return {"x": 0, "y": parseFloat(target.attr('y'))};
         })
        .on('dragstart',function(d,i){ // aka mousedown
            // don't do anything - see drag event
            tool_off(d)
        })
        .on('drag', function(d,i){
            // add a class to element being dragged
            var e = d3.event;
            var t = d3.select(this);
            var source = t.select('rect');

            if (!t.classed('dragging')){ // only happens once
                // add the class
                t.classed('dragging', true);
                // send to top
                flat[0][0].appendChild(this);
                // pass through pointer events
                t.attr('pointer-events', 'none');
                // initialize drag targets
                flat.selectAll('g')
                    .on('mouseover', function(){
                        d3.select(this).classed('target', true);
                    })
                    .on('mouseout', function(){
                        d3.select(this).classed('target', false);
                    });
            }
            // console.log(e.x, e.y, e.dx, e.dy); //

            // move the group contents
            t.selectAll("rect, text")
                .attr('y', function(d){
                    var y0 = parseFloat(d3.select(this).attr('y'));
                    // console.log(d3.select(this).attr('y'), y0, e.dy);
                    return parseFloat(y0 + e.dy);
                })

            // bind a new target position
            var drop = flat.select('g.target');
            if (drop[0][0]){
                var dropbase = +drop.datum().base;
                var diff = t.datum().base - dropbase;
                var sign = diff / Math.abs(diff);

                // if moving up:
                // subtract drop words from t base
                // add t words to drop base
                // if moving down:
                // add drop words to t base
                // subtract t words from drop base
                t.datum().base -= (sign * drop.datum().words)
                drop.datum().base += (sign * t.datum().words)
                // reversing direction on mouseout?


                // move drop target out of the way
                drop.select('rect')
                    .transition()
                    .attr('y', function(d){
                        return flatBarScale(d.base);
                    });

                drop.select('text')
                    .transition()
                    .attr('y', vScaleCenter);

                // remove class to prevent recursion
                drop.classed('target', false);

            }



        })
        .on('dragend', function(d,i){ // aka mouseup
            d3.event.sourceEvent.stopPropagation(); // prevent click event when you drop
            var t = d3.select(this);
            if (t.classed('dragging')) { // to avoid false dragends (mouseups)
                // remove dragging class
                t.classed('dragging', false);

                // drop
                t.select('rect')
                    .transition()
                    .attr('y', function(d){
                        return flatBarScale(d.base);
                    });
                t.select('text')
                    .transition()
                    .attr('y', vScaleCenter);

                // re-sort the DOM
                flat.selectAll('g').sort(baseSort);

                // recalculate bases
                var baseline = 0;
                flat.selectAll('g').data().forEach(function(d){
                    // add baseline shift to data for stacking
                    d.base = baseline;
                    baseline += +d.words;
                })

                // deactivate drag targets
                flat.selectAll('g')
                    .on('mouseover', null)
                    .on('mouseout', null);

                // restore pointer events
                t.attr('pointer-events', '');

                // backup old JSON first
                d3.xhr('js/backup.php', 'application/json')
                    .post(JSON.stringify(json), function(error, response){
                        // don't overwrite the old one unless there's no error
                        if (!error) {
                            // save new data to JSON
                            d3.xhr('js/save.php', 'application/json')
                                .post(JSON.stringify(flat.selectAll('g').data()), function(error, response){
                                    // don't do anything
                                });
                        }
                    });

                // update the viz
                var new_narrators = makeNarrators(flat.selectAll('g').data());
                // pov
                pov_tlines.data(new_narrators);
                pov_tlines.selectAll("circle.narrator")
                    .data(function(d){
                        // console.log(d);
                        return d.values;
                    })
                    .transition()
                    .duration(500)
                    .attr('cy', vScaleCenter);

                var new_characters = makeCharacters(flat.selectAll('g').data());
                pov_tlines.selectAll("circle.character")
                    .data(function(d,i){
                        return new_characters[i].values;
                    })
                    .transition()
                    .duration(500)
                    .attr('cy', vScaleCenter);

                // line
                pov.datum(flat.selectAll('g').data()).select('path.pov')
                    .transition()
                    .duration(500)
                    .attr("d", povline);

                // tension lines
                tension.selectAll('g.timeline')
                    .datum(function(d,i){
                        return new_narrators[i].values;
                    })
                    .select('polygon')
                    .transition()
                    .duration(500)
                    .attr('points', makePoints);

                // realign everything in the flat bar
                flat.selectAll('g').selectAll('rect')
                    .transition()
                    .duration(500)
                    .attr('y', function(d){
                        return flatBarScale(d.base);
                    });
            }
        });

    // highlighting
    function makeHighlight(d,i){
        if (d3.event.defaultPrevented) return; // avoid conflict with drag

        // remove any existing highlight
        svg.select('rect.highlight')
            .transition()
            .attr('opacity', 0)
            .remove();

        var t = d3.select(this);
        if (t.classed('highlighted')) {
            t.classed('highlighted', false)
                .transition()
                .attr('stroke', '#767676');
            return tool_off(d);
        } else { // don't do this if you were clicking an already highlighted row
            flat.selectAll('.highlighted')
                .classed('highlighted', false)
                .transition()
                .attr('stroke', '#767676');

            t.classed('highlighted', true)
                .transition()
                .duration(500)
                .attr('stroke', '#000000');
            svg.insert('rect', 'g')
                .attr('width', w)
                .attr('height', t.attr('height'))
                .attr('y', +t.attr('y') + pad)
                .classed('highlight', true)
                .attr('fill', '#b1b0b0')
                .attr('opacity', 0)
                    .transition()
                    .duration(500)
                    .attr('opacity', 1);
            return tool_tip(d);

        }



    }


    //*********************************************
    // start making shit

    // make a label bar for the top of the page
    var header = d3.select('body').insert('div', 'svg')
        .classed('header', true);
    header.append('div')
        .classed('pov', true)
        .style({'width': povw });

    header.append('div')
        .attr('class', 'tension')
        .style({'width': tensionw});

    header.selectAll('div').selectAll('div.label')
        .data(narrators)
        .enter()
        .append('div')
        .attr('class', 'label')
        .text(function(d){ return d.key; })
        .style('left', function(d,i){
            if (d3.select(this.parentNode).classed("pov")){
                var shift = povScale(i);
            } else if (d3.select(this.parentNode).classed("tension")){
                var shift = tensionScale(i);
            }
            return shift;
        })
    header.select('div.pov')
        .insert('div', 'div')
        .attr('class', 'title')
        .text('POV Path');

    header.select('div.tension')
        .insert('div', 'div')
        .attr('class', 'title')
        .text('Tension Lines')

    header.append('div')
        .attr('class', 'chapters')
        .style('width', flatw + outlinew)
            .append('div')
            .attr('class', 'title')
            .text('Chapter IDs');
    header.select('div.chapters')
        .append('div')
        .attr('class', 'toggle')
            .append('a')
            .attr('href', 'javascript:;')
            .text('toggle themes');


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


    var pov_tlines = d3.selectAll('g.pov g.timeline');

    pov_tlines.append('line')
        .attr('x1', pov_tlinec)
        .attr('y1', 0)
        .attr('x2', pov_tlinec)
        .attr('y2', function(d,i){
            return flatBarScale.range()[1];
        })
        .attr('class', 'axis');

    d3.selectAll('g.tension g.timeline')
        .append('line')
        .attr('x1', tension_tlinec)
        .attr('y1', 0)
        .attr('x2', tension_tlinec)
        .attr('y2', function(d,i){
            return flatBarScale.range()[1];
        })
        .attr('class', 'axis');

    // make pov dots
    pov_tlines.selectAll('circle.narrator')
        .data(function(d,i){
            return d.values;
        })
        .enter()
            .append('circle')
            .classed('narrator', true)
            .attr('r', 8)
            .attr('opacity', 0.8)
            .attr('cx', pov_tlinec)
            .attr('cy', vScaleCenter)
            .attr('fill', function(d){
                return colorScale(charToClass(d.narrator));
            });

    // make secondary character dots
    pov_tlines.selectAll('circle.character')
        .data(function(d,i){
            return characters[i].values;
        })
        .enter()
            .append('circle')
            .classed('character', true)
            .attr('r', 5)
            .attr('opacity', 0.4)
            .attr('cx', pov_tlinec)
            .attr('cy', vScaleCenter)
            .attr('fill', function(d){
                var char = d3.select(this.parentNode).attr('class').replace(' timeline', '');
                return colorScale(char);
            });

    // flat bar
    // this loop populates the other panels because the bar has everything
    flat.selectAll("g")
        .data(json)
        .enter()
        .append("g")
            .call(drag)
            .append("rect")
            .on('click', makeHighlight)
            .attr("x", pad * 3)
            .attr("width", barw)
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
            .attr("stroke", " #767676")
            .each(makeOutline) // fill in text outline
            .each(makeContextualPopup); // fill in contextual info for hover/click


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
        .insert("path", 'g')
        .attr("d", povline)
        .attr("class", "pov");


    // draw tension lines
    tension.selectAll('g.timeline')
        .datum(function(d){return d.values;})
        .append("polygon")
        .attr("points", makePoints)
        .attr("fill", function(d){ return colorScale(charToClass(d[0].narrator)); })
        .attr("stroke", function(d){ return colorScale(charToClass(d[0].narrator)); })
        .attr('opacity', 0.8);
});