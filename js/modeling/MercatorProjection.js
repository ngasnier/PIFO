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
     * Sphere vers plan
     * @param {type} lat
     * @returns {Number}
     */
    this.latLonToXY = function(lat, lon)
    {
        var phi = (lat*Math.PI/180);
        return [this.R*(lon*Math.PI/180), 
            -this.R*Math.log(Math.tan(Math.PI/4 -phi/2))];
    }
    
    /**
     * Plan vers sphere
     * @param {type} y
     * @returns {Number}
     */
    this.xyToLatLon = function(x, y)
    {
        return [(Math.PI/2-2*Math.atan(Math.exp(-y/this.R)))*180/Math.PI, 
            x/this.R*180/Math.PI];
    }

    /**
     * Facteur d'échelle à la position demandée
     * @param {type} lat
     * @returns {Number}
     */
    this.scaleFactor = function(lat, lon)
    {
        return 1/Math.cos(lat*Math.PI/180);
    }

    /**
     * Interpole une grille lat lon vers un domaine en mercator
     * @param {type} params
     * @param {type} data
     * @param {type} res
     * @returns {undefined}
     */
    this.interpLatLonGridToDomain = function(params, data, res, offsetx, offsety, scale, rotate)
    {
        /* params.inputGrid.minLat;
        params.inputGrid.maxLat;
        params.inputGrid.minLon;
        params.inputGrid.maxLon;
        params.inputGrid.dlat;
        params.inputGrid.dlon;
        
        params.domain.projection = "Mercator"
        params.domain.minLat;
        params.domain.maxLat;
        params.domain.minLon;
        params.domain.maxLon;
        params.domain.width;
        params.domain.height;*/
        
        var widthInput = (params.inputGrid.maxLon-params.inputGrid.minLon)/params.inputGrid.dlon;
        var heightInput = (params.inputGrid.maxLat-params.inputGrid.minLat)/params.inputGrid.dlat;
                
        var lon = this.wlon;

        var ymin = this.latLonToXY(params.inputGrid.minlat, 0)[1];
        var ymax = this.latLonToXY(params.inputGrid.maxlat, 0)[1];
        var dy = (ymax-ymin)/(params.domain.height);

        var lat_in, lon_in;
        var x_in1, y_in1;
        var x_in2, y_in2;
        var alpha_x, alpha_y;
        var v1, v2, v3, v4;
        var vv1, vv2;
        var i = 0;
        var y = 0;
        if (this.global) i++;

        for (y=ymax-0.5*offsety*dy;y>ymin;y-=dy)
        {
            lat_in = this.xyToLatLon(0, y)[0];
            if (lat_in<-90 || lat_in>90) throw "latitude overflow "+lat_in;

            y_in1 = Math.floor((lat_in+90)/this.dlatInput);
            y_in2 = y_in1+1;
            if (y_in2>=heightInput) throw "latitude overflow "+lat_in+" resulte en index interp "+y_in2;
            alpha_y = ((lat_in+90)/this.dlatInput - y_in1)/(y_in2-y_in1);

            for (lon=this.wlon;lon<this.elon;lon+=this.dlon)
            {
                lon_in = lon+this.dlon*0.5*offsetx;
                if (lon_in<0) lon_in += 360;
                if (lon_in>=360) lon_in -= 360;

                x_in1 = Math.floor(lon_in/this.dlonInput);
                x_in2 = x_in1+1;
                if (x_in2>widthInput) x_in2 -= this.widthInput;
                alpha_x = (lon_in/this.dlonInput - x_in1)/(x_in2-x_in1);

                v1 = data[x_in1+widthInput*y_in1];
                v2 = data[x_in1+widthInput*y_in2];
                v3 = data[x_in2+widthInput*y_in1];
                v4 = data[x_in2+widthInput*y_in2];

                vv1 = alpha_y*v2 + (1-alpha_y)*v1;
                vv2 = alpha_y*v4 + (1-alpha_y)*v3;

                res[i] = alpha_x*vv2 + (1-alpha_x)*vv1 ;

                if (scale)
                {
                    res[i] = res[i]/this.scaleFactor(lon_in, this.xyToLatLon(0, y+0.5*offsety*dy)[0]);
                }

                i++;
            }
            if (this.global) i+=2;
        }
    }
       
    // @todo : éliminer ces fonctions, revoir méthode de définition du domaine
    
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
}

