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

export class ArithmeticTransformation extends DataTransformation {
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
        switch (this.operation)
        {
            case "+":
                Variable.addConst(data_out, this.value, data_out);
                break;
            case "-":
                Variable.addConst(data_out, -this.value, data_out);
                break;
            case "*":
                Variable.mulConst(data_out, this.value, data_out);
                break;
            case "/":
                Variable.mulConst(data_out, 1/this.value, data_out);
                break;
        }
        
        return data_out;
    }
}