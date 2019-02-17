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

import { VariableDescription } from "./VariableDescription.js"

/**
 * Interface représentant une projection conforme.
 * @type type
 */
export class ConformalProjection  {
    /**
     * Constructeur générique
     * @returns {undefined}
     */
    constructor()
    {
    }
   
    /**
     * Sphere vers plan
     * @param {type} lat en degré
     * @param {lon} lon en degré
     * @returns {Number} [x, y]
     */
    latLonToXY(lat, lon)
    {
        return [lat, lon];
    }
    
    /**
     * Plan vers sphere
     * @param {type} x
     * @param {type} y 
     * @returns {Number} [lat, lon]
     */
    xyToLatLon(x, y)
    {
        return [x, y];
    }

    /**
     * Facteur d'échelle à la position demandée
     * @param {type} lat
     * @param {type} lon
     * @returns {Number}
     */
    scaleFactor(lat, lon)
    {
        return 1;
    }

    /**
     * Interpole une grille lat lon vers le domaine
     * @param {type} latLonParams paramètres de la grille lat/lon d'entrée
     * @param {type} data données d'entrée
     * @param {type} domain variable qui reçoit les données en sortie
     * @param {type} offsetx offset du point en 1/2 dx dans la cellule (0 ou 1)
     * @param {type} offsety offset du point en 1/2 dy dans la cellule (0 ou 1)
     * @param {type} scale indique si la variable doit être divisée par le facteur d'échelle (défaut false)
     * @param {type} fieldType indique le type de variable : s scalaire, u composante u vectorielle, v composante v vectorielle
     * @returns {undefined}
     */
    interpLatLonGridToDomain(latLonParams, data, domain, offsetx, offsety, scale=false, fieldType=VariableDescription.NUMBER_TYPE_SCALAR)
    {
        
    }
    
    /**
     * Interpole les données du domaine vers une grille latitudes longitudes.
     * @param {type} latLonParams paramètres de la grille lat/lon d'entrée
     * @param {type} data_in données d'entrée
     * @param {type} data_out variable qui reçoit les données en sortie
     * @param {type} offsetx offset du point en 1/2 dx dans la cellule (0 ou 1)
     * @param {type} offsety offset du point en 1/2 dy dans la cellule (0 ou 1)
     * @param {type} scale indique si la variable doit être divisée par le facteur d'échelle (défaut false)
     * @param {type} fieldType indique le type de variable : s scalaire, u composante u vectorielle, v composante v vectorielle
     * @returns {undefined}
     */
    interpDomainToLatLon(latLonParams, data_in, data_out, offsetx, offsety, scale=false, fieldType=VariableDescription.NUMBER_TYPE_SCALAR)
    {     

    }

    /**
     * Donne la taille de grille du domaine projeté
     * @returns {undefined} tableau [dx, dy]
     */
    getMeshSize()
    {
        return [0, 0];
    }
    
    /**
     * Calcule les latitudes des points de grille.
     * @param {type} xoffset
     * @param {type} yoffset
     * @returns {undefined}
     */
    calcLatitudesLongitudes(xoffset, yoffset, latitudes, longitudes)
    {
        
    }
    
    /**
     * Calcule le facteur d'échelle pour les points demandés
     * @param {type} latitudes
     * @param {type} longitudes
     * @param {type} m
     * @returns {undefined}
     */
    getScaleFactors(latitudes, longitudes, m)
    {
        for (var i=0;i<latitudes.length;i++)
            m[i] = this.scaleFactor(latitudes[i], longitudes[i]);
    }
}