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
 * @returns {Scenario}
 */
export var Scenario = function()
{
    this.model = new Model();
    
    if (typeof Scenario.initialized == "undefined") 
    {
        this.status = Scenario.STATE_START;
    }
}

/**
 * Etat de départ non initialisé
 */
Scenario.STATE_START = "Start";

/**
 * Etat initialisé
 */
Scenario.STATE_READY = "Ready";

/**
 * Etat terminé
 */
Scenario.STATE_END = "End";


Scenario.prototype.init = function()
{
    this.model.init();
    this.status = Scenario.STATE_READY;
}

Scenario.prototype.step = function()
{
    if (this.getStatus()!=Scenario.STATE_READY) throw "Modèle non initialisé";
    this.model.step();
}

Scenario.prototype.getStatus = function()
{
    return this.status;
}

Scenario.prototype.getModel = function()
{
    return this.model;
}

Scenario.prototype.setModel = function(p_model)
{
    return this.model = p_model;
}
