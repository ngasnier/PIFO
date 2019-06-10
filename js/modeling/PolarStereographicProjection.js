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

import { ConformalProjection } from "./ConformalProjection.js";
import { VariableDescription } from "./VariableDescription.js";

/**
 * Projection conforme stéréographique polaire
 * @type type
 */
export class PolarStereographicProjection extends ConformalProjection
{
    /**
     * 
     * @returns {undefined}
     */
    constructor()
    {
        super();
        this.R = 6371000;
        this.planeLatitude = 90;
    }
    
    /**
     * Latitude du plan de projection.
     * @param {type} lat0
     * @returns {undefined}
     */
    set planeLatitude(lat0)
    {
        this.phi0 = lat0*Math.PI/180;
        this.L = this.R*(1+Math.sin(this.phi0));
    }
    
    /**
     * Latitude du plan de projection.
     * @returns {Number}
     */
    get planeLatitude()
    {
        return this.phi0*180/Math.PI;
    }
    
    /**
     * Sphere vers plan
     * @param {type} lat
     * @returns {Number}
     */
    latLonToXY(lat, lon)
    {
        var lambda = (lon*Math.PI/180);
        var phi = (lat*Math.PI/180);
        var theta = Math.PI/2-phi;
        var rho = this.L*Math.tan(theta/2);
        return [ rho*Math.cos(lambda), rho*Math.sin(lambda)];
    }
    
    /**
     * Plan vers sphere
     * @param {type} y
     * @returns {Number}
     */
    xyToLatLon(x, y)
    {
        var rho = Math.sqrt(x*x + y*y);        
        var lambda = y>=0 ? Math.acos(x/rho) : 2*Math.PI-Math.acos(x/rho);
        var phi = Math.asin((this.L*this.L-rho*rho)/(this.L*this.L+rho*rho));
        return [phi*180/Math.PI, lambda*180/Math.PI];
    }

    /**
     * Facteur d'échelle à la position demandée
     * @param {type} lat
     * @param {type} lon
     * @returns {Number}
     */
    scaleFactor(lat, lon)
    {
        return (1+Math.sin(this.phi0))/(1+Math.sin(lat*Math.PI/180));
    }
    
    /**
     * Déclinaison des vecteurs 
     * @param {type} lat
     * @param {type} lon
     * @returns {Number} déclinaison en radian
     */
    declination(lat, lon)
    {
        return -(Math.PI/2 + lon*Math.PI/180);
    }    
}