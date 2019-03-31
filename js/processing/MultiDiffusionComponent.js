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

export class MultiDiffusionComponent extends Component {
    constructor()
    {
        super();
        
        this.outputList = [];
    }
    
    get inputs()
    {
        return ["main"];
    }
    
    get outputs()
    {
        return this.outputList;
    }

    async process(data_in, data_out)
    {
        try
        {
            var variable_in = data_in["main"].getData();
            
            for (var k in this.outputList)
            {
                data_out[this.outputList[k]].setData(variable_in);
            }
            
            return this;
        }
        catch (e)
        {
            throw e;
        }
    }
}