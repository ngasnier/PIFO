/* 
Copyright (C) 2018 Nicolas GASNIER (http://www.meteo-blois.fr/contact/)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

import { SpatialFilter } from "./SpatialFilter.js";
import { VariableDescription } from "./VariableDescription.js";

/**
 * Filtre spatial de Schumann.
 * @type type
 */
export class SchumannFilter extends SpatialFilter {
    /**
     * 
     */
    constructor ()
    {
        super();

    }

    /**
     * 
     * @returns {Array}
     */
    getVariablesDescriptions()
    {
        return [ Object.assign(new VariableDescription(), {
            category: VariableDescription.CAT_INTERNAL, 
            name: "schumann_tmp", 
            description: "temporary variable for schumann filter", 
            units: "", 
            verticalPosition: VariableDescription.VERTICAL_POSITION_SURFACE,
            number: VariableDescription.NUMBER_TYPE_SCALAR
        }) ];
    }
    
    /**
     * 
     * @returns {undefined}
     */
    setup()
    {
        
    }
    
    /**
     * Filtre les champs pronostiques.
     * @returns {undefined}
     */
    filter()
    {
        var variables = this.model.getVariablesDescriptions();
        for (var v in variables)
        {
            if (variables[v].category==VariableDescription.CAT_PRONOSTIC)
            {
                var x = this.model.getVariable(variables[v].name);
                var k = 0;
                for (var k=0;k<x.length;k++)
                {
                    this._filter2D(x[k], k);
                }
            }
        }
    }
    
    _filter2D(a, k)
    {
        // TODO : enregistrer cette variable dans l'init et l'allouer
        var tmp = this.model.getVariable("schumann_tmp");
        this._filtre2DMoyenneX(a, 0.5, tmp, k);
        this._filtre2DMoyenneX(tmp, -0.5, a, k);

        this._filtre2DMoyenneY(a, 0.5, tmp, k);
        this._filtre2DMoyenneY(tmp, 0.5, a, k);
    }

    _filtre2DMoyenneX(a, v, res, k)
    {
        var width = this.model.width;
        var height = this.model.height;
        for (var j=0;j<height;j++)
        {
            res.set3(0, j, k, a.get3(0, j, k));
            for(var i=1;i<width-1;i++)
            {
                res.set3(i, j, k, a.get3(i, j, k)*(1-v)+(a.get3(i+1, j, k)+a.get3(i-1, j, k))*v/2);
            }
            res.set3(width-1, j, k, a.get3(width-1, j, k));
        }
    }

    _filtre2DMoyenneY(a, v, res, k)
    {
        var width = this.model.width;
        var height = this.model.height;
        for (var i=0;i<width;i++)
        {
            res.set3(i, 0, k, a.get3(i, 0, k));
            res.set3(i, height-1, k, a.get3(i, height-1, k));
        }
        for (var j=1;j<height-1;j++)
        {
            res.set3(0, j, k, a.get3(0, j, k));
            for(var i=1;i<width-1;i++)
            {
                res.set3(i, j, k, a.get3(i,j,k)*(1-v)+(a.get3(i,j+1,k)+a.get3(i,j-1,k))*v/2);
            }
            res.set3(width-1, j, k, a.get3(width-1, j, k));
        }
    }
}