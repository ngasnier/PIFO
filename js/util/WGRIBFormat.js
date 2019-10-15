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
 * Lecture/écriture d'une variable au format texte WGRIB.
 * 
 * @returns {undefined}
 */
export class WGRIBFormat
{
    /**
     * 
     * @returns {undefined}
     */
    constructor()
    {
        
    }
    
    /**
     * 
     * @param {type} pData
     * @param {type} pVariable
     * @returns {@var;pVariable|Array|Float64Array|undefined}
     */
    read(pData, pVariable=null)
    {
        var lines = pData.split('\n');
        var dims = lines[0].split(' ');
        var var_data = pVariable;
        if (var_data==null) var_data = Variable.createVariable(0, Number(dims[0]), Number(dims[1]));
        var data = var_data.data;
        for (var i=1;i<lines.length;i++)
        {
            data[i-1] = Number(lines[i]);
        }
        return var_data;
    }
    
    /**
     * 
     * @param {type} p_variable
     * @returns {str}
     */
    write(p_variable)
    {
        if ("nbLevels" in p_variable && p_variable.nbLevels>1) throw "WGRIBFileWriter : cannot write 3D variable. Please provide 2D parts only.";
        var str;
        if ("width" in p_variable && "height" in p_variable)
            str = p_variable.width.toString()+" "+p_variable.height.toString()+"\n";
        else if (Array.isArray(p_variable))
            str = p_variable.length.toString()+" 1\n";
        else
            str = p_variable.data.length.toString()+" 1\n";
        if (Array.isArray(p_variable))
        {
            for (var i = 0; i < p_variable.length; i++)
            {   
                str += p_variable[i].toString()+"\n";
            }
        }
        else
        {
            for (var i = 0; i < p_variable.data.length; i++)
            {   
                str += p_variable.data[i].toString()+"\n";
            }
        }
        return str;
    }
}

