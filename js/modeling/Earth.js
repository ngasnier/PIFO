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
 * Calculs d'ordre géographiques ou astronomiques sur la terre.
 * 
 * @type type
 */
export class Earth
{
    constructor()
    {
        this.radius = Earth.RADIUS;
    }
    
    /**
     * Calcule le facteur de coriolis aux latitudes demandées.
     * 
     * @param {type} latitudes
     * @param {type} f
     * @returns {undefined}
     */
    getCoriolisFactors(latitudes, f)
    {
        for (var i=0;i<latitudes.data.length;i++)
        {
            f.data[i] = 2 * Earth.OMEGA * Math.sin(latitudes.data[i]*Math.PI/180);
        }
    }
}

//** Vitesse angulaire de la terre (rad.s^-1)
Earth.OMEGA = 7.292115e-5;

//** Rayon de la terre
Earth.RADIUS = 6371000;
