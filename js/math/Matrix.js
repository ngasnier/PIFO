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

Matrix.createMatrix = function(m, n)
{
    var mx = []
    for (var i=0;i<n;i++)
    {
        var buffer = new ArrayBuffer(m * 8);
        mx[i] = new Float64Array(buffer);
        for (var j=0;j<m;j++)
        {
            mx[i][j] = 0;
        }
    }
    return mx;
}

Matrix.createVector = function(n)
{
    var buffer = new ArrayBuffer(n * 8);
    var mx = new Float64Array(buffer);        
    for (var i=0;i<n;i++)
    {
        mx[i] = 0;
    }
    return mx;
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

Matrix.mul = function(a, b, res, diagw=0)
{
    var i, j, k;
    var na = a.length;
    var ma = na>0 && (a[0].constructor===Array || a[0].constructor===Float64Array) ? a[0].length : 1;
    var nb = b.length;
    var mb = nb>0 && (b[0].constructor===Array || b[0].constructor===Float64Array) ? b[0].length : 1;
    var colstart, colend;
    
    //if (na!=mb) throw Exception("produit interdit");
    
    if (ma>1)
    {
        // Matrice ma*na et mb*nb quelquonques
        if (mb>1)
        {
            for (i=0;i<ma;i++)
            {
                colstart = diagw==0?0:i-diagw;
                colend = diagw==0?nb:i+diagw+1;
                if (colstart<0) colstart=0;
                if (colend>=nb) colend=nb;
                for(j=colstart;j<colend;j++)
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
            var cnt = 0;
            for (i=0;i<ma;i++)
            {
                colstart = diagw==0?0:i-diagw;
                colend = diagw==0?nb:i+diagw+1;
                if (colstart<0) colstart=0;
                if (colend>=nb) colend=nb;
                cnt += colend-colstart+1;
                res[i] = 0;
                for(j=colstart;j<colend;j++)
                {
                    res[i] += a[j][i]*b[j];
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

Matrix.residual = function(a, b, x)
{
    var i, j, k, r, s;
    var na = a.length;
    var ma = na>0 && (a[0].constructor===Array || a[0].constructor===Float64Array) ? a[0].length : 1;
    
    r = 0;
    for (i=0;i<ma;i++)
    {
        s = 0;
        for (j=0;j<ma;j++)
        {
            s += a[j][i]*x[j];
        }
        s -= b[i];
        r += Math.abs(s);
    }
    return Math.sqrt(r);
    
}


Matrix.norm = function(x)
{
    var i, r;
    r = 0;
    for (i=0;i<x.length;i++)
    {
        r += x[i]*x[i];
    }
    return Math.sqrt(r);
    
}

Matrix.sor = function(a, b, w, x, r, epsilon=0.000001, maxiter=1000, diagw=0)
{
    var i, j;
    var s, k;
    var nr;
    var na = a.length;
    var ma = na>0 && (a[0].constructor===Array || a[0].constructor===Float64Array) ? a[0].length : 1;
    
    if (ma!=na) throw Exception("matrice non carrée");
    
    for (i=0;i<ma;i++) r[i] = 1;

    k=0;
    while ((nr=Matrix.norm(r))>epsilon && k<maxiter)
    {
        k++;
        for (i=0;i<ma;i++)
        {
            s = 0;
            for (j=0;j<=i-1;j++)
            {
                s += a[j][i]*x[j];
            }
            for (j=i+1;j<na;j++)
            {
                s += a[j][i]*x[j];
            }
            x[i] = (1-w)*x[i]+w/a[i][i]*(b[i]-s);
        }
        Matrix.mul(a, x, r, diagw);
        Matrix.sub(r, b, r);
    }
    return k;
}

