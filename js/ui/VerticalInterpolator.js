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
 * Interpole les valeurs de z500 pour le modèle et inversement.
 * @returns {undefined}
 */
export var VerticalInterpolator = function ()
{  
    this.inputLevels = [];
    
    this.sigmaLevels = [];
    
    this.surfacePressure = [];
}

VerticalInterpolator.prototype.interp = function(vin, vout)
{
    var i = 0, j = 0;
    var p = 0;
    var pa, pb;
    var found = false;
    for (var k=0;k<this.sigmaLevels.length;k++)
    {
        for (var j=0;j<vout.height;j++)
        {
            for(var i=0;i<vout.width;i++)
            {
                p = this.sigmaLevels[k] * this.surfacePressure.get2(i,j);

                found = false;
                for (var l=1;l<this.inputLevels.length;l++)
                {
                    pa = this.inputLevels[l-1];
                    pb = this.inputLevels[l];
                    if (p>=pa && p<pb)
                    {                               
                        vout.set3(i, j, k, vin.get3(i,j,l-1)+(p-pa)*(vin.get3(i,j,l)-vin.get3(i,j,l-1))/(pb-pa));
                        found = true;
                        break;
                    }
                }
                if (!found)
                {
                    if (p<this.inputLevels[0])
                        vout.set3(i, j, k, vin.get3(i,j,0));
                    else
                        vout.set3(i, j, k, vin.get3(i,j,this.inputLevels.length-1));
                }
            }
        }
    }
}

VerticalInterpolator.prototype.modelToPressureLevel = function(vin, pressure, vout)
{
    var s, geop, sa, sb;
    var found = false;
    for (var j=0;j<vout.height;j++)
    {
        for(var i=0;i<vout.width;i++)
        {
            s = pressure / this.surfacePressure.get2(i,j);
            geop = 0;
            found = false;
            for (var z=1;z<vin.nbLevels;z++)
            {
                sa = this.sigmaLevels[z-1];
                sb = this.sigmaLevels[z];
                if (s>=sa && s<sb)
                {
                    geop = vin.get3(i,j,z-1)+(s-sa)*(vin.get3(i,j,z)-vin.get3(i,j,z-1))/(sb-sa);
                    found=true;
                    break;
                }
            }
            if (!found)
            {
                if (s<=this.sigmaLevels[0])
                    geop = vin.get3(i,j,0);
                else
                    geop = vin.get3(i,j,vin.nbLevels-1);
            }
            vout.set2(i, j, geop);
        }
    }
}