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

import { DataSource } from "./DataSource.js"
import { VariableDescription } from "../modeling/VariableDescription.js"
import { VerticalInterpolator } from "../util/VerticalInterpolator.js";

/**
 * Traite des données en entrée pour les fournir au format du modèle.
 * @type type
 */
export class Preprocessor
{
    /**
     * 
     * @returns {undefined}
     */
    constructor() 
    {
        this._model = null;
        this.verticalInterpolator = new VerticalInterpolator();
        this.inputDir = "./";
        this._dataSource = null;
        this._dataWriter = null;
    }
    
    /**
     * Paramètre depuis un objet JSON
     * @param {type} p_params
     * @returns {undefined}
     */
    set params(p_params)
    {
        this.inputDir = p_params.preprocessDir;        
        this.verticalInterpolatorinputLevels = p_params.levels.slice();
    }
    
    /**
     * Modèle à traiter, supposé déjà initialisé.
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
     */
    get dataSource()
    {
        return this._dataSource;
    }
    
    /**
     * 
     */
    set dataSource(p_dataSource)
    {
        this._dataSource = p_dataSource;
    }
    
    /**
     * 
     * @returns {undefined}
     */
    get dataWriter()
    {
        return this._dataWriter;
    }
    
    /**
     * 
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
    async run()
    {
        try {
            await this._dataSource.open(DataSource.MODE_READ);
            await this._dataWriter.open(DataSource.MODE_WRITE);
            
            // Passage des informations temporelles...           
            this._dataWriter.initDate = this._dataSource.initDate;
            
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
                        if ("source" in output_var) data_var = await this._dataSource.getField(output_var.source, time);
                        else data_var = null;

                        // Chainage des transformations du processus
                        var result_var = data_var;
                        for (var p in process.transformations)
                        {
                            var trans_name = process.transformations[p];
                            var trans = this.getTransformation(trans_name);
                            if (trans==null) throw `transformation ${trans_name} not defined.`;
                            result_var = trans.transform(v, result_var);
                        }
                        
                        // Ecriture des fichiers
                        this.dataWriter.addTime(time);
                        await this.dataWriter.writeField(v.name, time, result_var);
                    }
                }
            }
            return this;
        }
        catch (e)
        {
            throw e;
        }
        finally
        {
            await this._dataSource.close();
            await this._dataWriter.close();
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