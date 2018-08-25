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

import { Variable } from "/js/modeling/Variable.js";

export var Model = function ()
{   
    // **** PARAMETRES DU MODELE ****
    
    // Type de projection à utiliser pour les équations (détermine m)
    this.projection = 1;
     
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
Model.Cp_l = 2060;

//** Chaleur latente de l'eau liquite
Model.Ll = 2264760;

//** Chaleur latente de la vapeur deau
Model.Li = 334000;

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