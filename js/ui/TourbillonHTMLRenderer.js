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

export var TourbillonHTMLRenderer = function()
{
    this.width = 0;
    this.height = 0;
    this.variable = [];
    this.ps = null;
    this.f = null;
}

TourbillonHTMLRenderer.prototype.render = function()
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
    var i, range;
    var str = "<table>";
    str += "<thead><tr><th></th>";
    for (var x = 0; x < this.width; x++)
    {
        str += "<th>" + x.toString() + "</th>"
    }
    str += "</tr></thead><tbody>"
    for (var y = 0; y < this.height; y++)
    {
        str += "<tr><th>" + y.toString() + "</th>";
        for (var x = 0; x < this.width; x++)
        {
            i = x + y * this.width;

            if (this.ps !=null && this.f!=null)
                range = Math.floor(((this.variable[i]*this.ps[i]-this.f[i])*1000000) / 5+3);
            else
                range = Math.floor((this.variable[i]*1000000) / 5+3);
            
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
