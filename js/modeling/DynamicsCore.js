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
 * Interface d'coeur dynamique de modèle.
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
     * Initialise le coeur avant la simulation 
     * 
     * <p>allocations de variables...</p>
     * @returns {undefined}
     */
    setup()
    {
        
    }

    /**
     * Placeholder pour les calculs de pré-intégration temporelle
     * 
     * <p>e.g. interpolations semi-lagrangiennes, transformation spectrale...</p>
     * @returns {undefined}
     */
    solveBegin()
    {
        
    }
    
    /**
     * Placeholder pour les calculs post-intégration temporelle
     * 
     * <p>e.g résolution semi-implicite, transformation spectrale...</p>
     * @returns {undefined}
     */
    solveEnd()
    {
        
    }

    /**
     * Calcule les tendances d'une variable pronostiques.
     * 
     * <p>Les tendances doivent permetre de calculer les valeurs transitoires
     * dans le cas d'une intégration semi-implicite ou semi-lagrangienne.</p>
     * 
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
    
    /**
     * Calcule une variable constante
     * @param {type} p_variable
     * @returns {undefined}
     */
    calcConstant(p_variable)
    {
        this["calc"+p_variable]();
    }
}