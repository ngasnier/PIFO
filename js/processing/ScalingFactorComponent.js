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
export class ScalingFactorComponent extends Component {
    /**
     * 
     * @returns {undefined}
     */
    constructor()
    {
        super();
       
        this.done = false;
    }
    
    async setup()
    {
        this.done = false;
    }
    
    
    get outputs()
    {
        return ["main"];
    }
    
    async process(data_in, data_out)
    {
        try {
            if (!this.done)
            {
                var data = Variable.createVariable(0, this.model.projection.width, this.model.projection.height, false);
                this.model.projection.getScaleFactors(this.model.getVariable("latitudes"), this.model.getVariable("longitudes"), data);
                data.time = 0;
                data_out["main"].setData(data);
                this.done = true;
            }
            return this;
        }
        catch (e)
        {
            throw e;
        }
    }
}