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

import { ModuleLoader } from "../util/ModuleLoader.js";

/**
 * Gère l'instaniation des objets et de leurs paramètres à partir d'un fichier
 * de configuration JSON.
 * @type type
 */
export class ConfigManager {
    /**
     * 
     * @param {type} p_classPath chemin de base de chargement des modules
     * @param {type} p_config
     * @returns {undefined}
     */
    constructor(p_classPath, p_config)
    {
        if (!("modules" in p_config)) throw "no modules section found.";
        if (!("global" in p_config)) throw "no global section found.";
        if (!("model" in p_config)) throw "no model definition found.";        
        if (!("scenario" in p_config)) throw "no scenario section found.";
       
        this.classPath = p_classPath;
        this.config = p_config;
        this.loader = new ModuleLoader(this.classPath, this.config.modules);
        this.globals = {};
        this.model = null;
    }
        
    /**
     * Instancie l'objet global référencé dans le fichier de config.
     * @param {type} p_object
     * @returns {undefined}
     */
    async getObject(p_object)
    {        
        if (!(p_object in this.config.global)) throw `object ${p_object} not found in global section.`;
        try {
            if (p_object in this.globals) return this.globals[p_object];
            var obj = await this.getObjectFromNode(this.config.global[p_object]);
            this.globals[p_object] = obj;
            return obj;
        }
        catch (e)
        {
            throw e;
        }
    }
    
    /**
     * Instancie le modèle décrit dans le fichier de config.
     * @returns {undefined}
     */
    async getModel()
    {
        try {
            if (this.model==null) this.model = await this.getObjectFromNode(this.config.model);
            return this.model;
        }
        catch (e)
        {
            throw e;
        }
    }
    
    /**
     * Instancie le scenario de run du modèle.
     * @returns {undefined}
     */
    async getScenario(p_scenario)
    {
        if (!(p_scenario in this.config.scenario)) throw `scenario ${p_scenario} not found in global section.`;
        try {
            var obj = await this.getObjectFromNode(this.config.scenario[p_scenario]);
            obj.model = await this.getModel();
            return obj;
        }
        catch (e)
        {
            throw e;
        }
    }
    
    /**
     * 
     * @param {type} p_object
     * @returns {ConfigManager.getObjectFromNode.obj}
     */
    async getObjectFromNode(p_node)
    {
        try {
            var obj;
            var objparams = {};
            if ("class" in p_node) obj = await this.loader.loadModule(p_node.class);
            else if ("ref" in p_node) obj = await this.getObject(p_node.ref);
            else obj = {};

            for (var prop in p_node)
            {
                obj[prop] = await this.getValue(p_node[prop]);
            }

            return obj;
        }
        catch (e)
        {
            throw e;
        }
    }
    
    /**
     * 
     */
    async getValue(p_prop)
    {
        try {
            if (Array.isArray(p_prop))
            {
                var val = [];
                for (var i in p_prop)
                {
                    val.push(await this.getValue(p_prop[i]));
                }
                return val;
            }
            else if ( p_prop instanceof Object)
            {
                var obj = await this.getObjectFromNode(p_prop);
                return obj;
            }
            else 
            {
                return p_prop;
            }
        }
        catch (e)
        {
            throw e;
        }
    }
    
}
