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
    
    optimizeGridIndices(x_in, x_out, cyclic, tab_i_in1, tab_i_in2, tab_x_adj1, tab_x_adj2)
    {
        var di_in = x_in[0]>x_in[x_in.length-1] ? -1 : 1;
        var i_in1 = (di_in>=0 ? 0 : x_in.length-1);
        var i_in2 = (di_in>=0 ? 1 : x_in.length-2);
        var nb_in = x_in.length;
        var nb = x_out.length;
        var x = 0;
        var dx = 0;
              
        for (var k=0;k<nb;k++)
        {
            x = x_out[k];
            console.log("search ", x, i_in1, i_in2, di_in);
            while ((x<x_in[i_in1] || x>x_in[i_in2]) 
                    && (i_in1>=0 && i_in1<nb_in && i_in2>=0 && i_in2<nb_in)) 
            {
                i_in1+=di_in;
                i_in2+=di_in;
            }
            if (di_in>=0 && i_in1<0 && cyclic) 
            {
                tab_i_in1[k] = nb_in-1;
                tab_i_in2[k] = i_in2;
                dx = x_in[i_in2]-x_in[i_in2-1];
                tab_x_adj1[k] = x_in[i_in2]-dx;
                tab_x_adj2[k] = x_in[i_in2];
            }
            else if (di_in>=0 && i_in2>=nb_in && cyclic)
            {
                tab_i_in1[k] = i_in1;
                tab_i_in2[k] = 0;
                dx = x_in[i_in1]-x_in[i_in1-1];
                tab_x_adj1[k] = x_in[i_in1];
                tab_x_adj2[k] = x_in[i_in1]+dx;
            }
            else if (di_in<0 && i_in1>=nb_in && cyclic) 
            {
                console.log("prout", i_in1, i_in2, di_in, x);
                tab_i_in1[k] = 0;
                tab_i_in2[k] = i_in2;
                dx = x_in[i_in2-1]-x_in[i_in2];
                tab_x_adj1[k] = x_in[i_in2]-dx;
                tab_x_adj2[k] = x_in[i_in2];
            }
            else if (di_in<0 && i_in2<0 && cyclic)
            {
                tab_i_in1[k] = i_in1;
                tab_i_in2[k] = nb_in-1;
                dx = x_in[i_in1]-x_in[i_in1+1];
                // TODO : il faut calculer de combien on dépasse !!!
                tab_x_adj1[k] = x_in[i_in1];
                tab_x_adj2[k] = x_in[i_in1]+dx;
                if (x<tab_x_adj1[k])
                {
                    tab_x_adj1[k] = x_in[nb_in-1]-dx;
                    tab_x_adj2[k] = x_in[nb_in-1];
                }
               
                console.log("pouet", i_in1, i_in2, di_in, x, dx, tab_x_adj1[k], tab_x_adj2[k]);
            }
            else if (x>=x_in[i_in1] && x<=x_in[i_in2])
            {
                console.log("TROUVE", k, i_in1, i_in2, nb_in, x, x_in[i_in1], x_in[i_in2]);
                tab_i_in1[k] = i_in1;
                tab_i_in2[k] = i_in2;
                tab_x_adj1[k] = x_in[i_in1];
                tab_x_adj2[k] = x_in[i_in2];
            }
            else
            {
            console.log("*********", i_in1, i_in2, nb_in, x, i_out);
            console.log("#########");
            console.log("#########");
            console.log("#########");
            console.log("#########");
            console.log("#########");
            console.log("#########");
            console.log("#########");
            console.log("#########");
            console.log("#########");
            console.log("#########");
            console.log("#########");
            console.log("#########");
            console.log("#########");
            console.log("#########");
            console.log("#########");
            console.log("#########");
            console.log("#########");
            console.log("#########");
            console.log("#########");
            console.log("#########");
            console.log("#########");
            console.log("#########");
            console.log("#########");
            console.log("#########");
            console.log("#########");
            console.log("#########");
            console.log("#########");
            console.log("#########");
                throw `coordinate is outside of array. x=${x}`;
            }
            
            i_in1 = (di_in>=0 ? 0 : x_in.length-1);
            i_in2 = (di_in>=0 ? 1 : x_in.length-2);
        }
    }
    
    bilinearRegrid(x_in, y_in, data_in, x_out, y_out, data_out)
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
    }
    
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


