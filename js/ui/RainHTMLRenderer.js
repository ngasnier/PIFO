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

import { Model } from "../modeling/Model.js";

export var RainHTMLRenderer = function()
{
    this.width = 0;
    this.height = 0;
    this.variable = [];
}

RainHTMLRenderer.RAIN_COLORS = [[255, 255, 255], // 0: 0-0.1
    [213, 229, 255], // 1: 0.1-0.2
    [174, 203, 255], // 2: 0.2-0.5
    [129, 177, 255], // 3: 0.5-1
    [87, 151, 255],  // 4: 1-2
    [45, 125, 255], // 5: 2-3
    [0, 97, 255],  // 6: 3-4
    [6, 149, 143], // 7: 4-5
    [1, 200, 47],  // 8: 5-6
    [98, 255, 0],  // 9: 6-7
    [156, 254, 0], // 10: 7-8
    [200, 255, 47], // 11: 8-9
    [255, 254, 1], // 12: 9-10
    [254, 198, 1], // 13: 10-13
    [252, 163, 1], // 14: 13-16
    [250, 129, 0], // 15: 16-20
    [255, 100, 0], // 16: 20-25
    [255, 50, 0],  // 17: 25-30
    [255, 1, 73],  // 18: 30-35
    [255, 1, 73],  // 19: 35-40
    [255, 1, 85],  // 20: 40-45
    [255, 1, 109], // 21: 45-50
    [255, 1, 162], // 22: 50-60
    [255, 25, 198],  // 23: 60-75
    [255, 65, 208], // 24: 75-100
    [255, 125, 223], // 25: 100-200
    [255, 165, 244], // 26: 200-400
    [255, 195, 240]  // 27: >400
];

RainHTMLRenderer.RAIN_INTERVALS = [0.1, // 0: 0-0.1 
    0.2, // 1: 0.1-0.2
    0.5, // 2: 0.2-0.5
    1, // 3: 0.5-1
    2,  // 4: 1-2
    3, // 5: 2-3
    4,  // 6: 3-4
    5, // 7: 4-5
    6,  // 8: 5-6
    7,  // 9: 6-7
    8, // 10: 7-8
    9, // 11: 8-9
    10, // 12: 9-10
    13, // 13: 10-13
    16, // 14: 13-16
    20, // 15: 16-20
    25, // 16: 20-25
    30,  // 17: 25-30
    35,  // 18: 30-35
    40,  // 19: 35-40
    45,  // 20: 40-45
    50, // 21: 45-50
    60, // 22: 50-60
    75,  // 23: 60-75
    100, // 24: 75-100
    200, // 25: 100-200
    400]; // 26: 200-400
    
      
RainHTMLRenderer.prototype.render = function()
{
    var colors = RainHTMLRenderer.RAIN_COLORS;
    var str = "<table>";
    var x, y, i,k;
    var range;
    str += "<thead><tr><th></th>";
    for(x=0;x<this.width;x++)
    {
        str += "<th>"+x.toString()+"</th>"
    }
    str +="</tr></thead><tbody>"
    for (y=0;y<this.height;y++)
    {
        str += "<tr><th>"+y.toString()+"</th>";
        for(x=0;x<this.width;x++)
        {
            i = x+y*this.width;
            
            range = RainHTMLRenderer.RAIN_INTERVALS.length;
            for (k=0;k<RainHTMLRenderer.RAIN_INTERVALS.length;k++)
            {
                if (this.variable[i]<RainHTMLRenderer.RAIN_INTERVALS[k]) {
                    range = k;
                    break;
                }
            }
            
            str += "<td title='("+x.toString()+","+y.toString()+") "+this.variable[x + y * this.width].toString()+"' style='background:rgb("+colors[range][0]+","+colors[range][1]+","+colors[range][2]+")'> </td>";
        }
        str +="</tr>";
    }
    str += "</tbody></table>"
    return str;
}
