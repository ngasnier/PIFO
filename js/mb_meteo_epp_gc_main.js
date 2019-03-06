/* 
Copyright (C) 2018 Nicolas GASNIER (http://www.meteo-blois.fr/contact/)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

import { ConfigManager } from "/js/front/ConfigManager.js";
import { BarotropicInterpolator } from "/js/ui/BarotropicInterpolator.js";
import { Variable } from "/js/modeling/Variable.js";
import { VariableDescription } from "/js/modeling/VariableDescription.js";

import { WindHTMLRenderer } from "/js/ui/WindHTMLRenderer.js";
import { TourbillonHTMLRenderer } from "/js/ui/TourbillonHTMLRenderer.js";
import { Z500HTMLRenderer } from "/js/ui/Z500HTMLRenderer.js";
import { BarotropicVerificationHTMLRenderer } from "/js/ui/BarotropicVerificationHTMLRenderer.js";
import { ModelUI } from "/js/ui/ModelUI.js";

import { HumpDisturbance } from "/js/cases/HumpDisturbance.js";

var ui = new ModelUI();

var interpolator = new BarotropicInterpolator();
var windRenderer = new WindHTMLRenderer();
var z500Renderer = new Z500HTMLRenderer();
var tourbillonRenderer = new TourbillonHTMLRenderer();
var verificationRenderer = new BarotropicVerificationHTMLRenderer();

var z500_display = [];
var latitudes = [];
var longitudes = [];

var manager = null;

var barotropeConfig = {
    /*
     * Définit les noms de modules et les fichiers à charger correspondants
     */
    "modules" : {
        "Model": "modeling/Model.js",
        "BarotropicCore": "modeling/BarotropicCore.js",
        "BarotropicSemiImplicitCore": "modeling/BarotropicSemiImplicitCore.js",
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
        "ScalingFactorTransformation": "front/ScalingFactorTransformation.js",
        
        "RunScenario": "front/RunScenario.js",
        "CouplingStep": "front/CouplingStep.js",
        "HistoryStep": "front/HistoryStep.js"
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
            ]
        },
        
        "inputdata": {
            "class": "WGRIBTextFieldDataSource", 
            "baseURL" : "run" ,
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
            "baseURL" : "output",
            "catalog" : [ 
                {"name": "U", "description":"", "units":""},
                {"name": "V", "description":"", "units":""},
                {"name": "phi", "description":"", "units":""},
                {"name": "f", "description":"", "units":""},
                {"name": "m", "description":"", "units":""}
            ]            
        },
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
        
        "boundaryCondition": {
            "class": "CouplingLimitedAreaBoundaryCondition",
            "relaxation": 8
        },

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
                { "variable":"f", "processus" : "f_generation" },
                { "variable":"m", "processus" : "m_generation" }
            ],
            "outputDir": "run",
            "times": [0] 
        },
        
        "run": {
            "class": "RunScenario",
            "dataSource": {"ref": "inputdata"},

            "stopTime": 48,
            
            "steps": [
                { 
                    "class":"CouplingStep",
                    "dataSource" : {"ref": "inputdata"},
                    "variables": [
                        {"name":"U_couplage", "source": "U"},
                        {"name":"V_couplage", "source": "V"},
                        {"name":"phi_couplage", "source": "phi"}
                    ]
                }/*,
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
                }*/]
        }
    }
};

$(document).ready(function () {   
    ui.setStatusString("Initialisation");
    //$.getJSON("config.json",initialize);
    initialize(barotropeConfig).then(()=>{});
});

async function initialize(config) 
{   
    try
    {
        var classpath = "/js/";
        manager = new ConfigManager(classpath, config);

        ui.scenario = await manager.getScenario("run");

        ui.variableRepresentations = {Vent: {group:"HistoricVariables", name:"Vent", levels:[1], renderer: windRenderer},
            Z500 : {group:"HistoricVariables", name:"Z500", levels:[1], renderer: z500Renderer},
            Tourbillon : {group:"DiagnosticVariables", name:"Tourbillon", levels:[1], renderer: tourbillonRenderer},
            Verifications : {group:"DiagnosticVariables", name:"Verifications", levels:[1], renderer: verificationRenderer}
        };

        ui.beforeDisplayCallback = function()
        {
            switch (ui.getDisplayVariable())
            {
                case "Vent":
                    windRenderer.width = ui.model.width;
                    windRenderer.height = ui.model.height;
                    windRenderer.U = ui.model.getVariable("U");
                    windRenderer.V = ui.model.getVariable("V");
                    break;
                case "Z500":
                    z500Renderer.width = ui.model.width;
                    z500Renderer.height = ui.model.height;
                    interpolator.modelToZ500(ui.model.getVariable("phi"), z500_display);
                    z500Renderer.variable = z500_display;
                    break;
                case "Tourbillon":
                    tourbillonRenderer.width = ui.model.width;
                    tourbillonRenderer.height = ui.model.height;
                    tourbillonRenderer.variable = ui.model.getVariable("tourbillon");
                    break;
                case "Verifications":
                    verificationRenderer.model = ui.model;
                    break;
            }
        };

        ui.beforeExportCallback = function()
        {
            var k = ui.getDisplayLevel();
            switch (ui.getDisplayVariable())
            {
                case "Z500":
                    interpolator.modelToZ500(ui.model.getVariable("phi"), z500_display);
                    ui.variableRepresentations["Z500"].data = z500_display;
                    break;
            }
        };

        // Bind l'UI...
    /*    $("#testCaseButton").click(function () { 
            initTestCase();
        });*/

        // Charge les données
        ui.reset();
        return "ok";
    }
    catch (e)
    {
        console.log(e);
    }
}

function initTestCase()
{
    // TODO : intégration beurk, il est temps que je me fasse un vrai framework avec de vrais test case...
/*    var testcase = new HumpDisturbance();
    
    ui.model.width = testcase.width;
    ui.model.height = testcase.height;
    ui.model.semiImplicite = false;
    
    ui.model.dt = 10;
    ui.model.dlat = 0.1;
    ui.model.dlon = 0.1;
    ui.model.nlat = 20;
    ui.model.slat = ui.model.nlat - ui.model.height * ui.model.dlon;
    ui.model.elon = 51;
    ui.model.wlon = ui.model.elon - ui.model.width * ui.model.dlon;
    
    ui.model.relaxation = 0;   */
    
    ui.setStatusString("Prêt");
    ui.model.init();

    /*Variable.copy(ui.model.getVariable("U"), testcase.getInitialU());
    Variable.copy(ui.model.getVariable("V"), testcase.getInitialV());
    Variable.copy(ui.model.getVariable("phi"), testcase.getInitialPhi());
    
    Variable.copy(ui.model.getVariable("U_couplage"), testcase.getInitialU());
    Variable.copy(ui.model.getVariable("V_couplage"), testcase.getInitialV());
    Variable.copy(ui.model.getVariable("phi_couplage"), testcase.getInitialPhi());

    // On triche sur la projection et coriolis...
    Variable.init(ui.model.getVariable("m"), 1);
    Variable.init(ui.model.getVariable("inv_m"), 1);
    Variable.init(ui.model.getVariable("f"), 0);*/
}
