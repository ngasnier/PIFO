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
        this.divergenceDiffusionFactor = 1000000.0;
        this._divergenceDampingCoef = 0.1;
        this.divergenceDampingOrder = 4;

        this._windDiffusionCoef = 0.1;
        this.windDiffusionFactor = 1000000.0;
        this.windDiffusionOrder = 4;
        
        this._temperatureDiffusionCoef = 0.1;
        this.temperatureDiffusionFactor = 1000000.0;
        this.temperatureDiffusionOrder = 4;
             
        this._humidityDiffusionCoef = 0.1;
        this.humidityDiffusionFactor = 1000000.0;
        this.humidityDiffusionOrder = 4;
        
        this.alpha = []; // alphak = ln sigmaktilde/sigmak
        this.beta = []; // betak = ln sigmak/sigmak-1tilde
        this.gamma = []; // gammak = alphak + betak = ln sigmaktilde/sigmak-1tilde
        
        this.sigma = [];
        this.dsigma = [];
    }
    
    divergenceDampingFactor(coef, order)
    {
        var dh = Math.max(this.model.dx,this.model.dy); 
        return (coef * Math.pow(dh, order)) / (Math.pow(2, order) * this.model.dt);
    }
    
    get divergenceDampingCoef()
    {
        return this._divergenceDampingCoef;
    }
    
    set divergenceDampingCoef(coef)
    {
        this._divergenceDampingCoef = coef;
        if (this.model!=null)
        {
            this.divergenceDiffusionFactor = this.divergenceDampingFactor(coef, this.divergenceDampingOrder);
        }
    }
    
    diffusionFactor(coef, order)
    {
        var dh = Math.max(this.model.dx,this.model.dy); 
        return (coef * Math.pow(dh, order)) / (Math.pow(2, order) * this.model.dt);
    }

    get windDiffusionCoef()
    {
        return this._windDiffusionCoef;
    }
    
    set windDiffusionCoef(coef)
    {
        this._windDiffusionCoef = coef;
        if (this._model!=null)
        {
            this.windDiffusionFactor = this.diffusionFactor(coef, this.windDiffusionOrder);
        }
    }
    
    get temperatureDiffusionCoef()
    {
        return this._temperatureDiffusionCoef;
    }
    
    set temperatureDiffusionCoef(coef)
    {
        this._temperatureDiffusionCoef = coef;
        if (this._model!=null)
        {
            this.temperatureDiffusionFactor = this.diffusionFactor(coef, this.temperatureDiffusionOrder);
        }
    }
    
    get humidityDiffusionCoef()
    {
        return this._humidityDiffusionCoef;
    }
    
    set humidityDiffusionCoef(coef)
    {
        this._humidityDiffusionCoef = coef;
        if (this._model!=null)
        {
            this.humidityDiffusionFactor = this.diffusionFactor(coef, this.humidityDiffusionOrder);
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

            // Besoin pour la diffusion horizontale
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_DIAGNOSTIC, name:"gamma_qv", description:"vertical lapse rate of qv", units:"", offsetx:0, offsety:0, verticalPosition:VariableDescription.VERTICAL_POSITION_LAYER}),
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_CONSTANT, name:"weight_factor", description:"weight factor for horizontal diffusion", units:"", offsetx:0, offsety:0, verticalPosition:VariableDescription.VERTICAL_POSITION_LAYER}),
            
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
        
        this.divergenceDiffusionFactor = this.divergenceDampingFactor(this.divergenceDampingCoef, this.divergenceDampingOrder);
        console.log("divergence diffusion : "+this.divergenceDiffusionFactor);
        this.windDiffusionFactor = this.diffusionFactor(this.windDiffusionCoef, this.windDiffusionOrder);
        console.log("wind diffusion : "+this.windDiffusionFactor);
        this.temperatureDiffusionFactor = this.diffusionFactor(this.temperatureDiffusionCoef, this.temperatureDiffusionOrder);
        console.log("temperature diffusion : "+this.temperatureDiffusionFactor);
        this.humidityDiffusionFactor = this.diffusionFactor(this.humidityDiffusionCoef, this.humidityDiffusionOrder);
        console.log("humidity diffusion : "+this.humidityDiffusionFactor);
        
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
        var ps = this._model.ps.data;
        var Z = this._model.Z.data;
        var dPs = this._model.dPs.data;

        for (var i=0;i<width*height;i++)
        {
            ps[i] = Math.exp(Z[i])+dPs[i];
        }
    }
        
    
    calcp()
    {
        var width = this._model.width;
        var height = this._model.height;
        var p = this._model.p.data;
        var ps = this._model.ps.data;

        var n = this._model.nbLev;
        var i=0, idx=0, k = 0;
        for (k=0;k<n;k++)
        {
            idx=k;
            for (i=0;i<width*height;i++,idx+=n)
            {
                p[idx] = this.sigma[k]*ps[i];
            }
        }
    }
    
    calcphi()
    {
        var width = this._model.width;
        var height = this._model.height;
        var m = this._model.m.data;
        var T = this._model.T.data;
        var sfcgeop = this._model.sfcgeop.data;
        var phi = this._model.phi.data;

        var n = this._model.nbLayers;
        var nb = this._model.height*this._model.width;
        var l, il;  
        var acc = 0;
        var i=0, i3d=0, k=0;
        if (this._model.verticalStaggering==Model.VS_LORENTZ)
        {
            for (k=0;k<n;k++)
            {
                i3d = k;
                for (i=0;i<nb;i++,i3d+=n)
                {
                    // Verif Ok 16/06/2018
                    acc=0;
                    for (l=k+1,il=1;l<n;l++,il++)
                    {
                        acc += this.gamma[l]*Model.R*T[i3d+il];
                    }
                    phi[i3d] = sfcgeop[i]+acc+this.alpha[k]*Model.R*T[i3d];
                }
            }
        }
        else
        {
            for (k=0;k<n;k++)
            {
                i3d = k;
                for (i=0;i<nb;i++,i3d+=n)
                {
                    acc=0;
                    for (l=k+1,il=1;l<n;l++,il++)
                    {
                        acc += this.gamma[l]*Model.R*0.5*(T[i3d+il]+T[i3d+il+1]);
                    }
                    phi[i3d] = sfcgeop[i]+acc+gamma[k]*Model.R*0.5*(T[i3d]+T[i3d]);
                }
            }
        }
    }
    
    calcK()
    {
        var width = this._model.width;
        var height = this._model.height;
        var nbLayers = this._model.nbLayers;
        var m = this._model.m;
        var U = this._model.U;
        var V = this._model.V;
        var f = this._model.f;
        var K = this._model.K;
        var ps = this._model.ps;

        var u1 = 0, u2 = 0;
        var v1 = 0, v2 = 0;
        var x, y;
        for (var k=0;k<nbLayers;k++)
        {
            for (y=1;y<height-1;y++)
            {
                for (x=1;x<width-1;x++)
                {
                    // Verif Ok 15/06/2018
                    u1 = U.get3(x-1,y,k);
                    u2 = U.get3(x,y,k);
                    v1 = V.get3(x,y,k);
                    v2 = V.get3(x,y-1,k)
                    K.set3(x,y,k, m.get2(x,y)*m.get2(x,y)*(
                            0.5*(u1*u1 + u2*u2)
                            +0.5*(v1*v1 + v2*v2))/2);
                }
            }
        }
    }
    
    calctourbillon()
    {
        var width = this._model.width;
        var height = this._model.height;
        var nbLayers = this._model.nbLayers;
        var m = this._model.m;
        var U = this._model.U;
        var V = this._model.V;
        var f = this._model.f;
        var tourbillon = this._model.tourbillon;
        var ps = this._model.ps;
        var dx = this._model.dx;
        var dy = this._model.dy;

        var m1=0, m2=0, m3=0, m4=0;
        var x, y;

        for (var k=0;k<nbLayers;k++)
        {
            for (y=0;y<height-1;y++)
            {
                for (x=0;x<width-1;x++)
                {
                    m1 = m.get2(x,y+1);
                    m2 = m.get2(x+1,y+1);
                    m3 = m.get2(x,y);
                    m4 = m.get2(x+1,y);

                    // Verif Ok 13/06/2018
                    tourbillon.set3(x,y,k, (
                            0.25*(m1*m1+m2*m2+m3*m3+m4*m4)
                            *(
                                 (V.get3(x+1,y,k)-V.get3(x,y,k))/dx - 
                                 (U.get3(x,y,k)-U.get3(x,y+1,k))/dy
                             )
                            +f.get2(x,y)
                        )
                        /(0.25*(ps.get2(x,y)+ps.get2(x+1,y)
                            +ps.get2(x,y+1)+ps.get2(x+1,y+1)))
                            );
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
        var nbSurfaces = this._model.nbSurfaces;
        var dx = this._model.dx;
        var dy = this._model.dy;

        var n = nbSurfaces-2;
        var nb = width*height;
        var k = 1, i=0, j=0;
        // Commence à 1 car sommet toujours zero
        for (k=1;k<nbSurfaces;k++)
        {
            var kg = this._model.surfacesIndices[k];
            for (j=0;j<height;j++)
            {
                for (i=0;i<width;i++)
                {
                    sigmaf.set3(i,j,k,
                        m.get2(i,j)*m.get2(i,j)*(

                            (this.sigma[kg]*DtildeDs.get3(i,j,n)
                            -DtildeDs.get3(i,j,k-1))
                        )
                        +dSigmaf.get3(i,j,k));
                }
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

        var i, j, k;
        var nb = width*height;
        for (k=0;k<nbLayers;k++)
        {
            for (j=1;j<height-1;j++)
            {
                for(i=1;i<width-1;i++)
                {
                    Dtilde.set3(i, j, k, ((ps.get2(i,j)+ps.get2(i+1,j))*U.get3(i,j,k)-
                            (ps.get2(i-1,j)+ps.get2(i,j))*U.get3(i-1,j,k))*0.5/dx
                        +((ps.get2(i,j-1)+ps.get2(i,j))*V.get3(i,j-1,k)-
                            (ps.get2(i,j)+ps.get2(i,j+1))*V.get3(i,j,k))*0.5/dy);
                }
            }
        }
    }
    
    calcDtildeDs()
    {
        var width = this._model.width;
        var height = this._model.height;
        var DtildeDs = this._model.DtildeDs.data;
        var Dtilde = this._model.Dtilde.data;
        var nbLayers = this._model.nbLayers;
        var dsigma = this.dsigma;
        // Verif Ok 15/06/2018
        // Integre l'expression Dtilde*dsigma sur la verticale
        var nb = width*height;
        var i = 0;
        var idx3 =0;
        for (i=0;i<nb;i++,idx3+=nbLayers)
        {
            DtildeDs[idx3] = Dtilde[idx3]*dsigma[0];
        }
        for (var k=1;k<nbLayers;k++)
        {
            for (i=0,idx3 = k;i<nb;i++,idx3+=nbLayers)
            {
                DtildeDs[idx3] = DtildeDs[idx3-1]+Dtilde[idx3]*dsigma[k];
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
        for (var k=0;k<nbLayers;k++)
        {
            for (var j=1;j<height-1;j++)
            {
                for(var i=1;i<width-1;i++)
                {
                    divergence.set3(i,j,k,
                            (U.get3(i,j,k)-U.get3(i-1,j,k))/dx
                            +(V.get3(i,j-1,k)-V.get3(i,j,k))/dy);
                }
            }
        }
    }
    
    calcCph()
    {
        var i = 0, j = 0;
        var width = this._model.width;
        var height = this._model.height;
        var n = this.model.nbLayers;
        var Cph = this._model.Cph;
        var qv = this._model.qv;
        for (var k=0;k<n;k++)
        {
            for (j=0;j<height;j++)
            {
                for(i=0;i<width;i++)
                {
                    Cph.set3(i,j,k, Model.Cp+Model.Cp_v*qv.get3(i,j,k));
                }
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

        var i = 0, j=0;
        var n = this._model.nbLayers;
        var k1, kn1;
        for (var k=0;k<n;k++)
        {
            if (k==0) kn1 = k; else kn1 = k-1;
            if (k==n-1) k1 = k; else k1 = k+1;
            for (j=1;j<height-1;j++)
            {
                for(i=1;i<width-1;i++)
                {
                    // Différentiel sur la verticale ????
                    /*dQv[k][i] = Model.g /(2*ps[i]*dsigma[k])
                            *(
                             (Pl_3[k+1][i]+Pi_3[k+1][i] - Pl_1[k+1][i] - Pi_1[k+1][i])
                            - (Pl_3[k][i]+Pi_3[k][i] - Pl_1[k][i] - Pi_1[k][i])

                            + 0.5*(qv[k][i]+qv[k1][i])*(Pl[k+1][i] + Pi[k+1][i])/(dt*2)
                          -
                            + 0.5*(qv[k][i]+qv[kn1][i])*(Pl[k][i] + Pi[k][i])/(dt*2)
                            );*/
                    dQv.set3(i,j,k, Model.g /(2*ps.get2(i,j)*dsigma[k])
                            *(
                             (Pl_3.get3(i,j,k+1)+Pi_3.get3(i,j,k+1)- Pl_1.get3(i,j,k+1) - Pi_1.get3(i,j,k+1))
                            - (Pl_3.get3(i,j,k)+Pi_3.get3(i,j,k) - Pl_1.get3(i,j,k) - Pi_1.get3(i,j,k))

                            + 0.5*(qv.get3(i,j,k)+qv.get3(i,j,k1))*(Pl.get3(i,j,k+1) + Pi.get3(i,j,k+1))/(dt*2)
                          -
                            + 0.5*(qv.get3(i,j,k)+qv.get3(i,j,kn1))*(Pl.get3(i,j,k) + Pi.get3(i,j,k))/(dt*2)
                            ));
                }
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
        var i,j;

        for (j=0;j<height;j++)
        {
            for(i=0;i<width;i++)
            {
                //dPs[i] = -Model.g * (Pl[nbLayers][i])/ps[i]; // +Pi-E
                dPs.set2(i,j, -Model.g * Pl.get3(i,j,nbLayers)/ps.get2(i,j)); // +Pi-E
            }
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
        
        var i = 0, j=0;
        var x, y;
        var n = this._model.nbLayers;
        var k1, kn1;
        for (var k=0;k<n;k++)
        {
            if (k==0) kn1 = k; else kn1 = k-1;
            if (k==n-1) k1 = k; else k1 = k+1;
            for (j=1;j<height-1;j++)
            {
                for(i=1;i<width-1;i++)
                {                       
                    Q.set3(i,j,k, -Model.g/(2*ps.get2(i,j,k)*dsigma[k])
                        *(
                            // Terme de contribution du changement de pression dûe au changement de 
                            // masse à cause du flux de précipitation
                            // (si j'ai bien tout compris...)
                            ((
                                0.5*(Model.Cp_l-Model.Cp)*Pl.get3(i,j,k+1)/(dt*2)*(T.get3(i,j,k1)+T.get3(i,j,k))

                                +0.5*(Model.Cp_i-Model.Cp)*Pi.get3(i,j,k+1)/(dt*2)*(T.get3(i,j,k1)+T.get3(i,j,k))
                            )

                            // Terme de contribution de la chaleur latente
                            +(-Model.Ll*(Pl_1.get3(i,j,k)-Pl_3.get3(i,j,k)) - -Model.Li*(Pi_1.get3(i,j,k)-Pi_3.get3(i,j,k))))
                        -
                            ((
                                0.5*(Model.Cp_l-Model.Cp)*Pl.get3(i,j,k)/(dt*2)*(T.get3(i,j,k)+T.get3(i,j,kn1))

                                +0.5*(Model.Cp_i-Model.Cp)*Pi.get3(i,j,k)/(dt*2)*(T.get3(i,j,k)+T.get3(i,j,kn1))
                            )

                            // Terme de contribution de la chaleur latente
                            +(-Model.Ll*(Pl_1.get3(i,j,k)-Pl_3.get3(i,j,k)) - -Model.Li*(Pi_1.get3(i,j,k)-Pi_3.get3(i,j,k))))
                        ));
                }
            }

        }
    }
    
    calcapcp()
    {
        Variable.a_bc(this._model.apcp, this._model.Pl.getLevelAsVariable(this._model.nbLayers), 1, this._model.apcp);
    }
    
    calcacsnow()
    {
        Variable.a_bc(this._model.acsnow, this._model.Pi.getLevelAsVariable(this._model.nbLayers), 1, this._model.acsnow);
    }
            
    calcSuCouche(k)
    {
        // Nécessité d'avoir ces variables en local pour optimiser le JIT node.js
        var width = this._model.width;
        var height = this._model.height;
        var nbLayers = this._model.nbLayers;
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
        var dsigma = this.dsigma;
        var i = 0, j=0;
        for (j=1;j<height-1;j++)
        {
            for (i=1;i<width-1;i++)
            {
                if (k<nbLayers-1)
                {
                    d_ktilde_1 = sigmaf.get3(i,j,k+1);
                    d_ktilde_2 = sigmaf.get3(i+1,j,k+1);
                    u_k_plus_1 = U.get3(i,j,k+1);
                }
                else
                {
                    d_ktilde_1 = 0;
                    d_ktilde_2 = 0;
                    u_k_plus_1 = 0;
                }

                d_ktilde_moins_1_1 = sigmaf.get3(i,j,k);
                d_ktilde_moins_1_2 = sigmaf.get3(i+1,j,k);

                u_k = U.get3(i,j,k);

                if (k>0)
                {
                    u_k_moins_1 = U.get3(i,j,k-1);
                }
                else 
                {
                    u_k_moins_1 = 0;
                }                        

                // Verif Ok 14/06/2018
                xi = 0.5*(tourbillon.get3(i,j,k)+tourbillon.get3(i,j-1,k)); 

                // Verif Ok 14/06/2018
                psvk = (
                        (ps.get2(i,j)+ps.get2(i,j-1))*V.get3(i,j-1,k)
                        +(ps.get2(i+1,j)+ps.get2(i+1,j-1))*V.get3(i+1,j-1,k)
                        +(ps.get2(i+1,j)+ps.get2(i+1,j+1))*V.get3(i+1,j,k)
                        +(ps.get2(i,j)+ps.get2(i,j+1))*V.get3(i,j,k)
                    )/8; 

                // Verif Ok 14/06/2018
                adv = (1/((ps.get2(i+1,j)+ps.get2(i,j))*dsigma[k]))
                    *(
                       0.5*(d_ktilde_1+d_ktilde_2)*(u_k_plus_1-u_k)+0.5*(d_ktilde_moins_1_1+d_ktilde_moins_1_2)*(u_k-u_k_moins_1)
                     );
             
                // Verif Ok 14/06/2018
                kphi = (K.get3(i+1,j,k)+phi.get3(i+1,j,k)-K.get3(i,j,k)-phi.get3(i,j,k))/dx;

                // Verif Ok 14/06/2018
                rtz = Model.R*0.5*(T.get3(i,j,k)+T.get3(i+1,j,k))*(Z.get2(i+1,j)-Z.get2(i,j))/dx;

                U_tdcy.set3(i, j, k, xi*psvk - adv - kphi - rtz);
            }
        }
    }

    calcU_tdcy()
    {
        var n = this._model.nbLayers;
        for (var k=0;k<n;k++)
        {
            this.calcSuCouche(k);
            this.divergenceDiffusion_u(this.model.U_tdcy, k, this.divergenceDiffusionFactor, this.divergenceDampingOrder);
        }
        this.horizontalDiffusion(this.model.U, this.model.U_tdcy, this.windDiffusionFactor, this.windDiffusionOrder);
    }    
    
    calcSvCouche(k)
    {
        // Nécessité d'avoir ces variables en local pour optimiser le JIT node.js
        var width = this._model.width;
        var height = this._model.height;
        var nbLayers = this._model.nbLayers;
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
        var dsigma = this.dsigma;
        var i = 0,j = 0;
        for (j=1;j<height-1;j++)
        {
            for(i=1;i<width-1;i++)
            {
                if (k<nbLayers-1)
                {
                    d_ktilde_1 = sigmaf.get3(i,j+1,k+1);
                    d_ktilde_2 = sigmaf.get3(i,j,k+1);
                    v_k_plus_1 = V.get3(i,j,k+1);
                }
                else
                {
                    d_ktilde_1 = 0;
                    d_ktilde_2 = 0;
                    v_k_plus_1 = 0;
                }

                d_ktilde_moins_1_1 = sigmaf.get3(i,j+1,k);
                d_ktilde_moins_1_2 = sigmaf.get3(i,j,k);

                v_k = V.get3(i,j,k);

                if (k>0)
                {
                    v_k_moins_1 = V.get3(i,j,k-1);
                }
                else
                {
                    v_k_moins_1 = 0;
                }

                // Verif Ok 14/06/2018
                xi = 0.5*(tourbillon.get3(i,j,k)+tourbillon.get3(i-1,j,k));

                // Verif Ok 14/06/2018
                psuk = (
                        (ps.get2(i-1,j)+ps.get2(i,j))*U.get3(i-1,j,k)
                        +(ps.get2(i,j)+ps.get2(i+1,j))*U.get3(i,j,k)
                        +(ps.get2(i,j+1)+ps.get2(i+1,j+1))*U.get3(i,j+1,k)
                        +(ps.get2(i-1,j+1)+ps.get2(i,j+1))*U.get3(i-1,j+1,k)
                    )/8;

                // Verif Ok 14/06/2018
                adv = (1/((ps.get2(i,j)+ps.get2(i,j+1))*dsigma[k]))*(
                       0.5*(d_ktilde_1+d_ktilde_2)*(v_k_plus_1-v_k)+0.5*(d_ktilde_moins_1_1+d_ktilde_moins_1_2)*(v_k-v_k_moins_1));

                // Verif Ok 14/06/2018
                kphi = (K.get3(i,j,k)+phi.get3(i,j,k)-K.get3(i,j+1,k)-phi.get3(i,j+1,k))/dy;

                // Verif Ok 14/06/2018
                rtz = Model.R*0.5*(T.get3(i,j,k)+T.get3(i,j+1,k))*(Z.get2(i,j)-Z.get2(i,j+1))/dy;

                V_tdcy.set3(i, j, k, -xi*psuk - adv - kphi - rtz);
            }
        }
    }

    calcV_tdcy()
    {
        var n = this.model.nbLayers;
        for (var k=0;k<n;k++)
        {
            this.calcSvCouche(k);
            this.divergenceDiffusion_v(this.model.V_tdcy, k, this.divergenceDiffusionFactor, this.divergenceDampingOrder);
        }            
        this.horizontalDiffusion(this.model.V, this.model.V_tdcy, this.windDiffusionFactor, this.windDiffusionOrder);
    }
    
    calcStCouche(k)
    {
        // Nécessité d'avoir ces variables en local pour optimiser le JIT node.js
        var width = this._model.width;
        var height = this._model.height;
        var nbLayers = this._model.nbLayers;
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
        
        var k_adj = 1e-6;
        
        var d_ktilde, d_ktilde_moins_1;
        var t_k_plus_1, t_k, t_k_moins_1;
        var integ_dtlds=0;

        var m2 = 0;
        var i = 0, j = 0;
        for (j=1;j<height-1;j++)
        {
            for (i=1;i<width-1;i++)
            {                       
                m2 = m.get2(i,j)*m.get2(i,j);

                if (k<nbLayers-1)
                {
                    d_ktilde = sigmaf.get3(i,j,k+1);
                    t_k_plus_1 = T.get3(i,j,k+1);
                }
                else
                {
                    d_ktilde = 0;
                    t_k_plus_1 = 0;
                }

                d_ktilde_moins_1 = sigmaf.get3(i,j,k);
                t_k = T.get3(i,j,k);


                if (k>0)
                {
                    t_k_moins_1 = T.get3(i,j,k-1);
                    integ_dtlds = DtildeDs.get3(i,j,k-1);
                }
                else
                {
                    t_k_moins_1 = 0;
                    integ_dtlds = 0;
                }

                part1 = m2*(
                        ((ps.get2(i+1,j)+ps.get2(i,j))*U.get3(i,j,k)*(T.get3(i+1,j,k)-T.get3(i,j,k))
                        +(ps.get2(i,j)+ps.get2(i-1,j))*U.get3(i-1,j,k)*(T.get3(i,j,k)-T.get3(i-1,j,k)))/(4*dx)

                        +((ps.get2(i,j-1)+ps.get2(i,j))*V.get3(i,j-1,k)*(T.get3(i,j-1,k)-T.get3(i,j,k))
                        +(ps.get2(i,j)+ps.get2(i,j+1))*V.get3(i,j,k)*(T.get3(i,j,k)-T.get3(i,j+1,k)))/(4*dy)
                    )/ps.get2(i,j);

                // Verif Ok 14/06/2018
                adv = (d_ktilde*(t_k_plus_1-t_k)+d_ktilde_moins_1*(t_k-t_k_moins_1)) / (ps.get2(i,j)*2*dsigma[k]);

                // Verif Ok 15/06/2018
                part2 = Model.R*T.get3(i,j,k)*m2
                            *(this.gamma[k]*integ_dtlds+this.alpha[k]*Dtilde.get3(i,j,k)*dsigma[k])
                        /(Cph.get3(i,j,k)*ps.get2(i,j)*dsigma[k]); // Model.Cp

                // Verif Ok 15/06/2018
                part3 = Model.R*m2 *(
                        (
                            (ps.get2(i,j)+ps.get2(i+1,j))*U.get3(i,j,k)*(T.get3(i,j,k)+T.get3(i+1,j,k))*(Z.get2(i+1,j)-Z.get2(i,j))
                            +(ps.get2(i,j)+ps.get2(i-1,j))*U.get3(i-1,j,k)*(T.get3(i,j,k)+T.get3(i-1,j,k))*(Z.get2(i,j)-Z.get2(i-1,j))
                        )/(8*dx)
                    +
                        ( 
                            (ps.get2(i,j)+ps.get2(i,j-1))*V.get3(i,j-1,k)*(T.get3(i,j,k)+T.get3(i,j-1,k))*(Z.get2(i,j-1)-Z.get2(i,j))
                            +(ps.get2(i,j)+ps.get2(i,j+1))*V.get3(i,j,k)*(T.get3(i,j,k)+T.get3(i,j+1,k))*(Z.get2(i,j)-Z.get2(i,j+1))
                        )/(8*dy)

                    ) / (Cph.get3(i,j,k)*ps.get2(i,j));

                
                T_tdcy.set3(i, j, k, - part1 - adv - part2 + part3 
                                               
                        // couplage thermodynamique avec les paramétrisations
                        + (Q.get3(i,j,k)  
                        + Model.R * T.get3(i,j,k) * Z_tdcy.get2(i,j)/dt)/Cph.get3(i,j,k));
            }
        }
    }

    calcT_tdcy()
    {
        var n = this._model.nbLayers;
        for (var k=0;k<n;k++)
        {
            this.calcStCouche(k);
        }
        this.horizontalDiffusion(this.model.T, this.model.T_tdcy, this.temperatureDiffusionFactor, this.temperatureDiffusionOrder);
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
        
        var n = this._model.nbLayers-1;
        var i = 0, j = 0;
        for (j=1;j<height-1;j++)
        {
            for (i=1;i<width-1;i++)
            {
                Z_tdcy.set2(i, j, -m.get2(i,j)*m.get2(i,j)*DtildeDs.get3(i,j,n)/ps.get2(i,j)+dPs.get2(i,j));
            }
        }
    }
    
    calcTransportCouche(q, dq, sq, k)
    {
        // Nécessité d'avoir ces variables en local pour optimiser le JIT node.js
        var width = this._model.width;
        var height = this._model.height;
        var nbLayers = this._model.nbLayers;
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
        var i = 0, j = 0;
        for (j=1;j<height-1;j++)
        {
            for(i=1;i<width-1;i++)
            {
                m2 = m.get2(i,j)*m.get2(i,j);

                if (k<nbLayers-1)
                {
                    d_ktilde = sigmaf.get3(i,j,k+1);
                    q_k_plus_1 = q.get3(i,j,k+1);
                }
                else
                {
                    d_ktilde = 0;
                    q_k_plus_1 = 0;
                }

                d_ktilde_moins_1 = sigmaf.get3(i,j,k);
                q_k = q.get3(i,j,k);


                if (k>0)
                {
                    q_k_moins_1 = q.get3(i,j,k-1);
                }
                else
                {
                    q_k_moins_1 = 0;
                }

                // Terme de transport horizontal
                part1 = m2*(
                        ((ps.get2(i+1,j)+ps.get2(i,j))*U.get3(i,j,k)*(q.get3(i+1,j,k)-q.get3(i,j,k))
                        +(ps.get2(i,j)+ps.get2(i-1,j))*U.get3(i-1,j,k)*(q.get3(i,j,k)-q.get3(i-1,j,k)))/(4*dx)

                        +((ps.get2(i,j-1)+ps.get2(i,j))*V.get3(i,j-1,k)*(q.get3(i,j-1,k)-q.get3(i,j,k))
                        +(ps.get2(i,j)+ps.get2(i,j+1))*V.get3(i,j,k)*(q.get3(i,j,k)-q.get3(i,j+1,k)))/(4*dy)
                    )/ps.get2(i,j);

                // Terme d'advection verticale
                adv = (d_ktilde*(q_k_plus_1-q_k)+d_ktilde_moins_1*(q_k-q_k_moins_1)) / (ps.get2(i,j)*2*dsigma[k]);

                sq.set3(i, j, k, - part1 - adv + dq.get3(i,j,k));
            }
        }
    }
    
    calcqv_tdcy()
    {
        var n = this.model.nbLayers;
        for (var k=0;k<n;k++)
        {
            this.calcTransportCouche(this.model.qv, this.model.dQv, this.model.qv_tdcy, k);
        }
        this.horizontalDiffusion(this.model.qv, this.model.dQv, this.humidityDiffusionFactor, this.humidityDiffusionOrder);
    }    
    
    divergenceDiffusion_u(U_tdcy, k, diffusionFactor, order)
    {
        if (order==4)
            this.divergenceDiffusion_u_4o(U_tdcy, k, diffusionFactor);
        else
            this.divergenceDiffusion_u_2o(U_tdcy, k, diffusionFactor);
    }
    
    divergenceDiffusion_u_2o(U_tdcy, k, diffusionFactor)
    {
        var width = this._model.width;
        var height = this._model.height;
        var dx = this._model.dx;
        var divergence = this._model.divergence;
        var dsigma = this.dsigma;
        var ps = this._model.ps;
        var i = 0, j = 0;
        for (j=1;j<height-1;j++)
        {
            for (i=1;i<width-1;i++)
            {
                U_tdcy.set3(i, j, k, U_tdcy.get3(i, j, k) 
                        + diffusionFactor / (dsigma[k]*ps.get2(i,j))
                        *(divergence.get3(i+1,j,k)-divergence.get3(i,j,k))/dx);
            }
        }
    }

    divergenceDiffusion_u_4o(U_tdcy, k, diffusionFactor)
    {
        var width = this._model.width;
        var height = this._model.height;
        var dx = this._model.dx;
        var dx3 = dx*dx*dx;
        var divergence = this._model.divergence;
        var dsigma = this.dsigma;
        var ps = this._model.ps;
        var i = 0, j = 0;
        for (j=2;j<height-2;j++)
        {
            for (i=2;i<width-2;i++)
            {
                U_tdcy.set3(i, j, k, U_tdcy.get3(i,j,k)
                    -diffusionFactor / (dsigma[k]*ps.get2(i,j))
                    *(0.25*(divergence.get3(i+2,j,k)+divergence.get3(i+1,j,k))
                        -divergence.get3(i+1,j,k)+divergence.get3(i,j,k)
                        -0.25*(divergence.get3(i-1,j,k)+divergence.get3(i,j,k)))/dx3);
                
            }
        }
    }

    divergenceDiffusion_v(V_tdcy, k, diffusionFactor, order)
    {
        if (order==4)
            this.divergenceDiffusion_v_4o(V_tdcy, k, diffusionFactor);
        else
            this.divergenceDiffusion_v_2o(V_tdcy, k, diffusionFactor);
    }
    
    divergenceDiffusion_v_2o(V_tdcy, k, diffusionFactor)
    {
        var width = this._model.width;
        var height = this._model.height;
        var dy = this._model.dy;
        var divergence = this._model.divergence;
        var dsigma = this.dsigma;
        var ps = this._model.ps;
        var i = 0, j = 0;
        for (j=1;j<height-1;j++)
        {
            for (i=1;i<width-1;i++)
            {
                V_tdcy.set3(i,j,k, V_tdcy.get3(i,j,k)
                            + diffusionFactor / (dsigma[k]*ps.get2(i,j))
                            *(divergence.get3(i,j+1)-divergence.get3(i,j+1,k))/dy);
            }
        }
    }

    divergenceDiffusion_v_4o(V_tdcy, k, diffusionFactor)
    {
        var width = this._model.width;
        var height = this._model.height;
        var dy = this._model.dy;
        var dy3 = dy*dy*dy;
        var divergence = this._model.divergence;
        var dsigma = this.dsigma;
        var ps = this._model.ps;
        var i = 0, j = 0;
        for (j=2;j<height-2;j++)
        {
            for (i=2;i<width-2;i++)
            {
                V_tdcy.set3(i,j,k, V_tdcy.get3(i,j,k)
                     - diffusionFactor / (dsigma[k]*ps.get2(i,j))
                    *(0.25*(divergence.get3(i,j-1,k)+divergence.get3(i,j,k))
                    -divergence.get3(i,j,k)+divergence.get3(i,j+1,k)
                    -0.25*(divergence.get3(i,j+1,k)+divergence.get3(i,j+2,k)))/dy3);
            }
        }
    }
    
    calcweight_factor()
    {
        var n = this.model.nbLayers;
        var width = this.model.width;
        var height = this.model.height;
        var sfcgeop = this.model.sfcgeop;
        var weight_factor = this.model.weight_factor;
        var sigma = this.model.layersCoords;
        var dx = this.model.dx;
        var dy = this.model.dy;
        var i = 0, j = 0;
        var gx, gy;
        for (var k=0;k<n;k++)
        {
            i=width+1;
            for (j=1;j<height-1;j++)
            {
                for (i=1;i<width-1;i++)
                {
                    gx = Math.abs((sfcgeop.get2(i+1,j)-sfcgeop.get2(i-1,j)) / dx);
                    gy = Math.abs((sfcgeop.get2(i,j-1)-sfcgeop.get2(i,j+1)) / dy);
                    weight_factor.set3(i,j,k, 1/ (1+sigma[k]*((gx>gy ? gx : gy) / (0.001 * Model.g))));
                }
            }
        }
    }
    
    calcgamma_qv()
    {
        if (this.humidityDiffusionOrder==4)
            this.calcgamma_q(this.model.qv, this.model.gamma_qv);
    }
    
    calcgamma_q(q, gamma_q)
    {
        var n = this.model.nbLayers;
        var width = this.model.width;
        var height = this.model.height;
        var sfcgeop = this.model.sfcgeop;
        var weight_factor = this.model.weight_factor;
        var phi = this.model.phi;
        var sigma = this.model.layersCoords;
        var dsigma = this.dsigma;
        var dx = this.model.dx;
        var dy = this.model.dy;
        var i = 0, j = 0;
        var k = 0;

        for (j=1;j<height-1;j++)
        {
            for (i=1;i<width-1;i++)
            {                    
                gamma_q.set3(i,j,k,  weight_factor.get3(i,j,k)
                        *(q.get3(i+1,j,k)-q.get3(i,j,k))/(phi.get3(i,j,k+1)-phi.get3(i,j,k))/9.81
                        -(1-weight_factor.get3(i,j,k))*0.0065);
            }
        }
        
        for (k=1;k<n-1;k++)
        {
            for (j=1;j<height-1;j++)
            {
                for (i=1;i<width-1;i++)
                {                    
                    gamma_q.set3(i,j,k, weight_factor.get3(i,j,k)
                            *(q.get3(i,j,k+1)-q.get3(i,j,k-1))/(phi.get3(i,j,k+1)-phi.get3(i,j,k-1))/9.81
                            -(1-weight_factor.get3(i,j,k))*0.0065);
                }
            }
        }
        
        // TODO : une variable d'humidité de surface serait bien utile !
        for (j=1;j<height-1;j++)
        {
            for (i=1;i<width-1;i++)
            {                    
                gamma_q.set3(i,j,k, weight_factor.get3(i,j,k)
                        *(q.get3(i,j,k)-q.get3(i,j,k-1))/(phi.get3(i,j,k)-phi.get3(i,j,k-1))/9.81
                        -(1-weight_factor.get3(i,j,k))*0.0065);
            }
        }
    }

    horizontalDiffusion(psi, dpsi, factor, order)
    {
        if (order==4)
            this.horizontalDiffusion_4o(psi, dpsi, factor);
        else
            this.horizontalDiffusion_2o(psi, dpsi, factor);
    }
  
    horizontalDiffusion_2o(psi, dpsi, factor)
    {
        var n = this._model.nbLayers;
        var width = this._model.width;
        var height = this._model.height;
        var dx = this._model.dx;
        var dy = this._model.dy;
        var ps = this._model.ps;
        var dsigma = this.dsigma;
        var i = 0, j = 0;
        var x, y;
        for (var k=0;k<n;k++)
        {
            for (j=1;j<height-1;j++)
            {
                for (i=1;i<width-1;i++)
                {
                    dpsi.set3(i,j,k, dpsi.get3(i,j,k) + factor / (dsigma[k]*ps.get2(i,j))
                        * ((psi.get3(i+1,j,k)+psi.get3(i-1,j,k)-2*psi.get3(i,j,k))/((2*dx)*(2*dx))
                        +(psi.get3(i,j-1,k)+psi.get3(i,j+1,k)-2*psi.get3(i,j,k))/((2*dy)*(2*dy))));
                }
            }
        }
    }

    horizontalDiffusion_4o(psi, dpsi, factor)
    {
        var n = this._model.nbLayers;
        var width = this._model.width;
        var height = this._model.height;
        var dx = this._model.dx;
        var dy = this._model.dy;
        var ps = this._model.ps;
        var dsigma = this.dsigma;
        var dx4 = (2*dx)*(2*dx)*(2*dx)*(2*dx);
        var dy4 = (2*dy)*(2*dy)*(2*dy)*(2*dy);
        var i = 0, j = 0;
        for (var k=0;k<n;k++)
        {
            for (j=2;j<height-2;j++)
            {
                for (i=2;i<width-2;i++)
                {
                    dpsi.set3(i,j,k, dpsi.get3(i,j,k) -factor  / (dsigma[k]*ps.get2(i,j))
                        * ((-4*(psi.get3(i+1,j,k)+psi.get3(i-1,j,k))
                        +6*psi.get3(i,j,k)+psi.get3(i+2,j,k)+psi.get3(i-2,j,k))/dx4
                        +(-4*(psi.get3(i,j+1,k)+psi.get3(i,j-1,k))
                        +6*psi.get3(i,j,k)+psi.get3(i,j+2,k)+psi.get3(i,j-2,k))/dy4));
                }
            }
        }
    }

    horizontalDiffusion_4o_q(psi, dpsi, factor, gamma_q)
    {
        var n = this.model.nbLayers;
        var width = this.model.width;
        var height = this.model.height;
        var phi = this.model.phi;
        var dx = this.model.dx;
        var dy = this.model.dy;
        var ps = this.model.ps;
        var dsigma = this.dsigma;
        var dx4 = (2*dx)*(2*dx)*(2*dx)*(2*dx);
        var dy4 = (2*dy)*(2*dy)*(2*dy)*(2*dy);
        var i = 0, j = 0;
        for (var k=0;k<n;k++)
        {
            for (j=2;j<height-2;j++)
            {
                for (i=2;i<width-2;i++)
                {
                    dpsi.set3(i,j,k, dpsi.get3(i,j,k) -factor  / (dsigma[k]*ps.get2(i,j))
                        * ((-4*(psi.get3(i+1,j,k)+psi.get3(i-1,j,k))
                        +6*psi.get3(i,j,k)+psi.get3(i+2,j,k)+psi.get3(i-2,j,k))/dx4
                        +(-4*(psi.get3(i,j+1,k)+psi.get3(i,j-1,k))
                        +6*psi.get3(i,j,k)+psi.get3(i,j+2,k)+psi.get3(i,j-2,k))/dy4
                        +(gamma_q.get3(i,j,k)/Model.g*(-4*(phi.get3(i+1,j,k)+phi.get3(i-1,j,k))
                        +6*phi.get3(i,j,k)+phi.get3(i+2,j,k)+phi.get3(i-2,j,k))/dx4
                        +(-4*(phi.get3(i,j+1,k)+phi.get3(i,j-1,k))
                        +6*phi.get3(i,j,k)+phi.get3(i,j+2,k)+phi.get3(i,j-2,k))/dy4)
                        ));
                }
            }
        }
    }
}
