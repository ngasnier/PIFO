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

export var FieldHTMLRenderer = function()
{
    this.width = 0;
    this.height = 0;
    this.variable = [];
}


FieldHTMLRenderer.prototype.render = function()
{
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
            str += "<td title='("+x.toString()+","+y.toString()+") ["+(x + y * this.width)+"] "+this.variable[x + y * this.width].toString()+"'>" + this.variable[x + y * this.width].toString() + "</td>";
        }
        str += "</tr>";
    }
    str += "</tbody></table>"
    return str;
}


