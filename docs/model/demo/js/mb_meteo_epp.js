/* 
 This file is part of some public pages of Meteo Blois web site.
 
 This Meteo Blois source code is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.
 
 This Meteo Blois source code is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.
 
 You should have received a copy of the GNU General Public License
 along with this program.  If not, see <http://www.gnu.org/licenses/>.
 
  Author Nicolas Gasnier (http://www.meteo-blois.fr/contact/)
 */
var Atmosphere = function ()
{
    // **** CONSTANTES TECHNIQUES ****
    // Types de projection cartégienne. m=1 constant
    this.PROJ_CARTESIEN = 0;
    // Type de projection mercator de diamètre terre. m=cos(lat)
    this.PROJ_MERCATOR = 1;
    
    // **** CONSTANTES DU MODELE ****
    
    // Gravité
    this.g = 9.8066;
    
    // Masse volumique de l'air
    this.rho = 1.225;
    
    // Vitesse angulaire de la terre (rad.s^-1)
    this.omega = 7.2722e-5;
    
    // **** PARAMETRES DU MODELE ****
    
    // Type de projection à utiliser pour les équations (détermine m)
    this.projection = this.PROJ_CARTESIEN;
    
    // Est-ce qu'on veut filtrer les champs ou pas
    this.fieldFiltering = false;
    
    // Facteur d'échelle. m=1 constant parfait pour map cartésienne
    // A préciser pour les projections autres que CARTESIEN et MERCATOR
    this.m = [];

    // Paramètre de Coriolis.
    // A préciser pour les projections autres que CARTESIEN et MERCATOR
    this.f = [];
    
    // Pas de grille en degré dans la direction des latitudes.
    this.dlat = 10;
    
    // Pas de grille en degré dans la direction des longitudes.
    this.dlon = 10;
    
    // Pas de grille en X. 1° = 111.11km. Recalculé à partir de dlon.
    this.dx = 1111110;
    
    // Pas de grille en Y. 1° = 111.11km. Recalculé à partir de dlat.
    this.dy = 1111110;

    // Largeur de grille du domaine
    this.width=36;    
    
    // Hauteur de grille du domaine
    this.height=36;

    // Latitude du coin haut gauche du domaine.
    this.nlat = 90;
    
    // Latitude du coin bas droite du domaine.
    this.slat = -80;
    
    // Latitude du coin haut gauche du domaine
    this.wlon = 0;
    
    // Longitude du coin bas droite du domaine
    this.elon = 350;
    
    // Pas de temps (attention à la stabilité !)
    this.dt = 3600;
      
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
    
    // Couplage de phi avec le domaine global
    this.phi_couplage = [];    
    
    // Variables intermédiaires
    this.dU_dy = [];
    this.dV_dx = [];
    this.phi_U = [];
    this.phi_V = [];
    this.phi_K = [];
    this.dx_phi_K = [];
    this.dy_phi_K = [];
    this.dx_phi_U = [];
    this.dy_phi_V = [];
    
    // Quelques diagnostics...
    this.total_masse = 0;
    this.total_energie = 0;
    this.total_tourbillon = 0;
    this.total_enstropie = 0;

    // Combien de temps écoulé depuis le début de simulation
    this.time = 0;
        
    // Initlalise le géopotentiel 500hPa 
    this.setPhi = function(g500)
    {
        for (i=0;i<this.width*this.height;i++)
        {
            this.phi[i] = this.g*g500[i]-40000;
        }
    }
    
    // Initialise la composante U du vent 500hPa 
    this.setU = function(u500)
    {
        for (i=0;i<this.width*this.height;i++)
        {
            this.U[i] = u500[i];
        }
    }
    
    // Initialise la composante V du vent 500hPa
    this.setV = function(v500)
    {
        for (i=0;i<this.width*this.height;i++)
        {
            this.V[i] = v500[i];
        }
    }
    
    this.setPhiCouplage = function(g500)
    {
        for (i=0;i<this.width*this.height;i++)
        {
            this.phi_couplage[i] = this.g*g500[i]-40000;
        }
    }
    
    this.setUCouplage = function(u500)
    {
        for (i=0;i<this.width*this.height;i++)
        {
            this.U_couplage[i] = u500[i];
        }
    }
    
    this.setVCouplage = function(v500)
    {
        for (i=0;i<this.width*this.height;i++)
        {
            this.V_couplage[i] = v500[i];
        }
    }
       
    // Initialise le modèle avec les variables qui ont été fournies préalablement.
    this.init = function()
    {
        var lat = this.nlat*(Math.PI/180);
        this.dx = 111.1 * this.dlon * 1000;
        this.dy = 111.1 * this.dlat * 1000;
        this.time = 0;
        for (var y=0;y<this.height;y++)
        {
            for(var x=0;x<this.width;x++)
            {
                var i = x+y*this.width;
                var h = 0;

                // Paramètre de coriolis et facteur d'échelle en fonction de la latitude
                this.f[i] = 2*this.omega * Math.sin(lat);
                switch (this.projection)
                {
                    case this.PROJ_CARTESIEN:
                        this.m[i] = 1;
                        break;
                    case this.PROJ_MERCATOR:
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
                    //else if (xd<yd) xd = yd;

                    this.alpha[i] = (xd/(this.relaxation+1));
                }
                else 
                {
                    this.alpha[i] = 0.0;
                }

                // Creation des tableaux
                this.K[i] = 0;
                this.tourbillon[i] = 0;                
                this.U_t[i] = this.U[i];
                this.V_t[i] = this.V[i];
                this.phi_t[i] = this.phi[i];
                this.dU_dy[i] = 0;
                this.dV_dx[i] = 0;
                this.phi_U[i] = 0;
                this.phi_V[i] = 0;
                this.phi_K[i] = 0;
                this.dx_phi_K[i] = 0;
                this.dy_phi_K[i] = 0;
                this.dx_phi_U[i] = 0;
                this.dy_phi_V[i] = 0;
            }

            lat -= this.dlat*(Math.PI/180);
        }

        this.calcEnergy();
        this.calcTourbillon();
        this.calcDiagnostics();        
    }
            
    this.product = function(x, y, res)
    {
        for(var i=0;i<this.width*this.height;i++)
        {
            res[i] = x[i]*y[i];
        }
    }
    
    this.sum = function(x, y, res)
    {
        for(var i=0;i<this.width*this.height;i++)
        {
            res[i] = x[i]+y[i];
        }
    }
      
    this.d_dx = function(f, res)
    {
        for (var y=1;y<this.height-1;y++)
        {
            for(var x=1;x<this.width-1;x++)
            {
                var i = x+y*this.width;
                res[i] = (f[i+1]-f[i-1])/(2*this.dx*this.m[i]);
            }
        }
    }
    
    this.d_dy = function(f, res)
    {
        for (var y=1;y<this.height-1;y++)
        {
            for(var x=1;x<this.width-1;x++)
            {
                var i = x+y*this.width;
                res[i] = (f[i-this.width]-f[i+this.width])/(2*this.dy*this.m[i]);
            }           
        }
    }
    
    this.calcEnergy = function()
    {
        for(var i=0;i<this.width*this.height;i++)
        {
            this.K[i] = this.m[i]*this.m[i]*(this.U[i]*this.U[i]+this.V[i]*this.V[i])/2;
        }
    }

    this.calcTourbillon = function()
    {
        this.d_dy(this.U, this.dU_dy);
        this.d_dx(this.V, this.dV_dx);
        for(var i=0;i<this.width*this.height;i++)
        {
            this.tourbillon[i] = this.m[i]*this.m[i]*(this.dV_dx[i]-this.dU_dy[i]);
        }
    }
    
    this.filtreMoyenneX = function(a, v, res)
    {
        for (var y=0;y<this.height;y++)
        {
            var i = y*this.width;
            res[i] = a[i];
            for(var x=1;x<this.width-1;x++)
            {
                var i = x+y*this.width;
                res[i] = a[i]*(1-v)+(a[i+1]+a[i-1])*v/2;
            }
            i = this.width-1+y*this.width;
            res[i] = a[i];
        }
    }
    
    this.filtreMoyenneY = function(a, v, res)
    {
        for (var x=0;x<this.width;x++)
        {
            var i = x+this.width*(this.height-1);
            res[x] = a[x];
            res[i] = a[i];
        }
        for (var y=1;y<this.height-1;y++)
        {
            var i = y*this.width;
            res[i] = a[i];
            for(var x=1;x<this.width-1;x++)
            {
                var i = x+y*this.width;
                res[i] = a[i]*(1-v)+(a[i+this.width]+a[i-this.width])*v/2;
            }
            i = this.width-1+y*this.width;
            res[i] = a[i];
        }
    }
    
    this.filtre = function (a)
    {
        var tmp = [];
        this.filtreMoyenneX(a, 0.5, tmp);
        this.filtreMoyenneX(tmp, -0.5, a);
        
        this.filtreMoyenneY(a, 0.5, tmp);
        this.filtreMoyenneY(tmp, 0.5, a);
    }
    
    this.couple = function(x, c)
    {
        for (var i=0;i<this.height*this.width;i++)
        {
            x[i] = (1-this.alpha[i])*x[i] + this.alpha[i]*c[i];
        }
    }
    
    // Démarre le modèle en exécutant le schéma d'Euler.
    this.start = function()
    {              
        // Formules intermédiaires et dérivées 
        this.product(this.U, this.phi, this.phi_U);
        this.d_dx(this.phi_U, this.dx_phi_U);
        this.product(this.V, this.phi, this.phi_V);
        this.d_dy(this.phi_V, this.dy_phi_V);

        this.sum(this.K, this.phi, this.phi_K);
        this.d_dx(this.phi_K, this.dx_phi_K);
        this.d_dy(this.phi_K, this.dy_phi_K);

        // Schema d'Euler pour le premier pas de temps
        for (var y=1;y<this.height-1;y++)
        {
            for(var x=1;x<this.width-1;x++)
            {
                var i = x+y*this.width;
                var A = (this.tourbillon[i] + this.f[i])*this.V[i]-this.dx_phi_K[i];
                var B = -(this.tourbillon[i] + this.f[i])*this.U[i]-this.dy_phi_K[i];
                var C = -this.m[i]*this.m[i]*(this.dx_phi_U[i]+this.dy_phi_V[i]);

    //                if (isNaN(A)) 
    //                    console.log(x+" "+y);

                this.U_t[i] = this.U[i] + this.dt*A;
                this.V_t[i] = this.V[i] + this.dt*B;
                this.phi_t[i] = this.phi[i] + this.dt*C;
            }
        }

        if (this.fieldFiltering)
        {
            this.filtre(this.U_t);
            this.filtre(this.V_t);
            this.filtre(this.phi_t);
        }

        if (this.relaxation>0)
        {
            this.couple(this.U_t, this.U_couplage);
            this.couple(this.V_t, this.V_couplage);
            this.couple(this.phi_t, this.phi_couplage);
        }

        var tmp = this.U_t; this.U_t = this.U; this.U = tmp;
        tmp = this.V_t; this.V_t = this.V; this.V = tmp;
        tmp = this.phi_t; this.phi_t = this.phi; this.phi = tmp;

        this.calcEnergy();
        this.calcTourbillon();
        this.calcDiagnostics();

        this.time += this.dt;
    }
    
    // Avance le modèle d'un pas en utilisant le schéma explicite centré.
    this.step = function()
    {
        // Formules intermédiaires et dérivées 
        this.product(this.U, this.phi, this.phi_U);
        this.d_dx(this.phi_U, this.dx_phi_U);
        this.product(this.V, this.phi, this.phi_V);
        this.d_dy(this.phi_V, this.dy_phi_V);

        this.sum(this.K, this.phi, this.phi_K);
        this.d_dx(this.phi_K, this.dx_phi_K);
        this.d_dy(this.phi_K, this.dy_phi_K);

        // Schema différences centrales
        for (var y=1;y<this.height-1;y++)
        {
            for(var x=1;x<this.width-1;x++)
            {
                var i = x+y*this.width;
                var A = (this.tourbillon[i] + this.f[i])*this.V[i]-this.dx_phi_K[i]; 
                var B = -(this.tourbillon[i] + this.f[i])*this.U[i]-this.dy_phi_K[i];
                var C = -this.m[i]*this.m[i]*(this.dx_phi_U[i]+this.dy_phi_V[i]);

                this.U_t[i] = this.U_t[i] + 2*this.dt*A;
                this.V_t[i] = this.V_t[i] + 2*this.dt*B;
                this.phi_t[i] = this.phi_t[i] + 2*this.dt*C;
            }
        }

        if (this.fieldFiltering)
        {
            this.filtre(this.U_t);
            this.filtre(this.V_t);
            this.filtre(this.phi_t);
        }

        if (this.relaxation>0)
        {
            this.couple(this.U_t, this.U_couplage);
            this.couple(this.V_t, this.V_couplage);
            this.couple(this.phi_t, this.phi_couplage);
        }

        var tmp = this.U_t; this.U_t = this.U; this.U = tmp;
        tmp = this.V_t; this.V_t = this.V; this.V = tmp;
        tmp = this.phi_t; this.phi_t = this.phi; this.phi = tmp;

        this.calcEnergy();
        this.calcTourbillon();
        this.calcDiagnostics();

        this.time += this.dt;
    }
    
    this.calcDiagnostics = function()
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
        this.total_masse *= this.rho/this.g;
        this.total_energie *= this.rho/this.g;
        this.total_tourbillon *= this.rho/this.g;
        this.total_enstropie *= this.rho/this.g;
    }
 }
 