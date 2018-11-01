/* 
 * Copyright (C) 2018 Nicolas GASNIER (http://www.meteo-blois.fr/contact/)
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

import { Model } from './Model.js';
import { Variable } from './Variable.js';
import { Utility } from './Utility.js';

export var PrecipitationScheme = function ()
{
    this.model = null;
    
    if( typeof PrecipitationScheme.initialized == "undefined" ) 
    {
        PrecipitationScheme.prototype.calcPrecipCouche = function(k)
        {
            var qsat;
            var k_tilde = this.model.surfaces[k];
            var k_couche = this.model.couches[k];
            var k_tilde1 = this.model.surfaces[k+1];
            var P_temp = 0;
            for (var i=0;i<this.model.Pl[k].length;i++)
            {
                qsat = Utility.qsat(this.model.p[k_couche][i], this.model.T[k][i]);
                this.model.Pl[k+1][i] = 0;
                if (this.model.qv[k][i]>qsat)
                {
                    // Ajout de flux de précipitations
                    this.model.Pl_3[k][i] = qsat-this.model.qv[k][i];
                    this.model.Pl[k+1][i] = this.model.Pl[k][i] // Flux couche supérieure
                            // Moins le pseudo-flux (attention au signe)
                            -(this.model.Pl_3[k][i])*(this.model.p[k_tilde][i]-this.model.p[k_tilde1][i])/(this.model.dt*Model.g);
                }
                else
                {
                    // Evaporation....
                    if (this.model.Pl[k+1][i]>0)
                    {
                        this.model.Pl_3[k][i] = 4.8e6*(qsat-this.model.qv[k][i]);
                        P_temp = Math.sqrt(this.model.Pl[k][i]) 
                                - (this.model.Pl_3[k][i])
                                *(1/this.model.p[k_tilde][i]-1/this.model.p[k_tilde1][i]);
                        this.model.Pl[k+1][i] = P_temp*P_temp;
                    }
                }
                if (k==7 && i==(22+61*this.model.width)) console.log(this.model.p[k_couche][i], this.model.T[k][i], qsat, this.model.qv[k][i], this.model.Pl_3[k][i], this.model.Pl[k+1][i]);
            }
        }
    }
}

PrecipitationScheme.prototype.init = function(model)
{
    this.model = model;
}

PrecipitationScheme.prototype.step = function()
{
    // Nb : le flux de précip sera toujours 0 au sommet.
    var nb = this.model.nbcouches;
    for (var k=0;k<nb;k++)
    {
        this.calcPrecipCouche(k);
    }
}
