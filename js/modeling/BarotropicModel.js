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

import { Model } from '/js/modeling/Model.js';
import { Variable } from '/js/modeling/Variable.js';

/**
 * Modèle barotrope en grille A et C et intégration temporelle en différences 
 * centrales.
 * 
 * @returns {BarotropicModel}
 */
export var BarotropicModel = function ()
{  
    Model.call(this);
        
    // Largeur de la zone de relaxation pour le couplage.
    this.relaxation = 2;
    
    // Coefficient de couplage avec les bords (calculé par l'init)
    this.alpha = [];
    
    // **** VARIABLES DE LA SIMULATION ****
    
    // Composantes du vent T et T-1
    this.U = [];
    this.U_t = [];
    this.V = [];
    this.V_t = [];
    
    // Geopotentiel pression nulle (=gz où p=0). 
    this.phi = [];
    this.phi_t = [];        
    
    // Energie cinétique par unité de masse = m^2*(U^2+V^2)/2
    this.K = [];
    
    // Tourbillon = m^2(dV/dx-dU/dy)
    this.tourbillon = [];
    
    // Couplage de U avec le domaine global
    this.U_couplage = [];
    
    // Couplage de V avec le domaine global
    this.V_couplage = [];
    
    // Couplage de Z avec le domaine global
    this.phi_couplage = [];    
    
    // Variables intermédiaires
    this.Sphi = [];
    this.Su = [];
    this.Sv = [];
    
    // Quelques diagnostics...
    this.total_masse = 0;
    this.total_energie = 0;
    this.total_tourbillon = 0;
    this.total_enstropie = 0;

    // Combien de temps écoulé depuis le début de simulation
    this.time = 0;
         
    this.couple = function(x, c)
    {
        for (var i=0;i<this.height*this.width;i++)
        {
            x[i] = (1-this.alpha[i])*x[i] + this.alpha[i]*c[i];
        }
    }
    
    // Méthodes privées du modèle
    if( typeof BarotropicModel.initialized == "undefined" ) 
    {
        BarotropicModel.prototype.avanceEuler = function()
        {       
            Variable.a_bc2d(this.U, this.Su, this.dt, this.U_t);
            Variable.a_bc2d(this.V, this.Sv, this.dt, this.V_t);
            Variable.a_bc2d(this.phi, this.Sphi, this.dt, this.phi_t);
        }

        BarotropicModel.prototype.avanceExpliciteCentre = function()
        {       
            Variable.a_bc2d(this.U_t, this.Su, 2*this.dt, this.U_t);
            Variable.a_bc2d(this.V_t, this.Sv, 2*this.dt, this.V_t);
            Variable.a_bc2d(this.phi_t, this.Sphi, 2*this.dt, this.phi_t);
        }
        
        BarotropicModel.prototype.calcSu = function(k)
        {
            if (this.gridType=="C") 
            {
                var xi = 0;
                var v = 0;
                var kphi=0;
                var i;
                for (var y=1;y<this.height-1;y++)
                {
                    for(var x=1;x<this.width-1;x++)
                    {
                        i = x+y*this.width;

                        xi = 0.5*(this.tourbillon[i]+this.f[i]+this.tourbillon[i-this.width]+this.f[i-this.width]);

                        v = (this.V[i]+this.V[i+1]+this.V[i-this.width]+this.V[i+1-this.width])/4;

                        kphi = (this.K[i+1]+this.phi[i+1]-(this.K[i]+this.phi[i]))/(this.dx*this.m[i]);

                        this.Su[i] = xi*v - kphi;
                    }
                }
            } 
            else
            {
                var c1, c2, c3, c4;
                var kphi=0;
                var i;
                for (var y=1;y<this.height-1;y++)
                {
                    for(var x=1;x<this.width-1;x++)
                    {
                        i = x+y*this.width;

                        c1 = this.K[i+1];
                        c2 = this.phi[i+1];
                        c3 = this.K[i-1];
                        c4 = this.phi[i-1];

                        kphi = (c1+c2-c3-c4)/(2*this.dx*this.m[i]);

                        this.Su[i] = (this.tourbillon[i]+this.f[i])*this.V[i] - kphi;
                    }
                }
            }
                
        }
        
        BarotropicModel.prototype.calcSv = function(k)
        {
            if (this.gridType=="C") 
            {
                var xi = 0;
                var u = 0;
                var kphi=0;
                var i;
                for (var y=1;y<this.height-1;y++)
                {
                    for(var x=1;x<this.width-1;x++)
                    {
                        i = x+y*this.width;

                        xi = 0.5*(this.tourbillon[i-1]+this.f[i-1]+this.tourbillon[i]+this.f[i]);

                        u = (this.U[i-1]+this.U[i]+this.U[i-1+this.width]+this.U[i+this.width])/4;

                        kphi = (this.K[i]+this.phi[i]-(this.K[i+this.width]+this.phi[i+this.width]))/this.dy;

                        this.Sv[i] = -xi*u - kphi;
                    }
                }
            }
            else
            {
                var c1, c2, c3, c4;
                var kphi=0;
                var i;
                for (var y=1;y<this.height-1;y++)
                {
                    for(var x=1;x<this.width-1;x++)
                    {
                        i = x+y*this.width;

                        c1 = this.K[i-this.width];
                        c2 = this.phi[i-this.width];
                        c3 = this.K[i+this.width];
                        c4 = this.phi[i+this.width];

                        kphi = (c1+c2-c3-c4)/(2*this.dy);

                        this.Sv[i] = -(this.tourbillon[i]+this.f[i])*this.U[i] - kphi;
                    }
                }
            }
        }
        
        BarotropicModel.prototype.calcSphi = function(k)
        {
            if (this.gridType=="C") 
            {
                var m = 0
                var i;
                var d = 0;
                for (var y=1;y<this.height-1;y++)
                {
                    for(var x=1;x<this.width-1;x++)
                    {
                        i = x+y*this.width;
                        
                        m = this.m[i];

                        d = this.Sphi[i] = -(m*m)*(
                            ((this.phi[i]+this.phi[i+1])*this.U[i] - (this.phi[i-1]+this.phi[i])*this.U[i-1])*0.5/(this.dx*m)
                           + 
                            ((this.phi[i-this.width]+this.phi[i])*this.V[i-this.width] - (this.phi[i]+this.phi[i+this.width])*this.V[i])*0.5/this.dy
                           );
                                               
                        this.Sphi[i] = d;
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
                for (var y=1;y<this.height-1;y++)
                {
                    for(var x=1;x<this.width-1;x++)
                    {
                        i = x+y*this.width;

                        m = this.m[i];

                        this.Sphi[i] = -(m*m)*(
                                (this.phi[i+1]*this.U[i+1] - this.phi[i-1]*this.U[i-1])/(this.dx*2*m)
                                +(this.phi[i-this.width]*this.V[i-this.width] - this.phi[i+this.width]*this.V[i+this.width])/(this.dy*2)
                            );
                    }
                }
            }
        }


        BarotropicModel.prototype.calcEnergy = function()
        {
            if (this.gridType=="C") 
            {
                var i = 0;
                var u1 = 0, u2 = 0;
                var v1 = 0, v2 = 0;
                for (var y=1;y<this.height-1;y++)
                {
                    for(var x=1;x<this.width-1;x++)
                    {
                        i = x+y*this.width;
                        u1 = this.U[i-1];
                        u2 = this.U[i];
                        v1 = this.V[i];
                        v2 = this.V[i-this.width]
                        this.K[i] = this.m[i]*this.m[i]*(
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
                for (var y=1;y<this.height-1;y++)
                {
                    for(var x=1;x<this.width-1;x++)
                    {
                        i = x+y*this.width;
                        u1 = this.U[i];
                        v1 = this.V[i];
                        this.K[i] = this.m[i]*this.m[i]*0.5*(u1*u1+v1*v1);
                    }
                }                
            }
        }

        BarotropicModel.prototype.calcTourbillon = function()
        {
            if (this.gridType=="C") 
            {
                var i = 0;
                var m1=0, m2=0, m3=0, m4=0;
                var u1 = 0, u2 = 0;
                var v1 = 0, v2 = 0;

                for (var y=1;y<this.height-1;y++)
                {
                    for(var x=1;x<this.width-1;x++)
                    {
                        i = x+y*this.width;
                        m1 = this.m[i+this.width];
                        m2 = this.m[i+1+this.width];
                        m3 = this.m[i];
                        m4 = this.m[i+1];

                        this.tourbillon[i] = (
                                0.25*(m1*m1+m2*m2+m3*m3+m4*m4)
                                *(
                                     (this.V[i+1]-this.V[i])/(this.dx*0.25*(m1+m2+m3+m4)) - (this.U[i]-this.U[i+this.width])/this.dy
                                 )
                            );
                    }
                }
            }
            else
            {
                var i = 0;
                var m1 = 0;
                var u1 = 0, u2 = 0;
                var v1 = 0, v2 = 0;

                for (var y=1;y<this.height-1;y++)
                {
                    for(var x=1;x<this.width-1;x++)
                    {
                        i = x+y*this.width;
                        
                        m1 = this.m[i];

                        u1 = this.U[i-this.width];
                        u2 = this.U[i+this.width];

                        v1 = this.V[i+1];
                        v2 = this.V[i-1];

                        this.tourbillon[i] = m1*m1
                                *((v1-v2)/(2*this.dx*m1)
                                  - (u1-u2)/(2*this.dy)
                                 );
                    }
                }
            }
        }  
    
        BarotropicModel.prototype.calcVerifs = function()
        {
            this.total_masse = 0;
            this.total_energie = 0;
            this.total_tourbillon = 0;
            this.total_enstropie = 0;
            for(var i=0;i<this.width*this.height;i++)
            {
                var v = ((this.tourbillon[i]+this.f[i])/this.phi[i]);
                this.total_masse += this.phi[i]*this.dx*this.dy/(this.m[i]*this.m[i]);
                this.total_energie += this.phi[i]*(this.phi[i]/2+this.K[i])*this.dx*this.dy/(this.m[i]*this.m[i]);
                this.total_tourbillon += this.phi[i]*v*this.dx*this.dy/(this.m[i]*this.m[i]);            
                this.total_enstropie += (this.phi[i]/2)*v*v*this.dx*this.dy/(this.m[i]*this.m[i]);
            }
            this.total_masse *= Model.rho/Model.g;
            this.total_energie *= Model.rho/Model.g;
            this.total_tourbillon *= Model.rho/Model.g;
            this.total_enstropie *= Model.rho/Model.g;
        }
        
    }
}

BarotropicModel.prototype = Object.create(Model.prototype);
BarotropicModel.prototype.constructor = BarotropicModel;

/**
 * Initialise le modèle avec les variables qui ont été fournies préalablement.
 * @returns {undefined}
 */ 
BarotropicModel.prototype.init = function()
{
    // *** Calculs dimentionnels ***
    var kr = 0;
    var lat = this.nlat*(Math.PI/180);
    if (this.gridType==Model.GRID_C) lat -= (this.dlat/2)*(Math.PI/180);
    this.dx = 111.1 * this.dlon * 1000;
    this.dy = 111.1 * this.dlat * 1000;
    this.time = 0;
    this.filterCounter = 0;

    // *** Allocation des tableaux ***
    this.K = Variable.createVariable(1, this.width, this.height);
    this.tourbillon = Variable.createVariable(1, this.width, this.height);
    this.U_t = Variable.createVariable(1, this.width, this.height);
    this.V_t = Variable.createVariable(1, this.width, this.height);
    this.phi_t = Variable.createVariable(1, this.width, this.height);     
    this.Su = Variable.createVariable(1, this.width, this.height);
    this.Sv = Variable.createVariable(1, this.width, this.height);
    this.Sphi = Variable.createVariable(1, this.width, this.height);
    this.alpha = Variable.createVariable(1, this.width, this.height);
    this.m = Variable.createVariable(1, this.width, this.height);
    this.f = Variable.createVariable(1, this.width, this.height);

    // *** Pré-calcul des valeurs constantes ***
    for (var y=0;y<this.height;y++)
    {
        for(var x=0;x<this.width;x++)
        {
            var i = x+y*this.width;
            var h = 0;

            // Paramètre de coriolis et facteur d'échelle en fonction de la latitude
            this.f[i] = 2 * Model.omega * Math.sin(lat);

            switch (this.projection)
            {
                case Model.PROJ_CARTESIEN:
                    this.m[i] = 1;
                    break;
                case Model.PROJ_MERCATOR:
                    this.m[i] = Math.cos(lat);
                    break;
                default:
                    //supposé fourni par l'appelant
                    //this.m[i] = 1;
            }

            // Initialisation du couplage
            if (y==0 || y==this.height-1 || x==0 || x==this.width-1)
            {
                this.alpha[i] = 1.0;
            }
            else if (y<1+this.relaxation||y>=this.height-this.relaxation-1
                    ||x<1+this.relaxation||x>=this.width-this.relaxation-1)
            {
                var xd = 0;
                var yd = 0;

                if (x<1+this.relaxation) xd = this.relaxation-x+1;
                else if (x>=this.width-this.relaxation-1) 
                    xd = x-this.width+this.relaxation+2;
                if (y<1+this.relaxation) yd = this.relaxation-y+1;
                else if (y>=this.height-this.relaxation-1) 
                    yd = y-this.height+this.relaxation+2;

                if (xd<yd) xd = yd;
                
                this.alpha[i] = 1-Math.tanh(0.5*(this.relaxation-xd));
              }
            else 
            {
                this.alpha[i] = 0.0;
            }
        }

        lat -= this.dlat*(Math.PI/180);
    }

    // *** Initialise les variables diagnostics pour affichage ***
    this.calcEnergy();
    this.calcTourbillon();
    this.calcVerifs();
}

/**
 * Avance le modème d'un pas en utilisant le schéma explicite centré.
 */ 
BarotropicModel.prototype.step = function()
{
    // *** Calcul des tendances ****
    this.calcSu();
    this.calcSv();
    this.calcSphi();
    
     // *** Calcul des variables pronostiques ***
    if (this.time==0) {
        this.avanceEuler();
    }
    else {
        this.avanceExpliciteCentre();
    }

    // *** Filtrage des champs ***
    this.filterCounter++;
    if (this.filter!=null && this.filterCounter>=this.filterFreq)
    {
        this.filter.applyFilter2D(this.U_t);
        this.filter.applyFilter2D(this.V_t);
        this.filter.applyFilter2D(this.phi_t);

        this.filter.applyFilter2D(this.U);
        this.filter.applyFilter2D(this.V);
        this.filter.applyFilter2D(this.phi);

        this.filterCounter = 0;
    }

    // *** Couplage avec le domaine parent ***
    if (this.relaxation>0)
    {
        this.couple(this.U_t, this.U_couplage);
        this.couple(this.V_t, this.V_couplage);
        this.couple(this.phi_t, this.phi_couplage);
    }

    var tmp = this.U_t; this.U_t = this.U; this.U = tmp;
    tmp = this.V_t; this.V_t = this.V; this.V = tmp;
    tmp = this.phi_t; this.phi_t = this.phi; this.phi = tmp;

    // *** Calculs de vérifications ***
    this.calcVerifs()

    // *** Calcul des variables diagnostiques pour le pas suivant ***
    this.calcEnergy();
    this.calcTourbillon();

    // *** On avance dans le temps ***
    this.time += this.dt;
}


/**
 * Donne la liste des variables historiques du modèle.
 * @returns {Array} */
BarotropicModel.prototype.getHistoricVariables = function()
{
    return [{"name":"U", "description":"U component of wind", "units":"m.s^-1", "type":Variable.VARIABLE_TYPE_LAYER, "levels": [1]}, 
            {"name":"V", "description":"V component of wind", "units":"m.s^-1", "type":Variable.VARIABLE_TYPE_LAYER, "levels": [1]},
            {"name":"phi", "description":"geopotential height of the top of the model layer", "units":"m^2.s^-1", "type":Variable.VARIABLE_TYPE_LAYER, "levels": [1]},
        ];
}

/**
 * Donne la liste des variables diagnostiques du modèle.
 * @returns {Array} 
 */
BarotropicModel.prototype.getDiagnosticVariables = function()
{
    return [
            {"name":"K", "description":"kinetic energy", "units":"J", "type":Variable.VARIABLE_TYPE_LAYER, "levels": [1]},
            {"name":"tourbillon", "description":"absolute vorticity potential", "units": "S^-1", "type":Variable.VARIABLE_TYPE_LAYER, "levels": [1]}
        ];
}

/**
 * Donne la liste des variables internes du modèle.
 * @returns {Array} */
BarotropicModel.prototype.getInternalVariables = function()
{
    return [
            {"name":"f", "description":"coriolis factor", "units":"", "type":Variable.VARIABLE_TYPE_SURFACE, "levels": [1]},
            {"name":"m", "description":"scaling factor", "units": "", "type":Variable.VARIABLE_TYPE_SURFACE, "levels": [1]},
            {"name":"alpha", "description":"alpha coefficient for coupling", "units": "", "type":Variable.VARIABLE_TYPE_SURFACE, "levels": [1]}
        ];
}

BarotropicModel.prototype.getName = function()
{
    return "PIFO EPP-"+this.gridType;
}
