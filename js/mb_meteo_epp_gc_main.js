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

import { WindHTMLRenderer } from "./ui/WindHTMLRenderer.js";
import { TourbillonHTMLRenderer } from "./ui/TourbillonHTMLRenderer.js";
import { Z500HTMLRenderer } from "./ui/Z500HTMLRenderer.js";
import { T850HTMLRenderer } from "./ui/T850HTMLRenderer.js";
import { VerticalVelocityHTMLRenderer } from "./ui/VerticalVelocityHTMLRenderer.js";
import { QvHTMLRenderer } from "./ui/QvHTMLRenderer.js";
import { PressureHTMLRenderer } from "./ui/PressureHTMLRenderer.js";
import { TemperatureHTMLRenderer } from "./ui/TemperatureHTMLRenderer.js";
import { RainHTMLRenderer } from "./ui/RainHTMLRenderer.js";
import { BarotropicVerificationHTMLRenderer } from "/js/ui/BarotropicVerificationHTMLRenderer.js";
import { ModelUI } from "/js/ui/ModelUI.js";

import { VerticalInterpolator } from "./ui/VerticalInterpolator.js";

import { HumpDisturbance } from "/js/cases/HumpDisturbance.js";

var ui = new ModelUI();

var interpolator = new BarotropicInterpolator();
var windRenderer = new WindHTMLRenderer();
var z500Renderer = new Z500HTMLRenderer();
var t850Renderer = new T850HTMLRenderer();
var verticalVelocityRenderer = new VerticalVelocityHTMLRenderer();
var tourbillonRenderer = new TourbillonHTMLRenderer();
var qvRenderer = new QvHTMLRenderer();
var pressureRenderer = new PressureHTMLRenderer();
var rainRenderer = new RainHTMLRenderer();
var temperatureRenderer = new TemperatureHTMLRenderer();
var verificationRenderer = new BarotropicVerificationHTMLRenderer();

var verticalInterpolator = new VerticalInterpolator();


var z500_display = [];
var t850_display = [];
var latitudes = [];
var longitudes = [];

var manager = null;

/*var barotropeConfig = {
    "modules" : {
        "Model": "modeling/Model.js",
        "BarotropicCore": "modeling/BarotropicCore.js",
        "BarotropicSemiImplicitCore": "modeling/BarotropicSemiImplicitCore.js",
        "BaroclinicHydrostaticCore": "modeling/BaroclinicHydrostaticCore.js",
        "MercatorProjection": "modeling/MercatorProjection.js",
        "LeapFrogTimeIntegrator": "modeling/LeapFrogTimeIntegrator.js",
        "RobertAsselinTimeFilter": "modeling/RobertAsselinTimeFilter.js",
        "SchumannFilter": "modeling/SchumannFilter.js",
        "CouplingLimitedAreaBoundaryCondition": "modeling/CouplingLimitedAreaBoundaryCondition.js",
        
        "WGRIBTextFieldDataSource": "front/WGRIBTextFieldDataSource.js",
        
        "Preprocessor": "processing/Preprocessor.js",
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
    
    "global": {
        "layers": [0.0481350396465511,
            0.184775644761717,
            0.3110947031394134,
            0.4365726975546128,
            0.5617802104119394,
            0.6868661597951571,
            0.8118869790121533,
            0.9368688226982536],
        
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
            "baseURL" : "res/verif/barocline/2018120612" ,
            "catalog" : [ 
                {"name": "U", "description":"", "units":"", "levels": {"ref": "layers"}},
                {"name": "V", "description":"", "units":"", "levels": {"ref": "layers"}},
                {"name": "T", "description":"", "units":"", "levels": {"ref": "layers"}},
                {"name": "Z", "description":"", "units":""},
                {"name": "qv", "description":"", "units":"", "levels": {"ref": "layers"}},
                {"name": "f", "description":"", "units":""},
                {"name": "m", "description":"", "units":""},
                {"name": "sfcgeop", "description":"", "units":""}
            ]
        },
        
        "outputdir" : {
            "ref": "inputdata",
            "class": "WGRIBTextFieldDataSource", 
            "baseURL" : "output",
            "catalog" : [ 
                {"name": "U", "description":"", "units":""},
                {"name": "V", "description":"", "units":""},
                {"name": "T", "description":"", "units":""},
                {"name": "Z", "description":"", "units":""},
                {"name": "qv", "description":"", "units":""},
                {"name": "f", "description":"", "units":""},
                {"name": "m", "description":"", "units":""},
                {"name": "tourbillon", "description":"", "units":""},
                {"name": "sfcgeop", "description":"", "units":""}
            ]            
        },
    },
    
    "model": {
        "class": "Model",

        "dynamicsCore": {
            "class": "BaroclinicHydrostaticCore"
        },

        "name": "PIFO",

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
                
        "verticalCoords": [
            0.001,
            0.0481350396465511,
            0.125875,
            0.184775644761717,
            0.25075,
            0.3110947031394134,
            0.375625,
            0.4365726975546128,
            0.5005,
            0.5617802104119394,
            0.6253749999999999,
            0.6868661597951571,
            0.7502499999999999,
            0.8118869790121533,
            0.8751249999999998,
            0.9368688226982536,
            0.9999999999999998],
        
        "boundaryCondition": {
            "class": "CouplingLimitedAreaBoundaryCondition",
            "relaxation": 8
        },

        "dt": 15
    },
    
    "scenario": {
        "preprocessor" : {
            "class": "Preprocessor",
            "dataSource": { "ref": "gfsdata"},
            "dataWriter": { "class": "WGRIBTextFieldDataSource", "baseURL" : "run" },
            "transformations": [
                { "name": "horizontal_interpolation", "class": "ProjectionComponent", "projection": { "ref" : "modelDomain"}, "sourceDomain": {"ref" : "inputDomain"} },
                { "name": "vertical_interpolation", "class": "VerticalInterpolationComponent" },
                { "name": "rh_to_qv", "class": "HumidityComponent" },
                { "name": "hgt_to_phi", "class": "ArithmeticComponent", "operation":"*", "value":9.8066 },
                { "name": "ln_ps", "class": "ArithmeticComponent", "operation":"log"},
                { "name": "f_calc", "class": "CoriolisFactorComponent" },
                { "name": "m_calc", "class": "ScalingFactorComponent" }
            ],
            "processus": [
                { "name": "basic_projection", "transformations": [ "horizontal_interpolation", "vertical_interpolation"] },
                { "name": "rh_preparation", "transformations": [ "horizontal_interpolation", "vertical_interpolation", "rh_to_qv"] },
                { "name": "z_preparation", "transformations": [ "horizontal_interpolation", "ln_ps"] },
                { "name": "sfchgt_preparation", "transformations": [ "horizontal_interpolation", "hgt_to_phi"] }, 
                { "name": "f_generation", "transformations": [ "f_calc"] },
                { "name": "m_generation", "transformations": [ "m_calc"] }
                
            ],
            "output": [
                { "variable":"U", "source":"ugrd", "processus" : "basic_projection" },
                { "variable":"V", "source":"vgrd", "processus" : "basic_projection" },
                { "variable":"T", "source":"tmp", "processus" : "basic_projection" },
                { "variable":"qv", "source":"rh", "processus" : "rh_preparation" },
                { "variable":"Z", "source":"sfcprs", "processus" : "z_preparation" },
                { "variable":"sfcgeop", "source": "sfchgt", "processus" : "sfchgt_preparation" },
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
                        {"name":"T_couplage", "source": "T"},
                        {"name":"Z_couplage", "source": "Z"},
                        {"name":"qv_couplage", "source": "qv"}
                    ]
                },
                {
                    "class":"HistoryStep",
                    "dataSource" : {"ref": "outputdir"},
                    "historyInterval" : 1,
                    "variables": [
                        {"name":"U"},
                        {"name":"V"},
                        {"name":"T"},
                        {"name":"Z"},
                        {"name":"qv"},
                        {"name":"phi"},
                        {"name":"m"},
                        {"name":"f"},
                        {"name": "latitudes"}, 
                        {"name": "longitudes"}
                    ]
                }]
        }
    }
};*/


$(document).ready(function () {   
    ui.setStatusString("Initialisation");
    $.getJSON("/barocline.default.json", function (config)
    {
        initialize(config).then(()=>{});
    });
//    initialize(barotropeConfig).then(()=>{});
});

async function initialize(config) 
{   
    try
    {
        var classpath = "/js/";
        manager = new ConfigManager(classpath, config);

        ui.scenario = await manager.getScenario("run");
        
        /* -------- BAROCLINE ------------ */
        ui.beforeResetCallback = function()
        {
            z500_display = Variable.createVariable(1, ui.model.width, ui.model.height);
            t850_display = Variable.createVariable(1, ui.model.width, ui.model.height);        
        };
        ui.afterResetCallback = function()
        {
            ui.variableRepresentations = {Vent: {group:"HistoricVariables", name:"Vent", levels:ui.model.layersCoords, renderer: windRenderer},
                Temperature: {group:"HistoricVariables", name:"Temperature", levels:ui.model.layersCoords, renderer: temperatureRenderer},
                Z500 : {group:"HistoricVariables", name:"Z500", levels:[1], renderer: z500Renderer, data:z500_display},
                T850 : {group:"HistoricVariables", name:"T850", levels:[1], renderer: t850Renderer, data:t850_display},
                QV : {group:"HistoricVariables", name:"QV", levels:ui.model.layersCoords, renderer: qvRenderer},
                SfcPrs : {group:"HistoricVariables", name:"SfcPrs", levels:[1], renderer: pressureRenderer},
                Tourbillon : {group:"DiagnosticVariables", name:"Tourbillon", levels:ui.model.layersCoords, renderer: tourbillonRenderer},
                VV : {group:"DiagnosticVariables", name:"VV", levels:ui.model.surfacesCoords, renderer: verticalVelocityRenderer},
                Pluie : {group:"DiagnosticVariables", name:"Pluie", levels:[1], renderer: rainRenderer},
                Neige : {group:"DiagnosticVariables", name:"Neige", levels:[1], renderer: rainRenderer}
            };        
        };
        
        ui.beforeDisplayCallback = function()
        {
            var k = ui.getDisplayLevel();
            switch (ui.getDisplayVariable())
            {
                case "Vent":
                    windRenderer.width = ui.model.width;
                    windRenderer.height = ui.model.height;
                    windRenderer.U = ui.model.getVariable("U")[k];
                    windRenderer.V = ui.model.getVariable("V")[k];
                    break;
                case "Z500":
                    z500Renderer.width = ui.model.width;
                    z500Renderer.height = ui.model.height;
                    verticalInterpolator.sigmaLevels = ui.model.layersCoords;
                    Variable.copy(ui.model.getVariable("ps"), verticalInterpolator.surfacePressure);
                    verticalInterpolator.modelToPressureLevel(ui.model.getVariable("phi"), 50000, z500_display);
                    geopInterpolator.modelToHeight(z500_display, z500_display);
                    z500Renderer.variable = z500_display;
                    break;
                case "T850":
                    t850Renderer.width = ui.model.width;
                    t850Renderer.height = ui.model.height;
                    verticalInterpolator.sigmaLevels = ui.model.layersCoords;
                    Variable.copy(ui.model.getVariable("ps"), verticalInterpolator.surfacePressure);
                    verticalInterpolator.modelToPressureLevel(ui.model.getVariable("T"), 85000, t850_display);
                    t850Renderer.variable = t850_display;
                    break;
                case "Tourbillon":
                    tourbillonRenderer.width = ui.model.width;
                    tourbillonRenderer.height = ui.model.height;
                    tourbillonRenderer.variable = ui.model.getVariable("tourbillon")[k];
                    tourbillonRenderer.ps = ui.model.getVariable("ps");
                    tourbillonRenderer.f = ui.model.getVariable("f");
                    break;
                case "VV":
                    verticalVelocityRenderer.width = ui.model.width;
                    verticalVelocityRenderer.height = ui.model.height;
                    verticalVelocityRenderer.variable = ui.model.getVariable("sigmaf")[k];
                    break;
                case "QV":
                    qvRenderer.width = ui.model.width;
                    qvRenderer.height = ui.model.height;
                    qvRenderer.variable = ui.model.getVariable("qv")[k];
                    break;
                case "Temperature":
                    temperatureRenderer.width = ui.model.width;
                    temperatureRenderer.height = ui.model.height;
                    temperatureRenderer.variable = ui.model.getVariable("T")[k];
                    break;
                case "SfcPrs":
                    pressureRenderer.width = ui.model.width;
                    pressureRenderer.height = ui.model.height;
                    pressureRenderer.variable = ui.model.getVariable("ps");
                    break;
                case "Pluie":
                    rainRenderer.width = ui.model.width;
                    rainRenderer.height = ui.model.height;
                    rainRenderer.variable = ui.model.getVariable("apcp");
                    break;
                case "Neige":
                    rainRenderer.width = ui.model.width;
                    rainRenderer.height = ui.model.height;
                    rainRenderer.variable = ui.model.getVariable("acsnow");
                    break;
            }
        };


        /* -------- BAROTROPE ------------ */
        
/*        ui.variableRepresentations = {Vent: {group:"HistoricVariables", name:"Vent", levels:[1], renderer: windRenderer},
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
        };*/

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
        console.log("erreur", e);
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
