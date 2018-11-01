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

import { Variable } from "./Variable.js";

export var Utility = function ()
{   

}

/**
 * Calcul de l'humidité spécifique saturante.
 */
Utility.qsat = function(p, t)
{
    // Formule de Clapeyron
    var e = 101325*Math.exp(2.47e6/(8.3144621/0.01801)*(1/373.15-1/t));
    return 0.622*e/(p-0.378*e);
}
