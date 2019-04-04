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
import { BarotropicCore } from "./BarotropicCore.js";
import { Model } from "./Model.js"
import { Variable } from "./Variable.js"
import { VariableDescription } from "./VariableDescription.js"

/**
 * Coeur dynamique barotrope, résolution semi-implicite.
 * @type type
 */
export class BarotropicSemiImplicitCore extends BarotropicCore
{
    constructor() 
    {
        super();
        this.si_phi_star = 15000;
    }
    
    getVariablesDescriptions()
    {
        var vars = super.getVariablesDescriptions();
        
        return vars.concat([
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_INTERNAL, name:"divergence", description:"divergence at time T", units:"", offsetx:0, offsety:0, verticalPosition:VariableDescription.VERTICAL_POSITION_SURFACE}),
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_INTERNAL, name:"divergence_t", description:"divergence at time T-1", units:"", offsetx:0, offsety:0, verticalPosition:VariableDescription.VERTICAL_POSITION_SURFACE}),

            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_INTERNAL, name:"si_cx", description:"lateral coefficient of Hemlholz matrix", units:"", offsetx:0, offsety:0, verticalPosition:VariableDescription.VERTICAL_POSITION_SURFACE}),
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_INTERNAL, name:"si_cy", description:"vertical coefficient of Hemlholz matrix", units:"", offsetx:0, offsety:0, verticalPosition:VariableDescription.VERTICAL_POSITION_SURFACE}),
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_INTERNAL, name:"si_xy", description:"diagonal coefficient of Hemlholz matrix", units:"", offsetx:0, offsety:0, verticalPosition:VariableDescription.VERTICAL_POSITION_SURFACE}),
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_INTERNAL, name:"si_phi_b", description:"vector of Hemlholz system", units:"", offsetx:0, offsety:0, verticalPosition:VariableDescription.VERTICAL_POSITION_SURFACE}),
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_INTERNAL, name:"si_residu", description:"residual of Hemlholz system", units:"", offsetx:0, offsety:0, verticalPosition:VariableDescription.VERTICAL_POSITION_SURFACE}),
            
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_INTERNAL, name:"phi_trans", description:"transcient value for phi", units:"", offsetx:0, offsety:0, verticalPosition:VariableDescription.VERTICAL_POSITION_SURFACE}),
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_INTERNAL, name:"div_tmp", description:"temp variable for divergence calculations", units:"", offsetx:0, offsety:0, verticalPosition:VariableDescription.VERTICAL_POSITION_SURFACE}),
            Object.assign(new VariableDescription(), {category: VariableDescription.CAT_INTERNAL, name:"tmp_var", description:"temp variable for various calculations", units:"", offsetx:0, offsety:0, verticalPosition:VariableDescription.VERTICAL_POSITION_SURFACE})
            
        ]);
    }
    
    setup()
    {
        super.setup();

    }
    
    solveBegin()
    {
        // Premier pas de temps
        if (this._model.time==0) {
            Variable.copy(this._model.phi, this._model.phi_trans);
            this.calcDivergence(this._model.U, this._model.V, this._model.divergence);
            Variable.copy(this._model.divergence, this._model.divergence_t);
            
            //this.si_phi_star = Variable.mean(this._model.phi);
        }

        // Tant qu'on connait encore phi(t-dt), calcule le terme d'ajustement 
        // transitoire 2phi(t)+phi(t-dt) pour calculer les transcients U et V
        this.calcDivergence(this._model.U, this._model.V, this._model.divergence);
        Variable.mulConst(this._model.phi_t, -1, this._model.phi_trans); // -phi(t-dt)
        Variable.a_bc(this._model.phi_trans, this._model.phi, 2, this._model.phi_trans); // 2*phi(t)-phit(t-dt)
    }
    
    solveEnd()
    {
        // *** Calcul des transcients 
        this.calcDx(this._model.phi_trans, this._model.tmp_var);
        Variable.a_bc(this._model.U_t, this._model.tmp_var, this._model.dt, this._model.U_t);

        this.calcDy(this._model.phi_trans, this._model.tmp_var);
        Variable.a_bc(this._model.V_t, this._model.tmp_var, this._model.dt, this._model.V_t);

        // Terme de divergence
        Variable.mulConst(this._model.divergence_t, -1, this._model.div_tmp);
        Variable.a_bc(this._model.div_tmp, this._model.divergence, 2, this._model.div_tmp);
        Variable.mul(this._model.m, this._model.div_tmp, this._model.div_tmp); // * m^2 
        Variable.mul(this._model.m, this._model.div_tmp, this._model.div_tmp);                
        Variable.a_bc(this._model.phi_t, this._model.div_tmp, this._model.dt*this.si_phi_star, this._model.phi_trans);

        // *** Résolution de l'équation de helmholtz
        this.calcDivergence(this._model.U_t, this._model.V_t, this._model.div_tmp); 
        this.initPhiAMatrix();
        this.initPhiBVector();
        
        Variable.copy(this._model.phi, this._model.phi_t);
        //console.log("convergence : "+this.sor(this._model.si_phi_b, 1.4, this._model.phi_t, this._model.si_residu, 0.000001, 1000));

        // *** Calcul du vent et du géopotentiel final
        this.calcDx(this._model.phi_t, this._model.tmp_var);
        Variable.a_bc(this._model.U_t, this._model.tmp_var, -this._model.dt, this._model.U_t);
        this.calcDy(this._model.phi_t, this._model.tmp_var);
        Variable.a_bc(this._model.V_t, this._model.tmp_var, -this._model.dt, this._model.V_t);
        
        var tmp = this._model.divergence_t; this._model.divergence_t = this._model.divergence; this._model.divergence = tmp;
    }
    
    calcDivergence(u, v, res)
    {
        var i = this._model.width+1;
        for (var y=1;y<this._model.height-1;y++)
        {
            for(var x=1;x<this._model.width-1;x++,i++)
            {
                res[i] = (u[i]-u[i-1])/this._model.dx+(v[i-this._model.width]-v[i])/this._model.dy;
            }
            i+=2;
        }
    }

    sor(b, w, x, r, epsilon=0.000001, maxiter=1000)
    {
        var i, j;
        var s, k;
        var nr;
        var nb = this._model.width * this._model.height;

        for (i=0;i<nb;i++) r[i] = 1;
        nr = nb;

        k=0;
        while (nr>epsilon && k<maxiter)
        {
            k++;
            nr = 0;
            for (i=0;i<nb;i++)
            {
                s = 0;
                if (i-this._model.width>=0) s += this._model.si_cy[i]*x[i-this._model.width];
                if (i-1>=0) s += this._model.si_cx[i]*x[i-1];
                if (i+1<nb) s += this._model.si_cx[i]*x[i+1];
                if (i+this._model.width<nb) s += this._model.si_cy[i]*x[i+this._model.width];
                x[i] = (1-w)*x[i]+w/this._model.si_xy[i]*(b[i]-s);

                r[i] = 0;
                if (i-this._model.width>=0) r[i] += this._model.si_cy[i]*x[i-this._model.width];
                if (i-1>=0) r[i]+= this._model.si_cx[i]*x[i-1];
                r[i] += this._model.si_xy[i]*x[i]
                if (i+1<nb) r[i]+= this._model.si_cx[i]*x[i+1];
                if (i+this._model.width<nb) r[i]+= this._model.si_cy[i]*x[i+this._model.width];
                r[i] -= b[i];
                nr += r[i]*r[i];
            }
            nr = Math.sqrt(nr);
        }
        return k;
    }
        
        
    initPhiAMatrix()
    {
        var i = 0;
        var cx, cy;
        for (var y=0;y<this._model.height;y++)
        {
            for(var x=0;x<this._model.width;x++,i++)
            {
                cx = -this._model.m[i]*this._model.m[i]*this._model.dt*this._model.dt*this.si_phi_star/(this._model.dx*this._model.dx);
                cy = -this._model.m[i]*this._model.m[i]*this._model.dt*this._model.dt*this.si_phi_star/(this._model.dy*this._model.dy);

                if (x>0 && x<this._model.width-1 && y>0 && y<this._model.height-1)
                {
                    this._model.si_xy[i] = 2*this._model.m[i]*this._model.m[i]*this._model.dt*this._model.dt*this.si_phi_star*(1/(this._model.dx*this._model.dx)+1/(this._model.dy*this._model.dy))+1; 
                    this._model.si_cx[i] = cx;
                    this._model.si_cy[i] = cy;
                }
                else
                {
                    // Conditions aux limites
                    this._model.si_xy[i] = 1;
                    this._model.si_cx[i] = 0;
                    this._model.si_cy[i] = 0;
                }
            }
        }
    }
        
    initPhiBVector()
    {
        var i = 0;
        var cx, cy;
        for (var y=0;y<this._model.height;y++)
        {
            for(var x=0;x<this._model.width;x++,i++)
            {
                // tmp_var contient la divergence de U et V transitoires
                if (x>0 && x<this._model.width-1 && y>0 && y<this._model.height-1)
                    this._model.si_phi_b[i] = this._model.phi_trans[i]-this._model.m[i]*this._model.m[i]*this._model.dt*this._model.div_tmp[i];
                else
                    // Conditions aux limites
                    this._model.si_phi_b[i] = this._model.phi[i];
            }
        }
    }

    calcDx(f, res)
    {
        var i = this._model.width+1;
        for (var y=1;y<this._model.height-1;y++)
        {
            for(var x=1;x<this._model.width-1;x++,i++)
            {
                res[i] = (f[i+1]-f[i])/this._model.dx;
            }
            i+=2;
        }
    }

    calcDy(f, res)
    {
        var i = this._model.width+1;
        for (var y=1;y<this._model.height-1;y++)
        {
            for(var x=1;x<this._model.width-1;x++,i++)
            {
                res[i] = (f[i]-f[i+this._model.width])/this._model.dy;
            }
            i+=2;
        }
    }

}