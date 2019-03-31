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

/**
 * Interpolation verticale sur niveaux sigma
 * @type type
 */
export class SigmaLevelInterpolationComponent extends Component {
    /**
     * 
     * @returns {undefined}
     */
    constructor()
    {
        super();
                
        this.mode = 0;
        
        this.pressureLevels = [];
        
        this.sigmaLevels = [];
    }
    
    get inputs()
    {
        return ["main", "surface_pressure"];
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
            var pressure = data_in["surface_pressure"].getData();
            var variable_out = Variable.createVariable(this.sigmaLevels.length, variable_in.width, variable_in.height, true);
            
            if (this.mode==0)
                this.pressureToSigmaLevel(variable_in, pressure, variable_out);
            else
                this.sigmaToPressureLevel(variable_in, pressure, variable_out);
            
            Variable.copyMetadata(variable_in, variable_out);
            
            data_out["main"].setData(variable_out);
            
            return this;
        }
        catch (e)
        {
            throw e;
        }
    }
    
    pressureToSigmaLevel(vin, surfacePressure, vout)
    {        
        var i = 0;
        var p = 0;
        var pa, pb;
        var found = false;
        for (var k=0;k<this.sigmaLevels.length;k++)
        {
            for(var i=0;i<vout[k].length;i++)
            {
                p = this.sigmaLevels[k] * surfacePressure[i];

                found = false;
                for (var l=1;l<this.pressureLevels.length;l++)
                {
                    pa = this.pressureLevels[l-1];
                    pb = this.pressureLevels[l];
                    if (p>=pa && p<pb)
                    {                               
                        vout[k][i] = vin[l-1][i]+(p-pa)*(vin[l][i]-vin[l-1][i])/(pb-pa);
                        found = true;
                        break;
                    }
                }
                
                if (!found)
                {
                    if (p<this.pressureLevels[0]) {
                        vout[k][i] = vin[0][i]; 
                    } else {
                        vout[k][i] = vin[this.pressureLevels.length-1][i];
                    }
                    
                }
            }
        }
    }

    sigmaToPressureLevel(vin, surfacePressure, vout)
    {
        var s, val, sa, sb;
        var found = false;
        for (var k=0;k<this.pressureLevels.length;k++)
        {
            for(var i=0;i<vout.length;i++)
            {
                s = this.pressureLevels[k] / surfacePressure[i];
                val = 0;
                found = false;
                for (var z=1;z<vin.length;z++)
                {
                    sa = this.sigmaLevels[z-1];
                    sb = this.sigmaLevels[z];
                    if (s>=sa && s<sb)
                    {
                        val = vin[z-1][i]+(s-sa)*(vin[z][i]-vin[z-1][i])/(sb-sa);
                        found=true;
                        break;
                    }
                }
                if (!found)
                {
                    if (s<=this.sigmaLevels[0])
                        val = vin[0][i];
                    else
                        val = vin[vin.length-1][i];
                }
                vout[k][i] = val;
            }
        }
    } 
}