/* 
 * Copyright (C) 2019 nicolas
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

import { Variable } from "../modeling/Variable.js";

export var HumpDisturbance = function ()
{   
    this.width = 40;
    this.height = 40;
}

HumpDisturbance.prototype.getInitialU = function()
{
    return Variable.createVariable(1, this.width, this.height, false);
}

HumpDisturbance.prototype.getInitialV = function()
{
    return Variable.createVariable(1, this.width, this.height, false);
}

HumpDisturbance.prototype.getInitialPhi = function()
{
    var phi = Variable.createVariable(1, this.width, this.height, false);
    Variable.init(phi, 15000);
    
    phi[this.width/2+2+(this.height/2)*this.width] += 2000;
    phi[this.width/2+(this.height/2+2)*this.width] += 2000;
    phi[this.width/2-1+(this.height/2+1)*this.width] += 2000;
    phi[this.width/2+1+(this.height/2+1)*this.width] += 2000;

    phi[this.width/2+1+(this.height/2)*this.width] += 5000;
    phi[this.width/2+(this.height/2+1)*this.width] += 5000;
    
    phi[this.width/2+(this.height/2)*this.width] += 10000;
    
    phi[this.width/2-1+(this.height/2)*this.width] += 5000;
    phi[this.width/2+(this.height/2-1)*this.width] += 5000;
    
    phi[this.width/2-2+(this.height/2)*this.width] += 2000;
    phi[this.width/2+(this.height/2-2)*this.width] += 2000;
    phi[this.width/2-1+(this.height/2-1)*this.width] += 2000;
    phi[this.width/2+1+(this.height/2-1)*this.width] += 2000;

    
    return phi;
}