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


/**
 * Interface d'un schéma de paramétrisation physique.
 * 
 * @type type
 */
export class PhysicsScheme {
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
     * @returns {@param;PhysicsScheme.set model:p_model}
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
     * 
     * @returns {undefined}
     */
    setup()
    {
        
    }
    
    /**
     * 
     * @returns {undefined}
     */
    step()
    {
        
    }
}