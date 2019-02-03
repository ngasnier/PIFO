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

import { ModuleLoader } from "../util/ModuleLoader.js";
import { Model } from "./Model.js";

/**
 * Classe factory pour le modèle.
 * @type type
 */
export class ModelLoader {
    /**
     * 
     * @param {type} p_path chemin du dossier de base de chargement des classes
     * @returns {undefined}
     */
    constructor(p_path)
    {
        this.classPath = p_path;
    }
    
    /**
     * Charge et configure un modèle depuis une définition JSON
     * @param {type} config
     * @returns {ModelLoader.loadModel.model}
     */
    async loadModel(config)
    {
        if (!("modules" in config)) throw "No module definition section."
        var loader = new ModuleLoader(this.classPath, config.modules);

        var model = new Model();
        model.name = config.name;

        // *** Domaine horizontal
        if (!("horizontalDomain"  in config)) throw "No horizontal domain.";
        if ("staggering"  in config.horizontalDomain) 
            model.horizontalStaggering = config.horizontalDomain.staggering;
        else
            throw "No horizontal staggering.";
        
        if ("width"  in config.horizontalDomain) 
            model.width = config.horizontalDomain.width;
        else
            throw "No domain grid width specified.";
        
        if ("height" in config.horizontalDomain) 
            model.height = config.horizontalDomain.height;
        else
            throw "No domain grid height specified.";

        if ("staggering" in config.horizontalDomain)        
            model.horizontalStaggering = config.horizontalDomain.staggering;
        else
            throw "No horizontal grid staggering specified.";
        
        // paramètre plutôt sur la boundary condition ?
        if ("global" in config.horizontalDomain)
            model.global = config.horizontalDomain.global;
        
        if ("projection" in config.horizontalDomain) {
            model.projection = await loader.loadModule(config.horizontalDomain.projection);
            model.projection.params = config.horizontalDomain;
        } else {
            throw "no projection specified.";
        }

        console.log("TODO : gérer paramétrage spécifique filtre spatial")
        if ("filter" in config.horizontalDomain)
        {
            model.spatialFilter = await loader.loadModule(config.horizontalDomain.filter);
            model.spatialFilterInterval = config.horizontalDomain.filterInterval;
        }

        // *** Domaine vertical
        if (!("verticalDomain" in config)) throw "No vertical domain.";
        if ("staggering" in config.verticalDomain)
            model.verticalStaggering = config.verticalDomain.staggering;
        else
            throw "No vertical staggering specified.";
        
        // TODO
        console.log("TODO : définition des coordonnées verticales");
        model.verticalCoords = [1];

        // *** Coeur dynamique
        console.log("TODO : gérer paramétrage spécifique coeur dynamique")
        if ("core" in config) {
            model.dynamicsCore = await loader.loadModule(config.core);
        } else {
            throw "No dynamics core specified.";
        }
        
        // *** Intégration temporelle
        if (!("timeIntegration" in config)) throw "No time integration parameters.";
        if ("integrator" in config.timeIntegration) {
            model.timeIntegrator = await loader.loadModule(config.timeIntegration.integrator);
            console.log("TODO : gérer paramétrage spécifique intégrateur")
        } else {
            throw "No time integrator specified.";
        }
        if ("dt" in config.timeIntegration)
            model.dt = config.timeIntegration.dt;
        else
            throw "No time integration interval specified."

        // ** Condition aux limites        
        if ("boundaryCondition" in config) 
        {
            if ("condition" in config.boundaryCondition)
                model.boundaryCondition = await loader.loadModule(config.boundaryCondition.condition);
            else
                throw "Boundary condition section found, but no boundary condition specified.";            
            model.boundaryCondition.params = config.boundaryCondition;
        }

        // *** Filtre temporel
        console.log("TODO : gérer paramétrage spécifique filtre temporel")
        if ("filter" in config.timeIntegration)
        {
            model.timeFilter = await loader.loadModule(config.timeIntegration.filter);
        }

        return model;
    }
}