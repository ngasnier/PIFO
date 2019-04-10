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

import { ConformalProjection } from "./ConformalProjection.js"
import { VariableDescription } from "./VariableDescription.js"

/**
 * Utilitaire pour convertir les coordonnées du plan Mercator vers sphère 
 * en degré et inversement.
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
    interpLatLonGridToDomain(latLonParams, data_in, data_out, offsetx, offsety, scale=false, fieldType=VariableDescription.NUMBER_TYPE_SCALAR)
    {       
        var widthInput = (latLonParams.maxLon-latLonParams.minLon)/latLonParams.dlon+1;
        var heightInput = (latLonParams.maxLat-latLonParams.minLat)/latLonParams.dlat+1;
                
        var lon = this.minLon;
        var dlon = (this.maxLon-this.minLon)/this.width;

        var [xmin, ymin] = this.latLonToXY(this.minLat, this.minLon);
        var [xmax, ymax] = this.latLonToXY(this.maxLat, this.maxLon);
        var dx = (xmax-xmin)/(this.width);
        var dy = (ymax-ymin)/(this.height);

        var lat_in, lon_in;
        var x_in1, y_in1;
        var x_in2, y_in2;
        var xscale, yscale;
        var latscale, lonscale;
        var alpha_x, alpha_y;
        var v1, v2, v3, v4;
        var vv1, vv2;
        var i = 0;
        var y = 0;
        if (this.global) i++;

        for (y=ymax-0.5*offsety*dy, yscale=ymax ; y>ymin ; y-=dy, yscale-=dy)
        {
            lat_in = this.xyToLatLon(0, y)[0];
            if (lat_in<-90 || lat_in>90) throw "latitude overflow "+lat_in;


            y_in1 = Math.floor((lat_in+90)/latLonParams.dlat);
            y_in2 = y_in1+1;
            if (y_in2>=heightInput) throw "latitude overflow "+lat_in+" resulte en index interp "+y_in2;
            alpha_y = ((lat_in+90)/latLonParams.dlat - y_in1)/(y_in2-y_in1);

            for (lon=this.minLon, xscale=xmin;lon<this.maxLon;lon+=dlon, xscale+=dx)
            {
                lon_in = lon+dlon*0.5*offsetx;
                if (lon_in<0) lon_in += 360;
                if (lon_in>=360) lon_in -= 360;

                x_in1 = Math.floor(lon_in/latLonParams.dlon);
                x_in2 = x_in1+1;
                if (x_in2>widthInput) x_in2 -= widthInput;
                alpha_x = (lon_in/latLonParams.dlon - x_in1)/(x_in2-x_in1);

                v1 = data_in[x_in1+widthInput*y_in1];
                v2 = data_in[x_in1+widthInput*y_in2];
                v3 = data_in[x_in2+widthInput*y_in1];
                v4 = data_in[x_in2+widthInput*y_in2];

                vv1 = alpha_y*v2 + (1-alpha_y)*v1;
                vv2 = alpha_y*v4 + (1-alpha_y)*v3;

                data_out[i] = alpha_x*vv2 + (1-alpha_x)*vv1 ;

                if (scale)
                {
                    [latscale, lonscale] = this.xyToLatLon(xscale, yscale);
                    data_out[i] = data_out[i]/this.scaleFactor(latscale, lonscale);
                }

                i++;
            }
            if (this.global) i+=2;
        }
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
        var lon = latLonParams.minLon;
        var lat = latLonParams.maxLat;        

        var [xmin, ymin] = this.latLonToXY(latLonParams.minLat, latLonParams.minLon);
        var [xmax, ymax] = this.latLonToXY(latLonParams.maxLat, latLonParams.maxLon);
        var [dx, dy] = this.getMeshSize();
        
        var y_in=0, x_in = 0;

        var x_in1, y_in1;
        var x_in2, y_in2;
        var alpha_x, alpha_y;
        var v1, v2, v3, v4;
        var vv1, vv2;
        var i = 0;
        
        for (lat=latLonParams.maxLat;lat>latLonParams.minLat;lat-=latLonParams.dlat)
        {
            y_in = this.latLonToXY(lat, lon)[1];

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

            for (lon=latLonParams.minLon;lon<latLonParams.maxLon;lon+=latLonParams.dlon)
            {
                x_in = this.latLonToXY(lat, lon)[0];
                /*if (lon_in<0) lon_in += 360;
                if (lon_in>=360) lon_in -= 360;*/

                x_in1 = Math.floor((x_in-xmin)/dx);
                x_in2 = x_in1+1;
                if (x_in1<0) x_in1 = 0;
                if (x_in2<0) x_in2 = 0;
                if (x_in1>=this.width) x_in1 = this.width-1;
                if (x_in2>=this.width) x_in2 = this.width-1;
                if (x_in1!==x_in2) 
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

                // Ce code sert surtout à stopper d'urgence un calcul de modèle qui part en vrille
                // TODO : c'est pas le meilleur endroit pour mettre un tel contrôle
                if(isNaN(data_out[i]))
                {
                    throw "instabilité détectée en "+i;
                }
                
                if (scale)
                {
                    // TODO : scaling sur le point de ref de la maille du domaine
                    data_out[i] = data_out[i]*this.scaleFactor(lat, lon);
                }

                i++;
            }
        }
    }

    /**
     * Donne la taille de grille du domaine projeté
     * @returns {undefined} tableau [dx, dy]
     */
    getMeshSize()
    {
        var a = this.latLonToXY(this.minLat, this.minLon);
        var b = this.latLonToXY(this.maxLat, this.maxLon);
        return [(b[0]-a[0])/this.width, (b[1]-a[1])/this.height];
    }
    
    /**
     * Calcule les latitudes des points de grille.
     * @param {type} xoffset
     * @param {type} yoffset
     * @returns {undefined}
     */
    calcLatitudesLongitudes(xoffset, yoffset, latitudes, longitudes)
    {
        var a = this.latLonToXY(this.minLat, this.minLon);
        var b = this.latLonToXY(this.maxLat, this.maxLon);
        var [dx, dy] = this.getMeshSize();
        var yplan = b[1]-dy*yoffset*0.5;
        var xplan = a[0];
        var i = 0;
        var lat, lon;
        for (var y=0;y<this.height;y++)
        {
            xplan = a[0]+dx*xoffset*0.5;
            for(var x=0;x<this.width;x++,i++)
            {
                [lat, lon] = this.xyToLatLon(xplan, yplan);
                latitudes[i] = lat;
                longitudes[i] = lon;
                xplan += dx;
            }
            yplan -= dy;
        }        
    }
}