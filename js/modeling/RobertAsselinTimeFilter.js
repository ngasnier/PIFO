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

import { VariableDescription } from "./VariableDescription.js";
import { Variable } from "./Variable.js";
import { TimeFilter } from './TimeFilter.js';

/**
 * Filtre temporel utilisant l'algorithme de Robert-Asselin.
 * 
 * @type type
 */
export class RobertAsselinTimeFilter extends TimeFilter {
    /**
     * 
     * @returns {undefined}
     */
    constructor()
    {
        super();
        this.epsilon = 0.005;
    }
    
    /**
     * 
     * @returns {Array}
     */
    getVariablesDescriptions()
    {
        var variables = this._model.getVariablesDescriptions();
        var reg_vars = [];
        for (var v in variables)
        {
            if (variables[v].category==VariableDescription.CAT_PRONOSTIC)
            {
                reg_vars.push(Object.assign(new VariableDescription(),{
                    category: VariableDescription.CAT_INTERNAL, 
                    name: variables[v].name+"_tmp", 
                    description: variables[v].name+" tmp filter", 
                    units: "", 
                    offsetx: variables[v].offsetx,
                    offsety: variables[v].offsety,
                    scale: variables[v].scale,
                    verticalPosition: variables[v].verticalPosition,
                    number: variables[v].number
                }));
            }
        }
        return reg_vars;
    }
    
    /**
     * Initialise le filtre.
     * 
     * ex : enregistrement de variables auprès du modèle etc...
     * @returns {undefined}
     */
    setup()
    {
    }

    /**
     * Action appelée avant le calcul de l'intégration temporelle
     * @returns {undefined}
     */
    preStep()
    {
        var variables = this.model.getVariablesDescriptions();
        for (var v in variables)
        {
            if (variables[v].category==VariableDescription.CAT_PRONOSTIC)
            {
                var vv = this.model.getVariable(variables[v].name);
                var var_t = this.model.getVariable(variables[v].name+"_t");
                var var_tmp = this.model.getVariable(variables[v].name+"_tmp");
                Variable.a_bc(var_t, vv, -2, var_tmp);
                Variable.a_bc(vv, var_tmp, this.epsilon, var_tmp);
            }
        }
    }
    
    /**
     * Action appelée après le calcul de l'intégration temporelle
     * @returns {undefined}
     */
    postStep()
    {
        var variables = this.model.getVariablesDescriptions();
        for (var v in variables)
        {
            if (variables[v].category==VariableDescription.CAT_PRONOSTIC)
            {
                var vv = this.model.getVariable(variables[v].name);
                var var_t = this.model.getVariable(variables[v].name+"_t");
                var var_tmp = this.model.getVariable(variables[v].name+"_tmp");
                Variable.a_bc(var_tmp, var_t, this.epsilon, vv);
            }
        }
    }    
}