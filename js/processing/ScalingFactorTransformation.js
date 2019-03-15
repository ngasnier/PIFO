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
export class ScalingFactorTransformation extends DataTransformation {
    /**
     * 
     * @returns {undefined}
     */
    constructor()
    {
        super();
        this.projection = null;
    }

    /**
     * Projette la variable data_in de description description dans le 
     * domaine de la projection.
     * @param {type} data_in
     * @returns {undefined} data_out
     */
    transform(description, data_in)
    {
        var data_out = Variable.createVariable(0, this.model.projection.width, this.model.projection.height, false);
        this.model.projection.getScaleFactors(this.model.getVariable("latitudes"), this.model.getVariable("longitudes"), data_out);
        return data_out;
    }
}