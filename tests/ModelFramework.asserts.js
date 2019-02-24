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
import { Preprocessor } from "../js/front/Preprocessor.js";
import { WGRIBTextFieldDataSource } from "../js/front/WGRIBTextFieldDataSource.js";
import { FileInfo } from "../js/util/FileInfo.js";
import { TextFile } from "../js/util/TextFile.js";
import { ProjectionTransformation } from "../js/front/ProjectionTransformation.js";


var configCible = {
    /*
     * Définit les noms de modules et les fichiers à charger correspondants
     */
    "modules" : {
        "Model": "modeling/Model.js",
        "BarotropicCore": "modeling/BarotropicCore.js",
        "MercatorProjection": "modeling/MercatorProjection.js",
        "LeapFrogTimeIntegrator": "modeling/LeapFrogTimeIntegrator.js",
        "RobertAsselinTimeFilter": "modeling/RobertAsselinTimeFilter.js",
        "SchumannFilter": "modeling/SchumannFilter.js",
        "CouplingLimitedAreaBoundaryCondition": "modeling/CouplingLimitedAreaBoundaryCondition.js",
        
        "WGRIBTextFieldDataSource": "front/WGRIBTextFieldDataSource.js",
        "WGRIBTextFieldDataWriter": "front/WGRIBTextFieldDataWriter.js",
        "Preprocessor": "front/Preprocessor.js",
        "ProjectionTransformation": "front/ProjectionTransformation.js",
        "ArithmeticTransformation": "front/ArithmeticTransformation.js",
        "CoriolisFactorTransformation": "front/CoriolisFactorTransformation.js",
        "ScalingFactorTransformation": "front/ScalingFactorTransformation.js"
    },
    
    /*
     * Définit des objets globaux pouvait être référencés dans la config
     */
    "global": {
        "inputDomain":{
            "minLat": -90,
            "maxLat": 90,
            "minLon": 0,
            "maxLon": 359.5,
            "dlat": 0.5,
            "dlon": 0.5
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
            "minLat": 9,
            "maxLat": 81,
            "minLon": -60,
            "maxLon": 51,
            "dlat": 1,
            "dlon": 1
        },
        
        "gfsdata": {
            "class": "WGRIBTextFieldDataSource",
            "baseURL" : "res/run/2018120612",
            "catalog" : [ 
                {"name": "ugrd_500", "description":"", "units":""},
                {"name": "vgrd_500", "description":"", "units":""},
                {"name": "hgt_500", "description":"", "units":""}
            ]/*, 
                    
            "fieldsDefs": [
                { 
                    "names": ["ugrd_500", "vgrd_500", "hgt_500"],
                    "levels": [  ]
                }
            ]*/
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

        /*"timeFilter": {
            "class": "RobertAsselinTimeFilter"
        },*/

        "dt": 15
    },
    
    /*
     * Paramétrage des différents modes de fonctionnement, scénarios...
     */
    "scenario": {
        "preprocessor" : {
            "class": "Preprocessor",
            "dataSource": { "ref": "gfsdata"},
            "dataWriter": { "class": "WGRIBTextFieldDataSource", "baseURL" : "run" },
            "transformations": [
                { "name": "horizontal_hinterpolation", "class": "ProjectionTransformation", "projection": { "ref" : "modelDomain"}, "sourceDomain": {"ref" : "inputDomain"} },
                { "name": "hgt_to_phi", "class": "ArithmeticTransformation", "operation":"*", "value":9.8066 },
                { "name": "geop_epp", "class": "ArithmeticTransformation", "operation":"-", "value":40000 },
                { "name": "f_calc", "class": "CoriolisFactorTransformation" },
                { "name": "m_calc", "class": "ScalingFactorTransformation" }
            ],
            "processus": [
                { "name": "basic_projection", "transformations": [ "horizontal_hinterpolation"] },
                { "name": "z500_preparation", "transformations": [ "horizontal_hinterpolation", "hgt_to_phi", "geop_epp"] }, 
                { "name": "f_generation", "transformations": [ "f_calc"] },
                { "name": "m_generation", "transformations": [ "m_calc"] }
                
            ],
            "output": [
                { "variable":"U", "source":"ugrd_500", "processus" : "basic_projection" },
                { "variable":"V", "source":"vgrd_500", "processus" : "basic_projection" },
                { "variable":"phi", "source": "hgt_500", "processus" : "z500_preparation" },
                // TODO : il faudra mettre ces variables en "PARAMETER" dans le BarotropicCore
                { "variable":"f", "processus" : "f_generation" },
                { "variable":"m", "processus" : "m_generation" }
            ],
            "outputDir": "run",
            "times": [0] // liste des temps qu'on veut traiter (peut différer de ce qui est dispo dans la datasource)
        }/*,
        "run": {
            "class": "ADefinir",
            // Les paramètres du run, à définir...
            "inputTimes": { "ref": "times" },
            "stopTime": 48,
            "inputRelief": false,
            "historyInterval": 6,
            "historyDir": "output"
        }*/
    },
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
        expect(model.getVariable("latitudes")[0]).toBeCloseTo(horizontalDomain.maxLat);
        expect(model.getVariable("longitudes")[0]).toBeCloseTo(horizontalDomain.minLon);
        // 12-13 Coin haut droit
        expect(model.getVariable("latitudes")[model.width-1]).toBeCloseTo(horizontalDomain.maxLat);
        expect(model.getVariable("longitudes")[model.width-1]).toBeCloseTo(horizontalDomain.maxLon-1);
        // 14-15 Coin bas droit
        var [dx, dy] = model.projection.getMeshSize();
        var [x, y] = model.projection.latLonToXY(horizontalDomain.minLat, horizontalDomain.maxLon);
        var [lat, lon] = model.projection.xyToLatLon(x-dx, y+dy);
        expect(model.getVariable("latitudes")[model.width*model.height-1]).toBeCloseTo(lat);
        expect(model.getVariable("longitudes")[model.width*model.height-1]).toBeCloseTo(lon);
        
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
    var config = Object.assign({}, configCible);
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

test('Barotrope - filtre de schumann', () => {
    var config = Object.assign({}, configCible);
    config.model = Object.assign(config.model, {
         "spatialFilter": {
            "class": "SchumannFilter"
         }
    });
    var manager = new ConfigManager("../", config);
    expect.assertions(10);
    return manager.getModel().then((model) => {
        // Initialise le modèle
        model.init();
        
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

test('Transformations', () => {
    var manager = new ConfigManager("../", configCible);
    expect.assertions(4);
    return manager.getScenario("preprocessor").then((preprocessor) => { 
        // Assure qu'on a bien les variables
        preprocessor.model.init();
        
        // Test avec une variable 2D initialisée avec une constante
        var data = Variable.createVariable(0, 720, 361, false);
        Variable.init(data, 1);
        
        var udesc = preprocessor.model.getVariableDescription("U");
        var trans = preprocessor.getTransformation("horizontal_hinterpolation");
        
        // 1 - la tranformation est correctement instanciée
        expect(trans).toBeDefined();
        
        var data_interp = trans.transform(udesc, data);
        
        // 2 - Déjà on veut un tableau de la bonne taille...
        expect(data_interp.length).toBe(preprocessor.model.getVariable("U").length);
        
        // 3 - Ca fait pas de undefined ou des trucs comme ça
        expect(Variable.containsBadValues(data_interp)).toBe(false);
        
        // 4 - Sur le vent le 1 est mis au facteur d'échelle...
        expect(data_interp[0]).toBeCloseTo(0.1564434465);
        
        // Test avec une variable 3D
        
        
        return;
    });
});

test("fileinfo", () =>{
    expect.assertions(2);
    return TextFile.readFile("res/run/2018120612/fileinfo.txt").then((data) => {
            var file = new FileInfo(data);

            expect(file.recordList.length).toBe(17);
            
            var txt = file.getText();
            
            expect(txt).toBe(data);
    });
});

test('Préprocesseur - barotrope', () => {
    var config = Object.assign({}, configCible);
    var manager = new ConfigManager("../", config);
    expect.assertions(5);
    return manager.getScenario("preprocessor").then((preprocessor) => { 
        try {
            preprocessor.model.init();
            return preprocessor.run().then(ret => {
                    var checkdata = async function()
                    {
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
                            ds_res.baseURL = "run";
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

                            expect(u_res).arrayBeCloseTo(u_orig, 0.00001);
                            expect(v_res).arrayBeCloseTo(v_orig, 0.00001);
                            expect(phi_res).arrayBeCloseTo(phi_orig, 0.00001);
                            expect(f_res).arrayBeCloseTo(f_orig, 0.000000001);
                            expect(m_res).arrayBeCloseTo(m_orig, 0.00001);

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
