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

import { Model } from "../modeling/Model.js";

/**
 * Définition de base d'un scenario de run.
 * 
 * @returns {Scenario}
 */
export class Scenario {
    /**
     * 
     * @returns {undefined}
     */
    constructor()
    {
        this._model = null;
        this._status = Scenario.STATE_START;
        
        /** Gestionnaire d'évènement message. 
         * 
         * <p>Permet au scenario d'envoyer
         * un log ou un message de statut qui peut être affiché à l'écran
         * par l'UI ou tracé dans un fichier.</p> */
        this.onMessage = function(msg) {};
        
        /** Evènement appelé en début d'itération avant stepBegin. */
        this.onStepBegin = function () {};

        /** Evènement appelé en début d'itération après stepBegin, 
         * mais avant stepDo.*/
        this.onStepDo = function () {};
              
        /** Evènement appelé après stepDo, mais avant stepEnd.*/
        this.onStepDone = function () {};
        
        /** Evènement appelé en fin d'itération après tout le reste. */
        this.onStepEnd = function() {};
        
        /** Liste d'objets steps à appeler à chaque itération */
        this.steps = [];
    }

    /**
     * Démarre le scénario.
     * 
     * <p>Le scénario initialise ses objets et fait toutes ses opérations
     * et traitements d'entrée-sorties non bloquants.</p>
     * 
     * <p>Le scénario modifie son statut STATE_RUN ou STATE_END.</p>
     * 
     * @returns {undefined} promesse du scénario lui-même.
     */
    async start()
    {
        try
        {
            this.registerStepsMessages();
            await this.runStepsInit();
            return this;
        }
        catch (e)
        {
            throw e;
        }
    }
    
    /**
     * Termine le scenario.
     * 
     * <p>C'est le placeholder pour libérer les ressources.</p>
     * 
     * <p>Cette fonction peut être appelée de deux façon :</p>
     * <ul>
     *  <li>soit manuellement avant la fin d'un run</li>
     *  <li>soit automatiquement par step() si un changement de statut
     *  est détecté à la fin de l'itération.</li>
     * </ul>
     * @returns {undefined}
     */
    async finish()
    {
        try
        {
            await this.runStepsFinish();
            this._status = Scenario.STATE_END;
        }
        catch (e)
        {
            throw e;
        }
    }

    /**
     * Itération du scénario. 
     * 
     * <p>Les itérations peuvent être appelées tant que le scenario est en statut
     * STATE_RUN.</p>
     * @returns {Boolean}
     */
    async step()
    {
        if (this.status!=Scenario.STATE_RUN) throw "Modèle non initialisé";
       
        try
        {
            if (this.onStepBegin!=null) this.onStepBegin();
            await this.runStepsBegin();
            await this.stepBegin();

            if (this.onStepDo!=null) this.onStepDo();
            await this.runStepsDo();
            await this.stepDo();

            if (this.onStepDone!=null) this.onStepDone();

            await this.runStepsEnd();
            await this.stepEnd();
            if (this.onStepEnd!=null) this.onStepEnd();
            
            if (this.status!=Scenario.STATE_RUN) await this.finish();
            
            return this;
        }
        catch (e)
        {
            throw e
        }
    }
    
    /**
     * Opération effectuée au début de l'itération.
     * 
     * <p>Cette méthode est le placeholder permettant aux classes dérivées de 
     * réaliser les opérations d'initialisation avant le calcul proprement dit.</p>
     * 
     * <p>N'effectue rien par défaut.</p>
     * @returns {undefined}
     */
    async stepBegin()
    {
        try {
            return this;
        }
        catch (e)
        {
            throw e;
        }
    }
    
    /**
     * Opération de calcul de l'itération.
     * 
     * <p>C'est le calcul du modèle proprement dit.</p>
     * 
     * <p>N'effectue rien par défaut.</p>
     * @returns {undefined}
     */
    async stepDo()
    {
        try {
            return this;
        }
        catch (e)
        {
            throw e;
        }
    }
    
    /**
     * Opération effectue à la fin de l'itération.
     * 
     * <p>Cette méthode est le placeholder permettant aux classes dérivées de
     * faire leurs opérations de nettoyage ou d'historisation post-calcul.</p>
     * 
     * <p>N'effectue rien par défaut.</p>
     * @returns {undefined}
     */
    async stepEnd()
    {
        try {
            return this;
        }
        catch (e)
        {
            throw e;
        }
    }

    /**
     * Statut du scénario.
     * @returns {String|Scenario.STATE_START|Scenario.STATE_RUN|Scenario.STATE_END}
     */
    get status()
    {
        return this._status;
    }    

    /**
     * Modèle traité par le scénario.
     * @returns {@param;Scenario.set model:p_model}
     */
    get model()
    {
        return this._model;
    }

    /**
     * Modèle traité par le scénario.
     * @param {type} p_model
     * @returns {undefined}
     */
    set model(p_model)
    {
        this._model = p_model;
    }
    
    /**
     * Cette fonction permet d'envoyer un message à l'appelant
     * @param {type} msg
     * @returns {undefined}
     */
    sendMessage(msg)
    {
        if (this.onMessage!=null) this.onMessage(msg);
    }

    registerStepsMessages()
    {
        for (var i in this.steps)
        {
            this.steps[i].onMessage = this.onMessage;
        }
    }

    
    async runStepsInit()
    {
        try
        {
            for (var i in this.steps)
            {
                await this.steps[i].init();
            }
            return this;
        }
        catch (e)
        {
            throw e;
        }
    }
    
    async runStepsBegin()
    {
        try
        {
            for (var i in this.steps)
            {
                await this.steps[i].stepBegin(this.model);
            }
            return this;
        }
        catch (e)
        {
            throw e;
        }
    }
    
    async runStepsDo()
    {
        try
        {
            for (var i in this.steps)
            {
                await this.steps[i].stepDo(this.model);
            }
            return this;
        }
        catch (e)
        {
            throw e;
        }
    }
    
    async runStepsEnd()
    {
        try
        {
            for (var i in this.steps)
            {
                await this.steps[i].stepEnd(this.model);
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
     * @returns {Scenario}
     */
    async runStepsFinish()
    {
        try
        {
            for (var i in this.steps)
            {
                await this.steps[i].stepFinish();
            }
            return this;
        }
        catch (e)
        {
            throw e;
        }
    }
}

/**
 * Etat de départ non initialisé
 */
Scenario.STATE_START = "Start";

/**
 * Etat initialisé
 */
Scenario.STATE_RUN = "Run";

/**
 * Etat terminé
 */
Scenario.STATE_END = "End";

