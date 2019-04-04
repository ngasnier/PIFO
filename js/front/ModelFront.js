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

import { Variable } from "../modeling/Variable.js";
import { SchumannFilter } from "../modeling/SchumannFilter.js";
import { FieldTextExporter } from "../ui/FieldTextExporter.js";

// Node.js specific
var fs = require('fs')


export var ModelFront = function()
{
    this.model = null;
    
    this.variableDescriptions = [];
    
    this.variableRepresentations = [];
    
    this.historyList = [];
    
    this.currentField = 'Vent';

    this.displayLevel = 0;
    
    this.firstExecTime = 0;
    
    this.lastExecTime = 0;
    
    this.totalTime = 0;
    
    this.totalStep = 0;

    this.status = "loading";
    
    this.statusString = "";
       
    this.defaultExporter = new FieldTextExporter();

    this.playStatus = false;
    
    this.requestFrame = 0;
        
    this.historyIntervall = 3;
    
    this.nextHistory = 0;
    
    this.stopTime = 0;
    
    this.precHistory = "";
    
    this.historyInfo = "";
    
    this.historyDir = "output";
        
    this.beforeResetCallback = function() {};
    this.afterResetCallback = function() {};

    this.beforeStepCallback = function() {};
    this.afterStepCallback = function() {};   
    
    this.beforeDisplayCallback = function() {};
    this.afterDisplayCallback = function() {};

    this.beforeExportCallback = function() {};
    this.afterExportCallback = function() {};
}


ModelFront.prototype.setStatus = function(p_st)
{
    this.status = p_st;
}

ModelFront.prototype.getStatus = function()
{
    return this.status;
}

ModelFront.prototype.getStatusString = function()
{
    return this.statusString;
}

ModelFront.prototype.getCurrentVariable = function()
{
    return this.currentField;
}

ModelFront.prototype.getDisplayLevel = function()
{
    return this.displayLevel;
}

ModelFront.prototype.initVariableList = function()
{   
    this.variableDescriptions = [];
       
    var me = this;
    
    var vl = this.model.getHistoricVariables();
    vl.forEach(function (item) {
        me.variableDescriptions[item.name] = item;
    });
    
    vl = this.model.getParameterVariables();
    vl.forEach(function (item) {
        me.variableDescriptions[item.name] = item;
    });

    vl = this.model.getDiagnosticVariables();
    vl.forEach(function (item) {
        me.variableDescriptions[item.name] = item;
    });

    vl = this.model.getInternalVariables();
    vl.forEach(function (item) {
        me.variableDescriptions[item.name] = item;
    });
}

ModelFront.prototype.updateDisplay = function ()
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
    console.log("Temps = " + this.model.time.toString() + " secondes ("
            + jours.toString() + " jrs " + heures.toString() + " hrs "
            + minutes.toString() + " min) - dt=" + this.model.dt.toString() + "s, dx="
            + this.model.dx.toString() + ", dy=" + this.model.dx.toString() + ", "
            + "temps exec = " + this.lastExecTime.toString() + "ms, "
            + "exec total = " + this.totalTime.toString() + "ms, "
            + "nb pas = " + this.totalStep.toString());
    
    this.afterDisplayCallback();
}

ModelFront.prototype.reset = function()
{
    this.beforeResetCallback();
    
    if (this.status != "ready")
        return;
        
    this.model.setup();
    
    this.initVariableList();

    this.model.totalTime = 0;
    this.model.totalStep = 0;
    this.firstExecTime = new Date();
 
    if (this.historyInterval>0)
    {
        this.precHistory = "";
        this.historyInfo = "";

        this.nextHistory = 0;
        this.checkHistory();
        
        //this.nextHistory = 3600*this.historyInterval;
    }

    this.afterResetCallback();
}

ModelFront.prototype.step = function()
{
    try
    {
        this.beforeStepCallback();
        if (this.status != "ready")
            return;

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
    catch (e)
    {
        console.log(e);
        process.exit(0);
    }
}

ModelFront.prototype.playStep = function(timestamp)
{
    if (this.playStatus)
    {
        if (this.stopTime==0 || this.model.time<this.stopTime*3600)
        {
            this.step();
            var me = this;
            this.requestFrame = process.nextTick(function()
            {
                me.playStep();
            });
        }
        else
        {
            var now = new Date();
            console.log("durée du calcul (ms) : "+(now.getTime()-this.firstExecTime.getTime()));
        }
    }
}

ModelFront.prototype.play = function()
{   
    if (!this.playStatus)
    {
        this.playStatus = true;
        var me = this;
        this.requestFrame = process.nextTick(function()
        {
            me.playStep();
        });
    }
}



ModelFront.prototype.getFileNameFor = function(field, level)
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
    return this.historyDir+"/"+filename;
}

ModelFront.prototype.exportField = function(field, level)
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
        if (exporter!=null) exporter.variable = data;
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
//                if (this.currentField==="U") console.log(exporter.variable);
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


ModelFront.prototype.checkHistory = function()
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
                +(hoursfmt.length<=3?hoursfmt.substring(hoursfmt.length-2):hours)+";"
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

        this.historyList.forEach(function (item) {
            var description = me.variableRepresentations[item];
            if (description==null) description = me.variableDescriptions[item];
            for (var k=0;k<description.levels.length;k++)
            {
                var filename = me.getFileNameFor(item, k)
                console.log("exporting "+filename);
                var data = me.exportField(item, k);
                fs.writeFileSync(filename, data);
            }
        });

//        if (this.model.time>=this.stopTime*3600)
        {
            var filename = this.historyDir+"/fileinfo.txt";
            console.log("exporting "+filename);
            fs.writeFileSync(filename, this.historyInfo);
            
            if ("sigma" in this.model)
            {
                var str = "";
                filename = this.historyDir+"/sigma.txt";
                for (var i = 0; i < this.model.sigma.length; i++)
                {
                    str += this.model.sigma[i].toString()+"\n";
                }
                console.log("exporting "+filename);
                fs.writeFileSync(filename, str);
            }
        }

        this.nextHistory += this.historyInterval*3600;
    }
}