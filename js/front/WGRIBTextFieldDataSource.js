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
import { WGRIBFormat } from "../util/WGRIBFormat.js";
import { FileInfo } from "../util/FileInfo.js";
import { TextFile  } from "../util/TextFile.js";

/**
 * Source de données basée sur les fichiers textes issus de WGRIB.
 * 
 * La source utilise AJAX en navigateur, ou fs sous node.
 * 
 * @type type
 */
export class WGRIBTextFieldDataSource extends DataSource {
    
    /**
     * 
     * @returns {undefined}
     */
    constructor()
    {
        super();
        this.fileInfo = null;
        this.baseURL = "./";
        this.times = [];
        this.catalog = [];
    }
    
    /**
     * 
     * @returns {undefined}
     */
    async getCatalog()
    {
        try
        {
            return this.catalog;
        }
        catch (e)
        {
            throw e;
        }
    }

    /**
     * Renvoie un champ au temps demandé.
     * @param {type} p_field
     * @param {type} p_time
     * @returns {undefined} variable contenant les données
     */
    async getField(p_field, p_time)
    {       
        try {
            if (this.fileInfo==null) await this.getFileInfo();
            var field = this.getFieldInfo(p_field);
            if (field==null) throw `field ${p_field} not available at time ${p_time}`;
            if (!this.times.includes(p_time)) throw `field ${p_field} not available at time ${p_time}`;

            var reader = new WGRIBFormat();
            var variable;
        
            var timefmt = p_time.toString();
            if (timefmt.length<3) timefmt="0".repeat(3-timefmt.length)+timefmt;
          
            if ("levels" in field && field.levels.length>0)
            {
                variable = [];
                variable.nbLevels = field.levels.length;
                field.levels.forEach(async (lev)=>
                {
                    var fname = p_field+"_"+(lev/100)+"_"+timefmt+".txt";
                    var data = await this.getFile(fname);
                    var var_data = reader.read(data);
                    variable.push(var_data);
                    variable.width = var_data.width;
                    variable.height = var_data.height;
                });
                
                variable.levels = field.levels.slice();
                
                return variable;
            }
            else
            {
                var fname = p_field+"_"+timefmt+".txt";
                var data = await this.getFile(fname);
                return reader.read(data);
            }
        }
        catch (e)
        {
            throw e;
        }
    }

    /**
     * Renvoie la variable 2D correspondant au fichier demandé.
     * 
     * Le fichier est chargé par http en mode navigateur, par fichier sous node.
     * 
     * @param {type} p_name
     * @returns {undefined}
     */
    async getFile(p_name)
    {
        try {
            // Node ou navigateur ?
            if (!this.baseURL.endsWith("/")) this.baseURL += "/";
            var file = this.baseURL+p_name;
            return TextFile.readFile(file);
        }
        catch (e)
        {
            throw e;
        }
    }

    /**
     * 
     * @param {type} p_field
     * @returns {undefined}
     */
    getFieldInfo(p_field)
    {
        for (var f in this.catalog)
        {
            if (this.catalog[f].name==p_field) return this.catalog[f];
        }
        return null;
    }
    
    /**
     * Chargement du fileinfo et de la liste des temps
     * @returns {undefined}
     */
    async getFileInfo()
    {
        try {
            var fi_data = await this.getFile("fileinfo.txt");
            this.fileInfo = new FileInfo(fi_data);
            this.times = [];
            for (var i in this.fileInfo.recordList)
            {
                this.times.push(this.fileInfo.recordList[i].hoursFromInit);
            }
        }
        catch (e)
        {
            throw e;
        }
    }
}