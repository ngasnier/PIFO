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

import { WGRIBInterpolator } from "./js/modeling/WGRIBInterpolator.js";
import { TimeInterpolator } from "./js/modeling/TimeInterpolator.js";
import { GeopotentialInterpolator } from "./js/modeling/GeopotentialInterpolator.js";
import { VerticalInterpolator } from "./js/modeling/VerticalInterpolator.js";
import { HumidityInterpolator } from "./js/modeling/HumidityInterpolator.js";
import { Model } from "./js/modeling/Model.js";
import { BaroclinicModel } from "./js/modeling/BaroclinicModel.js";
import { Variable } from "./js/modeling/Variable.js";

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

import { ModelFront } from "./js/front/ModelFront.js";

// Node.js specific
var fs = require('fs');

var wgribInterpolator = new WGRIBInterpolator();
var geopInterpolator = new GeopotentialInterpolator();
var verticalInterpolator = new VerticalInterpolator();
var humidityInterpolator = new HumidityInterpolator();

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
var prmsl = new TimeInterpolator();
var mslhgt = new TimeInterpolator();
var tmp = new TimeInterpolator();
var qv = new TimeInterpolator();

var currentField = 'vent';
var lastExecTime = 0;
var totalTime = 0;
var totalStep = 0;

var valids = ["000"];
var scenario = "bc02";
var reslist = [];
var status = "loading";

var playStatus = false;
var requestFrame = 0;

var ui = new ModelFront();
var inclureRelief = 0;

var config = {};
if (process.argv.length>2)
{
    config = require("./"+process.argv[2]);
}
else 
{
    config = require("./config");
}


console.log("loading");
ui.setStatus("loading");

// Choix du type de modèle
switch (config.model)
{
    case "BaroclinicModel":
        ui.model = new BaroclinicModel();
        break;
    default:
        ui.model = new BaroclinicModel();
        break;
        
}

// Paramètres de type de grille
ui.model.projection = config.projection;
ui.model.gridType = config.gridType;
ui.model.verticalType = config.verticalType;

// Configuration du domaine géographique
ui.model.width = config.width;
ui.model.height = config.height;
ui.model.global = config.global;
ui.model.dlat = config.dlat;
ui.model.dlon = config.dlon;
ui.model.nlat = config.nlat;
ui.model.slat = ui.model.nlat-(ui.model.height)*ui.model.dlat;
ui.model.elon = config.elon;
ui.model.wlon = ui.model.elon-(ui.model.width-(ui.model.global?2:0))*ui.model.dlon;
ui.model.relaxation = config.relaxation;

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
ui.model.setSurfaceLevels(surfaces);

// Configuration des paramètres temporels de la simulation
ui.model.dt = config.dt;
ui.stopTime = config.stopTime;
ui.historyInterval = config.historyInterval;
ui.historyDir = config.historyDir;

// Configuration pour les exportations notamment
ui.variableRepresentations = {Vent: {group:"HistoricVariables", name:"Vent", levels:ui.model.getLayerLevels(), renderer: windRenderer},
    Temperature: {group:"HistoricVariables", name:"Temperature", levels:(ui.model.verticalType=="CP" ? ui.model.getSurfaceLevels() : ui.model.getLayerLevels()), renderer: temperatureRenderer},
    Z500 : {group:"HistoricVariables", name:"Z500", levels:[1], renderer: z500Renderer, data:z500_display},
    T850 : {group:"HistoricVariables", name:"T850", levels:[1], renderer: t850Renderer, data:t850_display},
    QV : {group:"HistoricVariables", name:"QV", levels:ui.model.getLayerLevels(), renderer: qvRenderer},
    SfcPrs : {group:"HistoricVariables", name:"SfcPrs", levels:[1], renderer: pressureRenderer},
    Tourbillon : {group:"DiagnosticVariables", name:"Tourbillon", levels:ui.model.getLayerLevels(), renderer: tourbillonRenderer},
    VV : {group:"DiagnosticVariables", name:"VV", levels:ui.model.getSurfaceLevels(), renderer: verticalVelocityRenderer},
    Pluie : {group:"DiagnosticVariables", name:"Pluie", levels:[1], renderer: rainRenderer},
    latitudes : {group:"InternalVariables", name:"latitudes", levels:[1], data:latitudes},
    longitudes : {group:"InternalVariables", name:"longitudes", levels:[1], data:longitudes}
};

ui.historyList = ["U", "V", "T", "ps", "qv", "Z500", "T850", "latitudes", "longitudes", "apcp"];

// Options de traitement
switch (config.filter)
{
    case "SchumannFilter":
        ui.model.filter = new SchumannFilter(this.model.width, this.model.height);
        break;
}


// Interpolation verticale
verticalInterpolator.inputLevels = config.inputLevels;

// Init l'interpolation spatiale des données d'entrée
wgribInterpolator.global = ui.model.global;
wgribInterpolator.gridType = ui.model.gridType;
wgribInterpolator.projection = ui.model.projection;
wgribInterpolator.width = ui.model.width;
wgribInterpolator.height = ui.model.height;
wgribInterpolator.dlat = ui.model.dlat;
wgribInterpolator.dlon = ui.model.dlon;
wgribInterpolator.nlat = ui.model.nlat;
wgribInterpolator.slat = ui.model.slat;
wgribInterpolator.elon = ui.model.elon;
wgribInterpolator.wlon = ui.model.wlon;

// Init l'interpolation temporelle pour le couplage
var times = [];
var t = 0;
for (var i=0;i<valids.length;i++)
{
    t = Number(valids[i]) * 3600;
    hgt.addTime(t);
    ugrd.addTime(t);
    vgrd.addTime(t);
    vvel.addTime(t);
    sfcprs.addTime(t);
    sfchgt.addTime(t);
    prmsl.addTime(t);
    mslhgt.addTime(t);
    tmp.addTime(t);
    qv.addTime(t);
}    

ui.beforeResetCallback = function()
{
    if (config.inputRelief)
    {
        verticalInterpolator.surfacePressure = sfcprs.variable[0];
        ui.model.setVariable("ps", sfcprs.variable[0]);
        ui.model.setVariable("sfcgeop", sfchgt.variable[0]);
    }
    else
    {
        verticalInterpolator.surfacePressure = prmsl.variable[0];
        ui.model.setVariable("ps", prmsl.variable[0]);
        ui.model.setVariable("sfcgeop", mslhgt.variable[0]);
    }

    verticalInterpolator.sigmaLevels = ui.model.getLayerLevels();

    ui.model.setVariable("U", Variable.createVariable(ui.model.nbcouches, ui.model.width, ui.model.height, true));
    verticalInterpolator.interp(ugrd.variable[0], ui.model.getVariable("U"));

    ui.model.setVariable("V", Variable.createVariable(ui.model.nbcouches, ui.model.width, ui.model.height, true));
    verticalInterpolator.interp(vgrd.variable[0], ui.model.getVariable("V"));

    ui.model.setVariable("qv", Variable.createVariable(ui.model.nbcouches, ui.model.width, ui.model.height, true));
    verticalInterpolator.interp(qv.variable[0], ui.model.getVariable("qv"));

    if (ui.model.verticalType=="CP")
    {
        verticalInterpolator.sigmaLevels = ui.model.getSurfaceLevels();
        ui.model.setVariable("T", Variable.createVariable(ui.model.nbcouches+1, ui.model.width, ui.model.height, true));
        verticalInterpolator.interp(tmp.variable[0], ui.model.getVariable("T"));
    }
    else
    {
        ui.model.setVariable("T", Variable.createVariable(ui.model.nbcouches, ui.model.width, ui.model.height, true));
        verticalInterpolator.interp(tmp.variable[0], ui.model.getVariable("T"));
    }

    z500_display = Variable.createVariable(1, ui.model.width, ui.model.height);
    t850_display = Variable.createVariable(1, ui.model.width, ui.model.height);
}

ui.beforeExportCallback = function()
{
    switch (ui.getCurrentVariable())
    {
        case "Z500":
            verticalInterpolator.modelToPressureLevel(ui.model.getVariable("phi"), 50000, z500_display);
            geopInterpolator.modelToHeight(z500_display, z500_display);
            ui.variableRepresentations["Z500"].data = z500_display;
            break;
        case "T850":
            verticalInterpolator.modelToPressureLevel(ui.model.getVariable("T"), 85000, t850_display);
            ui.variableRepresentations["T850"].data = t850_display;
            break;
        case "latitudes":
            ui.variableRepresentations["latitudes"].data = latitudes;
            break;
        case "longitudes":
            ui.variableRepresentations["longitudes"].data = longitudes;
            break;
    }
};

reloadData();


function onFieldDownload(data) 
{
    var f = reslist[0].split("_");
    console.log(getLoadingString());
    var t = 0, k = 0;
    switch (f[0])
    {
        case "hgt":
            k = hgt.variable[t].length;
            hgt.variable[t][k] = [];
            wgribInterpolator.interp(hgt.variable[t][k], data, 0, 0);
            geopInterpolator.heightToModel(hgt.variable[t][k], hgt.variable[t][k]);
            break;
        case "ugrd":
            k = ugrd.variable[t].length;
            ugrd.variable[t][k] = [];
            if (ui.model.gridType=="C") 
                wgribInterpolator.interp(ugrd.variable[t][k], data, 1, 0);
            else
                wgribInterpolator.interp(ugrd.variable[t][k], data, 0, 0);
            break;
        case "vgrd":
            k = vgrd.variable[t].length;
            vgrd.variable[t][k] = [];
            if (ui.model.gridType=="C")  
                wgribInterpolator.interp(vgrd.variable[t][k], data, 0, 1);
            else
                wgribInterpolator.interp(vgrd.variable[t][k], data, 0, 0);
            break;
        case "vvel":
            k = vvel.variable[t].length;
            vvel.variable[t][k] = [];
            wgribInterpolator.interp(vvel.variable[t][k], data, 0, 0);
            break;
        case "tmp":
            k = tmp.variable[t].length;
            tmp.variable[t][k] = [];
            wgribInterpolator.interp(tmp.variable[t][k], data, 0, 0);
            break;
        case "sfcprs":
            wgribInterpolator.interp(sfcprs.variable[t], data, 0, 0);
            break;
        case "prmsl":
            wgribInterpolator.interp(prmsl.variable[t], data, 0, 0);
            break;
        case "sfchgt":
            wgribInterpolator.interp(sfchgt.variable[t], data, 0, 0);
            geopInterpolator.heightToModel(sfchgt.variable[t], sfchgt.variable[t]);
            mslhgt.variable[t] = Variable.createVariable(1, ui.model.width, ui.model.height);
            break;
        case "rh":
            k = qv.variable[t].length;
            qv.variable[t][k] = [];
            wgribInterpolator.interp(qv.variable[t][k], data, 0, 0);
            humidityInterpolator.rhToSpecific(qv.variable[t][k], tmp.variable[t][k]);
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

function reloadData()
{
    for (var i=0;i<valids.length;i++)
    {
        reslist.push("sfcprs_"+valids[i]+".txt");
        reslist.push("sfchgt_"+valids[i]+".txt");
        reslist.push("prmsl_"+valids[i]+".txt");
        for (var j=0;j<verticalInterpolator.inputLevels.length;j++)
        {
            var lev = Math.floor(verticalInterpolator.inputLevels[j]/100);
            reslist.push("hgt_"+lev.toString()+"_"+valids[i]+".txt");
            reslist.push("ugrd_"+lev.toString()+"_"+valids[i]+".txt");
            reslist.push("vgrd_"+lev.toString()+"_"+valids[i]+".txt");
            reslist.push("vvel_"+lev.toString()+"_"+valids[i]+".txt");
            reslist.push("tmp_"+lev.toString()+"_"+valids[i]+".txt");
            reslist.push("rh_"+lev.toString()+"_"+valids[i]+".txt");
        }
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
}


function getLoadingString()
{
    return "Chargement "+reslist[0];
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