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

export var WindHTMLRenderer = function()
{
    this.width = 0;
    this.height = 0;
    this.U = [];
    this.V = [];
}

WindHTMLRenderer.WIND_COLORS = [[255, 255, 255],//0
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


WindHTMLRenderer.prototype.render=function()
{
    var symbols = ["&rarr;", "&#8599;", "&uarr;", "&#8598;", "&larr;", "&#8601;", "&darr;", "&#8600;", "&infin;"];
    var colors = WindHTMLRenderer.WIND_COLORS;
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
            var angle = 0;
            var w = Math.sqrt(this.U[i]*this.U[i]+this.V[i]*this.V[i])*3.6;
            var scale = 0;
            if (w>150) w=150;
            if (w<90) scale = Math.floor(w/5);
            else scale = 18+Math.floor((w-90)/10);
            if (scale>24) scale = 24;
            if (isNaN(scale)) scale = 24;
            var r = colors[scale][0];
            var g = colors[scale][1];
            var b = colors[scale][2];

            if (w>0.1)
            {
                if (this.U[i]>0 && this.V[i]>=0) 
                    angle = Math.atan(this.V[i]/this.U[i]);
                else if (this.U[i]>0 && this.V[i]<0) 
                    angle = Math.atan(this.V[i]/this.U[i])+2*Math.PI;
                else if (this.U[i]<0) 
                    angle = Math.atan(this.V[i]/this.U[i])+Math.PI;
                else if (this.U[i]==0 && this.V[i]>0) 
                    angle = Math.PI/2;
                else if (this.U[i]==0 && this.V[i]<0) 
                    angle = 3*Math.PI/2;
            
                angle = Math.floor(angle/(2*Math.PI) * 8) % 8;
                if (isNaN(angle)) angle = 8;
                str += "<td style='background:rgb("+r+","+g+","+b+")'>"+symbols[angle]+"</td>";
            }
            else
            {
                str += "<td>0</td>";
            }
        }
        str +="</tr>";
    }
    str += "</tbody></table>"
    return str;
}