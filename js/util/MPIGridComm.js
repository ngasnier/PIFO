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

import { Logger } from "../util/Logger.js";
import { MPI } from "./MPI.js";

export class MPIGridComm  {
    constructor()
    {
        //** Largeur de grille du domaine
        this._globalWidth = 36;

        //** Hauteur de grille du domaine
        this._globalHeight = 36;

        //** Largeur de grille locale
        this._width=36;

        //** Hauteur de grille locale
        this._height=36;

        // *** MPI management

        // Our rank in the MPI cluster
        this.worldRank = 0;
        
        // Size of MPI cluster.
        this.worldSize = 1;
        
        // Width of the grid partition
        this.partitionWidth = 1;
        
        // Height of the grid partition
        this.partitionHeight = 1;
        
        // Our column position
        this.partitionColumn = 0;
        
        // Our partition row
        this.partitionRow = 0;
        
        // Informations about our neighbours for MPI communication
        this.neighboursInfo = [];
        
        // Communicator for row dispatching
        this.rowComm = null;
        
        // Communicator for column dispatching
        this.colComm = null;
        
        // Global types for 2D/3D variables gather/scatter
        this.globalVecType = [];
        
        // Local types for 2D/3D variables gather/scatter
        this.localVecType = [];
        
        // Buffers for MPI communication
        this.rowDataBuffer = null;
        
        this.colComm_sendcounts = [];
        this.colComm_senddispls = [];
        this.rowComm_sendcounts = [];
        this.rowComm_senddispls = [];
        this.rowComm_recvcounts = [];
       
    }
    get globalWidth()
    {
        return this._globalWidth;
    }
    
    set globalWidth(w)
    {
        this._globalWidth = w;
    }
    
    get globalHeight()
    {
        return this._globalHeight;
    }
    
    set globalHeight(h)
    {
        this._globalHeight = h;
    }
    
    get width()
    {
        return this._width;
    }
    
    get height()
    {
        return this._height;
    }

    setupMPI()
    {        
        this.worldSize = MPI.CommSize(MPI.MPI_COMM_WORLD);
        this.worldRank = MPI.CommRank(MPI.MPI_COMM_WORLD);
        if (this.worldSize<2) return;
        
        // Découpage de la grille en nombre de zones
        this.partitionWidth = Math.floor(Math.sqrt(this.worldSize));
        this.partitionHeight = Math.floor(Math.sqrt(this.worldSize));
        while (this.partitionWidth*this.partitionHeight<this.worldSize)
        {
            partitionWidth++;
        }
        if (this.partitionWidth*this.partitionHeight>this.worldSize) 
            throw `MPI partition failed. world=${this.worldSize} partitionWidth=${this.partitionWidth} partitionHeight=${this.partitionHeight}`;
        
        // Our row and column position in the partition
        this.partitionRow = Math.floor(this.worldRank/this.partitionWidth);
        this.partitionColumn = this.worldRank-this.partitionRow*this.partitionWidth;
        
        // Two possible cases of grid size in each axis
        var ncol = Math.trunc(this.globalWidth/this.partitionWidth);
        var nrow = Math.trunc(this.globalHeight/this.partitionHeight);
        this.dispatch_cols_size = [ncol, ncol+(this.globalWidth-ncol*this.partitionWidth)];
        this.dispatch_rows_size = [nrow, nrow+(this.globalHeight-nrow*this.partitionHeight)];

        // create communicators which have processors with the same row or column in them
        this.rowComm = MPI.CommSplit(MPI.MPI_COMM_WORLD, this.partitionRow, this.worldRank);
        this.colComm = MPI.CommSplit(MPI.MPI_COMM_WORLD, this.partitionColumn, this.worldRank);

        var row_rank = MPI.CommRank(this.rowComm);
        var col_rank = MPI.CommRank(this.colComm);

        this._height = (this.partitionRow==(this.partitionHeight-1) ? this.dispatch_rows_size[1] : this.dispatch_rows_size[0]);
        this._width = (this.partitionColumn==(this.partitionWidth-1) ? this.dispatch_cols_size[1] : this.dispatch_cols_size[0]);
    }
    
    registerColumnType(p_columnHeight)
    {
        var new_type = this.globalVecType.length;
        
        // Create types for layer fields
        var vec = MPI.TypeVector(this.height, p_columnHeight, this.globalWidth*p_columnHeight, MPI.MPI_DOUBLE);
        this.globalVecType[new_type] = MPI.TypeCreateResized(vec, 0, 8*p_columnHeight);
        MPI.TypeCommit(this.globalVecType[new_type]);

        var localvec = MPI.TypeVector(this.height, p_columnHeight, this.width*p_columnHeight, MPI.MPI_DOUBLE);
        this.localVecType[new_type] = MPI.TypeCreateResized(localvec, 0, 8*p_columnHeight);
        MPI.TypeCommit(this.localVecType[new_type]);

        if (this.partitionColumn==0)  // partitionColumn==0 ???
        {
            this.colComm_sendcounts[new_type] = new Int32Array(this.partitionHeight);
            this.colComm_senddispls[new_type] = new Int32Array(this.partitionHeight);
            this.colComm_senddispls[new_type][0] = 0;

            for (var row=0; row<this.partitionHeight; row++) {
                this.colComm_sendcounts[new_type][row] = this.dispatch_rows_size[row<this.partitionRow-1?0:1]*this.globalWidth;
                this.colComm_sendcounts[new_type][row] *= p_columnHeight;                 
                if (row > 0)
                    this.colComm_senddispls[new_type][row] = this.colComm_senddispls[new_type][row-1] + this.colComm_sendcounts[new_type][row-1];
            }

            // Allocate only one buffer, with size maximum of what is needed
            if (this.rowDataBuffer==null || this.rowDataBuffer.length<this.colComm_sendcounts[new_type][0]);
                this.rowDataBuffer = new Float64Array(this.colComm_sendcounts[new_type][0]);
        }

        this.rowComm_sendcounts[new_type] = new Int32Array(this.partitionWidth);
        this.rowComm_senddispls[new_type] = new Int32Array(this.partitionWidth);
        this.rowComm_recvcounts[new_type] =  this.dispatch_cols_size[this.partitionColumn<this.partitionWidth-1?0:1]

        if (this.partitionColumn == 0) {
            this.rowComm_senddispls[new_type][0] = 0;
            for (var col=0; col<this.partitionWidth; col++) {
                this.rowComm_sendcounts[new_type][col] = this.dispatch_cols_size[col<this.partitionWidth-1?0:1];
                if (col>0)
                    this.rowComm_senddispls[new_type][col] = this.rowComm_senddispls[new_type][col-1]+this.rowComm_sendcounts[new_type][col-1];
            }
        }
        
        
        Logger.getLogger().debug(`Global grid ${this.globalWidth}x${this.globalHeight}, Local grid ${this.width}x${this.height}`);
        Logger.getLogger().debug(`Grid split into ${this.partitionWidth}x${this.partitionHeight} processes`);
        Logger.getLogger().debug(`Process ${this.worldRank}/${this.worldSize} is at ${this.partitionColumn}x${this.partitionRow}`);
        Logger.getLogger().debug(`Col comm send counts ${this.colComm_sendcounts}, Senddispls ${this.colComm_senddispls}`);
        Logger.getLogger().debug(`Row comm send counts ${this.rowComm_sendcounts}, Senddispls ${this.rowComm_senddispls}`);
        
        return new_type;
    }
    
    scatter(p_name, p_globalData, p_localData, p_scatterType)
    {
        if (MPI.CommSize(MPI.MPI_COMM_WORLD)==1) return;
        
        Logger.getLogger().debug(`Scattering ${p_name} ${p_scatterType}`);
        
        if (this.partitionColumn == 0) 
        {
            Logger.getLogger().debug(`Scatter rows global_data(${p_globalData!=null?p_globalData.length:0}) counts(${this.colComm_sendcounts[p_scatterType]}) displs(${this.colComm_senddispls[p_scatterType]})`);
            Logger.getLogger().debug(`rowDataBuffer.length=${this.rowDataBuffer.length} receive(${this.colComm_sendcounts[p_scatterType][this.partitionRow]})`);          
            MPI.Scatterv(p_globalData, this.colComm_sendcounts[p_scatterType], this.colComm_senddispls[p_scatterType], MPI.MPI_DOUBLE,
                      this.rowDataBuffer, this.colComm_sendcounts[p_scatterType][this.partitionRow], MPI.MPI_DOUBLE, 0, this.colComm);
        }
        
        var rowptr = (this.partitionColumn == 0) ? this.rowDataBuffer : null;

        Logger.getLogger().debug(`Scatter cols counts(${this.rowComm_sendcounts[p_scatterType]}) displs(${this.rowComm_senddispls[p_scatterType]})`);
        Logger.getLogger().debug(`receive(${this.rowComm_recvcounts[p_scatterType]})`);
        MPI.Scatterv(rowptr, this.rowComm_sendcounts[p_scatterType], this.rowComm_senddispls[p_scatterType], this.globalVecType[p_scatterType],
                      p_localData, this.rowComm_recvcounts[p_scatterType], this.localVecType[p_scatterType], 0, this.rowComm);
    }
    
    gather(p_name, p_localData, p_globalData, p_scatterType)
    {
        if (MPI.CommSize(MPI.MPI_COMM_WORLD)==1) return;

        Logger.getLogger().debug(`Gathering ${p_name} ${p_scatterType}`);
        
        // Gather column data
        var gather_row_data = (this.partitionColumn == 0) ? this.rowDataBuffer : null;

        Logger.getLogger().debug(`Gather cols counts(${this.rowComm_sendcounts[p_scatterType]}) displs(${this.rowComm_senddispls[p_scatterType]})`);
        Logger.getLogger().debug(`receive(${this.rowComm_recvcounts[p_scatterType]})`);
    
        MPI.Gatherv(p_localData, this.rowComm_recvcounts[p_scatterType], this.localVecType[p_scatterType],
                         gather_row_data, this.rowComm_sendcounts[p_scatterType], this.rowComm_senddispls[p_scatterType], this.globalVecType[p_scatterType], 0, this.rowComm);

        if (this.partitionColumn==0) {
           
            Logger.getLogger().debug(`Gather rows global_data(${p_globalData!=null?p_globalData.length:0}) counts(${this.colComm_sendcounts[p_scatterType]}) displs(${this.colComm_senddispls[p_scatterType]})`);
            Logger.getLogger().debug(`rowDataBuffer.length=${this.rowDataBuffer.length} receive(${this.colComm_sendcounts[p_scatterType][this.partitionRow]})`);
            
            MPI.Gatherv(gather_row_data, this.colComm_sendcounts[p_scatterType][this.partitionRow], MPI.MPI_DOUBLE,
                         p_globalData, this.colComm_sendcounts[p_scatterType], this.colComm_senddispls[p_scatterType], MPI.MPI_DOUBLE, 0, this.colComm);
        }

    }
}