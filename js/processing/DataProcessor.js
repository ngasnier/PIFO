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

import { DataSource } from "../front/DataSource.js";
import { Scenario } from "../front/Scenario.js";
import { VariableDescription } from "../modeling/VariableDescription.js";

/**
 * Traite des données en entrée pour les fournir au format du modèle.
 * @type type
 */
export class DataProcessor extends Scenario
{
    /**
     * 
     * @returns {undefined}
     */
    constructor() 
    {
        super();
        
        this.dataSources = [];
        
        this.processList = [];
        
        this.tasks = []; 
        
        this.currentProcess = 0;
    }    

    /**
     * Lance le traitement de preprocess en mode asynchrone
     * @returns {undefined}
     */
    async start()
    {
        try {
            await super.start();
            
            this.model.setup();
           
            this.currentProcess = 0;            
                       
            this._status = Scenario.STATE_RUN;
                    
            return this;
        }
        catch (e)
        {
            throw e;
        }        
    }
    
    
    async stepDo()
    {
        try {
            if (this.currentProcess<this.processList.length)
            {
                this.sendMessage(`preprocessor : processing ${this.processList[this.currentProcess].name}`);
                var task = this.getTask(this.processList[this.currentProcess].task);
                task.onMessage = this.onMessage;
                
                task.model = this.model;
                
                this.sendMessage(`preprocessor : task ${task.name}`);
                
                await task.setup();
                
                // Passage des paramètres
                for (var i=0;i<task.parameters.length;i++)
                {
                    var paramValue = this.getProcessParameterValue(this.processList[this.currentProcess], task.parameters[i]);
                    task.setParameterValue(task.parameters[i], paramValue);
                }
                
                await task.process();
                
                await task.terminate();
                
                this.currentProcess++;
            }
            else
            {
                this._status = Scenario.STATE_END;
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
     * @returns {undefined}
     */
    async finish()
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
     * @param {type} p_task
     * @returns {undefined}
     */
    getTask(p_task)
    {
        for (var i in this.tasks)
        {
            if (this.tasks[i].name == p_task)
            {
                return this.tasks[i];
            }
        }
        throw `preprocessor : task ${p_task} not found.`;
    }
    
    /**
     * 
     * @returns {undefined}
     */
    getOutputVariable(p_field)
    {
        for (var i in this.output)
        {
            if (this.output[i].variable == p_field)
            {
                return this.output[i];
            }
        }
    }
        
    getProcessParameterValue(p, name)
    {
        if ("parameters" in p)
        {
            for (var i=0;i<p.parameters.length;i++)
            {
                if (p.parameters[i].name==name)
                {
                    return p.parameters[i].value;
                }
            }
            throw `${p.name} : no parameter value for ${name}`;
        }
        else
        {
            throw `${p.name} : no parameter value for ${name}`;
        }
    }
}