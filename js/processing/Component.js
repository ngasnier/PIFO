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
 * 
 * @type type
 */
export class Component {
    /**
     * 
     * @returns {undefined}
     */
    constructor()
    {
        /** model */
        this.model = null;
        
        /** name */
        this.name = "";
    }
    
    /**
     * 
     * @returns {Component}
     */
    async setup()
    {
        return this;
    }
    
    /**
     * 
     * @returns {Component}
     */
    async terminate()
    {
        return this;
    }
    
    /**
     * 
     * @returns {Array}
     */
    get inputs()
    {
        return [];
    }
    
    /**
     * 
     * @returns {Array}
     */
    get outputs()
    {
        return [];
    }
    
    /**
     * 
     * @returns {Array}
     */
    get parameters()
    {
        return [];
    }
    
    /**
     * 
     * @param {type} name
     * @param {type} value
     * @returns {undefined}
     */
    setParameterValue(name, value)
    {
        this[name] = value;
    }
    
    /**
     * 
     * @param {type} name
     * @returns {unresolved}
     */
    getParameterValue(name)
    {
        return this[name];
    }
            
    /**
     * Traite les données en entrée et/ou produit les données en sortie.
     * @returns {undefined}
     */
    async process(data_in, data_out)
    {
        return this;
    }    
    
    /**
     * 
     * @param {type} description Description de la variable à produire
     * @param {type} data_in variable éventuelle à trandformer
     * @returns {unresolved}
     */
    transform(description, data_in)
    {
        return null;
    }
}