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

/**
 * Coeur dynamique en différences centrales pour modèle hydrostatique.
 * Grille C, niveaux sigma, arrangement de Lorentz.
 *          
 * @returns {BaroclinicModel}
 */
export var DynamicsCore = function ()
{
    this.model = null;
}


DynamicsCore.prototype.init = function(model)
{
    throw "coeur dynamique non initialisé.";
}

DynamicsCore.prototype.step = function()
{
    throw "coeur dynamique non initialisé.";
}