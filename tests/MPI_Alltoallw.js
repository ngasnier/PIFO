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

/* Pour passer d'un tableau non typé à un tableau typé */
function arrayCopy(data, copy)
{
    for (var i=0;i<data.length;i++) copy[i] = data[i];
}

MPI.Init();

var comm_size = MPI.CommSize(MPI.MPI_COMM_WORLD);

var world_rank = MPI.CommRank(MPI.MPI_COMM_WORLD);

// Grille irrégulière
var init_data = [0,0,0,1,1,
                 0,0,0,1,1,
                 0,0,0,1,1,
                 2,2,2,3,3,
                 2,2,2,3,3];

var send_data = null;

send_data = new Float64Array(init_data.length);
arrayCopy(init_data, send_data);    

if (world_rank == 0) {
    send_data = new Float64Array(init_data.length);
    arrayCopy(init_data, send_data);
} 

// Taille total de la grille
var sizes = new Int32Array(2);
arrayCopy([5, 5], sizes);

// Types de blocs (4 types différents)
var blocktypes = [];

// Les tailles de block
var subsizes_param = [ [3, 3], [2, 3], [3, 2], [2, 2] ] ;
var subsizes = new Int32Array(2);

// Débuts de chaque bloc 
var starts_param = [ [0, 0], [3, 0], [0, 3], [3, 3]];
var starts = new Int32Array(2);
starts[0] = 0; starts[1] = 0;

// Initialisation des types
for (var j=0; j<2; j++) {        
    for (var i=0; i<2; i++) {
        subsizes[0] = subsizes_param[i+j*2][0];
        subsizes[1] = subsizes_param[i+j*2][1];
        starts[0] = starts_param[i+j*2][0];
        starts[1] = starts_param[i+j*2][1];
        blocktypes[i+j*2] = MPI.TypeCreateSubarray(2, sizes, subsizes, starts, MPI.MPI_ORDER_C, MPI.MPI_DOUBLE);
        //blocktypes[i+j*2] = MPI.TypeCreateResized(type, 0, subsizes[0]*8);
        MPI.TypeCommit(blocktypes[i+j*2]);
    }
}

// Déplacements
var senddispls_param = [ 0, 3*8, 5*3*8, 5*3*8 + 3*8];

var sendcounts = new Int32Array(4);
var senddispls = new Int32Array(4);
var sendtypes = [];

// Réceptions
var recvcounts = new Int32Array(4);
var recvdispls = new Int32Array(4);
var recvtypes = [];

var proc = 0;
for (var j=0; j<2; j++) {        
    for (var i=0; i<2; i++, proc++) {
        sendcounts[proc] = proc==0 && world_rank==0 ? 1 : 0;
        senddispls[proc] = senddispls_param[proc];
        sendtypes[proc] = blocktypes[proc];

        /*recvcounts[proc] = proc==0 ? subsizes_param[proc][0]*subsizes_param[proc][1] : 0;
        recvdispls[proc] = 0;
        recvtypes[proc] = MPI.MPI_DOUBLE;*/
        
        recvcounts[proc] = proc==0 ? 1 : 0;
        recvdispls[proc] = 0;
        recvtypes[proc] = MPI.MPI_DOUBLE;
    }
}

var receive_data = new Float64Array(recvcounts[world_rank]);
if (world_rank==0) 
    console.log(
        {
            "rank": world_rank,
            "send_data":send_data,
            "sendcounts":sendcounts,
            "senddispls":senddispls,
            "sendtypes":sendtypes,
            "recvcounts":recvcounts,
            "recvdispls":recvdispls,
            "recvtypes":recvtypes,
            "___": "",
            "subsizes":subsizes
        });

MPI.Alltoallw(send_data, sendcounts, senddispls, sendtypes,
        receive_data, recvcounts, recvdispls, recvtypes, MPI.MPI_COMM_WORLD);

//console.log(receive_data);
MPI.Finalize();


