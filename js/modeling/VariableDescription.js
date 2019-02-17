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

/**
 * Méta-description d'une variable.
 * @type type
 */
export class VariableDescription {
    /**
     * 
     * @returns {undefined}
     */
    constructor()
    {
        /** @var */
        this.category = "";
        /** @var */
        this.name = "";
        /** @var */
        this.description = "";
        /** @var */
        this.units = "";
        /** @var */
        this.verticalPosition = VariableDescription.VERTICAL_POSITION_LAYER;
        /** @var */
        this.levels = [];
        /** @var */
        this.number = VariableDescription.NUMBER_TYPE_SCALAR;
        /** @var */
        this.offsetx = 0;
        /** @var */
        this.offsety = 0;
        /** @var */
        this.scale = false;
    }
}

/** @constant */
VariableDescription.CAT_PRONOSTIC = "Pronostic";
/** @constant */
VariableDescription.CAT_DIAGNOSTIC = "Diagnostic";
/** @constant */
VariableDescription.CAT_PARAMETER = "Parameter";
/** @constant */
VariableDescription.CAT_INTERNAL = "Internal";

/** Variable décrivant des données sur une seule surface @constant */
VariableDescription.VERTICAL_POSITION_SURFACE = "SURFACE";
/** Variable décrivant des données à une surface intercouche @constant */
VariableDescription.VERTICAL_POSITION_INTERLAYER = "INTERLAYER";
/** Variable décrivant des données à l'intérieur d'une couche. @constant */
VariableDescription.VERTICAL_POSITION_LAYER = "LAYER";

/** Représente un scalaire @constant */
VariableDescription.NUMBER_TYPE_SCALAR = "s";
/** Représente la composante u d'un vecteur @constant */
VariableDescription.NUMBER_TYPE_U_VECTOR = "u";
/** Représente la composante v d'un vecteur @constant */
VariableDescription.NUMBER_TYPE_V_VECTOR = "v";
