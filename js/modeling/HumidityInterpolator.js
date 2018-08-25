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

import { Model } from '/js/modeling/Model.js';

/**
 * Conversions d'humidité
 * @returns {undefined}
 */
export var HumidityInterpolator = function ()
{  
    
}

HumidityInterpolator.prototype.rhToSpecific = function(qv, tmp)
{
    var tt, psat;
    for (var i=0;i<qv.length;i++)
    {
        tt = 472.68/tmp[i]; 
        psat = Math.exp(23.3265 - 3802.7/(tmp[i]) - tt*tt);
        qv[i] = 0.622*psat*(qv[i]/100.0)/(101325-psat*(qv[i]/100.0));
    }    
}