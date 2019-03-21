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

import { Component } from "./Component.js";
import { DataSource } from "../front/DataSource.js";

/**
 * 
 * @type type
 */
export class WGRIBOutputComponent extends Component {
    /**
     * 
     * @returns {undefined}
     */
    constructor()
    {
        super();
        
        this.dataSource = null;
        this.destination = null;
    }
    
    
    /**
     * 
     * @returns {Array}
     */
    get inputs()
    {
        return ["main"];
    }

    /**
     * 
     * @returns {Array}
     */
    get parameters()
    {
        return ["destination"];
    }

    /**
     * 
     * @returns {undefined}
     */
    async setup()
    {
        try {
            this.sendMessage(`${this.name} : opening ${this.dataSource.name}`);
            if (!this.dataSource.isOpen()) await this.dataSource.open(DataSource.MODE_READ_WRITE);
            return this;
        }
        catch (e)
        {
            throw e;
        }
    }

    /**
     * 
     * @returns {WGRIBOutputComponent}
     */
    async terminate()
    {
        try {
            this.sendMessage(`${this.name} : closing ${this.dataSource.name}`);
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
     * @returns {undefined}
     */
    async process(data_in, data_out)
    {
        try {
            if ("destination"==null) throw `component ${this.name}: destination not set`;
            var data = data_in["main"].getData();
            if (data==null) throw `${this.name}: error : no data provided`;           
            if (!("time" in data)) throw `${this.name}: error : no time information provided in data flow`;
            this.sendMessage(`${this.name} : writing ${this.destination}[${data.time}]`);
            this.dataSource.addTime(data.time);
            await this.dataSource.writeField(this.destination, data.time, data);
            
            return this;
        }
        catch (e)
        {
            throw e;
        }
    }
}