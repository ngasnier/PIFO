/* 
Copyright (C) 2018 Nicolas GASNIER (http://www.meteo-blois.fr/contact/)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

import { Model } from './Model.js';
import { Variable } from './Variable.js';

/**
 * Modèle coordonnée vertical sigma pure en grille C
 * 
 * Disposition de la grille : 
 * x:   0     <-dx->      1                2
 * y:   U      m   phi    U     m   phi    U
 * 0    x--------*--------x-------*--------x--
 *           K,T | Ps,sigma*  K,T | Ps, sigma*
 * ^             |                |
 * dy f o ksi*   + V    f o ksi*  + V    f o ksi*
 * v             |                |
 *      U      m | phi    U     m | phi    U
 * 1    x--------*--------x-------*--------x--
 *           K,T | Ps,sigma*  K,T | Ps, sigma*
 *               |                |
 *    f o ksi*   + V    f o ksi*  + V    f o ksi*
 *               |                |
 *      U      m |phi     U     m | phi    U
 * 2    x--------*--------x-------*--------x--
 *           K,T | Ps,sigma*  K,T | Ps, sigma*
 *               |                | 
 *               
 *                       
 *                                          
 *          
 *  Disposition verticale pour N niveaux :
 *      S     | 
 *  s[0]=0    | Surface : 0   ------------------------------sigma* p[0]=ptop
 *  s[1]      | Couche :  0         U, V, T, phi, K, ksi*   D~ds   p[1]
 *  s[2]      | Surface : 1   ------------------------------sigma* p[2]
 *  s[3]      | Couche :  1         U, V, T, phi, K, ksi*   D~ds   p[3]
 *  s[4]      | Surface : 2   ------------------------------sigma* p[4]
 *     ...        ...                        ...
 *  s[2N-3]   | Surface : N-2 ------------------------------sigma* p[2N]
 *  s[2N-2]   | Couche :  N-2       U, V, T, phi, K, ksi*   D~ds   p[2N-2]
 *  s[2N-1]   | Surface : N-1 ------------------------------sigma* p[2N-1]
 *  s[2N]     | Couche :  N-1       U, V, T, phi, K, ksi*   D~ds   p[2N]
 *  s[2N+1]=1 | Surface : N   ------------------------------sigma* p[2N+1]=ps
 *          
 * @returns {BaroclinicModel}
 */
export var BaroclinicModel = function ()
{
    Model.call(this);
      
    // **** PARAMETRES DU MODELE ****
    
    // Type de projection à utiliser pour les équations (détermine m)
    this.projection = this.PROJ_CARTESIEN;
    
    // Type de grille
    this.gridType = "A";
    
    // Type d'arrangement vertical (L=Lorenz, CP=Charney-Phillips)
    this.verticalType = "L";
    
    // Indique qu'on travaille en grille globale
    this.global = false;
    
    // Facteur d'échelle. m=1 constant parfait pour map cartésienne
    // A préciser pour les projections autres que CARTESIEN et MERCATOR
    this.m = [];  
    
    // Pas de grille en degré dans la direction des latitudes.
    this.dlat = 10;
    
    // Pas de grille en degré dans la direction des longitudes.
    this.dlon = 10;
    
    // Pas de grille en X. 1° = 111.11km. Recalculé à partir de dlon.
    this.dx = [];
    
    // Pas de grille en Y. 1° = 111.11km. Recalculé à partir de dlat.
    this.dy = 111100;
       
    // Niveaux de pression des données à interpoler sur hybride
    // Ne doit pas nécessairement correspondre aux nombre de niveaux
    this.in_levels = [100, 7000, 15000, 35000, 50000, 65000, 85000, 92500, 100000];
    
    // Tableau pour initialiser la pression de surface du modèle. lon*largeur
    this.sfcgeop = [];
           
    // Nombre de couches de modèle. Il ya donc n+1 surfaces.
    this.nbcouches = 7;
    
    // Coordonnée verticale des niveaux. nbcouches * 2 + 1 coordonnées.
    // Alternativement surface/couche représentative/surface
    // Niveaux représentatifs choisis de façon à simplifier epsilon
    //this.sigma = [9.6e-6, 0.055, 0.15, 0.308, 0.5, 0.667, 0.85, 0.924, 1];
    this.sigma = [9.6e-6, 0.055, 0.15, 0.0, 0.3, 0.0, 0.45, 0, 0.6, 0, 0.75, 0, 0.9, 0, 1];

    // Indices correspondant aux couches
    this.couches = [];
    
    // Indices des surfaces
    this.surfaces = [];

    // Indices de tous les niveaux
    this.niveaux_s = [];
       
    // **** VARIABLES DE LA SIMULATION ****

    // ---- VARIABLES HISTORIQUES
    
    // Composantes du vent réduit T et T-1 des couches (N-1)
    this.U = [];
    this.U_t = [];
    this.U_couplage = [];
    this.V = [];
    this.V_t = [];
    this.V_couplage = [];
          
    // Logarithme de la pression de surface 
    this.Z = []
    this.Z_t = []
    this.Z_couplage = [];
    
    // La pression de surface
    this.ps = []
    
    // Température sur les couches (N-1)
    this.T = [];
    this.T_t = [];
    this.T_couplage = [];
    
    // Variables de transport de la vapeur d'eau
/*    this.qd = []; // air sec
    this.qd_t = [];
    this.ql_couplage = [];*/

    // Vapeur d'eau
    this.qv = [];
    this.qv_t = [];
    this.qv_couplage = [];
    
    // Pseudo-flux d'évaporation/condentation
    this.P_evap = []; 
   
/*    this.ql = []; // eau de nuage
    this.ql_t = [];
    this.ql_couplage = [];

    this.qr = []; // eau précipitante
    this.qr_t = [];
    this.qr_couplage = [];

    this.qi = []; // glace de nuage
    this.qi_t = [];
    this.qi_couplage = [];

    this.qs = []; // glace précipitante (neige)
    this.qs_t = [];
    this.qs_couplage = [];*/

    // ---- VARIABLES DIAGNOSTIQUES
    
    // Vitesse verticale généralisée finale (surfaces intercouche) (N+1) = s*dp/ds
    this.sigmaf = [];

    // Geopotentiel des couches représentatives (N-1)
    this.phi = [];
      
    // Energie cinétique des couches (N-1) = m^2*(U^2+V^2)/2
    this.K = [];
    
    // Tourbillon de la couche = m^2(dV/dx-dU/dy)
    this.tourbillon = [];
    
    // ---- VARIABLES PHYSIQUES
    
    // Flux de précipitations liquides sur les surfaces intercouches
    this.Pl = [];
    
    // Flux de précipitations solides sur les surfaces intercouches
    this.Pi = [];
    
    // Flux d'évaporation en surface
    this.E = [];
    
    // Accumulation de précipitations à la surfae
    this.apcp = [];
    
    // CAPE
    this.CAPE = [];
    
    // CIN
    this.CIN = [];
          
    // ---- VARIABLES INTERNES
    
    // Paramètre de Coriolis.
    this.f = [];
    
    // Facteur d'échelle
    this.m = [];

    // Termes constants pour le calcul de phi et conversion énergie potentielle
    this.alpha = []; // alphak = ln sigmaktilde/sigmak
    this.beta = []; // betak = ln sigmak/sigmak-1tilde
    this.gamma = []; // gammak = alphak + betak = ln sigmaktilde/sigmak-1tilde

    // **** TABLEAUX INTERMEDIAIRES POUR CALCULS ****
    
    // Dérivées et variables intermédiaires
    this.dsigma = [];
    
    // Divergence
    this.Dtilde = [];
    this.DtildDs = [];
        
    // Tendances temporelles
    this.Sz = [];
    this.Su = [];
    this.Sv = [];
    this.St = [];
    this.Sqv = [];
    
                        
    // Méthodes privées du modèle
    if( typeof BaroclinicModel.initialized == "undefined" ) 
    {
        // ********************************************************************
        // COEUR DYNAMIQUE DU MODELE
        // ********************************************************************
        
        BaroclinicModel.prototype.avanceEuler = function()
        {       
            Variable.a_bc(this.U, this.Su, this.dt, this.U_t);
            Variable.a_bc(this.V, this.Sv, this.dt, this.V_t);
            Variable.a_bc(this.T, this.St, this.dt, this.T_t);
            Variable.a_bc(this.qv, this.Sqv, this.dt, this.qv_t);
            Variable.a_bc2d(this.Z, this.Sz, this.dt, this.Z_t);
        }

        BaroclinicModel.prototype.avanceExpliciteCentre = function()
        {       
            Variable.a_bc(this.U_t, this.Su, 2*this.dt, this.U_t);
            Variable.a_bc(this.V_t, this.Sv, 2*this.dt, this.V_t);
            Variable.a_bc(this.T_t, this.St, 2*this.dt, this.T_t);
            Variable.a_bc(this.qv_t, this.Sqv, 2*this.dt, this.qv_t);
            Variable.a_bc2d(this.Z_t, this.Sz, 2*this.dt, this.Z_t);
        }
              
              
        BaroclinicModel.prototype.calcSuCouche = function(k)
        {
            if (this.gridType=="C")
            {
                var xi = 0;
                var psvk = 0;
                var d_ktilde_1, d_ktilde_2, d_ktilde_moins_1_1, d_ktilde_moins_1_2;
                var u_k_plus_1, u_k, u_k_moins_1;
                var adv=0, rtz=0;
                var kphi=0;
                var i;
                for (var y=1;y<this.height-1;y++)
                {
                    for(var x=1;x<this.width-1;x++)
                    {
                        i = x+y*this.width;

                        if (k<this.U.length-1)
                        {
                            d_ktilde_1 = this.sigmaf[k+1][i];
                            d_ktilde_2 = this.sigmaf[k+1][i+1];
                            u_k_plus_1 = this.U[k+1][i];
                        }
                        else
                        {
                            d_ktilde_1 = 0;
                            d_ktilde_2 = 0;
                            u_k_plus_1 = 0;
                        }

                        d_ktilde_moins_1_1 = this.sigmaf[k][i];
                        d_ktilde_moins_1_2 = this.sigmaf[k][i+1];

                        u_k = this.U[k][i];

                        if (k>0)
                        {
                            u_k_moins_1 = this.U[k-1][i];                        
                        }
                        else 
                        {
                            u_k_moins_1 = 0;
                        }                        

                        // Verif Ok 14/06/2018
                        xi = 0.5*(this.tourbillon[k][i]+this.tourbillon[k][i-this.width]); 

                        // Verif Ok 14/06/2018
                        psvk = (
                                (this.ps[i]+this.ps[i-this.width])*this.V[k][i-this.width]
                                +(this.ps[i+1]+this.ps[i+1-this.width])*this.V[k][i+1-this.width]
                                +(this.ps[i+1]+this.ps[i+1+this.width])*this.V[k][i+1]
                                +(this.ps[i]+this.ps[i+this.width])*this.V[k][i]
                            )/8; 
                       
                        // Verif Ok 14/06/2018
                        adv = (1/((this.ps[i+1]+this.ps[i])*this.dsigma[k]))
                            *(
                               0.5*(d_ktilde_1+d_ktilde_2)*(u_k_plus_1-u_k)+0.5*(d_ktilde_moins_1_1+d_ktilde_moins_1_2)*(u_k-u_k_moins_1)
                             );

                        // Verif Ok 14/06/2018
                        kphi = (this.K[k][i+1]+this.phi[k][i+1]-this.K[k][i]-this.phi[k][i])/this.dx[y];

                        // Verif Ok 14/06/2018
                        if (this.verticalType=="L")
                        {
                            rtz = Model.R*0.5*(this.T[k][i]+this.T[k][i+1])*(this.Z[i+1]-this.Z[i])/this.dx[y];
                        }
                        else
                        {
                            rtz = Model.R*0.25*(this.T[k][i]+this.T[k][i+1]+this.T[k+1][i]+this.T[k+1][i+1])*(this.Z[i+1]-this.Z[i])/this.dx[y];
                        }
                        
                        this.Su[k][i] = xi*psvk - adv - kphi - rtz;
                    }
                }
            }
        }
               
        BaroclinicModel.prototype.calcSu = function()
        {
            var n = this.nbcouches;
            for (var k=0;k<n;k++)
            {
                this.calcSuCouche(k);
            }
        }
               
        BaroclinicModel.prototype.calcSvCouche = function(k)
        {
            if (this.gridType=="C")
            {
                var xi = 0;
                var psuk = 0;
                var d_ktilde_1, d_ktilde_2, d_ktilde_moins_1_1, d_ktilde_moins_1_2;
                var v_k_plus_1, v_k, v_k_moins_1;
                var adv=0, rtz=0;
                var kphi=0;
                var i;
                for (var y=1;y<this.height-1;y++)
                {
                    for(var x=1;x<this.width-1;x++)
                    {
                        i = x+y*this.width;
                        
                        if (k<this.V.length-1)
                        {
                            d_ktilde_1 = this.sigmaf[k+1][i+this.width];
                            d_ktilde_2 = this.sigmaf[k+1][i];
                            v_k_plus_1 = this.V[k+1][i];                        
                        }
                        else
                        {
                            d_ktilde_1 = 0;
                            d_ktilde_2 = 0;
                            v_k_plus_1 = 0;
                        }

                        d_ktilde_moins_1_1 = this.sigmaf[k][i+this.width];
                        d_ktilde_moins_1_2 = this.sigmaf[k][i];

                        v_k = this.V[k][i];

                        if (k>0)
                        {
                            v_k_moins_1 = this.V[k-1][i];
                        }
                        else
                        {
                            v_k_moins_1 = 0;
                        }

                        // Verif Ok 14/06/2018
                        xi = 0.5*(this.tourbillon[k][i]+this.tourbillon[k][i-1]);

                        // Verif Ok 14/06/2018
                        psuk = (
                                (this.ps[i-1]+this.ps[i])*this.U[k][i-1]
                                +(this.ps[i]+this.ps[i+1])*this.U[k][i]
                                +(this.ps[i+this.width]+this.ps[i+this.width+1])*this.U[k][i+this.width]
                                +(this.ps[i-1+this.width]+this.ps[i+this.width])*this.U[k][i-1+this.width]
                            )/8;
                    
                        // Verif Ok 14/06/2018
                        adv = (1/((this.ps[i]+this.ps[i+this.width])*this.dsigma[k]))*(
                               0.5*(d_ktilde_1+d_ktilde_2)*(v_k_plus_1-v_k)+0.5*(d_ktilde_moins_1_1+d_ktilde_moins_1_2)*(v_k-v_k_moins_1));

                        // Verif Ok 14/06/2018
                        kphi = (this.K[k][i]+this.phi[k][i]-this.K[k][i+this.width]-this.phi[k][i+this.width])/this.dy;

                        // Verif Ok 14/06/2018
                        if (this.verticalType=="L")
                        {
                            rtz = Model.R*0.5*(this.T[k][i]+this.T[k][i+this.width])*(this.Z[i]-this.Z[i+this.width])/this.dy;
                        }
                        else
                        {
                            rtz = Model.R*0.25*(this.T[k][i]+this.T[k][i+this.width]+this.T[k+1][i]+this.T[k+1][i+this.width])*(this.Z[i]-this.Z[i+this.width])/this.dy;                            
                        }

                        this.Sv[k][i] = -xi*psuk - adv - kphi - rtz;                        
                    }
                }
            }
        }
        
        BaroclinicModel.prototype.calcSv = function()
        {
            var n = this.nbcouches;
            for (var k=0;k<n;k++)
            {
                this.calcSvCouche(k);
            }            
        }
               
        BaroclinicModel.prototype.calcStCouche = function(k)
        {
            if (this.gridType=="C")
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
                var i;
                for (var y=1;y<this.height-1;y++)
                {
                    for(var x=1;x<this.width-1;x++)
                    {
                        i = x+y*this.width;
                        
                        m2 = this.m[i]*this.m[i];

                        
                        // Verif Ok 14/06/2018
                        if (this.verticalType=="L")
                        {
                            if (k<this.T.length-1)
                            {
                                d_ktilde = this.sigmaf[k+1][i];
                                t_k_plus_1 = this.T[k+1][i]; 
                            }
                            else
                            {
                                d_ktilde = 0;
                                t_k_plus_1 = 0;
                            }

                            d_ktilde_moins_1 = this.sigmaf[k][i];
                            t_k = this.T[k][i];


                            if (k>0)
                            {
                                t_k_moins_1 = this.T[k-1][i];
                                integ_dtlds = this.DtildeDs[k-1][i];
                            }
                            else
                            {
                                t_k_moins_1 = 0;
                                integ_dtlds = 0;
                            }

                            part1 = m2*(
                                    ((this.ps[i+1]+this.ps[i])*this.U[k][i]*(this.T[k][i+1]-this.T[k][i])
                                    +(this.ps[i]+this.ps[i-1])*this.U[k][i-1]*(this.T[k][i]-this.T[k][i-1]))/(4*this.dx[y])

                                    +((this.ps[i-this.width]+this.ps[i])*this.V[k][i-this.width]*(this.T[k][i-this.width]-this.T[k][i])
                                    +(this.ps[i]+this.ps[i+this.width])*this.V[k][i]*(this.T[k][i]-this.T[k][i+this.width]))/(4*this.dy)
                                )/this.ps[i];

                            // Verif Ok 14/06/2018
                            // TODO : y'a une coquille dans ce terme, c'est lui qui cause l'instabilité
                            adv = (d_ktilde*(t_k_plus_1-t_k)+d_ktilde_moins_1*(t_k-t_k_moins_1)) / (this.ps[i]*2*this.dsigma[k]);

                            // Verif Ok 15/06/2018
                            part2 = Model.R*this.T[k][i]*m2
                                        *(this.gamma[k]*integ_dtlds+this.alpha[k]*this.Dtilde[k][i]*this.dsigma[k])
                                    /(Model.Cp*this.ps[i]*this.dsigma[k]);

                            // Verif Ok 15/06/2018
                            part3 = Model.R*m2 *(
                                    (
                                        (this.ps[i]+this.ps[i+1])*this.U[k][i]*(this.T[k][i]+this.T[k][i+1])*(this.Z[i+1]-this.Z[i])
                                        +(this.ps[i]+this.ps[i-1])*this.U[k][i-1]*(this.T[k][i]+this.T[k][i-1])*(this.Z[i]-this.Z[i-1])                                    
                                    )/(8*this.dx[y])
                                +
                                    ( 
                                        (this.ps[i]+this.ps[i-this.width])*this.V[k][i-this.width]*(this.T[k][i]+this.T[k][i-this.width])*(this.Z[i-this.width]-this.Z[i])
                                        +(this.ps[i]+this.ps[i+this.width])*this.V[k][i]*(this.T[k][i]+this.T[k][i+this.width])*(this.Z[i]-this.Z[i+this.width])
                                    )/(8*this.dy)

                                ) / (Model.Cp*this.ps[i]);
                        
                            // Couplage avec les paramètres physiques
                            cp = Model.Cp+Model.Cp_v*this.qv[k][i];
                            // Nb : divisé 1-qr-qs, mais qr=qs=0 vu que tout 
                            // précipite direct en pied de couche
                            //c_chapo = (Model.Cp+Model.Cp_v*this.qv[k][i]); 
                            dcpt = -Model.g*m2/(this.ps[i]*this.dsigma[k])
                                *(
                                    (
                                        (Model.Cp_l-Model.Cp)*this.Pl[k+1][i]*this.T[k][i] // <= INSTABLE avec ce terme !
                            
                                        //-(c_chapo-cp)*this.Pl[k+1][i]*this.T[k][i]) // Sans qr ni qs ce terme est toujours nul...
                                                                                  // Pas la peine de gaspiller du temps de calcul
                                    )
                            
                                    +(-Model.Ll*(this.P_evap[k][i]))
                                );
                        }
                        else
                        {
                            d_ktilde = this.sigmaf[k][i];
                            
                            if (k<this.T.length-1)
                            {
                                t_k_plus_1 = this.T[k+1][i]; 
                                k_c = k;
                            }
                            else
                            {
                                // pas de dérivée donc pas d'advection en limite
                                t_k_plus_1 = this.T[k][i]; 
                                k_c = k-1;
                            }


                            if (k>0)
                            {
                                t_k_moins_1 = this.T[k-1][i];
                                integ_dtlds = this.DtildeDs[k-1][i];
                                k_1 = k-1;
                            }
                            else
                            {
                                t_k_moins_1 = this.T[k][i];
                                integ_dtlds = 0;
                                k_1 = k;
                            }

                            part1 = m2*(
                                    ((this.ps[i+1]+this.ps[i])*0.5*(this.U[k_c][i]+this.U[k_1][i])*(this.T[k][i+1]-this.T[k][i])
                                    +(this.ps[i]+this.ps[i-1])*0.5*(this.U[k_c][i-1]+this.U[k_1][i-1])*(this.T[k][i]-this.T[k][i-1]))/(4*this.dx[y])

                                    +((this.ps[i-this.width]+this.ps[i])*0.5*(this.V[k_c][i-this.width]+this.V[k_1][i-this.width])*(this.T[k][i-this.width]-this.T[k][i])
                                    +(this.ps[i]+this.ps[i+this.width])*0.5*(this.V[k_c][i]+this.V[k_1][i])*(this.T[k][i]-this.T[k][i+this.width]))/(4*this.dy)
                                )/this.ps[i];


                            if (k>0)
                            {
                                adv = (d_ktilde*(t_k_plus_1-t_k_moins_1)) / (this.ps[i]*2*this.dsigma[k-1]);

                                part2 = Model.R*this.T[k][i]*m2*(this.gamma[k-1]*integ_dtlds)
                                        /(Model.Cp*this.ps[i]*this.dsigma[k-1]);
                            }
                            else
                            {
                                adv = 0;
                                part2 = 0 ;
                            }

                            part3 = Model.R*m2 *(
                                    (
                                        (this.ps[i]+this.ps[i+1])*0.5*(this.U[k_c][i]+this.U[k_1][i])*(this.T[k][i]+this.T[k][i+1])*(this.Z[i+1]-this.Z[i])
                                        +(this.ps[i]+this.ps[i-1])*0.5*(this.U[k_c][i-1]+this.U[k_1][i-1])*(this.T[k][i]+this.T[k][i-1])*(this.Z[i]-this.Z[i-1])                                    
                                    )/(8*this.dx[y])
                                +
                                    ( 
                                        (this.ps[i]+this.ps[i-this.width])*0.5*(this.V[k_c][i-this.width]*this.V[k_1][i-this.width])*(this.T[k][i]+this.T[k][i-this.width])*(this.Z[i-this.width]-this.Z[i])
                                        +(this.ps[i]+this.ps[i+this.width])*0.5*(this.V[k_c][i]*this.V[k_1][i])*(this.T[k][i]+this.T[k][i+this.width])*(this.Z[i]-this.Z[i+this.width])
                                    )/(8*this.dy)

                                ) / (Model.Cp*this.ps[i]);
                        }
                    
                        this.St[k][i] = - part1 - adv - part2 + part3 + dcpt/cp;
                    }
                }
            }
        }
       
        BaroclinicModel.prototype.calcSt = function()
        {
            var n = this.nbcouches;
            if (this.verticalType=="CP") n++;
            for (var k=0;k<n;k++)
            {
                this.calcStCouche(k);
            }
        }
        
        BaroclinicModel.prototype.calcSz = function()
        {
            var n = this.DtildeDs.length-1;
            var i = 0;
            for (var y=1;y<this.height-1;y++)
            {
                for(var x=1;x<this.width-1;x++)
                {
                    i = x+y*this.width;
                    this.Sz[i] = -this.m[i]*this.m[i]*this.DtildeDs[n][i]/this.ps[i];
                }
            }
        }

        BaroclinicModel.prototype.calcPs = function()
        {
            var n = this.p.length;
            var flux = 0;
            for (var i=0;i<this.width*this.height-1;i++)
            {
                flux = -Model.g * (this.Pl[this.nbcouches][i]); // +Pi-E
                this.ps[i] = Math.exp(this.Z[i])+flux;
            }
            this.calcPressureLevels();
        }
        
        BaroclinicModel.prototype.calcPressureLevels = function()
        {
            var n = this.p.length;
            for (var k=0;k<n;k++)
            {
                for (var i=0;i<this.width*this.height-1;i++)
                {
                    this.p[k][i] = this.sigma[k]*this.ps[i];
                }
            }
        }
                       
        BaroclinicModel.prototype.calcGeop = function()
        {
            var n = this.phi.length;
            var l;  
            var acc = 0;
            var i = 0;
            for (var k=0;k<n;k++)
            {
                for (var y=0;y<this.height;y++)
                {
                    for(var x=0;x<this.width;x++)
                    {
                        i = x+y*this.width;
                        
                        // Verif Ok 16/06/2018
                        acc=0;
                        if (this.verticalType=="L")
                        {
                            for (l=k+1;l<n;l++)
                            {
                                acc += this.gamma[l]*Model.R*this.T[l][i];
                            }
                            this.phi[k][i] = this.sfcgeop[i]+acc+this.alpha[k]*Model.R*this.T[k][i];
                        }
                        else
                        {
                            for (l=k+1;l<n;l++)
                            {
                                acc += this.gamma[l]*Model.R*0.5*(this.T[l][i]+this.T[l+1][i]);
                            }
                            this.phi[k][i] = this.sfcgeop[i]+acc+this.gamma[k]*Model.R*0.5*(this.T[k][i]+this.T[k+1][i]);
                        }
                        
                   }
                }
            }
        }

        BaroclinicModel.prototype.calcEnergie = function()
        {
            if (this.gridType=="C")
            {
                var i = 0;
                var u1 = 0, u2 = 0;
                var v1 = 0, v2 = 0;
                for (var k=0;k<this.U.length;k++)
                {
                    for (var y=1;y<this.height-1;y++)
                    {
                        for(var x=1;x<this.width-1;x++)
                        {
                            i = x+y*this.width;
                            // Verif Ok 15/06/2018
                            u1 = this.U[k][i-1];
                            u2 = this.U[k][i];
                            v1 = this.V[k][i];
                            v2 = this.V[k][i-this.width]
                            this.K[k][i] = this.m[i]*this.m[i]*(
                                    0.5*(u1*u1 + u2*u2)
                                    +0.5*(v1*v1 + v2*v2))/2;
                        }
                    }
                }
            }
        }

        BaroclinicModel.prototype.calcTourbillon = function()
        {
            if (this.gridType=="C")
            {
                var i = 0;
                var m1=0, m2=0, m3=0, m4=0;

                for (var k=0;k<this.U.length;k++)
                {
                    for (var y=1;y<this.height-1;y++)
                    {
                        for(var x=1;x<this.width-1;x++)
                        {
                            i = x+y*this.width;
                            m1 = this.m[i+this.width];
                            m2 = this.m[i+1+this.width];
                            m3 = this.m[i];
                            m4 = this.m[i+1];

                            // Verif Ok 13/06/2018
                            this.tourbillon[k][i] = (
                                    0.25*(m1*m1+m2*m2+m3*m3+m4*m4)
                                    *(
                                         (this.V[k][i+1]-this.V[k][i])/this.dx[y] - (this.U[k][i]-this.U[k][i+this.width])/this.dy
                                     )
                                    +this.f[i]
                                )
                                /(0.25*(this.ps[i]+this.ps[i+1]+this.ps[i+this.width]+this.ps[i+this.width+1]));
                        }
                    }
                }
            }
        }

        BaroclinicModel.prototype.calcSigmaf = function()
        {
            var n = this.sigmaf.length-2;
            var nb = this.width*this.height;
            var k = 1;
            // Commence à 1 car sommet toujours zero
            for (k=1;k<this.sigmaf.length-1;k++)
            {
                var kg = this.surfaces[k];
                for (var i=0;i<nb;i++)
                {
                    this.sigmaf[k][i] = this.m[i]*this.m[i]*(
                        
                            (this.sigma[kg]*this.DtildeDs[n][i]
                            -this.DtildeDs[k-1][i])
                    
                            // Terme de conservation pour les flux précipitants
                            +Model.g/(this.ps[i]*this.dsigma[k-1])
                                *(this.Pl[k][i])
                        );
                }
           } 
          
           // A la base applique la conservation pour les termes précipitants
           k = this.sigmaf.length-1;
           for (var i=0;i<nb;i++)
           {
               this.sigmaf[k][i] = Model.g*(this.Pl[k][i]); // + Pi - E
           }
        }

/*
 *  Indices pour le calcul des dérivées
 *    i-1-w    i-1-w     i-w     i-w     i+1-w
 * 0    x--------*--------x-------*--------x--
 *               |                |c3      
 * ^  i-1-w    i-1-w     i-w     i-w     i+1-w
 * dy   o        +        o       +d2      o     
 * v             |                |
 *     i-1      i-1       i       i       i+1     |
 * 1    x--------*--------x-------*--------x------* 
 *               |a3      b2    ps|a2     b1    a1|
 *     i-1      i-1       i       ic2     i+1    
 *      o        +        o      V+d1      o     
 *               |                |
 *     i-1+w   i-1+w     i+w     i+w     i+1+w
 * 2    x--------*--------x-------*--------x------ 
 *               |                |c1          
 *               |                | 
 *                  
 */
        /**
         * Discrétisation en grille C de la divergence de Ps*Vent. Le calcul est 
         * ensuite intégré sur la verticale pour des questions pratiques.
         * @returns {undefined} rien, le résultat est stocké dans Dtilde.
         */
        BaroclinicModel.prototype.calcDtilde = function() 
        {
            if (this.gridType=="C")
            {           
                for (var k=0;k<this.nbcouches;k++)
                {
                    for (var y=1;y<this.height-1;y++)
                    {
                        for(var x=1;x<this.width-1;x++)
                        {
                            i = x+y*this.width;
                            
                            // Verif Ok 15/06/2018
                            this.Dtilde[k][i] = ((this.ps[i]+this.ps[i+1])*this.U[k][i]-(this.ps[i-1]+this.ps[i])*this.U[k][i-1])*0.5/this.dx[y]
                                +((this.ps[i-this.width]+this.ps[i])*this.V[k][i-this.width]-(this.ps[i]+this.ps[i+this.width])*this.V[k][i])*0.5/this.dy;
                        }
                    }
                }
            }
            
            // Verif Ok 15/06/2018
            // Integre l'expression Dtilde*dsigma sur la verticale
            for (var i=0;i<this.height*this.width;i++)
            {
                this.DtildeDs[0][i] = this.Dtilde[0][i]*this.dsigma[0];
            }
            for (var k=1;k<this.nbcouches;k++)
            {
                for (var i=0;i<this.height*this.width;i++)
                {
                    this.DtildeDs[k][i] = this.DtildeDs[k-1][i]+this.Dtilde[k][i]*this.dsigma[k];
                }
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
        BaroclinicModel.prototype.calcTransportCouche = function(q, Pc, sq, k)
        {
            if (this.gridType=="C")
            {
                var part1=0, adv=0, dqv=0;
                var d_ktilde, d_ktilde_moins_1;
                var q_k_plus_1, q_k, q_k_moins_1;

                var m2 = 0;
                var i;
                for (var y=1;y<this.height-1;y++)
                {
                    for(var x=1;x<this.width-1;x++)
                    {
                        i = x+y*this.width;
                        
                        m2 = this.m[i]*this.m[i];

                        if (k<q.length-1)
                        {
                            d_ktilde = this.sigmaf[k+1][i];
                            q_k_plus_1 = q[k+1][i];                        
                        }
                        else
                        {
                            d_ktilde = 0;
                            q_k_plus_1 = 0;
                        }
                        
                        d_ktilde_moins_1 = this.sigmaf[k][i];
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
                                ((this.ps[i+1]+this.ps[i])*this.U[k][i]*(q[k][i+1]-q[k][i])
                                +(this.ps[i]+this.ps[i-1])*this.U[k][i-1]*(q[k][i]-q[k][i-1]))/(4*this.dx[y])
                                
                                +((this.ps[i-this.width]+this.ps[i])*this.V[k][i-this.width]*(q[k][i-this.width]-q[k][i])
                                +(this.ps[i]+this.ps[i+this.width])*this.V[k][i]*(q[k][i]-q[k][i+this.width]))/(4*this.dy)
                            )/this.ps[i];
                    
                        // Terme d'advection verticale
                        adv = (d_ktilde*(q_k_plus_1-q_k)+d_ktilde_moins_1*(q_k-q_k_moins_1)) / (this.ps[i]*2*this.dsigma[k]);
                        
                        // Couplage avec la physique
                        dqv = Model.g*m2/(this.ps[i]*this.dsigma[k])*(-Pc[k][i] + q[k][i]*(this.Pl[k+1][i])/* 1-qr-qs ?*/);
                        
                        sq[k][i] = - part1 - adv + dqv;
                    }
                }
            }
        }
        
        /**
         * Calcule le transport des valeurs d'humidité, etc...
         */
        BaroclinicModel.prototype.calcTransports = function()
        {
            var n = this.nbcouches;
            for (var k=0;k<n;k++)
            {
                this.calcTransportCouche(this.qv, this.P_evap, this.Sqv, k);
            }
        }
              
        /**
         * Filtre les champs pour éliminer ses fréquences parasites.
         * @param {type} a
         */
        BaroclinicModel.prototype.applyFilter = function ()
        {
            if (this.filter != null)
            {
                this.filter.applyFilter(this.U_t);
                this.filter.applyFilter(this.V_t);
                this.filter.applyFilter(this.T_t);
                this.filter.applyFilter(this.qv_t);
                this.filter.applyFilter2D(this.Z_t);
            }            
        }
        
        // ********************************************************************
        // PARAMETRISATIONS PHYSIQUES
        // ********************************************************************
        
        /**
         * Calcul de l'humidité spécifique saturante.
         */
        BaroclinicModel.prototype.qsat = function(p, t)
        {
            // Formule de Clapeyron
            var e = 101325*Math.exp(2.47e6/(8.3144621/0.01801)*(1/373.15-1/t));
            return 0.622*e/(p-0.378*e);
        }
        
        BaroclinicModel.prototype.calcPrecip = function()
        {
            // Nb : le flux de précip sera toujours 0 au sommet.
            var nb = this.nbcouches;
            for (var k=0;k<nb;k++)
            {
                this.calcPrecipCouche(k);
            }
        }

        BaroclinicModel.prototype.calcPrecipCouche = function(k)
        {
            var qsat;
            var k_tilde = this.surfaces[k];
            var k_couche = this.couches[k];
            var k_tilde1 = this.surfaces[k+1];
            var P_temp = 0;
            for (var i=0;i<this.Pl[k].length;i++)
            {
                qsat = this.qsat(this.p[k_couche][i], this.T[k][i]);
                this.Pl[k+1][i] = 0;
                if (this.qv[k][i]>qsat)
                {
                    // Ajout de flux de précipitations
                    this.P_evap[k][i] = this.qv[k][i]-qsat;
                    this.Pl[k+1][i] = this.Pl[k][i] + (this.P_evap[k][i])*(this.p[k_tilde][i]-this.p[k_tilde1][i])/(this.dt*Model.g);
                }
                else
                {
                    // Evaporation....
                    if (this.Pl[k+1][i]>0)
                    {
                        this.P_evap[k][i] = this.qv[k][i]-qsat;
                        P_temp = Math.sqrt(this.Pl[k][i]) + 4.8e6*(this.P_evap[k][i])*(1/this.p[k_tilde][i]-1/this.p[k_tilde1][i]);
                        this.Pl[k+1][i] = P_temp*P_temp;
                    }
                }
            }
        }
        
        BaroclinicModel.prototype.calcConvection = function()
        {
/*            var dwc2_2 = 0;
            var wc = 0;
            var size = this.qv[0].length;
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
                p_prec = this.ps[i];
                z_prec = this.sfcgeop[i]/Model.g;
                tn = this.T[this.nbcouches-1][i] * Math.pow(this.ps[i]/this.p[this.nbcouches*2][i], Model.R / Model.Cp);
                qv_p = this.qv[this.nbcouches-1][i];
                conv = false;
                
                if (i==4714) console.log(tn);
                wc = 0;
                cape = 0;
                cin = 0;
                for (var k=this.nbcouches-1;k>=0;k--)
                {
                    m2 = this.m[i]*this.m[i];
                    k_couche = this.couches[k];
                    dz = this.phi[k][i]/Model.g - z_prec;
                    
                    qsat = this.qsat(this.p[k_couche][i], this.T[k][i]);
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
                        tn = tn * Math.pow(this.p[k_couche][i]/p_prec, Model.R / Model.Cp);
                    }
                                                           
                    theta_e = this.T[k][i]*Math.pow(100000/this.p[k_couche][i], 2.0/7.0);
                    theta_n = tn*Math.pow(100000/this.p[k_couche][i], 2.0/7.0);
                    k_couche = this.couches[k];
                    B = Model.g*(theta_n-theta_e)/theta_e;
                    epsilon = 0.1; // Heu bah là je sait pas trop...
                    dwc2_2 =a*B - b*epsilon*wc*wc*dz;
                    wc += dwc2_2;
                    
                    Tvpar = tn * (1+0.61*this.qv[k][i]);
                    Tvenv = this.T[k][i] * (1+0.61*this.qv[k][i]);
                   
                    if (conv)
                    {
                        if (tn<this.T[k][i])
                        {
                            // Calculer la CIN
                            cin += Model.g*(Tvpar-Tvenv)/Tvenv*dz;
                        }
                        else if (tn>this.T[k][i])
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
                    
                    if (i==4714) console.log("i="+i+" k="+k+" tn="+tn+" Te="+this.T[k][i]+" Tvpar"+Tvpar+" Tvenv="+Tvenv+" dz="+dz+" B="+B+" conv="+conv+" cape="+cape);
                    
                    p_prec = this.p[k_couche][i];
                    z_prec = this.phi[k][i]/Model.g;
                }
                this.CIN[i] = cin;
                this.CAPE[i] = cape;
            }*/
        }

        // ********************************************************************
        // GESTION DU COUPLAGE
        // ********************************************************************

        /**
         * Couple une variable avec le domaine extérieur.
         * @param {type} x la variable
         * @param {type} c les valeurs du domaine extérieur
         * @returns {undefined}
         */
        BaroclinicModel.prototype.couple2D = function(x, c)
        {
            for (var i=0;i<this.height*this.width;i++)
            {
                x[i] = (1-this.alpha_couplage[i])*x[i] + this.alpha_couplage[i]*c[i];
            }
        }
        
        /**
         * Couple une variable avec le domaine extérieur.
         * @param {type} x
         * @param {type} c
         * @returns {undefined}
         */
        BaroclinicModel.prototype.couple = function(x, c)
        {
            var i, k;
            for (k=0;k<x.length;k++)
            {
                for (i=0;i<this.height*this.width;i++)
                {
                    x[k][i] = (1-this.alpha_couplage[i])*x[k][i] + this.alpha_couplage[i]*c[k][i];
                }
            }
        }
        
        // ********************************************************************
        // GESTION DES VARIABLES
        // ********************************************************************
        
        BaroclinicModel.prototype.wrap2d = function(a)
        {
            var n;
            for(var i=0;i<this.height;i++)
            {
                a[i*this.width]=a[i*this.width + this.width - 2];
                a[i*this.width + this.width - 1]=a[i*this.width+1];
            }
        }
        
        BaroclinicModel.prototype.wrap = function(a)
        {
            for (var k=0;k<a.length;k++)
            {
                for(var i=0;i<this.height;i++)
                {
                    a[k][i*this.width]=a[k][i*this.width + this.width - 2];
                    a[k][i*this.width + this.width - 1]=a[k][i*this.width+1];
                }
            }
        }
    }
}

// Heritage
BaroclinicModel.prototype = Object.create(Model.prototype);
BaroclinicModel.prototype.constructor = BaroclinicModel;

/**
 * Calcule une avancée du modèle du pas de temps dt.
 */
BaroclinicModel.prototype.step = function()
{
    // *** Calcul des variables diagnostiques ***    
    this.calcDtilde();
    this.calcSigmaf();
    this.calcGeop();
    this.calcEnergie();
    this.calcTourbillon();
    if (this.global)
    {
        this.wrap(this.tourbillon);
        this.wrap(this.sigmaf);
        this.wrap(this.K);
        this.wrap(this.phi);
    }
 
    // *** Calcul des processus physiques ***
    //this.calcConvection();
    this.calcPrecip();

    // *** Calcul des tendances ****
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
    
    // Gestion de cycling
    if (this.global)
    {
        this.wrap(this.U_t);
        this.wrap(this.V_t);
        this.wrap(this.T_t);
        this.wrap(this.qv_t);
        this.wrap2d(this.Z_t);
    }

    // Filtrages pour éviter les ondes parasites
    this.applyFilter();

    // Couplage des variables historiques avec le domaine global
    if (this.relaxation>0)
    {
        this.couple(this.U_t, this.U_couplage);
        this.couple(this.V_t, this.V_couplage);
        this.couple(this.T_t, this.T_couplage);
        this.couple(this.qv_t, this.qv_couplage);
        this.couple2D(this.Z_t, this.Z_couplage);
    }

    // Transfère le résultat du calcul dans les bonnes variables
    var tmp = this.U_t; this.U_t = this.U; this.U = tmp;
    tmp = this.V_t; this.V_t = this.V; this.V = tmp;
    tmp = this.T_t; this.T_t = this.T; this.T = tmp;
    tmp = this.qv_t; this.qv_t = this.qv; this.qv = tmp; 
    tmp = this.Z_t; this.Z_t = this.Z; this.Z = tmp; 

    // Recalcule la pression des différentes surfaces s
    this.calcPs();
    
    // *** Calcule des diagnostiques finaux ***
    Variable.a_bc2d(this.apcp, this.Pl[this.nbcouches], -1, this.apcp);

    // *** Calculs de vérification ***
    //this.calcVerifs();

    this.time += this.dt;
}


/**
 * Initialise le modèle à partir des variables d'entrée.
 */
BaroclinicModel.prototype.init = function()
{
    // *** Quelques calculs de dimensions... ***
    var nbs = this.nbcouches*2+1;
    var lat = this.nlat*(Math.PI/180);
    if (this.gridType=="C") lat -= (this.dlat/2)*(Math.PI/180);
    
    // *** Initialises les variables de repérage ***
    this.dx = [];    
    this.dy = Model.Rterre*this.dlat*Math.PI/180;
    this.time = 0;
    this.dsigma = [];

    // *** Initialisation des tableaux nécessaires sur couches et surfaces ***
    this.p = Variable.createVariable(nbs, this.width, this.height, true);
    if (this.global)
    {
        this.wrap2d(this.ps);
    }
    
    var i = 0;
    this.calcPressureLevels();
    
    for (var k=0;k<this.nbcouches;k++)
    {
        this.dsigma[k] = this.sigma[this.surfaces[k+1]]-this.sigma[this.surfaces[k]];
    }
      
     // Creation des variables intermédiaires et diagnostique sur les couches
    this.Z = Variable.createVariable(1);
    this.sigmaf = Variable.createVariable(this.nbcouches+1, this.width, this.height, true);
    this.phi = Variable.createVariable(this.nbcouches, this.width, this.height, true);
    this.K = Variable.createVariable(this.nbcouches, this.width, this.height, true);
    this.tourbillon = Variable.createVariable(this.nbcouches, this.width, this.height, true);
       
    this.Sz = Variable.createVariable(1, this.width, this.height);
    this.Su = Variable.createVariable(this.nbcouches, this.width, this.height, true);
    this.Sv = Variable.createVariable(this.nbcouches, this.width, this.height, true);
    this.St = Variable.createVariable(this.verticalType=="CP"?this.nbcouches+1:this.nbcouches, this.width, this.height, true);
    this.Sqv = Variable.createVariable(this.nbcouches, this.width, this.height, true);
    
    this.Dtilde = Variable.createVariable(this.nbcouches, this.width, this.height, true);
    this.DtildeDs = Variable.createVariable(this.nbcouches, this.width, this.height, true);

    this.U_t = Variable.createVariable(this.nbcouches, this.width, this.height, true);
    this.V_t = Variable.createVariable(this.nbcouches, this.width, this.height, true);
    this.T_t = Variable.createVariable(this.verticalType=="CP"?this.nbcouches+1:this.nbcouches, this.width, this.height, true);
    this.qv_t = Variable.createVariable(this.nbcouches, this.width, this.height, true);
    this.Z_t = Variable.createVariable(1, this.width, this.height);  

    this.U_couplage = Variable.createVariable(this.nbcouches, this.width, this.height, true);
    this.V_couplage = Variable.createVariable(this.nbcouches, this.width, this.height, true);
    this.T_couplage = Variable.createVariable(this.verticalType=="CP"?this.nbcouches+1:this.nbcouches, this.width, this.height, true); 
    this.qv_couplage = Variable.createVariable(this.nbcouches, this.width, this.height, true);
    this.Z_couplage = Variable.createVariable(1, this.width, this.height); 
    
    // Allocation des variables physiques
    this.Pl = Variable.createVariable(this.nbcouches+1, this.width, this.height, true);
    this.Pi = Variable.createVariable(this.nbcouches+1, this.width, this.height, true);
    this.E = Variable.createVariable(1, this.width, this.height);
    this.P_evap = Variable.createVariable(this.nbcouches, this.width, this.height, true);
    
    this.apcp = Variable.createVariable(1, this.width, this.height);
    this.CIN = Variable.createVariable(1, this.width, this.height);
    this.CAPE = Variable.createVariable(1, this.width, this.height);
    
    if (this.global)
    {
        this.wrap(this.U);
        this.wrap(this.V);
        this.wrap(this.T);
        this.wrap(this.qv);
        this.wrap2d(this.Z);
    }
    
    Variable.copy(this.U, this.U_t);
    Variable.copy(this.V, this.V_t);
    Variable.copy(this.T, this.T_t);
    Variable.copy(this.qv, this.qv_t);

    Variable.copy(this.U, this.U_couplage);
    Variable.copy(this.V, this.V_couplage);
    Variable.copy(this.T, this.T_couplage);
    Variable.copy(this.qv, this.qv_couplage);

    // *** Initialise les variables 2D utilisées pour coordonnées, relaxation etc ***
    this.f = Variable.createVariable(1, this.width, this.height);
    this.alpha_couplage = Variable.createVariable(1, this.width, this.height);
    this.m = Variable.createVariable(1, this.width, this.height);
    for (var y=0;y<this.height;y++)
    {
        for(var x=0;x<this.width;x++)
        {
            i = x + y*this.width;
            
            // Variable pronostique
            this.Z[i] = Math.log(this.ps[i]);
            this.Z_t[i] = this.Z[i];
            this.Z_couplage[i] = this.Z[i];

            // Paramètre de coriolis et facteur d'échelle en fonction de la latitude
            this.f[i] = 2 * Model.omega * Math.sin(lat);
            this.dx[y] = Model.Rterre*Math.cos(lat+(this.dlat/2)*(Math.PI/180))*this.dlon*Math.PI/180;
       
            switch (this.projection)
            {
                case Model.PROJ_CARTESIEN:
                    this.m[i] = 1;
                    break;
                case Model.PROJ_MERCATOR:
                    this.m[i] = Math.cos(lat+(this.dlat/2)*(Math.PI/180));
                    break;
                default:
                    //supposé fourni par l'appelant
            }

            // Initialisation du couplage
            if (y==0 || y==this.height-1 || ((x==0 || x==this.width-1) && !this.global))
            {
                this.alpha_couplage[i] = 1.0;
            }
            else if ((y<1+this.relaxation||y>=this.height-this.relaxation-1)
                    || ((x<1+this.relaxation||x>=this.width-this.relaxation-1) && !this.global))
            {
                var xd = 0;
                var yd = 0;

                if (x<1+this.relaxation) xd = this.relaxation-x+1;
                else if (x>=this.width-this.relaxation-1) 
                    xd = x-this.width+this.relaxation+2;
                if (y<1+this.relaxation) yd = this.relaxation-y+1;
                else if (y>=this.height-this.relaxation-1) 
                    yd = y-this.height+this.relaxation+2;

                if (xd<yd || this.global) xd = yd;

                this.alpha_couplage[i] = 1-Math.tanh(0.5*(this.relaxation-xd+1));
            }
            else 
            {
                this.alpha_couplage[i] = 0.0;
            }
        }

        lat -= this.dlat*(Math.PI/180);
    }
   
    // *** Filtrage des champs, pour que ce soit lissé dès le début ***
    this.applyFilter();

    // *** Calculs des champs diagnostics ***
    this.calcDtilde();
    this.calcSigmaf();
    this.calcGeop();
    this.calcEnergie();
    this.calcTourbillon();
} 

/**
 * Donne la liste des variables historiques du modèle.
 * @returns {Array} */
BaroclinicModel.prototype.getHistoricVariables = function()
{
    var layers = this.getLayerLevels();
    return [{"name":"U", "description":"U component of wind", "units":"m.s^-1", "type":Variable.VARIABLE_TYPE_LAYER, "levels": layers}, 
            {"name":"V", "description":"V component of wind", "units":"m.s^-1", "type":Variable.VARIABLE_TYPE_LAYER, "levels": layers},
            {"name":"T", "description":"Temperature", "units":"K", "type":(this.verticalType=="CP"?Variable.VARIABLE_TYPE_SURFACE:Variable.VARIABLE_TYPE_LAYER), "levels": (this.levelType=="CP"?this.getSurfaceLevels():layers)},
            {"name":"ps", "description":"Surface pressure", "units":"pa", "type":Variable.VARIABLE_TYPE_SURFACE, "levels": [1]},
            {"name":"qv", "description":"Specific humidity", "units":"kg/kg", "type":Variable.VARIABLE_LAYER, "levels": layers}
        ];
}

/**
 * Donne la liste des variables paramètres du modèle, à fournir en entrée en plus des variables historiques.
 * @returns {Array} 
 */
BaroclinicModel.prototype.getParameterVariables = function()
{
    return [
            {"name":"sfcgeop", "description":"surface geopotential", "units": "m^2.s^-1", "type":Variable.VARIABLE_TYPE_LAYER, "levels": [1]}
        ];
}

/**
 * Donne la liste des variables diagnostiques du modèle.
 * @returns {Array} 
 */
BaroclinicModel.prototype.getDiagnosticVariables = function()
{
    var surfaces = this.getSurfaceLevels();
    var layers = this.getLayerLevels();
    return [
            {"name":"sigmaf", "description":"vertical velocity", "units":"sigma.s^-1", "type":Variable.VARIABLE_TYPE_SURFACE, "levels": surfaces},
            {"name":"phi", "description":"geopotential height of the layer", "units":"m^2.s^-1", "type":Variable.VARIABLE_TYPE_LAYER, "levels": layers},
            {"name":"K", "description":"kinetic energy", "units":"J", "type":Variable.VARIABLE_TYPE_LAYER, "levels": layers},
            {"name":"tourbillon", "description":"absolute vorticity potential", "units": "S^-1", "type":Variable.VARIABLE_TYPE_LAYER, "levels": layers},
            {"name":"Pl", "description":"liquid precipitation flux", "units": "", "type":Variable.VARIABLE_TYPE_SURFACE, "levels": surfaces},
            {"name":"Pi", "description":"solid precipitation flux", "units": "", "type":Variable.VARIABLE_TYPE_SURFACE, "levels": surfaces},
            {"name":"E", "description":"surface evaporation flux", "units": "", "type":Variable.VARIABLE_TYPE_SURFACE, "levels": [1]},
            {"name":"apcp", "description":"precipitation accumulation", "units": "kg.m^2", "type":Variable.VARIABLE_TYPE_SURFACE, "levels": [1]},
            {"name":"CAPE", "description":"CAPE", "units": "J.kg^-1", "type":Variable.VARIABLE_TYPE_SURFACE, "levels": [1]},
            {"name":"CIN", "description":"CIN", "units": "J.kg^-1", "type":Variable.VARIABLE_TYPE_SURFACE, "levels": [1]}
        ];
}

/**
 * Donne la liste des variables internes du modèle.
 * @returns {Array} */
BaroclinicModel.prototype.getInternalVariables = function()
{
    var layers = this.getLayerLevels();
    return [
            {"name":"f", "description":"coriolis factor", "units":"", "type":Variable.VARIABLE_TYPE_SURFACE, "levels": [1]},
            {"name":"m", "description":"scaling factor", "units": "", "type":Variable.VARIABLE_TYPE_SURFACE, "levels": [1]},
            {"name":"alpha_couplage", "description":"alpha coefficient for coupling", "units": "", "type":Variable.VARIABLE_TYPE_SURFACE, "levels": [1]},
            {"name":"Dtilde", "description":"divergence de quantité de mouvement", "units": "", "type":Variable.VARIABLE_TYPE_LAYER, "levels": layers},
            {"name":"DtildeDs", "description":"intégration de dtilde*ds sur la verticale", "units": "", "type":Variable.VARIABLE_TYPE_LAYER, "levels": layers},
            {"name":"p", "description":"pressure at all s coordinates used by the model", "units": "", "type":Variable.VARIABLE_TYPE_SURFACE, "levels": this.sigma},
            {"name":"Z", "description":"ln(ps)", "units": "", "type":Variable.VARIABLE_TYPE_SURFACE, "levels": [1]},
            {"name":"Sz", "description":"surface pressure tendency", "units": "", "type":Variable.VARIABLE_TYPE_SURFACE, "levels": [1]},
            {"name":"Su", "description":"u component of wind tendency", "units": "", "type":Variable.VARIABLE_TYPE_LAYER, "levels": layers},
            {"name":"Sv", "description":"v component of wind tendency", "units": "", "type":Variable.VARIABLE_TYPE_LAYER, "levels": layers},
            {"name":"St", "description":"temperature tendency", "units": "", "type":Variable.VARIABLE_TYPE_LAYER, "levels": layers},
            {"name":"Sqv", "description":"specific humidity tendency", "units": "", "type":Variable.VARIABLE_TYPE_LAYER, "levels": layers},
            {"name":"P_evap", "description":"evaporation/condensation pseudo-flux", "units": "", "type":Variable.VARIABLE_TYPE_LAYER, "levels": layers},
        ];
}

BaroclinicModel.prototype.setSurfaceLevels = function(p_levels)
{
    var a, b;
    this.sigma = [];
    this.niveaux_s = [];
    this.surfaces = [];
    this.couches = [];
    this.nbcouches = p_levels.length-1;    
    this.sigma[0] = p_levels[0];
    this.niveaux_s.push(0);
    this.surfaces.push(0);
    for (var k=1;k<p_levels.length;k++)
    {
        this.sigma[k*2] = p_levels[k];
        this.niveaux_s.push(k*2-1);
        this.niveaux_s.push(k*2);
        this.couches.push(k*2-1);
        this.surfaces.push(k*2);
        
        // Calcul de sigma pour les couches significatives       
        var ptilde = 101500*p_levels[k];
        var ptilde_1 = 101500*p_levels[k-1];;
        var p = Math.exp(1/(ptilde-ptilde_1)
                    *(ptilde*Math.log(ptilde)-ptilde_1*Math.log(ptilde_1))-1);
        this.sigma[k*2-1] = p/101500;

        a = Math.log(this.sigma[k*2]/this.sigma[k*2-1]);
        b = Math.log(this.sigma[k*2-1]/this.sigma[k*2-2]);
        this.alpha.push(a);
        this.beta.push(b);
        this.gamma.push(a+b); 
    }
}

BaroclinicModel.prototype.getSurfaceLevels = function()
{
    var ret = [];
    for (var k=0;k<this.surfaces.length;k++)
    {
        ret.push(this.sigma[this.surfaces[k]]);
    }
    return ret;
}

BaroclinicModel.prototype.getLayerLevels = function()
{
    var ret = [];
    for (var k=0;k<this.couches.length;k++)
    {
        ret.push(this.sigma[this.couches[k]]);
    }
    return ret;
}

BaroclinicModel.prototype.getName = function()
{
    return "PIFO BAROCLINE";
}
