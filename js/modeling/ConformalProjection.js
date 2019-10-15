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
import { Grid } from "./Grid.js"
import { Variable } from "./Variable.js"

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
        this.xmin = 0;
        this.xmax = 0;
        this.ymin = 0;
        this.ymax = 0;
        this.cyclic = false;
        this.regrid = "bilinear";
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
     * @returns {Number} toujours 1 par défaut
     */
    scaleFactor(lat, lon)
    {
        return 1;
    }
    
    /**
     * Déclinaison des vecteurs 
     * @param {type} lat
     * @param {type} lon
     * @returns {Number} toujours zero par défaut
     */
    declination(lat, lon)
    {
        return 0;
    }

    /**
     * Interpole une grille lat lon vers le domaine
     * @param {LatLonDomain} latLonParams paramètres de la grille lat/lon d'entrée
     * @param {array} data données d'entrée
     * @param {array} domain variable qui reçoit les données en sortie
     * @param {integer} offsetx offset du point en 1/2 dx dans la cellule (0 ou 1)
     * @param {integer} offsety offset du point en 1/2 dy dans la cellule (0 ou 1)
     * @param {boolean} scale indique si la variable doit être divisée par 
     * le facteur d'échelle (défaut false)
     * @param {string} fieldType indique le type de variable : s scalaire, 
     * u composante u vectorielle, v composante v vectorielle
     * @param {array} data2 seconde composante du vecteur pour calculer la 
     * déclinaison. Si fieldType=u alors doit correspondre à v, et inversement.
     * Supposée positionnée au même point.
     * @returns {undefined}
     */
    interpLatLonGridToDomain(latLonParams, data, output, offsetx, offsety, scale=false, fieldType=VariableDescription.NUMBER_TYPE_SCALAR, data2=null)
    {
        var lons = latLonParams.getLongitudes(0, 0);
        var lats = latLonParams.getLatitudes(0, 0);
       
        var lats_out = [];
        var lons_out = [];
        this.calcLatitudesLongitudes(offsetx, offsety, lats_out, lons_out);
        
        var grid = new Grid();
        if (this.regrid=="bicubic")
            grid.bicubicRegrid(lons, lats, data, latLonParams.cyclic, lons_out, lats_out, output);
        else
            grid.bilinearRegrid(lons, lats, data, latLonParams.cyclic, lons_out, lats_out, output);
        
        
        var data2_regrid = [];
        var scale_factor = 1;
        if (data2!=null)
        {
            if (this.regrid=="bicubic")
                grid.bicubicRegrid(lons, lats, data2, latLonParams.cyclic, lons_out, lats_out, data2_regrid);
            else
                grid.bilinearRegrid(lons, lats, data2, latLonParams.cyclic, lons_out, lats_out, data2_regrid);            
        }
        if (scale)
        {
            var lats_scale = [], lons_scale = [];
            this.calcLatitudesLongitudes(0, 0, lats_scale, lons_scale);
            for (var i=0;i<output.length;i++)
            {
                scale_factor = this.scaleFactor(lats_scale[i], lons_scale[i]);
                output[i] = output[i]/scale_factor;
                if (data2!=null)
                {
                    data2_regrid[i] = data2_regrid[i]/scale_factor;
                }
            }
        }
        
        if (data2!=null)
        {
            var declinations = this.getDeclinations(lats_out, lons_out);
            switch (fieldType)
            {
                case VariableDescription.NUMBER_TYPE_U_VECTOR:
                    for (var i=0;i<output.length;i++)
                    {
                        output[i] = output[i]*Math.cos(declinations[i])+data2_regrid[i]*Math.sin(declinations[i]);
                    }
                    break;
                case VariableDescription.NUMBER_TYPE_V_VECTOR:
                    for (var i=0;i<output.length;i++)
                    {
                        output[i] = -data2_regrid[i]*Math.sin(declinations[i])+output[i]*Math.cos(declinations[i]);
                    }
                    break;
            }
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
     * @param {type} data2 la seconde composante du vecteur (u ou v) pour le 
     * calcul de la déclinaison. Supposée positionnée au même point.
     * @returns {undefined}
     */
    interpDomainToLatLon(latLonParams, data_in, data_out, offsetx, offsety, scale=false, fieldType=VariableDescription.NUMBER_TYPE_SCALAR, data2=null, offsetx2=0, offsety2=0)
    {
        var grid = new Grid();

        var x_coords = this.getXCoords(offsetx, offsety);
        var y_coords = this.getYCoords(offsetx, offsety);
    
        var lats_out = [];
        var lons_out = [];
        latLonParams.calcLatitudesLongitudes(0, 0, lats_out, lons_out);
        
        var x_out = [];
        var y_out = [];
        for (var i=0;i<lats_out.length;i++)
        {
            [x_out[i], y_out[i]] = this.latLonToXY(lats_out[i], lons_out[i]);
        }
        
        // Ne pas modifier les variables d'origine
        var input = Variable.clone(data_in);
        var data2_in = (data2!=null?Variable.clone(data2):null);
        
        // Scale avant de regrid, plus simple à faire dans la grille d'origine
        var scale_factor = 1;
        if (scale)
        {
            var lats_scale = [], lons_scale = [];
            this.calcLatitudesLongitudes(0, 0, lats_scale, lons_scale);
            for (var i=0;i<input.length;i++)
            {
                scale_factor = this.scaleFactor(lats_scale[i], lons_scale[i]);
                input[i] = input[i]*scale_factor;
                if (data2!=null)
                {
                    data2_in[i] = data2_in[i]*scale_factor;
                }
            }
        }       

        // Annule la déclinaison dans la grille d'origine
        if (data2!=null)
        {
            if (offsetx2!=offsetx && offsety2!=offsety)
            {
                var lats2 = [], lons2 = [];
                this.calcLatitudesLongitudes(offsetx2, offsety2, lats2, lons2);
                var x_coords2 = this.getXCoords(offsetx2, offsety2);
                var y_coords2 = this.getYCoords(offsetx2, offsety2);
                for (var i=0;i<lats_out.length;i++)
                {
                    [x_coords2[i], y_coords2[i]] = this.latLonToXY(lats2[i], lons2[i]);
                }
                var data2_out = [];
                if (this.regrid=="bicubic")
                    grid.bicubicRegrid(x_coords2, y_coords2, data2_in, this.cyclic, x_coords2, y_coords2, data2_out);
                else
                    grid.bilinearRegrid(x_coords2, y_coords2, data2_in, this.cyclic, x_coords2, y_coords2, data2_out);
                data2_in = data2_out;
            }

            var lats = [], lons = [];
            this.calcLatitudesLongitudes(offsetx, offsety, lats, lons);
            
            var declinations = this.getDeclinations(lats, lons);
            switch (fieldType)
            {
                case VariableDescription.NUMBER_TYPE_U_VECTOR:
                    for (var i=0;i<input.length;i++)
                    {
                        input[i] = input[i]*Math.cos(-declinations[i])+data2_in[i]*Math.sin(-declinations[i]);
                    }
                    break;
                case VariableDescription.NUMBER_TYPE_V_VECTOR:
                    for (var i=0;i<input.length;i++)
                    {
                        input[i] = -data2_in[i]*Math.sin(-declinations[i])+input[i]*Math.cos(-declinations[i]);
                    }
                    break;
            }
        }
    
        // On peut maintenant regrid le champ        
        if (this.regrid=="bicubic")
            grid.bicubicRegrid(x_coords, y_coords, input, this.cyclic, x_out, y_out, data_out);
        else
            grid.bilinearRegrid(x_coords, y_coords, input, this.cyclic, x_out, y_out, data_out);
    }

    /**
     * Donne la taille de grille du domaine projeté
     * @returns {undefined} tableau [dx, dy]
     */
    getMeshSize()
    {
        return [(this.xmax-this.xmin)/this.width, (this.ymax-this.ymin)/this.height];
    }
    
    /**
     * Calcule les points du domaine en coordonnées naturelles.
     * @param {type} offsetx
     * @param {type} offsety
     * @param {type} lats_out
     * @param {type} lons_out
     * @returns {undefined}
     */
    calcLatitudesLongitudes(xoffset, yoffset, latitudes, longitudes)
    {
        var a = [this.xmin, this.ymin];
        var b = [this.xmax, this.ymax];
        var [dx, dy] = this.getMeshSize();

        var yplan = b[1]-dy*yoffset*0.5;
        var xplan = a[0];
        var i = 0, j=0;
        var lat, lon;
        for (j=0;j<this.height;j++)
        {
            xplan = a[0]+dx*xoffset*0.5;
            for(i=0;i<this.width;i++)
            {
                [lat, lon] = this.xyToLatLon(xplan, yplan);
                latitudes.set2(i,j,lat);
                longitudes.set2(i,j,lon);
                xplan += dx;
            }
            yplan -= dy;
        }        
    }
    
    getXCoords(offsetx, offsety)
    {
        var [dx, dy] = this.getMeshSize();
        var xcoords = [];
        var x = this.xmin+0.5*offsetx*dx;
        for (var i=0;i<this.width;i++)
        {
            xcoords[i] = x;
            x+=dx;
        }
        return xcoords;
    }
    
    getYCoords(offsetx, offsety)
    {
        var [dx, dy] = this.getMeshSize();
        var ycoords = [];
        var y = this.ymax-0.5*offsety*dy;
        for (var i=0;i<this.height;i++)
        {
            ycoords[i] = y;
            y-=dy;
        }     
        return ycoords;
    }
    
    /**
     * Calcule le facteur d'échelle pour les points demandés
     * @param {type} latitudes
     * @param {type} longitudes
     * @param {type} m
     * @returns {undefined}
     */
    getScaleFactors(latitudes, longitudes, m=null)
    {
        var m_out = m;
        if (m_out==null) m_out=[];
        for (var i=0;i<latitudes.length;i++)
            m_out[i] = this.scaleFactor(latitudes[i], longitudes[i]);
        return m_out;
    }
    
    /**
     * 
     * @param {type} latitudes
     * @param {type} longitudes
     * @param {type} rot
     * @returns {undefined}
     */
    getDeclinations(latitudes, longitudes, dec=null)
    {
        var dec_out = dec;
        if (dec_out==null) dec_out=[];
        for (var i=0;i<latitudes.length;i++)
            dec_out[i] = this.declination(latitudes[i], longitudes[i]);
        return dec_out;
    }
}