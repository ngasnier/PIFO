/* 
 * Copyright (C) 2018 Nicolas GASNIER (http://www.meteo-blois.fr/contact/)
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

import { MercatorProjection } from "./js/modeling/MercatorProjection.js";
import { SchumannFilter } from "./js/modeling/SchumannFilter.js";
import { WGRIBInterpolator } from "./js/modeling/WGRIBInterpolator.js";
import { OutputInterpolator } from "./js/modeling/OutputInterpolator.js";
import { TimeInterpolator } from "./js/modeling/TimeInterpolator.js";
import { GeopotentialInterpolator } from "./js/modeling/GeopotentialInterpolator.js";
import { VerticalInterpolator } from "./js/modeling/VerticalInterpolator.js";
import { HumidityInterpolator } from "./js/modeling/HumidityInterpolator.js";
import { Model } from "./js/modeling/Model.js";
import { BaroclinicModel } from "./js/modeling/BaroclinicModel.js";
import { Variable } from "./js/modeling/Variable.js";
import { HydrostaticLeapFrogDynamicsCore } from "./js/modeling/HydrostaticLeapFrogDynamicsCore.js";
import { HydrostaticLeapFrogDynamicsCore_CP } from "./js/modeling/HydrostaticLeapFrogDynamicsCore_CP.js";
import { PrecipitationScheme } from './js/modeling/PrecipitationScheme.js';
import { ConvectionScheme } from './js/modeling/ConvectionScheme.js';

import { WindHTMLRenderer } from "./js/ui/WindHTMLRenderer.js";
import { TourbillonHTMLRenderer } from "./js/ui/TourbillonHTMLRenderer.js";
import { Z500HTMLRenderer } from "./js/ui/Z500HTMLRenderer.js";
import { T850HTMLRenderer } from "./js/ui/T850HTMLRenderer.js";
import { VerticalVelocityHTMLRenderer } from "./js/ui/VerticalVelocityHTMLRenderer.js";
import { QvHTMLRenderer } from "./js/ui/QvHTMLRenderer.js";
import { PressureHTMLRenderer } from "./js/ui/PressureHTMLRenderer.js";
import { TemperatureHTMLRenderer } from "./js/ui/TemperatureHTMLRenderer.js";
import { RainHTMLRenderer } from "./js/ui/RainHTMLRenderer.js";
import { BarotropicVerificationHTMLRenderer } from "./js/ui/BarotropicVerificationHTMLRenderer.js";
import { FieldTextExporter } from "./js/ui/FieldTextExporter.js";

import { ModelFront } from "./js/front/ModelFront.js";

// Node.js specific
var fs = require('fs');
const path = require('path');

var wgribInterpolator = new WGRIBInterpolator();
var verticalInterpolator = new VerticalInterpolator();
var outputInterpolator = new OutputInterpolator();
var geopInterpolator = new GeopotentialInterpolator();
var humidityInterpolator = new HumidityInterpolator();

var fieldExporter = new FieldTextExporter();
var windRenderer = new WindHTMLRenderer();
var z500Renderer = new Z500HTMLRenderer();
var t850Renderer = new T850HTMLRenderer();
var verticalVelocityRenderer = new VerticalVelocityHTMLRenderer();
var tourbillonRenderer = new TourbillonHTMLRenderer();
var qvRenderer = new QvHTMLRenderer();
var pressureRenderer = new PressureHTMLRenderer();
var rainRenderer = new RainHTMLRenderer();
var temperatureRenderer = new TemperatureHTMLRenderer();
var z500_display = [];
var t850_display = [];
var latitudes = [];
var longitudes = [];

var hgt = new TimeInterpolator();
var ugrd = new TimeInterpolator();
var vgrd = new TimeInterpolator();
var vvel = new TimeInterpolator();
var sfcprs = new TimeInterpolator();
var sfchgt = new TimeInterpolator();
var tmp = new TimeInterpolator();
var qv = new TimeInterpolator();

var currentField = 'vent';
var lastExecTime = 0;
var totalTime = 0;
var totalStep = 0;

var valids = ["000"];
var reslist = [];
var status = "loading";

var playStatus = false;
var requestFrame = 0;

// Variables du modèle
var model = null;
var projection = null;
var inclureRelief = 0;

// Environnement de fonctionnement
var mode = "run";
var config = {};
var configFile = "";

// *** traitement de la ligne de commande
if (process.argv.length>2)
{
    if (process.argv.length>3)
    {
        configFile = "./"+process.argv[2]
        mode = process.argv[3];
    }
    else
    {
        configFile = "./config";
        mode = process.argv[2];
    }
}
else 
{
    configFile = "./config";
    mode = "run";
}

console.log("PIFO mode "+mode);
console.log("config : "+configFile);

config = require(configFile);


// *** Instanciation du modèle
// Choix du type de modèle
switch (config.model)
{
    case "BaroclinicModel":
        model = new BaroclinicModel();
        break;
    default:
        model = new BaroclinicModel();
}

// *** Paramétrage de la grille horizontale
switch (config.projection)
{
    case Model.PROJ_MERCATOR:
        projection = new MercatorProjection(Model.Rterre);
        break;
    default:
        projection = new MercatorProjection(Model.Rterre);
}
// TODO : code du modèle à updater pour accéder au bon type d'objet
model.projection = projection;
model.gridType = config.gridType;

// Configuration du domaine géographique
model.width = config.width;
model.height = config.height;
model.global = config.global;
model.dlat = config.dlat;
model.dlon = config.dlon;
model.nlat = config.nlat;
model.slat = model.nlat-(model.height)*model.dlat;
model.elon = config.elon;
model.wlon = model.elon-(model.width-(model.global?2:0))*model.dlon;
model.relaxation = config.relaxation;

// *** Paramétrage de la grille verticale du modèle
model.verticalType = config.verticalType;
if (model.verticalType == "CP")
    model.dynamicsCore = new HydrostaticLeapFrogDynamicsCore_CP();
else
    model.dynamicsCore = new HydrostaticLeapFrogDynamicsCore();

var smoothFilter = null;

// Choix de surfaces régulièrement espacées sur un nombre souhaité de niveaux
var ptop = config.ptop;
var surfaces = [ ptop/100000];
var nbsurfaces = config.nbSurfaces;
var lev = ptop/100000;
for (var i=1;i<nbsurfaces;i++)
{
    lev += ((100000-ptop)/100000)/(nbsurfaces-1);
    surfaces.push(lev);
}
model.setSurfaceLevels(surfaces);

// *** Démarrage du traitement demandé
switch (mode)
{
    case "preprocess":
        preprocess();
        break;
    case "init":
        init();
        break;
    case "run":
        run();
        break;
    default:
        console.log("mode de fonctionnement non supporté : "+mode);
        process.exit(1);
}

function preprocess()
{   
    var field2d;
    var field3d;
    
    // Interpolation verticale
    verticalInterpolator.inputLevels = config.inputLevels;
    verticalInterpolator.surfacePressure = Variable.createVariable(1, model.width, model.height);

    // Init l'interpolation spatiale des données d'entrée
    wgribInterpolator.global = model.global;
    wgribInterpolator.gridType = model.gridType;
    wgribInterpolator.projection = model.projection;
    wgribInterpolator.width = model.width;
    wgribInterpolator.height = model.height;
    wgribInterpolator.dlat = model.dlat;
    wgribInterpolator.dlon = model.dlon;
    wgribInterpolator.nlat = model.nlat;
    wgribInterpolator.slat = model.slat;
    wgribInterpolator.elon = model.elon;
    wgribInterpolator.wlon = model.wlon;
    
    // Creation des variables sur le modèle
    model.setVariable("U", Variable.createVariable(model.nbcouches, model.width, model.height));
    model.setVariable("V", Variable.createVariable(model.nbcouches, model.width, model.height));
    if (model.verticalType=="CP")
        model.setVariable("T", Variable.createVariable(model.nbcouches+1, model.width, model.height));
    else
        model.setVariable("T", Variable.createVariable(model.nbcouches, model.width, model.height));
    model.setVariable("qv", Variable.createVariable(model.nbcouches, model.width, model.height));
    model.setVariable("Z", Variable.createVariable(1, model.width, model.height));

    field2d = Variable.createVariable(1, model.width, model.height);
    field3d = Variable.createVariable(config.inputLevels.length, model.width, model.height);

    for (var t=0;t<config.inputTimes.length;t++)
    {
        verticalInterpolator.sigmaLevels = model.getLayerLevels();   

        if (config.inputRelief)
            interpWGRIB2DField("sfchgt", config.inputTimes[t], 0, 0, false, field2d);
        else
            Variable.init(field2d, 0);
        geopInterpolator.heightToModel(field2d, field2d);
        write2DVariable("sfchgt", config.inputTimes[t], field2d);

        if (config.inputRelief)
            interpWGRIB2DField("sfcprs", config.inputTimes[t], 0, 0, false, field2d);
        else
            interpWGRIB2DField("prmsl", config.inputTimes[t], 0, 0, false, field2d);
        Variable.copy(field2d, verticalInterpolator.surfacePressure);
        for (var i=0;i<field2d.length;i++) field2d[i] = Math.log(field2d[i]);
        write2DVariable("Z", config.inputTimes[t], field2d);
        
        interpWGRIB3DField("ugrd", config.inputTimes[t], 1, 0, true, field3d);
        verticalInterpolator.interp(field3d, model.getVariable("U"));
        write3DVariable("U", config.inputTimes[t], model.getVariable("U"));

        interpWGRIB3DField("vgrd", config.inputTimes[t], 0, 1, true, field3d);
        verticalInterpolator.interp(field3d, model.getVariable("V"));
        write3DVariable("V", config.inputTimes[t], model.getVariable("V"));

        if (model.verticalType=="CP")
            verticalInterpolator.sigmaLevels = model.getSurfaceLevels();
        interpWGRIB3DField("tmp", config.inputTimes[t], 0, 0, false, field3d);
        verticalInterpolator.interp(field3d, model.getVariable("T"));
        write3DVariable("tmp", config.inputTimes[t], model.getVariable("T"));

        interpWGRIB3DField("rh", config.inputTimes[t], 0, 0, false, field3d);
        verticalInterpolator.interp(field3d, model.getVariable("qv"));
        for (var k=0;k<model.nbcouches;k++)
        {
            // TODO : interpoler T pour les niveaux CP
            humidityInterpolator.rhToSpecific(model.getVariable("qv")[k], model.getVariable("T")[k]);
        }
        write3DVariable("qv", config.inputTimes[t], model.getVariable("qv"));

    }
       
    // Recopie le fileinfo.
    var inFilename = config.preprocessDir + "/fileinfo.txt";
    var outFilename = config.inputDir + "/fileinfo.txt";
    var fileinfo = fs.readFileSync(inFilename, "utf8");
    fs.writeFileSync(outFilename, fileinfo);
    
    // Fin.
    console.log("preprocess done.");
}

function interpWGRIB2DField(pField, pValid, pOffsetX, pOffsetY, pScale, pVariable)
{
    var filename, valid;
    var data;
    valid = pValid.toString();
    if (valid.length<3)
    {
        valid ="00"+valid;
        valid = valid.substr(valid.length-3);
    }
    filename = path.join(config.preprocessDir, pField+"_"+valid+".txt");
    console.log("loading "+filename);
    data = fs.readFileSync(filename, 'utf8');
    wgribInterpolator.interp(pVariable, data, pOffsetX, pOffsetY, pScale);
}

function interpWGRIB3DField(pField, pValid, pOffsetX, pOffsetY, pScale, pVariable)
{
    var filename, lev, valid;
    var data;
    for (var k=0;k<config.inputLevels.length;k++)
    {
        lev = Math.floor(verticalInterpolator.inputLevels[k]/100);
        valid = pValid.toString();
        if (valid.length<3)
        {
            valid ="00"+valid;
            valid = valid.substr(valid.length-3);
        }
        filename = path.join(config.preprocessDir, pField+"_"+lev.toString()+"_"+valid+".txt");
        console.log("loading "+filename);
        data = fs.readFileSync(filename, 'utf8');
        wgribInterpolator.interp(pVariable[k], data, pOffsetX, pOffsetY, pScale);
    }
}

function textToVariable(pData, pVariable)
{
    var lines = pData.split('\n');
    for (var i=1;i<lines.length;i++)
    {
        pVariable[i-1] = Number(lines[i]);
    }
}

function writeVariable(pFileName, pVariable)
{
    var data;
    console.log("exporting "+pFileName);
    fieldExporter.width = model.width;
    fieldExporter.height = model.height;
    fieldExporter.variable = pVariable;
    data = fieldExporter.export();
    fs.writeFileSync(pFileName, data);
}

function write2DVariable(pField, pValid, pVariable)
{
    var filename, valid;
    valid = pValid.toString();
    if (valid.length<3)
    {
        valid ="00"+valid;
        valid = valid.substr(valid.length-3);
    }
    filename = path.join(config.inputDir, pField+"_"+valid+".txt");
    console.log("exporting "+filename);
    writeVariable(filename, pVariable);
}

function write3DVariable(pField, pValid, pVariable)
{
    var filename, valid;
    for (var k=0;k<pVariable.length;k++)
    {
        valid = pValid.toString();
        if (valid.length<3)
        {
            valid ="00"+valid;
            valid = valid.substr(valid.length-3);
        }
        filename = path.join(config.inputDir, pField+"_"+k.toString()+"_"+valid+".txt");

        console.log("exporting "+filename);
        writeVariable(filename, pVariable[k]);
    }
}

function run()
{
    var ui = new ModelFront();
    ui.model = model;
    
    // *** Active la physique si souhaité
    if (config.enablePrecipitationScheme) ui.model.precipitationScheme = new PrecipitationScheme();
    if (config.enableConvectionScheme) ui.model.convectionScheme = new ConvectionScheme();
    
    // *** Configuration des paramètres temporels de la simulation
    ui.model.dt = config.dt;
    ui.stopTime = config.stopTime;
    ui.historyInterval = config.historyInterval;
    ui.historyDir = config.historyDir;

    // *** Options de traitement
    switch (config.filter)
    {
        case "SchumannFilter":
            ui.model.filter = new SchumannFilter(this.model.width, this.model.height);
            break;
    }

    // Configuration pour les exportations notamment
    outputInterpolator.global = ui.model.global;
    outputInterpolator.gridType = ui.model.gridType;
    outputInterpolator.projection = ui.model.projection;
    outputInterpolator.width = ui.model.width;
    outputInterpolator.height = ui.model.height;
    outputInterpolator.dlat = ui.model.dlat;
    outputInterpolator.dlon = ui.model.dlon;
    outputInterpolator.nlat = ui.model.nlat;
    outputInterpolator.slat = ui.model.slat;
    outputInterpolator.elon = ui.model.elon;
    outputInterpolator.wlon = ui.model.wlon;
    ui.defaultExporter.interpolator = outputInterpolator;
    ui.defaultExporter.output = Variable.createVariable(1, ui.model.width, ui.model.height);

    fieldExporter.width = ui.model.width;
    fieldExporter.height = ui.model.height;

    ui.variableRepresentations = {Vent: {group:"HistoricVariables", name:"Vent", levels:ui.model.getLayerLevels(), renderer: windRenderer},
        Temperature: {group:"HistoricVariables", name:"Temperature", levels:(ui.model.verticalType=="CP" ? ui.model.getSurfaceLevels() : ui.model.getLayerLevels()), renderer: temperatureRenderer},
        Z500 : {group:"HistoricVariables", name:"Z500", levels:[1], renderer: z500Renderer, data:z500_display},
        T850 : {group:"HistoricVariables", name:"T850", levels:[1], renderer: t850Renderer, data:t850_display},
        QV : {group:"HistoricVariables", name:"QV", levels:ui.model.getLayerLevels(), renderer: qvRenderer},
        SfcPrs : {group:"HistoricVariables", name:"SfcPrs", levels:[1], renderer: pressureRenderer},
        Tourbillon : {group:"DiagnosticVariables", name:"Tourbillon", levels:ui.model.getLayerLevels(), renderer: tourbillonRenderer},
        VV : {group:"DiagnosticVariables", name:"VV", levels:ui.model.getSurfaceLevels(), renderer: verticalVelocityRenderer},
        Pluie : {group:"DiagnosticVariables", name:"Pluie", levels:[1], renderer: rainRenderer},
        latitudes : {group:"InternalVariables", name:"latitudes", levels:[1], data:latitudes, exporter:fieldExporter},
        longitudes : {group:"InternalVariables", name:"longitudes", levels:[1], data:longitudes, exporter:fieldExporter}
    };

    ui.historyList = ["U", "V", "T", "ps", "qv", "phi", "latitudes", "longitudes", "apcp", "acsnow", "sigmaf", "tourbillon", "f"];
    
    // Init l'interpolation temporelle pour le couplage
    var t = 0;
    for (var i=0;i<config.inputTimes.length;i++)
    {
        t = config.inputTimes[i] * 3600;
        
        ugrd.addTime(t);
        ugrd.variable[i] = Variable.createVariable(ui.model.nbcouches, ui.model.width, ui.model.height);
                
        vgrd.addTime(t);
        vgrd.variable[i] = Variable.createVariable(ui.model.nbcouches, ui.model.width, ui.model.height);

        sfcprs.addTime(t);
        sfcprs.variable[i] = Variable.createVariable(1, ui.model.width, ui.model.height);
        
        sfchgt.addTime(t);
        sfchgt.variable[i] = Variable.createVariable(1, ui.model.width, ui.model.height);
        
        tmp.addTime(t);
        if (ui.model.verticalType=="CP")
            tmp.variable[i] = Variable.createVariable(ui.model.nbcouches+1, ui.model.width, ui.model.height);
        else
            tmp.variable[i] = Variable.createVariable(ui.model.nbcouches, ui.model.width, ui.model.height);
        
        qv.addTime(t);
        qv.variable[i] = Variable.createVariable(ui.model.nbcouches, ui.model.width, ui.model.height);
    }    

    ui.beforeResetCallback = function()
    {
        ui.model.setVariable("Z", Variable.createVariable(1, ui.model.width, ui.model.height));
        Variable.copy(sfcprs.variable[0], ui.model.getVariable("Z"));
        
        ui.model.setVariable("sfcgeop", Variable.createVariable(1, ui.model.width, ui.model.height));
        Variable.copy(sfchgt.variable[0], ui.model.getVariable("sfcgeop"));
        
        ui.model.setVariable("U", Variable.createVariable(ui.model.nbcouches, ui.model.width, ui.model.height, true));
        Variable.copy(ugrd.variable[0], ui.model.getVariable("U"));

        ui.model.setVariable("V", Variable.createVariable(ui.model.nbcouches, ui.model.width, ui.model.height, true));
        Variable.copy(vgrd.variable[0], ui.model.getVariable("V"));

        ui.model.setVariable("qv", Variable.createVariable(ui.model.nbcouches, ui.model.width, ui.model.height, true));
        Variable.copy(qv.variable[0], ui.model.getVariable("qv"));

        if (ui.model.verticalType=="CP")
        {
            ui.model.setVariable("T", Variable.createVariable(ui.model.nbcouches+1, ui.model.width, ui.model.height, true));
        }
        else
        {
            ui.model.setVariable("T", Variable.createVariable(ui.model.nbcouches, ui.model.width, ui.model.height, true));
        }
        Variable.copy(tmp.variable[0], ui.model.getVariable("T"));
    }

    ui.beforeExportCallback = function()
    {
        switch (ui.getCurrentVariable())
        {
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
        if (ui.model.relaxation>0 && config.inputTimes.length>0)
        {
            ugrd.interp(ui.model.time, ui.model.getVariable("U_couplage"));
            vgrd.interp(ui.model.time, ui.model.getVariable("V_couplage"));
            tmp.interp(ui.model.time, ui.model.getVariable("T_couplage"));
            qv.interp(ui.model.time, ui.model.getVariable("qv_couplage"));
            sfcprs.interp(ui.model.time, ui.model.getVariable("Z_couplage"));
        }
    };
        
    
    // *** Liste des fichiers de données attendus
    for (var i=0;i<config.inputTimes.length;i++)
    {
        var valid = config.inputTimes[i].toString();
        if (valid.length<3)
        {
            valid ="00"+valid;
            valid = valid.substr(valid.length-3);
        }
        reslist.push("Z_"+valid+".txt");
        reslist.push("sfchgt_"+valid+".txt");
        for (var j=0;j<ui.model.nbcouches;j++)
        {
            reslist.push("U_"+j.toString()+"_"+valid+".txt");
            reslist.push("V_"+j.toString()+"_"+valid+".txt");
            reslist.push("tmp_"+j.toString()+"_"+valid+".txt");
            reslist.push("qv_"+j.toString()+"_"+valid+".txt");
        }
        if (ui.model.verticalType=="CP")
            reslist.push("tmp_"+(ui.model.nbcouches).toString()+"_"+valid+".txt");
    }
    
    calcCoords();
    
    var filename = config.inputDir + "/fileinfo.txt";
    fs.readFile(filename, 'utf8', function(err, data) {
        if (err) throw err;
        console.log('loaded: ' + filename);
        var fileinfo = data.split(";");
        var info = "Run "+fileinfo[1]+" "+fileinfo[2]+"z du "+fileinfo[3];
        var parts = fileinfo[3].split("/");
        console.log(info);
        var dt = new Date(parts[2]+"-"+parts[1]+"-"+parts[0]+" "+fileinfo[2]+":00 UTC");
        ui.model.startDate = dt;
    });
    
    filename = config.inputDir + "/" + reslist[0];
    fs.readFile(filename, 'utf8', function(err, data) {
        if (err) throw err;
        onFieldDownload(data);
    });
    
    function onFieldDownload(data) 
    {
        var t, k;
        var f = reslist[0].split("_");
        console.log("loaded: " + reslist[0]);
        switch (f[0])
        {
            case "U":
                t = ugrd.getTimeIndex(Number(f[2].split(".")[0])*3600);
                k = Number(f[1]);
                textToVariable(data, ugrd.variable[t][k]);
                if (smoothFilter!=null) smoothFilter.applyFilter2D(ugrd.variable[t][k]);
                break;
            case "V":
                t = vgrd.getTimeIndex(Number(f[2].split(".")[0])*3600);
                k = Number(f[1]);
                textToVariable(data, vgrd.variable[t][k]);
                if (smoothFilter!=null) smoothFilter.applyFilter2D(vgrd.variable[t][k]);
                break;
            case "tmp":
                t = tmp.getTimeIndex(Number(f[2].split(".")[0])*3600);
                k = Number(f[1]);
                textToVariable(data, tmp.variable[t][k]);
                if (smoothFilter!=null) smoothFilter.applyFilter2D(tmp.variable[t][k]);
                break;
            case "Z":
                t = sfcprs.getTimeIndex(Number(f[1].split(".")[0])*3600);
                textToVariable(data, sfcprs.variable[t]);
                if (smoothFilter!=null) smoothFilter.applyFilter2D(sfcprs.variable[t]);
                break;
            case "sfchgt":
                t = sfchgt.getTimeIndex(Number(f[1].split(".")[0])*3600);
                k = Number(f[1]);
                textToVariable(data, sfchgt.variable[t]);
                if (smoothFilter!=null) textToVariable(data, sfchgt.variable[t]);
                break;
            case "qv":
                t = qv.getTimeIndex(Number(f[2].split(".")[0])*3600);
                k = Number(f[1]);
                textToVariable(data, qv.variable[t][k]);
                if (smoothFilter!=null) smoothFilter.applyFilter2D(qv.variable[t][k]);
                break;
        }
        reslist.shift();
        if (reslist.length>0)
        {
            var filename = config.inputDir + "/" + reslist[0];
            fs.readFile(filename, 'utf8', function(err, data) {
                if (err) throw err;
                onFieldDownload(data);
            });
        }
        else
        {
            ui.setStatus("ready");
            ui.reset();
            ui.play();
        }
    }
    
}

// TODO : c'est dégueux... utiliser la projection pour calculer ><
function calcCoords()
{
    latitudes = Variable.createVariable(1, model.width, model.height);
    longitudes = Variable.createVariable(1, model.width, model.height);
    var lat = model.nlat;
    var lon = model.wlon;
    var i = 0;
    for (var y=0;y<model.height;y++)
    {
        lon = model.wlon;
        for (var x=0;x<model.width;x++)
        {
            latitudes[i] = lat;
            longitudes[i] = lon;
            lon += model.dlon;
            i++;
        }
        lat-=model.dlat;
    }
}
