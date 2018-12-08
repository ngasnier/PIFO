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

import { Variable } from "./Variable.js";
import { MercatorProjection } from "./MercatorProjection.js";

export var Model = function ()
{   
    // **** PARAMETRES DU MODELE ****
    
    // Type de projection à utiliser pour les équations (détermine m)
    this.projection = null;
     
    // Type de grille
    this.gridType = "A";
    
    // Indique qu'on travaille en grille globale
    this.global = false;
     
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
    
    // Paramètre de Coriolis en chaque point de la grille.
    this.f = [];

    // Facteur d'échelle en chaque point de la grille. 
    this.m = [];
    
    // Nombre de couches du modèle
    this.nblev = 1;
    
    // Paramètre les coordonnées sigma souhaitées pour les surfaces intercouches.
    this.sigmaSurfaces = [];

    // Coordonnées sigma des surfaces et des couches
    this.sigma = [];
    
    // Indices correspondant aux couches
    this.couches = [];
    
    // Indices des surfaces
    this.surfaces = [];

    // Indices de tous les niveaux
    this.niveaux_s = [];
    
    // Filtre optionnel
    this.filter = null;
    
    // Nombre de pas de temps entre les exécutions du filtre
    this.filterFreq = 1;
    
    // Nombre de pas de temps depuis la dernière exécution du filtre
    this.filterCounter = 0;
    
    // Nombre de secondes écoulées depuis le début du run
    this.time = 0;
    
    // Date de départ du modèle
    this.startDate = null;
        
    // Méthodes privées du modèle
    if( typeof Model.initialized == "undefined" ) 
    {

    }
}

// **** CONSTANTES GEOMETRIQUES ****
//** Types de projection cartégienne. m=1 constant
Model.PROJ_CARTESIEN = 0;
//** Type de projection mercator de diamètre terre. m=cos(lat)
Model.PROJ_MERCATOR = 1;

//** Types de grille 
Model.GRID_A = "A";
Model.GRID_B = "B";
Model.GRID_C = "C";
Model.GRID_D_OSCILL = "D";

//** Type de niveau aucun (pour modèle barotrope)
Model.LEVEL_NONE = "NONE";
//** Type de niveau sigma
Model.LEVEL_SIGMA = "SIGMA";

// **** CONSTANTES DU MODELE ****
//** Gravité
Model.g = 9.8066;

//** Constante des gaz parfaits
Model.R = 287.058;

//** Capacité thermique massique de l'air
Model.Cp = 1005;

//** Capacité thermique massique de la vapeur d'eau 
Model.Cp_v = 1850;

//** Capacité thermique massique de l'eau liquide
Model.Cp_l = 4185;

//** Capacité thermique massique de la glace
Model.Cp_i = 2060;

//** Chaleur latente de l'eau liquide
Model.Ll = 2264760;

//** Chaleur latente de la glace
Model.Li = 334000;

//** Température du point triple de l'eau
Model.T00 = 273.15;

//** Masse volumique de l'air
Model.rho = 1.225;

//** Vitesse angulaire de la terre (rad.s^-1)
Model.omega = 7.292115e-5;

//** Rayon de la terre
Model.Rterre = 6371000;


/**
 * Initialisation du modèle avant le démarrage du run.
 */
Model.prototype.init = function()
{
    
}

/**
 * Execute un pas de temps.
 */
Model.prototype.step = function()
{
}

/**
 * Paramètre les coordonnées sigma souhaitées pour les surfaces intercouches.
 * @param {type} p_sigma
 * @returns {undefined}
 */
Model.prototype.setSigmaSurfaces = function(p_sigma)
{
    this.sigmaSurfaces = p_sigma;
}

/**
 * Surfaces sigma paramétrées.
 * @returns {Array|type}
 */
Model.prototype.getSigmaSurfaces = function()
{
    return this.sigmaSurfaces;
}

/**
 * Initialisation des variables de grille.
 * 
 * Calcule : 
 * - valeurs de dx, dy pour la projection
 * - facteur de coriolis 
 * - facteur d'échelle m et son inverse inv_m
 * - alpha_couplage
 * @returns {undefined}
 */
Model.prototype.initGridFactors = function()
{   
    this.dx = (this.projection.lonToX(this.elon)-this.projection.lonToX(this.wlon))/this.width;
    this.dy = (this.projection.latToY(this.nlat)-this.projection.latToY(this.slat))/this.height;
    this.f = Variable.createVariable(1, this.width, this.height);
    this.alpha_couplage = Variable.createVariable(1, this.width, this.height);
    this.m = Variable.createVariable(1, this.width, this.height);
    this.inv_m = Variable.createVariable(1, this.width, this.height);

    var yplan = this.projection.latToY(this.nlat);
    var lat = 0;
    var i = 0;
    for (var y=0;y<this.height;y++)
    {
        for(var x=0;x<this.width;x++,i++)
        {
            // Paramètre de coriolis pris en décalé d'une demi cellule
            if (this.gridType==Model.GRID_C)
                lat = this.projection.yToLat(yplan-0.5*this.dy);
            else
                lat = this.projection.yToLat(yplan);
            this.f[i] = 2 * Model.omega * Math.sin(lat*Math.PI/180);

            // Facteur d'échelle
            lat = this.projection.yToLat(yplan);
            this.m[i] = this.projection.scaleFactor(0, lat);
            this.inv_m[i] = 1/this.m[i];

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

        yplan -= this.dy;
    }
}

/**
 * Donne la liste des variables historiques du modèle.
 * @returns {Array} Tableau de json ayant la structure :
 * - name : nom de la variable.
 * - description : courte chaine décrivant le contenu de la variable.
 * - units : chaine décrivant l'unité.
 * - type : type de couche. Constante définie dans l'objet Variable.
 * - levels : liste des coordonnées s des niveaux.
 */
Model.prototype.getHistoricVariables = function()
{
    return [];
}

/**
 * Donne la liste des variables paramètres du modèle, à fournir en entrée en plus des variables historiques.
 * @returns {Array} 
 */
Model.prototype.getParameterVariables = function()
{
    return [];
}

/**
 * Donne la liste des variables diagnostiques du modèle.
 * @returns {Array} Tableau de json ayant la structure :
 * - name : nom de la variable.
 * - description : courte chaine décrivant le contenu de la variable.
 * - units : chaine décrivant l'unité.
 * - type : type de couche. Constante définie dans l'objet Variable.
 * - levels : liste des coordonnées s des niveaux.
 */
Model.prototype.getDiagnosticVariables = function()
{
    return [];
}

/**
 * Donne la liste des variables internes du modèle.
 * @returns {Array} Tableau de json ayant la structure :
 * - name : nom de la variable.
 * - description : courte chaine décrivant le contenu de la variable.
 * - units : chaine décrivant l'unité.
 * - type : type de couche. Constante définie dans l'objet Variable.
 * - levels : liste des coordonnées s des niveaux.
 */
Model.prototype.getInternalVariables = function()
{
    return [];
}

Model.prototype.setVariable = function(p_variable, p_data)
{
    this[p_variable] = p_data;
}

Model.prototype.getVariable = function(p_variable)
{
    return this[p_variable];
}

/**
 * Renvoie la date en cours du modèle.
 * @param {type} p_variable
 * @returns {Date|Model.prototype.getCurrentDate.dt}
 */
Model.prototype.getCurrentDate = function(p_variable)
{
    var dt = new Date(this.startDate.getTime());
    dt.setSeconds(dt.getSeconds()+this.time);
    return dt;
}

/**
 * Renvoie un nom compréhensible pour le modèle.
 */
Model.prototype.getName = function()
{
    return "PIFO";
}