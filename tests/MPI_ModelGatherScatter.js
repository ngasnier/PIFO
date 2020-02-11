/* 
 * Copyright (C) 2020 Nicolas GASNIER (http://www.meteo-blois.fr/contact/)
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

/* 
 * This test scatters variables of different 3D sizes, and gathers back the
 * data. This is for testing the data segmentation routines between 4 
 * processors.
 */
import { Model } from "../js/modeling/Model.js";
import { Variable } from "../js/modeling/Variable.js";
import { VariableDescription } from "../js/modeling/VariableDescription.js";
import { ConfigManager } from "../js/front/ConfigManager.js";
import { MPIGridComm } from "../js/util/MPIGridComm.js";

const fs = require('fs');
const log4js = require('log4js');

const MPI = require('nodempi');

var modelConfig = require("./ModelConfig");
var config = modelConfig.config;

MPI.Init();

var comm_size = MPI.CommSize(MPI.MPI_COMM_WORLD);

var world_rank = MPI.CommRank(MPI.MPI_COMM_WORLD);

// *** Logging configuration
const logger = log4js.getLogger();
var logfile = `res/log/pifo.${world_rank}.log`;

// Clear log file
if (fs.existsSync(logfile)) fs.unlinkSync(logfile);

var logconfig = {
    appenders: { 
        'file': { type: 'fileSync', filename: logfile, flags:'w',  layout: { type: 'messagePassThrough' }}
    },
    categories: { 
        default: { appenders: ['file'], level: 'debug' } 
    }
};

log4js.configure(logconfig);


var manager = new ConfigManager("../", config);

manager.getModel().then((model) => {   
    // Initialise partition
    // Note : Needs more "automatic" grid partitioning
    var comm = new MPIGridComm();
    comm.globalWidth = model.globalWidth;
    comm.globalHeight = model.globalHeight;
    comm.setupMPI();
    var surfaceType = comm.registerColumnType(1);
    var layerType = comm.registerColumnType(model.nbLayers);
    var interLayerType = comm.registerColumnType(model.nbSurfaces);
    
    // Normal model setup ~~ obligé de tricher DOH !
    model._width = comm.width;
    model._height = comm.height,
    model.setup();
    
    var Z = null;
    var T = null;
    var sigmaf = null;
    
    if (world_rank==0)
    {
        Z = Variable.createVariable(1, model.globalWidth, model.globalHeight);
        T = Variable.createVariable(model.nbLayers, model.globalWidth, model.globalHeight);
        sigmaf = Variable.createVariable(model.nbSurfaces, model.globalWidth, model.globalHeight);
        fill(Z.data);
        fill(T.data);
        fill(sigmaf.data);
        comm.scatter("Z", Z.data, model.getVariable("Z").data, surfaceType);
        comm.scatter("T", T.data, model.getVariable("T").data, layerType);
        comm.scatter("sigmaf", sigmaf.data, model.getVariable("sigmaf").data, interLayerType);
    }
    else
    {
        comm.scatter("Z", null, model.getVariable("Z").data, surfaceType);
        comm.scatter("T", null, model.getVariable("T").data, layerType);
        comm.scatter("sigmaf", null, model.getVariable("sigmaf").data, interLayerType);
    }

    if (world_rank==0)
    {
        var Z_res = Variable.createVariable(1, model.globalWidth, model.globalHeight);
        var T_res = Variable.createVariable(model.nbLayers, model.globalWidth, model.globalHeight);
        var sigmaf_res = Variable.createVariable(model.nbSurfaces, model.globalWidth, model.globalHeight);
        comm.gather("Z", model.getVariable("Z").data, Z_res.data, surfaceType);
        comm.gather("T", model.getVariable("T").data, T_res.data, layerType);
        comm.gather("sigmaf", model.getVariable("sigmaf").data, sigmaf_res.data, interLayerType);
        var data_ok = true;
        var test = true;
        
        logger.debug("testing Z");
        for (var i=0;i<Z.data.length;i++)
        {
            test = (Math.abs(Z.data[i] - Z_res.data[i])<=0.000001);
            if (!test) logger.debug("error ", i, Z.data[i], Z_res.data[i]);
            data_ok = data_ok && test ;
        }
        
        logger.debug("testing T");
        for (var i=0;i<T.data.length;i++)
        {
            test = (Math.abs(T.data[i] - T_res.data[i])<=0.000001);
            if (!test) logger.debug("error ", i, T.data[i], T_res.data[i]);
            data_ok = data_ok && test ;
        }
        
        logger.debug("testing sigmaf");
        for (var i=0;i<sigmaf.data.length;i++)
        {
            test = (Math.abs(sigmaf.data[i] - sigmaf_res.data[i])<=0.000001);
            if (!test) logger.debug("error ", i, sigmaf.data[i], sigmaf_res.data[i]);
            data_ok = data_ok && test ;
        }
        if (!data_ok) 
        {
            logger.debug("Z\n", logVariable(Z), "Z_res\n", logVariable(Z_res));
            logger.debug("T\n", logVariable(T), "T_res\n", logVariable(T_res));
            logger.debug("sigmaf\n", logVariable(sigmaf), "sigmaf_res\n", logVariable(sigmaf_res));
        }
        console.log("data_ok="+data_ok);
    }
    else
    {
        comm.gather("Z", model.getVariable("Z").data, null, surfaceType);
        comm.gather("T", model.getVariable("T").data, null, layerType);
        comm.gather("sigmaf", model.getVariable("sigmaf").data, null, interLayerType);
    }
    
    
    MPI.Finalize();
});

// Fill array with random data
function fill(data)
{
    for (var i=0;i<data.length;i++)
    {
        data[i] = Math.random()*10;
    }
}

// Log variable as 2D CSV data for easier debugging
function logVariable(p_variable)
{
    var str = "";
    var sep = ";";
    for (var k=0;k<p_variable.nbLevels;k++)
    {
        str += "level : "+k.toString()+"\n";
        for (var j=0;j<p_variable.height;j++)
        {
            sep = ""
            for (var i = 0; i < p_variable.width; i++)
            {   
                str += sep + p_variable.get3(i, j, k).toString();
                sep = ";";
            }
            str += "\n"
        }
        str+="\n\n"
    }
    return str;
}