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

import { Step } from "./Step.js";
import { DataSource } from "./DataSource.js";
import { Variable } from "../modeling/Variable.js";

/**
 * Gère l'historisation des variables du modèle à intervalle régulier.
 * @type type
 */
export class HistoryStep extends Step
{
    /**
     * 
     * @returns {undefined}
     */
    constructor()
    {
        super();
        this.variables = [];
        this.dataSource = null;
        this.historyIntervall = 3;
        
        this.nextHistory = 0;
        this.precHistory = "";
        this.historyInfo = "";
    }
    
    /**
     * 
     * @returns {undefined}
     */
    async init()
    {
        try
        {
            if (!this.dataSource.isOpen()) await this.dataSource.open(DataSource.MODE_WRITE);
            
            this.nextHistory = 0;
            //this.nextHistory = 3600*this.historyInterval;
            
            return this;
        }
        catch (e)
        {
            throw e;
        }
    }
    
    /**
     * 
     * @returns {undefined}
     */
    async stepFinish()
    {
        try
        {
            if (this.dataSource.isOpen()) await this.dataSource.close();
            return this;
        }
        catch (e)
        {
            throw e;
        }
    }
    
    /**
     * 
     * @param {type} p_model
     * @returns {undefined}
     */
    async stepBegin(p_model)
    {
        try
        {
            // Pour historiser T=0
            if (p_model.time>=this.nextHistory)
            {
                await this.doHistory(p_model);
            }
            return this;
        }
        catch (e)
        {
            throw e;
        }
    }
    
    /**
     * 
     * @param {type} p_model
     * @returns {undefined}
     */
    async stepDo(p_model)
    {
        try
        {            
            return this;
        }
        catch (e)
        {
            throw e;
        }
    }
    
    /**
     * 
     * @param {type} p_model
     * @returns {undefined}
     */
    async stepEnd(p_model)
    {
        try
        {
            if (p_model.time>=this.nextHistory)
            {
                await this.doHistory(p_model);
            }
            return this;
        }
        catch (e)
        {
            throw e;
        }
    }
    
    async doHistory(p_model)
    {
        try
        {
            this.sendMessage(`history time ${p_model.time}`);
            var hours = Math.floor(p_model.time/3600);

            if (!this.dataSource.isOpen()) await this.dataSource.open(DataSource.MODE_WRITE);

            this.dataSource.name = p_model.name;
            this.dataSource.initDate = p_model.startDate;
            this.dataSource.addTime(hours);

            for (var i in this.variables)
            {
                var v = this.variables[i];
                this.sendMessage(`writing field ${v.name} ${hours}`);
                await this.dataSource.writeField(v.name, hours, p_model.getVariable(v.name));
            }

            await this.dataSource.writeField("levels", hours, p_model.verticalCoords);

            this.nextHistory += this.historyInterval*3600;
        }
        catch (e)
        {
            throw e;
        }
    }
}