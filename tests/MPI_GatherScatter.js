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

var init_data = [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3];
var n = init_data.length / comm_size;

var send_data = null;
if (world_rank == 0) {    
    send_data = new Float64Array(init_data.length);
    arrayCopy(init_data, send_data);   
} else if (world_rank == 1) {
    
}

// Scatter
var receive_data = new Float64Array(n);
MPI.Scatter(send_data, n, MPI.MPI_DOUBLE, receive_data, n, MPI.MPI_DOUBLE, 0, MPI.MPI_COMM_WORLD);

// Process les valeurs reçues
for (var i=0;i<receive_data.length;i++) receive_data[i] += 1;

// Récupère les valeurs
var gather_data = null;
if (world_rank == 0) {
    gather_data = new Float64Array(init_data.length);
}

MPI.Gather(receive_data, n, MPI.MPI_DOUBLE, gather_data, n, MPI.MPI_DOUBLE, 0, MPI.MPI_COMM_WORLD);
    
// Affichage du résultat calculé !
if (world_rank == 0) {
    console.log("Process "+world_rank+" gathered", gather_data);
}

MPI.Finalize();



function arrayCopy(data, copy)
{
    for (var i=0;i<data.length;i++) copy[i] = data[i];
}
