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
 * Interface pour les objets faisant un traitements au sein d'un pas de scenario.
 * @type type
 */
export class Step
{
    /**
     * 
     * @returns {undefined}
     */
    constructor()
    {
        
    }
    
    /**
     * 
     * @returns {undefined}
     */
    async init()
    {
        return this;
    }
    
    /**
     * 
     * @returns {Step}
     */
    async finish()
    {
        return this;
    }
    
    /**
     * 
     * @param {type} p_model
     * @returns {undefined}
     */
    async stepBegin(p_model)
    {
        return this;
    }
    
    /**
     * 
     * @param {type} p_model
     * @returns {undefined}
     */
    async stepDo(p_model)
    {
        return this;
    }
    
    /**
     * 
     * @param {type} p_model
     * @returns {undefined}
     */
    async stepEnd(p_model)
    {
        return this;
    }
}