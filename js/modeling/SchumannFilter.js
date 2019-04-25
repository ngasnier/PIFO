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
                if (x.length>0 && (x[0].constructor===Array || x[0].constructor===Float64Array))
                {    
                    // 3D
                    var k = 0;
                    for (var k=0;k<x.length;k++)
                    {
                        this._filter2D(x[k]);
                    }
                }
                else
                {
                    // 2D
                    this._filter2D(x);
                }
            }
        }
    }
    
    _filter2D(a)
    {
        // TODO : enregistrer cette variable dans l'init et l'allouer
        var tmp = this.model.getVariable("schumann_tmp");
        this._filtre2DMoyenneX(a, 0.5, tmp);
        this._filtre2DMoyenneX(tmp, -0.5, a);

        this._filtre2DMoyenneY(a, 0.5, tmp);
        this._filtre2DMoyenneY(tmp, 0.5, a);
    }

    _filtre2DMoyenneX(a, v, res)
    {
        var width = this.model.width;
        var height = this.model.height;
        for (var y=0;y<height;y++)
        {
            var i = y*width;
            res[i] = a[i];
            for(var x=1;x<width-1;x++)
            {
                var i = x+y*width;
                res[i] = a[i]*(1-v)+(a[i+1]+a[i-1])*v/2;
            }
            i = width-1+y*width;
            res[i] = a[i];
        }
    }

    _filtre2DMoyenneY(a, v, res)
    {
        var width = this.model.width;
        var height = this.model.height;
        for (var x=0;x<width;x++)
        {
            var i = x+width*(height-1);
            res[x] = a[x];
            res[i] = a[i];
        }
        for (var y=1;y<height-1;y++)
        {
            var i = y*width;
            res[i] = a[i];
            for(var x=1;x<width-1;x++)
            {
                var i = x+y*width;
                res[i] = a[i]*(1-v)+(a[i+width]+a[i-width])*v/2;
            }
            i = width-1+y*width;
            res[i] = a[i];
        }
    }
}