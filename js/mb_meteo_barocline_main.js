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

import { WGRIBInterpolator } from "./modeling/WGRIBInterpolator.js";
import { TimeInterpolator } from "./modeling/TimeInterpolator.js";
import { GeopotentialInterpolator } from "./modeling/GeopotentialInterpolator.js";
import { VerticalInterpolator } from "./modeling/VerticalInterpolator.js";
import { HumidityInterpolator } from "./modeling/HumidityInterpolator.js";
import { Model } from "./modeling/Model.js";
import { BaroclinicModel } from "./modeling/BaroclinicModel.js";
import { Variable } from "./modeling/Variable.js";
import { HydrostaticLeapFrogDynamicsCore } from "./modeling/HydrostaticLeapFrogDynamicsCore.js";
import { HydrostaticLeapFrogDynamicsCore_CP } from "./modeling/HydrostaticLeapFrogDynamicsCore_CP.js";
import { PrecipitationScheme } from './modeling/PrecipitationScheme.js';
import { ConvectionScheme } from './modeling/ConvectionScheme.js';

import { WindHTMLRenderer } from "./ui/WindHTMLRenderer.js";
import { TourbillonHTMLRenderer } from "./ui/TourbillonHTMLRenderer.js";
import { Z500HTMLRenderer } from "./ui/Z500HTMLRenderer.js";
import { T850HTMLRenderer } from "./ui/T850HTMLRenderer.js";
import { VerticalVelocityHTMLRenderer } from "./ui/VerticalVelocityHTMLRenderer.js";
import { QvHTMLRenderer } from "./ui/QvHTMLRenderer.js";
import { PressureHTMLRenderer } from "./ui/PressureHTMLRenderer.js";
import { TemperatureHTMLRenderer } from "./ui/TemperatureHTMLRenderer.js";
import { RainHTMLRenderer } from "./ui/RainHTMLRenderer.js";
import { BarotropicVerificationHTMLRenderer } from "./ui/BarotropicVerificationHTMLRenderer.js";
import { ModelUI } from "./ui/ModelUI.js";

var ui = new ModelUI();

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
var scenario = "2018062200";
//var scenario = "2018092500";
var reslist = [];
var status = "loading";

var playStatus = false;
var requestFrame = 0;

$(document).ready(function() {   

    $("#debug").click(function ()
    {
        $("#dump").html(ui.model.debug);
    });
    ui.setStatus("loading");
    ui.setStatusString("Initialisation");
  
    ui.model = new BaroclinicModel();
    ui.model.projection = Model.PROJ_MERCATOR;
    ui.model.gridType = "C";
    ui.model.verticalType = "L";
    if (ui.model.verticalType == "CP")
        ui.model.dynamicsCore = new HydrostaticLeapFrogDynamicsCore_CP();
    else
        ui.model.dynamicsCore = new HydrostaticLeapFrogDynamicsCore();
    
    //ui.model.precipitationScheme = new PrecipitationScheme();

    ui.model.width = 144;
    ui.model.height = 72;
    ui.model.dt = 10;
    ui.model.dlat = 1;
    ui.model.dlon = 1;
    ui.model.nlat = 80;
    ui.model.slat = ui.model.nlat-ui.model.height*ui.model.dlat;
    ui.model.elon = 51;
    ui.model.wlon = ui.model.elon-ui.model.width*ui.model.dlon;
    ui.model.global = false;
    ui.model.relaxation = 8;
    
/*    ui.model.width = 182;
    ui.model.height = 88;
    ui.model.global = true;
    ui.model.dt = 90;
    ui.model.dlat = 2;
    ui.model.dlon = 2;
    ui.model.nlat = 80;
    ui.model.slat = ui.model.nlat-ui.model.height*ui.model.dlat;
    ui.model.elon = 360;
    ui.model.wlon = ui.model.elon-(ui.model.width-(ui.model.global?2:0))*ui.model.dlon;
    ui.model.relaxation = 8;*/
        
    // TODO : les pôles ?
/*    ui.model.width = 92;
    ui.model.height = 44;
    ui.model.global = true;
    ui.model.dt = 120;
    ui.model.dlat = 4;
    ui.model.dlon = 4;
    ui.model.nlat = 88;
    ui.model.slat = ui.model.nlat-(ui.model.height)*ui.model.dlat;
    ui.model.elon = 360;
    ui.model.wlon = ui.model.elon-(ui.model.width-(ui.model.global?2:0))*ui.model.dlon;
    ui.model.relaxation = 8;*/
    
    // Choix de surfaces régulièrement espacées sur un nombre souhaité de niveaux
    var ptop = 100.0;
    var surfaces = [ ptop/100000];
    var nbsurfaces = 9;
    var lev = ptop/100000;
    for (var i=1;i<nbsurfaces;i++)
    {
        //lev += 1.0/nbsurfaces;
        lev += ((100000-ptop)/100000)/(nbsurfaces-1);
        surfaces.push(lev);
    }
    ui.model.setSurfaceLevels(surfaces);
    
    ui.variableRepresentations = {Vent: {group:"HistoricVariables", name:"Vent", levels:ui.model.getLayerLevels(), renderer: windRenderer},
        Temperature: {group:"HistoricVariables", name:"Temperature", levels:(ui.model.verticalType=="CP" ? ui.model.getSurfaceLevels() : ui.model.getLayerLevels()), renderer: temperatureRenderer},
        Z500 : {group:"HistoricVariables", name:"Z500", levels:[1], renderer: z500Renderer, data:z500_display},
        T850 : {group:"HistoricVariables", name:"T850", levels:[1], renderer: t850Renderer, data:t850_display},
        QV : {group:"HistoricVariables", name:"QV", levels:ui.model.getLayerLevels(), renderer: qvRenderer},
        SfcPrs : {group:"HistoricVariables", name:"SfcPrs", levels:[1], renderer: pressureRenderer},
        Tourbillon : {group:"DiagnosticVariables", name:"Tourbillon", levels:ui.model.getLayerLevels(), renderer: tourbillonRenderer},
        VV : {group:"DiagnosticVariables", name:"VV", levels:ui.model.getSurfaceLevels(), renderer: verticalVelocityRenderer},
        Pluie : {group:"DiagnosticVariables", name:"Pluie", levels:[1], renderer: rainRenderer},
        Neige : {group:"DiagnosticVariables", name:"Neige", levels:[1], renderer: rainRenderer},
        latitudes : {group:"InternalVariables", name:"latitudes", levels:[1], data:latitudes},
        longitudes : {group:"InternalVariables", name:"longitudes", levels:[1], data:longitudes}
    };
    
    ui.historyList = ["U", "V", "T", "ps", "qv", "Z500", "T850", "latitudes", "longitudes", "apcp"];
    
    // Interpolation verticale
    verticalInterpolator.inputLevels = [100, 7000, 15000, 35000, 50000, 65000, 85000, 92500, 100000];
    /*verticalInterpolator.inputLevels = [100, 200, 300, 500, 700, 1000, 2000, 
        3000, 5000, 7000, 10000, 15000, 20000, 25000, 30000, 35000, 40000, 
        45000, 50000, 55000, 60000, 65000, 70000, 75000, 80000, 85000, 90000, 
        92500, 95000, 97500, 100000];*/

    // Init l'interpolation spatiale des données d'entrée
//    wgribInterpolator.interpolationType = 2; // N'apporte pas un gros gain en stabilité...
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
        if ($("#incRelief").is(':checked'))
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
                verticalInterpolator.modelToPressureLevel(ui.model.getVariable("phi"), 50000, z500_display);
                geopInterpolator.modelToHeight(z500_display, z500_display);
                z500Renderer.variable = z500_display;
                break;
            case "T850":
                t850Renderer.width = ui.model.width;
                t850Renderer.height = ui.model.height;
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
    
    ui.beforeExportCallback = function()
    {
        var k = ui.getDisplayLevel();
        switch (ui.getDisplayVariable())
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
});

// Verif Ok 13/06/2018
function onFieldDownload(data) 
{
    var f = reslist[0].split("_");
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
        ui.setStatusString(getLoadingString());
        $.ajax({
          url : "res/run/"+scenario+"/"+reslist[0],
          dataType: "text",
          success : onFieldDownload
       });
    }
    else
    {
        ui.setStatusString("Prêt");
        ui.setStatus("ready");
        ui.reset();
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
    
    $.ajax({
        url: "res/run/" + scenario + "/fileinfo.txt",
        dataType: "text",
        success: function (data)
        {
            var fileinfo = data.split(";");
            var info = "Run "+fileinfo[1]+" "+fileinfo[2]+"z du "+fileinfo[3];
            var parts = fileinfo[3].split("/");
            $("#runinit").html(info);
            var dt = new Date(parts[2]+"-"+parts[1]+"-"+parts[0]+" "+fileinfo[2]+":00 UTC");
            ui.model.startDate = dt;
        }
    });
    $.ajax({
        url: "res/run/" + scenario + "/" + reslist[0],
        dataType: "text",
        success: onFieldDownload
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