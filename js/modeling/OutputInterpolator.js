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

import { Model } from "./Model.js";
import { MercatorProjection } from "./MercatorProjection.js";

/**
 * Extraction et interpolation horizontale du modèle vers une grille lat/lon.
 * 
 * @returns {undefined}
 */
export var OutputInterpolator = function()
{
    this.projection = 1;
     
    // Type de grille
    this.gridType = Model.GRID_A;
       
    // Type d'interpolation horizontale pour la grille C
    // 1 = prendre le point de grille selon l'offset
    // 2 = prendre la moyenne des deux points 
    this.interpolationType = 1;
    
    // Indique qu'on travaille en grille globale
    this.global = false;
     
    // Pas de grille en degré dans la direction des latitudes.
    this.dlat = 10;
    
    // Pas de grille en degré dans la direction des longitudes.
    this.dlon = 10;
    
    // Largeur de grille du domaine
    this.width=36;    
    
    // Hauteur de grille du domaine
    this.height=36;

    // Latitude du coin haut gauche du domaine.
    this.nlat = 90;
    
    // Latitude du coin bas droite du domaine.
    this.slat = -80;
    
    // Latitude du coin haut gauche du domaine
    this.wlon = 0;
    
    // Longitude du coin bas droite du domaine
    this.elon = 350;    
}


OutputInterpolator.prototype.interp = function(data_in, data_out)
{     
    var lon = this.wlon;
    var lat = this.nlat;
    var projection = new MercatorProjection(Model.Rterre);
   
    var ymin = projection.latToY(this.slat);
    var ymax = projection.latToY(this.nlat);
    var xmin = projection.lonToX(this.wlon);
    var xmax = projection.lonToX(this.elon);
    var dx = (xmax-xmin)/(this.width);
    var dy = (ymax-ymin)/(this.height);
    var y_in=0, x_in = 0;

    var x_in1, y_in1;
    var x_in2, y_in2;
    var alpha_x, alpha_y;
    var v1, v2, v3, v4;
    var vv1, vv2;
    var i = 0;
    
    for (lat=this.nlat;lat>this.slat;lat-=this.dlat)
    {
        y_in = projection.latToY(lat);
        
        y_in1 = Math.floor((ymax-y_in)/dy);
        y_in2 = y_in1+1;
        if (y_in1<0) y_in1 = 0;
        if (y_in2<0) y_in2 = 0;
        if (y_in1>=this.height) y_in1 = this.height-1;
        if (y_in2>=this.height) y_in2 = this.height-1;
        //if (y_in2>=this.heightInput) throw "latitude overflow "+lat_in+" resulte en index interp "+y_in2;
        if (y_in1!=y_in2) 
            alpha_y = ((ymax-y_in)/dy - y_in1)/(y_in2-y_in1);
        else
            alpha_y = 1;
        
        for (lon=this.wlon;lon<this.elon;lon+=this.dlon)
        {
            x_in = projection.lonToX(lon);
            /*if (lon_in<0) lon_in += 360;
            if (lon_in>=360) lon_in -= 360;*/
            
            x_in1 = Math.floor((x_in-xmin)/dx);
            x_in2 = x_in1+1;
            if (x_in1<0) x_in1 = 0;
            if (x_in2<0) x_in2 = 0;
            if (x_in1>=this.width) x_in1 = this.width-1;
            if (x_in2>=this.width) x_in2 = this.width-1;
            if (x_in1!=x_in2) 
                alpha_x = ((x_in-xmin)/dx - x_in1)/(x_in2-x_in1);
            else
                alpha_x = 1;
            
            v1 = data_in[x_in1+this.width*y_in1];
            v2 = data_in[x_in1+this.width*y_in2];
            v3 = data_in[x_in2+this.width*y_in1];
            v4 = data_in[x_in2+this.width*y_in2];
            
            vv1 = alpha_y*v2 + (1-alpha_y)*v1;
            vv2 = alpha_y*v4 + (1-alpha_y)*v3;
            
            data_out[i] = alpha_x*vv2 + (1-alpha_x)*vv1 ;
            
            if(isNaN(data_out[i]))
            {
                console.log([x_in1, x_in2, y_in1, y_in2, x_in, y_in, lat, lon, alpha_x, alpha_y, xmin, ymin, xmax, ymax]);
                throw "instabilité détectée";
            }

            i++;
        }
    }
}
