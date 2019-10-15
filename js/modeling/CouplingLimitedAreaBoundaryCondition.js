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
 * 
 * <p>Le couplage est réalisé via une zone de relaxation avec un coefficient
 * de couplage décroissant vers l'intérieur.</p>
 * 
 * <p>Paramètres : 
 * <ul>
 * <li>relaxation : taille de la zone de relaxation en points de grille.
 * Défaut : 6</li>
 * </ul>
 * </p>
 * 
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
        this.relaxation = 6;
    }
    
    /**
     * 
     * @returns {Array}
     */
    getVariablesDescriptions()
    {
        var reg_vars = [Object.assign(new VariableDescription(),{
                    category: VariableDescription.CAT_INTERNAL, 
                    name: "alpha_couplage", 
                    description: "coupling coefficient for boundary condition", 
                    units: "", 
                    verticalPosition: VariableDescription.VERTICAL_POSITION_SURFACE,
                    number: VariableDescription.NUMBER_TYPE_SCALAR
                })];
        var variables = this._model.getVariablesDescriptions(VariableDescription.CAT_PRONOSTIC);
        for (var i in variables)
        {
            reg_vars.push(Object.assign(new VariableDescription(),{
                    category: VariableDescription.CAT_INTERNAL, 
                    name: variables[i].name+"_couplage", 
                    description: "boundary coupling values for "+variables[i].name, 
                    units: variables[i].units, 
                    verticalPosition: variables[i].verticalPosition,
                    number: variables[i].number
                }));
        }
        return reg_vars;
    }

    /**
     * Initialise la zone de relaxation
     * @returns {undefined}
     */
    setup()
    {
        // *** Calcul de la zone de relaxation et autres termes de grilles nécessaires
        for (var y=0;y<this.model.height;y++)
        {
            for(var x=0;x<this.model.width;x++)
            {
                // Initialisation du couplage
                if (y==0 || y==this.model.height-1 || ((x==0 || x==this.model.width-1) && !this.model.global))
                {
                    this.model.alpha_couplage.set2(x,y,1.0);
                }
                else if ((y<1+this.relaxation||y>=this.model.height-this.relaxation-1)
                        || ((x<1+this.relaxation||x>=this.model.width-this.relaxation-1) && !this.model.global))
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

                    this.model.alpha_couplage.set2(x,y, 1-Math.tanh(0.5*(this.relaxation-xd+1)));
                }
                else 
                {
                    this.model.alpha_couplage.set2(x,y,0.0);
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
                this.couple(this.model.getVariable(variables[i].name+"_t"), 
                    this.model.getVariable(variables[i].name+"_couplage"));
            }
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
        var i=0, j=0, k=0;
        var alpha_couplage = this._model.alpha_couplage;
        var width = x.width;
        var height = x.height;
        var nbLevels = x.nbLevels;
        if (nbLevels>1)
        {    
            for (k=0;k<nbLevels;k++)
            {
                for (j=0;j<height;j++)
                {
                    for (i=0;i<width;i++)
                    {
                        x.set3(i,j,k, (1-alpha_couplage.get2(i,j))*x.get3(i,j,k) + alpha_couplage.get2(i,j)*c.get3(i,j,k));
                    }
                }
            }
        }
        else
        {
            for (j=0;j<height;j++)
            {
                for (i=0;i<width;i++)
                {
                    x.set2(i,j, (1-alpha_couplage.get2(i,j))*x.get2(i,j) + alpha_couplage.get2(i,j)*c.get2(i,j));
                }
            }
        }
    }   
}