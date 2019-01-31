/* 
 * Copyright (C) 2019 nicolas
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

export var VariableDescription = function ()
{
    this.category = "";
    this.name = "";
    this.description = "";
    this.units = "";
    this.verticalPosition = VariableDescription.VERTICAL_POSITION_LAYER;
    this.levels = [];
    this.number = VariableDescription.NUMBER_TYPE_SCALAR;
    this.offsetx = 0;
    this.offsety = 0;
    this.scale = false;
}

VariableDescription.CAT_PRONOSTIC = "Pronostic";
VariableDescription.CAT_DIAGNOSTIC = "Diagnostic";
VariableDescription.CAT_PARAMETER = "Parameter";
VariableDescription.CAT_INTERNAL = "Internal";

// Variable décrivant des données sur une seule surface
VariableDescription.VERTICAL_POSITION_SURFACE = "SURFACE";

// Variable décrivant des données à une surface intercouche
VariableDescription.VERTICAL_POSITION_INTERLAYER = "INTERLAYER";

// Variable décrivant des données à l'intérieur d'une couche.
VariableDescription.VERTICAL_POSITION_LAYER = "LAYER";

// Représente un scalaire
VariableDescription.NUMBER_TYPE_SCALAR = "s";

// Représente la composante u d'un vecteur
VariableDescription.NUMBER_TYPE_U_VECTOR = "u";

// Représente la composante v d'un vecteur
VariableDescription.NUMBER_TYPE_V_VECTOR = "v";
