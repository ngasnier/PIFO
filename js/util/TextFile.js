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
 * Lecture d'un fichier texte.
 */
export class TextFile {
    
    /**
     * 
     * @param {type} p_url
     * @returns {Promise}
     */
    static async readFile(p_url)
    {
        try {
            // Node ou navigateur ?
            if (typeof module !== 'undefined' && module.exports) 
            {
                const fs = require('fs');
                const path = require('path');
                return fs.readFileSync(p_url, "utf8");
            }
            else
            {
                return $.when($.ajax({
                    url: p_url,
                    dataType: "text"
                }));
            }
        }
        catch (e)
        {
            throw e;
        }
    }
 
    /**
     * Ecriture d'un fichier texte.
     * @param {type} p_url
     * @returns {undefined}
     */
    static async writeFile(p_url, p_data)
    {
        try
        {            
            if (typeof module !== 'undefined' && module.exports) 
            {
                var fs = require('fs');
                var path = require('path');
                return new Promise(function (resolve, reject) {
                    fs.writeFile(p_url, p_data, "", function (err) {
                       if (err) reject(err);
                       else resolve(p_data);
                    });
                }, p_data);
            }
            else
            {
                // TODO un plan B pour le mode navigateur ? genre jszip ?
                throw "write not supported on browser yet.";
            }
        }
        catch (e)
        {
            throw e;
        }
    }
}
