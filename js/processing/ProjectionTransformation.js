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
 * Interpole les données lat lon vers une projection
 * @type type
 */
export class ProjectionTransformation extends DataTransformation {
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

    /**
     * Projette la variable data_in de description description dans le 
     * domaine de la projection.
     * @param {type} data_in
     * @returns {undefined} data_out
     */
    transform(description, data_in)
    {
        var data_out;
        if (data_in.nbLevels>0)
        {
            data_out = Variable.createVariable(data_in.nbLevels, this.projection.width, this.projection.height, true);
            for (var k=0;k<data_in.length;k++)
            {
                this.projection.interpLatLonGridToDomain(
                    this.sourceDomain, data_in[k], data_out[k], description.offsetx, description.offsety, description.scale, description.number);
            }
        }
        else
        {
            data_out = Variable.createVariable(0, this.projection.width, this.projection.height, false);
            this.projection.interpLatLonGridToDomain(
                this.sourceDomain, data_in, data_out, description.offsetx, description.offsety, description.scale, description.number);
        }
        
        if ("levels" in data_in) data_out.levels = data_in.levels;
        
        return data_out;
    }
}