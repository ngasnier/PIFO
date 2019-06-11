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

import { ConformalProjection } from "./ConformalProjection.js";
import { VariableDescription } from "./VariableDescription.js";

import { Variable } from "./Variable.js";
import { Matrix } from "../math/Matrix.js";

/**
 * Projection de grille de type Mercator.
 * 
 * On considère que l'orgine est centrée sur (lambda, phi) = (0, 0)
 * 
 * @returns {MercatorProjection}
 */
export class MercatorProjection extends ConformalProjection {
    /**
     * Constructeur.
     * @param {type} r Rayon de la sphere de projection en mètre
     * @returns {undefined}
     */
    constructor()
    {   
        super();
        this.R = 6371000;
    }
    
    get minLon()
    {
        return this._minLon;
    }
    
    set minLon(min)
    {
        this._minLon = min;
        [this.xmin, this.ymin] = this.latLonToXY(this._minLat, this._minLon);
    }
    
    get maxLon()
    {
        return this._maxLon;
    }
    
    set maxLon(max)
    {
        this._maxLon = max;
        [this.xmax, this.ymax] = this.latLonToXY(this._maxLat, this._maxLon);
    }
        
    get minLat()
    {
        return this._minLat;
    }
    
    set minLat(min)
    {
        this._minLat = min;
        [this.xmin, this.ymin] = this.latLonToXY(this._minLat, this._minLon);
    }
    
    get maxLat()
    {
        return this._maxLat;
    }
    
    set maxLat(max)
    {
        this._maxLat = max;
        [this.xmax, this.ymax] = this.latLonToXY(this._maxLat, this._maxLon);
    }
    
    /**
     * Sphere vers plan
     * @param {type} lat en degré
     * @param {lon} lon en degré
     * @returns {Number}
     */
    latLonToXY(lat, lon)
    {
        var phi = (lat*Math.PI/180);
        return [this.R*(lon*Math.PI/180), 
            -this.R*Math.log(Math.tan(Math.PI/4 - phi/2))];
    }
    
    /**
     * Plan vers sphere
     * @param {type} x
     * @param {type} y
     * @returns {Number}
     */
    xyToLatLon(x, y)
    {
        return [(Math.PI/2-2*Math.atan(Math.exp(-y/this.R)))*180/Math.PI, 
            x/this.R*180/Math.PI];
    }

    /**
     * Facteur d'échelle à la position demandée
     * @param {type} lat
     * @param {type} lon
     * @returns {Number}
     */
    scaleFactor(lat, lon)
    {
        return 1/Math.cos(lat*Math.PI/180);
    }
}