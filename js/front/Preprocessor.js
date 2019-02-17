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
                        data_var = await this._dataSource.getField(output_var.source, time);

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
                        this.dataWriter.writeField(v.name, time, result_var);
                    }
                }
            }
            return "OK";
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
    
    
/*{
                        return new Promise((resolve, reject)=>{
                            switch (v.category)
                            {
                                case VariableDescription.CAT_PRONOSTIC, VariableDescription.CAT_PARAMETER:
                                    // 1 Obtention des données
                                    // Le contrat : la datasource sait d'elle-même si le
                                    // champ demandé est 2D ou 3D. 
                                    // Besoin: connaitre les niveaux en entrée !
                                    //[variable, levels] = this.dataSource.getData(v.name, t);
                                    console.log(time, v);
                                    resolve();

                                    // 2 Prévoir une transformation pré-projection ?

                                    // 3 Projection dans la grille du modèle

                                    // 4 Transformation éventuelle des champs

                                    // 5 Ecriture des fichiers
                                    break;

                                default:
                                    console.log(time, v, "ignorée");
                                    resolve();
                           }
                        }*/    

    /*function interpWGRIB2DField(pField, pValid, pOffsetX, pOffsetY, pScale, pVariable, pFieldType="s")
    {
        var filename, valid;
        var data;
        valid = pValid.toString();
        if (valid.length<3)
        {
            valid ="00"+valid;
            valid = valid.substr(valid.length-3);
        }
        filename = path.join(config.preprocessor.preprocessDir, pField+"_"+valid+".txt");
        console.log("loading "+filename);
        data = WGRIBFieldReader.read(fs.readFileSync(filename, 'utf8'));
        projection.interpLatLonGridToDomain(config.preprocessor, data, pVariable, pOffsetX, pOffsetY, pScale, pFieldType);
    }

    function interpWGRIB3DField(pField, pValid, pOffsetX, pOffsetY, pScale, pVariable, pFieldType="s")
    {
        var filename, lev, valid;
        var data;
        for (var k=0;k<config.preprocessor.levels.length;k++)
        {
            lev = Math.floor(verticalInterpolator.inputLevels[k]/100);
            valid = pValid.toString();
            if (valid.length<3)
            {
                valid ="00"+valid;
                valid = valid.substr(valid.length-3);
            }
            filename = path.join(config.preprocessor.preprocessDir, pField+"_"+lev.toString()+"_"+valid+".txt");
            console.log("loading "+filename);
            data = WGRIBFieldReader.read(fs.readFileSync(filename, 'utf8'));
            projection.interpLatLonGridToDomain(config.preprocessor, data, pVariable[k], pOffsetX, pOffsetY, pScale, pFieldType);
        }
    }*/
}