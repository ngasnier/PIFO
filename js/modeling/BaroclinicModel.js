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
import { DynamicsCore } from './DynamicsCore.js';

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
    this.gridType = "C";
    
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
    
    // Coeur dynamique du modèle
    this.dynamicsCore = new DynamicsCore();
    
    // Schema de paramétrisation des precipitations
    this.precipitationScheme = null;

    // Schema de paramétrisation de la convection
    this.convectionScheme = null;

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
    this.Pl_1 = []; 
    this.Pl_2 = []; 
    this.Pl_3 = []; 

    // Pseudo-flux de conversion glace/vapeur
    this.Pi_1 = []; 
    this.Pi_2 = []; 
    this.Pi_3 = []; 

/*    this.ql = []; // eau de nuage
    this.ql_t = [];
    this.ql_couplage = [];*/

/*    this.qi = []; // glace de nuage
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
    
    // Accumulation de précipitations à la surface
    this.apcp = [];
    this.acsnow = [];
    
    // Variation d'enthalpie
    this.Q = [];

    // Enthalpie totale
    this.Cph = [];
              
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
        
    // Tendances temporelles du coeur dynamique
    this.Sz = [];
    this.Su = [];
    this.Sv = [];
    this.St = [];
    this.Sqv = [];
    
    // Tendances temporelles dûes aux variables physiques
    this.dPs = [];
    this.dSigmaf = [];
    this.dQv = [];
    
    // Variable de debug
    this.debug3d = [];


    // Méthodes privées du modèle
    if (typeof BaroclinicModel.initialized == "undefined" ) 
    {
        // ********************************************************************
        // COEUR DYNAMIQUE DU MODELE
        // ********************************************************************
        BaroclinicModel.prototype.calcPs = function()
        {
            for (var i=0;i<this.width*this.height-1;i++)
            {
                this.ps[i] = Math.exp(this.Z[i])+this.dPs[i];
            }
            this.calcPressureLevels();
        }
        
        BaroclinicModel.prototype.calcPressureLevels = function()
        {
            var n = this.p.length;
            var i=0, k = 0;
            for (k=0;k<n;k++)
            {
                for (i=0;i<this.width*this.height-1;i++)
                {
                    this.p[k][i] = this.sigma[k]*this.ps[i];
                }
            }
        }
                       
        BaroclinicModel.prototype.calcGeop = function()
        {
            var n = this.phi.length;
            var nb = this.height*this.width;
            var l;  
            var acc = 0;
            var i=0, k=0;
            if (this.verticalType=="L")
            {
                for (k=0;k<n;k++)
                {
                    for (i=0;i<nb;i++)
                    {
                        // Verif Ok 16/06/2018
                        acc=0;
                        for (l=k+1;l<n;l++)
                        {
                            acc += this.gamma[l]*Model.R*this.T[l][i];
                        }
                        this.phi[k][i] = this.sfcgeop[i]+acc+this.alpha[k]*Model.R*this.T[k][i];
                    }
                }
            }
            else
            {
                for (k=0;k<n;k++)
                {
                    for (i=0;i<nb;i++)
                    {
                        acc=0;
                        for (l=k+1;l<n;l++)
                        {
                            acc += this.gamma[l]*Model.R*0.5*(this.T[l][i]+this.T[l+1][i]);
                        }
                        this.phi[k][i] = this.sfcgeop[i]+acc+this.gamma[k]*Model.R*0.5*(this.T[k][i]+this.T[k+1][i]);
                    }
                }
            }
        }

        BaroclinicModel.prototype.calcEnergie = function()
        {
            var i = 0;
            var u1 = 0, u2 = 0;
            var v1 = 0, v2 = 0;
            var x, y;
            for (var k=0;k<this.U.length;k++)
            {
                i = this.width+1;
                for (y=1;y<this.height-1;y++)
                {
                    for (x=1;x<this.width-1;x++,i++)
                    {
                        // Verif Ok 15/06/2018
                        u1 = this.U[k][i-1];
                        u2 = this.U[k][i];
                        v1 = this.V[k][i];
                        v2 = this.V[k][i-this.width]
                        this.K[k][i] = this.m[i]*this.m[i]*(
                                0.5*(u1*u1 + u2*u2)
                                +0.5*(v1*v1 + v2*v2))/2;
                    }
                    i+=2;
                }
            }
        }

        BaroclinicModel.prototype.calcTourbillon = function()
        {
            var i = 0;
            var m1=0, m2=0, m3=0, m4=0;
            var x, y;

            for (var k=0;k<this.U.length;k++)
            {
                i = this.width+1;
                for (y=1;y<this.height-1;y++)
                {
                    for (x=1;x<this.width-1;x++,i++)
                    {
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
                    i+=2;
                }
            }
        }

        BaroclinicModel.prototype.calcSigmaf = function()
        {
            var n = this.sigmaf.length-2;
            var nb = this.width*this.height;
            var k = 1, i=0;
            // Commence à 1 car sommet toujours zero
            for (k=1;k<this.sigmaf.length;k++)
            {
                var kg = this.surfaces[k];
                for (i=0;i<nb;i++)
                {
                    this.sigmaf[k][i] = this.m[i]*this.m[i]*(
                        
                            (this.sigma[kg]*this.DtildeDs[n][i]
                            -this.DtildeDs[k-1][i])
                        )
                        +this.dSigmaf[k][i];
                }
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
            var i = 0;
            var x, y, k;
            var nb = this.width*this.height;
            for (k=0;k<this.nbcouches;k++)
            {
                i = this.width+1;
                for (y=1;y<this.height-1;y++)
                {
                    for(x=1;x<this.width-1;x++,i++)
                    {
                        // Verif Ok 15/06/2018
                        this.Dtilde[k][i] = ((this.ps[i]+this.ps[i+1])*this.U[k][i]-(this.ps[i-1]+this.ps[i])*this.U[k][i-1])*0.5/this.dx[y]
                            +((this.ps[i-this.width]+this.ps[i])*this.V[k][i-this.width]-(this.ps[i]+this.ps[i+this.width])*this.V[k][i])*0.5/this.dy;
                    }
                    i+=2;
                }
            }
            
            // Verif Ok 15/06/2018
            // Integre l'expression Dtilde*dsigma sur la verticale
            for (i=0;i<nb;i++)
            {
                this.DtildeDs[0][i] = this.Dtilde[0][i]*this.dsigma[0];
            }
            for (k=1;k<this.nbcouches;k++)
            {
                for (i=0;i<nb;i++)
                {
                    this.DtildeDs[k][i] = this.DtildeDs[k-1][i]+this.Dtilde[k][i]*this.dsigma[k];
                }
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
        // CALCUL DES TERMES DE COUPLAGE PHYSIQUE
        // ********************************************************************
        
        /**
         * Calcul du terme d'évolution de surface dû aux flux de surface
         */
        BaroclinicModel.prototype.calcDPs = function()
        {
            var n = this.p.length;
            for (var i=0;i<this.width*this.height-1;i++)
            {
                this.dPs[i] = -Model.g * (this.Pl[this.nbcouches][i]); // +Pi-E
            }
        }
        
        /**
         * Calcul du terme d'évolution de VV dû aux schémas physiques
         */
        BaroclinicModel.prototype.calcDSigmaf = function()
        {
            var nb = this.width*this.height;
            var k = 1, i=0;
            // Commence à 1 car sommet toujours zero
            for (k=1;k<this.sigmaf.length;k++)
            {
                for (i=0;i<nb;i++)
                {
                    this.dSigmaf[k][i] = Model.g/(this.ps[i]*this.dsigma[k-1])
                                *(this.Pl[k][i]); // +Pi+E
                }
           } 
        }
        
        /**
         * Calcul du terme d'évolution d'humidité dû aux schemas physiques
         */
        BaroclinicModel.prototype.calcDqv = function()
        {
            var i = 0;
            var x, y;
            var m2;
            var n = this.nbcouches;
            var k1, kn1;
            for (var k=0;k<n;k++)
            {
                i = this.width+1;
                if (k==0) kn1 = k; else kn1 = k-1;
                if (k==n-1) k1 = k; else k1 = k+1;
                for (y=1;y<this.height-1;y++)
                {
                    for(x=1;x<this.width-1;x++,i++)
                    {
                        m2 = this.m[i]*this.m[i];
                        /*this.dQv[k][i] = Model.g/(this.ps[i]*this.dsigma[k])
                                *(this.Pl_3[k][i]+this.Pi_3[k][i] - this.Pl_1[k][i] - this.Pi_1[k][i]
                                + this.qv[k][i]*(this.Pl[k+1][i] + this.Pi[k+1][i])/this.dt); // / 1-qr-qs */
                        
                        // Différentiel sur la verticale ????
                        this.dQv[k][i] = Model.g*m2/(2*this.ps[i]*this.dsigma[k])
                                *(
                                 (this.Pl_3[k+1][i]+this.Pi_3[k+1][i] - this.Pl_1[k+1][i] - this.Pi_1[k+1][i])
                                - (this.Pl_3[k][i]+this.Pi_3[k][i] - this.Pl_1[k][i] - this.Pi_1[k][i])
                        
                                + 0.5*(this.qv[k][i]+this.qv[k1][i])*(this.Pl[k+1][i] + this.Pi[k+1][i])/this.dt
                              -
                                + 0.5*(this.qv[k][i]+this.qv[kn1][i])*(this.Pl[k][i] + this.Pi[k][i])/this.dt
                                );
                    }
                    i+=2;
                }
            }
        }

        /**
         * Calcule la variation d'enthalpie
         */
        BaroclinicModel.prototype.calcQ = function()
        {
            var i = 0;
            var x, y;
            var n = this.nbcouches;
            var m2 = 0;
            var c_chapo = 0;
            var k1, kn1;
            for (var k=0;k<n;k++)
            {
                i = this.width+1;
                if (k==0) kn1 = k; else kn1 = k-1;
                if (k==n-1) k1 = k; else k1 = k+1;
                for (y=1;y<this.height-1;y++)
                {
                    for(x=1;x<this.width-1;x++,i++)
                    {
                        m2 = this.m[i]*this.m[i];
                        
                        /*this.Q[k][i] = -Model.g*m2/(this.ps[i]*this.dsigma[k])
                            *(
                                // Terme de contribution du changement de pression dûe au changement de 
                                // masse à cause du flux de précipitation
                                // (si j'ai bien tout compris...)
                                // Nb : rend le modèle instable, terme trop fort par endroit...
                                // Je préfère le négliger en attendant de comprendre
                                (
                                    (Model.Cp_l-Model.Cp)*this.Pl[k+1][i]/this.dt*this.T[k][i] 

                                    +(Model.Cp_i-Model.Cp)*this.Pi[k+1][i]/this.dt*this.T[k][i] 
                                )

                                // Terme de contribution de la chaleur latente
                                +(-Model.Ll*(this.Pl_1[k][i]-this.Pl_3[k][i]) - -Model.Li*(this.Pi_1[k][i]-this.Pi_3[k][i]))
                            );*/
                        this.Q[k][i] = -Model.g*m2/(2*this.ps[i]*this.dsigma[k])
                            *(
                                // Terme de contribution du changement de pression dûe au changement de 
                                // masse à cause du flux de précipitation
                                // (si j'ai bien tout compris...)
                                // Nb : rend le modèle instable, terme trop fort par endroit...
                                // Je préfère le négliger en attendant de comprendre
                                ((
                                    0.5*(Model.Cp_l-Model.Cp)*this.Pl[k+1][i]/this.dt*(this.T[k1][i]+this.T[k][i])

                                    +0.5*(Model.Cp_i-Model.Cp)*this.Pi[k+1][i]/this.dt*(this.T[k1][i]+this.T[k][i])
                                )

                                // Terme de contribution de la chaleur latente
                                +(-Model.Ll*(this.Pl_1[k][i]-this.Pl_3[k][i]) - -Model.Li*(this.Pi_1[k][i]-this.Pi_3[k][i])))
                            -
                                ((
                                    0.5*(Model.Cp_l-Model.Cp)*this.Pl[k][i]/this.dt*(this.T[k][i]+this.T[kn1][i])

                                    +0.5*(Model.Cp_i-Model.Cp)*this.Pi[k][i]/this.dt*(this.T[k][i]+this.T[kn1][i])
                                )

                                // Terme de contribution de la chaleur latente
                                +(-Model.Ll*(this.Pl_1[k][i]-this.Pl_3[k][i]) - -Model.Li*(this.Pi_1[k][i]-this.Pi_3[k][i])))
                            );
                    }
                    i+=2;
                }
            
            }
        }
        
        /**
         * Calcule la chaleur spécifique du mélange
         */
        BaroclinicModel.prototype.calcCph = function()
        {
            var i = 0;
            var x, y;
            var n = this.nbcouches;
            for (var k=0;k<n;k++)
            {
                i = this.width+1;
                for (y=1;y<this.height-1;y++)
                {
                    for(x=1;x<this.width-1;x++,i++)
                    {
                        this.Cph[k][i] = Model.Cp+Model.Cp_v*this.qv[k][i];
                    }
                    i+=2;
                }
            }
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
            var i=0;
            for (var k=0;k<a.length;k++)
            {
                for(i=0;i<this.height;i++)
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
    Variable.init(this.Pl, 0);
    Variable.init(this.Pl_1, 0);
    Variable.init(this.Pl_2, 0);
    Variable.init(this.Pl_3, 0);
    Variable.init(this.Pi, 0);
    Variable.init(this.Pi_1, 0);
    Variable.init(this.Pi_2, 0);
    Variable.init(this.Pi_3, 0);
    if (this.precipitationScheme!=null) this.precipitationScheme.step();
    if (this.convectionScheme!=null) this.convectionScheme.step();
    
    // *** Couplage des équations physiques/dynamiques ***
    this.calcDPs();
    this.calcDSigmaf();
    this.calcSigmaf();
    this.calcDqv();
    
    this.calcCph();
    this.calcQ();

    // *** Calcul de l'évolution dynamique ***
    this.dynamicsCore.step();
    
    // *** Debug condensation ***
    //Variable.product(this.Cph, this.Q, this.debug3d);
    //Variable.a_bc(this.Q, this.dQv, Model.Ll, this.debug3d);
    
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
/*        this.couple(this.U, this.U_couplage);
        this.couple(this.V, this.V_couplage);
        this.couple(this.T, this.T_couplage);
        this.couple(this.qv, this.qv_couplage);
        this.couple2D(this.Z, this.Z_couplage);*/
        
/*        this.couple(this.U_t, this.U_couplage);
        this.couple(this.V_t, this.V_couplage);
        this.couple(this.T_t, this.T_couplage);
        this.couple(this.qv_t, this.qv_couplage);
        this.couple2D(this.Z_t, this.Z_couplage);*/
    }

    // Transfère le résultat du calcul dans les bonnes variables
    var tmp = this.U_t; this.U_t = this.U; this.U = tmp;
    tmp = this.V_t; this.V_t = this.V; this.V = tmp;
    tmp = this.T_t; this.T_t = this.T; this.T = tmp;
    tmp = this.qv_t; this.qv_t = this.qv; this.qv = tmp; 
    var tmp2d = this.Z_t; this.Z_t = this.Z; this.Z = tmp2d; 

    // Recalcule la pression des différentes surfaces s
    this.calcPs();
    
    // *** Calcule des diagnostiques finaux ***
    Variable.a_bc2d(this.apcp, this.Pl[this.nbcouches], 1, this.apcp);
    Variable.a_bc2d(this.acsnow, this.Pi[this.nbcouches], 1, this.acsnow);

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
    this.Z = Variable.createVariable(1, this.width, this.height, false);
    this.sigmaf = Variable.createVariable(this.nbcouches+1, this.width, this.height, true);
    this.phi = Variable.createVariable(this.nbcouches, this.width, this.height, true);
    this.K = Variable.createVariable(this.nbcouches, this.width, this.height, true);
    this.tourbillon = Variable.createVariable(this.nbcouches, this.width, this.height, true);
       
    this.Sz = Variable.createVariable(1, this.width, this.height);
    this.Su = Variable.createVariable(this.nbcouches, this.width, this.height, true);
    this.Sv = Variable.createVariable(this.nbcouches, this.width, this.height, true);
    this.St = Variable.createVariable(this.verticalType=="CP"?this.nbcouches+1:this.nbcouches, this.width, this.height, true);
    this.Sqv = Variable.createVariable(this.nbcouches, this.width, this.height, true);
    
    this.dPs = Variable.createVariable(1, this.width, this.height);
    this.dSigmaf = Variable.createVariable(this.nbcouches+1, this.width, this.height, true);
    this.dQv = Variable.createVariable(this.nbcouches, this.width, this.height, true);
       
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
    this.Pl_1 = Variable.createVariable(this.nbcouches+1, this.width, this.height, true);
    this.Pl_2 = Variable.createVariable(this.nbcouches+1, this.width, this.height, true);
    this.Pl_3 = Variable.createVariable(this.nbcouches+1, this.width, this.height, true);
    this.Pi_1 = Variable.createVariable(this.nbcouches+1, this.width, this.height, true);
    this.Pi_2 = Variable.createVariable(this.nbcouches+1, this.width, this.height, true);
    this.Pi_3 = Variable.createVariable(this.nbcouches+1, this.width, this.height, true);
    this.Q = Variable.createVariable(this.nbcouches, this.width, this.height, true);
    this.Cph = Variable.createVariable(this.nbcouches, this.width, this.height, true);
    
    this.apcp = Variable.createVariable(1, this.width, this.height);

    this.debug3d = Variable.createVariable(this.nbcouches, this.width, this.height, true);

    this.acsnow = Variable.createVariable(1, this.width, this.height);
    
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
   
    // *** Initialisation des schemas ***
    this.dynamicsCore.init(this);
    if (this.precipitationScheme!=null) this.precipitationScheme.init(this);
    if (this.convectionScheme!=null) this.convectionScheme.init(this);
    
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
            {"name":"sigmaf", "description":"vitesse verticale généralisée", "units":"sigma.s^-1", "type":Variable.VARIABLE_TYPE_SURFACE, "levels": surfaces},
            {"name":"phi", "description":"géopotentiel de la couche", "units":"m^2.s^-1", "type":Variable.VARIABLE_TYPE_LAYER, "levels": layers},
            {"name":"K", "description":"énergie cinétique", "units":"J", "type":Variable.VARIABLE_TYPE_LAYER, "levels": layers},
            {"name":"tourbillon", "description":"tourbillon absolu potentiel", "units": "S^-1", "type":Variable.VARIABLE_TYPE_LAYER, "levels": layers},
            {"name":"Pl", "description":"flux de précipitations liquides", "units": "", "type":Variable.VARIABLE_TYPE_SURFACE, "levels": surfaces},
            {"name":"Pi", "description":"flux de précipitations solides", "units": "", "type":Variable.VARIABLE_TYPE_SURFACE, "levels": surfaces},
            {"name":"E", "description":"flux d'évaporation de surface", "units": "", "type":Variable.VARIABLE_TYPE_SURFACE, "levels": [1]},
            {"name":"apcp", "description":"accumulation totale de pluie", "units": "kg.m^2", "type":Variable.VARIABLE_TYPE_SURFACE, "levels": [1]},
            {"name":"acsnow", "description":"accumulation totale de neige", "units": "kg.m^2", "type":Variable.VARIABLE_TYPE_SURFACE, "levels": [1]}
        ];
}

/**
 * Donne la liste des variables internes du modèle.
 * @returns {Array} */
BaroclinicModel.prototype.getInternalVariables = function()
{
    var layers = this.getLayerLevels();
    var surfaces = this.getSurfaceLevels();
    return [
            {"name":"f", "description":"facteur de coriolis", "units":"", "type":Variable.VARIABLE_TYPE_SURFACE, "levels": [1]},
            {"name":"m", "description":"facteur d'échelle", "units": "", "type":Variable.VARIABLE_TYPE_SURFACE, "levels": [1]},
            {"name":"alpha_couplage", "description":"coefficient de couplage alpha", "units": "", "type":Variable.VARIABLE_TYPE_SURFACE, "levels": [1]},
            {"name":"Dtilde", "description":"divergence de quantité de mouvement", "units": "", "type":Variable.VARIABLE_TYPE_LAYER, "levels": layers},
            {"name":"DtildeDs", "description":"intégration de dtilde*ds sur la verticale", "units": "", "type":Variable.VARIABLE_TYPE_LAYER, "levels": layers},
            {"name":"p", "description":"pression sur tous les niveaux s du modèle", "units": "", "type":Variable.VARIABLE_TYPE_SURFACE, "levels": this.sigma},
            {"name":"Z", "description":"ln(ps)", "units": "", "type":Variable.VARIABLE_TYPE_SURFACE, "levels": [1]},
            {"name":"Sz", "description":"tendance de pression de surface", "units": "", "type":Variable.VARIABLE_TYPE_SURFACE, "levels": [1]},
            {"name":"Su", "description":"tendance de la composante u du vent", "units": "", "type":Variable.VARIABLE_TYPE_LAYER, "levels": layers},
            {"name":"Sv", "description":"tendance de la composante v du vent", "units": "", "type":Variable.VARIABLE_TYPE_LAYER, "levels": layers},
            {"name":"St", "description":"tendence de la temperature", "units": "", "type":Variable.VARIABLE_TYPE_LAYER, "levels": layers},
            {"name":"Sqv", "description":"tendence de l'humidité spécifique", "units": "", "type":Variable.VARIABLE_TYPE_LAYER, "levels": layers},
            {"name":"dQv", "description":"variation de qv dûe aux processus physiques", "units": "", "type":Variable.VARIABLE_TYPE_LAYER, "levels": layers},
            {"name":"dPs", "description":"variation de Ps dûe aux processus physiques", "units": "", "type":Variable.VARIABLE_TYPE_SURFACE, "levels": [1]},
            {"name":"dSigmaf", "description":"variation de Sigmaf dûe aux processus physiques", "units": "", "type":Variable.VARIABLE_TYPE_SURFACE, "levels": surfaces},
            {"name":"Cph", "description":"enthalpie totale du mélange", "units": "", "type":Variable.VARIABLE_TYPE_LAYER, "levels": layers},
            {"name":"Q", "description":"variation d'enthalapie", "units": "", "type":Variable.VARIABLE_TYPE_LAYER, "levels": layers},
            {"name":"Pl_1", "description":"pseudo-flux vapeur->eau de nuage", "units": "", "type":Variable.VARIABLE_TYPE_SURFACE, "levels": layers},
            {"name":"Pl_2", "description":"pesudo-flux eau de nuage->eau précipitante", "units": "", "type":Variable.VARIABLE_TYPE_SURFACE, "levels": layers},
            {"name":"Pl_3", "description":"pseudo-flux eau précipitante->vapeur", "units": "", "type":Variable.VARIABLE_TYPE_SURFACE, "levels": layers},
            {"name":"Pi_1", "description":"pseudo-flux vapeur->glace", "units": "", "type":Variable.VARIABLE_TYPE_SURFACE, "levels": layers},
            {"name":"Pi_2", "description":"pesudo-flux glace->neige", "units": "", "type":Variable.VARIABLE_TYPE_SURFACE, "levels": layers},
            {"name":"Pi_3", "description":"pseudo-flux neige->vapeur", "units": "", "type":Variable.VARIABLE_TYPE_SURFACE, "levels": layers},
            {"name":"debug3d", "description":"variable cotenant du debug", "units": "", "type":Variable.VARIABLE_TYPE_LAYER, "levels": layers}
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
