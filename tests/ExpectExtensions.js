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

function compareArrayBeCloseTo(received, check)
{
    var pass = true;
    pass &= (received.constructor==check.constructor);
    pass &= (received.constructor==Array 
            || received.constructor===Int8Array
            || received.constructor===Uint8Array
            || received.constructor===Uint8ClampedArray
            || received.constructor===Int16Array
            || received.constructor===Uint16Array
            || received.constructor===Int32Array
            || received.constructor===Uint32Array
            || received.constructor===Float32Array
            || received.constructor===Float64Array);


    for (var i=0;i<check.length;i++)
    {
        if (check[i].constructor==Array 
            || check[i].constructor===Int8Array
            || check[i].constructor===Uint8Array
            || check[i].constructor===Uint8ClampedArray
            || check[i].constructor===Int16Array
            || check[i].constructor===Uint16Array
            || check[i].constructor===Int32Array
            || check[i].constructor===Uint32Array
            || check[i].constructor===Float32Array
            || check[i].constructor===Float64Array)
        {
            pass &= compareArrayBeCloseTo(received[i], check[i]);
        }
        else 
        {
            pass &= (Math.abs(received[i]-check[i])<=0.001);
        }
    }
    return pass;    
}

expect.extend({
    arrayBeCloseTo(received, check) {
        var pass = compareArrayBeCloseTo(received, check);
        if (pass) 
        {
            return {
                message: () =>
                    `expected ${received} to be close to ${check}`,
                pass: true,
            };
        } 
        else 
        {
            return {
                message: () =>
                  `expected ${received} to be close to ${check}`,
                pass: false,
            };
        }
    },
});

