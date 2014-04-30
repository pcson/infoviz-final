// initialize the svg
var w = 1200, h = 650, barw = 25, pad = 10;

var svg = d3.select("body").insert("svg", "script:first-of-type");
svg.attr({"width": w, "height": h});
var pov = svg.append('g').attr("class", "pov top");
var tension = svg.append('g').attr("class", "tension top").attr("transform", "translate("+ (w/3) +",0)");
var flat = svg.append('g').attr("class", "flat top").attr("transform", "translate("+ (w/3)*2 +",0)");
var outline = svg.append('g').attr("class", "outline top").attr("transform", "translate("+ ((w/3)*2 + barw + pad) +",0)");

// get the data async
var data;
d3.json("js/fake.json", function(error, json) {
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

    var tlinew = ((w / 3) - (pad * 2)) / narrators.length;

    var tlinec = tlinew / 2;

    var flatScale = d3.scale.linear()
        .domain([0, json[json.length - 1].base + json[json.length - 1].words ])
        .range([0, h]);

    var thirdscale = d3.scale.linear()
        .domain([0, narrators.length - 1]) // i of narrators
        .range([pad, w / 3 - pad - tlinew]);


    //**************************************
    // functions
    function makeDots(d,i){
        // draw dots in corresponding rows on the timelines
        var tline = d3.select("g.pov g." + d.character);
        tline.append("circle")
            .datum(d)
            .attr('r', 10)
            .attr('cx', tlinec)
            .attr('cy', function(d){
                // align to center
                return flatScale(d.base) + (flatScale(d.words) / 2);
            });
    }

    function makeOutline(d,i){
        outline.append("text")
            .datum(d)
            .text(function(d){
                return d.id;
            })
            .attr("y", function(d){
                // align to center
                return flatScale(d.base) + (flatScale(d.words) / 2);
            })
    }


    //*********************************************
    // start making shit

    // timeline groups: one for each narrator
    var timelines = d3.selectAll("g.pov, g.tension").selectAll('g')
        .data(narrators)
        .enter()
        .append("g")
        .attr('class', function(d){
        return d.key;
        })
        .attr("transform", function(d,i){
            return "translate(" + thirdscale(i) + ",0)";
        });

    // how many elements in each ?
    // timelines.selectAll("text")
    //     .data(function(d,i){
    //         return d.values;
    //     })
    //     .enter()
    //     .append("text")
    //     .text(function(d,i){
    //         console.log(d);
    //         return d.id;
    //     })
    //     .attr('y', function(d,i){
    //         return 15 + (15 *i);
    //     });


    // flat bar
    // this loop populates all the other panels
    flat.selectAll("rect")
        .data(json)
        .enter()
        .append("rect")
            .attr("width", barw)
            .attr("class", function(d){
                return d.character;
            })
            .attr("height", function(d){
                return flatScale(d.words);
            })
            .attr("y", function(d){
                return flatScale(d.base);
            })
            .each(makeDots) // fill in timelines
            .each(makeOutline); // fill in text outline
});
