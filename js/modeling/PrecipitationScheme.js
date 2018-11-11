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
                var tmp = (t-Model.T00)/(2*11.82);
                return 1-Math.exp(-tmp*tmp);
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
            var prems = false;
            var dq = 0;
            var ri, ri_tmp;
            var rf, rf_tmp;
            var C_star, mevap;
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
                prems = true;
                for (k=0;k<this.model.nbcouches;k++)
                {
                    k_tilde = this.model.surfaces[k];
                    k_couche = this.model.couches[k];
                    k_tilde1 = this.model.surfaces[k+1];
                    this.model.Pl[k+1][i] = 0;
                    this.model.Pi[k+1][i] = 0;
                    qsat = Utility.qsat(this.model.p[k_couche][i], this.model.T[k][i]);
                    dq = qsat - this.model.qv[k][i];
                    P_tot_save = P_tot;
                     
                    // Saturation
                    if (this.model.qv[k][i]>=qsat)
                    {
                        // Ajout de flux de précipitations
                        P_tot = P_tot_save +(this.model.qv[k][i]-qsat)*(this.model.p[k_tilde1][i]-this.model.p[k_tilde][i])/(this.model.dt*Model.g);
                        
                        // Calcul de la proportion provitionnelle
                        if (this.model.T[k][i]<Model.T00)
                        {
                            ri_tmp = (ri*P_tot_save+P_tot-P_tot_save)/P_tot;
                            rf_tmp = (rf*P_tot_save+this.h(this.model.T[k][i])*(P_tot-P_tot_save))/P_tot;
                        }
                        else
                        {
                            ri_tmp = (ri*P_tot_save)/P_tot;
                            rf_tmp = (rf*P_tot_save)/P_tot;
                        }

                        // Effet de la fonte sur ri
                        if (prems)
                        {
                            if (this.model.T[k][i]<Model.T00)
                            {
                                ri = 1;
                                rf = this.h(this.model.T[k][i]);
                            }
                            else
                            {
                                ri = 0;
                                rf = 0;
                            }
                            prems = false;
                        }
                        else
                        {
                            // Le processus de fonte/gelage modifie ri
                            C_star = 2.4e4 * (1-rf_tmp)+2.4e4*80*rf_tmp;
                            mevap = C_star*((this.model.T[k][i]-Model.T00)/(0.5*(Math.sqrt(P_tot_save)+Math.sqrt(P_tot))))
                                *(1/this.model.p[k_tilde][i]-1/this.model.p[k_tilde1][i]);
                            ri = ri_tmp + mevap;
                            ri *= ri;
                            rf = rf_tmp + mevap;
                            rf *= rf;
                            
                            // On ne peut pas fondre ou geler plus que 100% 
                            if (ri>1) ri = 1;
                            if (ri<0) ri = 0;
                            if (rf>1) rf = 1;
                            if (rf<0) rf = 0;
                        }

                        // Flux de vapeur vers liquide/solide dépend de ce qui 
                        // est produit dans la couche
                        this.model.Pl_1[k][i] = (this.model.qv[k][i]-qsat)*(1-ri_tmp);
                        this.model.Pi_1[k][i] = (this.model.qv[k][i]-qsat)*ri_tmp;
                    }
                    else if (this.model.Pl[k+1][i]>0)
                    {
                        // Evaporation du mélange pluie/neige
                        C_star = 4.8e6*(1-rf_tmp)+4.8e6*80*rf_tmp;
                        mevap = C_star*(this.model.qv[k][i]-qsat)*(1/this.model.p[k_tilde][i]-1/this.model.p[k_tilde1][i]);
                        P_temp = Math.sqrt(P_tot_save) + mevap;
                        P_tot = P_temp*P_temp;
                        // Nb : ri et rf inchangés pendant l'évaporation
                        ri_tmp = ri;
                        rf_tmp = rf;
                        
                        // Flux de liquide/solide vers vapeur
                        this.model.Pl_3[k][i] = mevap*(1-rf_tmp);
                        this.model.Pi_3[k][i] = mevap*ri_tmp;
                        
                        // Reste a modifier proportion neige/eau comme ci-dessus
                        C_star = 2.4e4 * (1-rf_tmp)+2.4e4*80*rf_tmp;
                        mevap = C_star*((this.model.T[k][i]-Model.T00)/(0.5*(Math.sqrt(P_tot_save)+Math.sqrt(P_tot))))
                            *(1/this.model.p[k_tilde][i]-1/this.model.p[k_tilde1][i]);
                        ri = ri_tmp + mevap;
                        ri *= ri;
                        rf = rf_tmp + mevap;
                        rf *= rf;
                        
                        // On ne peut pas fondre ou geler plus que 100% 
                        if (ri>1) ri = 1;
                        if (ri<0) ri = 0;
                        if (rf>1) rf = 1;
                        if (rf<0) rf = 0;
                    }

                    // Flux final, élimine toute erreur en tronquant le négatif
                    if (P_tot<0.0) P_tot = 0.0;
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
