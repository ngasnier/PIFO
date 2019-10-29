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
            
            variable_in.copyMetadata(variable_out);
            variable_out.levels = this.sigmaLevels.slice();
            
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
        var i = 0, j = 0;
        var width = vout.width;
        var height = vout.height;
        var p = 0;
        var pa, pb;
        var found = false;
        for (var k=0;k<this.sigmaLevels.length;k++)
        {
            for (j=0;j<height;j++)
            {
                for(i=0;i<width;i++)
                {
                    p = this.sigmaLevels[k] * surfacePressure.get2(i,j);

                    found = false;
                    for (var l=1;l<this.pressureLevels.length;l++)
                    {
                        pa = this.pressureLevels[l-1];
                        pb = this.pressureLevels[l];
                        
                        if (p>=pa && p<pb)
                        {                               
                            vout.set3(i, j, k, vin.get3(i,j,l-1)+(p-pa)*(vin.get3(i,j,l)-vin.get3(i,j,l-1))/(pb-pa));
                            found = true;
                            break;
                        }
                    }

                    if (!found)
                    {
                        
                        
                        if (p<this.pressureLevels[0]) {
                            vout.set3(i, j, k, vin.get3(i,j,0)); 
                        } else {
                            vout.set3(i, j, k, vin.get3(i,j,this.pressureLevels.length-1));
                        }

                    }
                }
            }
        }
    }

    sigmaToPressureLevel(vin, surfacePressure, vout)
    {
        var i = 0, j = 0;
        var width = vout.width;
        var height = vout.height;
        var s, val, sa, sb;
        var found = false;
        var nbLevels = vin.nbLevels;
        for (var k=0;k<this.pressureLevels.length;k++)
        {
            for (j=0;j<height;j++)
            {
                for(i=0;i<width;i++)
                {
                    s = this.pressureLevels[k] / surfacePressure.get2(i,j);
                    val = 0;
                    found = false;
                    for (var z=1;z<nbLevels;z++)
                    {
                        sa = this.sigmaLevels[z-1];
                        sb = this.sigmaLevels[z];
                        if (s>=sa && s<sb)
                        {
                            val = vin.get3(i,j,z-1)+(s-sa)*(vin.get3(i,j,z)-vin.get3(i,j,z-1))/(sb-sa);
                            found=true;
                            break;
                        }
                    }
                    if (!found)
                    {
                        if (s<=this.sigmaLevels[0])
                            val = vin.get3(i, j, 0);
                        else
                            val = vin.get3(i, j, vin.length-1);
                    }
                    vout.set3(i, j, k, val);
                }
            }
        }
    } 
}