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

/**
 * Fonctions de gestion et de calcul sur les variables de modèle.
 * 
 * <p>Les variables de modèle sont des tableaux Javascript de deux types :
 * <ul>
 *   <li>2D : tableau de type Float64Array linéaire de longueur width*height</li>
 *   <li>3D : tableau de n variables 2D pour les n niveaux de la variable.</li>
 * </p>
 * 
 * <p>Une variable créée avec les méthodes de cette classe aura les propriétés 
 * suivantes en plus par rapport aux tableaux Javascript, à des fins de
 * méta-description :
 * <ul>
 *   <li>width</li>
 *   <li>height</li>
 *   <li>nbLevels : 0 pour une variable 2D</li>
 * </ul>
 * </p>
 * 
 * <p>Par convention, toute propriétés de la classe VariableDescription peut
 * être affectée à la variable pour compléter ses méta-données, et en plus  :
 * <ul>
 *   <li>latitudes : latitude des points de la variable</li>
 *   <li> longitudes : longitude des points de la variable</li>
 * </ul>
 * </p>
 * 
 * <p>Toute autre propriété ne sera pas gérée par cette classe.</p>
 * 
 * @type type
 */
export class Variable
{
    /**
     * 
     * @returns {undefined}
     */
    constructor()
    {
        
    }
}

/**
 * Alloue et initialise à zero une variable.
 * @param {type} nblev 1 = variable 2D, >1 = variable 3D
 * @returns {undefined} la variable
 */
Variable.createVariable = function(nblev, width, height)
{
// Version avec tableaux typés, donne des perfs régulières sous node
    if (nblev==0)
    {
        var buffer = new ArrayBuffer(width*height * 8);
        var v = new Float64Array(buffer)
        for (var i=0;i<height*width;i++)
        {
           v[i] = 0.0;
        }
        v.nbLevels = nblev;
        v.width = width;
        v.height = height;
        return v;
    }
    else
    {
        var v = new Array(nblev);
        for (var k=0;k<nblev;k++)
        {
            var buffer = new ArrayBuffer(width*height * 8);
            v[k] = new Float64Array(buffer)
            v[k].nbLevels = 0;
            v[k].width = width;
            v[k].height = height;
            for (var i=0;i<height*width;i++)
            {
                v[k][i] = 0.0;
            }
        }
        v.nbLevels = nblev;
        v.width = width;
        v.height = height;
        return v;
    }
}

/**
 * Copie les valeurs d'une variable dans une autre.
 * @param {type} a source
 * @param {type} b destination
 * @returns {undefined}
 */
Variable.copy = function(a, b)
{
    if (a.length>0 && (a[0].constructor===Array || a[0].constructor===Float64Array))
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

/**
 * 
 * @param {type} a
 * @returns {Array|Variable.clone.c}
 */
Variable.clone = function(a)
{
    var c = [];
    if (a.length>0 && (a[0].constructor===Array || a[0].constructor===Float64Array))
    {
        for (var k=0;k<a.length;k++)
        {
            c[k] = [];
        }
    }
    
    Variable.copy(a, c);
    
    if (a.length>0 && (a[0].constructor===Array || a[0].constructor===Float64Array))
    {
        c[k].nbLevels = 0;
        c[k].width = a.width;
        c[k].height = a.height;
    }
    
    if ("nbLevels" in a) c.nbLevels = a.nbLevels;
    if ("width" in a) c.width = a.width;
    if ("height" in a) c.height = a.height;
    if ("category" in a) c.category = a.category;
    if ("name" in a) c.name = a.name;
    if ("description" in a) c.description = a.description;
    if ("units" in a) c.units = a.units;
    if ("verticalPosition" in a) c.verticalPosition = a.verticalPosition;
    if ("levels" in a) c.levels = a.levels;
    if ("number" in a) c.number = a.number;
    if ("offsetx" in a) c.offsetx = a.offsetx;
    if ("offsety" in a) c.offsety = a.offsety;
    if ("scale" in a) c.scale = a.scale;
    if ("latitudes" in a) c.latitudes = a.latitudes;
    if ("longitudes" in a) c.longitudes = a.longitudes;
    return c;
}

/**
 * 
 * @param {type} a
 * @param {type} v
 * @returns {undefined}
 */
Variable.init = function(a, v)
{
    if (a.length>0 && (a[0].constructor===Array || a[0].constructor===Float64Array))
    {
        for (var k=0;k<a.length;k++)
        {
            for(var i=0;i<a[k].length;i++)
            {
                a[k][i] = v;
            }
        }
    }
    else
    {
        for(var i=0;i<a.length;i++)
        {
            a[i] = v;
        }       
    }
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
    if (x.length>0 && (x[0].constructor===Array || x[0].constructor===Float64Array) )
    {    
        for (var k=0;k<x.length;k++)
        {
            nb = x[k].length;
            for(var i=0;i<nb;i++)
            {
                var b = y[k][i];
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
 * Calcule la somme de deux variables élément par élément
 * @param {type} x
 * @param {type} y
 * @param {type} res variable résultat
 */
Variable.mul = function(x, y, res)
{
    var nb;
    if (x.length>0 && (x[0].constructor===Array || x[0].constructor===Float64Array) )
    {    
        for (var k=0;k<x.length;k++)
        {
            nb = x[k].length;
            for(var i=0;i<nb;i++)
            {
                var b = y[k][i];
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
 * Opérateur pour calculer A + B * C
 * @param {type} a variable
 * @param {type} b variable
 * @param {type} c constante
 * @param {type} res résultat
 * @returns {undefined}
 */
Variable.a_bc = function(a, b, c, res)
{
    if (a.length>0 && (a[0].constructor===Array || a[0].constructor===Float64Array) )
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
    else
    {
        Variable.a_bc2d(a, b, c, res);
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
    if (x.length>0 && (x[0].constructor===Array || x[0].constructor===Float64Array))
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
 * Calcule le produit d'une variable par une constante
 * @param {type} x 
 * @param {type} c
 * @param {type} res variable résultat
 */
Variable.mulConst = function(x, c, res)
{
    var nb;
    if (x.length>0 && (x[0].constructor===Array || x[0].constructor===Float64Array))
    {    
        for (var k=0;k<x.length;k++)
        {
            nb = x[k].length;
            for(var i=0;i<nb;i++)
            {
                res[k][i] = x[k][i]*c;
            }
        }
    }
    else
    {
        nb = x.length;
        for(var i=0;i<nb;i++)
        {
            res[i] = x[i]*c;
        }        
    }
}

/**
 * Ajoute une constante
 * @param {type} x 
 * @param {type} c
 * @param {type} res variable résultat
 */
Variable.addConst = function(x, c, res)
{
    var nb;
    if (x.length>0 && (x[0].constructor===Array || x[0].constructor===Float64Array))
    {    
        for (var k=0;k<x.length;k++)
        {
            nb = x[k].length;
            for(var i=0;i<nb;i++)
            {
                res[k][i] = x[k][i]+c;
            }
        }
    }
    else
    {
        nb = x.length;
        for(var i=0;i<nb;i++)
        {
            res[i] = x[i]+c;
        }        
    }
}

/**
 * Produit par un terme de surface
 * @param {type} x
 * @param {type} y
 * @param {type} res
 * @returns {undefined}
 */
Variable.product_c = function(x, y, res)
{
    var nb;
    if (x.length>0 && (x[0].constructor===Array || x[0].constructor===Float64Array))
    {    
        for (var k=0;k<x.length;k++)
        {
            nb = x[k].length;
            for(var i=0;i<nb;i++)
            {
                res[k][i] = x[k][i]*y[i];
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

/**
 * Calcule la valeur moyenne des éléments de la variable
 * @param {type} x
 * @returns {Number}
 */
Variable.mean = function(x)
{
    var s = 0;
    var n = 0;
    var nb;
    if (x.length>0 && (x[0].constructor===Array || x[0].constructor===Float64Array))
    {    
        for (var k=0;k<x.length;k++)
        {
            n+=x[k].length;
            nb = x[k].length;
            for(var i=0;i<nb;i++)
            {
                s += x[k][i];
            }
        }
    }
    else
    {
        n = nb = x.length;
        for(var i=0;i<nb;i++)
        {
            s += x[i];
        }        
    }
    return s / n;
}

/**
 * Test si la variable contient des valeurs non numériques ou null
 * @param {type} x
 * @returns {Boolean}
 */
Variable.containsBadValues = function(x)
{
    var nb;
    if (x.length>0 && (x[0].constructor===Array || x[0].constructor===Float64Array) )
    {    
        for (var k=0;k<x.length;k++)
        {
            nb = x[k].length;
            for(var i=0;i<nb;i++)
            {
                var b = y[k][i];
                if (isNaN(x[k][i]) || x[k][i]==null ) return true;
            }
        }
        return false;
    }
    else
    {
        nb = x.length;
        for(var i=0;i<nb;i++)
        {
            if (isNaN(x[i]) || x[i]==null ) return true;
        }
        return false;
    }
}
