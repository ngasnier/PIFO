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
 * Transformation du champ par une simple opération arithmétique
 * @type type
 */
export class ArithmeticComponent extends Component {
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
    
    get inputs()
    {
        return ["main"];
    }
    
    get outputs()
    {
        return ["main"];
    }

    process(data_in, data_out)
    {
        try {
            var input_var = data_in["main"].getData();
            var data = Variable.clone(input_var);
            switch (this.operation)
            {
                case "+":
                    Variable.addConst(data, this.value, data);
                    break;
                case "-":
                    Variable.addConst(data, -this.value, data);
                    break;
                case "*":
                    Variable.mulConst(data, this.value, data);
                    break;
                case "/":
                    Variable.mulConst(data, 1/this.value, data);
                    break;
                case "log":
                    for (var i=0;i<input_var.data.length;i++)
                    {
                        data.data[i] = Math.log(input_var.data[i]);
                    }
                    break;
                case "exp":
                    for (var i=0;i<input_var.data.length;i++)
                    {
                        data.data[i] = Math.exp(input_var.data[i]);
                    }
                    break;
                default:
                    throw `${this.name} : invalid operation '${this.operation}'`;
            }
            
            input_var.copyMetadata(data);
            
            data_out["main"].setData(data);

            return this;
        }
        catch (e)
        {
            throw e;
        }
    }
}