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
 * <p>Le filtre fonctionne de manière incrémentale sur les champs 
 * pronostiques du modèle selon la formule :</p>
 * <pre><code>
 * X_filtre(t) = X(t) + epsilon*[X_filtre(t-1) - 2X(t) + X(t+1)]
 * </code></pre>
 * <p>Paramètres :
 * <ul>
 * <li>epsilon : coefficient du filtre (epsilon = 0.5*nu) supposé entre 0 et 1. 
 * Défaut : 0.005</li>
 * </ul>
 * </p>
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
        if (this.model.time!=0)
        {
            var variables = this.model.getVariablesDescriptions();
            for (var v in variables)
            {
                if (variables[v].category==VariableDescription.CAT_PRONOSTIC)
                {
                    var X = this.model.getVariable(variables[v].name);
                    var X_t = this.model.getVariable(variables[v].name+"_t");
                    var X_tmp = this.model.getVariable(variables[v].name+"_tmp");
                    Variable.a_bc(X_t, X, -2, X_tmp);              // X(t-1)-2X(t)
                    Variable.a_bc(X, X_tmp, this.epsilon, X_tmp);  // X(t)+epsilon*(X(t-1)-2X(t))
                    //if (variables[v].name=="U") console.log(this.model.time, "X(t-1)=", X_t[0][1337], "X(t)=",X[0][1337], "X_tmp=", X_tmp[0][1337]);
                }
            }
        }
    }
    
    /**
     * Action appelée après le calcul de l'intégration temporelle
     * @returns {undefined}
     */
    postStep()
    {
        if (this.model.time!=0)
        {
            var variables = this.model.getVariablesDescriptions();
            for (var v in variables)
            {
                if (variables[v].category==VariableDescription.CAT_PRONOSTIC)
                {
                    var X = this.model.getVariable(variables[v].name);
                    var X_t = this.model.getVariable(variables[v].name+"_t");
                    var X_tmp = this.model.getVariable(variables[v].name+"_tmp");                
                    Variable.a_bc(X_tmp, X_t, this.epsilon, X);       // X(t) = X_tmp + epsilon*X(t+1)
                    //if (variables[v].name=="U") console.log(this.model.time, "X(t+1)=", X_t[0][1337], "X(t)=",X[0][1337], "X_tmp=", X_tmp[0][1337]);
                }
            }
        }
    }    
}