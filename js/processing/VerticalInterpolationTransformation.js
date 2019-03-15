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


import { DataTransformation } from "./DataTransformation.js";
import { Variable } from "../modeling/Variable.js";

/**
 * Transformation du champ par une simple opération arithmétique
 * @type type
 */
export class VerticalInterpolationTransformation extends DataTransformation {
    /**
     * 
     * @returns {undefined}
     */
    constructor()
    {
        super();
        this.operation = "";
        this.value = 0;
    }
    
    /**
     * 
     * @param {type} description
     * @param {type} data_in
     * @returns {undefined}
     */
    transform(description, data_in)
    {
        var data_out = Variable.clone(data_in);
        
        this.inputLevels = [];
    
        this.sigmaLevels = [];
    
        this.surfacePressure = [];
        
        return data_out;
    }

    VerticalInterpolator.prototype.interp = function(vin, vout)
    {
        var i = 0;
        var p = 0;
        var pa, pb;
        var found = false;
        for (var k=0;k<this.sigmaLevels.length;k++)
        {
            for(var i=0;i<vout[k].length;i++)
            {
                p = this.sigmaLevels[k] * this.surfacePressure[i];

                found = false;
                for (var l=1;l<this.inputLevels.length;l++)
                {
                    pa = this.inputLevels[l-1];
                    pb = this.inputLevels[l];
                    if (p>=pa && p<pb)
                    {                               
                        vout[k][i] = vin[l-1][i]+(p-pa)*(vin[l][i]-vin[l-1][i])/(pb-pa);
                        found = true;
                        break;
                    }
                }
                if (!found)
                {
                    if (p<this.inputLevels[0])
                        vout[k][i] = vin[0][i];
                    else
                        vout[k][i] = vin[this.inputLevels.length-1][i];
                }
            }
        }
    }

    VerticalInterpolator.prototype.modelToPressureLevel = function(vin, pressure, vout)
    {
        var s, geop, sa, sb;
        var found = false;
        for(var i=0;i<vout.length;i++)
        {
            s = pressure / this.surfacePressure[i];
            geop = 0;
            found = false;
            for (var z=1;z<vin.length;z++)
            {
                sa = this.sigmaLevels[z-1];
                sb = this.sigmaLevels[z];
                if (s>=sa && s<sb)
                {
                    geop = vin[z-1][i]+(s-sa)*(vin[z][i]-vin[z-1][i])/(sb-sa);
                    found=true;
                    break;
                }
            }
            if (!found)
            {
                if (s<=this.sigmaLevels[0])
                    geop = vin[0][i];
                else
                    geop = vin[vin.length-1][i];
            }
            vout[i] = geop;
        }
    }    
}