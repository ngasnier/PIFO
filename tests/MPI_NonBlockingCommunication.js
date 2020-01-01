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

var data = new Float64Array(1);
data[0] = world_rank+1;
var send_request = MPI.Isend(data, 1, MPI.MPI_DOUBLE, 1-world_rank, 0, MPI.MPI_COMM_WORLD);

var receive_data = new Float64Array(1);
var receive_request = MPI.Ireceive(receive_data, 1, MPI.MPI_DOUBLE, 1-world_rank, 0, MPI.MPI_COMM_WORLD);

MPI.Wait(send_request);
MPI.Wait(receive_request);

if (world_rank==1) console.log("Process "+world_rank+" received from process 0", receive_data);

MPI.Finalize();