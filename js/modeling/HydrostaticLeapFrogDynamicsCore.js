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
import { DynamicsCore } from './DynamicsCore.js';


/**
 * Coeur dynamique en différences centrales pour modèle hydrostatique.
 * Grille C, niveaux sigma, arrangement de Lorentz.
 *          
 * @returns {BaroclinicModel}
 */
export var HydrostaticLeapFrogDynamicsCore = function ()
{
    DynamicsCore.call(this);
    
    // Variables temporaires pour le filtrage temporel
    this.X_tmp = [];
    this.X2d_tmp = [];
    
    this.dampFactor = 1000000.0;
    
    // Méthodes privées du modèle
    if( typeof HydrostaticLeapFrogDynamicsCore.initialized == "undefined" ) 
    {
        // ********************************************************************
        // COEUR DYNAMIQUE DU MODELE
        // ********************************************************************
        
        HydrostaticLeapFrogDynamicsCore.prototype.avanceEuler = function()
        {       
            Variable.a_bc(this.model.U, this.model.Su, this.model.dt, this.model.U_t);
            this.model.couple(this.model.U_t, this.model.U_couplage);
            Variable.a_bc(this.model.V, this.model.Sv, this.model.dt, this.model.V_t);
            this.model.couple(this.model.V_t, this.model.V_couplage);
            Variable.a_bc(this.model.T, this.model.St, this.model.dt, this.model.T_t);
            this.model.couple(this.model.T_t, this.model.T_couplage);
            Variable.a_bc(this.model.qv, this.model.Sqv, this.model.dt, this.model.qv_t);
            this.model.couple(this.model.qv_t, this.model.qv_couplage);
            Variable.a_bc2d(this.model.Z, this.model.Sz, this.model.dt, this.model.Z_t);
            this.model.couple2D(this.model.Z_t, this.model.Z_couplage);
        }
        
        HydrostaticLeapFrogDynamicsCore.prototype.avanceFiltreAsselin = function(X_t, X, Sx, X_tmp, epsilon, X_couplage)
        {
            Variable.a_bc(X_t, X, -2, X_tmp);                 // X_t-2X
            Variable.a_bc(X, X_tmp, epsilon, X);              // X~=X+epsilon(X_t-2X)
            Variable.a_bc(X_t, Sx, 2.0*this.model.dt, X_t);   // X+
            this.model.couple(X_t, X_couplage);               // X+ doit être couplé
            Variable.a_bc(X, X_t, epsilon, X);                // X=X~+epsilon(X+)
        }

        HydrostaticLeapFrogDynamicsCore.prototype.avanceExpliciteCentre = function()
        {                 
            /*Variable.a_bc(this.model.U_t, this.model.Su, 2.0*this.model.dt, this.model.U_t);
            this.model.couple(this.model.U_t, this.model.U_couplage);

            Variable.a_bc(this.model.V_t, this.model.Sv, 2.0*this.model.dt, this.model.V_t);
            this.model.couple(this.model.V_t, this.model.V_couplage);
            
            Variable.a_bc(this.model.T_t, this.model.St, 2.0*this.model.dt, this.model.T_t);
            this.model.couple(this.model.T_t, this.model.T_couplage);
            
            Variable.a_bc(this.model.qv_t, this.model.Sqv, 2.0*this.model.dt, this.model.qv_t);
            this.model.couple(this.model.qv_t, this.model.qv_couplage);

            Variable.a_bc2d(this.model.Z_t, this.model.Sz, 2.0*this.model.dt, this.model.Z_t);
            this.model.couple2D(this.model.Z_t, this.model.Z_couplage);*/
            
            var asselinFactor = 0.005;

            this.avanceFiltreAsselin(this.model.U_t, this.model.U, this.model.Su, this.X_tmp, asselinFactor, this.model.U_couplage);
            this.avanceFiltreAsselin(this.model.V_t, this.model.V, this.model.Sv, this.X_tmp, asselinFactor, this.model.V_couplage);
            this.avanceFiltreAsselin(this.model.T_t, this.model.T, this.model.St, this.X_tmp, asselinFactor, this.model.T_couplage);
            this.avanceFiltreAsselin(this.model.qv_t, this.model.qv, this.model.Sqv, this.X_tmp, asselinFactor, this.model.qv_couplage);
            this.avanceFiltreAsselin(this.model.Z_t, this.model.Z, this.model.Sz, this.X2d_tmp, asselinFactor, this.model.Z_couplage);

/*            Variable.a_bc(this.model.U_t, this.model.Su, 2.0*this.model.dt, this.X_tmp);// X(t+dt)
            this.model.couple(this.X_tmp, this.model.U_couplage);
            Variable.a_bc(this.model.U_t, this.model.U, -2.0, this.model.U_t);          // X(t-dt)-2X(t)
            Variable.sum(this.X_tmp, this.model.U_t, this.model.U_t);                   // X(t+dt)+(X(t-dt)-2X(t))
            Variable.a_bc(this.model.U, this.model.U_t, 0.5, this.model.U);             // X(t) + gamma*[X(t+dt)+(X(t-dt)-2X(t))]            
            Variable.copy(this.X_tmp, this.model.U_t);                                  // Restaure le X(t+dt) non filtré

            Variable.a_bc(this.model.V_t, this.model.Sv, 2.0*this.model.dt, this.X_tmp);
            this.model.couple(this.X_tmp, this.model.V_couplage);
            Variable.a_bc(this.model.V_t, this.model.V, -2.0, this.model.V_t);
            Variable.sum(this.X_tmp, this.model.V_t, this.model.V_t);
            Variable.a_bc(this.model.V, this.model.V_t, 0.5, this.model.V);
            Variable.copy(this.X_tmp, this.model.V_t);
            
            Variable.a_bc(this.model.T_t, this.model.St, 2.0*this.model.dt, this.X_tmp);
            this.model.couple(this.X_tmp, this.model.T_couplage);
            Variable.a_bc(this.model.T_t, this.model.T, -2.0, this.model.T_t);
            Variable.sum(this.X_tmp, this.model.T_t, this.model.T_t);
            Variable.a_bc(this.model.T, this.model.T_t, 0.5, this.model.T);
            Variable.copy(this.X_tmp, this.model.T_t);
            
            Variable.a_bc(this.model.qv_t, this.model.Sqv, 2.0*this.model.dt, this.X_tmp);
            this.model.couple(this.X_tmp, this.model.qv_couplage);
            Variable.a_bc(this.model.qv_t, this.model.qv, -2.0, this.model.qv_t);
            Variable.sum(this.X_tmp, this.model.qv_t, this.model.qv_t);
            Variable.a_bc(this.model.qv, this.model.qv_t, 0.5, this.model.qv);
            Variable.copy(this.X_tmp, this.model.qv_t);

            Variable.a_bc2d(this.model.Z_t, this.model.Sz, 2.0*this.model.dt, this.X2d_tmp);
            this.model.couple2D(this.X2d_tmp, this.model.Z_couplage);
            Variable.a_bc2d(this.model.Z_t, this.model.Z, -2.0, this.model.Z_t);
            Variable.sum(this.X2d_tmp, this.model.Z_t, this.model.Z_t);
            Variable.a_bc2d(this.model.Z, this.model.Z_t, 0.5, this.model.Z);
            Variable.copy(this.X2d_tmp, this.model.Z_t);*/
        }
              
              
        HydrostaticLeapFrogDynamicsCore.prototype.calcSuCouche = function(k)
        {
            var xi = 0;
            var psvk = 0;
            var d_ktilde_1, d_ktilde_2, d_ktilde_moins_1_1, d_ktilde_moins_1_2;
            var u_k_plus_1, u_k, u_k_moins_1;
            var adv=0, rtz=0;
            var kphi=0;
            var damp=0;
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
                    kphi = (this.model.K[k][i+1]+this.model.phi[k][i+1]-this.model.K[k][i]-this.model.phi[k][i])/this.model.dx;

                    // Verif Ok 14/06/2018
                    rtz = Model.R*0.5*(this.model.T[k][i]+this.model.T[k][i+1])*(this.model.Z[i+1]-this.model.Z[i])/this.model.dx;
                    
                    // Divergence damping
                    damp = -this.dampFactor*(this.model.Divergence[k][i+1]-this.model.Divergence[k][i])/this.model.dx;

                    this.model.Su[k][i] = xi*psvk - adv - kphi - rtz - damp;
                }
                i+=2;
            }
        }
               
        HydrostaticLeapFrogDynamicsCore.prototype.calcSu = function()
        {
            var n = this.model.nbcouches;
            for (var k=0;k<n;k++)
            {
                this.calcSuCouche(k);
            }
        }
               
        HydrostaticLeapFrogDynamicsCore.prototype.calcSvCouche = function(k)
        {
            var xi = 0;
            var psuk = 0;
            var d_ktilde_1, d_ktilde_2, d_ktilde_moins_1_1, d_ktilde_moins_1_2;
            var v_k_plus_1, v_k, v_k_moins_1;
            var adv=0, rtz=0;
            var kphi=0;
            var damp=0;
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
                    rtz = Model.R*0.5*(this.model.T[k][i]+this.model.T[k][i+this.model.width])*(this.model.Z[i]-this.model.Z[i+this.model.width])/this.model.dy;

                    damp = -this.dampFactor*(this.model.Divergence[k][i+this.model.width]-this.model.Divergence[k][i+this.model.width])/this.model.dy;

                    this.model.Sv[k][i] = -xi*psuk - adv - kphi - rtz - damp;
                }
                i+=2;
            }
        }
        
        HydrostaticLeapFrogDynamicsCore.prototype.calcSv = function()
        {
            var n = this.model.nbcouches;
            for (var k=0;k<n;k++)
            {
                this.calcSvCouche(k);
            }            
        }
               
        HydrostaticLeapFrogDynamicsCore.prototype.calcStCouche = function(k)
        {
            var part1=0, part2=0, part3=0, adv=0;
            var d_ktilde, d_ktilde_moins_1;
            var t_k_plus_1, t_k, t_k_moins_1;
            var integ_dtlds=0;

            var m2 = 0;
            var i= this.model.width+1;
            var x, y;
            for (y=1;y<this.model.height-1;y++)
            {
                for (x=1;x<this.model.width-1;x++,i++)
                {                       
                    m2 = this.model.m[i]*this.model.m[i];

                    if (k<this.model.T.length-1)
                    {
                        d_ktilde = this.model.sigmaf[k+1][i];
                        t_k_plus_1 = this.model.T[k+1][i]; 
                    }
                    else
                    {
                        d_ktilde = 0;
                        t_k_plus_1 = 0;
                    }

                    d_ktilde_moins_1 = this.model.sigmaf[k][i];
                    t_k = this.model.T[k][i];


                    if (k>0)
                    {
                        t_k_moins_1 = this.model.T[k-1][i];
                        integ_dtlds = this.model.DtildeDs[k-1][i];
                    }
                    else
                    {
                        t_k_moins_1 = 0;
                        integ_dtlds = 0;
                    }

                    part1 = m2*(
                            ((this.model.ps[i+1]+this.model.ps[i])*this.model.U[k][i]*(this.model.T[k][i+1]-this.model.T[k][i])
                            +(this.model.ps[i]+this.model.ps[i-1])*this.model.U[k][i-1]*(this.model.T[k][i]-this.model.T[k][i-1]))/(4*this.model.dx)

                            +((this.model.ps[i-this.model.width]+this.model.ps[i])*this.model.V[k][i-this.model.width]*(this.model.T[k][i-this.model.width]-this.model.T[k][i])
                            +(this.model.ps[i]+this.model.ps[i+this.model.width])*this.model.V[k][i]*(this.model.T[k][i]-this.model.T[k][i+this.model.width]))/(4*this.model.dy)
                        )/this.model.ps[i];

                    // Verif Ok 14/06/2018
                    // TODO : y'a une coquille dans ce terme, c'est lui qui cause l'instabilité
                    adv = (d_ktilde*(t_k_plus_1-t_k)+d_ktilde_moins_1*(t_k-t_k_moins_1)) / (this.model.ps[i]*2*this.model.dsigma[k]);

                    // Verif Ok 15/06/2018
                    part2 = Model.R*this.model.T[k][i]*m2
                                *(this.model.gamma[k]*integ_dtlds+this.model.alpha[k]*this.model.Dtilde[k][i]*this.model.dsigma[k])
                            /(this.model.Cph[k][i]*this.model.ps[i]*this.model.dsigma[k]); // Model.Cp

                    // Verif Ok 15/06/2018
                    part3 = Model.R*m2 *(
                            (
                                (this.model.ps[i]+this.model.ps[i+1])*this.model.U[k][i]*(this.model.T[k][i]+this.model.T[k][i+1])*(this.model.Z[i+1]-this.model.Z[i])
                                +(this.model.ps[i]+this.model.ps[i-1])*this.model.U[k][i-1]*(this.model.T[k][i]+this.model.T[k][i-1])*(this.model.Z[i]-this.model.Z[i-1])                                    
                            )/(8*this.model.dx)
                        +
                            ( 
                                (this.model.ps[i]+this.model.ps[i-this.model.width])*this.model.V[k][i-this.model.width]*(this.model.T[k][i]+this.model.T[k][i-this.model.width])*(this.model.Z[i-this.model.width]-this.model.Z[i])
                                +(this.model.ps[i]+this.model.ps[i+this.model.width])*this.model.V[k][i]*(this.model.T[k][i]+this.model.T[k][i+this.model.width])*(this.model.Z[i]-this.model.Z[i+this.model.width])
                            )/(8*this.model.dy)

                        ) / (this.model.Cph[k][i]*this.model.ps[i]);

                    this.model.St[k][i] = - part1 - adv - part2 + part3  
                    
                            // complage thermodynamique avec les paramétrisations
                            + (this.model.Q[k][i] 
                            + Model.R * this.model.T[k][i] * this.model.Sz[i]/this.model.dt)/this.model.Cph[k][i]
                }
                i+=2;
            }
        }
       
        HydrostaticLeapFrogDynamicsCore.prototype.calcSt = function()
        {
            var n = this.model.nbcouches;
            for (var k=0;k<n;k++)
            {
                this.calcStCouche(k);
            }
        }
        
        HydrostaticLeapFrogDynamicsCore.prototype.calcSz = function()
        {
            var n = this.model.DtildeDs.length-1;
            var i = 1;
            var x, y;
            for (y=1;y<this.model.height-1;y++)
            {
                for (x=1;x<this.model.width-1;x++,i++)
                {
                    this.model.Sz[i] = -this.model.m[i]*this.model.m[i]*this.model.DtildeDs[n][i]/this.model.ps[i]+this.model.dPs[i];
                }
                i+=2;
            }
        }

        /**
         * Calcule le transport d'une variable sur une couche
         * 
         * @param q la variable d'humidité à transporter
         * @param pc pseudo flux de conversion (évaporation, condentation...)
         * @param sq variable de sortie contenant la dérivée
         * @param k couche à calculer
         */
        HydrostaticLeapFrogDynamicsCore.prototype.calcTransportCouche = function(q, dq, sq, k)
        {
            var part1=0, adv=0;
            var d_ktilde, d_ktilde_moins_1;
            var q_k_plus_1, q_k, q_k_moins_1;

            var m2 = 0;
            var i = this.model.width+1;
            var x, y;
            for (y=1;y<this.model.height-1;y++)
            {
                for(x=1;x<this.model.width-1;x++,i++)
                {
                    m2 = this.model.m[i]*this.model.m[i];

                    if (k<q.length-1)
                    {
                        d_ktilde = this.model.sigmaf[k+1][i];
                        q_k_plus_1 = q[k+1][i];                        
                    }
                    else
                    {
                        d_ktilde = 0;
                        q_k_plus_1 = 0;
                    }

                    d_ktilde_moins_1 = this.model.sigmaf[k][i];
                    q_k = q[k][i];


                    if (k>0)
                    {
                        q_k_moins_1 = q[k-1][i];
                    }
                    else
                    {
                        q_k_moins_1 = 0;
                    }

                    // Terme de transport horizontal
                    part1 = m2*(
                            ((this.model.ps[i+1]+this.model.ps[i])*this.model.U[k][i]*(q[k][i+1]-q[k][i])
                            +(this.model.ps[i]+this.model.ps[i-1])*this.model.U[k][i-1]*(q[k][i]-q[k][i-1]))/(4*this.model.dx)

                            +((this.model.ps[i-this.model.width]+this.model.ps[i])*this.model.V[k][i-this.model.width]*(q[k][i-this.model.width]-q[k][i])
                            +(this.model.ps[i]+this.model.ps[i+this.model.width])*this.model.V[k][i]*(q[k][i]-q[k][i+this.model.width]))/(4*this.model.dy)
                        )/this.model.ps[i];

                    // Terme d'advection verticale
                    adv = (d_ktilde*(q_k_plus_1-q_k)+d_ktilde_moins_1*(q_k-q_k_moins_1)) / (this.model.ps[i]*2*this.model.dsigma[k]);

                    sq[k][i] = - part1 - adv + dq[k][i];
                }
                i+=2;
            }
        }
        
        /**
         * Calcule le transport des valeurs d'humidité, etc...
         */
        HydrostaticLeapFrogDynamicsCore.prototype.calcTransports = function()
        {
            var n = this.model.nbcouches;
            for (var k=0;k<n;k++)
            {
                this.calcTransportCouche(this.model.qv, this.model.dQv, this.model.Sqv, k);
            }
        }
    }
}

HydrostaticLeapFrogDynamicsCore.prototype = Object.create(DynamicsCore.prototype);
HydrostaticLeapFrogDynamicsCore.prototype.constructor = HydrostaticLeapFrogDynamicsCore;


/**
 * Initialise le coeur dynamique
 * @returns {undefined}
 */
HydrostaticLeapFrogDynamicsCore.prototype.init = function(model)
{
    this.model = model;
    
    if (this.model.gridType!="C")
    {
        throw "type de grille non supporté par ce coeur dynamique.";
    }

    if (this.model.verticalType!="L")
    {
        throw "type de niveau non supporté par ce coeur dynamique.";
    }
   
    this.X_tmp = Variable.createVariable(this.model.nbcouches, this.model.width, this.model.height, true);
    this.X2d_tmp = Variable.createVariable(1, this.model.width, this.model.height);
}

/**
 * Calcule une avancée du modèle du pas de temps dt.
 */
HydrostaticLeapFrogDynamicsCore.prototype.step = function()
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
