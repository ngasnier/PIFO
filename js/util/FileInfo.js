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

import { TextFile } from "../util/TextFile.js"
/**
 * 
 * @type type
 */
export class FileInfo
{
    /**
     * 
     * @param {type} p_data
     * @returns {undefined}
     */
    constructor(p_data)
    {
        this.initDate = new Date();
        this.name = "";
        this.recordList = [];
                
        if (p_data != null && p_data!="")
        {
            var lines = p_data.split("\n");
            for (var i in lines)
            {
                if (lines[i]!="")
                {
                    var cols = lines[i].split(";");
                    var dt = cols[3].split("/");
                    this.name = cols[1];
                    this.initDate = new Date(Date.UTC(parseInt(dt[2]), parseInt(dt[1])-1, parseInt(dt[0]), parseInt(cols[2])));
                    var dt = new Date();
                    dt.setTime(this.initDate.getTime() + ((parseInt(cols[4]))*60*60*1000));
                    var rec = {
                        date: dt,
                        hoursFromInit: parseInt(cols[4]),
                        fileList: cols[0].split(","),
                        precFileList: cols[7].split(","),
                        dateFormatted: cols[5],
                        hourFormatted: cols[6]
                    };
                    this.recordList.push(rec);
                }
            }
        }
    }   
    
    /**
     * 
     * @returns {undefined}
     */
    addRecord(p_date)
    {
        var hours = Math.ceil((p_date.getTime()-this.initDate.getTime())/(3600*1000));
        var rec = this.getRecord(p_date);
        if (rec==null)
        {
            rec = {
                date: p_date,
                hoursFromInit: hours,
                fileList: [],
                precFileList: [],
                dateFormatted: p_date.toLocaleDateString("fr-FR", {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                }),
                hourFormatted: p_date.toLocaleTimeString("fr-FR", {
                    hour:'2-digit', minute:'2-digit'
                })
            };
            this.recordList.push(rec);
        }
        this.recordList.sort(function (a, b) {
            if (a.date.getTime()<b.date.getTime()) return -1;
            if (a.date.getTime()>b.date.getTime()) return 1;
            return 0;
        });
        return rec;
    }
    
    /**
     * 
     * @param {type} p_date
     * @returns {undefined}
     */
    getRecord(p_date)
    {
        var time = p_date.getTime();
        for (var i in this.recordList)
        {
            if (this.recordList[i].date.getTime()==time)
            {
                return this.recordList[i];
            }
        }
        return null;
    }
    
    /**
     * 
     * @param {type} p_date
     * @returns {undefined}
     */
    addFile(p_date, p_file)
    {
        var rec = this.getRecord(p_date);
        if (rec==null) rec = this.addRecord(p_date);
        var idx = this.recordList.indexOf(rec);
        
        if (!rec.fileList.includes(p_file)) rec.fileList.push(p_file);
        if (idx<this.recordList.length-1)
        {
            this.recordList[idx+1].precFileList = rec.fileList.slice();
        }
    }
    
    /**
     * Exporte le fileinfo au format texte.
     * @returns {string}
     */
    getText()
    {
        var fileinfo = "";
        // NB : pour que les dates soient bien formatees :
        // - npm install full-icu
        // - export NODE_ICU_DATA="node_modules/full-icu"
        for (var i in this.recordList)
        {
            var rec = this.recordList[i];
            var inithour = "0"+this.initDate.getUTCHours();

            var diff = rec.date.getTime()-this.initDate.getTime();
            var hours = Math.ceil(diff/(1000*3600));
            var hoursfmt = "0"+hours;
            
            fileinfo += rec.fileList.join(",")+";"
                    +this.name+";"
                    +inithour.substring(inithour.length-2)+";"
                    +this.initDate.toLocaleDateString()+";"
                    +(hoursfmt.length<=3?hoursfmt.substring(hoursfmt.length-2):hours)+";"
                    +rec.date.toLocaleDateString("fr-FR", {
                         weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                    })+";"
                    +rec.date.toLocaleTimeString("fr-FR", {
                        hour:'2-digit', minute:'2-digit'
                    })+";"+rec.precFileList.join(",")+"\n";    
        }
        return fileinfo;
    }
}