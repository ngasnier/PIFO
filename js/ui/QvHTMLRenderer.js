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

export var QvHTMLRenderer = function()
{
    this.width = 0;
    this.height = 0;
    this.variable = [];
}

QvHTMLRenderer.prototype.render = function()
{
    var color=0, i;
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
        for(x=0;x<this.width;x++)
        {
            i = x+y*this.width;

            color = Math.floor(this.variable[i]*50*255);
            if (color>255) color = 255;
            
            str += "<td title='("+x.toString()+","+y.toString()+") "+this.variable[x + y * this.width].toString()+"' style='background:rgb("+color+","+color+","+color+")'> </td>";
        }
        str +="</tr>";
    }
    str += "</tbody></table>"
    return str;
}
