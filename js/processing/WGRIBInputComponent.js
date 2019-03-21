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

export class WGRIBInputComponent extends Component {
    constructor()
    {
        super();
        this.dataSource = null;
        this.source = null;
    }
    
    /**
     * 
     * @returns {Array}
     */
    get outputs()
    {
        return ["main"];
    }

    /**
     * 
     * @returns {Array}
     */
    get parameters()
    {
        return ["source"];
    }

    /**
     * 
     * @returns {undefined}
     */
    async setup()
    {
        try {
            this.sendMessage(`${this.name} : opening ${this.dataSource.name}`);
            if (!this.dataSource.isOpen()) await this.dataSource.open(DataSource.MODE_READ);
            this.currentTime = 0;
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
            if ("source"==null) throw `component ${this.name}: source not set`;

            if (this.currentTime<this.dataSource.times.length)
            {
                this.dataSource.times;

                this.sendMessage(`${this.name} : loading ${this.source}[${this.dataSource.times[this.currentTime]}]`);
                var data = await this.dataSource.getField(this.source, this.dataSource.times[this.currentTime]);
                
                data_out["main"].setData(data);
                
                this.currentTime++;
            }
            
            return this;
        }
        catch (e)
        {
            throw e;
        }
    }
    
}
