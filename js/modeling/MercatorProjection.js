/* 
 * Copyright (C) 2018 nicolas
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
 * Utilitaire pour convertir les coordonnées du plan Mercator vers sphère 
 * en degré et inversement.
 * 
 * On considère que l'orgine est centrée sur (landa, phi) = (0, 0)
 * 
 * @param r le rayon de la sphère
 * @returns {MercatorProjection}
 */
export var MercatorProjection = function(r)
{   
    this.R = r;
    
    /**
     * Latitude vers plan
     * @param {type} lat
     * @returns {Number}
     */
    this.latToY = function(lat)
    {
        var phi = (lat*Math.PI/180);
        return -this.R*Math.log(Math.tan(Math.PI/4 -phi/2));
    }
    
    /**
     * Plan vers latitude
     * @param {type} y
     * @returns {Number}
     */
    this.yToLat = function(y)
    {
        return (Math.PI/2-2*Math.atan(Math.exp(-y/this.R)))*180/Math.PI;
    }

    /**
     * Longitude vers plan
     * @param {type} lon
     * @returns {Number}
     */
    this.lonToX = function(lon)
    {
        return this.R*(lon*Math.PI/180);
    }
    
    /**
     * Plan vers longitude
     * @param {type} x
     * @returns {Number}
     */
    this.xToLon = function(x)
    {
        return x/this.R*180/Math.PI;
    }
    
    /**
     * Facteur d'échelle à la position demandée
     * @param {type} lat
     * @returns {Number}
     */
    this.scaleFactor = function(lambda, phi)
    {
        return 1/Math.cos(phi*Math.PI/180);
    }
}

