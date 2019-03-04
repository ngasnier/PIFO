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

import { VariableDescription } from "../modeling/VariableDescription.js";

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
        /** Date de début des données */
        this._initDate = new Date();
        /** Dates contenues dans la source */
        this._dates = [];
        /** Catalogue des champs disponibles */
        this._catalog = [];
        /** Heures d'échéance depuis date d'init */
        this.times = [];
    }
    
    /**
     * Ouvre la source de données.
     * @param {string} p_mode 
     * @returns {DataSource} promesse sur la datasource ouverte.
     */
    async open(p_mode)
    {
        throw `this is an abstract datasource, it cannot be opened.`;
    }
    
    /**
     * Ferme la source de données.
     * @returns {undefined} promesse sur la datasource fermée.
     */
    async close()
    {
        throw `this is an abstract datasource, it cannot be closed.`;
    }
     
    /**
     * 
     * @returns {Boolean}
     */
    isOpen()
    {
        return false;
    }
    
    /**
     * Renvoie la liste des variables de la datasource avec les dimensions 
     * et temps.
     * 
     * Généralement le catalogue n'est accessible que quand la source est ouverte.
     * 
     * @returns {undefined} tableau de VariableDescription
     */
    get catalog()
    {
        return this._catalog;
    }

    /**
     * 
     * @param {type} p_catalog
     * @returns {undefined} tableau de VariableDescription
     */
    set catalog(p_catalog)
    {
        this._catalog = [];
        for (var i in p_catalog)
        {
            this._catalog.push(Object.assign(new VariableDescription(), p_catalog[i]));
        }
    }
    
    /**
     * 
     * @returns {undefined}
     */
    get initDate()
    {
        return this._initDate;
    }
    
    /**
     * 
     * @returns {undefined}
     */
    set initDate(p_date)
    {
        this._initDate = new Date(p_date.getTime());
    }
    
    /**
     * 
     * @returns {undefined}
     */
    get dates()
    {
        return this._dates;
    }
    
    /**
     * Ajouter une heure de forecast
     * @param {type} p_date
     * @returns {undefined}
     */   
    addTime(p_time)
    {
        if (!this.times.includes(p_time))
        {
            this.times.push(p_time);
            this.times.sort();
        }
        
        this._dates = [];
        for (var i in this.times)
        {
            var dt = new Date(this._initDate.getTime()+(3600*1000*p_time));
            this._dates.push(dt);
        }
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
    
    /**
     * Ecrit le champ donné dans la DataSource.
     * @param {type} p_name
     * @param {type} p_time
     * @param {type} p_data
     * @returns {undefined}
     */
    async writeField(p_name, p_time, p_data)
    {
        throw `field ${p_field} not available at time ${p_time}`;
    }
}

/** Mode lecture. La source doit exister. */
DataSource.MODE_READ = "R";

/** Mode lecture ecriture. La source doit exister. */
DataSource.MODE_READ_WRITE = "RW";

/** Mode écriture. La source est écrasée. */
DataSource.MODE_WRITE = "W";
