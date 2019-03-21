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

/**
 * 
 * @type type
 */
export class Task {
    /**
     * 
     * @returns {undefined}
     */
    constructor()
    {
        this._model = null;
    }
    
    get model()
    {
        return this._model;
    }
    
    set model(model)
    {
        this._model = model;
    }
    
    get parameters()
    {
        return [];
    }
    
    setParameterValue(name, value)
    {
        this[name] = value;
    }
    
    getParameterValue(name)
    {
        return this[name];
    }
    
        /**
     * 
     * @returns {Step._onMessage}
     */
    get onMessage()
    {
        return this._onMessage;
    }
    
    /**
     * 
     * @param {type} msg
     * @returns {undefined}
     */
    set onMessage(msg)
    {
        this._onMessage = msg;
    }
    
    /**
     * 
     * @param {type} msg
     * @returns {undefined}
     */
    sendMessage(msg)
    {
        if (this._onMessage!=null) this._onMessage(msg);
    }

    
    /**
     * 
     * @returns {undefined}
     */
    async setup()
    {
        return this;
    }
    
    /**
     * 
     * @returns {undefined}
     */
    async process()
    {
        return this;
    }
    
    /**
     * 
     * @returns {undefined}
     */    
    async terminate()
    {
        return this;
    }
}