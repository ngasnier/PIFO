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
import { VariableDescription } from "./VariableDescription.js";

/**
 * 
 * @type type
 */
export class Model {
    // **** PARAMETRES DU MODELE ****
    constructor()
    {
        //** Nom compréhensible du modèle.
        this.name = "PIFO";
        
        //** Type de projection à utiliser pour les équations (détermine m)
        this.projection = null;

        //** Latitudes des points de grille au point m
        this.latitudes = [];

        //** Longitudes des points de grille au point m
        this.longitudes = [];

        //** Type de grille horizontale
        this.horizontalStaggering = "A";
        
        //** Type de grille verticale
        this.verticalStaggering = "L";

        //** Indique qu'on travaille en grille globale
        this.global = false;

        //** Pas de grille en X. 1° = 111.11km. Recalculé à partir de dlon.
        this.dx = 1111110;

        //** Pas de grille en Y. 1° = 111.11km. Recalculé à partir de dlat.
        this.dy = 1111110;

        //** Largeur de grille du domaine
        this.width=36;    

        //** Hauteur de grille du domaine
        this.height=36;
       
        //** Pas de temps (attention à la stabilité !)
        this.dt = 3600;

        //** Nombre de pas de temps entre les exécutions du filtre
        this.spatialFilterInterval = 0;

        //** Nombre de pas de temps depuis la dernière exécution du filtre
        this.spatialFilterCounter = 0;

        //** Nombre de secondes écoulées depuis le début du run
        this.time = 0;

        //** Date de départ du modèle
        this.startDate = null;

        // *** Variables internes
        // Stockage des coordonnées verticales
        this._verticalCoords = [1];
        this._surfacesCoords = [1];
        this._layersCoords = [];
        this._surfacesIndices = [0];
        this._layersIndices = [];

        // Liste des descriptions de variables
        this.variables = [];

        // Coeur dynamique du modèle
        this._dynamicsCore = null;

        // Intégration temporelle
        this._timeIntegrator = null;

        // Intégration temporelle
        this._timeFilter = null;

        // Filtre spatial optionnel
        this._spatialFilter = null;
        
        // Condition limite
        this._boundaryCondition = null;

        // Méthodes privées du modèle
        if( typeof Model.initialized == "undefined" ) 
        {

        }
    }
    
    /**
     * Finalise le paramétrage du modèle avant initialisation et run.
     * 
     * Cette étape est nécessaire pour s'assurer notamment que toutes les
     * variables requises par les modules sont déclarées.
     * 
     * @returns {undefined}
     */
    setupVariablesDescriptions()
    {
        this.registerVariable(Object.assign(new VariableDescription(), 
            {"category": VariableDescription.CAT_INTERNAL, 
                "name":"latitudes", 
                "description":"latitudes of grid points", 
                "units":"degree", 
                "verticalPosition":VariableDescription.VERTICAL_POSITION_SURFACE}));
        this.registerVariable(Object.assign(new VariableDescription(), 
            {"category": VariableDescription.CAT_INTERNAL, 
                "name":"longitudes", 
                "description":"longitudes of grid points", 
                "units":"degree", 
                "verticalPosition":VariableDescription.VERTICAL_POSITION_SURFACE}));
        
        this._dynamicsCore.getVariablesDescriptions().forEach((v)=> {
            this.registerVariable(v);
        });
        this._timeIntegrator.getVariablesDescriptions().forEach((v)=> {
            this.registerVariable(v);
        });
        if (this._timeFilter!=null)
            this._timeFilter.getVariablesDescriptions().forEach((v)=> {
                this.registerVariable(v);
            });
        if (this._spatialFilter!=null)
            this._spatialFilter.getVariablesDescriptions().forEach((v)=> {
                this.registerVariable(v);
            });
        if (this._boundaryCondition!=null)
        {
            this._boundaryCondition.getVariablesDescriptions().forEach((v)=> {
                this.registerVariable(v);
            }); 
        }
        
        this.setupVariablesLevels();
    }
    
    /**
     * Affecte les niveaux aux variables
     * @returns {undefined}
     */
    setupVariablesLevels()
    {
        for (var i in this.variables)
        {
            var v = this.variables[i];
            switch (v.verticalPosition)
            {
                case VariableDescription.VERTICAL_POSITION_SURFACE:
                    break;
                
                case VariableDescription.VERTICAL_POSITION_LAYER:
                    v.levels = this.layersCoords;
                    break;
                    
                case VariableDescription.VERTICAL_POSITION_INTERLAYER:
                    v.levels = this.surfacesCoords;
                    break;

                case VariableDescription.VERTICAL_POSITION_ALL:
                    v.levels = this._verticalCoords;
                    break;
                
                default:
            }
        }
    }

    /**
     * Initialisation du modèle avant le démarrage du run.
     */
    setup()
    {       
        // *** Déclaration des variables
        this.setupVariablesDescriptions();
        
        // *** Allocation des variables
        this.getVariablesDescriptions().forEach((v)=>
        {
            var nblevs = this.nbLayers;
            switch (v.verticalPosition)
            {
                case VariableDescription.VERTICAL_POSITION_SURFACE:
                    nblevs = 0;
                    break;
                
                case VariableDescription.VERTICAL_POSITION_INTERLAYER:
                    nblevs = this.nbLayers+1;
                    break;

                case VariableDescription.VERTICAL_POSITION_ALL:
                    nblevs = this.nbLayers*2+1;
                    break;
                
                default:
                    // Garder les valeurs par défaut
            }
            var variable = Variable.createVariable(nblevs, this.width, this.height);
            variable = Object.assign(variable, v);
            this.setVariable(v.name, variable);
        });
        
        // *** Initialisation des algorithmes
        this._dynamicsCore.init();
        this._timeIntegrator.init();
        if (this._timeFilter!=null) this._timeFilter.init();
        if (this._spatialFilter!=null) this._spatialFilter.init();
        if (this._boundaryCondition!=null) this._boundaryCondition.init();

        this.initGridFactors();
        
        this.spatialFilterCounter = 0;
    }

    /**
     * Execute un pas de temps.
     */
    step()
    {
        // *** Calcule les champs nécessaires pour le coeur dynamique ***
        this.calcDiagnostics();
        this.calcPhysics();
        
        // *** Le filtrage temporel peut être commencé ***
        if (this.timeFilter!=null) this.timeFilter.preStep();
        
        // *** Intégration temporelle ***        
        this.dynamicsCore.solveBegin();
        
        this.timeIntegrator.step();
        
        this.dynamicsCore.solveEnd();
        
        // *** Filtrage des champs ***
        this.spatialFilterCounter++
        if (this.spatialFilter!=null && this.spatialFilterCounter>=this.spatialFilterInterval)
        {
            this.spatialFilter.filter();
            this.spatialFilterCounter = 0;
        }
        
        // *** Applique la condition aux limites ***
        if (this._boundaryCondition!=null) this._boundaryCondition.doBoundaryCondition();
        
        // *** Le filtrage temporel peut être finalisé ***
        if (this.timeFilter!=null) this.timeFilter.postStep();

        // *** C'est la fin du pas de temps ***
        // L'intégrateur a la charge de swapper les variables et faire
        // les éventuels calculs finaux nécessaires au schéma
        this.timeIntegrator.finalizeStep();
        
        // *** On avance finalement dans le temps ***
        this.time += this.dt;
        // TODO : gérer un calcul de date pour les paramètres solaires ?
    }

    /**
     * Calcul des variables diagnostiques
     * @returns {undefined}
     */
    calcDiagnostics()
    {
        for (var v in this.variables)
        {
            if (this.variables[v].category==VariableDescription.CAT_DIAGNOSTIC)
            {
                this._dynamicsCore.calcDiagnostic(this.variables[v].name);
            }
        }
    }
    
    /**
     * Calcule les termes de tendances physiques en utilisant les schémas associés
     * @returns {undefined}
     */
    calcPhysics()
    {
        // TODO schémas physiques à gérer...
    }

    /**
     * Définit la liste des coordonnées verticales de tous les niveaux du modèle.
     */
    set verticalCoords(p_coords)
    {
        this._verticalCoords = p_coords.slice();
        this._surfacesCoords = [];
        this._layersCoords = [];
        this._surfacesIndices = [];
        this._layersIndices = [];
        for (var k=0;k<p_coords.length;k++)
        {
            if (k%2==0)
            {
                this._surfacesCoords.push(p_coords[k]);
                this._surfacesIndices.push(k); /*this._surfacesCoords.length-1*/
            }
            else
            {
                this._layersCoords.push(p_coords[k]);
                this._layersIndices.push(k); /* this._layersCoords.length-1*/
            }
        }
        this.setupVariablesLevels();
    }
    
    /**
     * Liste de toutes les coordonnées verticales du modèle.
     */
    get verticalCoords()
    {
        return this._verticalCoords;
    }
  
    /**
     * Liste des coordonnées verticales des surfaces intercouches
     * @returns {Model.layerCoords.length}
     */ 
    get surfacesCoords()
    {
        return this._surfacesCoords;
    }
    
    /**
     * Liste des coordonnées verticales des couches.
     * @returns {_layersCoords}
     */    
    get layersCoords()
    {
        return this._layersCoords;
    }
     
    /**
     * Liste des indices de coordonnées des surfaces intercouches.
     * @returns {_surfacesIndices}
     */
    get surfacesIndices()
    {
        return this._surfacesIndices;
    }
        
    /**
     * Liste des indices de coordonnées des couches.
     * @returns {_layersIndices}
     */
    get layersIndices()
    {
        return this._layersIndices;
    }

    /**
     * Nombre de couches du modèle.
     * @returns {Model.layerCoords.length}
     */
    get nbLayers()
    {
        return this._layersCoords.length;
    }

    /**
     * Nombre de surfaces
     * @returns {Model._layerCoords.length}
     */
    get nbSurfaces()
    {
        return this._surfacesCoords.length;
    }

    /**
     * Nombre total de niveaux
     * @returns {undefined}
     */
    get nbLev()
    {
        return this._verticalCoords.length;
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
    initGridFactors()
    {   
        [this.dx, this.dy] = this.projection.getMeshSize();
        this.projection.calcLatitudesLongitudes(0, 0, this.latitudes, this.longitudes);
    }

    /**
     * Calcule les coordonnées des points de Coriolis de la grille du domaine
     * @returns {undefined}
     */
    getCoriolisPointCoords(latitudes, longitudes)
    {
        var xoffset, yoffset;
        switch (this.horizontalStaggering)
        {
            case Model.HS_GRID_A,Model.HS_GRID_D_OSCILL:
                xoffset = 0;
                yoffset = 0;
                break;
            case Model.HS_GRID_B, Model.HS_GRID_C:
                xoffset = 1;
                yoffset = 1;
                break;
            default:
                throw "Invalid grid type ("+this.gridType+")";
        }
        this.projection.calcLatitudesLongitudes(xoffset, yoffset, latitudes, longitudes);
    }    

    /**
     * Obtient la liste de toutes les variables du modèle ou d'une catégorie
     * @param {type} p_category (optionnel) vide pour tout, catégorie. Défaut : tout.
     * @returns {Array|Model.prototype.getVariables.vars}
     */
    getVariablesDescriptions(p_category="")
    {
        if (p_category=="")
        {
            return this.variables;
        }
        else
        {
            var vars = [];
            for (var v in this.variables)
            {
                if (p_category=="" || this.variables[v].category==p_category)
                {
                    vars.push(Object.assign(new VariableDescription(), this.variables[v])); 
                }
            }
            return vars;
        }
    }
     
    /**
     * Renvoie la description d'une variable précise.
     * @param {type} p_variable
     * @returns {Array|unresolved}
     */
    getVariableDescription(p_variable)
    {
        for (var v in this.variables)
        {
            if (this.variables[v].name==p_variable)
            {
                return this.variables[v];
            }
        }
        return null;
     }

    /**
     * Enregistre une variable gérée par le modèle
     * @param {type} p_description
     * @returns {undefined}
     */
    registerVariable(p_description)
    {
        // On évide de déclarer deux fois la même variable
        for (var idx in this.variables)
        {
            if (this.variables[idx].name==p_description)
            {
                this.variables[idx] = p_description;
            }
        }
        this.variables.push(Object.assign(new VariableDescription(), p_description));
    }

    /**
     * Associe ce modèle à un coeur dynamique.
     * 
     * Le modèle enregistre les variables requises pour traiter les équations.
     * 
     * Il n'est pas possible de modifier le coeur sans appeler unbindDynamicsCore avant.
     * 
     * @param {type} p_core
     * @returns {undefined}
     */
    set dynamicsCore(p_core)
    {
        if (this._dynamicsCore!=null)
        {
            // On doit dé-enregistrer les variables
            throw "modèle déjà lié à un coeur";
        }
        this._dynamicsCore = p_core;
        p_core.model = this;
    }


    /**
     * Renvoie le coeur dynamique.
     * @returns {type}
     */
    get dynamicsCore()
    {
        return this._dynamicsCore;
    }
    
    /**
     * Paramètre l'intégrateur temporel.
     * 
     * @param {type} p_integrator
     * @returns {undefined}
     */
    set timeIntegrator(p_integrator)
    {
        this._timeIntegrator = p_integrator;
        this._timeIntegrator.model = this;
    }
    
    /**
     * Renvoie l'intégrateur temporel.
     * @returns {Model._timeIntegrator}
     */
    get timeIntegrator()
    {
        return this._timeIntegrator;
    }

    /**
     * Paramètre le filtre temporel.
     * @param {type} p_filter
     * @returns {undefined}
     */
    set timeFilter(p_filter)
    {
        this._timeFilter = p_filter;
        this._timeFilter.model = this;
    }
    
    /**
     * Renvoie le filtre temporel.
     * @returns {Model._timeIntegrator}
     */
    get timeFilter()
    {
        return this._timeFilter;
    }

    /**
     * Paramètre le filtre spatial.
     * @param {type} p_filter
     * @returns {undefined}
     */
    set spatialFilter(p_filter)
    {
        this._spatialFilter = p_filter;
        this._spatialFilter.model = this;
    }
    
    /**
     * Renvoie le filtre spatial.
     * @returns {Model._timeIntegrator}
     */
    get spatialFilter()
    {
        return this._spatialFilter;
    }

    /**
     * Paramètre la condition aux limites
     * @param {type} p_filter
     * @returns {undefined}
     */
    set boundaryCondition(p_condition)
    {
        this._boundaryCondition = p_condition;
        this._boundaryCondition.model = this;
    }
    
    /**
     * Renvoie la condition aux limites.
     * @returns {Model._timeIntegrator}
     */
    get boundaryCondition()
    {
        return this._boundaryCondition;
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
    getHistoricVariables()
    {
        return this.getVariablesDescriptions(VariableDescription.CAT_PRONOSTIC);
    }

    /**
     * Donne la liste des variables paramètres du modèle, à fournir en entrée en plus des variables historiques.
     * @returns {Array} 
     */
    getParameterVariables()
    {
        return this.getVariablesDescriptions(VariableDescription.CAT_PARAMETER);
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
    getDiagnosticVariables()
    {
        return this.getVariablesDescriptions(VariableDescription.CAT_DIAGNOSTIC);
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
    getInternalVariables()
    {
        return this.getVariablesDescriptions(VariableDescription.CAT_INTERNAL);
    }

    /**
     * Spécifie le tableau de valeurs d'une variable.
     * @param {type} p_variable nom de la variable
     * @param {type} p_data référence du tableau
     * @returns {undefined}
     */
    setVariable(p_variable, p_data)
    {
        this[p_variable] = p_data;
    }

    /**
     * Obtient le tableau de valeurs d'une variable
     * @param {type} p_variable
     * @returns {unresolved}
     */
    getVariable(p_variable)
    {
        return this[p_variable];
    }

    /**
     * Renvoie la date en cours du modèle.
     * @param {type} p_variable
     * @returns {Date|Model.prototype.getCurrentDate.dt}
     */
    getCurrentDate(p_variable)
    {
        var dt = new Date(this.startDate.getTime());
        dt.setSeconds(dt.getSeconds()+this.time);
        return dt;
    }   
}


// **** CONSTANTES GEOMETRIQUES ****

//** Types de grille 
Model.HS_GRID_A = "A";
Model.HS_GRID_B = "B";
Model.HS_GRID_C = "C";
Model.HS_GRID_D_OSCILL = "D";

Model.VS_LORENTZ = "L";
Model.VS_CHARNEY_PHILIPS = "CP";

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
