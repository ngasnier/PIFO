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
import { Model } from "../modeling/Model.js";

/**
 * Dérivation du tourbillon absolu à partir de la variable tourbillon
 * 
 */
export class AbsoluteVorticityComponent extends Component {
    constructor()
    {
        super();
    }
    
    get inputs()
    {
        return ["U", "V", "f", "m"];
    }
    
    get outputs()
    {
        return ["main"];
    }
    
    async process(data_in, data_out)
    {
        try
        {
/*            var ps_in = data_in["ps"].getData();
            var tourbillon_in = data_in["tourbillon"].getData();*/
            var U_in = data_in["U"].getData();
            var V_in = data_in["V"].getData();
            var f_in = data_in["f"].getData();
            var m_in = data_in["m"].getData();
            
            if (U_in==null) throw `${this.name} : no u wind data.`;
            if (V_in==null) throw `${this.name} : no v wind data.`;
            if (f_in==null) throw `${this.name} : no coriolis factor data.`;
            if (m_in==null) throw `${this.name} : no map scaling factor data.`;
            
            if (f_in.nbLevels>0) throw `${this.name} : f must not be 3D data.`;
            if (m_in.nbLevels>0) throw `${this.name} : m must not be 3D data.`;
            if (U_in.nbLevels==0) throw `${this.name} : U must be 3D data.`;
            if (V_in.nbLevels==0) throw `${this.name} : V must be 3D data.`;
            
            var i = 0;
            var u1, u2, v1, v2;
            var width = U_in.width;
            var height = U_in.height;
            var dx = this.model.dx;
            var dy = this.model.dy;
            var variable_out = Variable.createVariable(U_in.nbLevels, U_in.width, U_in.height);
            
            for (var k=0;k<U_in.nbLevels;k++)
            {
                i = U_in.width+1;
                for (var y=1;y<height-1;y++,i+=2)
                {
                    for (var x=1;x<width-1;x++,i++)
                    {
                        u1 = U_in[k][i]*m_in[i];
                        u2 = U_in[k][i+width]*m_in[i+width];
                        v1 = V_in[k][i+1]*m_in[i+1];
                        v2 = V_in[k][i]*m_in[i];
                        variable_out[k][i] = (v1-v2)/dx-(u1-u2)/dy + f_in[i];
                    }
                }
            }

            Variable.copyMetadata(U_in, variable_out);
            variable_out.offsetx = 1;
            variable_out.offsety = 1;
            
            data_out["main"].setData(variable_out);
            
            return this;
        }
        catch (e)
        {
            throw e;
        }
    }
}