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

import { Variable } from "../modeling/Variable.js";
import { SchumannFilter } from "../modeling/SchumannFilter.js";
import { FieldHTMLRenderer } from "./FieldHTMLRenderer.js";
import { FieldTextExporter } from "./FieldTextExporter.js";
import { saveAs } from "../vendor/FileSaver.js";

export var ModelUI = function()
{
    this.model = null;
    
    this.variableDescriptions = [];
    
    this.variableRepresentations = [];
    
    this.historyList = [];
    
    this.currentField = 'Vent';

    this.displayLevel = 0;
    
    this.lastExecTime = 0;
    
    this.totalTime = 0;
    
    this.totalStep = 0;

    this.status = "loading";
    
    this.statusString = "";
    
    this.defaultRenderer = new FieldHTMLRenderer();
    
    this.defaultExporter = new FieldTextExporter();
    
    this.playStatus = false;
    
    this.requestFrame = 0;
    
    this.zip = null;
    
    this.historyIntervall = 3;
    
    this.nextHistory = 0;
    
    this.stopTime = 0;
    
    this.precHistory = "";
    
    this.historyInfo = "";
        
    this.beforeResetCallback = function() {};
    this.afterResetCallback = function() {};

    this.beforeStepCallback = function() {};
    this.afterStepCallback = function() {};   
    
    this.beforeDisplayCallback = function() {};
    this.afterDisplayCallback = function() {};

    this.beforeExportCallback = function() {};
    this.afterExportCallback = function() {};
}


ModelUI.prototype.setStatus = function(p_st)
{
    this.status = p_st;
}

ModelUI.prototype.getStatus = function()
{
    return this.status;
}

ModelUI.prototype.setStatusString = function(p_str)
{
    this.statusString = p_str;
    $(statistics).html(this.statusString);
}

ModelUI.prototype.getStatusString = function()
{
    return this.statusString;
}

ModelUI.prototype.getDisplayVariable = function()
{
    return this.currentField;
}

ModelUI.prototype.getDisplayLevel = function()
{
    return this.displayLevel;
}

ModelUI.prototype.reset = function()
{
    this.beforeResetCallback();
    
    if (this.status != "ready")
        return;
    
    if ($("#filtering").is(':checked'))
        this.model.filter = new SchumannFilter(this.model.width, this.model.height);
    else
        this.model.filter = null;
    
    this.stopTime = $("#runHours").val();
    
    if ($("#history").is(':checked'))
    {
        this.zip = new JSZip();
        this.historyInterval = $("#historyInterval").val();
        this.nextHistory = 3600*this.historyInterval;
        this.precHistory = "";
        this.historyInfo = "";
    }

    this.model.init();
    
    this.initVariableList();

    this.model.totalTime = 0;
    this.model.totalStep = 0;
    
    this.afterResetCallback();
}

ModelUI.prototype.initVariableList = function()
{   
    $("#variableDump").empty();
    this.variableDescriptions = [];
       
    var me = this;
    
    var group = $("<optgroup>", { label:"Variables historiques", id:"HistoricVariables"});
    $("#variableDump").append(group);
    $.each(this.model.getHistoricVariables(), function (i, item) {
        me.variableDescriptions[item.name] = item;
        group.append($('<option>', {
            value: item.name,
            text : item.name
        }));
    });
    
    group = $("<optgroup>", { label:"Variables paramètres", id:"ParameterVariables"});
    $("#variableDump").append(group);
    $.each(this.model.getParameterVariables(), function (i, item) {
        me.variableDescriptions[item.name] = item;
        group.append($('<option>', {
            value: item.name,
            text : item.name
        }));
    }); 

    group = $("<optgroup>", { label:"Variables diagnostiques", id:"DiagnosticVariables"});
    $("#variableDump").append(group);
    $.each(this.model.getDiagnosticVariables(), function (i, item) {
        me.variableDescriptions[item.name] = item;
        group.append($('<option>', {
            value: item.name,
            text : item.name
        }));
    }); 

    group = $("<optgroup>", { label:"Variables internes", id:"InternalVariables"});
    $("#variableDump").append(group);
    $.each(this.model.getInternalVariables(), function (i, item) {
        me.variableDescriptions[item.name] = item;
        group.append($('<option>', {
            value: item.name,
            text : item.name
        }));
    }); 
      
    $.each(this.variableRepresentations, function(i, item) { 
        $("#"+item.group).prepend($('<option>', {
            value: item.name,
            text: item.name+" (carte)"
        }));
    });
    
    $("#variableDump").change(function () {
        me.onVariableChange();
    });
    $("#variableDump").val(this.currentField);
    this.onVariableChange();
    
    
    $("#resetButton").click(function() {
        me.reset(); 
    });

    $("#stepButton").click(function () {
        me.step();
    });
   
    $("#playButton").click(function() {
        me.play();
    });
    
    $("#stopButton").click(function() {
        me.stop();
    });
    
    $("#display").change(function() {
        me.updateDisplay();
    });
    
    $("#exportButton").click(function() {
        me.export();
    });
    
    $("#downloadHistoryButton").click(function()
    {
        if (me.zip!=null)
        {
            me.zip.file("fileinfo.txt", me.historyInfo);
           
            if ("sigma" in me.model)
            {
                var str = "";
                for (var i = 0; i < me.model.sigma.length; i++)
                {
                    str += me.model.sigma[i].toString()+"\n";
                }
                me.zip.file("sigma.txt", str)
            }

            me.zip.generateAsync({type:"blob"})
                .then(function(content) {
                    saveAs(content, "run.zip");
                });
        }
    });
    
    $("#extractColumn").click(function () 
    {
        me.dumpColumn();
    });
}

ModelUI.prototype.onVariableChange = function()
{
    this.currentField = $("#variableDump").val();
    this.initLevelList();
}

ModelUI.prototype.initLevelList = function()
{
    var description = this.variableDescriptions[this.currentField];
    if (description==null) description = this.variableRepresentations[this.currentField];
    
    $("#level").empty();
    $.each(description.levels, function (i, item) {
        $("#level").append($("<option>", {
            value: i,
            text : "s="+item.toFixed(3)+" ["+i.toString()+"]" 
        }));
    });

    var me = this;
    $("#level").change(function() {
        me.displayLevel = Number($("#level").val());
        me.updateDisplay();
    });
    
    this.displayLevel = Number($("#level").val());
    
    this.updateDisplay();
}

ModelUI.prototype.updateDisplay = function ()
{
    this.beforeDisplayCallback();

    if (this.status != "ready")
        return;

    var t = this.model.time;
    var jours = Math.floor(t / 86400);
    t -= jours * 86400;
    var heures = Math.floor(t / 3600);
    t -= heures * 3600;
    var minutes = Math.floor(t / 60);
    this.setStatusString("Temps = " + this.model.time.toString() + " secondes ("
            + jours.toString() + " jrs " + heures.toString() + " hrs "
            + minutes.toString() + " min) - dt=" + this.model.dt.toString() + "s, dlon="
            + this.model.dlon.toString() + "°, dlat=" + this.model.dlat.toString() + "°, "
            + "temps exec = " + this.lastExecTime.toString() + "ms, "
            + "exec total = " + this.totalTime.toString() + "ms, "
            + "nb pas = " + this.totalStep.toString());
    
    
    if ($("#column").val()!="" && $("#row").val()!="")
    {
        this.dumpColumn();
    }

    if ($("#display").is(':checked'))
    {
        var renderer = null;
        if (this.variableRepresentations[this.currentField]!=null)
        {
            renderer = this.variableRepresentations[this.currentField].renderer;
        }
        if (renderer==null)
        {
            var description = this.variableDescriptions[this.currentField];
            renderer = this.defaultRenderer;
            renderer.width = this.model.width;
            renderer.height = this.model.height;
            if (description!=null && description.levels.length>1)
            {
                renderer.variable = this.model.getVariable(this.currentField)[this.getDisplayLevel()];
            }
            else
            {
                renderer.variable = this.model.getVariable(this.currentField);
            }
        }
        
        $('#result').html(renderer.render());
    }
    this.afterDisplayCallback();
}

ModelUI.prototype.step = function()
{
    this.beforeStepCallback();
    if (this.status != "ready")
        return;
    
    if ($("#filtering").is(':checked'))
        this.model.filter = new SchumannFilter(this.model.width, this.model.height);
    else
        this.model.filter = null;
    
    var firstTimestamp = new Date().getTime();
      
    this.model.step();
    
    var secondTimestamp = new Date().getTime();
    this.lastExecTime = secondTimestamp - firstTimestamp;
    this.totalStep++;
    this.totalTime += this.lastExecTime;
    
    this.updateDisplay();
    
    this.afterStepCallback();
    
    this.checkHistory();
}

ModelUI.prototype.playStep = function(timestamp)
{
    this.step();
    this.updateDisplay();
    if (this.playStatus)
    {
        if (this.stopTime==0 || this.model.time<this.stopTime*3600)
        {
            var me = this;
            this.requestFrame = window.requestAnimationFrame(function()
            {
                me.playStep();
            });
        }
    }
}

ModelUI.prototype.play = function()
{
    if (!this.playStatus)
    {
        this.playStatus = true;
        var me = this;
        this.requestFrame = window.requestAnimationFrame(function()
        {
            me.playStep();
        });
    }
}

ModelUI.prototype.stop = function()
{
    if (this.playStatus)
    {
        this.playStatus = false;
        window.cancelAnimationFrame(this.requestFrame);
        this.requestFrame = 0;
    }
}

ModelUI.prototype.export = function()
{
    var data = this.exportField(this.currentField, this.displayLevel);
    var filename = this.getFileNameFor(this.currentField, this.displayLevel);
    var blob = new Blob([data], {type: 'text/plain'});
    saveAs(blob, filename);
}

ModelUI.prototype.getFileNameFor = function(field, level)
{
    var description = this.variableRepresentations[field];
    if (description==null) description = this.variableDescriptions[field];
    var filename = "";
    var hour = (Math.floor(this.model.time / 3600)).toString();
    if (description!=null)
    {
        if (description.levels.length>1)
        {
            filename = field+"_"+level+"_"+hour+".txt";
        }
        else
        {
            filename = field+"_"+hour+".txt";
        }
    }
    else
    {
        filename = field+"_"+hour+".txt";
    }
    return filename;
}

ModelUI.prototype.exportField = function(field, level)
{
    var currentField_save = this.currentField;
    var displayLevel_save = this.displayLevel;
    var exporter = null;
    var data = null;
    
    this.currentField = field;
    this.displayLevel = level;
    
    this.beforeExportCallback();
    
    if (this.variableRepresentations[this.currentField]!=null)
    {
        exporter = this.variableRepresentations[this.currentField].exporter;
        data = this.variableRepresentations[this.currentField].data;
    }
    if (exporter==null)
    {
        var description = this.variableDescriptions[this.currentField];
        exporter = this.defaultExporter;
        exporter.width = this.model.width;
        exporter.height = this.model.height;
        if (data!=null)
        {
            exporter.variable = data;
        }
        else if (description!=null)
        {
            if (description.levels.length>1)
            {
                exporter.variable = this.model.getVariable(this.currentField)[this.getDisplayLevel()];
            }
            else
            {
                exporter.variable = this.model.getVariable(this.currentField);
            }
        }
        else 
        {
            exporter = null;
        }
    }
    
    var data = null;
    if (exporter!=null)
    {
        data = exporter.export();
    }
    
    this.afterExportCallback();
    
    this.currentField = currentField_save;
    this.displayLevel = displayLevel_save;
    
    return data;
}


ModelUI.prototype.checkHistory = function()
{
    if (this.zip!=null)
    {
        if (this.model.time>=this.nextHistory)
        {
            var me = this;
            var hours = Math.floor(this.model.time/3600);
            var hoursfmt = "0"+hours;
            var inithour = "0"+this.model.startDate.getUTCHours();
            var modelname = this.model.getName();
            var dt = this.model.getCurrentDate();
            var fileinfo = hours+".txt;"
                    +modelname+";"
                    +inithour.substring(inithour.length-2)+";"
                    +this.model.startDate.toLocaleDateString()+";"
                    +hoursfmt.substring(hoursfmt.length-2)+";"
                    +dt.toLocaleDateString("fr-fr", {
                         weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                    })+";"
                    +dt.toLocaleTimeString("fr-fr", {
                        hour:'2-digit', minute:'2-digit'
                    })+";"
                    +this.precHistory;
            this.precHistory = hours+".txt";
            if (this.historyInfo.length>0) this.historyInfo += "\n"; 
            this.historyInfo += fileinfo;
            
            $.each(this.historyList, function (i, item) {
                var description = me.variableRepresentations[item];
                if (description==null) description = me.variableDescriptions[item];
                for (var k=0;k<description.levels.length;k++)
                {
                    var data = me.exportField(item, k);
                    var filename = me.getFileNameFor(item, k)
                    me.zip.file(filename, data);
                }
            });
            
            this.nextHistory += this.historyInterval*3600;
        }
        
    }
}

ModelUI.prototype.dumpColumn = function()
{
    var table = [];
    var i = 0;
    var col = Number($("#column").val());
    var row = Number($("#row").val());
    var html = "<table><tr><td></td>";
    for (var k in this.variableDescriptions)
    {
        html += "<td>"+this.variableDescriptions[k].name+"</td>";
        for (i=0;i<this.variableDescriptions[k].levels.length;i++)
        {
            if (! (i in table)) table[i] = [];
            if (this.variableDescriptions[k].levels.length>1)
            {
                table[i][this.variableDescriptions[k].name] = this.model.getVariable(this.variableDescriptions[k].name)[i][this.model.width*row+col];
            }
            else
                table[i][this.variableDescriptions[k].name] = this.model.getVariable(this.variableDescriptions[k].name)[this.model.width*row+col];
        }
    };
    html += "</tr>";
    for (i=0;i<table.length;i++)
    {
        html += "<tr><td>"+i.toString()+"</td>";
        for (var k in this.variableDescriptions)
        {
            if (this.variableDescriptions[k].name in table[i])
                html += "<td>"+table[i][this.variableDescriptions[k].name].toString()+"</td>";
            else
                html += "<td></td>";
        }
        html += "</tr>";
    }
    html += "</table>";
    $("#dump").html(html);
}