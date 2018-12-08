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

/**
 * Interpolation temporelle de variables.
 * @returns {TimeInterpolator}
 */
export var TimeInterpolator = function()
{   
    this.variable = [];
    
    this.times = [];
}

/**
 * Interpole linéairement entre deux variables a et b définies à t1 et t2.
 * @param {type} a 
 * @param {type} b
 * @param {type} t1
 * @param {type} t2
 * @param {type} t définit l'instant souhaité
 * @param {type} res
 * @returns {undefined}
 */
TimeInterpolator.prototype.linint = function(a, b, t1, t2, t, res)
{
    var coef = (t - t1) / (t2 - t1);
    if (a.length>0 && (a[0].constructor===Array || a[0].constructor===Float64Array))
    {
        for (var k=0;k<a.length;k++)
        {
            for (var i = 0; i < a[k].length; i++)
            {
                res[k][i] = (1 - coef) * a[k][i] + coef * b[k][i];
            }
        }
    }
    else
    {
        for (var i = 0; i < a.length; i++)
        {
            res[i] = (1 - coef) * a[i] + coef * b[i];
        }
    }
}

/**
 * 
 * @returns {undefined}
 */
TimeInterpolator.prototype.interp = function(time, res)
{
    var t;
    var tprec = this.times[0];
    if (this.times.length>1)
    {
        for (var i = 1; i < this.times.length; i++)
        {
            t = this.times[i];
            if ( time >= tprec && time < t)
            {
                this.linint(this.variable[i - 1], this.variable[i], tprec, t, time, res);
                return;
            }
            tprec = t;
        }
    }
    else
    {
        if (time==0)
        {
            for (var i = 0; i < this.variable[0].length; i++)
            {
                res[i] = this.variable[0][i];
            }
        }
    }
}


TimeInterpolator.prototype.addTime = function(p_time)
{
    var t = this.times.length;
    this.times[t] = p_time;
    this.variable[t] = [];
}

TimeInterpolator.prototype.getTimeIndex = function(time)
{
    var tprec = this.times[0];
    if (this.times.length>1)
    {
        for (var i = 1; i < this.times.length; i++)
        {
            if ( time >= tprec && time < this.times[i])
            {
                return i-1;
            }
            tprec = this.times[i];
        }
        return this.times.length-1;
    }
    else
    {
        return 0;
    }
}