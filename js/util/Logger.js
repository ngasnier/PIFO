/* 
 * Copyright (C) 2020 Nicolas GASNIER (http://www.meteo-blois.fr/contact/)
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
 * Basic wrapper for logging functionnality with browser mode compatibility.
 */
export class Logger {
    constructor()
    {
        this.trace = console.log;
        this.debug = console.log;
        this.info = console.log;
        this.warn = console.log;
        this.error = console.log;
        this.fatal = console.log;
        this.mark = console.log;
    }
}

Logger.loggerInstance = null;

Logger.getLogger = function()
{
    if (Logger.loggerInstance==null) {
        
        if (typeof module !== 'undefined' && module.exports)
        {
            const log4js = require('log4js');
            Logger.loggerInstance = log4js.getLogger();
        }
        else
        {   
            // Fake log4js-node with console.log
            Logger.loggerInstance = new Logger();
        }
    }
    return Logger.loggerInstance;
}
