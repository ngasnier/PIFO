/* 
 * Copyright (C) 2019 nicolas
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

import { MercatorProjection } from "../js/modeling/MercatorProjection.js";
import { Model } from "../js/modeling/Model.js";
import { Variable } from "../js/modeling/Variable.js";

var config = {
    "model": "BaroclinicModel",
        
    "preprocessor": {
        "minLat": -90,
        "maxLat": 90,
        "minLon": 0,
        "maxLon": 359.5,
        "dlat": 0.5,
        "dlon": 0.5,
        "levels": [100, 15000, 35000, 50000, 65000, 85000, 92500, 100000],
        "preprocessDir" : "input"
    },

    "horizontalDomain": {
        "width": 111,
        "height": 72,
        "gridType": "C",
        "relaxation": 8,
        "global": false,

        "projection": "Mercator",
        "minLat":9,
        "maxLat":81,
        "minLon":-60,
        "maxLon":51
    },  
    
    "verticalDomain": {
        "levelType":  "L",
        "ptop": 100.0,
        "nbSurfaces": 9
    },
       
    "filter": "none",

    "enablePrecipitationScheme" : false,
    "enableConvectionScheme" : false,

    "inputRelief": false,
    "inputDir": "run",
    
    "dt": 15,
    "inputTimes": [ 0 ],
    "stopTime": 48,
    "historyInterval": 6,
    "historyDir": "output"
};

test('Classe Modele basique', () => {
    var model = new Model();
    var projection = null;
    
    switch (config.horizontalDomain.projection)
    {
        case Model.PROJ_MERCATOR:
            projection = new MercatorProjection(Model.Rterre);
            break;
        default:
            projection = new MercatorProjection(Model.Rterre);
    }
    
    model.projection = projection;
    model.projection.domain = Object.assign({}, config.horizontalDomain);
    
    model.gridType = config.horizontalDomain.gridType;
    model.width = config.horizontalDomain.width;
    model.height = config.horizontalDomain.height;
    model.global = config.horizontalDomain.global;

    model.relaxation = config.horizontalDomain.relaxation;

    // *** Paramétrage de la grille verticale du modèle
/*    model.verticalType = config.verticalDomain.levelType;
    if (model.verticalType == "CP")
        model.dynamicsCore = new HydrostaticLeapFrogDynamicsCore_CP();
    else
        model.dynamicsCore = new HydrostaticLeapFrogDynamicsCore();*/

    model.init();
    
    expect(model.dx).toBeCloseTo(111194.92664455873, 6);
    expect(model.dy).toBeCloseTo(210982.81696686955, 6);
});
