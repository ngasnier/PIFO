/* 
Copyright (C) 2018 Nicolas GASNIER (http://www.meteo-blois.fr/contact/)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

import { Model } from "./Model.js";
import { MercatorProjection } from "./MercatorProjection.js";

/**
 * Extraction et interpolation horizontale d'un domaine global vers le domaine
 * du modèle. 
 * 
 * @returns {undefined}
 */
export var WGRIBInterpolator = function()
{
    this.projection = null;
     
    // Type de grille
    this.gridType = Model.GRID_A;
    
    // Résolution d'entrée en degrés
    this.dlatInput = 0.5;
    
    // Résolution d'entrée en degrés
    this.dlonInput = 0.5;
    
    // Largeur de la grille d'entrée
    this.widthInput = 720;
    
    // Hauteur de la grille d'entrée
    this.heightInput = 361;
    
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

/**
 * Interpole les données brutes texte dans f.
 * 
 * @param {type} f
 * @param {type} data
 * @param {type} offsetx
 * @param {type} offsety
 * @returns {undefined}
 */
WGRIBInterpolator.prototype.interp = function(f, data, offsetx, offsety, scale=false)
{     
    var lines = data.split('\n');
    lines.shift();
    
    var lon = this.wlon;
  
    var ymin = this.projection.latToY(this.slat);
    var ymax = this.projection.latToY(this.nlat);
    var dy = (ymax-ymin)/(this.height);

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
        lat_in = this.projection.yToLat(y);
        if (lat_in<-90 || lat_in>90) throw "latitude overflow "+lat_in;
        
        y_in1 = Math.floor((lat_in+90)/this.dlatInput);
        y_in2 = y_in1+1;
        if (y_in2>=this.heightInput) throw "latitude overflow "+lat_in+" resulte en index interp "+y_in2;
        alpha_y = ((lat_in+90)/this.dlatInput - y_in1)/(y_in2-y_in1);
        
        for (lon=this.wlon;lon<this.elon;lon+=this.dlon)
        {
            lon_in = lon+this.dlon*0.5*offsetx;
            if (lon_in<0) lon_in += 360;
            if (lon_in>=360) lon_in -= 360;
            
            x_in1 = Math.floor(lon_in/this.dlonInput);
            x_in2 = x_in1+1;
            if (x_in2>this.widthInput) x_in2 -= this.widthInput;
            alpha_x = (lon_in/this.dlonInput - x_in1)/(x_in2-x_in1);
            
            v1 = Number(lines[x_in1+this.widthInput*y_in1]);
            v2 = Number(lines[x_in1+this.widthInput*y_in2]);
            v3 = Number(lines[x_in2+this.widthInput*y_in1]);
            v4 = Number(lines[x_in2+this.widthInput*y_in2]);
            
            vv1 = alpha_y*v2 + (1-alpha_y)*v1;
            vv2 = alpha_y*v4 + (1-alpha_y)*v3;
            
            f[i] = alpha_x*vv2 + (1-alpha_x)*vv1 ;
            
            if (scale)
            {
                f[i] = f[i]/this.projection.scaleFactor(this.projection.yToLat(y+0.5*offsety*dy), lon_in);
            }

            i++;
        }
        if (this.global) i+=2;
    }
}
