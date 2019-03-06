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

import { DataSource } from "./DataSource.js";
import { Scenario } from "./Scenario.js";
import { VariableDescription } from "../modeling/VariableDescription.js";

/**
 * Traite des données en entrée pour les fournir au format du modèle.
 * @type type
 */
export class Preprocessor extends Scenario
{
    /**
     * 
     * @returns {undefined}
     */
    constructor() 
    {
        super();
        this._dataSource = null;
        this._dataWriter = null;
    }    
    
    /**
     * La source de données pour les variables d'entrée.
     */
    get dataSource()
    {
        return this._dataSource;
    }
    
    /**
     * La source de données pour les variables d'entrée.
     */
    set dataSource(p_dataSource)
    {
        this._dataSource = p_dataSource;
    }
    
    /**
     * La source de données pour les variables de sortie.
     * @returns {undefined}
     */
    get dataWriter()
    {
        return this._dataWriter;
    }
    
    /**
     * La source de données pour les variables de sortie.
     * @param {type} p_dataWriter
     * @returns {undefined}
     */
    set dataWriter(p_dataWriter)
    {
        this._dataWriter = p_dataWriter;
    }
    
    /**
     * Lance le traitement de preprocess en mode asynchrone
     * @returns {undefined}
     */
    async start()
    {
        try {
            await super.start();
            
            this.model.init();

            await this._dataSource.open(DataSource.MODE_READ);
            await this._dataWriter.open(DataSource.MODE_WRITE);
            
            // Passage des informations temporelles...           
            this._dataWriter.initDate = this._dataSource.initDate;
            this._dataWriter.name = this._dataSource.name;
            
            var model_vars = this._model.getVariablesDescriptions();
            var data_var;

            for (var t=0;t<this.times.length;t++)
            {
                var time = this.times[t];
                
                for (var i=0;i<model_vars.length;i++)
                {
                    var v = model_vars[i];
                    if (v.category==VariableDescription.CAT_PRONOSTIC || v.category==VariableDescription.CAT_PARAMETER)
                    {
                        // Informations de traitement de la variable
                        var output_var = this.getOutputVariable(v.name);
                        if (output_var==null) throw `variable ${v.name} has no processus for output.`;
                        
                        // Processus par lequel traiter cette variable
                        var process = this.getProcessus(output_var.processus);
                        if (process==null) throw `processus ${output_var.processus} not defined.`;
                        
                        // Obtenir les données
                        if ("source" in output_var) {
                            this.sendMessage(`loading field ${output_var.source} ${time}`);
                            data_var = await this._dataSource.getField(output_var.source, time);
                        } 
                        else 
                            data_var = null;

                        // Chainage des transformations du processus
                        var result_var = data_var;
                        for (var p in process.transformations)
                        {
                            var trans_name = process.transformations[p];
                            this.sendMessage(`transformation ${v.name} ${trans_name}`);
                            var trans = this.getTransformation(trans_name);
                            if (trans==null) throw `transformation ${trans_name} not defined.`;
                            result_var = trans.transform(v, result_var);
                        }
                        
                        // Ecriture des fichiers
                        this.dataWriter.addTime(time);
                        
                        this.sendMessage(`saving field ${v.name} ${time}`);
                        await this.dataWriter.writeField(v.name, time, result_var);
                    }
                }
            }
            
            this._status = Scenario.STATE_END;
                    
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
            if (this._dataSource.isOpen()) await this._dataSource.close();
            if (this._dataWriter.isOpen()) await this._dataWriter.close();
            return this;
        }
        catch (e)
        {
            throw e;
        }
    }
       
    /**
     * 
     * @param {type} p_trans
     * @returns {Preprocessor.transformations}
     */
    getTransformation(p_trans)
    {
        for (var i in this.transformations)
        {
            if (this.transformations[i].name == p_trans)
            {
                this.transformations[i].model = this.model;
                return this.transformations[i];
            }
        }
    }
    
    /**
     * 
     * @param {type} p_field
     * @returns {undefined}
     */
    getProcessus(p_process)
    {
        for (var i in this.processus)
        {
            if (this.processus[i].name == p_process)
            {
                return this.processus[i];
            }
        }
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
}