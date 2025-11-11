/*
 This file is part of some public pages of Meteo Blois web site.
 
 This Meteo Blois source code is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.
 
 This Meteo Blois source code is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.
 
 You should have received a copy of the GNU General Public License
 along with this program.  If not, see <http://www.gnu.org/licenses/>.
 
 Author Nicolas Gasnier (http://www.meteo-blois.fr/contact/)
 */

var atmos = new Atmosphere();
var h500 = [];
var u500 = [];
var v500 = [];

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
    atmos.fieldFiltering = $("#filtering").is(':checked');
    atmos.setPhi(h500[0]);
    atmos.setU(u500[0]);
    atmos.setV(v500[0]);
    atmos.init();

    totalTime = 0;
    totalStep = 0;
    printResult();
}

function interpoler(a, b, t1, t2, t, res)
{
    var coef = (t - t1) / (t2 - t1);
    for (var i = 0; i < atmos.width * atmos.height; i++)
    {
        res[i] = (1 - coef) * a[i] + coef * b[i];
    }
}

function coupler()
{
    var t;
    var tprec = Number(valids[0]) * 3600;
    for (var i = 1; i < valids.length; i++)
    {
        t = Number(valids[i]) * 3600;
        if (atmos.time >= tprec && atmos.time < t)
        {
            interpoler(h500[i - 1], h500[i], tprec, t, atmos.time, h500_couplage);
            interpoler(u500[i - 1], u500[i], tprec, t, atmos.time, u500_couplage);
            interpoler(v500[i - 1], v500[i], tprec, t, atmos.time, v500_couplage);
            atmos.setPhiCouplage(h500_couplage);
            atmos.setUCouplage(u500_couplage);
            atmos.setVCouplage(v500_couplage);
            return;
        }
        tprec = t;
    }
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
    printResult();
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
    printResult();
}

function loadField(f, data, offsetx, offsety)
{
    var lines = data.split('\n');
    var width = 720;
    var height = 361;
    lines.shift();
    
    // TODO : limitation a lever, on suppose qu'on est centré sur greenwich...

    // Choppe ce qui est à droite de greenwich
    var greenwich = Math.floor(-atmos.wlon/atmos.dlon);
    var ystep = 2*atmos.dlat;
    var ystart = Math.floor((90-atmos.nlat)*2)+1;
    var yend = Math.floor((90-atmos.slat)*2)+1;
    var xstep = 2*atmos.dlon;
    var xstart = 0;
    var xend = 2*atmos.elon;
    var i = greenwich;
    for (var y = ystart ; y<yend ; y+=xstep)
    {
        for (var x = xstart ; x<xend ; x+=xstep)
        {
            f[i] = Number(lines[x+offsetx+(360-y-offsety)*width]);
            i++;
        }
        i += greenwich;
    }
    
    // Choppe ce qui est à gauche de greenwich
    var xstart = width-Math.floor((-atmos.wlon*2));
    var xend = 720;
    i = 0;
    for (var y = ystart ; y<yend ; y+=ystep)
    {
        for (var x = xstart ; x<xend ; x+=xstep)
        {
            f[i] = Number(lines[x+offsetx+(360-y-offsety)*width]);
            i++;
        }
        i += atmos.width-greenwich;
    }
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
            var range = Math.floor(((g[i] + 40000) / atmos.g - 5000) / 40);
            if (range < 0)
                range = 0;
            else if (range > 24)
                range = 25;
            else
                range = range + 1;

            str += "<td style='background:rgb(" + colors[range][0] + "," + colors[range][1] + "," + colors[range][2] + ")'>" + Math.floor(((g[i] + 40000) / atmos.g) / 100) + "</td>";
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

function printResult()
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
    switch (currentField)
    {
        case 'Vent':
            $('#result').html(windDump(atmos.U, atmos.V));
            break;
        case 'Z500':
            $('#result').html(geopDump(atmos.phi));
            break;
        case 'U':
            $('#result').html(fieldDump(atmos.U));
            break;
        case 'V':
            $('#result').html(fieldDump(atmos.V));
            break;
        case 'phi':
            $('#result').html(fieldDump(atmos.phi));
            break;
        case 'K':
            $('#result').html(fieldDump(atmos.K));
            break;
        case 'Tourbillon':
            $('#result').html(fieldDump(atmos.tourbillon));
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