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

/**
 * Grille en coordonnées sphériques naturelles.
 * @type type
 */
export class LatLonDomain {
    constructor()
    {
        this.minLat=0;
        this.maxLat=0;
        this.minLon=0;
        this.maxLon=0;
        this.dlat=0;
        this.dlon=0;
        this.cyclic=false;
    }
    
    get width()
    {
        return Math.floor((this.maxLon-this.minLon)/this.dlon);        
    }
    
    get height()
    {
        return Math.floor((this.maxLat-this.minLat)/this.dlat);
    }
    
    calcLatitudesLongitudes(xoffset, yoffset, latitudes, longitudes)
    {
        var lat = this.maxLat-yoffset*0.5*this.dlat;
        var lon;
        var i = 0;
        var w = this.width;
        var h = this.height;
        for (var y=0;y<h;y++)
        {
            lon = this.minLon+xoffset*0.5*this.dlon;
            for (var x=0;x<w;x++,i++)
            {
                latitudes[i] = lat;
                longitudes[i] = lon;
                lon+=this.dlon;
            }
            lat -= this.dlat;
        }
    }
    
    getLatitudes(xoffset, yoffset)
    {
        //var lat = this.maxLat-yoffset*0.5*this.dlat;
        var lat = this.minLat+yoffset*0.5*this.dlat;
        var lon;
        var i = 0;
        var w = this.width;
        var h = this.height;
        var latitudes = [];
        for (var y=0;y<=h;y++)
        {
            latitudes[y] = lat;
            lat += this.dlat;
        }
        return latitudes;
    }
    
    getLongitudes(xoffset, yoffset)
    {
        var lon = this.minLon+xoffset*0.5*this.dlon;;
        var i = 0;
        var w = this.width;
        var h = this.height;
        var longitudes = [];
        for (var x=0;x<=w;x++,i++)
        {
            longitudes[x] = lon;
            lon+=this.dlon;
        }
        return longitudes;
    }    
}