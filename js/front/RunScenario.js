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
import { VariableDescription } from "../modeling/VariableDescription.js";

export var RunScenario = function ()
{
    Scenario.call(this);
    
    this.stopTime = 0;
    
    this.variableSource = null;
}

RunScenario.prototype = Object.create(Scenario.prototype);
RunScenario.prototype.constructor = RunScenario;

RunScenario.prototype.init = function()
{
    // Setup l'objet modele
    // TODO

    // Obtient les données de départ
    var descriptions = this.getModel().getVariables();
    descriptions.forEach(function (variable) {
        switch (variable.category)
        {
            case VariableDescription.CAT_HISTORIC,VariableDescription.CAT_PARAMETER:
                this.model.setVariable(variable.name, 
                    this.variableSource.getVariable(variable));
                break;
            default:
        }
    });
    
    this.getModel().init();
}

RunScenario.prototype.step = function()
{
    this.status = Scenario.STATE_END;
}

RunScenario.prototype.step = function()
{
    this.status = Scenario.STATE_END;
}