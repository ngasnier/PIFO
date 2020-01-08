/* 
 * Copyright (C) 2018 Nicolas GASNIER (http://www.meteo-blois.fr/contact/)
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


import { Scenario } from "./js/front/Scenario.js";
import { ConfigManager } from "./js/front/ConfigManager.js";
import { MPI } from "./js/util/MPI.js";

// Node.js specific
const fs = require('fs');
const log4js = require('log4js');

const path = require('path');


// Environnement de fonctionnement
var mode = "run";
var config = {};
var configFile = "";

// *** Gestion de cleanup
function exitHandler(options, exitCode) {
    if (options.cleanup) 
    {
        logger.info('MPI finalize');
        MPI.Finalize();
    }
    if (exitCode || exitCode === 0) logger.info("exit code : ", exitCode);
    if (options.exit) process.exit();
}

process.on('exit', exitHandler.bind(null,{cleanup:true}));
//process.on('SIGINT', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));

// *** Init MPI
MPI.Init();

var comm_size = MPI.CommSize(MPI.MPI_COMM_WORLD);

var world_rank = MPI.CommRank(MPI.MPI_COMM_WORLD);

// *** traitement de la ligne de commande
if (process.argv.length>2)
{
    if (process.argv.length>3)
    {
        configFile = "./"+process.argv[2]
        mode = process.argv[3];
    }
    else
    {
        configFile = "./config";
        mode = process.argv[2];
    }
}
else 
{
    configFile = "./config";
    mode = "run";
}

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

if (world_rank==0) {
    logconfig.appenders.out = { type: 'stdout', layout: { type: 'messagePassThrough' }};
    logconfig.categories.default.appenders.push('out');
}

log4js.configure(logconfig);

// *** Now PIFO can run
logger.info("PIFO mode "+mode);
logger.info("config : "+configFile);
logger.info("MPI size", comm_size);
logger.info("MPI rank", world_rank);

config = require(configFile);

var classpath = "js/";
var manager = new ConfigManager(classpath, config);

manager.getScenario(mode)
    .then((scenario)=> {
        
        scenario.onMessage = (m)=>logger.info(m);
       
        return runScenario(scenario).then((scenario)=>logger.info("end "+mode))
            .catch((e)=> {
                logger.error(e);
                process.exit(1);
            });
    })
    .catch((e)=> {
       logger.error("error :", e);
       process.exit(1);
    });
   
async function runScenario(scenario)
{
    try {
        await scenario.start();

        while (scenario.status==Scenario.STATE_RUN)
        {
            await scenario.step();
        }
            
        await scenario.finish();
        
        return scenario;
    }
    catch (e)
    {
        logger.error("error :", e);
        process.exit(1);
    }
}