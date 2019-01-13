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

export var PolarStereographicProjection = function(r, phi0)
{   
    this.R = r;
    this.phi0 = phi0*Math.PI/180;
    this.L = this.R*(1+Math.sin(this.phi0));
    
    /**
     * Sphere vers plan
     * @param {type} lat
     * @returns {Number}
     */
    this.latLonToXY = function(lat, lon)
    {
        var lambda = (lon*Math.PI/180);
        var phi = (lat*Math.PI/180);
        var theta = Math.PI/2-phi;
        var rho = this.L*Math.tan(theta);
        return [ rho*Math.cos(lambda), rho*Math.sin(lambda)];
    }
    
    /**
     * Plan vers sphere
     * @param {type} y
     * @returns {Number}
     */
    this.xyToLatLon = function(x, y)
    {
        var rho = Math.sqrt(x*x, y*y);
        var lambda = y>=0 ? Math.acos(x/rho) : 2*Math.PI-Math.acos(x/rho);
        var theta = 2*Math.atan(rho/this.L);
        var phi = Math.PI/2-theta;
        
        return [phi*180/Math.PI, lambda*180/Math.PI];
    }

    /**
     * Facteur d'échelle à la position demandée
     * @param {type} lat
     * @param {type} lon
     * @returns {Number}
     */
    this.scaleFactor = function(lat, lon)
    {
        return (1+Math.sin(this.phi0))/(1+Math.sin(lat*Math.PI/180));
    }
    
    /**
     * Interpole un domaine global lat lon vers le domaine limité du plan 
     * de projection
     * @param {type} params
     * @returns {undefined}
     */
    this.interpLatLonGridToDomain = function(params, data, res)
    {
        /*params.minLat;
        params.maxLat;
        params.minLon;
        params.maxLon;
        params.width;
        params.height;*/
        
        // Vent : rotation lambda par rapport à l'origine 
        /*uprime = u*cos(theta)-v*sin(theta)
        vprime = u*sin(theta)+v*cos(theta)*/
    }
}

