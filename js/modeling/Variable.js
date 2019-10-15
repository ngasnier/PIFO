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
 *   <li>longitudes : longitude des points de la variable</li>
 *   <li>productName : nom du modèle ou de la donnée source de la variable</li>
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
     * @param nblev
     * @param width
     * @param height
     * @returns {undefined}
     */
    constructor(nblev, width, height)
    {
        this.nbLevels = nblev;
        this.width = width;
        this.height = height;
        if (this.nbLevels==0) this.nbLevels=1;
        var buffer = new ArrayBuffer(this.width*this.height*this.nbLevels * 8);
        this.data = new Float64Array(buffer);
    }
    
    idx2(i, j)
    {
        return i + j*this.width;
    }
    
    idx3(i, j, k)
    {
        return i*this.nbLevels + j*this.width*this.nbLevels + k;
    }
    
    get2(i, j)
    {
        return this.data[this.idx2(i, j)];
    }
    
    get3(i, j, k)
    {
        return this.data[this.idx3(i, j, k)];
    }
    
    set2(i, j, v)
    {
        this.data[this.idx2(i, j)] = v;
    }
    
    set3(i, j, k, v)
    {
        this.data[this.idx3(i, j, k)] = v;
    }
    
    setLevel(k, v)
    {
        var x = this.data;
        var idx3 = 0;
        var idx2 = 0;
        for(var j=0;j<this.height;j++)
        {
            for(var i=0;i<this.width;i++)
            {
                idx3 = this.idx3(i, j, k);
                idx2 = this.idx2(i, j);
                x[idx3] = v[idx2];
            }
        }
    }
    
    getLevel(k)
    {
        var buffer = new ArrayBuffer(this.width*this.height * 8);
        var v = new Float64Array(buffer);
        var x = this.data;
        var idx3 = 0;
        var idx2 = 0;
        for(var j=0;j<this.height;j++)
        {
            for(var i=0;i<this.width;i++)
            {
                idx3 = this.idx3(i, j, k);
                idx2 = this.idx2(i, j);
                v[idx2] = x[idx3];
                
            }
        }
        return v;
    }
    
    getLevelAsVariable(k)
    {
        var variable = new Variable(1, this.width, this.height);
        var v = variable.data;
        var x = this.data;
        var idx3 = 0;
        var idx2 = 0;
        for(var j=0;j<this.height;j++)
        {
            for(var i=0;i<this.width;i++)
            {
                idx3 = this.idx3(i, j, k);
                idx2 = this.idx2(i, j);
                v[idx2] = x[idx3];                
            }
        }
        return variable;
    }

    /**
     * Copie les valeurs d'une variable dans une autre.
     * @param {type} b destination
     * @returns {undefined}
     */
    copy(b)
    {
        var da = this.data;
        var db = b.data;
        for(var i=0;i<da.length;i++)
        {
            db[i] = da[i];
        }       
    }

    /**
     * 
     * @returns {Array|Variable.clone.c}
     */
    clone()
    {
        var c = new Variable(this.nbLev, this.width, this.height);
        this.copy(c);

        var a = this;
        if ("nbLevels" in a) c.nbLevels = a.nbLevels;
        if ("width" in a) c.width = a.width;
        if ("height" in a) c.height = a.height;
        if ("latitudes" in a) c.latitudes = a.latitudes;
        if ("longitudes" in a) c.longitudes = a.longitudes;
        a.copyMetadata(c);
        return c;
    }

    /**
     * 
     * @param {type} c
     * @returns {undefined}
     */
    copyMetadata(c)
    {
        var a = this;
        if ("name" in a) c.name = a.name;
        if ("description" in a) c.description = a.description;
        if ("category" in a) c.category = a.category;
        if ("units" in a) c.units = a.units;
        if ("verticalPosition" in a) c.verticalPosition = a.verticalPosition;
        if ("number" in a) c.number = a.number;
        if ("offsetx" in a) c.offsetx = a.offsetx;
        if ("offsety" in a) c.offsety = a.offsety;
        if ("scale" in a) c.scale = a.scale;
        if ("initDate" in a) c.initDate = a.initDate;
        if ("time" in a) c.time = a.time;
        if ("levels" in a) c.levels = a.levels;
        if ("productName" in a) c.productName = a.productName;
    }

    /**
     * 
     * @param {type} v
     * @returns {undefined}
     */
    init(v)
    {
        var a = this.data;
        var nb = this.nbLevels===0?this.width*this.height:this.width*this.height*this.nbLevels;
        for(var i=0;i<nb;i++)
        {
            a[i] = v;
        }
    }

    /**
     * Calcule la valeur moyenne des éléments de la variable
     * @returns {Number}
     */
    mean()
    {
        var s = 0;
        var n = 0;
        var x = this.data;
        var nb;
        n = nb = x.length;
        for(var i=0;i<nb;i++)
        {
            s += x[i];
        }        
        return s / n;
    }

    /**
     * Maximum de la variable.
     * 
     * @returns {Number|Number.MIN_VALUE|Variable.max.x}
     */
    max()
    {
        var m = Number.MIN_VALUE;
        var x = this.data;
        var nb = x.length;
        for(var i=0;i<nb;i++)
        {
            if (x[i]>m) m=x[i];
        }        
        return m;
    }

    /**
     * Minimum de la variable
     * @returns {Number|Number.MAX_VALUE|Number.MIN_VALUE|Variable.min.x}
     */
    min()
    {
        var m = Number.MAX_VALUE;
        var x = data;
        var nb = x.length;
        for(var i=0;i<nb;i++)
        {
            if (x[i]<m) m=x[i];
        }        
        return m;
    }

    /**
     * Test si la variable contient des valeurs non numériques ou null
     * @returns {Boolean}
     */
    containsBadValues()
    {
        var x = this.data;
        var nb = x.length;
        for(var i=0;i<nb;i++)
        {
            if (isNaN(x[i]) || x[i]==null ) return true;
        }
        return false;
    }
}

/**
 * Alloue et initialise à zero une variable.
 * @param {type} nblev 1 = variable 2D, >1 = variable 3D
 * @returns {undefined} la variable
 */
Variable.createVariable = function(nblev, width, height)
{
    return new Variable(nblev, width, height);
}

/**
 * Copie les valeurs d'une variable dans une autre.
 * @param {type} a source
 * @param {type} b destination
 * @returns {undefined}
 */
Variable.copy = function(a, b)
{
    a.copy(b);
}

/**
 * 
 * @param {type} a
 * @returns {Array|Variable.clone.c}
 */
Variable.clone = function(a)
{
    return a.clone();
}


/**
 * 
 * @param {type} a
 * @param {type} v
 * @returns {undefined}
 */
Variable.init = function(a, v)
{
    a.init(v);
}


// ********************************************************************
// OPERATEURS DE CALCUL
// ********************************************************************

/**
 * Calcule la somme de deux variables élément par élément
 * @param {type} a
 * @param {type} b
 * @param {type} dest variable résultat
 */
Variable.sum = function(a, b, dest)
{
    var nb = a.data.length;
    var x = a.data;
    var y = b.data;
    var res = dest.data;
    //console.log(nb, a.width);
    for(var i=0;i<nb;i++)
    {
        res[i] = x[i]+y[i];
    }        
}

/**
 * Calcule la somme de deux variables élément par élément
 * @param {type} a
 * @param {type} b
 * @param {type} dest variable résultat
 */
Variable.mul = function(a, b, dest)
{
    var nb = a.data.length;
    var x = a.data;
    var y = b.data;
    var res = dest.data;
    for(var i=0;i<nb;i++)
    {
        res[i] = x[i]*y[i];
    }        
}


/**
 * Opérateur pour calculer A + B * C sur variable 2D
 * @param {type} a variable
 * @param {type} b variable
 * @param {type} c constante
 * @param {type} dest résultat
 * @returns {undefined}
 */
Variable.a_bc = function(a, b, c, dest)
{
    var nb = a.data.length;
    var x = a.data;
    var y = b.data;
    var z = dest.data;
    var res = dest.data;
    for(var i=0;i<nb;i++)
    {
        z[i] = x[i]+c*y[i];
    }
}


/**
 * Calcule le produit de deux variables élément par élément.
 * @param {type} a
 * @param {type} b
 * @param {type} dest variable résultat
*/
Variable.product = function(a, b, dest)
{
    var nb = a.data.length;
    var x = a.data;
    var y = b.data;
    var res = dest.data;
    for(var i=0;i<nb;i++)
    {
        res[i] = x[i]*y[i];
    }        
}

/**
 * Calcule le produit d'une variable par une constante
 * @param {type} a 
 * @param {type} c
 * @param {type} dest variable résultat
 */
Variable.mulConst = function(a, c, dest)
{
    var nb = a.data.length;
    var x = a.data;
    var res = dest.data;
    for(var i=0;i<nb;i++)
    {
        res[i] = x[i]*c;
    }        
}

/**
 * Ajoute une constante
 * @param {type} a 
 * @param {type} c
 * @param {type} dest variable résultat
 */
Variable.addConst = function(a, c, dest)
{
    var nb = a.data.length;
    var x = a.data;
    var res = dest.data;
    for(var i=0;i<nb;i++)
    {
        res[i] = x[i]+c;
    }        
}

/**
 * Produit par un terme de surface
 * @param {type} x
 * @param {type} y
 * @param {type} res
 * @returns {undefined}
 */
Variable.product_c = function(a, b, dest)
{
    var x = a.data;
    var y = b.data;
    var res = dest.data;
    var width = a.width;
    var height = a.height;
    var nbLevels = a.nbLevels;
    var idx = 0;
    var idx2 = function (i, j)
    {
        return i+j*width;
    };    
    var idx3 = function (i, j, k)
    {
        return i+j*width+k*(width+height);
    };
    if (a.nbLevels>1)
    {    
        for (var k=0;k<nbLevels;k++)
        {
            for(var j=0;j<height;j++)
            {
                for(var i=0;i<width;i++)
                {
                    idx = idx3(i, j, k);
                    res[idx] = x[idx]*y[idx2(i, j, k)];
                }
            }
        }
    }
    else
    {
        Variable.product(a, b, res);
    }
}


/**
 * Permute les valeurs de deux variables 2D.
 * @param {type} a
 * @param {type} b
 */
Variable.swap2d = function(a, b)
{
    var nb = a.data.length;
    var x = a.data;
    var y = b.data;
    var n;
    for(var i=0;i<nb;i++)
    {
        n = x[i];
        x[i] = y[i];
        y[i] = n;
    }
}

/**
 * Calcule la valeur moyenne des éléments de la variable
 * @param {type} x
 * @returns {Number}
 */
Variable.mean = function(x)
{
    return x.mean();
}

/**
 * Maximum de la variable.
 * 
 * @param {type} x
 * @returns {Number|Number.MIN_VALUE|Variable.max.x}
 */
Variable.max = function(x)
{
    return x.max();
}

/**
 * Minimum de la variable
 * @param {type} x
 * @returns {Number|Number.MAX_VALUE|Number.MIN_VALUE|Variable.min.x}
 */
Variable.min = function(x)
{
    return x.min();
}

/**
 * Test si la variable contient des valeurs non numériques ou null
 * @param {type} x
 * @returns {Boolean}
 */
Variable.containsBadValues = function(x)
{
    return x.containsBadValues();
}
