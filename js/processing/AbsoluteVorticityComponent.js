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
            
            if (f_in.nbLevels>1) throw `${this.name} : f must not be 3D data.`;
            if (m_in.nbLevels>1) throw `${this.name} : m must not be 3D data.`;
            if (U_in.nbLevels==0) throw `${this.name} : U must be 3D data.`;
            if (V_in.nbLevels==0) throw `${this.name} : V must be 3D data.`;
            
            var i = 0, j = 0;
            var u1, u2, v1, v2;
            var width = U_in.width;
            var height = U_in.height;
            var dx = this.model.dx;
            var dy = this.model.dy;
            var variable_out = Variable.createVariable(U_in.nbLevels, U_in.width, U_in.height);
            
            for (var k=0;k<U_in.nbLevels;k++)
            {
                i = U_in.width+1;
                for (j=1;j<height-1;j++)
                {
                    for (i=1;i<width-1;i++)
                    {
                        u1 = U_in.get3(i,j,k)*m_in.get2(i,j);
                        u2 = U_in.get3(i,j+1,k)*m_in.get2(i,j+1);
                        v1 = V_in.get3(i+1,j,k)*m_in.get2(i+1,j);
                        v2 = V_in.get3(i,j,k)*m_in.get2(i,j);
                        variable_out.set3(i, j, k, (v1-v2)/dx-(u1-u2)/dy + f_in.get2(i,j));
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