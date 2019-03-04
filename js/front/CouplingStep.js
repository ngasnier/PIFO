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

import { Step } from "./Step.js";
import { DataSource } from "./DataSource.js";
import { Variable } from "../modeling/Variable.js";

/**
 * Fournit au modèle des variables de couplage interpolées temporellement.
 * @type type
 */
export class CouplingStep extends Step
{
    /**
     * 
     * @returns {undefined}
     */
    constructor()
    {
        super();
        this.variables = [];
        this.times = [];
        this.dataSource = null;
        this.t1 = -1;
        this.t2 = -1;
        this.vt1 = null;
        this.vt2 = null;
    }
    
    /**
     * 
     * @returns {undefined}
     */
    async init()
    {
        try
        {
            if (!this.dataSource.isOpen()) await this.dataSource.open(DataSource.MODE_READ);

            this.times = this.dataSource.times.slice();
            for (var i in this.times) this.times[i] *= 3600;
            
            return this;
        }
        catch (e)
        {
            throw e;
        }
    }
    
    /**
     * 
     * @returns {undefined}
     */
    async stepFinish()
    {
        try
        {
            if (this.dataSource.isOpen()) await this.dataSource.close();
        }
        catch (e)
        {
            throw e;
        }
    }
    
    /**
     * 
     * @param {type} p_model
     * @returns {undefined}
     */
    async stepBegin(p_model)
    {
        return this;
    }
    
    /**
     * 
     * @param {type} p_model
     * @returns {undefined}
     */
    async stepDo(p_model)
    {
        try
        {
            // S'assure qu'on a les champs requis en mémoire
            var t = p_model.time;
            var [t1, t2] = this.getTimeIndex(t);
            if (t1>this.t1)
            {
                if (t1==this.t2)
                {
                    this.vt1=this.vt2;
                }
                else
                {
                    this.vt1 = await this.loadFields(this.times[t1]);
                }
                this.vt2 = await this.loadFields(this.times[t2]);
            } 
            else if (t1<this.t1)
            {
                if (t2==this.t1)
                {
                    this.vt2 = this.vt1;
                }
                else
                {
                    this.vt2 = await this.loadFields(this.times[t2]);
                }
                this.vt1 = await this.loadFields(this.times[t1]);
            }
            this.t1 = t1;
            this.t2 = t2;
            
            // Interpolation des valeurs
            for (var i in this.variables)
            {
                var v = this.variables[i];
                this.interp(this.vt1[v.name], this.vt2[v.name], this.t1, this.t2, t, p_model.getVariable(v.name));
            }
            
            return this;
        }
        catch (e)
        {
            throw e;
        }
    }
    
    /**
     * 
     * @param {type} p_model
     * @returns {undefined}
     */
    async stepEnd(p_model)
    {
        return this;
    }
    
    interp(v1, v2, t1, t2, time, res)
    {
        var t;
        var tprec = this.times[0];
        if (t1!=t2)
        {
            this.linint(v1, v2, t1, t2, time, res);
        }
        else
        {
            Variable.copy(v1, res);
        }
    }
    
    getTimeIndex(time)
    {
        var tprec = this.times[0];
        if (this.times.length>1)
        {
            for (var i = 1; i < this.times.length; i++)
            {
                if ( time >= tprec && time < this.times[i])
                {
                    return [i-1, i];
                }
                tprec = this.times[i];
            }
            return [this.times.length-1, this.times.length-1];
        }
        else
        {
            return [0, 0];
        }
    }
    
    linint(a, b, t1, t2, t, res)
    {
        var coef = (t - t1) / (t2 - t1);
        if (a.length>0 && (a[0].constructor===Array || a[0].constructor===Float64Array))
        {
            for (var k=0;k<a.length;k++)
            {
                for (var i = 0; i < a[k].length; i++)
                {
                    res[k][i] = (1 - coef) * a[k][i] + coef * b[k][i];
                }
            }
        }
        else
        {
            for (var i = 0; i < a.length; i++)
            {
                res[i] = (1 - coef) * a[i] + coef * b[i];
            }
        }
    }

    
    async loadFields(time)
    {
        try
        {
            var fields = [];
            if (!this.dataSource.isOpen()) await this.dataSource.open(DataSource.MODE_READ);
            for (var i in this.variables)
            {
                var v = this.variables[i];
                fields[v.name] = await this.dataSource.getField(v.source, time/3600);
            }
            return fields;
        }
        catch (e)
        {
            throw e;
        }
    }
}