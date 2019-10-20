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
        this.destinationDomain = null;
        this.gridPosVariable = null;
        this.gridPos = [0, 0];
        this.scaleVariable = null;
        this.scale = false;
        this.numberTypeVariable = null;
        this.numberType = VariableDescription.NUMBER_TYPE_SCALAR;
    }

    get inputs()
    {
        return ["main", "secondary"];
    }
    
    get outputs()
    {
        return ["main", "latitudes", "longitudes"];
    }
    
    get parameters()
    {
        return ["gridPos", "scale", "numberType",
            "gridPosVariable", "scaleVariable", "numberTypeVariable",
            "gridPos2", "gridPos2Variable"];
    }

    async process(data_in, data_out)
    {
        try {
            var variable_in = data_in["main"].getData();
            var variable_sec = data_in["secondary"]!=null ? data_in["secondary"].getData():null;
            var variable_out;
            var latitudes;
            var longitudes;
            
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
            
            // Résolution paramètre gridPos variable secondaire
            var offsetx2=0, offsety2=0;
            if (variable_sec!=null)
            {
                if (this.gridPos2Variable!=null)
                {
                    var description = this.model.getVariableDescription(this.gridPos2Variable);
                    offsetx2 = description.offsetx;
                    offsety2 = description.offsety;
                }
                else if (Array.isArray(this.gridPos2)) 
                {
                     [offsetx2, offsety2] = this.gridPos2;
                } 
                else
                {
                    offsetx2 = offsetx;
                    offsety2 = offsety;
                }
            }
            
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

            // Projection de la variable
            if (variable_in.nbLevels>1)
            {
                if (this.sourceDomain!=null)
                {
                    var level_in = Variable.createVariable(1, this.sourceDomain.width, this.sourceDomain.height);
                    var level_out = Variable.createVariable(1, this.projection.width, this.projection.height);
                    var level_sec = variable_sec ? Variable.createVariable(1, this.sourceDomain.width, this.sourceDomain.height):null;
                    variable_out = Variable.createVariable(variable_in.nbLevels, this.projection.width, this.projection.height, true);
                    for (var k=0;k<variable_in.nbLevels;k++)
                    {
                        variable_in.copyLevel(k, level_in);
                        if (variable_sec!=null) variable_sec.copyLevel(k, level_sec);
                        this.projection.interpLatLonGridToDomain(
                            this.sourceDomain, level_in, level_out, offsetx, offsety, scale, numberType);
                        variable_out.setLevelFromVariable(k, level_out);
                    }
                }
                else if (this.destinationDomain!=null)
                {
                    var level_in = Variable.createVariable(1, this.projection.width, this.projection.height);
                    var level_out = Variable.createVariable(1, this.destinationDomain.width, this.destinationDomain.height);
                    var level_sec = variable_sec ? Variable.createVariable(1, this.projection.width, this.projection.height):null;
                    variable_out = Variable.createVariable(variable_in.nbLevels, this.destinationDomain.width, this.destinationDomain.height, true);
                    for (var k=0;k<variable_in.nbLevels;k++)
                    {
                        variable_in.copyLevel(k, level_in);
                        if (variable_sec!=null) variable_sec.copyLevel(k, level_sec);
                        this.projection.interpDomainToLatLon(
                            this.destinationDomain, level_in, level_out, offsetx, offsety, scale, numberType, level_sec, offsetx2, offsety2);
                        variable_out.setLevelFromVariable(k, level_out);
                    }
                }
                else
                {
                    throw `${this.name} : no source or destination domain set. `;
                }
            }
            else
            {
                if (this.sourceDomain!=null)
                {
                    variable_out = Variable.createVariable(0, this.projection.width, this.projection.height, false);
                    this.projection.interpLatLonGridToDomain(
                        this.sourceDomain, variable_in, variable_out, offsetx, offsety, scale, numberType, variable_sec);
                }
                else if (this.destinationDomain!=null)
                {
                    variable_out = Variable.createVariable(0, this.destinationDomain.width, this.destinationDomain.height, false);
                    this.projection.interpDomainToLatLon(
                        this.destinationDomain, variable_in, variable_out, offsetx, offsety, scale, numberType, variable_sec, offsetx2, offsety2);
                }
                else
                {
                    throw `${this.name} : no source or destination domain set. `;
                }
            }

            variable_in.copyMetadata(variable_out);
            variable_out.offsetx = offsetx;
            variable_out.offsety = offsety;
            variable_out.scale = scale;
            variable_out.number = numberType;

            data_out["main"].setData(variable_out);
            
            // Création des latitudes et longitudes
            if (this.sourceDomain!=null)
            {
                latitudes = Variable.createVariable(0, this.projection.width, this.projection.height, false);
                longitudes = Variable.createVariable(0, this.projection.width, this.projection.height, false);
                this.projection.calcLatitudesLongitudes(offsetx, offsety, latitudes, longitudes);
                latitudes.offsetx = offsetx;
                latitudes.offsety = offsety;
                longitudes.offsetx = offsetx;
                longitudes.offsety = offsety;
            }
            else if (this.destinationDomain!=null)
            {
                latitudes = Variable.createVariable(0, this.destinationDomain.width, this.destinationDomain.height, false);
                longitudes = Variable.createVariable(0, this.destinationDomain.width, this.destinationDomain.height, false);
                this.destinationDomain.calcLatitudesLongitudes(0, 0, latitudes, longitudes);
                latitudes.offsetx = 0;
                latitudes.offsety = 0;
                longitudes.offsetx = 0;
                longitudes.offsety = 0;
            }
            
            if ("initDate" in variable_out) { latitudes.initDate = variable_out.initDate; longitudes.initDate = variable_out.initDate;}
            if ("time" in variable_out) { latitudes.time = variable_out.time; longitudes.time = variable_out.time;}
            
            latitudes.description = "latitudes";
            latitudes.units = "degrees north";
            latitudes.category = VariableDescription.CAT_INTERNAL;
            latitudes.verticalPosition = VariableDescription.VERTICAL_POSITION_SURFACE;
            latitudes.number = VariableDescription.NUMBER_TYPE_SCALAR;
            latitudes.scale = 0;
            
            longitudes.description = "longitudes";
            longitudes.units = "degrees east";
            longitudes.category = VariableDescription.CAT_INTERNAL;
            longitudes.verticalPosition = VariableDescription.VERTICAL_POSITION_SURFACE;
            longitudes.number = VariableDescription.NUMBER_TYPE_SCALAR;
            longitudes.scale = 0;
    
            if (data_out["latitudes"]!=null) data_out["latitudes"].setData(latitudes);
            if (data_out["longitudes"]!=null) data_out["longitudes"].setData(longitudes);
            
            return this;
        }
        catch (e)
        {
            throw e;
        }
    }
}