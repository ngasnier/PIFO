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
 * Interface d'une source de données 2D ou 3D pour le modèle.
 * @type type
 */
export class DataSource {
    /**
     * 
     * @returns {undefined}
     */
    constructor()
    {
        
    }
    
    /**
     * 
     * @returns {DataSource} la datasource
     */
    async open()
    {
        throw `this is an abstract datasource, it cannot be opened.`;
    }
    
    /**
     * Renvoie la liste des variables de la datasource avec les dimensions 
     * et temps.
     * @returns {undefined} tableau de VariableDescription
     */
    async getCatalog()
    {
        throw "this datasource has no catalog.";
    }
    
    /**
     * Renvoie un champ au temps demandé.
     * @param {type} p_field
     * @param {type} p_time en heures
     * @returns {undefined} tableau 
     */
    async getField(p_field, p_time)
    {
        throw `field ${p_field} not available at time ${p_time}`;
    }
}