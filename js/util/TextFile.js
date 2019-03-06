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

import { ModuleLoader } from "./ModuleLoader.js";

/**
 * Lecture/écriture d'un fichier texte avec abstraction node/navigateur.
 */
export class TextFile {
    /**
     * Ouvre un chemin pour la lecture/écriture de plusieurs fichiers.
     * @param {type} p_pathUrl
     * @returns {undefined}
     */
    constructor(p_pathUrl)
    {
        this.path = p_pathUrl;
        if (!this.path.endsWith("/")) this.path += "/";
        this.zip = null;
    }
    
    async read(p_file)
    {
        return await TextFile.readFile(this.path+p_file);
    }
    
    async write(p_file, p_data)
    {
        if (typeof module !== 'undefined' && module.exports) 
        {
            return await TextFile.writeFile(this.path+p_file, p_data);
        }
        else
        {
            if (this.zip==null) this.zip = new JSZip();
            this.zip.file(p_file, p_data); 
            return p_data;
        }
    }
    
    async close()
    {
        if (this.zip!=null)
        {
            var loader = new ModuleLoader("./js/util", {"FileSaver": "FileSaver.js"});
            var saver = await loader.loadModule("FileSaver");
            return this.zip.generateAsync({type:"blob"})
                    .then((content) => {
                        
                        var name = this.path.substring(0, this.path.length-1);
                        name = name.replace("/", "_").replace(":", "_");                
                        saver.saveAs(content, name+".zip");
                    });
        }
    }
    
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
                fs.writeFileSync(p_url, p_data, "");
                return p_data;
            }
            else
            {
                var blob = new Blob([p_data], {type: 'text/plain'});
                var p = p_url.split("/");
                saveAs(blob, p[p.length-1]);
                return p_data;
            }
        }
        catch (e)
        {
            throw e;
        }
    }
}

