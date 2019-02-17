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

import { DataWriter } from "./DataWriter.js";
import { WGRIBFormat } from "../util/WGRIBFormat.js";

/**
 * 
 * @type type
 */
export class WGRIBTextFieldDataWriter extends DataWriter {
    /**
     * 
     * @returns {undefined}
     */
    constructor()
    {
        super();        
        if (typeof module !== 'undefined' && module.exports) 
        {
            this.fs = require('fs');
            this.path = require('path');
        }
        else
        {
            // TODO un plan B pour le mode navigateur ? genre jszip ?
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
            var writer = new WGRIBFormat();
            var data;
            var filename;
            var timefmt = p_time.toString();
            timefmt = timefmt.length<3 ? timefmt="0".repeat(3-timefmt.length)+timefmt : timefmt;
            if (p_data.nbLevels>0)
            {
                for (var k=0;k<p_data.nbLevels;k++)
                {
                    if ("levels" in p_data)
                        filename = p_name+"_"+p_data[k].toString()+"_"+timefmt+".txt";
                    else
                        filename = p_name+"_"+k.toString()+"_"+timefmt+".txt";
                    
                    this.fs.writeFileSync(this.path.join(this.baseURL, filename), writer.write(p_data[k]));
                }
            }
            else
            {
                filename = p_name+"_"+timefmt+".txt";
                this.fs.writeFileSync(this.path.join(this.baseURL, filename), writer.write(p_data));
            }
        }
        catch (e)
        {
            throw e;
        }
    }
}