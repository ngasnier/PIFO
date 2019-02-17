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
import { Earth } from "/js/modeling/Earth.js";

import { BarotropicInterpolator } from "/js/modeling/BarotropicInterpolator.js";
import { WGRIBInterpolator } from "/js/modeling/WGRIBInterpolator.js";
import { TimeInterpolator } from "/js/modeling/TimeInterpolator.js";
import { Model } from "/js/modeling/Model.js";
import { BarotropicModel } from "/js/modeling/BarotropicModel.js";
import { Variable } from "/js/modeling/Variable.js";
import { VariableDescription } from "/js/modeling/VariableDescription.js";

import { WindHTMLRenderer } from "/js/ui/WindHTMLRenderer.js";
import { TourbillonHTMLRenderer } from "/js/ui/TourbillonHTMLRenderer.js";
import { Z500HTMLRenderer } from "/js/ui/Z500HTMLRenderer.js";
import { BarotropicVerificationHTMLRenderer } from "/js/ui/BarotropicVerificationHTMLRenderer.js";
import { ModelUI } from "/js/ui/ModelUI.js";

import { WGRIBFormat } from "./util/WGRIBFormat.js";

import { HumpDisturbance } from "/js/cases/HumpDisturbance.js";

var ui = new ModelUI();

var interpolator = new BarotropicInterpolator();
var wgribInterpolator = new WGRIBInterpolator();
var windRenderer = new WindHTMLRenderer();
var z500Renderer = new Z500HTMLRenderer();
var tourbillonRenderer = new TourbillonHTMLRenderer();
var verificationRenderer = new BarotropicVerificationHTMLRenderer();

var h500 = new TimeInterpolator();
var u500 = new TimeInterpolator();
var v500 = new TimeInterpolator();

var z500_display = [];
var latitudes = [];
var longitudes = [];

var valids = [];
var scenario = "current";
var reslist = [];

var manager = null;
var inputDomain = null;

var barotropeConfig = {
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
        "WGRIBTextFieldDataSource": "front/WGRIBTextFieldDataSource.js"
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
            "path" : "input",
            "times": [ 0 ],
            "fieldsDefs": [
                { 
                    "names": ["U", "V", "phi"],
                    "levels": [ 100, 15000, 35000, 50000, 65000, 85000, 92500, 100000]
                }
            ]
        },
        
        "times": [ 0 ]
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
        "preprocessor": {
            "class": "Preprocessor",
            "dataSource": { "ref": "gfsdata"}
            
        },
         
        "run": {
            "class": "ADefinir",
            // Les paramètres du run, à définir...
            "inputTimes": { "ref": "times" },
            "stopTime": 48,
            "inputRelief": false,
            "historyInterval": 6,
            "historyDir": "output"
        }
    },
    
    // TODO : gardé pour ne pas péter le code tout de suite...
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

$(document).ready(function () {
    valids = ["000"];
    scenario = "2018120612";
    
    ui.setStatus("loading");
    ui.setStatusString("Initialisation");
    //$.getJSON("config.json",initialize);
    initialize(barotropeConfig).then(()=>{});
});

async function initialize(config) 
{   
    var classpath = "/js/";
    manager = new ConfigManager(classpath, config);
    
    // TODO : on ne devra plus faire de "preprocesseur" ici...
    inputDomain = await manager.getObject("inputDomain");
    
    ui.model = await manager.getModel()
    
    ui.variableRepresentations = {Vent: {group:"HistoricVariables", name:"Vent", levels:[1], renderer: windRenderer},
        Z500 : {group:"HistoricVariables", name:"Z500", levels:[1], renderer: z500Renderer},
        Tourbillon : {group:"DiagnosticVariables", name:"Tourbillon", levels:[1], renderer: tourbillonRenderer},
        Verifications : {group:"DiagnosticVariables", name:"Verifications", levels:[1], renderer: verificationRenderer},
        latitudes : {group:"InternalVariables", name:"latitudes", levels:[1], data:latitudes},
        longitudes : {group:"InternalVariables", name:"longitudes", levels:[1], data:longitudes}
    };
    
    ui.historyList = ["U", "V", "Z500", "latitudes", "longitudes"];
    
    ui.afterResetCallback = function()
    {
        h500.interp(0, ui.model.getVariable("phi"));
        u500.interp(0, ui.model.getVariable("U"));
        v500.interp(0, ui.model.getVariable("V"));
        ui.model.projection.getScaleFactors(ui.model.getVariable("latitudes"), ui.model.getVariable("longitudes"), ui.model.getVariable("m"));
        var lats = Variable.createVariable(1, ui.model.width, ui.model.height, false);
        var lons = Variable.createVariable(1, ui.model.width, ui.model.height, false);
        ui.model.getCoriolisPointCoords(lats, lons);
        var earth = new Earth();
        earth.getCoriolisFactors(lats, ui.model.getVariable("f"));
        
        h500.interp(ui.model.time, ui.model.getVariable("phi_couplage"));
        u500.interp(ui.model.time, ui.model.getVariable("U_couplage"));
        v500.interp(ui.model.time, ui.model.getVariable("V_couplage"));
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
            case "latitudes":
                ui.variableRepresentations["latitudes"].data = latitudes;
                break;
            case "longitudes":
                ui.variableRepresentations["longitudes"].data = longitudes;
                break;
        }
    };

    ui.beforeStepCallback = function()
    {
        if (ui.model.boundaryCondition!=null)
        {
            h500.interp(ui.model.time, ui.model.getVariable("phi_couplage"));
            u500.interp(ui.model.time, ui.model.getVariable("U_couplage"));
            v500.interp(ui.model.time, ui.model.getVariable("V_couplage"));
        }
    };
    
    // Init l'interpolation temporelle pour le couplage
    var times = [];
    for (var i=0;i<valids.length;i++)
    {
        times[i] = Number(valids[i]) * 3600;
    }    
    h500.times = times;
    u500.times = times;
    v500.times = times;
    

    // Bind l'UI...
    $("#gridType").change(function () { 
        reloadData();
    });

    $("#testCaseButton").click(function () { 
        initTestCase();
    });
    
    // Charge les données
    reloadData();
    return "ok";
}

function getLoadingString()
{
    return "Chargement "+reslist[0];
}


function reloadData()
{
    ui.model.gridType = $("#gridType").val();
    for (var i = 0; i < valids.length; i++)
    {
        reslist.push("hgt_500_" + valids[i] + ".txt");
        reslist.push("ugrd_500_" + valids[i] + ".txt");
        reslist.push("vgrd_500_" + valids[i] + ".txt");
    }
    
    calcCoords();

    $.ajax({
        url: "res/run/" + scenario + "/fileinfo.txt",
        dataType: "text",
        success: function (data)
        {
            var fileinfo = data.split(";");
            var info = "Run "+fileinfo[1]+" "+fileinfo[2]+"z du "+fileinfo[3];
            var parts = fileinfo[3].split("/");
            $("#runinit").html(info);
            var dt = new Date(parts[2]+"-"+parts[1]+"-"+parts[0]);
            ui.model.startDate = dt;
        }
    });
    console.log(scenario);
    $.ajax({
        url: "res/run/" + scenario + "/" + reslist[0],
        dataType: "text",
        success: onFieldDownload
    });
}

function onFieldDownload(data)
{
    var f = reslist[0].substring(0, 1);
    var k = 0;
    var reader = new WGRIBFormat();
    var buf = reader.read(data);
    switch (f)
    {
        case "h":
            k = h500.variable.length;
            h500.variable[k] = [];
            ui.model.projection.interpLatLonGridToDomain(
                inputDomain, buf, h500.variable[k], 0, 0, false, VariableDescription.NUMBER_TYPE_SCALAR);
            interpolator.z500ToModel(h500.variable[k], h500.variable[k]);
            break;
        case "u":
            k = u500.variable.length;
            u500.variable[k] = [];
            if (ui.model.horizontalStaggering=="C")
                ui.model.projection.interpLatLonGridToDomain(
                    inputDomain, buf, u500.variable[k], 1, 0, true, VariableDescription.NUMBER_TYPE_U_VECTOR);
            else
                ui.model.projection.interpLatLonGridToDomain(
                    inputDomain, buf, u500.variable[k], 0, 0, true, VariableDescription.NUMBER_TYPE_U_VECTOR);
            break;
        case "v":
            k = v500.variable.length;
            v500.variable[k] = [];
            if (ui.model.horizontalStaggering=="C")
                ui.model.projection.interpLatLonGridToDomain(
                    inputDomain, buf, v500.variable[k], 0, 1, true, VariableDescription.NUMBER_TYPE_U_VECTOR);
            else
                ui.model.projection.interpLatLonGridToDomain(
                    inputDomain, buf, v500.variable[k], 0, 0, true, VariableDescription.NUMBER_TYPE_U_VECTOR);
            break;
    }
    reslist.shift();
    if (reslist.length > 0)
    {
        ui.setStatusString(getLoadingString());
        $.ajax({
            url: "res/run/" + scenario + "/" + reslist[0],
            dataType: "text",
            success: onFieldDownload
        });
    } 
    else
    {
        ui.setStatusString("Prêt");
        ui.setStatus("ready");       
        ui.reset();
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
    ui.setStatus("ready");       
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

function calcCoords()
{
    latitudes = Variable.createVariable(1, ui.model.width, ui.model.height);
    longitudes = Variable.createVariable(1, ui.model.width, ui.model.height);
    var lat = ui.model.nlat;
    var lon = ui.model.wlon;
    var i = 0;
    for (var y=0;y<ui.model.height;y++)
    {
        lon = ui.model.wlon;
        for (var x=0;x<ui.model.width;x++)
        {
            latitudes[i] = lat;
            longitudes[i] = lon;
            lon += ui.model.dlon;
            i++;
        }
        lat-=ui.model.dlat;
    }
}