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

import { Filter } from "/js/modeling/Filter.js";

export var SchumannFilter = function(p_width, p_height)
{
    Filter.call(this);
    
    this.width = p_width;
    
    this.height = p_height;
    
    // Méthodes privées du modèle
    if( typeof SchumannFilter.initialized == "undefined" ) 
    {
        SchumannFilter.prototype.filtre2DMoyenneX = function(a, v, res)
        {
            for (var y=0;y<this.height;y++)
            {
                var i = y*this.width;
                res[i] = a[i];
                for(var x=1;x<this.width-1;x++)
                {
                    var i = x+y*this.width;
                    res[i] = a[i]*(1-v)+(a[i+1]+a[i-1])*v/2;
                }
                i = this.width-1+y*this.width;
                res[i] = a[i];
            }
        }

        SchumannFilter.prototype.filtre2DMoyenneY = function(a, v, res)
        {
            for (var x=0;x<this.width;x++)
            {
                var i = x+this.width*(this.height-1);
                res[x] = a[x];
                res[i] = a[i];
            }
            for (var y=1;y<this.height-1;y++)
            {
                var i = y*this.width;
                res[i] = a[i];
                for(var x=1;x<this.width-1;x++)
                {
                    var i = x+y*this.width;
                    res[i] = a[i]*(1-v)+(a[i+this.width]+a[i-this.width])*v/2;
                }
                i = this.width-1+y*this.width;
                res[i] = a[i];
            }
        }

    }
}

SchumannFilter.prototype = Object.create(Filter.prototype);
SchumannFilter.prototype.constructor = SchumannFilter;


SchumannFilter.prototype.applyFilter2D = function (a)
{
    var tmp = [];
    this.filtre2DMoyenneX(a, 0.5, tmp);
    this.filtre2DMoyenneX(tmp, -0.5, a);

    this.filtre2DMoyenneY(a, 0.5, tmp);
    this.filtre2DMoyenneY(tmp, 0.5, a);
}

SchumannFilter.prototype.applyFilter = function (a)
{
    var k = 0;
    for (var k=0;k<a.length;k++)
    {
        this.applyFilter2D(a[k]);
    }
}