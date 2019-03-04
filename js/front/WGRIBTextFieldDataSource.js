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
import { VariableDescription } from "../modeling/VariableDescription.js";
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
        this.openMode = "";
        this.fileInfo = null;
        this.baseURL = "./";
        this.textFile = null;
    }
    
    /**
     * 
     * @returns {Boolean}
     */
    isOpen()
    {
        return this.openMode!="";
    }
    
    /**
     * 
     * @returns {super.initDate}
     */
    get  initDate()
    {
        return super.initDate;
    }
    
    /**
     * 
     * @param {type} p_date
     * @returns {undefined}
     */
    set initDate(p_date)
    {
        super.initDate = p_date;
        this.fileInfo.initDate = p_date;
    }
    
    /**
     * 
     * @param {type} p_mode
     * @returns {undefined}
     */
    addTime(p_time)
    {
        super.addTime(p_time);
        var idx = this.times.indexOf(p_time);
        this.fileInfo.addRecord(this._dates[idx]);
    }
    
    /**
     * 
     * @returns {undefined}
     */
    async open(p_mode)
    {
        try {
            this.textFile = new TextFile(this.baseURL);
            switch (p_mode)
            {
                case DataSource.MODE_WRITE:
                    this.fileInfo = new FileInfo("");
                    break;
                case DataSource.MODE_READ:
                case DataSource.MODE_READ_WRITE:
                    this.fileInfo = await this.readFileInfo();
                    break;
                default:
                    throw "invalid open mode. ("+p_mode+")";
            }
            this.openMode = p_mode;
            
            this._initDate = new Date(this.fileInfo.initDate.getTime());
            this.times = [];
            this._dates = [];
            for (var i in this.fileInfo.recordList)
            {
                this.times.push(this.fileInfo.recordList[i].hoursFromInit);
                this._dates.push(this.fileInfo.recordList[i].date);
            }
            
            return this;
        }
        catch (e)
        {
            this.openMode = "";
            throw e;
        }
    }
    
    /**
     * 
     * @returns {WGRIBTextFieldDataSource}
     */
    async close()
    {
        try {
            switch (this.openMode)
            {
                case DataSource.MODE_WRITE:
                case DataSource.MODE_READ_WRITE:
                    this.fileInfo = await this.writeFileInfo();
                    break;
                case DataSource.MODE_READ:
                    break;
                default:
                    throw "source not opened.";
            }
            await this.textFile.close();
            this.openMode = "";
            return this;
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
            if (this.openMode!=DataSource.MODE_READ_WRITE && this.openMode!=DataSource.MODE_READ) throw "datasource not opened for reading.";
            
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
                    var data = await this.readFile(fname);
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
                var data = await this.readFile(fname);
                return reader.read(data);
            }
        }
        catch (e)
        {
            throw e;
        }
    }
    
    /**
     * 
     * @param {type} p_name
     * @param {type} p_time
     * @param {type} p_data
     * @returns {undefined}
     */
    async writeField(p_name, p_time, p_data)
    {
        try
        {
            if (this.openMode!=DataSource.MODE_READ_WRITE && this.openMode!=DataSource.MODE_WRITE) throw "datasource not opened for writing.";
            
            var writer = new WGRIBFormat();
            var data;
            var filename;
            var dt = new Date(this.initDate.getTime()+(3600*1000*p_time));

            var timefmt = p_time.toString();
            timefmt = timefmt.length<3 ? timefmt="0".repeat(3-timefmt.length)+timefmt : timefmt;
            if (!this.baseURL.endsWith("/")) this.baseURL += "/";
            
            if (!this.times.includes(p_time)) throw `field ${p_name} not available at time ${p_time}`;
            
            this.addFieldInfo(p_name, p_data);
            
            if (p_data.nbLevels>0)
            {
                for (var k=0;k<p_data.nbLevels;k++)
                {
                    if ("levels" in p_data)
                        filename = p_name+"_"+p_data[k].toString()+"_"+timefmt+".txt";
                    else
                        filename = p_name+"_"+k.toString()+"_"+timefmt+".txt";
                    
                    this.fileInfo.addFile(dt, filename);
                    await this.writeFile(filename, writer.write(p_data[k]));
                }
            }
            else
            {
                filename = p_name+"_"+timefmt+".txt";
                this.fileInfo.addFile(dt, filename);
                await this.writeFile(filename, writer.write(p_data));
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
    async readFile(p_name)
    {
        try {
            // Node ou navigateur ?
            /*if (!this.baseURL.endsWith("/")) this.baseURL += "/";
            var file = this.baseURL+p_name;
            return TextFile.readFile(file);*/
            return this.textFile.read(p_name);
        }
        catch (e)
        {
            throw e;
        }
    }
    
    /**
     * 
     * @param {type} p_name
     * @param {type} p_data
     * @returns {undefined}
     */
    async writeFile(p_name, p_data)
    {
        try {
            /*if (!this.baseURL.endsWith("/")) this.baseURL += "/";
            var file = this.baseURL+p_name;
            return TextFile.writeFile(file, p_data);*/
            return this.textFile.write(p_name, p_data);
        }
        catch (e)
        {
            throw e
        }
    }

    /**
     * 
     * @param {type} p_field
     * @returns {undefined}
     */
    getFieldInfo(p_field)
    {
        for (var f in this._catalog)
        {
            if (this._catalog[f].name==p_field) return this._catalog[f];
        }
        return null;
    }
    
    /**
     * 
     * @param {type} p_field
     * @returns {undefined}
     */
    addFieldInfo(p_field, p_data)
    {
        var fi = this.getFieldInfo(p_field);
        if (fi==null)
        {
            fi = Object.assign(new VariableDescription(), p_data);
            fi.name = p_field;
            this._catalog.push(fi);
        }
    }
    
    /**
     * Chargement du fileinfo et de la liste des temps
     * @returns {undefined}
     */
    async readFileInfo()
    {
        try {
            var fi_data = await this.readFile("fileinfo.txt");
            this.fileInfo = new FileInfo(fi_data);
            return this.fileInfo;
        }
        catch (e)
        {
            throw e;
        }
    }

    /**
     * Sauvegarde le fileinfo.
     * @returns {}
     */
    async writeFileInfo()
    {
        try {            
            return this.writeFile("fileinfo.txt", this.fileInfo.getText());
        }
        catch (e)
        {
            throw e;
        }
    }
}