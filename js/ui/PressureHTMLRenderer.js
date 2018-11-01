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

export var PressureHTMLRenderer = function()
{
    this.width = 0;
    this.height = 0;
    this.variable = [];
}

PressureHTMLRenderer.PRESSURE_COLORS = [[255, 255, 255],
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

PressureHTMLRenderer.prototype.render = function()
{
    var colors = PressureHTMLRenderer.PRESSURE_COLORS;
    var str = "<table>";
    str += "<thead><tr><th></th>";
    for(var x=0;x<this.width;x++)
    {
        str += "<th>"+x.toString()+"</th>"
    }
    str +="</tr></thead><tbody>"
    for (var y=0;y<this.height;y++)
    {
        str += "<tr><th>"+y.toString()+"</th>";
        for(var x=0;x<this.width;x++)
        {
            var i = x+y*this.width;
            var range = Math.floor((this.variable[i]/100-965)/3);
            if (range<0) range=0;
            else if (range>24) range=25;
            else range = range+1;
            if (isNaN(range)) range = 25;

            str += "<td title='("+x.toString()+","+y.toString()+") "+this.variable[x + y * this.width].toString()+"' style='background:rgb("+colors[range][0]+","+colors[range][1]+","+colors[range][2]+")'>"+Math.floor(this.variable[i]/100)+"</td>";
        }
        str +="</tr>";
    }
    str += "</tbody></table>"
    return str;
}
