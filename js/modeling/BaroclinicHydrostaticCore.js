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
 * <p>Modèle coordonnée vertical sigma pure en grille C</p>
 * 
 * <p>Disposition de la grille : </p>
 * <pre>
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
 * </pre>
 *               
 * <p>Disposition verticale pour N niveaux :</p>
 * <pre>
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
 * </pre>
 * 
 *
 * <p>Indices pour le calcul des dérivées :</p>
 * <pre>
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
 * </pre>            
 *
 * @type type
 */
export class BaroclinicHydrostaticCore extends DynamicsCore
{
    constructor()
    {
        super();
        this.diffusionFactor = 1000000.0;
        this._dampingCoef = 0.1;

        this._diffusionCoef = 0.1;
        this.spatialDiffusionFactor = 1000000.0;
        
        this.alpha = []; // alphak = ln sigmaktilde/sigmak
        this.beta = []; // betak = ln sigmak/sigmak-1tilde
        this.gamma = []; // gammak = alphak + betak = ln sigmaktilde/sigmak-1tilde
        
        this.sigma = [];
        this.dsigma = [];
    }
    
    get dampingCoef()
    {
        return this._dampingCoef;
    }
    
    set dampingCoef(coef)
    {
        this._dampingCoef = coef;
        if (this._model!=null)
        {
            this.diffusionFactor = (this._dampingCoef * this._model.dx*this._model.dx) / (4 * this._model.dt);            
        }
    }

    get diffusionCoef()
    {
        return this._diffusionCoef;
    }
    
    set diffusionCoef(coef)
    {
        this._diffusionCoef = coef;
        if (this._model!=null)
        {
            this.spatialDiffusionFactor = (this._diffusionCoef * this._model.dx*this._model.dx) / (4 * this._model.dt);            
        }
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
        
        this.diffusionFactor = (this._dampingCoef * this._model.dx*this._model.dx) / (4 * this._model.dt);
        console.log("diffusion : "+this.diffusionFactor);
        this.spatialDiffusionFactor = (this._diffusionCoef * this._model.dx*this._model.dx) / (4 * this._model.dt);
        console.log("spatial diffusion : "+this.spatialDiffusionFactor);
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
        var width = this._model.width;
        var height = this._model.height;
        var ps = this._model.ps;
        var Z = this._model.Z;
        var dPs = this._model.dPs;

        for (var i=0;i<width*height;i++)
        {
            ps[i] = Math.exp(Z[i])+dPs[i];
        }
    }
        
    
    calcp()
    {
        var width = this._model.width;
        var height = this._model.height;
        var p = this._model.p;
        var ps = this._model.ps;

        var n = this._model.nbLev;
        var i=0, k = 0;
        for (k=0;k<n;k++)
        {
            for (i=0;i<width*height;i++)
            {
                p[k][i] = this.sigma[k]*ps[i];
            }
        }
    }
    
    calcphi()
    {
        var width = this._model.width;
        var height = this._model.height;
        var m = this._model.m;
        var T = this._model.T;
        var sfcgeop = this._model.sfcgeop;
        var phi = this._model.phi;

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
                        acc += this.gamma[l]*Model.R*T[l][i];
                    }
                    phi[k][i] = sfcgeop[i]+acc+this.alpha[k]*Model.R*T[k][i];
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
                        acc += this.gamma[l]*Model.R*0.5*(T[l][i]+T[l+1][i]);
                    }
                    phi[k][i] = sfcgeop[i]+acc+gamma[k]*Model.R*0.5*(T[k][i]+T[k+1][i]);
                }
            }
        }
    }
    
    calcK()
    {
        var width = this._model.width;
        var height = this._model.height;
        var m = this._model.m;
        var U = this._model.U;
        var V = this._model.V;
        var f = this._model.f;
        var K = this._model.K;
        var ps = this._model.ps;

        var i = 0;
        var u1 = 0, u2 = 0;
        var v1 = 0, v2 = 0;
        var x, y;
        for (var k=0;k<U.length;k++)
        {
            i = width+1;
            for (y=1;y<height-1;y++)
            {
                for (x=1;x<width-1;x++,i++)
                {
                    // Verif Ok 15/06/2018
                    u1 = U[k][i-1];
                    u2 = U[k][i];
                    v1 = V[k][i];
                    v2 = V[k][i-width]
                    K[k][i] = m[i]*m[i]*(
                            0.5*(u1*u1 + u2*u2)
                            +0.5*(v1*v1 + v2*v2))/2;
                }
                i+=2;
            }
        }
    }
    
    calctourbillon()
    {
        var width = this._model.width;
        var height = this._model.height;
        var m = this._model.m;
        var U = this._model.U;
        var V = this._model.V;
        var f = this._model.f;
        var tourbillon = this._model.tourbillon;
        var ps = this._model.ps;
        var dx = this._model.dx;
        var dy = this._model.dy;

        var i = 0;
        var m1=0, m2=0, m3=0, m4=0;
        var x, y;

        for (var k=0;k<U.length;k++)
        {
            i=0;
            for (y=0;y<height-1;y++,i+=1)
            {
                for (x=0;x<width-1;x++,i++)
                {
                    m1 = m[i+width];
                    m2 = m[i+1+width];
                    m3 = m[i];
                    m4 = m[i+1];

                    // Verif Ok 13/06/2018
                    tourbillon[k][i] = (
                            0.25*(m1*m1+m2*m2+m3*m3+m4*m4)
                            *(
                                 (V[k][i+1]-V[k][i])/dx - 
                                 (U[k][i]-U[k][i+width])/dy
                             )
                            +f[i]
                        )
                        /(0.25*(ps[i]+ps[i+1]
                            +ps[i+width]+ps[i+width+1]));
                }
            }
        }
    }

    calcsigmaf()
    {
        var width = this._model.width;
        var height = this._model.height;
        var m = this._model.m;
        var DtildeDs = this._model.DtildeDs;
        var sigmaf = this._model.sigmaf;
        var dSigmaf = this._model.dSigmaf;
        var nbLayers = this._model.nbLayers;
        var dx = this._model.dx;
        var dy = this._model.dy;

        var n = sigmaf.length-2;
        var nb = width*height;
        var k = 1, i=0;
        // Commence à 1 car sommet toujours zero
        for (k=1;k<sigmaf.length;k++)
        {
            var kg = this._model.surfacesIndices[k];
            for (i=0;i<nb;i++)
            {
                sigmaf[k][i] = m[i]*m[i]*(

                        (this.sigma[kg]*DtildeDs[n][i]
                        -DtildeDs[k-1][i])
                    )
                    +dSigmaf[k][i];
            }
       }
    }    

    calcDtilde() 
    {
        var width = this._model.width;
        var height = this._model.height;
        var ps = this._model.ps;
        var U = this._model.U;
        var V = this._model.V;
        var Dtilde = this._model.Dtilde;
        var nbLayers = this._model.nbLayers;
        var dx = this._model.dx;
        var dy = this._model.dy;

        var i = 0;
        var x, y, k;
        var nb = width*height;
        for (k=0;k<nbLayers;k++)
        {
            i = width+1;
            for (y=1;y<height-1;y++)
            {
                for(x=1;x<width-1;x++,i++)
                {
                    // Verif Ok 15/06/2018
                    Dtilde[k][i] = 
                        ((ps[i]+ps[i+1])*U[k][i]-
                            (ps[i-1]+ps[i])*U[k][i-1])*0.5/dx
                        +((ps[i-width]+ps[i])*V[k][i-width]-
                            (ps[i]+ps[i+width])*V[k][i])*0.5/dy;
                }
                i+=2;
            }
        }
    }
    
    calcDtildeDs()
    {
        var width = this._model.width;
        var height = this._model.height;
        var DtildeDs = this._model.DtildeDs;
        var Dtilde = this._model.Dtilde;
        var nbLayers = this._model.nbLayers;
        var dsigma = this.dsigma;
        // Verif Ok 15/06/2018
        // Integre l'expression Dtilde*dsigma sur la verticale
        var nb = width*height;
        for (var i=0;i<nb;i++)
        {
            DtildeDs[0][i] = Dtilde[0][i]*dsigma[0];
        }
        for (var k=1;k<nbLayers;k++)
        {
            for (i=0;i<nb;i++)
            {
                DtildeDs[k][i] = DtildeDs[k-1][i]+Dtilde[k][i]*dsigma[k];
            }
        }
    }

    calcdivergence()
    {
        var width = this._model.width;
        var height = this._model.height;
        var U = this._model.U;
        var V = this._model.V;
        var divergence = this._model.divergence;
        var dx = this._model.dx;
        var dy = this._model.dy;
        var nbLayers = this._model.nbLayers;
        var i;
        for (var k=0;k<nbLayers;k++)
        {
            i = width+1;
            for (var y=1;y<height-1;y++)
            {
                for(var x=1;x<width-1;x++,i++)
                {
                    divergence[k][i] = (U[k][i]-U[k][i-1])/dx
                            +(V[k][i-width]-V[k][i])/dy;
                }
                i+=2;
            }
        }
    }
    
    calcCph()
    {
        var i = 0;
        var n = this.model.nbLayers;
        var Cph = this._model.Cph;
        var qv = this._model.qv;
        for (var k=0;k<n;k++)
        {
            for(i=0;i<Cph[k].length;i++)
            {
                Cph[k][i] = Model.Cp+Model.Cp_v*qv[k][i];
            }
        }
    }
            
    calcdQv()
    {
        var width = this._model.width;
        var height = this._model.height;
        var Pl = this._model.Pl;
        var Pi = this._model.Pi;
        var Pi_1 = this._model.Pi_1;
        var Pi_3 = this._model.Pi_3;
        var Pl_1 = this._model.Pl_1;
        var Pl_3 = this._model.Pl_3;
        var qv = this._model.qv;
        var dQv = this._model.dQv;
        var ps = this._model.ps;
        var dt = this._model.dt;
        var dsigma = this.dsigma;

        var i = 0;
        var x, y;
        var m2;
        var n = this._model.nbLayers;
        var k1, kn1;
        for (var k=0;k<n;k++)
        {
            i = width+1;
            if (k==0) kn1 = k; else kn1 = k-1;
            if (k==n-1) k1 = k; else k1 = k+1;
            for (y=1;y<height-1;y++)
            {
                for(x=1;x<width-1;x++,i++)
                {
                    // Différentiel sur la verticale ????
                    dQv[k][i] = Model.g /(2*ps[i]*dsigma[k])
                            *(
                             (Pl_3[k+1][i]+Pi_3[k+1][i] - Pl_1[k+1][i] - Pi_1[k+1][i])
                            - (Pl_3[k][i]+Pi_3[k][i] - Pl_1[k][i] - Pi_1[k][i])

                            + 0.5*(qv[k][i]+qv[k1][i])*(Pl[k+1][i] + Pi[k+1][i])/(dt*2)
                          -
                            + 0.5*(qv[k][i]+qv[kn1][i])*(Pl[k][i] + Pi[k][i])/(dt*2)
                            );
                }
                i+=2;
            }
        }
    }
    
    calcdPs()
    {
        var width = this._model.width;
        var height = this._model.height;
        var nbLayers = this._model.nbLayers;
        var Pl = this._model.Pl;
        var ps = this._model.ps;
        var dPs = this._model.dPs;

        for (var i=0;i<width*height-1;i++)
        {
            dPs[i] = -Model.g * (Pl[nbLayers][i])/ps[i]; // +Pi-E
        }
    }
            
    calcQ()
    {
        var width = this._model.width;
        var height = this._model.height;
        var sigmaf = this._model.sigmaf;
        var Q = this._model.Q;
        var Pl = this._model.Pl;
        var Pi = this._model.Pi;
        var T = this._model.T;
        var Pi_1 = this._model.Pi_1;
        var Pi_3 = this._model.Pi_3;
        var Pl_1 = this._model.Pl_1;
        var Pl_3 = this._model.Pl_3;
        var ps = this._model.ps;
        var dt = this._model.dt;
        var dsigma = this.dsigma;
        
        var i = 0;
        var x, y;
        var n = this._model.nbLayers;
        var k1, kn1;
        for (var k=0;k<n;k++)
        {
            i = width+1;
            if (k==0) kn1 = k; else kn1 = k-1;
            if (k==n-1) k1 = k; else k1 = k+1;
            for (y=1;y<height-1;y++)
            {
                for(x=1;x<width-1;x++,i++)
                {                       
                    Q[k][i] = -Model.g/(2*ps[i]*dsigma[k])
                        *(
                            // Terme de contribution du changement de pression dûe au changement de 
                            // masse à cause du flux de précipitation
                            // (si j'ai bien tout compris...)
                            ((
                                0.5*(Model.Cp_l-Model.Cp)*Pl[k+1][i]/(dt*2)*(T[k1][i]+T[k][i])

                                +0.5*(Model.Cp_i-Model.Cp)*Pi[k+1][i]/(dt*2)*(T[k1][i]+T[k][i])
                            )

                            // Terme de contribution de la chaleur latente
                            +(-Model.Ll*(Pl_1[k][i]-Pl_3[k][i]) - -Model.Li*(Pi_1[k][i]-Pi_3[k][i])))
                        -
                            ((
                                0.5*(Model.Cp_l-Model.Cp)*Pl[k][i]/(dt*2)*(T[k][i]+T[kn1][i])

                                +0.5*(Model.Cp_i-Model.Cp)*Pi[k][i]/(dt*2)*(T[k][i]+T[kn1][i])
                            )

                            // Terme de contribution de la chaleur latente
                            +(-Model.Ll*(Pl_1[k][i]-Pl_3[k][i]) - -Model.Li*(Pi_1[k][i]-Pi_3[k][i])))
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
        // Nécessité d'avoir ces variables en local pour optimiser le JIT node.js
        var width = this._model.width;
        var height = this._model.height;
        var sigmaf = this._model.sigmaf;
        var dsigma = this.dsigma;
        var U = this._model.U;
        var V = this._model.V;
        var K = this._model.K;
        var T = this._model.T;
        var Z = this._model.Z;
        var phi = this._model.phi;
        var ps = this._model.ps;
        var divergence = this._model.divergence;
        var tourbillon = this._model.tourbillon;
        var dx = this._model.dx;
        var dx2 = this._model.dx/2;
        var dy = this._model.dy;
        var U_tdcy = this._model.U_tdcy;
        var xi = 0;
        var psvk = 0;
        var d_ktilde_1, d_ktilde_2, d_ktilde_moins_1_1, d_ktilde_moins_1_2;
        var u_k_plus_1, u_k, u_k_moins_1;
        var adv=0, rtz=0;
        var kphi=0;
        var damp=0;
        var dsigma = this.dsigma;
        var i = width+1;
        var x, y;
        for (y=1;y<height-1;y++)
        {
            for (x=1;x<width-1;x++,i++)
            {
                if (k<U.length-1)
                {
                    d_ktilde_1 = sigmaf[k+1][i];
                    d_ktilde_2 = sigmaf[k+1][i+1];
                    u_k_plus_1 = U[k+1][i];
                }
                else
                {
                    d_ktilde_1 = 0;
                    d_ktilde_2 = 0;
                    u_k_plus_1 = 0;
                }

                d_ktilde_moins_1_1 = sigmaf[k][i];
                d_ktilde_moins_1_2 = sigmaf[k][i+1];

                u_k = U[k][i];

                if (k>0)
                {
                    u_k_moins_1 = U[k-1][i];
                }
                else 
                {
                    u_k_moins_1 = 0;
                }                        

                // Verif Ok 14/06/2018
                xi = 0.5*(tourbillon[k][i]+tourbillon[k][i-width]); 

                // Verif Ok 14/06/2018
                psvk = (
                        (ps[i]+ps[i-width])*V[k][i-width]
                        +(ps[i+1]+ps[i+1-width])*V[k][i+1-width]
                        +(ps[i+1]+ps[i+1+width])*V[k][i+1]
                        +(ps[i]+ps[i+width])*V[k][i]
                    )/8; 

                // Verif Ok 14/06/2018
                adv = (1/((ps[i+1]+ps[i])*dsigma[k]))
                    *(
                       0.5*(d_ktilde_1+d_ktilde_2)*(u_k_plus_1-u_k)+0.5*(d_ktilde_moins_1_1+d_ktilde_moins_1_2)*(u_k-u_k_moins_1)
                     );

                // Verif Ok 14/06/2018
                kphi = (K[k][i+1]+phi[k][i+1]-K[k][i]-phi[k][i])/dx;

                // Verif Ok 14/06/2018
                rtz = Model.R*0.5*(T[k][i]+T[k][i+1])*(Z[i+1]-Z[i])/dx;

                // Divergence damping

                // Ordre 2
/*                if (x>3 && x<width-3)
                    // 4eme ordre :
                    damp = -this.diffusionFactor*
                            (
                                13/8*(divergence[k][i+1]-divergence[k][i])
                                -(divergence[k][i+2]-divergence[k][i-1])
                                +1/8*(divergence[k][i+2]-divergence[k][i-2])
                            )/(dx2*dx2*dx2);
                else*/
                    // 2eme ordre : 
                    damp = this.diffusionFactor / (dsigma[k]*ps[i])
                            *(divergence[k][i+1]-divergence[k][i])/dx;
                    
                U_tdcy[k][i] = xi*psvk - adv - kphi - rtz + damp;
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
        this.horizontalDiffusion(this.model.U, this.model.U_tdcy);
    }    
    
    calcSvCouche(k)
    {
        // Nécessité d'avoir ces variables en local pour optimiser le JIT node.js
        var width = this._model.width;
        var height = this._model.height;
        var sigmaf = this._model.sigmaf;
        var dsigma = this.dsigma;
        var U = this._model.U;
        var V = this._model.V;
        var K = this._model.K;
        var T = this._model.T;
        var Z = this._model.Z;
        var phi = this._model.phi;
        var ps = this._model.ps;
        var divergence = this._model.divergence;
        var tourbillon = this._model.tourbillon;
        var dx = this._model.dx;
        var dy = this._model.dy;
        var dy2 = this._model.dy/2;
        var V_tdcy = this._model.V_tdcy;
        var xi = 0;
        var psuk = 0;
        var d_ktilde_1, d_ktilde_2, d_ktilde_moins_1_1, d_ktilde_moins_1_2;
        var v_k_plus_1, v_k, v_k_moins_1;
        var adv=0, rtz=0;
        var kphi=0;
        var damp=0;
        var dsigma = this.dsigma;
        var i = width+1;
        var x, y;
        for (y=1;y<height-1;y++)
        {
            for(x=1;x<width-1;x++,i++)
            {
                if (k<V.length-1)
                {
                    d_ktilde_1 = sigmaf[k+1][i+width];
                    d_ktilde_2 = sigmaf[k+1][i];
                    v_k_plus_1 = V[k+1][i];
                }
                else
                {
                    d_ktilde_1 = 0;
                    d_ktilde_2 = 0;
                    v_k_plus_1 = 0;
                }

                d_ktilde_moins_1_1 = sigmaf[k][i+width];
                d_ktilde_moins_1_2 = sigmaf[k][i];

                v_k = V[k][i];

                if (k>0)
                {
                    v_k_moins_1 = V[k-1][i];
                }
                else
                {
                    v_k_moins_1 = 0;
                }

                // Verif Ok 14/06/2018
                xi = 0.5*(tourbillon[k][i]+tourbillon[k][i-1]);

                // Verif Ok 14/06/2018
                psuk = (
                        (ps[i-1]+ps[i])*U[k][i-1]
                        +(ps[i]+ps[i+1])*U[k][i]
                        +(ps[i+width]+ps[i+width+1])*U[k][i+width]
                        +(ps[i-1+width]+ps[i+width])*U[k][i-1+width]
                    )/8;

                // Verif Ok 14/06/2018
                adv = (1/((ps[i]+ps[i+width])*dsigma[k]))*(
                       0.5*(d_ktilde_1+d_ktilde_2)*(v_k_plus_1-v_k)+0.5*(d_ktilde_moins_1_1+d_ktilde_moins_1_2)*(v_k-v_k_moins_1));

                // Verif Ok 14/06/2018
                kphi = (K[k][i]+phi[k][i]-K[k][i+width]-phi[k][i+width])/dy;

                // Verif Ok 14/06/2018
                rtz = Model.R*0.5*(T[k][i]+T[k][i+width])*(Z[i]-Z[i+width])/dy;

/*                if (y>3 && y<height-3)
                    // 4eme ordre :
                    damp = -this.diffusionFactor*
                            (
                                13/8*(divergence[k][i]-divergence[k][i+width])
                                -(divergence[k][i-width]-divergence[k][i+2*width])
                                +1/8*(divergence[k][i-2*width]-divergence[k][i+3*width])
                            )/(dy2*dy2*dy2);
                else*/
                    damp = this.diffusionFactor / (dsigma[k]*ps[i])
                            *(divergence[k][i+width]-divergence[k][i+width])/dy;
                    
                V_tdcy[k][i] = -xi*psuk - adv - kphi - rtz + damp;
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
        this.horizontalDiffusion(this.model.V, this.model.V_tdcy);
    }
    
    calcStCouche(k)
    {
        // Nécessité d'avoir ces variables en local pour optimiser le JIT node.js
        var width = this._model.width;
        var height = this._model.height;
        var sigmaf = this._model.sigmaf;
        var dsigma = this.dsigma;
        var U = this._model.U;
        var V = this._model.V;
        var K = this._model.K;
        var T = this._model.T;
        var Z = this._model.Z;
        var m = this._model.m;
        var phi = this._model.phi;
        var ps = this._model.ps;
        var divergence = this._model.divergence;
        var tourbillon = this._model.tourbillon;
        var Dtilde = this._model.Dtilde;
        var DtildeDs = this._model.DtildeDs;
        var Cph = this._model.Cph;
        var Q = this._model.Q;
        var Z_tdcy = this._model.Z_tdcy;
        var T_tdcy = this._model.T_tdcy;
        var dx = this._model.dx;
        var dy = this._model.dy;
        var dt = this._model.dt;

        var part1=0, part2=0, part3=0, adv=0;
        var adjt=0, adjb=0;
/*        var sigma = this._model.layersCoords;
        var sadjt = k==0 ? sigma[k]/(sigma[k+1]+sigma[k]) : 0;
        var sadjb = k==T.length-1 ? sigma[k]/(sigma[k-1]+sigma[k]) : 0;
        var theta1, theta2, kk;
        //console.log(sadjt, sadjb, sigma[k-1], sigma[k], sigma[k]);*/
        
        var k_adj = 1e-6;
        
        var d_ktilde, d_ktilde_moins_1;
        var t_k_plus_1, t_k, t_k_moins_1;
        var integ_dtlds=0;

        var m2 = 0;
        var i = width+1;
        var x, y;
        for (y=1;y<height-1;y++)
        {
            for (x=1;x<width-1;x++,i++)
            {                       
                m2 = m[i]*m[i];

                if (k<T.length-1)
                {
                    d_ktilde = sigmaf[k+1][i];
                    t_k_plus_1 = T[k+1][i]; 
                }
                else
                {
                    d_ktilde = 0;
                    t_k_plus_1 = 0;
                    
/*                    kk = Math.pow(100000/(ps[i]*sigma[k]), Model.R/Model.Cp);
                    theta1 = T[k][i]*kk;
                    theta2 = T[k-1][i]*Math.pow(100000/(ps[i]*sigma[k-1]), Model.R/Model.Cp);
                //if (i==112) console.log("A", T[k][i], T[k-1][i], theta1, theta2);
                    theta1 -= k_adj*(theta1-sadjb*theta2);
                //if (i==112) console.log("B", theta1, theta1/kk);
                    adjt = T[k][i]-theta1/kk;*/
                }

                d_ktilde_moins_1 = sigmaf[k][i];
                t_k = T[k][i];


                if (k>0)
                {
                    t_k_moins_1 = T[k-1][i];
                    integ_dtlds = DtildeDs[k-1][i];
                }
                else
                {
                    t_k_moins_1 = 0;
                    integ_dtlds = 0;
                    
/*                    kk = Math.pow(100000/(ps[i]*sigma[k]), Model.R/Model.Cp);
                    theta1 = T[k][i]*kk;
                    theta2 = T[k+1][i]*Math.pow(100000/(ps[i]*sigma[k+1]), Model.R/Model.Cp);
                    theta1 -= k_adj*(theta1-sadjt*theta2);
                    adjt = T[k][i]-theta1/kk;*/
                }

                part1 = m2*(
                        ((ps[i+1]+ps[i])*U[k][i]*(T[k][i+1]-T[k][i])
                        +(ps[i]+ps[i-1])*U[k][i-1]*(T[k][i]-T[k][i-1]))/(4*dx)

                        +((ps[i-width]+ps[i])*V[k][i-width]*(T[k][i-width]-T[k][i])
                        +(ps[i]+ps[i+width])*V[k][i]*(T[k][i]-T[k][i+width]))/(4*dy)
                    )/ps[i];

                // Verif Ok 14/06/2018
                adv = (d_ktilde*(t_k_plus_1-t_k)+d_ktilde_moins_1*(t_k-t_k_moins_1)) / (ps[i]*2*dsigma[k]);

                // Verif Ok 15/06/2018
                part2 = Model.R*T[k][i]*m2
                            *(this.gamma[k]*integ_dtlds+this.alpha[k]*Dtilde[k][i]*dsigma[k])
                        /(Cph[k][i]*ps[i]*dsigma[k]); // Model.Cp

                // Verif Ok 15/06/2018
                part3 = Model.R*m2 *(
                        (
                            (ps[i]+ps[i+1])*U[k][i]*(T[k][i]+T[k][i+1])*(Z[i+1]-Z[i])
                            +(ps[i]+ps[i-1])*U[k][i-1]*(T[k][i]+T[k][i-1])*(Z[i]-Z[i-1])
                        )/(8*dx)
                    +
                        ( 
                            (ps[i]+ps[i-width])*V[k][i-width]*(T[k][i]+T[k][i-width])*(Z[i-width]-Z[i])
                            +(ps[i]+ps[i+width])*V[k][i]*(T[k][i]+T[k][i+width])*(Z[i]-Z[i+width])
                        )/(8*dy)

                    ) / (Cph[k][i]*ps[i]);

                
                T_tdcy[k][i] = - part1 - adv - part2 + part3 
                        
/*                        // Ajustement pour stabilité
                        + adjt + adjb*/
                        
                        // complage thermodynamique avec les paramétrisations
                        + (Q[k][i]  
                        + Model.R * T[k][i] * Z_tdcy[i]/dt)/Cph[k][i]
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
        this.horizontalDiffusion(this.model.T, this.model.T_tdcy);
    }
    
    calcZ_tdcy()
    {
        var width = this._model.width;
        var height = this._model.height;
        var sigmaf = this._model.sigmaf;
        var m = this._model.m;
        var ps = this._model.ps;
        var DtildeDs = this._model.DtildeDs;
        var Z_tdcy = this._model.Z_tdcy;
        var dPs = this._model.dPs;
        var dx = this._model.dx;
        var dy = this._model.dy;
        
        var n = DtildeDs.length-1;
        var i = 1;
        var x, y;
        for (y=1;y<height-1;y++)
        {
            for (x=1;x<width-1;x++,i++)
            {
                Z_tdcy[i] = -m[i]*m[i]*DtildeDs[n][i]/ps[i]+dPs[i];
            }
            i+=2;
        }
    }
    
    calcTransportCouche(q, dq, sq, k)
    {
        // Nécessité d'avoir ces variables en local pour optimiser le JIT node.js
        var width = this._model.width;
        var height = this._model.height;
        var sigmaf = this._model.sigmaf;
        var dsigma = this.dsigma;
        var U = this._model.U;
        var V = this._model.V;
        var m = this._model.m;
        var ps = this._model.ps;
        var dx = this._model.dx;
        var dy = this._model.dy;

        var part1=0, adv=0;
        var d_ktilde, d_ktilde_moins_1;
        var q_k_plus_1, q_k, q_k_moins_1;

        var m2 = 0;
        var i = width+1;
        var x, y;
        for (y=1;y<height-1;y++)
        {
            for(x=1;x<width-1;x++,i++)
            {
                m2 = m[i]*m[i];

                if (k<q.length-1)
                {
                    d_ktilde = sigmaf[k+1][i];
                    q_k_plus_1 = q[k+1][i];                        
                }
                else
                {
                    d_ktilde = 0;
                    q_k_plus_1 = 0;
                }

                d_ktilde_moins_1 = sigmaf[k][i];
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
                        ((ps[i+1]+ps[i])*U[k][i]*(q[k][i+1]-q[k][i])
                        +(ps[i]+ps[i-1])*U[k][i-1]*(q[k][i]-q[k][i-1]))/(4*dx)

                        +((ps[i-width]+ps[i])*V[k][i-width]*(q[k][i-width]-q[k][i])
                        +(ps[i]+ps[i+width])*V[k][i]*(q[k][i]-q[k][i+width]))/(4*dy)
                    )/ps[i];

                // Terme d'advection verticale
                adv = (d_ktilde*(q_k_plus_1-q_k)+d_ktilde_moins_1*(q_k-q_k_moins_1)) / (ps[i]*2*dsigma[k]);

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
        this.horizontalDiffusion(this.model.qv, this.model.dQv);
    }    
  
    horizontalDiffusion(psi, dpsi)
    {
        this.horizontalDiffusion_2o(psi, dpsi);
    }
  
    horizontalDiffusion_2o(psi, dpsi)
    {
        var n = this._model.nbLayers;
        var width = this._model.width;
        var height = this._model.height;
        var dx = this._model.dx;
        var dy = this._model.dy;
        var ps = this._model.ps;
        var dsigma = this.dsigma;
        var i = 1;
        var x, y;
        for (var k=0;k<n;k++)
        {
            i=width+1;
            for (y=1;y<height-1;y++)
            {
                for (x=1;x<width-1;x++,i++)
                {
                    dpsi[k][i] += this.spatialDiffusionFactor  / (dsigma[k]*ps[i])
                        * ((psi[k][i+1]+psi[k][i-1]-2*psi[k][i])/((2*dx)*(2*dx))
                        +(psi[k][i-width]+psi[k][i+width]-2*psi[k][i])/((2*dy)*(2*dy)));
                    
                }
                i+=2;
            }
        }
    }
}
