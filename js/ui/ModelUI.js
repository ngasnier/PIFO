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
import { VariableDescription } from "../modeling/VariableDescription.js";
import { Scenario } from "../front/Scenario.js";
import { FieldHTMLRenderer } from "./FieldHTMLRenderer.js";
import { FieldTextExporter } from "./FieldTextExporter.js";
import { saveAs } from "../vendor/FileSaver.js";

export class ModelUI
{
    constructor()
    {
        this.model = null;
        
        this._scenario = null;

        this.variableDescriptions = [];

        this.variableRepresentations = [];

        this.currentField = 'Vent';

        this.displayLevel = 0;

        this.statusString = "";

        this.defaultRenderer = new FieldHTMLRenderer();

        this.defaultExporter = new FieldTextExporter();

        this.playStatus = false;

        this.requestFrame = 0;

        this.zip = null;

        this.stopTime = 0;

        this.hindcastStep = 0;

        this.hindcastNb = 0;

        this.hindcastForwardSum = [];

        this.hindcastBackwardSum = [];

        this.hindcastSeries = [];

        this.hindcastLcSum = 0;

        this.hindcastCb = function() {};

        this.beforeResetCallback = function() {};
        this.afterResetCallback = function() {};

        this.beforeStepCallback = function() {};
        this.afterStepCallback = function() {};   

        this.beforeDisplayCallback = function() {};
        this.afterDisplayCallback = function() {};

        this.beforeExportCallback = function() {};
        this.afterExportCallback = function() {};
    }
    
    get scenario()
    {
        return this._scenario;
    }
    
    set scenario(p_scenario)
    {
        var me = this;
        this._scenario = p_scenario;
        this.model = this._scenario.model;
        this._scenario.onMessage = function(msg)
        {
            me.setStatusString(msg);
        }
    }
    
    setStatusString(p_str)
    {
        this.statusString = p_str;
        $(statistics).html(this.statusString);
    }

    getStatusString()
    {
        return this.statusString;
    }

    getDisplayVariable()
    {
        return this.currentField;
    }

    getDisplayLevel()
    {
        return this.displayLevel;
    }

    reset()
    {
        this.stop();
        
        this.beforeResetCallback();
            
        this.scenario.start().then((sc)=>
        {
            this.afterResetCallback();

            this.initVariableList();
        }).catch((e)=>
        {
            if (e instanceof Error) 
            {
                console.log("reset() : error : ", e.message, e);
                this.setStatusString(e.toString());
            }
            else
            {
                console.trace("reset() : error :", e);
                this.setStatusString(e.toString());
            }
        });
    }

    initVariableList()
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

        $("#variableDump").append(group);
        $.each(this.model.getVariablesDescriptions(VariableDescription.CAT_POST_PHYSICS_DIAGNOSTICS), function (i, item) {
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

        $("#initButton").click(function(){
           me.startInit();
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

        $("#extractColumn").click(function () 
        {
            me.dumpColumn();
        });
    }

    onVariableChange()
    {
        this.currentField = $("#variableDump").val();
        this.initLevelList();
    }

    initLevelList()
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

    updateDisplay()
    {
        this.beforeDisplayCallback();

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

    async step()
    {
        try {
            this.beforeStepCallback();
            if (this.scenario.status!=Scenario.STATE_RUN) return;

            var firstTimestamp = new Date().getTime();

            await this.scenario.step();

            var secondTimestamp = new Date().getTime();
            this.lastExecTime = secondTimestamp - firstTimestamp;
            this.totalStep++;
            this.totalTime += this.lastExecTime;

            this.updateDisplay();

            this.afterStepCallback();

            return this;
        }
        catch (e)
        {
            console.log("erreur", e);
            this.setStatusString(e.toString());
            this.playStatus = false;
            throw e;
        }
    }

    playStep(timestamp)
    {
        this.step().then(() =>
            {
                if (this.playStatus)
                {
                    if (this.scenario.status==Scenario.STATE_RUN)
                    {
                        var me = this;
                        if (window.requestAnimationFrame)
                            this.requestFrame = window.requestAnimationFrame(function() {
                                me.playStep();
                            });
                        else
                            this.requestFrame = window.requestIdleCallback(function() {
                                me.playStep();
                            });
                        
                    }
                }
            })
            .catch((e)=>{
                console.log("erreur", e);
                this.setStatusString(e.toString());
                this.playStatus = false;
            });
    }

    play()
    {
        if (!this.playStatus && this.scenario.status==Scenario.STATE_RUN)
        {
            this.playStatus = true;
            var me = this;
            if (window.requestAnimationFrame)
                this.requestFrame = window.requestAnimationFrame(function() {
                    me.playStep();
                });
            else
                this.requestFrame = window.requestIdleCallback(function() {
                    me.playStep();
                });
        }
    }

    stop()
    {
        if (this.playStatus)
        {
            this.playStatus = false;
            if (window.requestIdleCallback)
                window.cancelIdleCallback(this.requestFrame);
            else
                window.cancelAnimationFrame(this.requestFrame);
            this.requestFrame = 0;
        }
    }

    export()
    {
        var data = this.exportField(this.currentField, this.displayLevel);
        var filename = this.getFileNameFor(this.currentField, this.displayLevel);
        var blob = new Blob([data], {type: 'text/plain'});
        saveAs(blob, filename);
    }

    getFileNameFor(field, level)
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

    exportField(field, level)
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

    dumpColumn()
    {
        if (this.model.nbcouches>1)
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
    }

/* ---------------- CETTE PARTIE DOIT DEVENIR UN SCENARIO ------------------ */
    startInit()
    {   
        var me = this;

        // Reset du modèle avec les variables brutes
        this.status = "hindcast";
        this.reset();

        // Nombre d'étapes pour chaque hindcast
        this.hindcastNb = 3*3600 / this.model.dt;
        this.hindcastStep = 0;
        var lc = 0.5*1/(this.hindcastNb*Math.PI*Math.PI/(this.hindcastNb+1));
        this.hindcastLcSum = lc;

        $.each(this.model.getHistoricVariables(), function (i, item) {
            me.hindcastBackwardSum[item.name] = Variable.clone(me.model.getVariable(item.name));
            me.hindcastForwardSum[item.name] = Variable.clone(me.model.getVariable(item.name));
            Variable.mulConst(me.hindcastBackwardSum[item.name], lc, me.hindcastBackwardSum[item.name]);
            Variable.mulConst(me.hindcastForwardSum[item.name], lc, me.hindcastForwardSum[item.name]);
        });

        this.hindcastSeries = this.hindcastForwardSum;
        this.hindcastCb = this.onForwardHindcastEnd;
        this.playHindcast();
    }

    playHindcastStep(timestamp)
    {
        var me = this;
        this.hindcastStep++;

        this.step();

        var lc = Math.sin(me.hindcastStep*Math.PI/(me.hindcastNb+1))/(me.hindcastStep*Math.PI/(me.hindcastNb+1))
                *Math.sin(me.hindcastStep*Math.PI/me.hindcastNb)/(me.hindcastStep*Math.PI);

        $.each(this.model.getHistoricVariables(), function (i, item) {
            Variable.a_bc(me.hindcastSeries[item.name], me.model.getVariable(item.name), lc, me.hindcastSeries[item.name]);
        });

        this.hindcastLcSum += lc;

        this.updateDisplay();

        if (this.playStatus)
        {
            if (this.hindcastStep==0 || this.hindcastStep<this.hindcastNb)
            {
                var me = this;
                this.requestFrame = window.requestAnimationFrame(function()
                {
                    me.playHindcastStep();
                });
            }
            else
            {
                this.playStatus = false;
                this.hindcastCb();
            }
        }
    }

    playHindcast()
    {
        if (!this.playStatus)
        {
            this.playStatus = true;
            var me = this;
            this.requestFrame = window.requestAnimationFrame(function()
            {
                me.playHindcastStep();
            });
        }
    }

    onForwardHindcastEnd()
    {
        // Reset le modèle et inverse le pas de temps
        this.reset();
        this.hindcastStep = 0;
        this.model.dt = -this.model.dt;
        this.hindcastSeries = this.hindcastBackwardSum;
        this.hindcastLcSum = 0.5*Math.PI*Math.PI/(this.hindcastNb);
        this.hindcastCb = this.onBackwardHindcastEnd;
        this.playHindcast();
    }

    onBackwardHindcastEnd()
    {
        var me = this;

        $.each(this.model.getHistoricVariables(), function (i, item) {       
            Variable.sum(me.hindcastBackwardSum[item.name], me.hindcastForwardSum[item.name], me.model.getVariable(item.name));
        });

        this.status = "ready";

        this.model.dt = -this.model.dt;
        this.model.init();
        this.updateDisplay();    
    }    
}


