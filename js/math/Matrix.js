/* 
 * Copyright (C) 2018 nicolas
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

export var Matrix = function ()
{
    
}

Matrix.add = function(a, b, res)
{
    if (a.length>0 && (a[0].constructor===Array || a[0].constructor===Float64Array) )
    {    
        for (var j=0;j<a.length;j++)
        {
            for(var i=0;i<a[j].length;i++)
            {
                res[j][i] = a[j][i]+b[j][i];
            }
        }
    }
    else
    {
        for(var i=0;i<a.length;i++)
        {
            res[i] = a[i]+b[i];
        }        
    }

}

Matrix.sub = function(a, b, res)
{
    if (a.length>0 && (a[0].constructor===Array || a[0].constructor===Float64Array) )
    {    
        for (var j=0;j<a.length;j++)
        {
            for(var i=0;i<a[j].length;i++)
            {
                res[j][i] = a[j][i]-b[j][i];
            }
        }
    }
    else
    {
        for(var i=0;i<a.length;i++)
        {
            res[i] = a[i]-b[i];
        }        
    }

}

Matrix.mul = function(a, b, res)
{
    var i, j, k;
    var na = a.length;
    var ma = na>0 && (a[0].constructor===Array || a[0].constructor===Float64Array) ? a[0].length : 1;
    var nb = b.length;
    var mb = nb>0 && (b[0].constructor===Array || b[0].constructor===Float64Array) ? b[0].length : 1;
    
    if (na!=mb) throw Exception("produit interdit");
    
    if (ma>1)
    {
        // Matrice ma*na et mb*nb quelquonques
        for (i=0;i<ma;i++)
        {
            for(j=0;j<nb;j++)
            {
                res[j][i] = 0;
                for (k=0;k<na;k++)
                {
                    res[j][i] += a[k][i]*b[j][k];
                }
            }
        }
    }
    else
    {
        for(j=0;j<nb;j++)
        {
            res[j][0] = 0;
            for (k=0;k<na;k++)
            {
                res[j][0] += a[k][0]*b[j][k];
            }
        }
    }

}

