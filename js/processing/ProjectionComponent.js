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
        return ["modelVariable"];
    }

    process(data_in, data_out)
    {
        try {
            var variable_in = data_in["main"].getData();
            var variable_out;
            if (this.modelVariable==null) throw `${this.name} : parameter modelVariable not set.`;
            var description = this.model.getVariableDescription(this.modelVariable);
            if (variable_in.nbLevels>0)
            {
                variable_out = Variable.createVariable(variable_in.nbLevels, this.projection.width, this.projection.height, true);
                for (var k=0;k<data_in.length;k++)
                {
                    this.projection.interpLatLonGridToDomain(
                        this.sourceDomain, variable_in[k], variable_out[k], description.offsetx, description.offsety, description.scale, description.number);
                }
            }
            else
            {
                variable_out = Variable.createVariable(0, this.projection.width, this.projection.height, false);
                this.projection.interpLatLonGridToDomain(
                    this.sourceDomain, variable_in, variable_out, description.offsetx, description.offsety, description.scale, description.number);
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
}