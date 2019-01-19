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

import { Variable } from "../modeling/Variable.js";

/**
 * Lecture d'une variable au format texte WGRIB.
 * 
 * @returns {undefined}
 */
export var WGRIBFieldReader = function()
{

}

WGRIBFieldReader.read = function (pData, pVariable=null)
{
    var lines = pData.split('\n');
    var dims = lines[0].split(' ');
    var data = pVariable;
    if (data==null) data = Variable.createVariable(1, Number(dims[0]), Number(dims[1]), false);
    for (var i=1;i<lines.length;i++)
    {
        data[i-1] = Number(lines[i]);
    }
    return data;
}
