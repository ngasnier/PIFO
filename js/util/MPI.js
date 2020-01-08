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

export var MPI;

// Fake MPI interface for browser mode
class MPIWrapper {
    constructor()
    {
        
    }
}

const mpiMethods = ["Init", 
    "Finalize", 
    "Barrier", 
    "CommSize", 
    "CommRank", 
    "CommSplit", 
    "CommFree",
    "Send",
    "Receive",
    "Isend",
    "Ireceive",
    "Wait",
    "Scatter",
    "Scatterv",
    "Gather",
    "Gatherv",
    "Alltoallw",
    "TypeCreateSubarray",
    "TypeCreateResized",
    "TypeVector",
    "TypeCommit"];

mpiMethods.forEach(addFakeMethod);

function addFakeMethod(method) {
    switch (method)
    {
        case "CommSize":
            MPIWrapper.prototype[method] = function(...args) {
                return 1;
            }
            break;
        default:
            MPIWrapper.prototype[method] = function(...args) {
                return 0;
            }
    }    
}

const mpiConsts = [
    "MPI_DATATYPE_NULL", 
    "MPI_BYTE",
    "MPI_CHAR", 
    "MPI_SHORT", 
    "MPI_INT", 
    "MPI_LONG", 
    "MPI_FLOAT", 
    "MPI_DOUBLE",
    "MPI_LONG_DOUBLE",
    "MPI_UNSIGNED_CHAR", 
    "MPI_SIGNED_CHAR",
    "MPI_UNSIGNED_SHORT",
    "MPI_UNSIGNED_LONG",
    
    "MPI_COMM_WORLD",
    
    "MPI_ORDER_C", 
    "MPI_ORDER_FORTRAN"];

mpiConsts.forEach(addConst);

function addConst(constant) {
    MPIWrapper[constant] = constant;
}

if (typeof module !== 'undefined' && module.exports)
{
    MPI = require('nodempi');    
}
else
{   
    MPI = new MPIWrapper();
}
