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
import { GeopotentialInterpolator } from "/js/ui/GeopotentialInterpolator.js";
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
var geopInterpolator = new GeopotentialInterpolator();


var z500_display = [];
var t850_display = [];
var latitudes = [];
var longitudes = [];

var manager = null;

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
            z500_display = Variable.createVariable(0, ui.model.width, ui.model.height);
            t850_display = Variable.createVariable(0, ui.model.width, ui.model.height);        
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
            var k = Number(ui.getDisplayLevel());
            switch (ui.getDisplayVariable())
            {
                case "Vent":
                    windRenderer.width = ui.model.width;
                    windRenderer.height = ui.model.height;
                    windRenderer.U = ui.model.getVariable("U").getLevel(k);
                    windRenderer.V = ui.model.getVariable("V").getLevel(k);
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
                    tourbillonRenderer.variable = ui.model.getVariable("tourbillon").getLevel(k);
                    tourbillonRenderer.ps = ui.model.getVariable("ps").data;
                    tourbillonRenderer.f = ui.model.getVariable("f").data;
                    break;
                case "VV":
                    verticalVelocityRenderer.width = ui.model.width;
                    verticalVelocityRenderer.height = ui.model.height;
                    verticalVelocityRenderer.variable = ui.model.getVariable("sigmaf").getLevel(k);
                    break;
                case "QV":
                    qvRenderer.width = ui.model.width;
                    qvRenderer.height = ui.model.height;
                    qvRenderer.variable = ui.model.getVariable("qv").getLevel(k);
                    break;
                case "Temperature":
                    temperatureRenderer.width = ui.model.width;
                    temperatureRenderer.height = ui.model.height;
                    temperatureRenderer.variable = ui.model.getVariable("T").getLevel(k);
                    break;
                case "SfcPrs":
                    pressureRenderer.width = ui.model.width;
                    pressureRenderer.height = ui.model.height;
                    pressureRenderer.variable = ui.model.getVariable("ps").data;
                    break;
                case "Pluie":
                    rainRenderer.width = ui.model.width;
                    rainRenderer.height = ui.model.height;
                    rainRenderer.variable = ui.model.getVariable("apcp").data;
                    break;
                case "Neige":
                    rainRenderer.width = ui.model.width;
                    rainRenderer.height = ui.model.height;
                    rainRenderer.variable = ui.model.getVariable("acsnow").data;
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
