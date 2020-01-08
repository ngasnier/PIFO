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

import { configure, getLogger } from 'log4js';

import { Scenario } from "./Scenario.js";
import { RunScenario } from "./RunScenario.js";
import { DataSource } from "./DataSource.js";
import { Variable } from "../modeling/Variable.js";
import { VariableDescription } from "../modeling/VariableDescription.js";

/**
 * Scénario d'initialisation par filtrage digital utilisant la méthode de 
 * Lynch et Huang..
 * 
 * <p>La méthode consiste à procédant à deux hindcast: l'un vers l'avant, 
 * l'autre vers l'arrière, chaque pas de temps étant filtré par un coefficient 
 * de fourier. Le résultat final de la série de fourier donne la valeur des 
 * champs pour t=0.</p>
 * 
 * <p>Paramètres :
 * <ul>
 * <li>stopTime : comme pour un run classique, détermine le nombre d'heures
 * de chaque hindcast. Défaut : 6.</li>
 * </ul>
 * </p>
 */
export class DFIInitScenario extends RunScenario {
    /**
     * 
     * @returns {undefined}
     */
    constructor()
    {
        super();
               
        // Nombre d'étapes pour chaque hindcast
        this.hindcastStatus = "forward";
        this.hindcastNb = 0;
        this.hindcastStep = 0;
        this.hindcastLcSum = 0;
        this.hindcastForwardSum = [];
        this.hindcastBackwardSum = [];
        this.hindcastSeries = [];
        this.filterCoeffs = [];
        this.overrideModelParams = {};
    }
    
    /**
     * Initialise le run.
     * 
     * <p>Les données de départ sont chargées depuis la DataSource et 
     * fournies au modèle.</p>
     * @returns {RunScenario}
     */
    async start()
    {
        try
        {
            for (var prop in this.overrideModelParams)
            {
                this.model[prop] = this.overrideModelParams[prop] ;
            }
            
            await super.start();
            
            var me = this;
            
            this.hindcastStatus = "forward";
            
            this.hindcastNb = this.stopTime*3600 / this.model.dt;
            this.hindcastStep = 0;
            
            this.filterCoeffs = [ 0.5*1/(this.hindcastNb*Math.PI*Math.PI/(this.hindcastNb+1)) ];
            
            var sum = this.filterCoeffs[0];
            for (var n=1;n<=this.hindcastNb;n++)
            {               
                this.filterCoeffs[n] = 
                        Math.sin(n*Math.PI/(this.hindcastNb+1))/(n*Math.PI/(this.hindcastNb+1))
                        *Math.sin(n*Math.PI/this.hindcastNb)/(n*Math.PI);
                sum += this.filterCoeffs[n];
            }
            
            var norm = 1/(sum*2);
            for (var n=0;n<=this.hindcastNb;n++)
            {
                this.filterCoeffs[n] *= norm;
            }
           
            var h = this.filterCoeffs[0];

            this.hindcastLcSum = 2*h;

            this.model.getHistoricVariables().forEach(function (item) {
                me.hindcastBackwardSum[item.name] = Variable.clone(me.model.getVariable(item.name));
                me.hindcastForwardSum[item.name] = Variable.clone(me.model.getVariable(item.name));
                Variable.mulConst(me.hindcastBackwardSum[item.name], h, me.hindcastBackwardSum[item.name]);
                Variable.mulConst(me.hindcastForwardSum[item.name], h, me.hindcastForwardSum[item.name]);
            });
            
            this.hindcastSeries = this.hindcastForwardSum;
            
            this.sendMessage("starting forward hindcast");
 
            return this;
        }
        catch (e)
        {
            throw e;
        }
    }
    
    /**
     * 
     * @returns {RunScenario}
     */
    async finish()
    {
        try
        {
            await super.finish();
            if (this.dataSource.isOpen()) await this.dataSource.close();
        }
        catch (e)
        {
            throw e;
        }
    }
    
    async stepEnd()
    {
        try
        {
            await super.stepEnd();
            
            var me = this;
            
            this.hindcastStep++;
            
            var h = this.filterCoeffs[this.hindcastStep];

            this.model.getHistoricVariables().forEach(function (item) {
                Variable.a_bc(me.hindcastSeries[item.name], me.model.getVariable(item.name), h, me.hindcastSeries[item.name]);
            });

            this.hindcastLcSum += h;

            if (this.hindcastStep>=this.hindcastNb)
            {
                if (this.hindcastStatus=="forward")
                {
                    // Reset le modèle et inverse le pas de temps
                    this.sendMessage("end forward hindcast");
                    await this.loadInitData();
                    this.hindcastStep = 0;
                    this.model.time = 0;
                    this.model.dt = -this.model.dt;
                    this.hindcastSeries = this.hindcastBackwardSum;
                    this.hindcastStatus = "backward";
                    this._status = Scenario.STATE_RUN;
                    this.sendMessage("starting backward hindcast");
                }
                else
                {
                    this.sendMessage("end backward hindcast");
                    
                    // Calcul des valeurs initiales à partir des sommes de fourier
                    this.model.getHistoricVariables().forEach(function (item) {
                        Variable.sum(me.hindcastBackwardSum[item.name], me.hindcastForwardSum[item.name], me.model.getVariable(item.name));                        
                    });
                    
                    // Le modèle peut être reset à t=0 pour historisation 
                    this.model.time = 0;
                    this.model.dt = -this.model.dt;
                    
                    this.sendMessage(this.hindcastLcSum);

                    this._status = Scenario.STATE_END;
                }
            }
        }
        catch (e)
        {
            throw e;
        }
    }
}