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
import { Variable } from "../modeling/Variable.js";
import { VariableDescription } from "../modeling/VariableDescription.js";
import { TextFile } from "../util/TextFile.js";


/**
 * Enregistre des données à chaque pas de temps dans des fichiers CSV.
 * 
 * <p>L'enregistrement se fait sur les champs demandés et sur les
 * points de grille souhaités. Un fichier par champ (X.txt), une ligne par
 * enregistrement temporel et une colonne par point de grille. Le séparateur
 * est le point virgule. </p>
 * 
 * <p>Paramètres :
 * <ul>
 * <li>outputURL : dossier où devront être écrits les fichiers CSV.</li>
 * <li>variables : tableau d'objets de la forme :
 * <pre><code>
 * {
 *     name : "variable",
 *     points : [ {x:1, y:2, z:3}, ... ]
 * }
 * </code></pre></li>
 * </ul>
 * </p>
 * @type type
 */
export class RecorderStep extends Step
{
    /**
     * 
     * @returns {undefined}
     */
    constructor()
    {
        super();
        
        this.outputURL = "";
        this.variables = [];
                
        this.textFile = null;
        this.data = [];
    }
    
    /**
     * 
     * @returns {undefined}
     */
    async init()
    {
        try
        {
            for (var i in this.variables)
            {
                this.data[this.variables[i].name] = "";
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
    async stepFinish()
    {
        try
        {
            var name;
            this.textFile = new TextFile(this.outputURL);
            for (var i in this.variables)
            {
                name = this.variables[i].name;
                this.textFile.write(name+".txt", this.data[name]);
            }
            this.textFile.close();
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
        return this;
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
        var name;
        var X, pt, value;
        var line, sep;
        var i, j, k;
        this.textFile = new TextFile(this.outputURL);
        for (var v in this.variables)
        {
            name = this.variables[v].name;
            X = p_model.getVariable(name);
            line = "";
            sep = "";
            for (var p in this.variables[v].points)
            {
                pt = this.variables[v].points[p];
                if ("x" in pt) i = pt.x; else i = 0;
                if ("y" in pt) j = pt.y; else j = 0;
                if ("z" in pt) k = pt.z; else k = 0;
                if (X.nbLevels>0)
                    value = X[k][i+j*X.width];
                else
                    value = X[i+j*X.width];               
                line += sep+value.toString();                
                sep = ";";
            }
            this.data[name] += line+"\n";
        }
        return this;
    }
}