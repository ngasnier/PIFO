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

import { BarotropicInterpolator } from "/js/modeling/BarotropicInterpolator.js";
import { WGRIBInterpolator } from "/js/modeling/WGRIBInterpolator.js";
import { TimeInterpolator } from "/js/modeling/TimeInterpolator.js";
import { Model } from "/js/modeling/Model.js";
import { BarotropicModel } from "/js/modeling/BarotropicModel.js";
import { Variable } from "/js/modeling/Variable.js";

import { WindHTMLRenderer } from "/js/ui/WindHTMLRenderer.js";
import { TourbillonHTMLRenderer } from "/js/ui/TourbillonHTMLRenderer.js";
import { Z500HTMLRenderer } from "/js/ui/Z500HTMLRenderer.js";
import { BarotropicVerificationHTMLRenderer } from "/js/ui/BarotropicVerificationHTMLRenderer.js";
import { ModelUI } from "/js/ui/ModelUI.js";

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

var h500_couplage = [];
var u500_couplage = [];
var v500_couplage = [];

var z500_display = [];
var latitudes = [];
var longitudes = [];

var valids = ["000", "003", "006", "012", "015", "018", "021", "024"];
// 0 : GFS 06/05/2017 00Z
// 1 : GFS 22/02/2018 00Z
//var valids = ["000", "003", "006", "012", "018", "024"];
var scenario = "1";
var reslist = [];

$(document).ready(function () {
    
    valids = ["00"];
    scenario = "bc02";
    
    ui.setStatus("loading");
    ui.setStatusString("Initialisation");

    ui.model = new BarotropicModel();    
    ui.model.projection = Model.PROJ_MERCATOR;
    ui.model.width = 144;
    ui.model.height = 72;
    ui.model.dt = 180;
    ui.model.dlat = 1;
    ui.model.dlon = 1;
    ui.model.nlat = 80;
    ui.model.slat = ui.model.nlat - ui.model.height * ui.model.dlon;
    ui.model.elon = 51;
    ui.model.wlon = ui.model.elon - ui.model.width * ui.model.dlon;
    ui.model.relaxation = 8;
    ui.model.filterFreq = 3600*6/ui.model.dt; 
    
    ui.variableRepresentations = {Vent: {group:"HistoricVariables", name:"Vent", levels:[1], renderer: windRenderer},
        Z500 : {group:"HistoricVariables", name:"Z500", levels:[1], renderer: z500Renderer},
        Tourbillon : {group:"DiagnosticVariables", name:"Tourbillon", levels:[1], renderer: tourbillonRenderer},
        Verifications : {group:"DiagnosticVariables", name:"Verifications", levels:[1], renderer: verificationRenderer},
        latitudes : {group:"InternalVariables", name:"latitudes", levels:[1], data:latitudes},
        longitudes : {group:"InternalVariables", name:"longitudes", levels:[1], data:longitudes}
    };
    
    ui.historyList = ["U", "V", "Z500", "latitudes", "longitudes"];
    
    ui.beforeResetCallback = function()
    {
        ui.model.setVariable("phi", Variable.createVariable(1, ui.model.width, ui.model.height));
        h500.interp(0, ui.model.getVariable("phi"));
        ui.model.setVariable("U", Variable.createVariable(1, ui.model.width, ui.model.height));
        u500.interp(0, ui.model.getVariable("U"));
        ui.model.setVariable("V", Variable.createVariable(1, ui.model.width, ui.model.height));
        v500.interp(0, ui.model.getVariable("V"));
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
        if (ui.model.relaxation>0)
        {
            h500.interp(ui.model.time, h500_couplage);
            u500.interp(ui.model.time, u500_couplage);
            v500.interp(ui.model.time, v500_couplage);
            ui.model.setVariable("phi_couplage", h500_couplage);
            ui.model.setVariable("U_couplage", u500_couplage);
            ui.model.setVariable("V_couplage", v500_couplage);
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
    
    // Init l'interpolation spatiale des données d'entrée
    wgribInterpolator.global = false;
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

    // Bind l'UI...
    $("#gridType").change(function () { 
        reloadData();
    });

    // Charge les données
    reloadData();
});

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
    switch (f)
    {
        case "h":
            k = h500.variable.length;
            h500.variable[k] = [];
            wgribInterpolator.interp(h500.variable[k], data, 0, 0);
            interpolator.z500ToModel(h500.variable[k], h500.variable[k]);
            break;
        case "u":
            k = u500.variable.length;
            u500.variable[k] = [];
            if (ui.model.gridType=="C")
                wgribInterpolator.interp(u500.variable[k], data, 1, 0);
            else
                wgribInterpolator.interp(u500.variable[k], data, 0, 0);
            break;
        case "v":
            k = v500.variable.length;
            v500.variable[k] = [];
            if (ui.model.gridType=="C")
                wgribInterpolator.interp(v500.variable[k], data, 0, 1);
            else
                wgribInterpolator.interp(v500.variable[k], data, 0, 0);
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