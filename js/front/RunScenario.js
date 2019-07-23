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

import { Scenario } from "./Scenario.js";
import { DataSource } from "./DataSource.js";
import { VariableDescription } from "../modeling/VariableDescription.js";

/**
 * Scénario de run standard.
 * 
 * <p>Ce scénario utilise des données réelles. Il recherche les variables 
 * de modèle de type pronostiques et paramètres dans la source de données
 * et les fournit en entrée du modèle. Le scénario fonctionne ensuite pour 
 * la durée déterminée en paramètre.</p>
 * 
 * <p>Paramètres :
 * <ul>
 * <li>dataSource : une référence vers une DataSource pour charger les données.
 * Le scénario charge des données pour les variables de type diagnostique et
 * paramètre, celles-ci doivent exister dans la DataSource pour t=0. </li>
 * <li>steps : tableau d'objets Step. Permet d'inclure les étapes d'historisation
 * des données, de chargement de données pour la conditon aux limites, etc...</li>
 * <li>stopTime : fin du scénario en nombre d'heures. </li>
 * </ul>
 * </p>
 */
export class RunScenario extends Scenario {
    /**
     * 
     * @returns {undefined}
     */
    constructor()
    {
        super();
        
        this.firstExecTime = 0;

        this.lastExecTime = 0;

        this.totalTime = 0;

        this.totalStep = 0;
    
        this.stopTime = 0;
        
        /** Source de données pour les données d'entrée. */
        this.dataSource = null;
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
            await super.start();
           
            // Initialisation du modèle
            this.model.startDate = this.dataSource.initDate;
            this.model.setup();
            
            await this.loadInitData();
              
            this._status = Scenario.STATE_RUN;
            this.sendMessage("STARTING MODEL RUN");
            this.sendMessage(`model : ${this.model.name}`);
            this.sendMessage(`domain : width=${this.model.width}, height=${this.model.height}, layers=${this.model.nbLayers}`);
            this.sendMessage(`levels : [${this.model.verticalCoords}]`);
            
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
    
    async stepDo()
    {
        try
        {
            var firstTimestamp = new Date().getTime();
            this.model.step();
            var secondTimestamp = new Date().getTime();
            this.lastExecTime = secondTimestamp - firstTimestamp;
            this.totalStep++;
            this.totalTime += this.lastExecTime;
            this.sendMessage(this.getMessage());
            return this;
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
            if (Math.abs(this.model.time)>=Math.abs(this.stopTime*3600)) // TODO : paramétrage en secondes ?
            {
                this._status = Scenario.STATE_END;
                var now = new Date();
                this.sendMessage("total calc time (ms) : "+(now.getTime()-this.firstExecTime.getTime()));
            }
        }
        catch (e)
        {
            throw e;
        }
    }
    
    async loadInitData()
    {
        try {
            // Ouverture des données
            await this.dataSource.open(DataSource.MODE_READ);

            // Obtient les données de départ
            var variables = this.model.getVariablesDescriptions();
            for (var v in variables)
            {
                var variable = variables[v];
                if (variable.category == VariableDescription.CAT_PRONOSTIC 
                        || variable.category == VariableDescription.CAT_PARAMETER)
                {
                    this.sendMessage(`loading variable data ${variable.name} at t=0`);
                    this.model.setVariable(variable.name, 
                        await this.dataSource.getField(variable.name, 0));
                }
            }
            this.model.totalTime = 0;
            this.model.totalStep = 0;
            this.firstExecTime = new Date();
    
            this.model.calcConstants();
            this.model.calcDiagnostics();
            
            await this.dataSource.close();
            
            return this;
        }
        catch (e)
        {
            throw e;
        }
    }
    
    getMessage()
    {
        var t = Math.abs(this.model.time);
        var sign = this.model.time>=0?"":"-";
        var jours = Math.floor(t / 86400);
        t -= jours * 86400;
        var heures = Math.floor(t / 3600);
        t -= heures * 3600;
        var minutes = Math.floor(t / 60);
        return "Time = " + this.model.time.toString() + " s ("+sign
                + jours.toString() + " d " + heures.toString() + " h "
                + minutes.toString() + " m) - dt=" + this.model.dt.toString() + "s, dx="
                + this.model.dx.toString() + ", dy=" + this.model.dy.toString() + ", "
                + "step time = " + (this.lastExecTime).toString() + "ms, "
                + "total time = " + this.totalTime.toString() + "ms, "
                + "nb steps = " + this.totalStep.toString();
    }
}