/* 
 * Copyright (C) 2019 Nicolas GASNIER (http://www.meteo-blois.fr/contact/)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */


import { Component } from "./Component.js";
import { Variable } from "../modeling/Variable.js";

export class HumidityComponent extends Component {
    constructor()
    {
        super();
    }
    
    get inputs()
    {
        return ["main", "temperature"];
    }
    
    get outputs()
    {
        return ["main"];
    }
    
    async process(data_in, data_out)
    {
        try
        {
            var variable_in = data_in["main"].getData();
            var tmp_in = data_in["temperature"].getData();
            
            if (variable_in==null) throw `${this.name} : no data data.`;
            if (tmp_in==null) throw `${this.name} : no temperature data.`;
            
            var variable_out;
            if (variable_in.nbLevels>0) 
            {
                variable_out = Variable.createVariable(variable_in.nbLevels, variable_in.width, variable_in.height, true);
                for (var k=0;k<variable_in.nbLevels;k++)
                {
                    this.rhToSpecific(variable_in[k], tmp_in[k], variable_out[k]);
                }
            }
            else
            {
                variable_out = Variable.createVariable(variable_in.nbLevels, variable_in.width, variable_in.height, false);
                this.rhToSpecific(variable_in, tmp_in, variable_out);
            }            
                       
            Variable.copyMetadata(variable_in, variable_out);
            
            data_out["main"].setData(variable_out);
            
            return this;
        }
        catch (e)
        {
            throw e;
        }
    }
    
    rhToSpecific(rh, tmp, qv)
    {
        var tt, psat;
        for (var i=0;i<qv.length;i++)
        {
            tt = 472.68/tmp[i]; 
            psat = Math.exp(23.3265 - 3802.7/(tmp[i]) - tt*tt);
            qv[i] = 0.622*psat*(rh[i]/100.0)/(101325-psat*(rh[i]/100.0));
        }    
    }    
}