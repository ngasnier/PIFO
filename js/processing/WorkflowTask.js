/* 
 * Copyright (C) 2019 Nicolas GASNIER (http://www.meteo-blois.fr/contact/)
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

import { Task } from "./Task.js";
import { LinkData } from "./LinkData.js";
import { Matrix } from "../math/Matrix.js";

export class WorkflowTask extends Task {
   
    constructor()
    {
        super();
        
        this.components = [];
        this.links = [];
        this.bindParameters = [];
        
        this.levels = [];
        this.linksData = [];
        this.inputsData = [];
        this.outputsData = [];
        this.workflowMarix = [];
        
    }
    
    get parameters()
    {
        var params = [];
        for (var i=0;i<this.bindParameters.length;i++) params.push(this.bindParameters[i].name);       
        return params;
    }
    
    setParameterValue(name, value)
    {
        super.setParameterValue(name, value);
        
        for (var i=0;i<this.bindParameters.length;i++) 
        {
            if (this.bindParameters[i].name==name)
            {
                var component = this.getComponent(this.bindParameters[i].bindComponent);
                component.setParameterValue(this.bindParameters[i].parameter, value);
            }
        }
    }
    
    async setup()
    {
        try {
            this.createWorkflow();
            for (var i in this.components)
            {
                this.components[i].model = this.model;
                await this.components[i].setup();
            }
            return this;
        }
        catch (e)
        {
            throw e;
        }
    }

    async terminate()
    {
        try {
            for (var i in this.components)
            {
                await this.components[i].terminate();
            }
            return this;
        }
        catch (e)
        {
            throw e;
        }
    }
    
    async process()
    {
        try {
            var all_done = false;
            while (!all_done)
            {
                all_done = false;
                for (var i=0;i<this.linksData.length;i++)
                {
                    this.linksData[i].clear();
                }
                    
                for (var i=this.levels.length-1;i>=0;i--)
                {
                    for (var j=0;j<this.levels[i].length;j++)
                    {
                        var component = this.levels[i][j];
                        var inputs = this.inputsData[component.name];
                        var outputs = this.outputsData[component.name];
                        
                        var has_data_in = true;
                        if (Object.keys(inputs).length!=0)
                        {
                            for (var key in inputs) {
                                has_data_in = has_data_in && inputs[key].getData()!=null;
                            }
                        }


                        if (has_data_in)
                        {    
                            await this.levels[i][j].process(inputs, outputs);

                            var has_data_out = true;
                            if (Object.keys(outputs).length!=0)
                            {
                                for (var key in outputs) {
                                    has_data_out = has_data_out && outputs[key].getData()!=null
                                }
                            }

                            if (!has_data_out) 
                            {
                                all_done = true;
                            }
                        }
                        else
                        {
                            all_done = true;
                        }
                    }
                }
            }
        }
        catch (e)
        {
            throw e;
        }
    }
    
    getComponent(name)
    {
        for (var i in this.components)
        {
            if (this.components[i].name==name) return this.components[i];
        }
        return null;
    }

    getComponentIndex(name)
    {
        for (var i in this.components)
        {
            if (this.components[i].name==name) return i;
        }
        return -1;
    }
    
    createWorkflow()
    {
        this.workflowMatrix = Matrix.createMatrix(this.components.length, this.components.length);
        
        for (var i in this.components)
        {
            this.inputsData[this.components[i].name] = [];
            this.outputsData[this.components[i].name] = [];
        }
        
        for (var i in this.links)
        {
            var a = this.getComponent(this.links[i].outputComponent);
            var b = this.getComponent(this.links[i].inputComponent);
            this.workflowMatrix[this.getComponentIndex(this.links[i].inputComponent)][this.getComponentIndex(this.links[i].outputComponent)] = 1;
            
            var link_data = new LinkData();
            link_data.name = this.links[i].outputComponent+"-"+this.links[i].output+"=>"+this.links[i].inputComponent+"-"+this.links[i].input;
            this.inputsData[this.links[i].inputComponent][this.links[i].input] = link_data;
            this.outputsData[this.links[i].outputComponent][this.links[i].output] = link_data;
            this.linksData.push(link_data);
        }
        this.createLevels();
        if (this.levels.length==0) throw `workflow ${this.name}: no connections or loop in dataflow.`;
    }
    
    createLevels()
    {
        var x;
        var i = 0;
        this.levels = [];
        while ((x=this.getIndependentComponents()).length>0)
        {
            this.levels.push([]);
            
            // Traite les composants de même niveau
            for (var k=0;k<x.length;k++)
            {
                // Ce composant fait partie de ce niveau
                this.levels[i].push(this.components[x[k]]);
                
                // Marque le composant comme utilisé
                for (var j=0;j<this.components.length;j++)
                {
                    this.workflowMatrix[x[k]][j] = 2;
                    this.workflowMatrix[j][x[k]] = 2;
                }
            }
            
            i++;
        }
    }
    
    getIndependentComponents()
    {
        var x = [];
        var only0;
        var only1;
        var hasNotMarked;
        for (var i=0;i<this.components.length;i++)
        {
            only0 = true;
            only1 = true;
            hasNotMarked = false;
            for (var j=0;j<this.components.length;j++)
            {
                if (this.workflowMatrix[j][i]<2)
                {
                    only0 = only0 && this.workflowMatrix[j][i]==0;
                    only1 = only1 && this.workflowMatrix[j][i]==1;
                    hasNotMarked = true;
                }
            }
            if ((only0 || only1) && hasNotMarked) x.push(i);
        }
        return x;
    }
}
