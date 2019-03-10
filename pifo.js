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

// Environnement de fonctionnement
var mode = "run";
var config = {};
var configFile = "";

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

// ..........

/*// Choix de surfaces régulièrement espacées sur un nombre souhaité de niveaux
var ptop = config.verticalDomain.ptop;
var surfaces = [ ptop/100000];
var nbsurfaces = config.verticalDomain.nbSurfaces;
var lev = ptop/100000;
for (var i=1;i<nbsurfaces;i++)
{
    lev += ((100000-ptop)/100000)/(nbsurfaces-1);
    surfaces.push(lev);
}
model.setSurfaceLevels(surfaces);*/

