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

import { MercatorProjection } from "../js/modeling/MercatorProjection.js";
import { Model } from "../js/modeling/Model.js";

test('projection mercator vers xy', () => {
    var projection = new MercatorProjection(Model.Rterre);
    var xy = projection.latLonToXY(0, 0);
    expect(xy).arrayBeCloseTo([0, 0]);
    
    xy = projection.latLonToXY(1, 1);
    expect(xy).arrayBeCloseTo([111194.9266, 111200.5724]);
});

test('projection mercator vers lat lon', () => {
    var projection = new MercatorProjection(Model.Rterre);
    var ll = projection.xyToLatLon(0, 0);
    expect(ll).arrayBeCloseTo([0, 0]);
    
    ll = projection.xyToLatLon(111194.9266, 111200.5724);
    expect(ll).arrayBeCloseTo([1, 1]);
});

test('projection mercator facteur echelle', () => {
    var projection = new MercatorProjection(Model.Rterre);
    var m = projection.scaleFactor(0, 0);
    expect(m).toBeCloseTo(1);
    
    m = projection.scaleFactor(45, 0);
    expect(m).toBeCloseTo(1.414213);
});
