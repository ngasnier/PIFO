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
import { TimeIntegrator } from "./TimeIntegrator.js";

/**
 * 
 * @type type
 */
export class LeapFrogTimeIntegrator extends TimeIntegrator {
    /**
     * 
     * @returns {undefined}
     */
    constructor()
    {
        super();
    }
    
    /**
     * 
     * @returns {Array}
     */
    getVariablesDescriptions()
    {
        // Enregistre les variables nécessaires
        var variables = this._model.getVariablesDescriptions();
        var reg_vars = [];
        for (var v in variables)
        {
            if (variables[v].category==VariableDescription.CAT_PRONOSTIC)
            {
                reg_vars.push(Object.assign(new VariableDescription(),{
                    "category": VariableDescription.CAT_INTERNAL, 
                    "name": variables[v].name+"_tdcy", 
                    "description": variables[v].name+" tendency", 
                    "units": "", 
                    "verticalPosition": variables[v].verticalPosition,
                    "number": variables[v].number
                }));
                
                reg_vars.push(Object.assign(new VariableDescription(),{
                    "category": VariableDescription.CAT_INTERNAL, 
                    "name": variables[v].name+"_t", 
                    "description": variables[v].name+" at t-dt", 
                    "units": "", 
                    "verticalPosition": variables[v].verticalPosition,
                    "number": variables[v].number
                }));
            }
        }
        
        return reg_vars;
    }
    
    /**
     * 
     * @returns {undefined}
     */
    init()
    {
    }
    
    /**
     * 
     * @returns {undefined}
     */
    step()
    {
        this.calcTendencies();
        
        if (this.model.time==0)
        {
            this.stepEuler();
        }
        else
        {
            this.stepLeapFrog();
        }
    }
    
    /**
     * 
     * @returns {undefined}
     */
    finalizeStep()
    {
        var variables = this._model.getVariablesDescriptions();
        for (var v in variables)
        {
            if (variables[v].category==VariableDescription.CAT_PRONOSTIC)
            {
                var tmp = this.model.getVariable(variables[v].name+"_t");
                this.model.setVariable(variables[v].name+"_t", this.model.getVariable(variables[v].name));
                this.model.setVariable(variables[v].name, tmp);
            }
        }
    }

    /**
     * Calcule les dérivées des variables pronostiques.
     * @returns {undefined}
     */
    calcTendencies()
    {
        var variables = this._model.getVariablesDescriptions();
        for (var v in variables)
        {
            if (variables[v].category==VariableDescription.CAT_PRONOSTIC)
            {
                this.model.dynamicsCore.calcTendency(variables[v].name);
            }
        }
    }

    /**
     * Avance temporelle selon le schema d'Euler.
     * @returns {undefined}
     */
    stepEuler()
    {       
        var variables = this._model.getVariablesDescriptions();
        for (var v in variables)
        {
            if (variables[v].category==VariableDescription.CAT_PRONOSTIC)
            {
                var vv = this._model.getVariable(variables[v].name);
                var var_t = this._model.getVariable(variables[v].name+"_t");
                var var_tdcy = this._model.getVariable(variables[v].name+"_tdcy");
                Variable.a_bc(vv, var_tdcy, this._model.dt, var_t);
            }
        }
    }

    /**
     * Avance temporelle selon le schema explicite centré.
     * @returns {undefined}
     */
    stepLeapFrog()
    {             
        var variables = this._model.getVariablesDescriptions();
        for (var v in variables)
        {
            if (variables[v].category==VariableDescription.CAT_PRONOSTIC)
            {
                var var_t = this._model.getVariable(variables[v].name+"_t");
                var var_tdcy = this._model.getVariable(variables[v].name+"_tdcy");
                Variable.a_bc(var_t, var_tdcy, 2*this._model.dt, var_t);
            }
        }
    }
  
}