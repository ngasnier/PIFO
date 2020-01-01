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

const { spawn } = require('child_process');

// Utility to exec MPI processes
spawnCommand = function(cmdline, options = {})
{
    return new Promise((resolve, reject) => {
        try {
            var args = cmdline.split(" ");
            var process = args[0];
            args = args.slice(1);
            var result = "";

            var child = spawn(process, args, options);

            child.on('error', (code) => {
                reject(code);
            });

            child.on('exit', (code, signal) => {
                if (code==0 || code==null)
                {
                    resolve(result);
                }
                else
                {
                    reject("exit code :"+code+"\n"+result);
                }
            });

            child.stdin.end();

            child.stdout.on('data', (data) => {
                result += data.toString("utf8");
            });
            child.stderr.on('data', (data) => {
                result += data.toString("utf8");
            });
        } 
        catch (e)
        {
            reject(e);
        }
    });    
}

// Clean color & trailing end of lines from output command
cleanOutput = function(str)
{
    return str.trim().replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "");
}

// Basic test of MPI functionality. 
// Can only call init & finalize once in that process.
// We expect only things to work without exception and check comm status.
test('Basic MPI init & simple functionnality', () => {
   MPI.Init();
   
   var size = MPI.CommSize(MPI.MPI_COMM_WORLD);
   expect(size).toBe(1);
   
   var rank = MPI.CommRank(MPI.MPI_COMM_WORLD);
   expect(rank).toBe(0);
   
   MPI.Finalize();
});


test('Basic MPI communication', () => {
   return spawnCommand("mpirun -n 2 node tests/MPI_BasicCommunication.js").then((result) => {
       expect(cleanOutput(result)).toBe("Process 1 received from process 0 Float64Array [ -1 ]");
   });
});

test('Gather/Scatter', () => {
   return spawnCommand("mpirun -n 4 node tests/MPI_GatherScatter.js").then((result) => {
       expect(cleanOutput(result)).toBe("Process 0 gathered Float64Array [ 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4 ]");
   });
});

test('Gatherv/Scatterv', () => {
   return spawnCommand("mpirun -n 4 node tests/MPI_GathervScatterv.js").then((result) => {
       expect(cleanOutput(result)).toBe("Process 0 gathered Float64Array [\n  1,\n  1,\n  1,\n  2,\n  2,\n  2,\n"
                                                                          +"  1,\n  1,\n  1,\n  2,\n  2,\n  2,\n"
                                                                          +"  1,\n  1,\n  1,\n  2,\n  2,\n  2,\n"
                                                                          +"  3,\n  3,\n  3,\n  4,\n  4,\n  4,\n"
                                                                          +"  3,\n  3,\n  3,\n  4,\n  4,\n  4,\n"
                                                                          +"  3,\n  3,\n  3,\n  4,\n  4,\n  4 ]");
   });
});

test('CommSplit/TypeVector', () => {
   return spawnCommand("mpirun -n 4 node tests/MPI_CommSplit.js").then((result) => {
       expect(cleanOutput(result)).toBe("Process 0 gathered Float64Array [ 1, 1, 1, 2, 2, 1, 1, 1, 2, 2, 1, 1, 1, 2, 2, 3, 3, 3, 4, 4, 3, 3, 3, 4, 4 ]");
   });
});

// This test fails for now. Code is unfinished and implementation 
// of MPI_Alltoallw is not fully validated.
/* test('Alltoallw', () => {
   return spawnCommand("mpirun -n 4 node tests/MPI_Alltoallw.js").then((result) => {
       expect(cleanOutput(result)).toBe("ok");
   });
});*/
