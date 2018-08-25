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
 * Interpole les valeurs de z500 pour le modèle et inversement.
 * @returns {undefined}
 */
export var GeopotentialInterpolator = function ()
{  
    
}
    
GeopotentialInterpolator.prototype.heightToModel = function(g500, phi)
{
    for (var i=0;i<g500.length;i++)
    {
        phi[i] = Model.g*g500[i];
    }
}

GeopotentialInterpolator.prototype.modelToHeight = function(phi, g500)
{
    for (var i=0;i<phi.length;i++)
    {
         g500[i] = phi[i]/Model.g;
    }
}


