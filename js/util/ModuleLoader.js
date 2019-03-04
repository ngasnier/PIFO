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
 * Permet de charger dynamiquement des classes dans des modules.
 */
export class ModuleLoader {
    /**
     * Initialise le loader.
     * @param p_path chemin de base de chargement (e.g. "../" ou "/")
     * @param p_config liste de classe : fichier à chercher
     */
    constructor(p_path, p_config)
    {
        this.searchPath = p_path;
        if (!this.searchPath.endsWith("/")) this.searchPath += "/";
        this.config = p_config;
    }
    
    /**
     * Charge et instancie la classe indiquée.
     */   
    async loadModule(p_module)
    {
        var relate_to_path = this.searchPath;

        if (!(p_module in this.config)) throw `module ${p_module} not found in config.`;

        var exp = this.config[p_module].includes("/") ? this.config[p_module].split("/"): [];
        relate_to_path += exp.slice(0, exp.length-1).join("/");
        
        exp = relate_to_path.split("/");
        var relate_parent = exp.slice(0, exp.length-1).join("/");
        
        if (!relate_to_path.endsWith("/")) relate_to_path+="/";
        if (!relate_parent.endsWith("/")) relate_parent+="/";

        return new Promise((resolve, reject) => {
            var module_path = this.config[p_module].startsWith("/") ? this.config[p_module]: this.searchPath+this.config[p_module];
            if (p_module in this.config)
            {
                if (typeof module !== 'undefined' && module.exports) 
                {
                    // Node
                    var esmImport = require('esm')(module);
                    var loaded_module = esmImport(module_path);
                    var cls = new loaded_module[p_module];
                    resolve(cls);
                }
                else
                {
                    // Navigateur
                    var xhr = new XMLHttpRequest();
                        xhr.open('GET', module_path+"?" + (new Date()).getTime(), true);
                        xhr.onerror = reject;
                        xhr.onload = function () {
                            var module_resolver = p_module+"_module";
                            self[module_resolver] = function (m) {
                                delete self[module_resolver];
                                var cls = new m[p_module];
                                resolve(cls);
                            };
                            var textContent = xhr.responseText.replace(/from ".\//g, "from \""+relate_to_path)
                                .replace(/from '.\//g, "from '"+relate_to_path)
                                .replace(/from "..\//g, "from \""+relate_parent)
                                .replace(/from '..\//g, "from '"+relate_parent);
                            textContent += "\n"+module_resolver+"({"+p_module+"});";
                            var html = document.documentElement;
                            var script = document.createElement('script');
                            script.textContent = textContent;
                            script.type="module";
                            html.appendChild(script);
                        }
                        xhr.send(null);
                }
            }
            else
            {
                reject( `module ${p_module} not found`);
            }
        });
    }
}