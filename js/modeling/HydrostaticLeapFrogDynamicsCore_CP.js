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
import { HydrostaticLeapFrogDynamicsCore } from './HydrostaticLeapFrogDynamicsCore.js';
/**
 * Coeur dynamique en différences centrales pour modèle hydrostatique.
 * Grille C, niveaux sigma, arrangement de Charney-Philips.
 * NB : problème de stabilité, ce module devra être revalidé qque chose ne va pas.
 * @returns {BaroclinicModel}
 */
export var HydrostaticLeapFrogDynamicsCore_CP = function ()
{
    HydrostaticLeapFrogDynamicsCore.call(this);
    
    // Méthodes privées du modèle
    if( typeof HydrostaticLeapFrogDynamicsCore_CP.initialized == "undefined" ) 
    {
        // ********************************************************************
        // COEUR DYNAMIQUE DU MODELE
        // ********************************************************************              
        HydrostaticLeapFrogDynamicsCore_CP.prototype.avanceExpliciteCentre = function()
        {                 
            Variable.a_bc(this.model.U_t, this.model.Su, 2.0*this.model.dt, this.X_tmp);
            Variable.a_bc(this.model.U_t, this.model.U, -2.0, this.model.U_t);
            Variable.sum(this.X_tmp, this.model.U_t, this.model.U_t);
            Variable.a_bc(this.model.U, this.model.U_t, 0.5, this.model.U_t);

            Variable.a_bc(this.model.V_t, this.model.Sv, 2.0*this.model.dt, this.X_tmp);
            Variable.a_bc(this.model.V_t, this.model.V, -2.0, this.model.V_t);
            Variable.sum(this.X_tmp, this.model.V_t, this.model.V_t);
            Variable.a_bc(this.model.V, this.model.V_t, 0.5, this.model.V_t);
            
            Variable.a_bc(this.model.T_t, this.model.St, 2.0*this.model.dt, this.T_tmp);
            Variable.a_bc(this.model.T_t, this.model.T, -2.0, this.model.T_t);
            Variable.sum(this.T_tmp, this.model.T_t, this.model.T_t);
            Variable.a_bc(this.model.T, this.model.T_t, 0.5, this.model.T_t);
            
            Variable.a_bc(this.model.qv_t, this.model.Sqv, 2.0*this.model.dt, this.X_tmp);
            Variable.a_bc(this.model.qv_t, this.model.qv, -2.0, this.model.qv_t);
            Variable.sum(this.X_tmp, this.model.qv_t, this.model.qv_t);
            Variable.a_bc(this.model.qv, this.model.qv_t, 0.5, this.model.qv_t);
            
            Variable.a_bc2d(this.model.Z_t, this.model.Sz, 2.0*this.model.dt, this.X2d_tmp);
            Variable.a_bc2d(this.model.Z_t, this.model.Z, -2.0, this.model.Z_t);
            Variable.sum(this.X2d_tmp, this.model.Z_t, this.model.Z_t);
            Variable.a_bc2d(this.model.Z, this.model.Z_t, 0.5, this.model.Z_t);
        }

        HydrostaticLeapFrogDynamicsCore_CP.prototype.calcSuCouche = function(k)
        {
            var xi = 0;
            var psvk = 0;
            var d_ktilde_1, d_ktilde_2, d_ktilde_moins_1_1, d_ktilde_moins_1_2;
            var u_k_plus_1, u_k, u_k_moins_1;
            var adv=0, rtz=0;
            var kphi=0;
            var i = this.model.width+1;
            var x, y;
            for (y=1;y<this.model.height-1;y++)
            {
                for (x=1;x<this.model.width-1;x++,i++)
                {
                    if (k<this.model.U.length-1)
                    {
                        d_ktilde_1 = this.model.sigmaf[k+1][i];
                        d_ktilde_2 = this.model.sigmaf[k+1][i+1];
                        u_k_plus_1 = this.model.U[k+1][i];
                    }
                    else
                    {
                        d_ktilde_1 = 0;
                        d_ktilde_2 = 0;
                        u_k_plus_1 = 0;
                    }

                    d_ktilde_moins_1_1 = this.model.sigmaf[k][i];
                    d_ktilde_moins_1_2 = this.model.sigmaf[k][i+1];

                    u_k = this.model.U[k][i];

                    if (k>0)
                    {
                        u_k_moins_1 = this.model.U[k-1][i];                        
                    }
                    else 
                    {
                        u_k_moins_1 = 0;
                    }                        

                    // Verif Ok 14/06/2018
                    xi = 0.5*(this.model.tourbillon[k][i]+this.model.tourbillon[k][i-this.model.width]); 

                    // Verif Ok 14/06/2018
                    psvk = (
                            (this.model.ps[i]+this.model.ps[i-this.model.width])*this.model.V[k][i-this.model.width]
                            +(this.model.ps[i+1]+this.model.ps[i+1-this.model.width])*this.model.V[k][i+1-this.model.width]
                            +(this.model.ps[i+1]+this.model.ps[i+1+this.model.width])*this.model.V[k][i+1]
                            +(this.model.ps[i]+this.model.ps[i+this.model.width])*this.model.V[k][i]
                        )/8; 

                    // Verif Ok 14/06/2018
                    adv = (1/((this.model.ps[i+1]+this.model.ps[i])*this.model.dsigma[k]))
                        *(
                           0.5*(d_ktilde_1+d_ktilde_2)*(u_k_plus_1-u_k)+0.5*(d_ktilde_moins_1_1+d_ktilde_moins_1_2)*(u_k-u_k_moins_1)
                         );

                    // Verif Ok 14/06/2018
                    kphi = (this.model.K[k][i+1]+this.model.phi[k][i+1]-this.model.K[k][i]-this.model.phi[k][i])/this.model.dx[y];

                    // Verif Ok 14/06/2018
                    rtz = Model.R*0.25*(this.model.T[k][i]+this.model.T[k][i+1]+this.model.T[k+1][i]+this.model.T[k+1][i+1])*(this.model.Z[i+1]-this.model.Z[i])/this.model.dx[y];

                    this.model.Su[k][i] = xi*psvk - adv - kphi - rtz;
                }
                i+=2;
            }
        }
               
        HydrostaticLeapFrogDynamicsCore_CP.prototype.calcSvCouche = function(k)
        {
            var xi = 0;
            var psuk = 0;
            var d_ktilde_1, d_ktilde_2, d_ktilde_moins_1_1, d_ktilde_moins_1_2;
            var v_k_plus_1, v_k, v_k_moins_1;
            var adv=0, rtz=0;
            var kphi=0;
            var i = this.model.width+1;
            var x, y;
            for (y=1;y<this.model.height-1;y++)
            {
                for(x=1;x<this.model.width-1;x++,i++)
                {
                    if (k<this.model.V.length-1)
                    {
                        d_ktilde_1 = this.model.sigmaf[k+1][i+this.model.width];
                        d_ktilde_2 = this.model.sigmaf[k+1][i];
                        v_k_plus_1 = this.model.V[k+1][i];
                    }
                    else
                    {
                        d_ktilde_1 = 0;
                        d_ktilde_2 = 0;
                        v_k_plus_1 = 0;
                    }

                    d_ktilde_moins_1_1 = this.model.sigmaf[k][i+this.model.width];
                    d_ktilde_moins_1_2 = this.model.sigmaf[k][i];

                    v_k = this.model.V[k][i];

                    if (k>0)
                    {
                        v_k_moins_1 = this.model.V[k-1][i];
                    }
                    else
                    {
                        v_k_moins_1 = 0;
                    }

                    // Verif Ok 14/06/2018
                    xi = 0.5*(this.model.tourbillon[k][i]+this.model.tourbillon[k][i-1]);

                    // Verif Ok 14/06/2018
                    psuk = (
                            (this.model.ps[i-1]+this.model.ps[i])*this.model.U[k][i-1]
                            +(this.model.ps[i]+this.model.ps[i+1])*this.model.U[k][i]
                            +(this.model.ps[i+this.model.width]+this.model.ps[i+this.model.width+1])*this.model.U[k][i+this.model.width]
                            +(this.model.ps[i-1+this.model.width]+this.model.ps[i+this.model.width])*this.model.U[k][i-1+this.model.width]
                        )/8;

                    // Verif Ok 14/06/2018
                    adv = (1/((this.model.ps[i]+this.model.ps[i+this.model.width])*this.model.dsigma[k]))*(
                           0.5*(d_ktilde_1+d_ktilde_2)*(v_k_plus_1-v_k)+0.5*(d_ktilde_moins_1_1+d_ktilde_moins_1_2)*(v_k-v_k_moins_1));

                    // Verif Ok 14/06/2018
                    kphi = (this.model.K[k][i]+this.model.phi[k][i]-this.model.K[k][i+this.model.width]-this.model.phi[k][i+this.model.width])/this.model.dy;

                    // Verif Ok 14/06/2018
                    rtz = Model.R*0.25*(this.model.T[k][i]+this.model.T[k][i+this.model.width]+this.model.T[k+1][i]+this.model.T[k+1][i+this.model.width])*(this.model.Z[i]-this.model.Z[i+this.model.width])/this.model.dy;
                    
                    this.model.Sv[k][i] = -xi*psuk - adv - kphi - rtz;                        
                }
                i+=2;
            }
        }
                       
        HydrostaticLeapFrogDynamicsCore_CP.prototype.calcStCouche = function(k)
        {
            var part1=0, part2=0, part3=0, adv=0;
            var d_ktilde, d_ktilde_moins_1;
            var t_k_plus_1, t_k, t_k_moins_1;
            var integ_dtlds=0;
            var c_chapo = 0;
            var cp = 0;
            var dcpt = 0;
            var k_1 = 0;
            var k_c = 0;

            var m2 = 0;
            var i= this.model.width+1;
            var x, y;
            for (y=1;y<this.model.height-1;y++)
            {
                for (x=1;x<this.model.width-1;x++,i++)
                {                       
                    m2 = this.model.m[i]*this.model.m[i];

                    // Verif Ok 14/06/2018
                    d_ktilde = this.model.sigmaf[k][i];

                    if (k<this.model.T.length-1)
                    {
                        t_k_plus_1 = this.model.T[k+1][i]; 
                        k_c = k;
                    }
                    else
                    {
                        // pas de dérivée donc pas d'advection en limite
                        t_k_plus_1 = this.model.T[k][i]; 
                        k_c = k-1;
                    }


                    if (k>0)
                    {
                        t_k_moins_1 = this.model.T[k-1][i];
                        integ_dtlds = this.model.DtildeDs[k-1][i];
                        k_1 = k-1;
                    }
                    else
                    {
                        t_k_moins_1 = this.model.T[k][i];
                        integ_dtlds = 0;
                        k_1 = k;
                    }

                    part1 = m2*(
                            ((this.model.ps[i+1]+this.model.ps[i])*0.5*(this.model.U[k_c][i]+this.model.U[k_1][i])*(this.model.T[k][i+1]-this.model.T[k][i])
                            +(this.model.ps[i]+this.model.ps[i-1])*0.5*(this.model.U[k_c][i-1]+this.model.U[k_1][i-1])*(this.model.T[k][i]-this.model.T[k][i-1]))/(4*this.model.dx[y])

                            +((this.model.ps[i-this.model.width]+this.model.ps[i])*0.5*(this.model.V[k_c][i-this.model.width]+this.model.V[k_1][i-this.model.width])*(this.model.T[k][i-this.model.width]-this.model.T[k][i])
                            +(this.model.ps[i]+this.model.ps[i+this.model.width])*0.5*(this.model.V[k_c][i]+this.model.V[k_1][i])*(this.model.T[k][i]-this.model.T[k][i+this.model.width]))/(4*this.model.dy)
                        )/this.model.ps[i];


                    if (k>0)
                    {
                        adv = (d_ktilde*(t_k_plus_1-t_k_moins_1)) / (this.model.ps[i]*2*this.model.dsigma[k-1]);

                        part2 = Model.R*this.model.T[k][i]*m2*(this.model.gamma[k-1]*integ_dtlds)
                                /(Model.Cp*this.model.ps[i]*this.model.dsigma[k-1]);
                    }
                    else
                    {
                        adv = 0;
                        part2 = 0 ;
                    }

                    part3 = Model.R*m2 *(
                            (
                                (this.model.ps[i]+this.model.ps[i+1])*0.5*(this.model.U[k_c][i]+this.model.U[k_1][i])*(this.model.T[k][i]+this.model.T[k][i+1])*(this.model.Z[i+1]-this.model.Z[i])
                                +(this.model.ps[i]+this.model.ps[i-1])*0.5*(this.model.U[k_c][i-1]+this.model.U[k_1][i-1])*(this.model.T[k][i]+this.model.T[k][i-1])*(this.model.Z[i]-this.model.Z[i-1])
                            )/(8*this.model.dx[y])
                        +
                            ( 
                                (this.model.ps[i]+this.model.ps[i-this.model.width])*0.5*(this.model.V[k_c][i-this.model.width]*this.model.V[k_1][i-this.model.width])*(this.model.T[k][i]+this.model.T[k][i-this.model.width])*(this.model.Z[i-this.model.width]-this.model.Z[i])
                                +(this.model.ps[i]+this.model.ps[i+this.model.width])*0.5*(this.model.V[k_c][i]*this.model.V[k_1][i])*(this.model.T[k][i]+this.model.T[k][i+this.model.width])*(this.model.Z[i]-this.model.Z[i+this.model.width])
                            )/(8*this.model.dy)

                        ) / (Model.Cp*this.model.ps[i]); 
                    this.model.St[k][i] = - part1 - adv  - part2 + part3 /* PLUIE + dcpt/cp*/;
                }
                i+=2;
            }
        }
        
        HydrostaticLeapFrogDynamicsCore_CP.prototype.calcSt = function()
        {
            var n = this.model.nbcouches+1;
            for (var k=0;k<n;k++)
            {
                this.calcStCouche(k);
            }
        }
    }
}

HydrostaticLeapFrogDynamicsCore_CP.prototype = Object.create(HydrostaticLeapFrogDynamicsCore.prototype);
HydrostaticLeapFrogDynamicsCore_CP.prototype.constructor = HydrostaticLeapFrogDynamicsCore_CP;


/**
 * Initialise le coeur dynamique
 * @returns {undefined}
 */
HydrostaticLeapFrogDynamicsCore_CP.prototype.init = function(model)
{
    this.model = model;
    
    if (this.model.gridType!="C")
    {
        throw "type de grille non supporté par ce coeur dynamique.";
    }
    
    if (this.model.verticalType!="CP")
    {
        throw "type de niveau non supporté par ce coeur dynamique.";
    }
    
    this.X_tmp = Variable.createVariable(this.model.nbcouches, this.model.width, this.model.height, true);
    this.T_tmp = Variable.createVariable(this.model.nbcouches+1, this.model.width, this.model.height, true);
    this.X2d_tmp = Variable.createVariable(1, this.model.width, this.model.height);
}

/**
 * Calcule une avancée du modèle du pas de temps dt.
 */
HydrostaticLeapFrogDynamicsCore_CP.prototype.step = function()
{
    this.calcSz();
    this.calcSu();
    this.calcSv();
    this.calcSt();
    this.calcTransports();   

    // *** Calcul des variables pronostiques ***
    if (this.time==0){
        this.avanceEuler();
    }
    else {
        this.avanceExpliciteCentre();
    }
}