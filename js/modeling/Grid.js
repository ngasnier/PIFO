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

import { Variable } from "./Variable.js";
import { Matrix } from "../math/Matrix.js";

export class Grid {
    
    // [ 0 1 2 ]      x
    // -------->
    // [ 2 1 0 ]
    optimizeGridIndices(x_in, x_out, cyclic, tab_i_in1, tab_i_in2, tab_x_adj1, tab_x_adj2)
    {
        if (x_in.length>1)
        {                
            var di_in = x_in[0]>x_in[x_in.length-1] ? -1 : 1;
            var nb_in = x_in.length;
            var i_in1 = 0;
            var i_in2 = 0;
            var dx_start = (di_in>=0 ? x_in[1] - x_in[0] : x_in[nb_in-2]-x_in[nb_in-1]);
            var dx_end = (di_in>=0 ? x_in[nb_in-1] - x_in[nb_in-2] : x_in[0]-x_in[1]);
            var x_min = (di_in>=0 ? x_in[0] : x_in[nb_in-1]);
            var x_max = (di_in>=0 ? x_in[nb_in-1] : x_in[0]);
            var x_start_cycle = (di_in>=0 ? x_in[0]-dx_start : x_in[nb_in-1]-dx_start);
            var x_end_cycle = (di_in>=0 ? x_in[nb_in-1]+dx_end : x_in[0]+dx_end);
            var cycle_length = x_end_cycle - x_min;
            var renorm = 0;
            
            var nb = x_out.length;
            var x = 0;
            var dx = 0;

            for (var k=0;k<nb;k++)
            {
                i_in1 = (di_in>=0 ? 0 : x_in.length-1);
                i_in2 = (di_in>=0 ? 1 : x_in.length-2);

                x = x_out[k];
                renorm = 0;
                if (!cyclic && (x<x_min || x>x_max)) 
                {
                    if (x<x_min)
                    {
                        if (di_in>=0)
                        {
                            i_in1 = 0;
                            i_in2 = 1;
                            tab_i_in1[k] = i_in1;
                            tab_i_in2[k] = i_in1;
                        }
                        else
                        {
                            i_in1 = nb_in-1;
                            i_in2 = i_in1-1;
                            tab_i_in1[k] = i_in1;
                            tab_i_in2[k] = i_in1;
                        }
                    }
                    else
                    {
                        if (di_in>=0)
                        {
                            i_in1 = nb_in-2;
                            i_in2 = i_in1+1;
                            tab_i_in1[k] = i_in2;
                            tab_i_in2[k] = i_in2;
                        }
                        else
                        {
                            i_in1 = 1;
                            i_in2 = i_in1-1;
                            tab_i_in1[k] = i_in2;
                            tab_i_in2[k] = i_in2;
                        }
                    }
                    tab_x_adj1[k] = x_in[i_in1];
                    tab_x_adj2[k] = x_in[i_in2];
                    //throw `coordinate is outside of array. x=${x}`;
                }
                else
                {
                    if ((x<x_min) || (x>x_end_cycle))
                    {
                        renorm = Math.floor((x-x_min)/cycle_length);
                    }
                    x = x - renorm*cycle_length;

                    if (x>x_max && x<=x_end_cycle)
                    {
                        if (di_in>=0)
                        {
                            i_in1 = nb_in-1;
                            i_in2 = 0;
                        }
                        else
                        {
                            i_in1 = 0;
                            i_in2 = nb_in-1;
                        }
                        tab_x_adj1[k] = x_in[i_in1]+renorm*cycle_length;
                        tab_x_adj2[k] = x_end_cycle+renorm*cycle_length;
                    }
                    else
                    {
                        while ((x<x_in[i_in1] || x>x_in[i_in2]) 
                                && (i_in1>=0 && i_in1<nb_in && i_in2>=0 && i_in2<nb_in)) 
                        {
                            i_in1+=di_in;
                            i_in2+=di_in;
                        }
                        if (i_in1<0) i_in1 = nb_in-1;
                        if (i_in2<0) i_in2 = nb_in-1;
                        if (i_in1>nb_in) i_in1 = 0;
                        if (i_in2>nb_in) i_in2 = 0;
                        tab_x_adj1[k] = x_in[i_in1]+renorm*cycle_length;
                        tab_x_adj2[k] = x_in[i_in2]+renorm*cycle_length;
                    }
                    tab_i_in1[k] = i_in1;
                    tab_i_in2[k] = i_in2;
                }
            }
        }
        else
        {
            throw `not enough coordinates to regrid.`;
        }
    }
    
    bilinearRegrid(x_in, y_in, data_in, cyclic, x_out, y_out, data_out)
    {
        var tab_i_in1 = [];
        var tab_i_in2 = [];
        var tab_x_adj1 = [];
        var tab_x_adj2 = [];
        var tab_j_in1 = [];
        var tab_j_in2 = [];
        var tab_y_adj1 = [];
        var tab_y_adj2 = [];
        
        var in_width = x_in.length;
        var in_height = y_in.length;

        var x, y;

        var i_in1, j_in1;
        var i_in2, j_in2;

        var x_in1, y_in1;
        var x_in2, y_in2;

        var v1, v2, v3, v4;
        var vv1, vv2;
        var alpha_x, alpha_y;
        var k = 0;


        this.optimizeGridIndices(x_in, x_out, cyclic, tab_i_in1, tab_i_in2, tab_x_adj1, tab_x_adj2);
        this.optimizeGridIndices(y_in, y_out, false, tab_j_in1, tab_j_in2, tab_y_adj1, tab_y_adj2);
        
        for (var i=0;i<x_out.length;i++,k++)
        {
            x = x_out[i];
            i_in1 = tab_i_in1[i];
            i_in2 = tab_i_in2[i];
            x_in1 = tab_x_adj1[i];
            x_in2 = tab_x_adj2[i];
            alpha_x = (x-x_in1)/(x_in2-x_in1);

            y = y_out[i];
            j_in1 = tab_j_in1[i];
            j_in2 = tab_j_in2[i];
            y_in1 = tab_y_adj1[i];
            y_in2 = tab_y_adj2[i];
            alpha_y = (y-y_in1)/(y_in2-y_in1);

            v1 = data_in[i_in1+in_width*j_in1];
            v2 = data_in[i_in1+in_width*j_in2];
            v3 = data_in[i_in2+in_width*j_in1];
            v4 = data_in[i_in2+in_width*j_in2];

            vv1 = alpha_y*v2 + (1-alpha_y)*v1;
            vv2 = alpha_y*v4 + (1-alpha_y)*v3;

            data_out[i] = alpha_x*vv2 + (1-alpha_x)*vv1 ;
        }
    }
    
    /*bilinearRegrid(x_in, y_in, data_in, x_out, y_out, data_out)
    {
        var width = x_out.length;
        var height = y_out.length;
        var in_width = x_in.length;
        var in_height = y_in.length;
        var i=0;
        var ix, iy;
        
        var x, y;

        var i_in1, j_in1;
        var i_in2, j_in2;

        var v1, v2, v3, v4;
        var vv1, vv2;
        var alpha_x, alpha_y;
        
        j_in1 = 0; j_in2 = 1;
        for (var iy=0;iy<height;iy++)
        {
            // find y_in
            y = y_out[iy];
            if (y<y_in[0])
            {
                j_in1 = 0;
                j_in2 = 1;
                y = y_in[0];
            }
            else if (y>y_in[in_height-1])
            {
                j_in1 = in_height-2;
                j_in2 = in_height-1;
                y = y_in[j_in2];
            }
            else 
            {
                j_in1 = 0;
                j_in2 = j_in1+1;
                while ((y<y_in[j_in1] || y>y_in[j_in2]) && j_in2<in_height)
                {
                    j_in1++;
                    j_in2++;
                }
                if (y<y_in[j_in1] || y>y_in[j_in2])
                {
                    throw `y is outside of coordinate array. y=${y}`;
                }
            }
            
            // Notre tableau est dans l'ordre "écran"
            j_in1 = in_height-1-j_in1;
            j_in2 = in_height-1-j_in2;
            
            i_in1 = 0; i_in2 = 1;
            for (var ix=0;ix<width;ix++,i++)
            {
                // find y_in
                x = x_out[iy];
                if (x<x_in[0])
                {
                    // TODO : gérer cyclic
                    i_in1 = 0;
                    i_in2 = 1;
                    x = x_in[0];
                }
                else if (x>x_in[in_width-1])
                {
                    // TODO : gérer cyclic
                    i_in1 = in_width-2;
                    i_in2 = in_width-1;
                    x = x_in[i_in2];
                }
                else 
                {
                    i_in1 = 0;
                    i_in2 = i_in1+1;
                    while ((x<x_in[i_in1] || x>x_in[i_in2]) && i_in2<in_width)
                    {
                        i_in1++;
                        i_in2++;
                    }
                    if (x<x_in[i_in1] || x>x_in[i_in2])
                    {
                        throw `x is outside of coordinate array. x=${x}`;
                    }
                }
                
                v1 = data_in[i_in1+widthInput*y_in1];
                v2 = data_in[i_in1+widthInput*y_in2];
                v3 = data_in[i_in2+widthInput*y_in1];
                v4 = data_in[i_in2+widthInput*y_in2];

                vv1 = alpha_y*v2 + (1-alpha_y)*v1;
                vv2 = alpha_y*v4 + (1-alpha_y)*v3;

                data_out[i] = alpha_x*vv2 + (1-alpha_x)*vv1 ;
            }
        }
    }*/
    
    bicubicRegrid(x_in, y_in, data_in, x_out, y_out, data_out)
    {
        var width = x_out.length;
        var height = y_out.length;
        var in_width = x_in.length;
        var in_height = y_in.length;
        var i=0;
        var ix, iy;
        
        var x, y;

        var i_in1, j_in1;
        var i_in2, j_in2;

        var bicubic_coefs = this.calcBicubicCoefficients(x_in, y_in, data_in);
        var coefs;
        var x_mat = Matrix.createMatrix(1, 4);
        var y_mat = Matrix.createMatrix(4, 1);
        var tmp_mat = Matrix.createMatrix(1, 4);
        var int_mat = Matrix.createMatrix(1, 1);
        var alpha_x, alpha_y;
        
        j_in1 = 0; j_in2 = 1;
        for (var iy=height-1;iy>=0;iy--)
        {
            // find y_in
            y = y_out[iy];
            if (y<y_in[0])
            {
                j_in1 = 0;
                j_in2 = 1;
                y = y_in[0];
            }
            else if (y>y_in[in_height-1])
            {
                j_in1 = in_height-2;
                j_in2 = in_height-1;
                y = y_in[j_in2];
            }
            else 
            {
                j_in1 = 0;
                j_in2 = j_in1+1;
                while ((y<y_in[j_in1] || y>y_in[j_in2]) && j_in2<in_height)
                {
                    j_in1++;
                    j_in2++;
                }
                if (y<y_in[j_in1] || y>y_in[j_in2])
                {
                    throw `y is outside of coordinate array. y=${y}`;
                }
            }
            
            
            i_in1 = 0; i_in2 = 1;
            for (var ix=0;ix<width;ix++,i++)
            {
                // find y_in
                x = x_out[iy];
                if (x<x_in[0])
                {
                    // TODO : gérer cyclic
                    i_in1 = 0;
                    i_in2 = 1;
                    x = x_in[0];
                }
                else if (x>x_in[in_width-1])
                {
                    // TODO : gérer cyclic
                    i_in1 = in_width-2;
                    i_in2 = in_width-1;
                    x = x_in[i_in2];
                }
                else 
                {
                    i_in1 = 0;
                    i_in2 = i_in1+1;
                    while ((x<x_in[i_in1] || x>x_in[i_in2]) && i_in2<in_width)
                    {
                        i_in1++;
                        i_in2++;
                    }
                    if (x<x_in[i_in1] || x>x_in[i_in2])
                    {
                        throw `x is outside of coordinate array. x=${x}`;
                    }
                }
                
                coefs = bicubic_coefs[j_in1][i_in1];
                
                x_mat[0][0] = 1;
                x_mat[1][0] = alpha_x;
                x_mat[2][0] = alpha_x*alpha_x;
                x_mat[3][0] = alpha_x*alpha_x*alpha_x;
                
                y_mat[0][0] = 1;
                y_mat[0][1] = alpha_y;
                y_mat[0][2] = alpha_y*alpha_y;
                y_mat[0][3] = alpha_y*alpha_y*alpha_y;
                
                Matrix.mul(x_mat, coefs, tmp_mat);
                Matrix.mul(tmp_mat, y_mat, int_mat);
                
                data_out[i] = int_mat[0][0];
            }
        }
    }
    
    calcBicubicCoefficients(x, y, data_in)
    {
        var m1 = [[1, 0, -3, 2],
            [0, 0, 3, -2],
            [0, 1, -2, 1],
            [0, 0, -1, 1]];
        var m2 = [[1, 0, 0, 0],
            [0, 0, 1, 0],
            [-3, 3, -2, -1],
            [2, -2, 1, 1]];
        
        var width = x.length;
        var height = y.length;
        
        var dx = Variable.createVariable(0, width, height);
        var dy = Variable.createVariable(0, width, height); 
        var dxy = Variable.createVariable(0, width, height); 
                
        var coeffs = [];
        var idx = 0;
        var c1 = Matrix.createMatrix(4, 4);
        
        this.calcDx(x, y, data_in, dx);
        this.calcDy(x, y, data_in, dy);
        this.calcDy(x, y, dx, dxy);
        
        // Itere sur chaque domaine carré
        for (var j=0;j<height-1;j++)
        {
            coeffs[j] = [];
            for (var i=0;i<width;i++,idx++)
            {
                var f = [
                    [data_in[idx], data_in[idx+1], dx[idx], dx[idx+1]], 
                    [data_in[idx+width], data_in[idx+1+width], dx[idx+width], dx[idx+1+width]],
                    [dy[idx], dy[idx+1], dxy[idx], dxy[idx+1]],
                    [dy[idx+width], dy[idx+1+width], dxy[idx+1], dxy[idx+1+width]]
                ];
                
                var c = Matrix.createMatrix(4, 4);

                Matrix.mul(m1, f, c1);
                Matrix.mul(c1, m2, c);
                
                coeffs[j][i] = c;
            }
        }

        return coeffs;
    }    
}


