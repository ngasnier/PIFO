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

export class SigmaHelper {
    /*
     * 
     */
    constructor()
    {
        this.nbSurfaces = 9;
        this.ptop = 100;
        this.pbottom = 100000;
        
        this.surfaces = [];
        this.layers = [];
        this.sigma = [];
    }
    
    calcSigma()
    {
        // Choix de surfaces régulièrement espacées sur un nombre souhaité de niveaux
        this.surfaces = [ this.ptop/this.pbottom];
        var lev = this.ptop/this.pbottom;
        for (var i=1;i<this.nbSurfaces;i++)
        {
            //lev += 1.0/nbsurfaces;
            lev += ((this.pbottom-this.ptop)/this.pbottom)/(this.nbSurfaces-1);
            this.surfaces.push(lev);
        }
        this.calcLevels(this.surfaces);
    }
    
    calcLevels(p_levels)
    {
        this.sigma = [];
        this.layers = [];
        this.sigma[0] = p_levels[0];
        for (var k=1;k<p_levels.length;k++)
        {
            this.sigma[k*2] = p_levels[k];

            // Calcul de sigma pour les couches significatives       
            var ptilde = 101500*p_levels[k];
            var ptilde_1 = 101500*p_levels[k-1];;
            var p = Math.exp(1/(ptilde-ptilde_1)
                        *(ptilde*Math.log(ptilde)-ptilde_1*Math.log(ptilde_1))-1);

            this.layers[k-1] = this.sigma[k*2-1] = p/101500;

        }
    }

    get surfacesLevels()
    {
        this.calcSigma();
        return this.surfaces;
    }

    get layersLevels()
    {
        this.calcSigma();
        return this.layers;
    }
    
    get sigmaLevels()
    {
        this.calcSigma();
        return this.sigma;
    }
}