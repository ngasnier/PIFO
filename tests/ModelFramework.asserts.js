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

import { ModelLoader } from "../js/modeling/ModelLoader.js";
import { Earth } from "../js/modeling/Earth.js";

import { Model } from "../js/modeling/Model.js";
import { Variable } from "../js/modeling/Variable.js";
import { VariableDescription } from "../js/modeling/VariableDescription.js";
import { Scenario } from "../js/front/Scenario.js";
import { RunScenario } from "../js/front/RunScenario.js";

var basicConfig = {
    "modules" : {
        "BarotropicCore": "modeling/BarotropicCore.js",
        "MercatorProjection": "modeling/MercatorProjection.js",
        "LeapFrogTimeIntegrator": "modeling/LeapFrogTimeIntegrator.js",
        "RobertAsselinTimeFilter": "modeling/RobertAsselinTimeFilter.js",
        "SchumannFilter": "modeling/SchumannFilter.js",
        "CouplingLimitedAreaBoundaryCondition": "modeling/CouplingLimitedAreaBoundaryCondition.js"
    },
    
    "core": "BarotropicCore",
    "name": "PIFO basic",
        
    "horizontalDomain": {
        "width": 111,
        "height": 72,
        "staggering": "C",
        "global": false,

        "projection": "MercatorProjection",
        "minLat":9,
        "maxLat":81,
        "minLon":-60,
        "maxLon":51
    },  
    
    "verticalDomain": {
        "staggering":  "L",
    },
    
    "timeIntegration": {
        "integrator": "LeapFrogTimeIntegrator",
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


/*var barotropeConfig = Object.assign({}, basicConfig);
barotropeConfig = Object.assign(barotropeConfig, {
    "name": "PIFO barotrope",

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
});*/

function getVariableNames(p_descriptions)
{
    var names = [];
    p_descriptions.forEach((v)=>
    {
        names.push(v.name);
    });
    return names;
}

test('Barotrope - tests fonctionnement basiques', () => {
    var loader = new ModelLoader("../");
    expect.assertions(26);
    
    return loader.loadModel(basicConfig).then((model) => {
        var zero = Variable.createVariable(1, model.width, model.height, false);

        // 1 On vérifie que les objets importants sont bien créés
        expect(model).not.toBeNull();
        
        // 2 Coeur dynamique
        expect(model.dynamicsCore).not.toBeNull();
        
        // 3 Intégrateur temporel
        expect(model.timeIntegrator).not.toBeNull();
        
        // 4 Une seule surface
        expect(model.surfacesCoords).arrayBeCloseTo([1]);
        
        // 5 Nb surfaces
        expect(model.nbSurfaces).toBe(1);
        
        // 6 Nb couches
        expect(model.nbLayers).toBe(0);

        // 7 Toutes les variables
        model.init();
        var variables = model.getVariablesDescriptions();
        var names = getVariableNames(variables);
        var expected_vars = ["U", "U_tdcy", "U_t",
                "V", "V_tdcy", "V_t",
                "phi", "phi_tdcy", "phi_t",
                "K", 
                "tourbillon", 
                "f", 
                "m",
                "latitudes", "longitudes"
        ];
        expect(names).toEqual(expect.arrayContaining(expected_vars));

        // 8 Il faut que les variables soient initialisées        
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
        
        // 9-10 Les coordonnées du coint haut gauche du domaine
        expect(model.getVariable("latitudes")[0]).toBeCloseTo(basicConfig.horizontalDomain.maxLat);
        expect(model.getVariable("longitudes")[0]).toBeCloseTo(basicConfig.horizontalDomain.minLon);
        // 11-12 Coin haut droit
        expect(model.getVariable("latitudes")[model.width-1]).toBeCloseTo(basicConfig.horizontalDomain.maxLat);
        expect(model.getVariable("longitudes")[model.width-1]).toBeCloseTo(basicConfig.horizontalDomain.maxLon-1);
        // 13-14 Coin bas droit
        var [dx, dy] = model.projection.getMeshSize();
        var [x, y] = model.projection.latLonToXY(basicConfig.horizontalDomain.minLat, basicConfig.horizontalDomain.maxLon);
        var [lat, lon] = model.projection.xyToLatLon(x-dx, y+dy);
        expect(model.getVariable("latitudes")[model.width*model.height-1]).toBeCloseTo(lat);
        expect(model.getVariable("longitudes")[model.width*model.height-1]).toBeCloseTo(lon);
        
        // **** On teste un premier pas de temps ****
        // 15 Calcul d'un premier pas de temps
        model.step();
        expect(model.time).toBe(basicConfig.timeIntegration.dt);
        
        // 16-20 Les calculs doivent fonctionner
        expect(Variable.containsBadValues(model.getVariable("U"))).toBe(false);
        expect(Variable.containsBadValues(model.getVariable("V"))).toBe(false);
        expect(Variable.containsBadValues(model.getVariable("phi"))).toBe(false);
        expect(Variable.containsBadValues(model.getVariable("K"))).toBe(false);
        expect(Variable.containsBadValues(model.getVariable("tourbillon"))).toBe(false);
                
        // 21 Calcul d'un second pas de temps
        model.step();
        expect(model.time).toBe(2*basicConfig.timeIntegration.dt);
        
        // 22-26 Les calculs doivent fonctionner
        expect(Variable.containsBadValues(model.getVariable("U"))).toBe(false);
        expect(Variable.containsBadValues(model.getVariable("V"))).toBe(false);
        expect(Variable.containsBadValues(model.getVariable("phi"))).toBe(false);
        expect(Variable.containsBadValues(model.getVariable("K"))).toBe(false);
        expect(Variable.containsBadValues(model.getVariable("tourbillon"))).toBe(false);
    });
});

test('Barotrope - initialisation coriolis et scaling factor', () => {
    var loader = new ModelLoader("../");
    expect.assertions(14);
    return loader.loadModel(basicConfig).then((model) => {
        // Initialise le modèle
        model.init();
        
        // Calcule du facteur m
        var m = model.getVariable("m");
        model.projection.getScaleFactors(model.getVariable("latitudes"), model.getVariable("longitudes"), m);

        // 1 Facteur d'échelle NO
        expect(m[0]).toBeCloseTo(6.392453221499659);
        
        // 2 Facteur d'échelle SE
        expect(m[m.length-1]).toBeCloseTo(1.0182663877131644);
       
        // Vérifie le facteur de coriolis
        var f = model.getVariable("f");
        var lats = Variable.createVariable(1, model.width, model.height, false);
        var lons = Variable.createVariable(1, model.width, model.height, false);
        model.getCoriolisPointCoords(lats, lons);
        var earth = new Earth();
        earth.getCoriolisFactors(lats, f);

        // 3 Facteur NO
        expect(f[0]).toBeCloseTo(0.00014410487910274076, 8);
        
        // 4 Facteur SE
        expect(f[f.length-1]).toBeCloseTo(0.000029821858622487933, 8);
                
        // 5-9 Les calculs doivent fonctionner
        model.step();
        expect(Variable.containsBadValues(model.getVariable("U"))).toBe(false);
        expect(Variable.containsBadValues(model.getVariable("V"))).toBe(false);
        expect(Variable.containsBadValues(model.getVariable("phi"))).toBe(false);
        expect(Variable.containsBadValues(model.getVariable("K"))).toBe(false);
        expect(Variable.containsBadValues(model.getVariable("tourbillon"))).toBe(false);
        
        // 10-15 Les calculs doivent fonctionner
        model.step();
        expect(Variable.containsBadValues(model.getVariable("U"))).toBe(false);
        expect(Variable.containsBadValues(model.getVariable("V"))).toBe(false);
        expect(Variable.containsBadValues(model.getVariable("phi"))).toBe(false);
        expect(Variable.containsBadValues(model.getVariable("K"))).toBe(false);
        expect(Variable.containsBadValues(model.getVariable("tourbillon"))).toBe(false);
    });
});

test('Barotrope - condition aux limites', () => {
    var testConfig = Object.assign({}, basicConfig);
    testConfig = Object.assign(testConfig, {
         "boundaryCondition": {
            "condition": "CouplingLimitedAreaBoundaryCondition",
            "relaxation": 8
        }
    });

    var loader = new ModelLoader("../");
    expect.assertions(6);
    return loader.loadModel(testConfig).then((model) => {
        // Initialise le modèle
        model.init();

        // 1 On a bien les variables...
        var variables = model.getVariablesDescriptions();
        var names = getVariableNames(variables);
        var expected_vars = ["U_couplage", "V_couplage","phi_couplage",
            "alpha_couplage"];
        expect(names).toEqual(expect.arrayContaining(expected_vars));

        // 2 L'init de alpha fonctionne...
        expect(Variable.containsBadValues(model.getVariable("alpha_couplage"))).toBe(false);
        
        // 3 Quelques tests de valeurs des bordures...
        var alpha = model.getVariable("alpha_couplage");
        expect([
            alpha[0], alpha[model.width-1], alpha[model.width*(model.height-1)], alpha[model.width*model.height-1],
            alpha[1+model.width], alpha[model.width-2+model.width], alpha[1+model.width*(model.height-2)], alpha[model.width-2+model.width*(model.height-2)],
            
            alpha[8+Math.floor(model.height/2)*model.width], alpha[model.width-9 + model.width*Math.floor(model.height/2)], 
            alpha[Math.floor(model.width/2)+model.width*8], alpha[Math.floor(model.width/2)+model.width*(model.height-9)],
            
            alpha[8+8*model.width], alpha[model.width-9+model.width*8], alpha[8+model.width*(model.height-9)], alpha[model.width-9+model.width*(model.height-9)],
            alpha[9+9*model.width], alpha[model.width-10+model.width*9], alpha[9+model.width*(model.height-10)], alpha[model.width-10+model.width*(model.height-10)],
        ]).arrayBeCloseTo([
            1, 1, 1, 1,
            0.5378828427399902, 0.5378828427399902, 0.5378828427399902, 0.5378828427399902,
            0.000670700260932966, 0.000670700260932966, 0.000670700260932966, 0.000670700260932966,
            0.000670700260932966, 0.000670700260932966, 0.000670700260932966, 0.000670700260932966,
            0, 0, 0, 0
        ], 0.000001);
        
        // 4 Teste le couplage sur une variable
        Variable.init(model.getVariable("U_couplage"), 1);
        Variable.init(model.getVariable("V_couplage"), 1);
        Variable.init(model.getVariable("phi_couplage"), 1);
        model.step();
        
        alpha = model.getVariable("U");
        expect([
            alpha[0], alpha[model.width-1], alpha[model.width*(model.height-1)], alpha[model.width*model.height-1],
            alpha[1+model.width], alpha[model.width-2+model.width], alpha[1+model.width*(model.height-2)], alpha[model.width-2+model.width*(model.height-2)],
            alpha[8+8*model.width], alpha[model.width-9+model.width*8], alpha[8+model.width*(model.height-9)], alpha[model.width-9+model.width*(model.height-9)],
            alpha[9+9*model.width], alpha[model.width-10+model.width*9], alpha[9+model.width*(model.height-10)], alpha[model.width-10+model.width*(model.height-10)],
        ]).arrayBeCloseTo([
            1, 1, 1, 1,
            0.5378828427399902, 0.5378828427399902, 0.5378828427399902, 0.5378828427399902,
            0.000670700260932966, 0.000670700260932966, 0.000670700260932966, 0.000670700260932966,
            0, 0, 0, 0
        ]);
        
        alpha = model.getVariable("V");
        expect([
            alpha[0], alpha[model.width-1], alpha[model.width*(model.height-1)], alpha[model.width*model.height-1],
            alpha[1+model.width], alpha[model.width-2+model.width], alpha[1+model.width*(model.height-2)], alpha[model.width-2+model.width*(model.height-2)],
            alpha[8+8*model.width], alpha[model.width-9+model.width*8], alpha[8+model.width*(model.height-9)], alpha[model.width-9+model.width*(model.height-9)],
            alpha[9+9*model.width], alpha[model.width-10+model.width*9], alpha[9+model.width*(model.height-10)], alpha[model.width-10+model.width*(model.height-10)],
        ]).arrayBeCloseTo([
            1, 1, 1, 1,
            0.5378828427399902, 0.5378828427399902, 0.5378828427399902, 0.5378828427399902,
            0.000670700260932966, 0.000670700260932966, 0.000670700260932966, 0.000670700260932966,
            0, 0, 0, 0
        ]);
        
        alpha = model.getVariable("phi");
        expect([
            alpha[0], alpha[model.width-1], alpha[model.width*(model.height-1)], alpha[model.width*model.height-1],
            alpha[1+model.width], alpha[model.width-2+model.width], alpha[1+model.width*(model.height-2)], alpha[model.width-2+model.width*(model.height-2)],
            alpha[8+8*model.width], alpha[model.width-9+model.width*8], alpha[8+model.width*(model.height-9)], alpha[model.width-9+model.width*(model.height-9)],
            alpha[9+9*model.width], alpha[model.width-10+model.width*9], alpha[9+model.width*(model.height-10)], alpha[model.width-10+model.width*(model.height-10)],
        ]).arrayBeCloseTo([
            1, 1, 1, 1,
            0.5378828427399902, 0.5378828427399902, 0.5378828427399902, 0.5378828427399902,
            0.000670700260932966, 0.000670700260932966, 0.000670700260932966, 0.000670700260932966,
            0, 0, 0, 0
        ]);
    });
});