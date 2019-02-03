/* 
 * Copyright (C) 2018 Nicolas GASNIER (http://www.meteo-blois.fr/contact/)
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

import { Earth } from "./Earth.js"

/**
 * Coeur dynamique en différences centrales pour modèle hydrostatique.
 * Grille C, niveaux sigma, arrangement de Lorentz.
 *          
 * @returns {BaroclinicModel}
 */
export class DynamicsCore
{
    /**
     * 
     * @returns {undefined}
     */
    constructor() 
    {
        this._model = null;
    }
    
    /**
     * 
     * @param {type} p_model
     * @returns {undefined}
     */
    set model(p_model)
    {
        this._model = p_model;
    }
    
    /**
     * 
     * @returns {@param;DynamicsCore.set model:p_model}
     */
    get model()
    {
        return this._model;
    }
    
    /**
     * 
     * @returns {Array}
     */
    getVariablesDescriptions()
    {
        return [];
    }
     
    /**
     * Initialise le coeur avant la simulation (allocations de variables...)
     * @returns {undefined}
     */
    init()
    {
        
    }

    /**
     * Calcule les tendances d'une variable pronostiques
     * @returns {undefined}
     */
    calcTendency(p_variable)
    {
        this["calc"+p_variable+"_tdcy"]();
    }
    
    /**
     * Calcule une variable diagnostique
     * @param {type} p_variable
     * @returns {undefined}
     */
    calcDiagnostic(p_variable)
    {
        this["calc"+p_variable]();
    }
}