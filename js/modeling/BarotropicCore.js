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
import { VariableDescription } from "./VariableDescription.js"

export class BarotropicCore extends DynamicsCore
{
    /**
     * 
     * @returns {undefined}
     */
    constructor() 
    {
        super();
    }
    
    /**
     * Renvoie les variables requises pour la partie dynamique
     * @returns {Array}
     */
    getVariablesDescriptions()
    {
        return [
            Object.assign(new VariableDescription(), {"category": VariableDescription.CAT_PRONOSTIC, "name":"U", "description":"U component of wind", "units":"m.s^-1", "verticalPosition":VariableDescription.VERTICAL_POSITION_SURFACE}),
            Object.assign(new VariableDescription(), {"category": VariableDescription.CAT_PRONOSTIC, "name":"V", "description":"V component of wind", "units":"m.s^-1", "verticalPosition":VariableDescription.VERTICAL_POSITION_SURFACE}),
            Object.assign(new VariableDescription(), {"category": VariableDescription.CAT_PRONOSTIC, "name":"phi", "description":"geopotential height of the top of the model layer", "units":"m^2.s^-1", "verticalPosition":VariableDescription.VERTICAL_POSITION_SURFACE}),
            
            Object.assign(new VariableDescription(), {"category": VariableDescription.CAT_INTERNAL, "name":"U_tdcy", "description":"U tendency", "units":"", "verticalPosition":VariableDescription.VERTICAL_POSITION_SURFACE}),
            Object.assign(new VariableDescription(), {"category": VariableDescription.CAT_INTERNAL, "name":"V_tdcy", "description":"V tendency", "units":"", "verticalPosition":VariableDescription.VERTICAL_POSITION_SURFACE}),
            Object.assign(new VariableDescription(), {"category": VariableDescription.CAT_INTERNAL, "name":"phi_tdcy", "description":"geopotential tendency", "units":"", "verticalPosition":VariableDescription.VERTICAL_POSITION_SURFACE}),

            Object.assign(new VariableDescription(), {"category": VariableDescription.CAT_DIAGNOSTIC, "name":"K", "description":"kinetic energy", "units":"J", "verticalPosition":VariableDescription.VERTICAL_POSITION_SURFACE}),
            Object.assign(new VariableDescription(), {"category": VariableDescription.CAT_DIAGNOSTIC, "name":"tourbillon", "description":"absolute vorticity potential", "units": "S^-1", "verticalPosition":VariableDescription.VERTICAL_POSITION_SURFACE}),

            // Les variables f et m ne devraient-elles pas plutôt être considérées comme paramètre ?
            // Ou comme catégorie spéciale ?
            Object.assign(new VariableDescription(), {"category": VariableDescription.CAT_INTERNAL, "name":"f", "description":"coriolis factor", "units":"", "verticalPosition":VariableDescription.VERTICAL_POSITION_SURFACE}),
            Object.assign(new VariableDescription(), {"category": VariableDescription.CAT_INTERNAL, "name":"m", "description":"scaling factor", "units": "", "verticalPosition":VariableDescription.VERTICAL_POSITION_SURFACE})
        ];
    }
    
    /**
     * Initialisation des variables
     * @returns {undefined}
     */
    init()
    {
        super.init();
    }
    
    /**
     * Calcule la tendance de la composante V du vent
     * @returns {undefined}
     */    
    calcU_tdcy()
    {
        if (this._model.horizontalStaggering=="C") 
        {
            var xi = 0;
            var v = 0;
            var kphi=0;
            var i;
            for (var y=1;y<this._model.height-1;y++)
            {
                for(var x=1;x<this._model.width-1;x++)
                {
                    i = x+y*this._model.width;

                    xi = 0.5*(this._model.tourbillon[i]+this._model.f[i]+this._model.tourbillon[i-this._model.width]+this._model.f[i-this._model.width]);

                    v = (this._model.V[i]+this._model.V[i+1]+this._model.V[i-this._model.width]+this._model.V[i+1-this._model.width])/4;

                    kphi = (this._model.K[i+1]+this._model.phi[i+1]-(this._model.K[i]+this._model.phi[i]))/this._model.dx;

                    this._model.U_tdcy[i] = xi*v - kphi;

                    // Discretisation alternative
                    /*xi = 0.5*(this._model.tourbillon[i]+this._model.tourbillon[i-this._model.width]);
                    v = ((this._model.phi[i]+this._model.phi[i+this._model.width])*this._model.V[i]
                            +(this._model.phi[i+1]+this._model.phi[i+1+this._model.width])*this._model.V[i+1]
                            +(this._model.phi[i]+this._model.phi[i-this._model.width])*this._model.V[i-this._model.width]
                            +(this._model.phi[i+1]+this._model.phi[i+1-this._model.width])*this._model.V[i+1-this._model.width])/8;
                    kphi = (this._model.K[i+1]+this._model.phi[i+1]-(this._model.K[i]+this._model.phi[i]))/this._model.dx;
                    this._model.U_tdcy[i] = xi*v - kphi;*/
                }
            }
        } 
        else
        {
            var c1, c2, c3, c4;
            var kphi=0;
            var i;
            for (var y=1;y<this._model.height-1;y++)
            {
                for(var x=1;x<this._model.width-1;x++)
                {
                    i = x+y*this._model.width;

                    c1 = this._model.K[i+1];
                    c2 = this._model.phi[i+1];
                    c3 = this._model.K[i-1];
                    c4 = this._model.phi[i-1];

                    kphi = (c1+c2-c3-c4)/(2*this._model.dx);

                    this._model.U_tdcy[i] = (this._model.tourbillon[i]+this._model.f[i])*this._model.V[i] - kphi;
                }
            }
        }
    }

    /**
     * Calcule la tendence de la composante V du vent
     */
    calcV_tdcy()
    {
        if (this._model.horizontalStaggering=="C") 
        {
            var xi = 0;
            var u = 0;
            var kphi=0;
            var i;
            for (var y=1;y<this._model.height-1;y++)
            {
                for(var x=1;x<this._model.width-1;x++)
                {
                    i = x+y*this._model.width;

                    xi = 0.5*(this._model.tourbillon[i-1]+this._model.f[i-1]+this._model.tourbillon[i]+this._model.f[i]);

                    u = (this._model.U[i-1]+this._model.U[i]+this._model.U[i-1+this._model.width]+this._model.U[i+this._model.width])/4;

                    kphi = (this._model.K[i]+this._model.phi[i]-(this._model.K[i+this._model.width]+this._model.phi[i+this._model.width]))/this._model.dy;

                    this._model.V_tdcy[i] = -xi*u - kphi;

                    // Discretisation alternative
                    /*xi = 0.5*(this._model.tourbillon[i-1]+this._model.tourbillon[i]);

                    u = ((this._model.phi[i]+this._model.phi[i-1])*this._model.U[i-1]
                            +(this._model.phi[i]+this._model.phi[i+1])*this._model.U[i]
                            +(this._model.phi[i-1+this._model.width]+this._model.phi[i+this._model.width])*this._model.U[i-1+this._model.width]
                            +(this._model.phi[i+this._model.width]+this._model.phi[i+1+this._model.width])*this._model.U[i+this._model.width])/8;

                    kphi = (this._model.K[i]+this._model.phi[i]-(this._model.K[i+this._model.width]+this._model.phi[i+this._model.width]))/this._model.dy;

                    this._model.V_tdcy[i] = -xi*u - kphi;*/
                }
            }
        }
        else
        {
            var c1, c2, c3, c4;
            var kphi=0;
            var i;
            for (var y=1;y<this._model.height-1;y++)
            {
                for(var x=1;x<this._model.width-1;x++)
                {
                    i = x+y*this._model.width;

                    c1 = this._model.K[i-this._model.width];
                    c2 = this._model.phi[i-this._model.width];
                    c3 = this._model.K[i+this._model.width];
                    c4 = this._model.phi[i+this._model.width];

                    kphi = (c1+c2-c3-c4)/(2*this._model.dy);

                    this._model.V_tdcy[i] = -(this._model.tourbillon[i]+this._model.f[i])*this._model.U[i] - kphi;
                }
            }
        }
    }

    /**
     * Calcule la tendance du géopotentiel
     * @returns {undefined}
     */
    calcphi_tdcy()
    {
        if (this._model.horizontalStaggering=="C") 
        {
            var m = 0
            var i;
            var d = 0;
            for (var y=1;y<this._model.height-1;y++)
            {
                for(var x=1;x<this._model.width-1;x++)
                {
                    i = x+y*this._model.width;

                    m = this._model.m[i];

                    d = this._model.phi_tdcy[i] = -(m*m)*(
                        ((this._model.phi[i]+this._model.phi[i+1])*this._model.U[i] - (this._model.phi[i-1]+this._model.phi[i])*this._model.U[i-1])*0.5/this._model.dx
                       + 
                        ((this._model.phi[i-this._model.width]+this._model.phi[i])*this._model.V[i-this._model.width] - (this._model.phi[i]+this._model.phi[i+this._model.width])*this._model.V[i])*0.5/this._model.dy
                       );

                    this._model.phi_tdcy[i] = d;
                }
            }
        }
        else
        {
            var m = 0
            var xi = 0;
            var u = 0;
            var a1, a2, a3, a4;
            var b1, b2, b3, b4;
            var i;
            for (var y=1;y<this._model.height-1;y++)
            {
                for(var x=1;x<this._model.width-1;x++)
                {
                    i = x+y*this._model.width;

                    m = this._model.m[i];

                    this._model.phi_tdcy[i] = -(m*m)*(
                            (this._model.phi[i+1]*this._model.U[i+1] - this._model.phi[i-1]*this._model.U[i-1])/(this._model.dx*2)
                            +(this._model.phi[i-this._model.width]*this._model.V[i-this._model.width] - this._model.phi[i+this._model.width]*this._model.V[i+this._model.width])/(this._model.dy*2)
                        );
                }
            }
        }
    }

    /**
     * Calcule l'énergie
     * @returns {undefined}
     */
    calcK()
    {
        if (this._model.horizontalStaggering==Model.HS_GRID_C) 
        {
            var i = 0;
            var u1 = 0, u2 = 0;
            var v1 = 0, v2 = 0;
            for (var y=1;y<this._model.height-1;y++)
            {
                for(var x=1;x<this._model.width-1;x++)
                {
                    i = x+y*this._model.width;
                    u1 = this._model.U[i-1];
                    u2 = this._model.U[i];
                    v1 = this._model.V[i];
                    v2 = this._model.V[i-this._model.width]
                    this._model.K[i] = this._model.m[i]*this._model.m[i]*(
                            0.5*(u1*u1 + u2*u2)
                            +0.5*(v1*v1 + v2*v2)
                        )/2;
                }
            }
        }
        else
        {
            var i = 0;
            var u1 = 0;
            var v1 = 0;
            for (var y=1;y<this._model.height-1;y++)
            {
                for(var x=1;x<this._model.width-1;x++)
                {
                    i = x+y*this._model.width;
                    u1 = this._model.U[i];
                    v1 = this._model.V[i];
                    this._model.K[i] = this._model.m[i]*this._model.m[i]*0.5*(u1*u1+v1*v1);
                }
            }                
        }
    }

    /**
     * Calcule le tourbillon absolu potentiel
     * @returns {undefined}
     */
    calctourbillon()
    {
        if (this._model.horizontalStaggering=="C") 
        {
            var i = 0;
            var m1=0, m2=0, m3=0, m4=0;
            var u1 = 0, u2 = 0;
            var v1 = 0, v2 = 0;

            for (var y=1;y<this._model.height-1;y++)
            {
                for(var x=1;x<this._model.width-1;x++)
                {
                    i = x+y*this._model.width;
                    m1 = this._model.m[i+this._model.width];
                    m2 = this._model.m[i+1+this._model.width];
                    m3 = this._model.m[i];
                    m4 = this._model.m[i+1];

                    this._model.tourbillon[i] = (
                            0.25*(m1*m1+m2*m2+m3*m3+m4*m4)
                            *(
                                 (this._model.V[i+1]-this._model.V[i])/this._model.dx - (this._model.U[i]-this._model.U[i+this._model.width])/this._model.dy
                             )
                        );
                    // Discretisation alternative
/*                        this._model.tourbillon[i] = (
                            0.25*(m1*m1+m2*m2+m3*m3+m4*m4)
                            *(
                                 (this._model.V[i+1]-this._model.V[i])/this._model.dx - (this._model.U[i]-this._model.U[i+this._model.width])/this._model.dy
                             )+this._model.f[i]
                        )/(0.25*(this._model.phi[i]+this._model.phi[i+1]+this._model.phi[i+this._model.width]+this._model.phi[i+this._model.width+1]));*/
                }
            }
        }
        else
        {
            var i = 0;
            var m1 = 0;
            var u1 = 0, u2 = 0;
            var v1 = 0, v2 = 0;

            for (var y=1;y<this._model.height-1;y++)
            {
                for(var x=1;x<this._model.width-1;x++)
                {
                    i = x+y*this._model.width;

                    m1 = this._model.m[i];

                    u1 = this._model.U[i-this._model.width];
                    u2 = this._model.U[i+this._model.width];

                    v1 = this._model.V[i+1];
                    v2 = this._model.V[i-1];

                    this._model.tourbillon[i] = m1*m1
                            *((v1-v2)/(2*this._model.dx)
                              - (u1-u2)/(2*this._model.dy)
                             );
                }
            }
        }
    }
}
