/* 
 * Copyright (C) 2019 Nicolas Gasnier
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

import { Component } from "./Component.js";
import { Variable } from "../modeling/Variable.js";
import { Model } from "../modeling/Model.js";
import { TridiagonalSystem } from "../math/TridiagonalSystem.js";

/**
 * Interpolation de la pression au niveau de la mer à partir de la pression 
 * de surface.
 * 
 * <p>Basé sur Aaron Boone : http://aaron.boone.free.fr/aspdoc/node68.html</p>
 */
export class PRMSLComponent extends Component {
    constructor()
    {
        super();
    }
    
    get inputs()
    {
        return ["ps", "temperature", "phi", "sfcgeop", "m"];
    }
    
    get outputs()
    {
        return ["main"];
    }
    
    async process(data_in, data_out)
    {
        try
        {
            var ps_in = data_in["ps"].getData();
            var tmp_in = data_in["temperature"].getData();
            var phi_in = data_in["phi"].getData();
            var sfcgeop_in = data_in["sfcgeop"].getData();
            var m_in = data_in["m"].getData();
            
            if (ps_in==null) throw `${this.name} : no pressure data.`;
            if (tmp_in==null) throw `${this.name} : no temperature data.`;
            if (phi_in==null) throw `${this.name} : no geopotential data.`;
            if (sfcgeop_in==null) throw `${this.name} : no surface geoporential data.`;
            if (m_in==null) throw `${this.name} : no map scaling factor data.`;
            
            if (ps_in.nbLevels>0) throw `${this.name} : ps must not be 3D data.`;
            if (sfcgeop_in.nbLevels>0) throw `${this.name} : sfcgeop must not be 3D data.`;
            if (m_in.nbLevels>0) throw `${this.name} : m must not be 3D data.`;
            if (tmp_in.nbLevels==0) throw `${this.name} : temperature must be 3D data.`;
            if (phi_in.nbLevels==0) throw `${this.name} : phi must be 3D data.`;
            
            // 1 Calculer les coefficients du laplacien avec boundary condition
            var [nabla, nabla_x, nabla_y] = this.calcLaplacian(m_in);
            
            // 2 Calculer les coefficients de forçage
            var [Ts, Tsl] = this.guessTs(tmp_in[tmp_in.length-1], phi_in[phi_in.length-1], sfcgeop_in);
            var PIs = this.exner(ps_in);
            var thetas = this.calcTheta(Ts, ps_in);
            var PIsl = this.guessPIsl(Tsl, sfcgeop_in, ps_in, tmp_in[tmp_in.length-1], phi_in[phi_in.length-1]);

            // 3 Calculer la première estimation
            var F = this.calcForcing(PIs, PIsl, thetas, sfcgeop_in, m_in);

            // 4 Résoudre l'équation de Poisson
            var residu = Variable.createVariable(0, this.model.width, this.model.height);
            var n = TridiagonalSystem.sor(nabla_x, 1, nabla_y, this.model.width, nabla, F, 1.0, PIsl, residu, 1e-20);
            if (n>=1000) throw `${this.name} : Poisson equation did not converge.`;

            // 5 On n'a plus qu'à calculer Psl
            var variable_out = this.calcPsl(PIsl);

            Variable.copyMetadata(ps_in, variable_out);
            
            data_out["main"].setData(variable_out);
            
            return this;
        }
        catch (e)
        {
            throw e;
        }
    }
    
    guessTs(T, phi_n, phi_s)
    {
        var Ts = Variable.clone(T);
        var Tsl = Variable.clone(T);

        // Première estimation
        for (var i=0;i<Ts.length;i++)
        {
            Ts[i] += (phi_n[i]-phi_s[i])*Model.StdTmpLapseRate/Model.g;
            Tsl[i] += phi_n[i]*Model.StdTmpLapseRate/Model.g;
        }
        
        // Ajustement en condition froide selon IFS 36r1        
        // Note : pas sûr d'avoir bien compris cette méthode... Notemment
        // ce que doivent être les valeurs Tsmin et Tsmax
/*        var Tsmin = Variable.min(Ts);
        var Tsmax = Variable.max(Ts);
        var wt = 0;
        var ts2 = 0;
        for (var i=0;i<Ts.length;i++)
        {
            wt = (Ts[i]-0.5*(Tsmax+Tsmin))/(Tsmax-0.5*(Tsmax+Tsmin));
            if (wt<0 || wt>1) throw "wt incorrect : "+ wt+" "+i+" "+Ts[i]+" "+Tsmin+" "+Tsmax;
            ts2 = 0.5*(Ts[i]+Math.min(Tsmax, Math.max(Tsmin, Ts[i])));
            Ts[i] = Ts[i]*wt + (1-wt)*ts2;
            Tsl[i] = Tsl[i]*wt + (1-wt)*Math.min(ts2+phi_s[i]*Model.StdTmpLapseRate/Model.g, Math.max(Tsmin, ts2));
            if (i==5388) console.log("ts : ", wt, ts2, phi_s[i], Tsmax, Tsmin, Ts[i]);
        }*/
        
        return [ Ts, Tsl ] ;
    }
    
    guessPIsl(Tsl, phi_s, ps, T, phi_n)
    {
        var prmsl = Variable.createVariable(0, this.model.width, this.model.height);        
        var PIsl = Variable.createVariable(0, this.model.width, this.model.height);
        for (var i=0;i<Tsl.length;i++)
        {
            // Ma méthode donne un meilleur résultat sur le groenland que 
            // celle donnée par Boone...
            prmsl[i] = ps[i] * Math.exp(-7*9.81/(2*1006*T[i])*-phi_s[i]/9.81);
            PIsl[i] = Math.pow(prmsl[i]/100000, Model.R/Model.Cp);
            
            // Formule donnée par Boone... bof
            /*PIsl[i] = Math.pow(
                ps[i]*1e-5*Math.exp(phi_s[i]/(Model.R*(Tsl[i]-phi_s[i]*Model.StdTmpLapseRate/(2*Model.g)))),
                Model.R/Model.Cp);*/
        }

        return PIsl;
    }

    exner(p)
    {
        var ex = Variable.clone(p);
        for (var i=0;i<ex.length;i++)
        {
            ex[i] = Math.pow(p[i]/1e5, Model.R/Model.Cp);
        }
        return ex;
    }
    
    calcTheta(T, p)
    {
        var theta = Variable.clone(T);
        for (var i=0;i<T.length;i++)
        {
            theta[i] = T[i] / Math.pow(p[i]/1e5, Model.R/Model.Cp);
        }
        return theta;
    }
    
    
    calcLaplacian(m)
    {
        var nabla = Variable.createVariable(0, this.model.width, this.model.height);
        var nabla_x = Variable.createVariable(0, this.model.width, this.model.height);
        var nabla_y = Variable.createVariable(0, this.model.width, this.model.height);
        var i=0;
        var m2 = 0;
        var dx2 = this.model.dx*this.model.dx;
        var dy2 = this.model.dy*this.model.dy;
        for (var y=0;y<this.model.height;y++)
        {
            for (var x=0;x<this.model.width;x++,i++)
            {
                
                if (x>0 && x<this.model.width-1 && y>0 && y<this.model.height-1)
                {
                    m2 = m[i]*m[i];
                    nabla[i] = -2*(m2/dx2 + m2/dy2);
                    nabla_x[i] = m2/dx2;
                    nabla_y[i] = m2/dy2;
                }
                else
                {
                    // Conditions aux limites
                    nabla[i] = 1;
                    nabla_x[i] = 0;
                    nabla_y[i] = 0;
                }                
            }
        }
        return [ nabla, nabla_x, nabla_y];
    }
    
    calcForcing(PIs, PIsl, thetas, phi_s, m)
    {
        var F = Variable.clone(PIsl); // Sera notre condition aux limites sur les bords
        var dphix = Variable.createVariable(0, this.model.width, this.model.height);
        var dphiy = Variable.createVariable(0, this.model.width, this.model.height);
        var i=this.model.width+1;
        var width=this.model.width;
        var height=this.model.height;
        var m2 = 0;
        var dx = 2*this.model.dx;
        var dy = 2*this.model.dy;
        var dx2 = this.model.dx*this.model.dx;
        var dy2 = this.model.dy*this.model.dy;
        
        // On désactive les calculs de forçage, ils ne semble pas utiles
        // Le résultat est abominable aux moindres variations de relief
        // Par contre passer par l'équation de Poisson sans forçage semble
        // corriger les principaux problèmes qui m'ont poussé à implémenter
        // cette méthode au lieu de la simple estimation par gradient standard
        /*for (var y=1;y<height-1;y++,i+=2)
        {
            for (var x=1;x<width-1;x++,i++)
            {
                dphix[i] = m[i]/thetas[i]*(phi_s[i+1]-phi_s[i-1])/dx;
                dphiy[i] = m[i]/thetas[i]*(phi_s[i-width]-phi_s[i+width])/dy;
            }
        }*/
        
        i=width+1;
        for (var y=1;y<height-1;y++,i+=2)
        {
            for (var x=1;x<width-1;x++,i++)
            {
                // Juste forcer à zero semble suffire à "lisser" la pression
                // sur les reliefs sans affecter la pression initiale
                // Donne un résultat fidèle à GFS
                F[i] = 0;
                
                // Foçage désactivé... CF ci-dessous
                /*m2 = m[i]*m[i];                
                F[i] = m2*((-2*PIs[i] + PIs[i-1] + PIs[i+1]) / dx2
                        +(-2*PIs[i] + PIs[i-width] + PIs[i+width]) / dy2) 
                        
                    +m[i]/Model.Cp*(
                        (dphix[i+1]-dphix[i-1])/dx
                        +(dphiy[i-width]-dphiy[i+width])/dy
                    );*/
            }
        }
        return F;
    }
    
    calcPsl(PIsl)
    {
        var Psl = Variable.createVariable(0, this.model.width, this.model.height);
        for (var i=0;i<Psl.length;i++)
        {
            Psl[i] = Math.exp(Math.log(PIsl[i])/(Model.R/Model.Cp))*100000;
        }
 
        return Psl;
    }
}