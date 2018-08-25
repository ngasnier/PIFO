/* 
Copyright (C) 2018 Nicolas GASNIER (http://www.meteo-blois.fr/contact/)

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

var atmos = new BarotropicModel();
var variableDescriptions = [];
var variableRepresentations = [];
var interpolator = new BarotropicInterpolator();
var wgribInterpolator = new WGRIBInterpolator();
var h500 = new TimeInterpolator();
var u500 = new TimeInterpolator();
var v500 = new TimeInterpolator();

var h500_couplage = [];
var u500_couplage = [];
var v500_couplage = [];

var currentField = 'Vent';
var lastExecTime = 0;
var totalTime = 0;
var totalStep = 0;

var valids = ["000", "003", "006", "012", "015", "018", "021", "024"];
// 0 : GFS 06/05/2017 00Z
// 1 : GFS 22/02/2018 00Z
//var valids = ["000", "003", "006", "012", "018", "024"];
var scenario = "1";
var reslist = [];
var status = "loading";


function printLoadingStatus()
{
    $(statistics).html("Chargement " + reslist[0]);
}

function reset()
{
    if (status != "ready")
        return;
    if ($("#filtering").is(':checked'))
        atmos.filter = new SchumannFilter(atmos.width, atmos.height);
    else
        atmos.filter = null;
    atmos.setVariable("phi", h500.variable[0]);
    atmos.setVariable("U", u500.variable[0]);
    atmos.setVariable("V", v500.variable[0]);
    atmos.init();
    
    initVariableList();

    totalTime = 0;
    totalStep = 0;
//    printResult();
}

function initVariableList()
{   
    $("#variableDump").empty();
    variableDescriptions = [];
       
    var group = $("<optgroup>", { label:"Variables historiques", id:"HistoricVariables"});
    $("#variableDump").append(group);
    $.each(atmos.getHistoricVariables(), function (i, item) {
        variableDescriptions[item.name] = item;
        group.append($('<option>', {
            value: item.name,
            text : item.name
        }));
    });
    
    group = $("<optgroup>", { label:"Variables diagnostiques", id:"DiagnosticVariables"});
    $("#variableDump").append(group);
    $.each(atmos.getDiagnosticVariables(), function (i, item) {
        variableDescriptions[item.name] = item;
        group.append($('<option>', {
            value: item.name,
            text : item.name
        }));
    }); 

    group = $("<optgroup>", { label:"Variables internes", id:"InternalVariables"});
    $("#variableDump").append(group);
    $.each(atmos.getInternalVariables(), function (i, item) {
        variableDescriptions[item.name] = item;
        group.append($('<option>', {
            value: item.name,
            text : item.name
        }));
    }); 
      
    $.each(variableRepresentations, function(i, item) { 
        $("#"+item.group).prepend($('<option>', {
            value: item.name,
            text: item.name+" (carte)"
        }));
    });
    
    $("#variableDump").change(onVariableChange);
    $("#variableDump").val(currentField);
    onVariableChange();
}

function onVariableChange()
{
    currentField = $("#variableDump").val();
    initLevelList();
}

function initLevelList()
{
    var description = variableDescriptions[currentField];
    if (description==null) description = variableRepresentations[currentField];
    
    $("#level").empty();
    $.each(description.levels, function (i, item) {
        $("#level").append($("<option>", {
            value: i,
            text : "s="+item.toFixed(3)+" ["+i.toString()+"]" 
        }));
    });
    
    $("#level").change(function() {
        var k = Number($("#level").val());
        currentField = "geop";
        printVariable();
    });
    
    printVariable();
}

function coupler()
{
    h500.interp(atmos.time, h500_couplage);
    u500.interp(atmos.time, u500_couplage);
    v500.interp(atmos.time, v500_couplage);
    atmos.setVariable("phi_couplage", h500_couplage);
    atmos.setVariable("U_couplage", u500_couplage);
    atmos.setVariable("V_couplage", v500_couplage);
}

function start()
{
    if (status != "ready")
        return;
    atmos.fieldFiltering = $("#filtering").is(':checked');
    var firstTimestamp = new Date().getTime();
    coupler();
    atmos.start();
    var secondTimestamp = new Date().getTime();
    lastExecTime = secondTimestamp - firstTimestamp;
    totalStep++;
    totalTime += lastExecTime;
    printVariable();
}

function step()
{
    if (status != "ready")
        return;
    atmos.fieldFiltering = $("#filtering").is(':checked');
    var firstTimestamp = new Date().getTime();
    coupler();
    atmos.step();
    var secondTimestamp = new Date().getTime();
    lastExecTime = secondTimestamp - firstTimestamp;
    totalStep++;
    totalTime += lastExecTime;
    printVariable();
}

function fieldDump(v)
{
    var str = "<table>";
    str += "<thead><tr><th></th>";
    for (var x = 0; x < atmos.width; x++)
    {
        str += "<th>" + x.toString() + "</th>"
    }
    str += "</tr></thead><tbody>"
    for (var y = 0; y < atmos.height; y++)
    {
        str += "<tr><th>" + y.toString() + "</th>";
        for (var x = 0; x < atmos.width; x++)
        {
            str += "<td>" + v[x + y * atmos.width].toString() + "</td>";
        }
        str += "</tr>";
    }
    str += "</tbody></table>"
    return str;
}

function windDump(u, v)
{
    var symbols = ["&rarr;", "&#8599;", "&uarr;", "&#8598;", "&larr;", "&#8601;", "&darr;", "&#8600;"];
    var colors = [[255, 255, 255], //0
        [164, 230, 253], //5
        [98, 202, 252], // 10
        [78, 145, 251], // 15
        [85, 255, 154], // 20
        [81, 209, 105], // 25
        [111, 210, 65], // 30
        [120, 255, 49], // 35
        [165, 248, 68], // 40
        [178, 212, 50], // 45
        [209, 246, 59], // 50
        [195, 154, 41], // 55
        [243, 151, 47], // 60
        [244, 150, 108], // 65
        [197, 150, 153], // 70
        [193, 99, 62], // 75
        [192, 39, 61], // 80
        [240, 0, 44], // 85
        [184, 0, 30], // 90
        [120, 0, 19], // 100
        [95, 0, 51], // 110
        [120, 0, 164], // 120
        [168, 0, 248], // 130
        [86, 28, 99], // 140
        [241, 0, 249], // 150+
    ];
    var str = "<table>";
    str += "<thead><tr><th></th>";
    for (var x = 0; x < atmos.width; x++)
    {
        str += "<th>" + x.toString() + "</th>"
    }
    str += "</tr></thead><tbody>"
    for (var y = 0; y < atmos.height; y++)
    {
        str += "<tr><th>" + y.toString() + "</th>";
        for (var x = 0; x < atmos.width; x++)
        {
            var i = x + y * atmos.width;
            var angle = 0;
            var w = Math.sqrt(u[i] * u[i] + v[i] * v[i]) * 3.6;
            var scale = 0;
            if (w > 150)
                w = 150;
            if (w < 90)
                 scale = Math.floor(w / 5);
            else
                scale = 18 + Math.floor((w - 90) / 10);
            var r = colors[scale][0];
            var g = colors[scale][1];
            var b = colors[scale][2];

            if (w > 0.1)
            {
                if (u[i] > 0 && v[i] >= 0)
                    angle = Math.atan(v[i] / u[i]);
                else if (u[i] > 0 && v[i] < 0)
                    angle = Math.atan(v[i] / u[i]) + 2 * Math.PI;
                else if (u[i] < 0)
                    angle = Math.atan(v[i] / u[i]) + Math.PI;
                else if (u[i] == 0 && v[i] > 0)
                    angle = Math.PI / 2;
                else if (u[i] == 0 && v[i] < 0)
                    angle = 3 * Math.PI / 2;

                angle = Math.floor(angle / (2 * Math.PI) * 8);
                str += "<td style='background:rgb(" + r + "," + g + "," + b + ")'>" + symbols[angle] + "</td>";
            } else
            {
                str += "<td>0</td>";
            }
        }
        str += "</tr>";
    }
    str += "</tbody></table>"
    return str;
}

function geopDump(g)
{
    var colors = [[0, 0, 0],
        [41, 0, 39],
        [70, 0, 82],
        [83, 0, 127],
        [82, 0, 169],
        [70, 0, 217],
        [63, 0, 240],
        [64, 0, 240],
        [68, 86, 241],
        [76, 148, 241],
        [86, 206, 242],
        [93, 245, 233],
        [79, 245, 128],
        [74, 245, 52],
        [78, 245, 45],
        [98, 245, 46],
        [135, 245, 48],
        [180, 245, 52],
        [231, 245, 57],
        [236, 209, 52],
        [234, 157, 46],
        [233, 96, 41],
        [232, 34, 39],
        [231, 0, 38],
        [166, 0, 28],
        [114, 0, 18]
    ];
    var str = "<table>";
    str += "<thead><tr><th></th>";
    for (var x = 0; x < atmos.width; x++)
    {
        str += "<th>" + x.toString() + "</th>"
    }
    str += "</tr></thead><tbody>"
    for (var y = 0; y < atmos.height; y++)
    {
        str += "<tr><th>" + y.toString() + "</th>";
        for (var x = 0; x < atmos.width; x++)
        {
            var i = x + y * atmos.width;
            var range = Math.floor(((g[i] + 40000) / Model.g - 5000) / 40);
            if (range < 0)
                range = 0;
            else if (range > 24)
                range = 25;
            else
                range = range + 1;

            str += "<td style='background:rgb(" + colors[range][0] + "," + colors[range][1] + "," + colors[range][2] + ")'>" + Math.floor(((g[i] + 40000) / Model.g) / 100) + "</td>";
        }
        str += "</tr>";
    }
    str += "</tbody></table>"
    return str;
}


function tourbillonDump(t)
{
    var colors = [[0, 153, 255],
        [51, 204, 255],
        [255, 255, 255],
        [255, 255, 255],
        [237, 237, 239],
        [192, 216, 204],
        [146, 214, 180],
        [106, 216, 127],
        [154, 235, 49],
        [229, 255, 53],
        [255, 248, 53],
        [255, 215, 53],
        [255, 181, 53],
        [255, 143, 43],
        [255, 106, 33],
        [255, 53, 13],
        [255, 1, 1],
        [255, 1, 85],
        [255, 1, 162],
        [255, 65, 208],
        [255, 165, 244],
        [255, 195, 240]
    ];
    var str = "<table>";
    str += "<thead><tr><th></th>";
    for (var x = 0; x < atmos.width; x++)
    {
        str += "<th>" + x.toString() + "</th>"
    }
    str += "</tr></thead><tbody>"
    for (var y = 0; y < atmos.height; y++)
    {
        str += "<tr><th>" + y.toString() + "</th>";
        for (var x = 0; x < atmos.width; x++)
        {
            var i = x + y * atmos.width;
            var range = Math.floor((t[i]*1000000) / 5+3);
            if (range < 0)
                range = 0;
            else if (range > colors.length-1)
                range = colors.length-1;

            str += "<td style='background:rgb(" + colors[range][0] + "," + colors[range][1] + "," + colors[range][2] + ")'> </td>";
        }
        str += "</tr>";
    }
    str += "</tbody></table>"
    return str;
}

function printDiagnostics()
{
    var str = "Masse = " + atmos.total_masse.toString()
            + " - Energie = " + atmos.total_energie.toString()
            + " - Tourbillon = " + atmos.total_tourbillon.toString()
            + " - Enstropie = " + atmos.total_enstropie.toString();
    return str;
}

function printVariable()
{
    if (status != "ready")
        return;

    var t = atmos.time;
    var jours = Math.floor(t / 86400);
    t -= jours * 86400;
    var heures = Math.floor(t / 3600);
    t -= heures * 3600;
    var minutes = Math.floor(t / 60);
    $(statistics).html("Temps = " + atmos.time.toString() + " secondes ("
            + jours.toString() + " jrs " + heures.toString() + " hrs "
            + minutes.toString() + " min) - dt=" + atmos.dt.toString() + "s, dx="
            + atmos.dx.toString() + "m, dy=" + atmos.dy.toString() + "m, "
            + "temps exec = " + lastExecTime.toString() + "ms, "
            + "exec total = " + totalTime.toString() + "ms, "
            + "nb pas = " + totalStep.toString());
    if ($("#display").is(':checked'))
    {
        switch (currentField)
        {
            case 'Vent':
                $('#result').html(windDump(atmos.getVariable("U"), atmos.getVariable("V")));
                break;
            case 'Z500':
                $('#result').html(geopDump(atmos.getVariable("phi")));
                break;
            case 'Tourbillon':
                $('#result').html(tourbillonDump(atmos.getVariable("tourbillon")));
                break;
            case 'U':
                $('#result').html(fieldDump(atmos.getVariable("U")));
                break;
            case 'V':
                $('#result').html(fieldDump(atmos.getVariable("V")));
                break;
            case 'phi':
                $('#result').html(fieldDump(atmos.getVariable("phi")));
                break;
            case 'K':
                $('#result').html(fieldDump(atmos.getVariable("K")));
                break;
            case 'Tourbillon (dump)':
                $('#result').html(fieldDump(atmos.getVariable("tourbillon")));
                break;
            case 'm':
                $('#result').html(fieldDump(atmos.m));
                break;
            case 'f':
                $('#result').html(fieldDump(atmos.f));
                break;
            case 'dU/dx':
                $('#result').html(fieldDump(atmos.dU_dx));
                break;
            case 'dV/dy':
                $('#result').html(fieldDump(atmos.dV_dy));
                break;
            case 'd(phi+K)/dx':
                $('#result').html(fieldDump(atmos.dx_phi_K));
                break;
            case 'd(phi+K)/dy':
                $('#result').html(fieldDump(atmos.dy_phi_K));
                break;
            case 'd(phi*U)/dx':
                $('#result').html(fieldDump(atmos.dx_phi_U));
                break;
            case 'd(phi*V)/dy':
                $('#result').html(fieldDump(atmos.dy_phi_V));
                break;
            case 'alpha':
                $('#result').html(fieldDump(atmos.alpha));
                break;
            case 'Diagnostics':
                $('#result').html(printDiagnostics());
                break;
        }
    }
}