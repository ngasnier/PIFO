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
    async loadModule(p_class)
    {
        var relate_to_path = this.searchPath;
        var exp = this.config[p_class].includes("/") ? this.config[p_class].split("/"): [];
        relate_to_path += exp.slice(0, exp.length-1).join("/")+"/";
        return new Promise((resolve, reject) => {
            var module_path = this.config[p_class].startsWith("/") ? this.config[p_class]: this.searchPath+this.config[p_class];
            if (p_class in this.config)
            {
                if (typeof module !== 'undefined' && module.exports) 
                {
                    // Node
                    var esmImport = require('esm')(module);
                    var loaded_module = esmImport(module_path);
                    var cls = new loaded_module[p_class];
                    resolve(cls);
                }
                else
                {
                    // Navigateur
                    var xhr = new XMLHttpRequest();
                        xhr.open('GET', module_path);
                        xhr.onerror = reject;
                        xhr.onload = function () {
                            var module_resolver = p_class+"_module";
                            self[module_resolver] = function (m) {
                                delete self[module_resolver];
                                var cls = new m[p_class];
                                resolve(cls);
                            };
                            var textContent = xhr.responseText.replace(/from ".\//g, "from \""+relate_to_path)
                                .replace(/from '.\//g, "from '"+relate_to_path);
                            textContent += "\n"+module_resolver+"({"+p_class+"});";
                            var html = document.documentElement;
                            var script = document.createElement('script');
                            script.textContent = textContent;
                            script.type="module";
                            html.appendChild(script);
                        }
                        xhr.send(null);
                }

                /*  if (this.config[p_class].startsWith("/"))
                    loaded_module = await import(this.config[p_class]);
                else
                    loaded_module = await import(this.searchPath+this.config[p_class]);
                var cls = new loaded_module[p_class];/
                return cls;*/
            }
            else
            {
                reject( "module "+p_class+" not found");
            }
        });
        
/*        var module = null;
        if (p_class in this.config)
        {
            var path = "";
            if (this.config[p_class].startsWith("/"))
                path = this.config[p_class];
            else
                path =  this.searchPath+this.config[p_class];
            
            return new Promise(function(resolve, reject)
            {
                import(path).then((module)=>{
                        var cls = new module[p_class];
                        resolve(cls);
                    })
                    .catch((error)=>{
                        reject();
                    });
            });
        }
        else
        {
            throw "module "+p_class+" not found";
        }
*/        
    }
}

function pouet()
{
    console.log("pouet");
}