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

import { Earth } from "../js/modeling/Earth.js";
import { Model } from "../js/modeling/Model.js";
import { Variable } from "../js/modeling/Variable.js";
import { VariableDescription } from "../js/modeling/VariableDescription.js";
import { Scenario } from "../js/front/Scenario.js";
import { ConfigManager } from "../js/front/ConfigManager.js";
import { WGRIBTextFieldDataSource } from "../js/front/WGRIBTextFieldDataSource.js";
import { FileInfo } from "../js/util/FileInfo.js";
import { TextFile } from "../js/util/TextFile.js";

const fs = require('fs');
const path = require('path');


var configCible = {
    /*
     * Définit les noms de modules et les fichiers à charger correspondants
     */
    "modules" : {
        "Model": "modeling/Model.js",
        "BarotropicCore": "modeling/BarotropicCore.js",
        "MercatorProjection": "modeling/MercatorProjection.js",
        "LeapFrogTimeIntegrator": "modeling/LeapFrogTimeIntegrator.js",
        "LatLonDomain": "modeling/LatLonDomain.js",
        "RobertAsselinTimeFilter": "modeling/RobertAsselinTimeFilter.js",
        "SchumannFilter": "modeling/SchumannFilter.js",
        "CouplingLimitedAreaBoundaryCondition": "modeling/CouplingLimitedAreaBoundaryCondition.js",
        
        "WGRIBTextFieldDataSource": "front/WGRIBTextFieldDataSource.js",
        
        "DataProcessor": "processing/DataProcessor.js",
        "ProjectionComponent": "processing/ProjectionComponent.js",
        "ArithmeticComponent": "processing/ArithmeticComponent.js",
        "CoriolisFactorComponent": "processing/CoriolisFactorComponent.js",
        "ScalingFactorComponent": "processing/ScalingFactorComponent.js",
        "WorkflowTask": "processing/WorkflowTask.js",
        "WGRIBInputComponent": "processing/WGRIBInputComponent.js",
        "WGRIBOutputComponent": "processing/WGRIBOutputComponent.js",
        
        "RunScenario": "front/RunScenario.js",
        "CouplingStep": "front/CouplingStep.js",
        "HistoryStep": "front/HistoryStep.js"
    },
    
    /*
     * Définit des objets globaux pouvant être référencés dans la config
     */
    "global": {
        "inputDomain":{
            "class" : "LatLonDomain",
            "minLat": -90,
            "maxLat": 90,
            "minLon": 0,
            "maxLon": 359.5,
            "dlat": 0.5,
            "dlon": 0.5,
            "cyclic": true
        },
        
        "modelDomain": {
            "class": "MercatorProjection",
            "width": 111,
            "height": 72,
            "horizontalStaggering": "C",
            "minLat":9,
            "maxLat":81,
            "minLon":-60,
            "maxLon":51
        },
        
        "outputDomain": {
            "class" : "LatLonDomain",
            "minLat": 9,
            "maxLat": 81,
            "minLon": -60,
            "maxLon": 51,
            "dlat": 1,
            "dlon": 1,
            "cyclic":false
        },
        
        "gfsdata": {
            "class": "WGRIBTextFieldDataSource",
            "baseURL" : "res/run/2018120612",
            "catalog" : [ 
                {"name": "ugrd_500", "description":"", "units":""},
                {"name": "vgrd_500", "description":"", "units":""},
                {"name": "hgt_500", "description":"", "units":""}
            ]
        },        

        "inputdata": {
            "class": "WGRIBTextFieldDataSource", 
            "baseURL" : "res/test/run" ,
            "catalog" : [ 
                {"name": "U", "description":"", "units":""},
                {"name": "V", "description":"", "units":""},
                {"name": "phi", "description":"", "units":""},
                {"name": "f", "description":"", "units":""},
                {"name": "m", "description":"", "units":""}
            ]
        },
        
        "outputdir" : {
            "ref": "inputdata",
            "class": "WGRIBTextFieldDataSource", 
            "baseURL" : "res/test/output",
            "catalog" : [ 
                {"name": "U", "description":"", "units":""},
                {"name": "V", "description":"", "units":""},
                {"name": "phi", "description":"", "units":""},
                {"name": "f", "description":"", "units":""},
                {"name": "m", "description":"", "units":""}
            ]            
        }
    },
    
    /*
     * Définit les caractéristiques du modèle géré par cette config
     */
    "model": {
        "class": "Model",

        "dynamicsCore": {
            "class": "BarotropicCore"
        },

        "name": "PIFO barotrope",

        "projection": {
            "ref": "modelDomain"
        },

        "timeIntegrator" : {
            "class": "LeapFrogTimeIntegrator"
        },                 

        "width": 111,
        "height": 72,
        "horizontalStaggering": "C",
        "global": false,
        "filterInterval": 1,
        "verticalStaggering":  "L",

        "dt": 15
    },
    
    /*
     * Paramétrage des différents modes de fonctionnement, scénarios...
     */
    "scenario": {
        "preprocessor" : {
            "class": "DataProcessor",
            
            "processList": [
                { "name":"U", "task" : "basic_interpolation", "parameters": [{"name":"source", "value":"ugrd_500"}, {"name": "variable", "value":"U"} ]},
                { "name":"V", "task" : "basic_interpolation", "parameters": [{"name":"source", "value":"vgrd_500"}, {"name":"variable", "value": "V"} ]},
                { "name":"phi", "task" : "phi_interpolation", "parameters": [{"name":"source", "value":"hgt_500"}, {"name":"variable", "value": "phi"}]},
                { "name":"m", "task" : "m_generation", "parameters": [{"name":"destination", "value": "m"}] },
                { "name":"f", "task" : "f_generation", "parameters": [{"name":"destination", "value": "f"}] }
            ],
           
            "tasks": [
                {
                    "name":"basic_interpolation",
                    "class":"WorkflowTask",
                    "bindParameters": [
                        {"name":"source", "bindComponent":"variable_source", "parameter":"source"},
                        {"name":"variable", "bindComponent":"projection_component", "parameter":"gridPosVariable"},
                        {"name":"variable", "bindComponent":"projection_component", "parameter":"scaleVariable"},
                        {"name":"variable", "bindComponent":"projection_component", "parameter":"numberTypeVariable"},
                        {"name":"variable", "bindComponent":"variable_destination", "parameter":"destination"}
                    ],
                    "components": [
                        {
                            "name": "variable_source", 
                            "class":"WGRIBInputComponent", 
                            "dataSource": { "ref": "gfsdata" }
                        },
                        {
                            "name": "projection_component", 
                            "class":"ProjectionComponent",
                            "sourceDomain": { "ref": "inputDomain" },
                            "projection": { "ref": "modelDomain" }
                        },
                        {
                            "name": "variable_destination", 
                            "class":"WGRIBOutputComponent", 
                            "dataSource": { "ref": "inputdata" }
                        }
                    ],
                    "links": [
                        {"outputComponent":"variable_source", "output":"main", "inputComponent":"projection_component", "input":"main"},
                        {"outputComponent":"projection_component", "output":"main", "inputComponent":"variable_destination", "input":"main"}
                        
                    ]
                },
                {
                    "name":"phi_interpolation",
                    "class":"WorkflowTask",
                    "bindParameters": [
                        {"name":"source", "bindComponent":"variable_source", "parameter":"source"},
                        {"name":"variable", "bindComponent":"projection_component", "parameter":"gridPosVariable"},
                        {"name":"variable", "bindComponent":"projection_component", "parameter":"scaleVariable"},
                        {"name":"variable", "bindComponent":"projection_component", "parameter":"numberTypeVariable"},
                        {"name":"variable", "bindComponent":"variable_destination", "parameter":"destination"}
                    ],
                    "components": [
                        {
                            "name": "variable_source", 
                            "class":"WGRIBInputComponent", 
                            "dataSource": { "ref": "gfsdata" }
                        },
                        {
                            "name": "projection_component", 
                            "class":"ProjectionComponent",
                            "sourceDomain": { "ref": "inputDomain" },
                            "projection": { "ref": "modelDomain" }
                        },
                        {
                            "name": "hgt_to_phi", 
                            "class":"ArithmeticComponent",
                            "operation":"*", 
                            "value":9.8066 
                        },
                        { 
                            "name": "phi_to_epp", 
                            "class": "ArithmeticComponent", 
                            "operation":"-", 
                            "value":40000 
                        },
                        {
                            "name": "variable_destination", 
                            "class":"WGRIBOutputComponent", 
                            "dataSource": { "ref": "inputdata" }
                        }
                    ],
                    "links": [
                        {"outputComponent":"variable_source", "output":"main", "inputComponent":"projection_component", "input":"main"},
                        {"outputComponent":"projection_component", "output":"main", "inputComponent":"hgt_to_phi", "input":"main"},
                        {"outputComponent":"hgt_to_phi", "output":"main", "inputComponent":"phi_to_epp", "input":"main"},
                        {"outputComponent":"phi_to_epp", "output":"main", "inputComponent":"variable_destination", "input":"main"}
                    ]
                },
                {
                    "name":"m_generation",
                    "class":"WorkflowTask",
                    "bindParameters": [
                        {"name":"destination", "bindComponent":"m_destination", "parameter":"destination"}
                    ],
                    "components": [
                        {
                            "name": "m_component", 
                            "class":"ScalingFactorComponent"
                        },
                        {
                            "name": "m_destination", 
                            "class":"WGRIBOutputComponent", 
                            "dataSource": { "ref": "inputdata" }
                        }
                    ],
                    "links": [
                        {"outputComponent":"m_component", "output":"main", "inputComponent":"m_destination", "input":"main"}
                        
                    ]
                },
                {
                    "name":"f_generation",
                    "class":"WorkflowTask",
                    "bindParameters": [
                        {"name":"destination", "bindComponent":"f_destination", "parameter":"destination"}
                    ],
                    "components": [
                        {
                            "name": "f_component", 
                            "class":"CoriolisFactorComponent"
                        },
                        {
                            "name": "f_destination", 
                            "class":"WGRIBOutputComponent", 
                            "dataSource": { "ref": "inputdata" }
                        }
                    ],
                    "links": [
                        {"outputComponent":"f_component", "output":"main", "inputComponent":"f_destination", "input":"main"}
                        
                    ]
                }
            ],
            
            "times": [0] 
        },        
        
        "run": {
            "class": "RunScenario",
            "dataSource": {"ref": "inputdata"},

            "stopTime": 1,
            
            "steps": [
                { 
                    "class":"CouplingStep",
                    "dataSource" : {"ref": "inputdata"},
                    "variables": [
                        {"name":"U_couplage", "source": "U"},
                        {"name":"V_couplage", "source": "V"},
                        {"name":"phi_couplage", "source": "phi"}
                    ]
                },
                {
                    "class":"HistoryStep",
                    "dataSource" : {"ref": "outputdir"},
                    "historyInterval" : 1,
                    "variables": [
                        {"name":"U"},
                        {"name":"V"},
                        {"name":"phi"},
                        {"name":"m"},
                        {"name":"f"},
                        {"name": "latitudes"}, 
                        {"name": "longitudes"}
                    ]
                }]
        }
    }
};

function getVariableNames(p_descriptions)
{
    var names = [];
    p_descriptions.forEach((v)=>
    {
        names.push(v.name);
    });
    return names;
}

function cleandir(directory)
{
    var files = fs.readdirSync(directory, {withFileTypes:true});
    for (const file of files) {
        if (!file.isDirectory())
            fs.unlinkSync(path.join(directory, file.name));
    }
}

function prepareDataSet()
{
    fs.symlinkSync(path.join(process.cwd(), "res/run/2018120612/fileinfo.minimal.txt"), "res/run/2018120612/fileinfo.tmp.txt");
    fs.renameSync("res/run/2018120612/fileinfo.tmp.txt", "res/run/2018120612/fileinfo.txt");
}

test('Barotrope - tests fonctionnement basiques', () => {
    var config = configCible;
    var manager = new ConfigManager("../", config);
    expect.assertions(29);
    
    return manager.getModel().then((model) => {
        var horizontalDomain = config.global.modelDomain;

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
        model.setup();
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
        
        // 8 Random variable : on teste si les propriétés sont bien reprises
        var u = model.getVariable("U");
        var u_tdcy = model.getVariable("U_tdcy");
        var u_t = model.getVariable("U_t");
        var u_description = [u.offsetx, u.offsetx, 
            u.offsety, u.offsety,
            u.scale, u.scale,
            u.number, u.number,
            u.verticalPosition, u.verticalPosition];
        var test_result = [u_tdcy.offsetx, u_t.offsetx,
            u_tdcy.offsety, u_t.offsety,
            u_tdcy.scale, u_t.scale,
            u_tdcy.number, u_t.number,
            u_tdcy.verticalPosition, u_t.verticalPosition];
        expect(test_result).toEqual(u_description);

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
        
        // 10-11 Les coordonnées du coint haut gauche du domaine
        expect(model.getVariable("latitudes").get2(0, 0)).toBeCloseTo(horizontalDomain.maxLat);
        expect(model.getVariable("longitudes").get2(0,0)).toBeCloseTo(horizontalDomain.minLon);
        // 12-13 Coin haut droit
        expect(model.getVariable("latitudes").get2(model.width-1, 0)).toBeCloseTo(horizontalDomain.maxLat);
        expect(model.getVariable("longitudes").get2(model.width-1, 0)).toBeCloseTo(horizontalDomain.maxLon-1);
        // 14-15 Coin bas droit
        var [dx, dy] = model.projection.getMeshSize();
        var [x, y] = model.projection.latLonToXY(horizontalDomain.minLat, horizontalDomain.maxLon);
        var [lat, lon] = model.projection.xyToLatLon(x-dx, y+dy);
        expect(model.getVariable("latitudes").get2(model.width-1, model.height-1)).toBeCloseTo(lat);
        expect(model.getVariable("longitudes").get2(model.width-1, model.height-1)).toBeCloseTo(lon);
        
        // **** On teste un premier pas de temps ****
        // 16 Calcul d'un premier pas de temps
        model.step();
        expect(model.time).toBe(model.dt);
        
        // 17-21 Les calculs doivent fonctionner
        expect(Variable.containsBadValues(model.getVariable("U"))).toBe(false);
        expect(Variable.containsBadValues(model.getVariable("V"))).toBe(false);
        expect(Variable.containsBadValues(model.getVariable("phi"))).toBe(false);
        expect(Variable.containsBadValues(model.getVariable("K"))).toBe(false);
        expect(Variable.containsBadValues(model.getVariable("tourbillon"))).toBe(false);

        // 22 Les variables doivent être correctement swappées avec leurs méta
        u = model.getVariable("U");
        u_t = model.getVariable("U_t");
        test_result = [u.name, u_t.name,
            u.offsetx, u_t.offsetx, 
            u.offsety, u_t.offsety,
            u.scale, u_t.scale,
            u.number, u_t.number,
            u.verticalPosition, u_t.verticalPosition];
        u_description = ["U", "U_t",
            1, 1,
            0, 0,
            true, true,
            VariableDescription.NUMBER_TYPE_U_VECTOR, VariableDescription.NUMBER_TYPE_U_VECTOR,
            VariableDescription.VERTICAL_POSITION_SURFACE, VariableDescription.VERTICAL_POSITION_SURFACE];
        expect(test_result).toEqual(u_description);
        
        // 23 Calcul d'un second pas de temps
        model.step();
        expect(model.time).toBe(2*model.dt);
        
        // 24-28 Les calculs doivent fonctionner
        expect(Variable.containsBadValues(model.getVariable("U"))).toBe(false);
        expect(Variable.containsBadValues(model.getVariable("V"))).toBe(false);
        expect(Variable.containsBadValues(model.getVariable("phi"))).toBe(false);
        expect(Variable.containsBadValues(model.getVariable("K"))).toBe(false);
        expect(Variable.containsBadValues(model.getVariable("tourbillon"))).toBe(false);

        // 29 Les variables doivent être correctement swappées avec leurs méta
        // On teste avec V ce qui revient au même et augmente la couverture du test
        var v = model.getVariable("V");
        var v_t = model.getVariable("V_t");
        test_result = [v.name, v_t.name,
            v.offsetx, v_t.offsetx, 
            v.offsety, v_t.offsety,
            v.scale, v_t.scale,
            v.number, v_t.number,
            v.verticalPosition, v_t.verticalPosition];
        u_description = ["V", "V_t",
            0, 0,
            1, 1,
            true, true,
            VariableDescription.NUMBER_TYPE_V_VECTOR, VariableDescription.NUMBER_TYPE_V_VECTOR,
            VariableDescription.VERTICAL_POSITION_SURFACE, VariableDescription.VERTICAL_POSITION_SURFACE];
        expect(test_result).toEqual(u_description);
    });
});

test('Barotrope - initialisation coriolis et scaling factor', () => {
    var config = configCible;
    var manager = new ConfigManager("../", config);
    expect.assertions(14);
    return manager.getModel().then((model) => {
        // Initialise le modèle
        model.setup();
        
        // Calcule du facteur m
        var m = model.getVariable("m");
        model.projection.getScaleFactors(model.getVariable("latitudes"), model.getVariable("longitudes"), m);

        // 1 Facteur d'échelle NO
        expect(m.get2(0,0)).toBeCloseTo(6.392453221499659);
        
        // 2 Facteur d'échelle SE
        expect(m.get2(m.width-1, m.height-1)).toBeCloseTo(1.0182663877131644);
       
        // Vérifie le facteur de coriolis
        var f = model.getVariable("f");
        var lats = Variable.createVariable(1, model.width, model.height, false);
        var lons = Variable.createVariable(1, model.width, model.height, false);
        model.getCoriolisPointCoords(lats, lons);
        var earth = new Earth();
        earth.getCoriolisFactors(lats, f);

        // 3 Facteur NO
        expect(f.get2(0,0)).toBeCloseTo(0.00014398666634958814, 8);
        
        // 4 Facteur SE
        expect(f.get2(f.width-1, f.height-1)).toBeCloseTo(0.00002516423152187653, 8);
                
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
    var config = JSON.parse(JSON.stringify(configCible));
    config.model = Object.assign(config.model, {
         "boundaryCondition": {
            "class": "CouplingLimitedAreaBoundaryCondition",
            "relaxation": 8
        }
    });
    var manager = new ConfigManager("../", config);
    expect.assertions(6);
    return manager.getModel().then((model) => {
        // Initialise le modèle
        model.setup();

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
            alpha.get2(0,0), alpha.get2(model.width-1,0), alpha.get2(model.width-1, model.height-1), alpha.get2(0, model.height-1),
            alpha.get2(1,1), alpha.get2(model.width-2,1), alpha.get2(model.width-2, model.height-2), alpha.get2(1, model.height-2),
            
            alpha.get2(8, Math.floor(model.height/2)), alpha.get2(model.width-9, Math.floor(model.height/2)), 
            alpha.get2(Math.floor(model.width/2),8), alpha.get2(Math.floor(model.width/2), model.height-9),
            
            alpha.get2(8, 8), alpha.get2(model.width-9, 8), alpha.get2(8, model.height-9), alpha.get2(model.width-9, model.height-9),
            alpha.get2(9, 9), alpha.get2(model.width-10, 9), alpha.get2(9, model.height-10), alpha.get2(model.width-10, model.height-10),
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
            alpha.get2(0,0), alpha.get2(model.width-1,0), alpha.get2(model.width-1, model.height-1), alpha.get2(0, model.height-1),
            alpha.get2(1,1), alpha.get2(model.width-2,1), alpha.get2(model.width-2, model.height-2), alpha.get2(1, model.height-2),
            alpha.get2(8, 8), alpha.get2(model.width-9, 8), alpha.get2(8, model.height-9), alpha.get2(model.width-9, model.height-9),
            alpha.get2(9, 9), alpha.get2(model.width-10, 9), alpha.get2(9, model.height-10), alpha.get2(model.width-10, model.height-10),
        ]).arrayBeCloseTo([
            1, 1, 1, 1,
            0.5378828427399902, 0.5378828427399902, 0.5378828427399902, 0.5378828427399902,
            0.000670700260932966, 0.000670700260932966, 0.000670700260932966, 0.000670700260932966,
            0, 0, 0, 0
        ]);
        
        alpha = model.getVariable("V");
        expect([
            alpha.get2(0,0), alpha.get2(model.width-1,0), alpha.get2(model.width-1, model.height-1), alpha.get2(0, model.height-1),
            alpha.get2(1,1), alpha.get2(model.width-2,1), alpha.get2(model.width-2, model.height-2), alpha.get2(1, model.height-2),
            alpha.get2(8, 8), alpha.get2(model.width-9, 8), alpha.get2(8, model.height-9), alpha.get2(model.width-9, model.height-9),
            alpha.get2(9, 9), alpha.get2(model.width-10, 9), alpha.get2(9, model.height-10), alpha.get2(model.width-10, model.height-10),
        ]).arrayBeCloseTo([
            1, 1, 1, 1,
            0.5378828427399902, 0.5378828427399902, 0.5378828427399902, 0.5378828427399902,
            0.000670700260932966, 0.000670700260932966, 0.000670700260932966, 0.000670700260932966,
            0, 0, 0, 0
        ]);
        
        alpha = model.getVariable("phi");
        expect([
            alpha.get2(0,0), alpha.get2(model.width-1,0), alpha.get2(model.width-1, model.height-1), alpha.get2(0, model.height-1),
            alpha.get2(1,1), alpha.get2(model.width-2,1), alpha.get2(model.width-2, model.height-2), alpha.get2(1, model.height-2),
            alpha.get2(8, 8), alpha.get2(model.width-9, 8), alpha.get2(8, model.height-9), alpha.get2(model.width-9, model.height-9),
            alpha.get2(9, 9), alpha.get2(model.width-10, 9), alpha.get2(9, model.height-10), alpha.get2(model.width-10, model.height-10),
        ]).arrayBeCloseTo([
            1, 1, 1, 1,
            0.5378828427399902, 0.5378828427399902, 0.5378828427399902, 0.5378828427399902,
            0.000670700260932966, 0.000670700260932966, 0.000670700260932966, 0.000670700260932966,
            0, 0, 0, 0
        ]);
    });
});

test('Barotrope - filtre de schumann', () => {
    var config = JSON.parse(JSON.stringify(configCible));
    config.model = Object.assign(config.model, {
         "spatialFilter": {
            "class": "SchumannFilter"
         }
    });
    var manager = new ConfigManager("../", config);
    expect.assertions(10);
    return manager.getModel().then((model) => {
        // Initialise le modèle
        model.setup();
        
        // 1-5 Les calculs doivent fonctionner
        model.step();
        expect(Variable.containsBadValues(model.getVariable("U"))).toBe(false);
        expect(Variable.containsBadValues(model.getVariable("V"))).toBe(false);
        expect(Variable.containsBadValues(model.getVariable("phi"))).toBe(false);
        expect(Variable.containsBadValues(model.getVariable("K"))).toBe(false);
        expect(Variable.containsBadValues(model.getVariable("tourbillon"))).toBe(false);
        
        // 6-10 Les calculs doivent fonctionner
        model.step();
        expect(Variable.containsBadValues(model.getVariable("U"))).toBe(false);
        expect(Variable.containsBadValues(model.getVariable("V"))).toBe(false);
        expect(Variable.containsBadValues(model.getVariable("phi"))).toBe(false);
        expect(Variable.containsBadValues(model.getVariable("K"))).toBe(false);
        expect(Variable.containsBadValues(model.getVariable("tourbillon"))).toBe(false);
    });
});

test("fileinfo", () =>{
    expect.assertions(2);
    return TextFile.readFile("res/run/2018120612/fileinfo.txt").then((data) => {
            var file = new FileInfo(data);

            // Nb : modifié la source pour ne contenir que t=0
            //expect(file.recordList.length).toBe(17);
            expect(file.recordList.length).toBe(1);
            
            var txt = file.getText();
            
            expect(txt).toBe(data);
    });
});

test('Préprocesseur - barotrope', () => {
    var config = JSON.parse(JSON.stringify(configCible));
    var manager = new ConfigManager("../", config);
    prepareDataSet();
    cleandir("res/test/run");
    expect.assertions(5);
    return manager.getScenario("preprocessor").then((preprocessor) => { 
        try {
            //preprocessor.onMessage = (msg) => console.log(msg);
            return preprocessor.start().then(ret => {
                    var checkdata = async function()
                    {
                        while (preprocessor.status==Scenario.STATE_RUN)
                        {
                            await preprocessor.step();
                        }
                        
                        await preprocessor.finish();
                        try
                        {
                            var ds_orig = new WGRIBTextFieldDataSource();
                            ds_orig.baseURL = "res/verif/barotrope/2018120612";
                            ds_orig.catalog = [
                                { "name":"U"},
                                { "name":"V"},
                                { "name":"phi"},
                                { "name":"f"},
                                { "name":"m"}
                            ];
                            await ds_orig.open("R");

                            var ds_res = new WGRIBTextFieldDataSource();
                            ds_res.baseURL = "res/test/run";
                            ds_res.catalog = [
                                { "name":"U"},
                                { "name":"V"},
                                { "name":"phi"},
                                { "name":"f"},
                                { "name":"m"}
                            ];
                            await ds_res.open("R");
                            
                            var u_orig = await ds_orig.getField("U", 0);
                            var v_orig = await ds_orig.getField("V", 0);
                            var phi_orig = await ds_orig.getField("phi", 0);
                            var f_orig = await ds_orig.getField("f", 0);
                            var m_orig = await ds_orig.getField("m", 0);
                            
                            var u_res = await ds_res.getField("U", 0);
                            var v_res = await ds_res.getField("V", 0);
                            var phi_res = await ds_res.getField("phi", 0);
                            var f_res = await ds_res.getField("f", 0);
                            var m_res = await ds_res.getField("m", 0);

                            expect(u_res.data).arrayBeCloseTo(u_orig.data, 0.00001);
                            expect(v_res.data).arrayBeCloseTo(v_orig.data, 0.00001);
                            expect(phi_res.data).arrayBeCloseTo(phi_orig.data, 0.00001);
                            expect(f_res.data).arrayBeCloseTo(f_orig.data, 0.000000001);
                            expect(m_res.data).arrayBeCloseTo(m_orig.data, 0.00001);

                            return "OK";
                        }
                        catch (e)
                        {
                            throw e;
                        }
                    }
                    return checkdata();                
                })
                .catch(e=>{
                    throw e;
                });
        }
        catch (e)
        {
            throw e;
        }
    });
});


test('Run - barotrope', () => {
    var config = JSON.parse(JSON.stringify(configCible));
    // La condition aux limites doit être ajoutée (pas inclue dans la config
    // test de base)
    config.model = Object.assign(config.model, {
         "boundaryCondition": {
            "class": "CouplingLimitedAreaBoundaryCondition",
            "relaxation": 8
        }
    });
    
    var manager = new ConfigManager("../", config);
    prepareDataSet();
    cleandir("res/test/output");
    expect.assertions(5);
    return manager.getScenario("run").then((run) => { 
        try {
            //run.onMessage = (msg) => console.log(msg);
            return run.start().then(ret => {
                
                    var checkdata = async function()
                    {
                        while (run.status==Scenario.STATE_RUN)
                        {
                            await run.step();
                        }
                        
                        await run.finish();
                        
                        try
                        {
                            var ds_orig = new WGRIBTextFieldDataSource();
                            ds_orig.baseURL = "res/verif/barotrope/2018120612";
                            ds_orig.catalog = [
                                { "name":"U"},
                                { "name":"V"},
                                { "name":"phi"},
                                { "name":"f"},
                                { "name":"m"}
                            ];
                            await ds_orig.open("R");

                            var ds_res = new WGRIBTextFieldDataSource();
                            ds_res.baseURL = "res/test/output";
                            ds_res.catalog = [
                                { "name":"U"},
                                { "name":"V"},
                                { "name":"phi"},
                                { "name":"f"},
                                { "name":"m"}
                            ];
                            await ds_res.open("R");
                            
                            var u_orig = await ds_orig.getField("U", 1);
                            var v_orig = await ds_orig.getField("V", 1);
                            var phi_orig = await ds_orig.getField("phi", 1);
                            var f_orig = await ds_orig.getField("f", 1);
                            var m_orig = await ds_orig.getField("m", 1);
                            
                            var u_res = await ds_res.getField("U", 1);
                            var v_res = await ds_res.getField("V", 1);
                            var phi_res = await ds_res.getField("phi", 1);
                            var f_res = await ds_res.getField("f", 1);
                            var m_res = await ds_res.getField("m", 1);

                            expect(u_res.data).arrayBeCloseTo(u_orig.data, 0.00001);
                            expect(v_res.data).arrayBeCloseTo(v_orig.data, 0.00001);
                            expect(phi_res.data).arrayBeCloseTo(phi_orig.data, 0.00001);
                            expect(f_res.data).arrayBeCloseTo(f_orig.data, 0.000000001);
                            expect(m_res.data).arrayBeCloseTo(m_orig.data, 0.00001);

                            return "OK";
                        }
                        catch (e)
                        {
                            throw e;
                        }
                    }
                    return checkdata();                
                })
                .catch(e=>{
                    throw e;
                });
        }
        catch (e)
        {
            throw e;
        }
    });
});
