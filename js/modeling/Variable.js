/* 
Copyright (C) 2018 Nicolas GASNIER (http://www.meteo-blois.fr/contact/)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

export var Variable = function ()
{

}

// Variable décrivant des données à une surface intercouche.
Variable.VARIABLE_TYPE_SURFACE = "SURFACE";

// Variable décrivant des données à l'intérieur d'une couche.
Variable.VARIABLE_TYPE_LAYER = "LAYER";


/**
 * Alloue et initialise à zero une variable.
 * @param {type} nblev 1 = variable 2D, >1 = variable 3D
 * @returns {undefined} la variable
 */
Variable.createVariable = function(nblev, width, height, forceLevels=false)
{
    var v = [];
    if (nblev==1 && !forceLevels)
    {
        for (var i=0;i<height*width;i++)
        {
           v[i] = 0;
        }
    }
    else
    {
        for (var k=0;k<nblev;k++)
        {
            v[k] = [];
            for (var i=0;i<height*width;i++)
            {
                v[k][i] = 0;
            }
        }            
    }
    return v;
}


/**
 * Copie les valeurs d'une variable dans une autre.
 * @param {type} a source
 * @param {type} b destination
 * @returns {undefined}
 */
Variable.copy = function(a, b)
{
    if (a.length>0 && a[0].constructor===Array)
    {
        for (var k=0;k<a.length;k++)
        {
            for(var i=0;i<a[k].length;i++)
            {
                b[k][i] = a[k][i];
            }
        }
    }
    else
    {
        for(var i=0;i<a.length;i++)
        {
            b[i] = a[i];
        }       
    }
}


Variable.clone = function(a)
{
    var c = [];
    if (a.length>0 && a[0].constructor===Array)
    {
        for (var k=0;k<a.length;k++)
        {
            c[k] = [];
        }
    }
    Variable.copy(a, c);
    return c;
}

// ********************************************************************
// OPERATEURS DE CALCUL
// ********************************************************************

/**
 * Calcule la somme de deux variables élément par élément
 * @param {type} x
 * @param {type} y
 * @param {type} res variable résultat
 */
Variable.sum = function(x, y, res)
{
    var nb;
    if (x.length>0 && x[0].constructor===Array)
    {    
        for (var k=0;k<x.length;k++)
        {
            nb = x[k].length;
            for(var i=0;i<nb;i++)
            {
                res[k][i] = x[k][i]+y[k][i];
            }
        }
    }
    else
    {
        nb = x.length;
        for(var i=0;i<nb;i++)
        {
            res[i] = x[i]+y[i];
        }        
    }
}


/**
 * Opérateur pour calculer A + B * C
 * @param {type} a variable
 * @param {type} b variable
 * @param {type} c constante
 * @param {type} res résultat
 * @returns {undefined}
 */
Variable.a_bc = function(a, b, c, res)
{
    var nb;
    for (var k=0;k<a.length;k++)
    {
        nb = a[k].length;
        for(var i=0;i<nb;i++)
        {
            res[k][i] = a[k][i]+c*b[k][i];
        }
    }
}

/**
 * Opérateur pour calculer A + B * C sur variable 2D
 * @param {type} a variable
 * @param {type} b variable
 * @param {type} c constante
 * @param {type} res résultat
 * @returns {undefined}
 */
Variable.a_bc2d = function(a, b, c, res)
{
    var nb = a.length;
    for(var i=0;i<nb;i++)
    {
        res[i] = a[i]+c*b[i];
    }
}


/**
 * Calcule le produit de deux variables élément par élément.
 * @param {type} x 
 * @param {type} y
 * @param {type} res variable résultat
 */
Variable.product = function(x, y, res)
{
    var nb;
    if (x.length>0 && x[0].constructor===Array)
    {    
        for (var k=0;k<x.length;k++)
        {
            nb = x[k].length;
            for(var i=0;i<nb;i++)
            {
                res[k][i] = x[k][i]*y[k][i];
            }
        }
    }
    else
    {
        nb = x.length;
        for(var i=0;i<nb;i++)
        {
            res[i] = x[i]*y[i];
        }        
    }
}


/**
 * Permute les valeurs de deux variables.
 * @param {type} a
 * @param {type} b
 */
Variable.swap = function(a, b)
{
    var n;
    for (var k=0;k<a.length;k++)
    {
        for(var i=0;i<a[k].length;i++)
        {
            n = a[k][i];
            a[k][i] = b[k][i];
            b[k][i] = n;
        }
    }                   
}

/**
 * Permute les valeurs de deux variables 2D.
 * @param {type} a
 * @param {type} b
 */
Variable.swap2d = function(a, b)
{
    var n;
    for(var i=0;i<a.length;i++)
    {
        n = a[i];
        a[i] = b[i];
        b[i] = n;
    }
}
