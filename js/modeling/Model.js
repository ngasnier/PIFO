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
import { Logger } from "../util/Logger.js";
import { MPI } from "../util/MPI.js";

/**
 * Model class, made by composition of cores and helpers.
 * 
 * @type type
 */
export class Model {
    
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
        this._globalWidth = 36;

        //** Hauteur de grille du domaine
        this._globalHeight = 36;

        //** Largeur de grille locale
        this._width=36;

        //** Hauteur de grille locale
        this._height=36;
       
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
        
        this._physicsSchemes = [];
                
        // *** MPI management

        // Our rank in the MPI cluster
        this.worldRank = 0;
        
        // Size of MPI cluster.
        this.worldSize = 1;
        
        // Width of the grid partition
        this.partitionWidth = 1;
        
        // Height of the grid partition
        this.partitionHeight = 1;
        
        // Our column position
        this.partitionColumn = 0;
        
        // Our partition row
        this.partitionRow = 0;
        
        // Informations about our neighbours for MPI communication
        this.neighboursInfo = [];
        
        // Communicator for row dispatching
        this.rowComm = null;
        
        // Communicator for column dispatching
        this.colComm = null;
        
        // Global types for 2D/3D variables gather/scatter
        this.globalVecType = [];
        
        // Local types for 2D/3D variables gather/scatter
        this.localVecType = [];
        
        // Buffers for MPI communication
        this.rowDataBuffer = null;
        
        this.colComm_sendcounts = null;
        this.colComm_senddispls = null;
        this.rowComm_sendcounts = null;
        this.rowComm_senddispls = null;
        this.rowComm_recvcounts = null;
        
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
        
        for (var i in this._physicsSchemes)
        {
            this._physicsSchemes[i].getVariablesDescriptions().forEach((v)=> {
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
        // *** Setup MPI partition and communication
        this.setupMPI();

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
        this._dynamicsCore.setup();
        this._timeIntegrator.setup();
        if (this._timeFilter!=null) this._timeFilter.setup();
        if (this._spatialFilter!=null) this._spatialFilter.setup();
        if (this._boundaryCondition!=null) this._boundaryCondition.setup();
        
        for (var i in this._physicsSchemes)
        {
            this._physicsSchemes[i].setup();
        }

        this.initGridFactors();
        
        this.spatialFilterCounter = 0;
    }

    /**
     * Execute un pas de temps.
     */
    step()
    {
        // *** Calcule les champs nécessaires pour le coeur dynamique ***
        if (this.time==0) this.calcConstants();
        this.calcDiagnostics();
        this.calcPhysics();
        this.calcPostPhysicsDiagnostics();
        
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
     * Calcul des constantes
     * @returns {undefined}
     */
    calcConstants()
    {
        for (var v in this.variables)
        {
            if (this.variables[v].category==VariableDescription.CAT_CONSTANT)
            {
                this._dynamicsCore.calcConstant(this.variables[v].name);
            }
        }
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
        for (var i in this._physicsSchemes)
        {
            this._physicsSchemes[i].step();
        }
    }
    
    calcPostPhysicsDiagnostics()
    {
        for (var v in this.variables)
        {
            if (this.variables[v].category==VariableDescription.CAT_POST_PHYSICS_DIAGNOSTIC)
            {
                this._dynamicsCore.calcDiagnostic(this.variables[v].name);
            }
        }
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
    
    get globalWidth()
    {
        return this._globalWidth;
    }
    
    set globalWidth(w)
    {
        this._globalWidth = w;
    }
    
    get width()
    {
        return this._width;
    }
    
    get height()
    {
        return this._height;
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
            this.variables = [];
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
    
    set physicsSchemes(p_schemes)
    {
        this._physicsSchemes = p_schemes;
        
        for (var i in this._physicsSchemes)
        {
            this._physicsSchemes[i].model = this;
        }
    }
    
    get physicsSchemes()
    {
        return this._physicsSchemes;
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
        p_data.productName = this.name;
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
    
    setupMPI()
    {        
        this.worldSize = MPI.CommSize(MPI.MPI_COMM_WORLD);
        this.worldRank = MPI.CommRank(MPI.MPI_COMM_WORLD);
        if (this.worldSize<2) return;
        
        // Découpage de la grille en nombre de zones
        this.partitionWidth = Math.floor(Math.sqrt(this.worldSize));
        this.partitionHeight = Math.floor(Math.sqrt(this.worldSize));
        while (this.partitionWidth*this.partitionHeight<this.worldSize)
        {
            partitionWidth++;
        }
        if (this.partitionWidth*this.partitionHeight>this.worldSize) 
            throw `MPI partition failed. world=${this.worldSize} partitionWidth=${this.partitionWidth} partitionHeight=${this.partitionHeight}`;
        
        // Our row and column position in the partition
        this.partitionRow = Math.floor(this.worldRank/this.partitionWidth);
        this.partitionColumn = this.worldRank-this.partitionRow*this.partitionWidth;
        
        // Two possible cases of grid size in each axis
        var ncol = Math.trunc(this.globalWidth/this.partitionWidth);
        var nrow = Math.trunc(this.globalHeight/this.partitionHeight);
        this.dispatch_cols_size = [ncol, ncol+(this.globalWidth-ncol*this.partitionWidth)];
        this.dispatch_rows_size = [nrow, nrow+(this.globalHeight-nrow*this.partitionHeight)];

        // create communicators which have processors with the same row or column in them
        this.rowComm = MPI.CommSplit(MPI.MPI_COMM_WORLD, this.partitionRow, this.worldRank);
        this.colComm = MPI.CommSplit(MPI.MPI_COMM_WORLD, this.partitionColumn, this.worldRank);

        var row_rank = MPI.CommRank(this.rowComm);
        var col_rank = MPI.CommRank(this.colComm);

        this._height = (this.partitionRow==(this.partitionHeight-1) ? this.dispatch_rows_size[1] : this.dispatch_rows_size[0]);
        this._width = (this.partitionColumn==(this.partitionWidth-1) ? this.dispatch_cols_size[1] : this.dispatch_cols_size[0]);
        
        // Create types for 2D fields
        var vec = MPI.TypeVector(this.height, 1, this.globalWidth, MPI.MPI_DOUBLE);
        this.globalVecType[0] = MPI.TypeCreateResized(vec, 0, 8);
        MPI.TypeCommit(this.globalVecType[0]);

        var localvec = MPI.TypeVector(this.height, 1, this.width, MPI.MPI_DOUBLE);
        this.localVecType[0] = MPI.TypeCreateResized(localvec, 0, 8);
        MPI.TypeCommit(this.localVecType[0]);

        // Create types for layer fields
        vec = MPI.TypeVector(this.height, this.nbLayers, this.globalWidth*this.nbLayers, MPI.MPI_DOUBLE);
        this.globalVecType[1] = MPI.TypeCreateResized(vec, 0, 8*this.nbLayers);
        MPI.TypeCommit(this.globalVecType[1]);

        localvec = MPI.TypeVector(this.height, this.nbLayers, this.width*this.nbLayers, MPI.MPI_DOUBLE);
        this.localVecType[1] = MPI.TypeCreateResized(localvec, 0, 8*this.nbLayers);
        MPI.TypeCommit(this.localVecType[1]);
        
        // Create types for surface fields
        vec = MPI.TypeVector(this.height, this.nbSurfaces, this.globalWidth*this.nbSurfaces, MPI.MPI_DOUBLE);
        this.globalVecType[2] = MPI.TypeCreateResized(vec, 0, 8*this.nbSurfaces);
        MPI.TypeCommit(this.globalVecType[2]);

        localvec = MPI.TypeVector(this.height, this.nbSurfaces, this.width*this.nbSurfaces, MPI.MPI_DOUBLE);
        this.localVecType[2] = MPI.TypeCreateResized(localvec, 0, 8*this.nbSurfaces);
        MPI.TypeCommit(this.localVecType[2]);

        if (this.partitionColumn==0)  // partitionColumn==0 ???
        {
            this.colComm_sendcounts = [];
            this.colComm_senddispls = [];
            for (var i=0;i<3;i++)
            {
                this.colComm_sendcounts[i] = new Int32Array(this.partitionHeight);
                this.colComm_senddispls[i] = new Int32Array(this.partitionHeight);
                this.colComm_senddispls[i][0] = 0;

                for (var row=0; row<this.partitionHeight; row++) {
                    this.colComm_sendcounts[i][row] = this.dispatch_rows_size[row<this.partitionRow-1?0:1]*this.globalWidth;
                    
                    switch (i)
                    {
                        case 1: this.colComm_sendcounts[i][row] *= this.nbLayers ; break;
                        case 2: this.colComm_sendcounts[i][row] *= this.nbSurfaces ; break;
                        default:
                    }
                    
                    if (row > 0)
                        this.colComm_senddispls[i][row] = this.colComm_senddispls[i][row-1] + this.colComm_sendcounts[i][row-1];
                }
            }
            // Allocate only one buffer, with size maximum of what is needed
            this.rowDataBuffer = new Float64Array(this.colComm_sendcounts[2][0]);
        }

        this.rowComm_sendcounts = [];
        this.rowComm_senddispls = [];
        this.rowComm_recvcounts = [];
        for (var i=0;i<3;i++)
        {
            this.rowComm_sendcounts[i] = new Int32Array(this.partitionWidth);
            this.rowComm_senddispls[i] = new Int32Array(this.partitionWidth);
            this.rowComm_recvcounts[i] =  this.dispatch_cols_size[this.partitionColumn<this.partitionWidth-1?0:1]

            if (this.partitionColumn == 0) {
                this.rowComm_senddispls[i][0] = 0;
                for (var col=0; col<this.partitionWidth; col++) {
                    this.rowComm_sendcounts[i][col] = this.dispatch_cols_size[col<this.partitionWidth-1?0:1];
                    if (col>0)
                        this.rowComm_senddispls[i][col] = this.rowComm_senddispls[i][col-1]+this.rowComm_sendcounts[i][col-1];
                }
            }
        }
        
        
        Logger.getLogger().debug(`Global grid ${this.globalWidth}x${this.globalHeight}, Local grid ${this.width}x${this.height}`);
        Logger.getLogger().debug(`Grid split into ${this.partitionWidth}x${this.partitionHeight} processes`);
        Logger.getLogger().debug(`Process ${this.worldRank}/${this.worldSize} is at ${this.partitionColumn}x${this.partitionRow}`);
        Logger.getLogger().debug(`Dispatch ${ncol}x${nrow} (${this.dispatch_cols_size})x(${this.dispatch_rows_size})`);
        Logger.getLogger().debug(`Col comm send counts ${this.colComm_sendcounts}, Senddispls ${this.colComm_senddispls}`);
        Logger.getLogger().debug(`Row comm send counts ${this.rowComm_sendcounts}, Senddispls ${this.rowComm_senddispls}`);        
    }
    
    getScatterType(p_variable)
    {
        var info = this.getVariableDescription(p_variable);
        var type = 0;
        switch (info.verticalPosition)
        {
            case VariableDescription.VERTICAL_POSITION_LAYER:
                type=1;
                break;
            case VariableDescription.VERTICAL_POSITION_INTERLAYER:
                type=2;
                break;
            default:
                0
        }
        return type;
    }
    
    scatter(p_name, p_variable)
    {
        if (MPI.CommSize(MPI.MPI_COMM_WORLD)==1) return;
        
        var scatter_type = this.getScatterType(p_name);
        Logger.getLogger().debug(`Scattering ${p_name} ${scatter_type}`);
        
        if (this.partitionColumn == 0) 
        {
            var global_data = (p_variable!=null) ? p_variable.data : null;
            Logger.getLogger().debug(`Scatter rows global_data(${global_data!=null?global_data.length:0}) counts(${this.colComm_sendcounts[scatter_type]}) displs(${this.colComm_senddispls[scatter_type]})`);
            Logger.getLogger().debug(`rowDataBuffer.length=${this.rowDataBuffer.length} receive(${this.colComm_sendcounts[scatter_type][this.partitionRow]})`);          
            MPI.Scatterv(global_data, this.colComm_sendcounts[scatter_type], this.colComm_senddispls[scatter_type], MPI.MPI_DOUBLE,
                      this.rowDataBuffer, this.colComm_sendcounts[scatter_type][this.partitionRow], MPI.MPI_DOUBLE, 0, this.colComm);
        }
        
        var localVariable = this.getVariable(p_name);
        
        var rowptr = (this.partitionColumn == 0) ? this.rowDataBuffer : null;

        Logger.getLogger().debug(`Scatter cols counts(${this.rowComm_sendcounts[scatter_type]}) displs(${this.rowComm_senddispls[scatter_type]})`);
        Logger.getLogger().debug(`receive(${this.rowComm_recvcounts[scatter_type]})`);
        MPI.Scatterv(rowptr, this.rowComm_sendcounts[scatter_type], this.rowComm_senddispls[scatter_type], this.globalVecType[scatter_type],
                      localVariable.data, this.rowComm_recvcounts[scatter_type], this.localVecType[scatter_type], 0, this.rowComm);
    }
    
    gather(p_name, p_variable)
    {
        if (MPI.CommSize(MPI.MPI_COMM_WORLD)==1) return;

        var scatter_type = this.getScatterType(p_name);
        var localVariable = this.getVariable(p_name);
        Logger.getLogger().debug(`Gathering ${p_name} ${scatter_type}`);
        
        // Gather column data
        var gather_row_data = (this.partitionColumn == 0) ? this.rowDataBuffer : null;

        Logger.getLogger().debug(`Gather cols counts(${this.rowComm_sendcounts[scatter_type]}) displs(${this.rowComm_senddispls[scatter_type]})`);
        Logger.getLogger().debug(`receive(${this.rowComm_recvcounts[scatter_type]})`);
    
        MPI.Gatherv(localVariable.data, this.rowComm_recvcounts[scatter_type], this.localVecType[scatter_type],
                         gather_row_data, this.rowComm_sendcounts[scatter_type], this.rowComm_senddispls[scatter_type], this.globalVecType[scatter_type], 0, this.rowComm);

        if (this.partitionColumn==0) {
           
            var global_data = (p_variable!=null) ? p_variable.data : null;

            Logger.getLogger().debug(`Gather rows global_data(${global_data!=null?global_data.length:0}) counts(${this.colComm_sendcounts[scatter_type]}) displs(${this.colComm_senddispls[scatter_type]})`);
            Logger.getLogger().debug(`rowDataBuffer.length=${this.rowDataBuffer.length} receive(${this.colComm_sendcounts[scatter_type][this.partitionRow]})`);
            
            MPI.Gatherv(gather_row_data, this.colComm_sendcounts[scatter_type][this.partitionRow], MPI.MPI_DOUBLE,
                         global_data, this.colComm_sendcounts[scatter_type], this.colComm_senddispls[scatter_type], MPI.MPI_DOUBLE, 0, this.colComm);
        }

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

//** Gradient adiabatique standard
Model.StdTmpLapseRate = 9.75e-3;
