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

function arrayCopy(data, copy)
{
    for (var i=0;i<data.length;i++) copy[i] = data[i];
}

MPI.Init();

var nbrows = 2;
var nbcols = 2;

var comm_size = MPI.CommSize(MPI.MPI_COMM_WORLD);

var world_rank = MPI.CommRank(MPI.MPI_COMM_WORLD);

// Create data to be sent from process 0 ======================================
 
// Static data untyped...
var globalwidth = 5;
var globalheight = 5;
var init_data = [0,0,0,1,1,
                 0,0,0,1,1,
                 0,0,0,1,1,
                 2,2,2,3,3,
                 2,2,2,3,3];
// ... needs to be converted to typed array
var send_data = null;

if (world_rank==0) {
    send_data = new Float64Array(init_data.length);
    arrayCopy(init_data, send_data);    
}

// The rows / Columns we belong to
var columns = [0, 1, 0, 1];
var rows = [0, 0, 1, 1];

var myrow = rows[world_rank];
var mycol = columns[world_rank];

// Number of rows & columns sizes to dispatch to processes
var dispatch_rows_size = [3, 2]; 
var dispatch_cols_size = [3, 2];

// create communicators which have processors with the same row or column in them
var rowComm = MPI.CommSplit(MPI.MPI_COMM_WORLD, myrow, world_rank);
var colComm = MPI.CommSplit(MPI.MPI_COMM_WORLD, mycol, world_rank);

var row_rank = MPI.CommRank(rowComm);
var col_rank = MPI.CommRank(colComm);
//console.log(world_rank, myrow, mycol, row_rank, col_rank);

// first, scatter the array by rows, with the processor in column 0 corresponding to each row
// receiving the data 
var rowdata = null;

if (mycol == 0) {
    var sendcounts = new Int32Array(nbrows);
    var senddispls = new Int32Array(nbrows);
    senddispls[0] = 0;

    for (var row=0; row<nbrows; row++) {
        // each processor gets blocksize rows, each of size globalsizes[1]... 
        sendcounts[row] = dispatch_rows_size[row]*globalwidth;
        if (row > 0)
            senddispls[row] = senddispls[row-1] + sendcounts[row-1];
    }

    rowdata = new Float64Array(sendcounts[myrow]);

    MPI.Scatterv(send_data, sendcounts, senddispls, MPI.MPI_DOUBLE,
                  rowdata, sendcounts[myrow], MPI.MPI_DOUBLE, 0, colComm);
}

// Now, within each row of processors, we can scatter the columns.
//  We can do this as we did in the previous example; create a vector
// (and localvector) type and scatter accordingly 
var locnrows = dispatch_rows_size[myrow];

var vec = MPI.TypeVector(locnrows, 1, globalwidth, MPI.MPI_DOUBLE);
vec = MPI.TypeCreateResized(vec, 0, 8);
MPI.TypeCommit(vec);

var localvec = MPI.TypeVector(locnrows, 1, dispatch_cols_size[mycol], MPI.MPI_DOUBLE);
localvec = MPI.TypeCreateResized(localvec, 0, 8);
MPI.TypeCommit(localvec);

var sendcounts = new Int32Array(nbcols);
var senddispls = new Int32Array(nbcols);
if (mycol == 0) {
    senddispls[0] = 0;
    for (var col=0; col<nbcols; col++) {
        sendcounts[col] = dispatch_cols_size[col];
        if (col>0)
            senddispls[col] = senddispls[col-1]+dispatch_cols_size[col-1];
    }
}

var rowptr = (mycol == 0) ? rowdata : null;

var localdata = new Float64Array(dispatch_rows_size[myrow]*dispatch_cols_size[mycol]);

MPI.Scatterv(rowptr, sendcounts, senddispls, vec,
              localdata, dispatch_cols_size[mycol], localvec, 0, rowComm);

// Process les valeurs reçues
for (var i=0;i<localdata.length;i++) localdata[i] += 1;

// Gather column data
var gather_row_data = (mycol==0) ? new Float64Array(rowdata.length) : null;
MPI.Gatherv(localdata, dispatch_cols_size[mycol], localvec,
                 gather_row_data, sendcounts, senddispls, vec, 0, rowComm);

if (mycol==0) {
    
    // Same as before...
    var sendcounts = new Int32Array(nbrows);
    var senddispls = new Int32Array(nbrows);
    senddispls[0] = 0;

    for (var row=0; row<nbrows; row++) {
        /* each processor gets blocksize rows, each of size globalsizes[1]... */
        sendcounts[row] = dispatch_rows_size[row]*globalwidth;
        if (row > 0)
            senddispls[row] = senddispls[row-1] + sendcounts[row-1];
    }
    
    var gather_data = world_rank==0 ? new Float64Array(init_data.length) : null;
    
    MPI.Gatherv(gather_row_data, sendcounts[myrow], MPI.MPI_DOUBLE,
                 gather_data, sendcounts, senddispls, MPI.MPI_DOUBLE, 0, colComm);
                 
    if (world_rank==0) console.log("Process 0 gathered", gather_data);
}

MPI.CommFree(rowComm);
MPI.CommFree(colComm);

MPI.Finalize();