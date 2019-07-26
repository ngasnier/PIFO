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
import { Variable } from "../modeling/Model.js";

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
            var sfcgeop_in = data_in["temperature"].getData();
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
            var nabla, nabla_x, nabla_y = this.calcLaplacian(m_in);
            
            // 2 Calculer les coefficients de forçage
            var [Ts, Tsl] = this.guessTs(tmp_in[tmp_in.length-1], phi_in[phi_in.length-1], sfcgeop_in);
            var PIs = this.exner(ps_in);
            var thetas = this.calcTheta(Ts, ps_in);
            var F = this.calcForcing(PIs, thetas, sfcgeop_in, m_in);
            
            // 3 Calculer la première estimation
            
            // 4 Résoudre l'équation de Poisson
            
            
            var variable_out = Variable.createVariable(ps_in.nbLevels, ps_in.width, ps_in.height, false);
                       
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
        
        // Calcul final
        var Tsmin = Variable.min(Ts);
        var Tsmax = Variable.max(Ts);
        var wt = 0;
        var ts2 = 0;
        for (var i=0;i<wt.length;i++)
        {
            wt = (Ts[i]-0.5*(Tsmax+Tsmin))/(Tsmax-0.5*(Tsmax+Tsmin));
            ts2 = 0.5*(Ts[i]+Math.min(Tsmax, Math.max(Tsmin, Ts[i])));
            Ts[i] = Ts[i]*wt + (1-wt)*ts2;
            Tsl[i] = Tsl[i]*wt + (1-wt)*Math.min(ts2+phi_s[i]*Model.StdTmpLapseRate/Model.g, Math.max(Tsmin, ts2));
        }
        
        return [ Ts, Tsl ] ;
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
        var i=this.model.width+1;
        var m2 = 0;
        var dx2 = this.model.dx*this.model.dx;
        var dy2 = this.model.dy*this.model.dy;
        for (var y=1;y<this.model.height;y++,i+=2)
        {
            for (var x=1;x<this.model.width;x++)
            {
                m2 = m[i]*m[i];
                nabla[i] = -2*(m2/dx2 - m2/dy2);
                nabla_x[i] = m2/dx2;
                nabla_y[i] = m2/dy2;
            }
        }
        return [ nabla, nabla_x, nabla_y];
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
    
    calcForcing(PIs, thetas, phi_s, m)
    {
        var F = Variable.createVariable(0, this.model.width, this.model.height);
        var i=this.model.width+1;
        var width=this.model.width;
        var height=this.model.height;
        var m2 = 0;
        var dx2 = this.model.dx*this.model.dx;
        var dy2 = this.model.dy*this.model.dy;
        for (var y=1;y<this.model.height;y++,i+=2)
        {
            for (var x=1;x<this.model.width;x++)
            {
                m2 = m[i]*m[i];
                F[i] = m2*(-2*(PIs[i]/dx2 - PIs[i]/dy2)
                        + PIs[i-1]/dx2 + PIs[i+1]/dx2
                        + PIs[i-width]/dy2 + PIs[i+width]/dy2)
                        
                    +m[i]/Model.Cp*(
                        // TODO Points de grille à  calculer... quand il fera moins chaud
                    );
            }
        }
        return F;
    }
}