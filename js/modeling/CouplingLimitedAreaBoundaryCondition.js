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

import { VariableDescription } from "./VariableDescription.js"
import { BoundaryCondition } from "./BoundaryCondition.js"

/**
 * Condition aux limites où les bords sont imposés par un autre modèle couplé.
 */
export class CouplingLimitedAreaBoundaryCondition extends BoundaryCondition
{
    /**
     * 
     * @returns {undefined}
     */
    constructor() 
    {
        super();
        
        // Taille de la zone de relaxation
        this.relaxation = 8;
    }

    /**
     * 
     * @returns {Array}
     */
    getVariablesDescriptions()
    {
        var reg_vars = [Object.assign(new VariableDescription(),{
                    "category": VariableDescription.CAT_INTERNAL, 
                    "name": "alpha_couplage", 
                    "description": "coupling coefficient for boundary condition", 
                    "units": "", 
                    "verticalPosition": VariableDescription.VERTICAL_POSITION_SURFACE,
                    "number": VariableDescription.NUMBER_TYPE_SCALAR
                })];
        var variables = this._model.getVariablesDescriptions(VariableDescription.CAT_PRONOSTIC);
        for (var i in variables)
        {
            reg_vars.push(Object.assign(new VariableDescription(),{
                    "category": VariableDescription.CAT_INTERNAL, 
                    "name": variables[i].name+"_couplage", 
                    "description": "boundary coupling values for "+variables[i].name, 
                    "units": variables[i].units, 
                    "verticalPosition": variables[i].verticalPosition,
                    "number": variables[i].number
                }));
        }
        return reg_vars;
    }

    /**
     * Initialise le coeur avant la simulation (allocations de variables...)
     * @returns {undefined}
     */
    init()
    {
        // *** Calcul de la zone de relaxation et autres termes de grilles nécessaires
        var i = 0;
        for (var y=0;y<this.model.height;y++)
        {
            for(var x=0;x<this.model.width;x++,i++)
            {
                // Initialisation du couplage
                if (y==0 || y==this.model.height-1 || ((x==0 || x==this.model.width-1) && !this.model.global))
                {
                    this.model.alpha_couplage[i] = 1.0;
                }
                else if ((y<1+this.relaxation||y>=this.model.height-this.relaxation-1)
                        || ((x<1+this.relaxation||x>=this.width-this.relaxation-1) && !this.model.global))
                {
                    var xd = 0;
                    var yd = 0;

                    if (x<1+this.relaxation) xd = this.relaxation-x+1;
                    else if (x>=this.model.width-this.relaxation-1) 
                        xd = x-this.model.width+this.relaxation+2;
                    if (y<1+this.relaxation) yd = this.relaxation-y+1;
                    else if (y>=this.model.height-this.relaxation-1) 
                        yd = y-this.model.height+this.relaxation+2;

                    if (xd<yd || this.model.global) xd = yd;

                    this.model.alpha_couplage[i] = 1-Math.tanh(0.5*(this.relaxation-xd+1));
                }
                else 
                {
                    this.model.alpha_couplage[i] = 0.0;
                }
            }
        }
    }

    /**
     * 
     * @returns {undefined}
     */
    doBoundaryCondition()
    {
        var variables = this._model.getVariablesDescriptions();
        for (var i in variables)
        {
            if (variables[i].category==VariableDescription.CAT_PRONOSTIC)
            {
                //this.model.dynamicsCore.calcTendency(variables[v].name);
                this.couple(this.model.getVariable(variables[i].name), 
                    this.model.getVariable(variables[i].name+"_couplage"));
            }
        }
    }
    
    /**
     * Couple une variable avec le domaine extérieur.
     * @param {type} x la variable
     * @param {type} c les valeurs du domaine extérieur
     * @returns {undefined}
     */
    couple2D(x, c)
    {
        for (var i=0;i<this.model.height*this.model.width;i++)
        {
            x[i] = (1-this.model.alpha_couplage[i])*x[i] + this.model.alpha_couplage[i]*c[i];
        }
    }

    /**
     * Couple une variable avec le domaine extérieur.
     * @param {type} x
     * @param {type} c
     * @returns {undefined}
     */
    couple(x, c)
    {
        var i, k;
        if (x.length>0 && (x[0].constructor===Array || x[0].constructor===Float64Array))
        {    
            for (k=0;k<x.length;k++)
            {
                for (i=0;i<this.model.height*this.model.width;i++)
                {
                    x[k][i] = (1-this.model.alpha_couplage[i])*x[k][i] + this.model.alpha_couplage[i]*c[k][i];
                }
            }
        }
        else
        {
            this.couple2D(x, c);
        }
    }
    
}