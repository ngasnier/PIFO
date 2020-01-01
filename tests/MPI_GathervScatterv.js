/* 
 * Copyright (C) 2019 Nicolas GASNIER (http://www.meteo-blois.fr/contact/)
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

const MPI = require('nodempi');

MPI.Init();

var comm_size = MPI.CommSize(MPI.MPI_COMM_WORLD);

var world_rank = MPI.CommRank(MPI.MPI_COMM_WORLD);

var send_data = null;

if (world_rank == 0) {    
    // Grille régulière
    var init_data = [0,0,0,1,1,1,
                     0,0,0,1,1,1,
                     0,0,0,1,1,1,
                     2,2,2,3,3,3,
                     2,2,2,3,3,3,
                     2,2,2,3,3,3];
    send_data = new Float64Array(init_data.length);
    arrayCopy(init_data, send_data);   
} else if (world_rank == 1) {
    
}

// Init types
var gridsize = 6;
var procgridsize = 2;
var sizes = new Int32Array(2);
arrayCopy([gridsize, gridsize], sizes);
var subsizes = new Int32Array(2);
arrayCopy([gridsize/procgridsize, gridsize/procgridsize], subsizes);
var starts = new Int32Array(2);
arrayCopy([0, 0], starts);

var type = MPI.TypeCreateSubarray(2, sizes, subsizes, starts, MPI.MPI_ORDER_C, MPI.MPI_DOUBLE);
var subarrtype = MPI.TypeCreateResized(type, 0, gridsize/procgridsize*8);
MPI.TypeCommit(subarrtype);

// Init indices
var n = gridsize*gridsize/(procgridsize*procgridsize);
var receive_data = new Float64Array(n);    
var sendcounts = new Int32Array(procgridsize*procgridsize);
var displs = new Int32Array(procgridsize*procgridsize);

if (world_rank == 0) {
    for (var i=0; i<procgridsize*procgridsize; i++) sendcounts[i] = 1;
    var disp = 0;
    for (var i=0; i<procgridsize; i++) {
        for (var j=0; j<procgridsize; j++) {
            displs[i*procgridsize+j] = disp;
            disp += 1;
        }
        disp += ((gridsize/procgridsize)-1)*procgridsize;
    }
}

MPI.Scatterv(send_data, sendcounts, displs, subarrtype, receive_data,
             gridsize*gridsize/(procgridsize*procgridsize), MPI.MPI_DOUBLE,0, MPI.MPI_COMM_WORLD);

// Process les valeurs reçues
for (var i=0;i<receive_data.length;i++) receive_data[i] += 1;

// Récupère les valeurs
var gather_data = null;
if (world_rank == 0) {
    gather_data = new Float64Array(init_data.length);
}

MPI.Gatherv(receive_data, gridsize*gridsize/(procgridsize*procgridsize), MPI.MPI_DOUBLE,
                 gather_data, sendcounts, displs, subarrtype, 0, MPI.MPI_COMM_WORLD);
    
// Affichage du résultat calculé !
if (world_rank == 0) {
    console.log("Process "+world_rank+" gathered", gather_data);
}

MPI.Finalize();



function arrayCopy(data, copy)
{
    for (var i=0;i<data.length;i++) copy[i] = data[i];
}
