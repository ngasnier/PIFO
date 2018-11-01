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

export var ConvectionScheme = function ()
{
    this.model = null;

    // CAPE
    this.CAPE = [];
    
    // CIN
    this.CIN = [];
    
    if( typeof ConvectionScheme.initialized == "undefined" ) 
    {

    }
}


ConvectionScheme.prototype.init = function(model)
{
    this.model = model;
    
    this.CIN = Variable.createVariable(1, this.model.width, this.model.height);
    this.CAPE = Variable.createVariable(1, this.model.width, this.model.height);
    
}

ConvectionScheme.prototype.step = function()
{
    var dwc2_2 = 0;
    var wc = 0;
    var size = this.model.qv[0].length;
    var a = 1, b = 1; // Valeurs à ajuster...
    var B = 0;
    var tn = 0;
    var theta_n = 0, theta_e = 0;
    var k_couche;
    var dz = 0;
    var m2 = 0;
    var epsilon = 0;
    var cape = 0, cin = 0;
    var Tvpar = 0, Tvenv = 0;
    var p_prec = 0, z_prec = 0;
    var qsat = 0, qv_p = 0;
    var e, r;
    var conv = false;
    for (var i=0;i<size;i++)
    {
        // Température initiale du nuage ramenée à la température de surface
        // et humidité du dernier niveau
        p_prec = this.model.ps[i];
        z_prec = this.model.sfcgeop[i]/Model.g;
        tn = this.model.T[this.model.nbcouches-1][i] * Math.pow(this.model.ps[i]/this.model.p[this.model.nbcouches*2][i], Model.R / Model.Cp);
        qv_p = this.model.qv[this.model.nbcouches-1][i];
        conv = false;

        if (i==4714) console.log(tn);
        wc = 0;
        cape = 0;
        cin = 0;
        for (var k=this.model.nbcouches-1;k>=0;k--)
        {
            m2 = this.model.m[i]*this.model.m[i];
            k_couche = this.model.couches[k];
            dz = this.model.phi[k][i]/Model.g - z_prec;

            qsat = Utility.qsat(this.model.p[k_couche][i], this.model.T[k][i]);
            // Suivre l'adiabatique saturée
            if (qv_p>qsat)
            {
                conv = true;
                qv_p = qsat; 
            }

            if (conv)
            {
                // Suivre l'adiabatique saturée
                tn -= Model.g * (287*tn*tn+2501000*qv_p)/(1003.5*287*tn*tn+2501000*2501000*qv_p*0.622)*dz;
            }
            else
            {  
                // Suivre l'adiabatique sèche
                tn = tn * Math.pow(this.model.p[k_couche][i]/p_prec, Model.R / Model.Cp);
            }

            theta_e = this.model.T[k][i]*Math.pow(100000/this.model.p[k_couche][i], 2.0/7.0);
            theta_n = tn*Math.pow(100000/this.model.p[k_couche][i], 2.0/7.0);
            k_couche = this.model.couches[k];
            B = Model.g*(theta_n-theta_e)/theta_e;
            epsilon = 0.1; // Heu bah là je sait pas trop...
            dwc2_2 =a*B - b*epsilon*wc*wc*dz;
            wc += dwc2_2;

            Tvpar = tn * (1+0.61*this.model.qv[k][i]);
            Tvenv = this.model.T[k][i] * (1+0.61*this.model.qv[k][i]);

            if (conv)
            {
                if (tn<this.model.T[k][i])
                {
                    // Calculer la CIN
                    cin += Model.g*(Tvpar-Tvenv)/Tvenv*dz;
                }
                else if (tn>this.model.T[k][i])
                {
                    // Calculer la CAPE et déclencher le schema
                    cape += Model.g*(Tvpar-Tvenv)/Tvenv*dz;
                }
                else
                {
                    // Niveau d'équilibre atteint
                    conv = false;
                }
            }

            if (i==4714) console.log("i="+i+" k="+k+" tn="+tn+" Te="+this.model.T[k][i]+" Tvpar"+Tvpar+" Tvenv="+Tvenv+" dz="+dz+" B="+B+" conv="+conv+" cape="+cape);

            p_prec = this.model.p[k_couche][i];
            z_prec = this.model.phi[k][i]/Model.g;
        }
        this.CIN[i] = cin;
        this.CAPE[i] = cape;
    }
}