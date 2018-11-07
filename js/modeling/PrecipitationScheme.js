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
        PrecipitationScheme.prototype.h = function(t)
        {
            if (t<Model.T00)
            {
                var tmp = (t-Model.T00)/10;
                return 1-Math.exp(-0.5*tmp*tmp);
            }
            else
            {
                return 0.0;
            }
        }
        
        PrecipitationScheme.prototype.calcPrecip = function()
        {
            var qsat;
            var nb = this.model.width*this.model.height;
            var k_tilde = 0;
            var k_couche = 0;
            var k_tilde1 = 0;
            var init = false;
            var ri, ri_tmp;
            var rf, rf_tmp;
            var C_star, melt;
            var P_temp = 0;
            var P_tot = 0, P_tot_save=0;
            var k = 0;
            for (var i=0;i<nb;i++)
            {
                P_tot = 0;
                ri = 0;
                ri_tmp = 0;
                rf = 0;
                rf_tmp = 0;
                init = true;
                for (k=0;k<this.model.nbcouches;k++)
                {
                    k_tilde = this.model.surfaces[k];
                    k_couche = this.model.couches[k];
                    k_tilde1 = this.model.surfaces[k+1];
                    this.model.Pl[k+1][i] = 0;
                    this.model.Pi[k+1][i] = 0;
                    qsat = Utility.qsat(this.model.p[k_couche][i], this.model.T[k][i]);
                    P_tot_save = P_tot;

                    // Saturation
                    if (this.model.qv[k][i]>qsat)
                    {
                        // Ajout de flux de précipitations
                        P_tot = P_tot_save +(this.model.qv[k][i]-qsat)*(this.model.p[k_tilde1][i]-this.model.p[k_tilde][i])/(this.model.dt*Model.g);
                        
                        /*if (this.model.T[k][i]<Model.T00)
                        {
                            ri_tmp = (ri*P_tot_save+P_tot-P_tot_save)/P_tot;
                            rf_tmp = (rf*P_tot_save+this.h(this.model.T[k][i])*(P_tot-P_tot_save))/P_tot;
                        }
                        else
                        {
                            ri_tmp = (ri*P_tot_save)/P_tot;
                            rf_tmp = (rf*P_tot_save)/P_tot;
                        }

                        if (init)
                        {
                            if (this.model.T[k][i]<Model.T00)
                            {
                                ri = 1;
                                rf = this.h(this.model.T[k][i]);
                            }
                            init = false;
                        }
                        else
                        {
                            C_star = 2.4e4 * (1-rf_tmp)+2.4e4*0.5*rf_tmp;
                            melt = C_star*((this.model.T[k][i]-Model.T00)/(0.5*(Math.sqrt(P_tot_save)+Math.sqrt(P_tot))))
                                *(1/this.model.p[k_tilde][i]-1/this.model.p[k_tilde1][i]);
                            ri = ri_tmp - melt;
                            rf = rf_tmp - melt;
//                            if (i==9+70*144) console.log(k, C_star, melt, rf_tmp, P_tot_save, P_tot, Math.sqrt(P_tot_save), Math.sqrt(P_tot));
                        }*/
                        this.model.Pl_1[k][i] = (this.model.qv[k][i]-qsat)*(1-ri_tmp);
                        this.model.Pi_1[k][i] = (this.model.qv[k][i]-qsat)*ri_tmp;
                    }
                    else if (this.model.Pl[k+1][i]>0)
                    {
                        C_star = 4.8e6*(1-rf_tmp)+4.8e6*0.5*rf_tmp;
                        P_temp = Math.sqrt(P_tot_save) 
                                + C_star*(this.model.qv[k][i]-qsat)
                                *(1/this.model.p[k_tilde][i]-1/this.model.p[k_tilde1][i]);
                        P_tot = P_temp*P_temp;
                        // Nb : ri et rf inchangés
                        ri_tmp = ri;
                        rf_tmp = rf;
                        this.model.Pl_3[k][i] = C_star*(this.model.qv[k][i]-qsat)*(1-ri_tmp);
                        this.model.Pi_3[k][i] = C_star*(this.model.qv[k][i]-qsat)*ri_tmp;
                    }
                    
                    
                    this.model.Pl[k+1][i] = (1-ri)*P_tot;
                    this.model.Pi[k+1][i] = ri*P_tot;
                }
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
    this.calcPrecip();
}
