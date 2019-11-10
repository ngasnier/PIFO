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

// Node.js specific
var fs = require('fs');
const path = require('path');

const MPI = require('nodempi');

// Environnement de fonctionnement
var mode = "run";
var config = {};
var configFile = "";

// *** Gestion de cleanup
function exitHandler(options, exitCode) {
    if (options.cleanup) 
    {
        console.log('MPI finalize');
        MPI.Finalize();
    }
    if (exitCode || exitCode === 0) console.log("exit code : ", exitCode);
    if (options.exit) process.exit();
}

process.on('exit', exitHandler.bind(null,{cleanup:true}));
//process.on('SIGINT', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));

// *** Init MPI
MPI.Init();

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

console.log("PIFO mode "+mode);
console.log("config : "+configFile);

var comm_size = MPI.CommSize();
console.log("MPI size", comm_size);

var world_rank = MPI.CommRank();
console.log("MPI rank", world_rank);

config = require(configFile);

var classpath = "js/";
var manager = new ConfigManager(classpath, config);

manager.getScenario(mode)
    .then((scenario)=> {
        
        scenario.onMessage = (m)=>console.log(m);
       
        return runScenario(scenario).then((scenario)=>console.log("end "+mode))
            .catch((e)=> {
                console.log(e);
                process.exit(1);
            });
    })
    .catch((e)=> {
       console.log("error :", e);
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
        console.log("error :", e);
        process.exit(1);
    }
}