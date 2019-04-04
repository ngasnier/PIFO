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


import { DynamicsCore } from "./DynamicsCore.js";
import { Model } from "./Model.js"
import { Variable } from "./Variable.js"
import { VariableDescription } from "./VariableDescription.js"

/**
 * Coeur dynamique barocline, équations hydrostatiques, calcul explicite.
 * 
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
 * @type type
 */
export class BaroclinicHydrostaticCore extends DynamicsCore
{
    constructor()
    {
        super();

        this.dampFactor = 0;//1000000.0;
        
        this.alpha = []; // alphak = ln sigmaktilde/sigmak
        this.beta = []; // betak = ln sigmak/sigmak-1tilde
        this.gamma = []; // gammak = alphak + betak = ln sigmaktilde/sigmak-1tilde
        
        this.sigma = [];
        this.dsigma = [];
    }
    
    getVariablesDescriptions()
    {
        return [
            // Variables prognostiques de base
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_PRONOSTIC, name:"Z", description:"ln(ps)", units:"ln(pa)", offsetx:0, offsety:0, scale:false, verticalPosition:VariableDescription.VERTICAL_POSITION_SURFACE, number:VariableDescription.NUMBER_TYPE_SCALAR}),
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_PRONOSTIC, name:"U", description:"U component of wind", units:"m.s^-1", offsetx:1, offsety:0, scale:true, verticalPosition:VariableDescription.VERTICAL_POSITION_LAYER, number:VariableDescription.NUMBER_TYPE_U_VECTOR}),
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_PRONOSTIC, name:"V", description:"V component of wind", units:"m.s^-1", offsetx:0, offsety:1, scale:true, verticalPosition:VariableDescription.VERTICAL_POSITION_LAYER, number:VariableDescription.NUMBER_TYPE_V_VECTOR}),
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_PRONOSTIC, name:"T", description:"temperature", units:"K", offsetx:0, offsety:0, scale:false, verticalPosition:VariableDescription.VERTICAL_POSITION_LAYER, number:VariableDescription.NUMBER_TYPE_SCALAR}),
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_PRONOSTIC, name:"qv", description:"specific humidity", units:"kg/kg", offsetx:0, offsety:0, scale:false, verticalPosition:VariableDescription.VERTICAL_POSITION_LAYER, number:VariableDescription.NUMBER_TYPE_SCALAR}),
            
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_INTERNAL, name:"Z_tdcy", description:"Z tendency", units:"", offsetx:0, offsety:0, scale:false, verticalPosition:VariableDescription.VERTICAL_POSITION_SURFACE, number:VariableDescription.NUMBER_TYPE_SCALAR}),
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_INTERNAL, name:"U_tdcy", description:"U tendency", units:"", offsetx:1, offsety:0, scale:true, verticalPosition:VariableDescription.VERTICAL_POSITION_LAYER, number:VariableDescription.NUMBER_TYPE_U_VECTOR}),
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_INTERNAL, name:"V_tdcy", description:"V tendency", units:"", offsetx:0, offsety:1, scale:true, verticalPosition:VariableDescription.VERTICAL_POSITION_LAYER, number:VariableDescription.NUMBER_TYPE_V_VECTOR}),
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_INTERNAL, name:"T_tdcy", description:"temperature tendency", units:"", offsetx:0, offsety:0, scale:false, verticalPosition:VariableDescription.VERTICAL_POSITION_LAYER, number:VariableDescription.NUMBER_TYPE_SCALAR}),
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_INTERNAL, name:"qv_tdcy", description:"qv tendency", units:"", offsetx:0, offsety:0, scale:false, verticalPosition:VariableDescription.VERTICAL_POSITION_LAYER, number:VariableDescription.NUMBER_TYPE_SCALAR}),

            // Variables diagnostiques de base
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_DIAGNOSTIC, name:"ps", description:"surface pressure", units:"pa", offsetx:0, offsety:0, verticalPosition:VariableDescription.VERTICAL_POSITION_SURFACE}),

            // TODO : ces deux variables sont à usage interne aux calculs... 
            // Obligé de les mettre en catégorie diagnostique pour lancer calcXXX()...
            // peut-être qu'il faudrait avoir un paramètre "à calculer" avec
            // des dépendances entre variables pour l'ordre. A réfléchir
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_DIAGNOSTIC, name:"Dtilde", description:"divergence of motion quantity", units:"", offsetx:0, offsety:0, scale:false, verticalPosition:VariableDescription.VERTICAL_POSITION_LAYER, number:VariableDescription.NUMBER_TYPE_SCALAR}),
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_DIAGNOSTIC, name:"DtildeDs", description:"vertical integration of Dtilde", units:"", offsetx:0, offsety:0, scale:false, verticalPosition:VariableDescription.VERTICAL_POSITION_LAYER, number:VariableDescription.NUMBER_TYPE_SCALAR}),
            
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_DIAGNOSTIC, name:"p", description:"pressure at each vertical coordodinate", units: "pa", offsetx:0, offsety:0, verticalPosition:VariableDescription.VERTICAL_POSITION_ALL}),
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_DIAGNOSTIC, name:"sigmaf", description:"vertical velocity", units:"sigma/s^1", offsetx:0, offsety:0, verticalPosition:VariableDescription.VERTICAL_POSITION_INTERLAYER}),
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_DIAGNOSTIC, name:"phi", description:"geopotential of the layer", units:"m^2.s^-1", offsetx:0, offsety:0, verticalPosition:VariableDescription.VERTICAL_POSITION_LAYER}),
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_DIAGNOSTIC, name:"K", description:"kinetic energy", units:"J", offsetx:0, offsety:0, verticalPosition:VariableDescription.VERTICAL_POSITION_LAYER}),
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_DIAGNOSTIC, name:"tourbillon", description:"absolute vorticity potential", units: "S^-1", offsetx:0, offsety:0, verticalPosition:VariableDescription.VERTICAL_POSITION_LAYER}),
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_DIAGNOSTIC, name:"divergence", description:"wind divergence", units: "", offsetx:0, offsety:0, verticalPosition:VariableDescription.VERTICAL_POSITION_LAYER}),
            
            // TODO : Devrait être calculé après la physique ?
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_POST_PHYSICS_DIAGNOSTIC, name:"dQv", description:"qv tendency due to physics parameterisations", units:"", offsetx:0, offsety:0, scale:false, verticalPosition:VariableDescription.VERTICAL_POSITION_INTERLAYER, number:VariableDescription.NUMBER_TYPE_SCALAR}),
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_POST_PHYSICS_DIAGNOSTIC, name:"Cph", description:"enthalpie totale du mélange", units: "", verticalPosition:VariableDescription.VERTICAL_POSITION_LAYER, number:VariableDescription.NUMBER_TYPE_SCALAR}),
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_POST_PHYSICS_DIAGNOSTIC, name:"dPs", description:"pressure surface tendency due to physics parameterisations", units:"", offsetx:0, offsety:0, scale:false, verticalPosition:VariableDescription.VERTICAL_POSITION_SURFACE, number:VariableDescription.NUMBER_TYPE_SCALAR}),
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_POST_PHYSICS_DIAGNOSTIC, name:"Q", description:"variation d'enthalpie", units: "", verticalPosition:VariableDescription.VERTICAL_POSITION_LAYER, number:VariableDescription.NUMBER_TYPE_SCALAR}),
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_POST_PHYSICS_DIAGNOSTIC, name:"apcp", description:"accumulation totale de pluie", units: "kg.m^2", verticalPosition:VariableDescription.VERTICAL_POSITION_SURFACE, number:VariableDescription.NUMBER_TYPE_SCALAR}),
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_POST_PHYSICS_DIAGNOSTIC, name:"acsnow", description:"accumulation totale de neige", units: "kg.m^2", verticalPosition:VariableDescription.VERTICAL_POSITION_SURFACE, number:VariableDescription.NUMBER_TYPE_SCALAR}),
            
            // Paramètres géophysiques
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_PARAMETER, name:"f", description:"coriolis factor", units:"", offsetx:1, offsety:1, verticalPosition:VariableDescription.VERTICAL_POSITION_SURFACE}),
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_PARAMETER, name:"m", description:"scaling factor", units: "", verticalPosition:VariableDescription.VERTICAL_POSITION_SURFACE}),
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_PARAMETER, name:"sfcgeop", description:"surface geopotential", units: "m^2.s^-1", verticalPosition:VariableDescription.VERTICAL_POSITION_SURFACE, number:VariableDescription.NUMBER_TYPE_SCALAR}),

            // Variables pour le contexte physiques non adiabatique
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_INTERNAL, name:"dSigmaf", description:"vertical velocity tendency due to physics parameterisations", units:"", offsetx:0, offsety:0, scale:false, verticalPosition:VariableDescription.VERTICAL_POSITION_INTERLAYER, number:VariableDescription.NUMBER_TYPE_SCALAR}),
            
            // Variables pour les coeurs physique -- A déplacer vers les coeurs
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_INTERNAL, name:"Pl_1", description:"pseudo-flux vapeur->eau de nuage", units: "", verticalPosition:VariableDescription.VERTICAL_POSITION_INTERLAYER, number:VariableDescription.NUMBER_TYPE_SCALAR}),
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_INTERNAL, name:"Pl_2", description:"pesudo-flux eau de nuage->eau précipitante", units: "", verticalPosition:VariableDescription.VERTICAL_POSITION_INTERLAYER, number:VariableDescription.NUMBER_TYPE_SCALAR}),
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_INTERNAL, name:"Pl_3", description:"pseudo-flux eau précipitante->vapeur", units: "", verticalPosition:VariableDescription.VERTICAL_POSITION_INTERLAYER, number:VariableDescription.NUMBER_TYPE_SCALAR}),
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_INTERNAL, name:"Pi_1", description:"pseudo-flux vapeur->glace", units: "", verticalPosition:VariableDescription.VERTICAL_POSITION_INTERLAYER, number:VariableDescription.NUMBER_TYPE_SCALAR}),
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_INTERNAL, name:"Pi_2", description:"pesudo-flux glace->neige", units: "", verticalPosition:VariableDescription.VERTICAL_POSITION_INTERLAYER, number:VariableDescription.NUMBER_TYPE_SCALAR}),
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_INTERNAL, name:"Pi_3", description:"pseudo-flux neige->vapeur", units: "", verticalPosition:VariableDescription.VERTICAL_POSITION_INTERLAYER, number:VariableDescription.NUMBER_TYPE_SCALAR}),
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_INTERNAL, name:"Pl", description:"flux de précipitations liquides", units: "", verticalPosition:VariableDescription.VERTICAL_POSITION_INTERLAYER, number:VariableDescription.NUMBER_TYPE_SCALAR}),
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_INTERNAL, name:"Pi", description:"flux de précipitations solides", units: "", verticalPosition:VariableDescription.VERTICAL_POSITION_INTERLAYER, number:VariableDescription.NUMBER_TYPE_SCALAR}),
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_INTERNAL, name:"E", description:"flux d'évaporation de surface", units: "", verticalPosition:VariableDescription.VERTICAL_POSITION_SURFACE, number:VariableDescription.NUMBER_TYPE_SCALAR})
        ];
    }
    
    setup()
    {
        super.setup();
        
        this.sigma = this._model.verticalCoords;
        this.dsigma = [];
        for (var k=0;k<this._model.nbLayers;k++)
        {
            this.dsigma[k] = this._model.surfacesCoords[k+1]-this._model.surfacesCoords[k];
        }
     
        for (var k=1;k<this._model.nbSurfaces;k++)
        {
            var a = Math.log(this.sigma[k*2]/this.sigma[k*2-1]);
            var b = Math.log(this.sigma[k*2-1]/this.sigma[k*2-2]);
            this.alpha.push(a);
            this.beta.push(b);
            this.gamma.push(a+b);
        }        
    }
    
    calcps()
    {
        for (var i=0;i<this._model.width*this._model.height;i++)
        {
            this._model.ps[i] = Math.exp(this._model.Z[i])+this._model.dPs[i];
        }
    }
        
    
    calcp()
    {
        var n = this._model.nbLev;
        var i=0, k = 0;
        for (k=0;k<n;k++)
        {
            for (i=0;i<this._model.width*this._model.height;i++)
            {
                this._model.p[k][i] = this.sigma[k]*this._model.ps[i];
            }
        }
    }
    
    calcphi()
    {
        var n = this._model.nbLayers;
        var nb = this._model.height*this._model.width;
        var l;  
        var acc = 0;
        var i=0, k=0;
        if (this._model.verticalStaggering==Model.VS_LORENTZ)
        {
            for (k=0;k<n;k++)
            {
                for (i=0;i<nb;i++)
                {
                    // Verif Ok 16/06/2018
                    acc=0;
                    for (l=k+1;l<n;l++)
                    {
                        acc += this.gamma[l]*Model.R*this._model.T[l][i];
                    }
                    this._model.phi[k][i] = this._model.sfcgeop[i]+acc+this.alpha[k]*Model.R*this._model.T[k][i];
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
                        acc += this.gamma[l]*Model.R*0.5*(this._model.T[l][i]+this._model.T[l+1][i]);
                    }
                    this._model.phi[k][i] = this._model.sfcgeop[i]+acc+this._model.gamma[k]*Model.R*0.5*(this._model.T[k][i]+this._model.T[k+1][i]);
                }
            }
        }
    }
    
    calcK()
    {
        var i = 0;
        var u1 = 0, u2 = 0;
        var v1 = 0, v2 = 0;
        var x, y;
        for (var k=0;k<this._model.U.length;k++)
        {
            i = this._model.width+1;
            for (y=1;y<this._model.height-1;y++)
            {
                for (x=1;x<this._model.width-1;x++,i++)
                {
                    // Verif Ok 15/06/2018
                    u1 = this._model.U[k][i-1];
                    u2 = this._model.U[k][i];
                    v1 = this._model.V[k][i];
                    v2 = this._model.V[k][i-this._model.width]
                    this._model.K[k][i] = this._model.m[i]*this._model.m[i]*(
                            0.5*(u1*u1 + u2*u2)
                            +0.5*(v1*v1 + v2*v2))/2;
                }
                i+=2;
            }
        }
    }
    
    calctourbillon()
    {
        var i = 0;
        var m1=0, m2=0, m3=0, m4=0;
        var x, y;

        for (var k=0;k<this._model.U.length;k++)
        {
            i = this._model.width+1;
            for (y=1;y<this._model.height-1;y++)
            {
                for (x=1;x<this._model.width-1;x++,i++)
                {
                    m1 = this._model.m[i+this._model.width];
                    m2 = this._model.m[i+1+this._model.width];
                    m3 = this._model.m[i];
                    m4 = this._model.m[i+1];

                    // Verif Ok 13/06/2018
                    this._model.tourbillon[k][i] = (
                            0.25*(m1*m1+m2*m2+m3*m3+m4*m4)
                            *(
                                 (this._model.V[k][i+1]-this._model.V[k][i])/this._model.dx - 
                                 (this._model.U[k][i]-this._model.U[k][i+this._model.width])/this._model.dy
                             )
                            +this._model.f[i]
                        )
                        /(0.25*(this._model.ps[i]+this._model.ps[i+1]
                            +this._model.ps[i+this._model.width]+this._model.ps[i+this._model.width+1]));
                }
                i+=2;
            }
        }
    }

    calcsigmaf()
    {
        var n = this._model.sigmaf.length-2;
        var nb = this._model.width*this._model.height;
        var k = 1, i=0;
        // Commence à 1 car sommet toujours zero
        for (k=1;k<this._model.sigmaf.length;k++)
        {
            var kg = this._model.surfacesIndices[k];
            for (i=0;i<nb;i++)
            {
                this._model.sigmaf[k][i] = this._model.m[i]*this._model.m[i]*(

                        (this.sigma[kg]*this._model.DtildeDs[n][i]
                        -this._model.DtildeDs[k-1][i])
                    )
                    +this._model.dSigmaf[k][i];
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


    calcDtilde() 
    {
        var i = 0;
        var x, y, k;
        var nb = this._model.width*this._model.height;
        for (k=0;k<this._model.nbLayers;k++)
        {
            i = this._model.width+1;
            for (y=1;y<this._model.height-1;y++)
            {
                for(x=1;x<this._model.width-1;x++,i++)
                {
                    // Verif Ok 15/06/2018
                    this._model.Dtilde[k][i] = 
                        ((this._model.ps[i]+this._model.ps[i+1])*this._model.U[k][i]-
                            (this._model.ps[i-1]+this._model.ps[i])*this._model.U[k][i-1])*0.5/this._model.dx
                        +((this._model.ps[i-this._model.width]+this._model.ps[i])*this._model.V[k][i-this._model.width]-
                            (this._model.ps[i]+this._model.ps[i+this._model.width])*this._model.V[k][i])*0.5/this._model.dy;
                }
                i+=2;
            }
        }
    }
    
    calcDtildeDs()
    {
        // Verif Ok 15/06/2018
        // Integre l'expression Dtilde*dsigma sur la verticale
        var nb = this._model.width*this._model.height;
        for (var i=0;i<nb;i++)
        {
            this._model.DtildeDs[0][i] = this._model.Dtilde[0][i]*this.dsigma[0];
        }
        for (var k=1;k<this._model.nbLayers;k++)
        {
            for (i=0;i<nb;i++)
            {
                this._model.DtildeDs[k][i] = this._model.DtildeDs[k-1][i]+this._model.Dtilde[k][i]*this.dsigma[k];
            }
        }
    }

    calcdivergence()
    {
        var i;
        for (var k=0;k<this._model.nbLayers;k++)
        {
            i = this._model.width+1;
            for (var y=1;y<this._model.height-1;y++)
            {
                for(var x=1;x<this._model.width-1;x++,i++)
                {
                    this._model.divergence[k][i] = (this._model.U[k][i]-this._model.U[k][i-1])/this._model.dx
                            +(this._model.V[k][i-this._model.width]-this._model.V[k][i])/this._model.dy;
                }
                i+=2;
            }
        }
    }
    
    calcCph()
    {
        var i = 0;
        var n = this.model.nbLayers;
        for (var k=0;k<n;k++)
        {
            for(i=0;i<this._model.Cph[k].length;i++)
            {
                this._model.Cph[k][i] = Model.Cp+Model.Cp_v*this._model.qv[k][i];
            }
        }
    }
    
    calcQ()
    {
        var i = 0;
        var x, y;
        var n = this.model.nbLayers;
        var k1, kn1;
        for (var k=0;k<n;k++)
        {
            i = this._model.width+1;
            if (k==0) kn1 = k; else kn1 = k-1;
            if (k==n-1) k1 = k; else k1 = k+1;
            for (y=1;y<this._model.height-1;y++)
            {
                for(x=1;x<this._model.width-1;x++,i++)
                {                       
                    this._model.Q[k][i] = -Model.g/(2*this._model.ps[i]*this.dsigma[k])
                        *(
                            // Terme de contribution du changement de pression dûe au changement de 
                            // masse à cause du flux de précipitation
                            // (si j'ai bien tout compris...)
                            ((
                                0.5*(Model.Cp_l-Model.Cp)*this._model.Pl[k+1][i]/(this._model.dt*2)*(this._model.T[k1][i]+this._model.T[k][i])

                                +0.5*(Model.Cp_i-Model.Cp)*this._model.Pi[k+1][i]/(this._model.dt*2)*(this._model.T[k1][i]+this._model.T[k][i])
                            )

                            // Terme de contribution de la chaleur latente
                            +(-Model.Ll*(this._model.Pl_1[k][i]-this._model.Pl_3[k][i]) - -Model.Li*(this._model.Pi_1[k][i]-this._model.Pi_3[k][i])))
                        -
                            ((
                                0.5*(Model.Cp_l-Model.Cp)*this._model.Pl[k][i]/(this._model.dt*2)*(this._model.T[k][i]+this._model.T[kn1][i])

                                +0.5*(Model.Cp_i-Model.Cp)*this._model.Pi[k][i]/(this._model.dt*2)*(this._model.T[k][i]+this._model.T[kn1][i])
                            )

                            // Terme de contribution de la chaleur latente
                            +(-Model.Ll*(this._model.Pl_1[k][i]-this._model.Pl_3[k][i]) - -Model.Li*(this._model.Pi_1[k][i]-this._model.Pi_3[k][i])))
                        );
                }
                i+=2;
            }

        }
    }
    
    calcdQv()
    {
        var i = 0;
        var x, y;
        var m2;
        var n = this._model.nbLayers;
        var k1, kn1;
        for (var k=0;k<n;k++)
        {
            i = this._model.width+1;
            if (k==0) kn1 = k; else kn1 = k-1;
            if (k==n-1) k1 = k; else k1 = k+1;
            for (y=1;y<this._model.height-1;y++)
            {
                for(x=1;x<this._model.width-1;x++,i++)
                {
                    // Différentiel sur la verticale ????
                    this._model.dQv[k][i] = Model.g /(2*this._model.ps[i]*this.dsigma[k])
                            *(
                             (this._model.Pl_3[k+1][i]+this._model.Pi_3[k+1][i] - this._model.Pl_1[k+1][i] - this._model.Pi_1[k+1][i])
                            - (this._model.Pl_3[k][i]+this._model.Pi_3[k][i] - this._model.Pl_1[k][i] - this._model.Pi_1[k][i])

                            + 0.5*(this._model.qv[k][i]+this._model.qv[k1][i])*(this._model.Pl[k+1][i] + this._model.Pi[k+1][i])/(this._model.dt*2)
                          -
                            + 0.5*(this._model.qv[k][i]+this._model.qv[kn1][i])*(this._model.Pl[k][i] + this._model.Pi[k][i])/(this._model.dt*2)
                            );
                }
                i+=2;
            }
        }
    }
    
    calcdPs()
    {
        for (var i=0;i<this._model.width*this._model.height-1;i++)
        {
            this._model.dPs[i] = -Model.g * (this._model.Pl[this._model.nbLayers][i])/this._model.ps[i]; // +Pi-E
        }
    }
            
    calcQ()
    {
        var i = 0;
        var x, y;
        var n = this.nbLayers;
        var k1, kn1;
        for (var k=0;k<n;k++)
        {
            i = this._model.width+1;
            if (k==0) kn1 = k; else kn1 = k-1;
            if (k==n-1) k1 = k; else k1 = k+1;
            for (y=1;y<this._model.height-1;y++)
            {
                for(x=1;x<this._model.width-1;x++,i++)
                {                       
                    this._model.Q[k][i] = -Model.g/(2*this._model.ps[i]*this.dsigma[k])
                        *(
                            // Terme de contribution du changement de pression dûe au changement de 
                            // masse à cause du flux de précipitation
                            // (si j'ai bien tout compris...)
                            ((
                                0.5*(Model.Cp_l-Model.Cp)*this._model.Pl[k+1][i]/(this._model.dt*2)*(this._model.T[k1][i]+this._model.T[k][i])

                                +0.5*(Model.Cp_i-Model.Cp)*this._model.Pi[k+1][i]/(this._model.dt*2)*(this._model.T[k1][i]+this._model.T[k][i])
                            )

                            // Terme de contribution de la chaleur latente
                            +(-Model.Ll*(this._model.Pl_1[k][i]-this._model.Pl_3[k][i]) - -Model.Li*(this._model.Pi_1[k][i]-this._model.Pi_3[k][i])))
                        -
                            ((
                                0.5*(Model.Cp_l-Model.Cp)*this._model.Pl[k][i]/(this._model.dt*2)*(this._model.T[k][i]+this._model.T[kn1][i])

                                +0.5*(Model.Cp_i-Model.Cp)*this._model.Pi[k][i]/(this._model.dt*2)*(this._model.T[k][i]+this._model.T[kn1][i])
                            )

                            // Terme de contribution de la chaleur latente
                            +(-Model.Ll*(this._model.Pl_1[k][i]-this._model.Pl_3[k][i]) - -Model.Li*(this._model.Pi_1[k][i]-this._model.Pi_3[k][i])))
                        );
                }
                i+=2;
            }

        }
    }
    
    calcapcp()
    {
        Variable.a_bc2d(this._model.apcp, this._model.Pl[this._model.nbLayers], 1, this._model.apcp);
    }
    
    calcacsnow()
    {
        Variable.a_bc2d(this._model.acsnow, this._model.Pi[this._model.nbLayers], 1, this._model.acsnow);
    }
            
    calcSuCouche(k)
    {
        var xi = 0;
        var psvk = 0;
        var d_ktilde_1, d_ktilde_2, d_ktilde_moins_1_1, d_ktilde_moins_1_2;
        var u_k_plus_1, u_k, u_k_moins_1;
        var adv=0, rtz=0;
        var kphi=0;
        var damp=0;
        var i = this._model.width+1;
        var x, y;
        for (y=1;y<this._model.height-1;y++)
        {
            for (x=1;x<this._model.width-1;x++,i++)
            {
                if (k<this._model.U.length-1)
                {
                    d_ktilde_1 = this._model.sigmaf[k+1][i];
                    d_ktilde_2 = this._model.sigmaf[k+1][i+1];
                    u_k_plus_1 = this._model.U[k+1][i];
                }
                else
                {
                    d_ktilde_1 = 0;
                    d_ktilde_2 = 0;
                    u_k_plus_1 = 0;
                }

                d_ktilde_moins_1_1 = this._model.sigmaf[k][i];
                d_ktilde_moins_1_2 = this._model.sigmaf[k][i+1];

                u_k = this._model.U[k][i];

                if (k>0)
                {
                    u_k_moins_1 = this._model.U[k-1][i];                        
                }
                else 
                {
                    u_k_moins_1 = 0;
                }                        

                // Verif Ok 14/06/2018
                xi = 0.5*(this._model.tourbillon[k][i]+this._model.tourbillon[k][i-this._model.width]); 

                // Verif Ok 14/06/2018
                psvk = (
                        (this._model.ps[i]+this._model.ps[i-this._model.width])*this._model.V[k][i-this._model.width]
                        +(this._model.ps[i+1]+this._model.ps[i+1-this._model.width])*this._model.V[k][i+1-this._model.width]
                        +(this._model.ps[i+1]+this._model.ps[i+1+this._model.width])*this._model.V[k][i+1]
                        +(this._model.ps[i]+this._model.ps[i+this._model.width])*this._model.V[k][i]
                    )/8; 

                // Verif Ok 14/06/2018
                adv = (1/((this._model.ps[i+1]+this._model.ps[i])*this.dsigma[k]))
                    *(
                       0.5*(d_ktilde_1+d_ktilde_2)*(u_k_plus_1-u_k)+0.5*(d_ktilde_moins_1_1+d_ktilde_moins_1_2)*(u_k-u_k_moins_1)
                     );

                // Verif Ok 14/06/2018
                kphi = (this._model.K[k][i+1]+this._model.phi[k][i+1]-this._model.K[k][i]-this._model.phi[k][i])/this._model.dx;

                // Verif Ok 14/06/2018
                rtz = Model.R*0.5*(this._model.T[k][i]+this._model.T[k][i+1])*(this._model.Z[i+1]-this._model.Z[i])/this._model.dx;

                // Divergence damping
                damp = this.dampFactor*(this._model.divergence[k][i+1]-this._model.divergence[k][i])/this._model.dx;

                this._model.U_tdcy[k][i] = xi*psvk - adv - kphi - rtz + damp;
            }
            i+=2;
        }
    }

    calcU_tdcy()
    {
        var n = this._model.nbLayers;
        for (var k=0;k<n;k++)
        {
            this.calcSuCouche(k);
        }
    }    
    
    calcSvCouche(k)
    {
        var xi = 0;
        var psuk = 0;
        var d_ktilde_1, d_ktilde_2, d_ktilde_moins_1_1, d_ktilde_moins_1_2;
        var v_k_plus_1, v_k, v_k_moins_1;
        var adv=0, rtz=0;
        var kphi=0;
        var damp=0;
        var i = this._model.width+1;
        var x, y;
        for (y=1;y<this._model.height-1;y++)
        {
            for(x=1;x<this._model.width-1;x++,i++)
            {
                if (k<this._model.V.length-1)
                {
                    d_ktilde_1 = this._model.sigmaf[k+1][i+this._model.width];
                    d_ktilde_2 = this._model.sigmaf[k+1][i];
                    v_k_plus_1 = this._model.V[k+1][i];
                }
                else
                {
                    d_ktilde_1 = 0;
                    d_ktilde_2 = 0;
                    v_k_plus_1 = 0;
                }

                d_ktilde_moins_1_1 = this._model.sigmaf[k][i+this._model.width];
                d_ktilde_moins_1_2 = this._model.sigmaf[k][i];

                v_k = this._model.V[k][i];

                if (k>0)
                {
                    v_k_moins_1 = this._model.V[k-1][i];
                }
                else
                {
                    v_k_moins_1 = 0;
                }

                // Verif Ok 14/06/2018
                xi = 0.5*(this._model.tourbillon[k][i]+this._model.tourbillon[k][i-1]);

                // Verif Ok 14/06/2018
                psuk = (
                        (this._model.ps[i-1]+this._model.ps[i])*this._model.U[k][i-1]
                        +(this._model.ps[i]+this._model.ps[i+1])*this._model.U[k][i]
                        +(this._model.ps[i+this._model.width]+this._model.ps[i+this._model.width+1])*this._model.U[k][i+this._model.width]
                        +(this._model.ps[i-1+this._model.width]+this._model.ps[i+this._model.width])*this._model.U[k][i-1+this._model.width]
                    )/8;

                // Verif Ok 14/06/2018
                adv = (1/((this._model.ps[i]+this._model.ps[i+this._model.width])*this.dsigma[k]))*(
                       0.5*(d_ktilde_1+d_ktilde_2)*(v_k_plus_1-v_k)+0.5*(d_ktilde_moins_1_1+d_ktilde_moins_1_2)*(v_k-v_k_moins_1));

                // Verif Ok 14/06/2018
                kphi = (this._model.K[k][i]+this._model.phi[k][i]-this._model.K[k][i+this._model.width]-this._model.phi[k][i+this._model.width])/this._model.dy;

                // Verif Ok 14/06/2018
                rtz = Model.R*0.5*(this._model.T[k][i]+this._model.T[k][i+this._model.width])*(this._model.Z[i]-this._model.Z[i+this._model.width])/this._model.dy;

                damp = this.dampFactor*(this._model.divergence[k][i+this._model.width]-this._model.divergence[k][i+this._model.width])/this._model.dy;

                this._model.V_tdcy[k][i] = -xi*psuk - adv - kphi - rtz + damp;
            }
            i+=2;
        }
    }

    calcV_tdcy()
    {
        var n = this.model.nbLayers;
        for (var k=0;k<n;k++)
        {
            this.calcSvCouche(k);
        }            
    }
    
    calcStCouche(k)
    {
        var part1=0, part2=0, part3=0, adv=0;
        var d_ktilde, d_ktilde_moins_1;
        var t_k_plus_1, t_k, t_k_moins_1;
        var integ_dtlds=0;

        var m2 = 0;
        var i= this._model.width+1;
        var x, y;
        for (y=1;y<this._model.height-1;y++)
        {
            for (x=1;x<this._model.width-1;x++,i++)
            {                       
                m2 = this._model.m[i]*this._model.m[i];

                if (k<this._model.T.length-1)
                {
                    d_ktilde = this._model.sigmaf[k+1][i];
                    t_k_plus_1 = this._model.T[k+1][i]; 
                }
                else
                {
                    d_ktilde = 0;
                    t_k_plus_1 = 0;
                }

                d_ktilde_moins_1 = this._model.sigmaf[k][i];
                t_k = this._model.T[k][i];


                if (k>0)
                {
                    t_k_moins_1 = this._model.T[k-1][i];
                    integ_dtlds = this._model.DtildeDs[k-1][i];
                }
                else
                {
                    t_k_moins_1 = 0;
                    integ_dtlds = 0;
                }

                part1 = m2*(
                        ((this._model.ps[i+1]+this._model.ps[i])*this._model.U[k][i]*(this._model.T[k][i+1]-this._model.T[k][i])
                        +(this._model.ps[i]+this._model.ps[i-1])*this._model.U[k][i-1]*(this._model.T[k][i]-this._model.T[k][i-1]))/(4*this._model.dx)

                        +((this._model.ps[i-this._model.width]+this._model.ps[i])*this._model.V[k][i-this._model.width]*(this._model.T[k][i-this._model.width]-this._model.T[k][i])
                        +(this._model.ps[i]+this._model.ps[i+this._model.width])*this._model.V[k][i]*(this._model.T[k][i]-this._model.T[k][i+this._model.width]))/(4*this._model.dy)
                    )/this._model.ps[i];

                // Verif Ok 14/06/2018
                // TODO : y'a une coquille dans ce terme, c'est lui qui cause l'instabilité
                adv = (d_ktilde*(t_k_plus_1-t_k)+d_ktilde_moins_1*(t_k-t_k_moins_1)) / (this._model.ps[i]*2*this.dsigma[k]);

                // Verif Ok 15/06/2018
                part2 = Model.R*this._model.T[k][i]*m2
                            *(this.gamma[k]*integ_dtlds+this.alpha[k]*this._model.Dtilde[k][i]*this.dsigma[k])
                        /(this._model.Cph[k][i]*this._model.ps[i]*this.dsigma[k]); // Model.Cp

                // Verif Ok 15/06/2018
                part3 = Model.R*m2 *(
                        (
                            (this._model.ps[i]+this._model.ps[i+1])*this._model.U[k][i]*(this._model.T[k][i]+this._model.T[k][i+1])*(this._model.Z[i+1]-this._model.Z[i])
                            +(this._model.ps[i]+this._model.ps[i-1])*this._model.U[k][i-1]*(this._model.T[k][i]+this._model.T[k][i-1])*(this._model.Z[i]-this._model.Z[i-1])
                        )/(8*this._model.dx)
                    +
                        ( 
                            (this._model.ps[i]+this._model.ps[i-this._model.width])*this._model.V[k][i-this._model.width]*(this._model.T[k][i]+this._model.T[k][i-this._model.width])*(this._model.Z[i-this._model.width]-this._model.Z[i])
                            +(this._model.ps[i]+this._model.ps[i+this._model.width])*this._model.V[k][i]*(this._model.T[k][i]+this._model.T[k][i+this._model.width])*(this._model.Z[i]-this._model.Z[i+this._model.width])
                        )/(8*this._model.dy)

                    ) / (this._model.Cph[k][i]*this._model.ps[i]);

                this._model.T_tdcy[k][i] = - part1 - adv - part2 + part3  

                        // complage thermodynamique avec les paramétrisations
                        + (this._model.Q[k][i]  
                        + Model.R * this._model.T[k][i] * this._model.Z_tdcy[i]/this._model.dt)/this._model.Cph[k][i]
            }
            i+=2;
        }
    }

    calcT_tdcy()
    {
        var n = this._model.nbLayers;
        for (var k=0;k<n;k++)
        {
            this.calcStCouche(k);
        }
    }
    
    calcZ_tdcy()
    {
        var n = this._model.DtildeDs.length-1;
        var i = 1;
        var x, y;
        for (y=1;y<this._model.height-1;y++)
        {
            for (x=1;x<this._model.width-1;x++,i++)
            {
                this._model.Z_tdcy[i] = -this._model.m[i]*this._model.m[i]*this._model.DtildeDs[n][i]/this._model.ps[i]+this._model.dPs[i];
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
    calcTransportCouche(q, dq, sq, k)
    {
        var part1=0, adv=0;
        var d_ktilde, d_ktilde_moins_1;
        var q_k_plus_1, q_k, q_k_moins_1;

        var m2 = 0;
        var i = this._model.width+1;
        var x, y;
        for (y=1;y<this._model.height-1;y++)
        {
            for(x=1;x<this._model.width-1;x++,i++)
            {
                m2 = this._model.m[i]*this._model.m[i];

                if (k<q.length-1)
                {
                    d_ktilde = this._model.sigmaf[k+1][i];
                    q_k_plus_1 = q[k+1][i];                        
                }
                else
                {
                    d_ktilde = 0;
                    q_k_plus_1 = 0;
                }

                d_ktilde_moins_1 = this._model.sigmaf[k][i];
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
                        ((this._model.ps[i+1]+this._model.ps[i])*this._model.U[k][i]*(q[k][i+1]-q[k][i])
                        +(this._model.ps[i]+this._model.ps[i-1])*this._model.U[k][i-1]*(q[k][i]-q[k][i-1]))/(4*this._model.dx)

                        +((this._model.ps[i-this._model.width]+this._model.ps[i])*this._model.V[k][i-this._model.width]*(q[k][i-this._model.width]-q[k][i])
                        +(this._model.ps[i]+this._model.ps[i+this._model.width])*this._model.V[k][i]*(q[k][i]-q[k][i+this._model.width]))/(4*this._model.dy)
                    )/this._model.ps[i];

                // Terme d'advection verticale
                adv = (d_ktilde*(q_k_plus_1-q_k)+d_ktilde_moins_1*(q_k-q_k_moins_1)) / (this._model.ps[i]*2*this.dsigma[k]);

                sq[k][i] = - part1 - adv + dq[k][i];
            }
            i+=2;
        }
    }
    
    calcqv_tdcy()
    {
        var n = this.model.nbLayers;
        for (var k=0;k<n;k++)
        {
            this.calcTransportCouche(this.model.qv, this.model.dQv, this.model.qv_tdcy, k);
        }
    }    
}
