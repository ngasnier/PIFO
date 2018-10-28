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


import { Helper } from "../src/Helper.js";

const path = require('path');
const fs = require("fs");
const { execSync } = require('child_process');

module.exports.gribExtract = function(context)
{
    var cmdline = path.join(context.config.products[context.productName].custom_root, "grib_extract.sh");
    var args = [
        context.productDir,
        path.join(context.config.products[context.productName].pifo_root, "run")
        ];
    return Helper.spawnPromise(cmdline, args, context);
}


module.exports.runPifo = function(context)
{
    var cmdline = "node"
    var args = [
        "runpifo.js"
        ];
    var options =  {cwd: path.join(context.config.products[context.productName].pifo_root)};
    return Helper.spawnPromise(cmdline, args, context, options);
}

module.exports.createMaps = function(context)
{
    context.europe_dir = path.join(context.config.PRODUCT_DIR, "maps/europe/pifo", path.basename(context.productDir));
    Helper.mkdirpSync(context.europe_dir);
    Helper.createSymlink(context.europe_dir, path.join(context.config.PRODUCT_DIR, "maps/europe/pifo", "latest"));
    
    execSync('/bin/cp '+path.join(context.productDir, "fileinfo.txt")+" "+context.europe_dir)
    
    var cmdline = "ncl";
    var args = [
        path.join(context.config.products[context.productName].custom_root, "pifo_all.ncl"),
        "input_dir=\""+path.join(context.config.products[context.productName].pifo_root, "output")+"\"",
        "europe_dir=\""+context.europe_dir+"\""
        ];
    return Helper.spawnPromise(cmdline, args, context);
}

module.exports.createImagesEurope = function(context)
{
    var cmdline = path.join(context.config.products[context.productName].script_root, "createimage_europe.sh");
    return Helper.dirAndProcess(context, context.europe_dir+"/*.ps", 
        (file) => {
            return Helper.spawnPromise(cmdline, [file], context);
        });
}
