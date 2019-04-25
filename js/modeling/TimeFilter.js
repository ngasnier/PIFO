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
 * Interface représentant un filtre temporel pour l'intégration d'un modèle.
 * 
 * @type type
 */
export class TimeFilter {
    constructor()
    {
        this._model = null;
    }
    
    /**
     * 
     */
    get model()
    {
        return this._model;
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
     * @returns {Array}
     */
    getVariablesDescriptions()
    {
        return [];
    }

    /**
     * Initialise le filtre.
     * 
     * ex : enregistrement de variables auprès du modèle etc...
     * @returns {undefined}
     */
    setup()
    {

    }

    /**
     * Action appelée avant le calcul de l'intégration temporelle
     * @returns {undefined}
     */
    preStep()
    {
        
    }
    
    /**
     * Action appelée après le calcul de l'intégration temporelle
     * @returns {undefined}
     */
    postStep()
    {
        
    }
}