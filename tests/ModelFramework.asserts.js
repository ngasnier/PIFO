/* 
 * Copyright (C) 2019 nicolas
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

import { ModuleLoader } from "../js/util/ModuleLoader.js";

import { MercatorProjection } from "../js/modeling/MercatorProjection.js";
import { Model } from "../js/modeling/Model.js";
import { Variable } from "../js/modeling/Variable.js";
import { VariableDescription } from "../js/modeling/VariableDescription.js";
import { Scenario } from "../js/front/Scenario.js";
import { RunScenario } from "../js/front/RunScenario.js";

var barotropeConfig = {
    "modules" : {
        "BarotropicCore": "modeling/BarotropicCore.js",
        "MercatorProjection": "modeling/MercatorProjection.js",
        "LeapFrogTimeIntegrator": "modeling/LeapFrogTimeIntegrator.js",
        "RobertAsselinTimeFilter": "modeling/RobertAsselinTimeFilter.js",
        "SchumannFilter": "modeling/SchumannFilter.js",
        "CouplingLimitedAreaBoundaryCondition": "modeling/CouplingLimitedAreaBoundaryCondition.js"
    },
    
    "core": "BarotropicCore",
    "name": "PIFO barotrope",
        
    "preprocessor": {
        "minLat": -90,
        "maxLat": 90,
        "minLon": 0,
        "maxLon": 359.5,
        "dlat": 0.5,
        "dlon": 0.5,
        "levels": [100, 15000, 35000, 50000, 65000, 85000, 92500, 100000],
        "preprocessDir" : "input"
    },

    "horizontalDomain": {
        "width": 111,
        "height": 72,
        "staggering": "C",
        "global": false,
        "filter": "SchumannFilter",
        "filterInterval": 1,

        "projection": "MercatorProjection",
        "minLat":9,
        "maxLat":81,
        "minLon":-60,
        "maxLon":51
    },  
    
    "verticalDomain": {
        "staggering":  "L",
        "ptop": 100.0,
        "nbSurfaces": 9
    },
    
    "boundaryCondition": {
        "condition": "CouplingLimitedAreaBoundaryCondition",
        "relaxation": 8
    },
       
    "filter": "none",
    
    "timeIntegration": {
        "integrator": "LeapFrogTimeIntegrator",
        "filter" : "RobertAsselinTimeFilter",
        "dt": 15
    },

    "enablePrecipitationScheme" : false,
    "enableConvectionScheme" : false,

    // A partir d'ici on a des paramètres liés au scénario souhaité et au jeu 
    // de données
    "inputRelief": false,
    "inputDir": "run",
    
    "inputTimes": [ 0 ],
    "stopTime": 48,
    "historyInterval": 6,
    "historyDir": "output"
};

async function createModel(config)
{
    var classpath = "../";
    var loader = new ModuleLoader(classpath, config.modules);
        
    var model = new Model();
    model.name = config.name;
    
    // *** Domaine horizontal
    model.horizontalStaggering = config.horizontalDomain.staggering;
    model.width = config.horizontalDomain.width;
    model.height = config.horizontalDomain.height;
    model.global = config.horizontalDomain.global;
    model.relaxation = config.horizontalDomain.relaxation;
    
    model.projection = await loader.loadModule(config.horizontalDomain.projection);
    model.projection.params = config.horizontalDomain;
    model.horizontalStaggering = config.horizontalDomain.staggering;    
    
    if (config.horizontalDomain.filter!=null)
    {
        model.spatialFilter = await loader.loadModule(config.horizontalDomain.filter);
        model.spatialFilterInterval = config.horizontalDomain.filterInterval;
    }

    // *** Domaine vertical
    model.verticalStaggering = config.verticalDomain.levelType;    
    model.verticalCoords = [1];

    // *** Coeur dynamique
    model.dynamicsCore = await loader.loadModule(config.core);
    
    // *** Intégration temporelle
    model.timeIntegrator = await loader.loadModule(config.timeIntegration.integrator);
    model.dt = config.timeIntegration.dt;
    
    // ** Condition aux limites
    model.boundaryCondition = await loader.loadModule(config.boundaryCondition.condition);
    model.boundaryCondition.relaxation = config.boundaryCondition.relaxation;
    
    // *** Filtre temporel
    model.timeFilter = await loader.loadModule(config.timeIntegration.filter);
       
    return model;
}

function getVariableNames(p_descriptions)
{
    var names = [];
    p_descriptions.forEach((v)=>
    {
        names.push(v.name);
    });
    return names;
}

test('Instanciation de modèle barotrope', () => {
    expect.assertions(15);
    return createModel(barotropeConfig).then((model) => {
        // 1 On vérifie que les objets importants sont bien créés
        expect(model).not.toBeNull();
        
        // 2 Coeur dynamique
        expect(model.dynamicsCore).not.toBeNull();
        
        // 3 Intégrateur temporel
        expect(model.timeIntegrator).not.toBeNull();
        
        // 4 Filtrages temporel et spatial
        var pass = true;
        pass = pass && model.timeFilter!=null;
        pass = pass && model.spatialFilter!=null;
        expect(pass).toBe(true);        
               
        // 5 Une seule surface
        expect(model.surfacesCoords).arrayBeCloseTo([1]);
        
        // 6 Nb surfaces
        expect(model.nbSurfaces).toBe(1);
        
        // 7 Nb couches
        expect(model.nbLayers).toBe(0);
      
        // 8 Toutes les variables
        model.init();
        var variables = model.getVariablesDescriptions();
        var names = getVariableNames(variables);
        var expected_vars = ["U", "U_tdcy", "U_couplage", "U_t",
                "V", "V_tdcy", "V_couplage", "V_t",
                "phi", "phi_tdcy", "phi_couplage", "phi_t",
                "K", 
                "tourbillon", 
                "f", 
                "m",
        ];
        expect(names).toEqual(expect.arrayContaining(expected_vars));

        // 9 Il faut que les variables soient initialisées        
        var initialized = true;
        variables.forEach((v)=>
            {
                var expected=model.nbLayers;
                if (v.verticalPosition==VariableDescription.VERTICAL_POSITION_SURFACE) expected = model.nbSurfaces;
                
                var varray = model.getVariable(v.name);
               
                var sz = 0;
                if (varray!=null)
                    sz = (varray.length>0 && (varray[0].constructor===Array || varray[0].constructor===Float64Array)) ? varray.length : 1;
                
                initialized = initialized && (varray != null);
                
                initialized = initialized && (sz == expected);
                
            });
        expect(initialized).toBe(true);
        
        // Vérifie les facteurs de grille
        var m = model.getVariable("m");

        // 10 Facteur d'échelle NO
        expect(m[0]).toBeCloseTo(6.392453221499659);
        
        // 11 Facteur d'échelle SE
        expect(m[m.length-1]).toBeCloseTo(1.0182663877131644);
       
        // Vérifie le facteur de coriolis
        var f = model.getVariable("f");

        // 12 Facteur NO
        expect(f[0]).toBeCloseTo(0.00014410487910274076);
        
        // 13 Facteur SE
        expect(f[f.length-1]).toBeCloseTo(0.000029821858622487933);

        // 14 Calcul d'un premier pas de temps
        model.step();
        expect(model.time).toBe(barotropeConfig.timeIntegration.dt);
        
        // 15 Calcul d'un second pas de temps
        model.step();
        expect(model.time).toBe(2*barotropeConfig.timeIntegration.dt);
    });
});
