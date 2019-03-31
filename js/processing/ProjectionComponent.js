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
import { VariableDescription } from "../modeling/VariableDescription.js";

/**
 * Interpole les données lat lon vers une projection
 * @type type
 */
export class ProjectionComponent extends Component {
    /**
     * 
     * @returns {undefined}
     */
    constructor()
    {
        super();
        this.projection = null;
        this.sourceDomain = null;
        this.gridPosVariable = null;
        this.gridPos = [0, 0];
        this.scaleVariable = null;
        this.scale = false;
        this.numberTypeVariable = null;
        this.numberType = VariableDescription.NUMBER_TYPE_SCALAR;
    }

    get inputs()
    {
        return ["main"];
    }
    
    get outputs()
    {
        return ["main"];
    }
    
    get parameters()
    {
        return ["gridPos", "scale", "numberType",
            "gridPosVariable", "scaleVariable", "numberTypeVariable"];
    }

    async process(data_in, data_out)
    {
        try {
            var variable_in = data_in["main"].getData();
            var variable_out;
            
            // Résolution paramètre gridPos
            var offsetx, offsety;
            if (this.gridPos==null && this.gridPosVariable==null) throw `${this.name} : parameter gridPos not set.`;
            if (this.gridPosVariable!=null)
            {
                var description = this.model.getVariableDescription(this.gridPosVariable);
                offsetx = description.offsetx;
                offsety = description.offsety;
            }
            else if (Array.isArray(this.gridPos)) 
            {
                 [offsetx, offsety] = this.gridPos;
            } 
            else
                throw `${this.name} : invalid parameter gridPos.`;
            
            // Résolution paramètre scale
            var scale;
            if (this.scale==null && this.scaleVariable==null) throw `${this.name} : parameter 'scale' not set.`;
            if (this.scaleVariable!=null)
            {
                var description = this.model.getVariableDescription(this.scaleVariable);
                scale = description.scale;
            }
            else if ((typeof this.scale)=="boolean") 
            {
                scale = this.scale;
            }
            else
                throw `${this.name} : invalid type for parameter scale.`;
            
            // Résolution paramètre numberType
            var numberType;
            if (this.numberType==null && this.numberTypeVariable) throw `${this.name} : parameter 'numberType' not set.`;
            if (this.numberTypeVariable!=null)
            {
                var description = this.model.getVariableDescription(this.numberTypeVariable);
                numberType = description.number;
            }
            else if ((typeof this.numberType)=="string") 
            {
                numberType = this.numberType;
            }
            else
                throw `${this.name} : invalid type for parameter 'numberType'. `;
                       
            if (variable_in.nbLevels>0)
            {
                variable_out = Variable.createVariable(variable_in.nbLevels, this.projection.width, this.projection.height, true);
                for (var k=0;k<variable_in.nbLevels;k++)
                {
                    this.projection.interpLatLonGridToDomain(
                        this.sourceDomain, variable_in[k], variable_out[k], offsetx, offsety, scale, numberType);
                }
            }
            else
            {
                variable_out = Variable.createVariable(0, this.projection.width, this.projection.height, false);
                this.projection.interpLatLonGridToDomain(
                    this.sourceDomain, variable_in, variable_out, offsetx, offsety, scale, numberType);            
            }

            Variable.copyMetadata(variable_in, variable_out);
            variable_out.offsetx = offsetx;
            variable_out.offsety = offsety;
            variable_out.scale = scale;
            variable_out.number = numberType;

            data_out["main"].setData(variable_out);
            
            return this;
        }
        catch (e)
        {
            throw e;
        }
    }
}