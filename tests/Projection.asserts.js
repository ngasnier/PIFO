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
import { Variable } from "../js/modeling/Variable.js";

var latLonDomain1 =
{
    "minLat": -90,
    "maxLat": 90,
    "minLon": 0,
    "maxLon": 359.5,
    "dlat": 0.5,
    "dlon": 0.5,
    "levels": [100, 15000, 35000, 50000, 65000, 85000, 92500, 100000],
    "preprocessDir" : "input"
};

var mercatorProjectionDomain = {
    "width": 111,
    "height": 72,
    "minLat":9,
    "maxLat":81,
    "minLon":-60,
    "maxLon":51
};

var outputDomain = {
    "minLat":9,
    "maxLat":81,
    "minLon":-60,
    "maxLon":51,
    "dlat": 1,
    "dlon": 1
};


test('projection mercator vers xy', () => {
    var projection = new MercatorProjection();
    var xy = projection.latLonToXY(0, 0);
    expect(xy).arrayBeCloseTo([0, 0]);
    
    xy = projection.latLonToXY(1, 1);
    expect(xy).arrayBeCloseTo([111194.9266, 111200.5724]);
});

test('projection mercator vers lat lon', () => {
    var projection = new MercatorProjection();
    var ll = projection.xyToLatLon(0, 0);
    expect(ll).arrayBeCloseTo([0, 0]);
    
    ll = projection.xyToLatLon(111194.9266, 111200.5724);
    expect(ll).arrayBeCloseTo([1, 1]);
});

test('projection mercator facteur echelle', () => {
    var projection = new MercatorProjection();
    var m = projection.scaleFactor(0, 0);
    expect(m).toBeCloseTo(1);
    
    m = projection.scaleFactor(45, 0);
    expect(m).toBeCloseTo(1.414213);
});

test('projection mercator interpolations', () => {
    var projection = new MercatorProjection();
    Object.assign(projection, mercatorProjectionDomain);
    
    var in_width = (latLonDomain1.maxLon-latLonDomain1.minLon)/latLonDomain1.dlon+1;
    var in_height = (latLonDomain1.maxLat-latLonDomain1.minLat)/latLonDomain1.dlat+1;
    
    var out_width = (outputDomain.maxLon-outputDomain.minLon)/outputDomain.dlon;
    var out_height = (outputDomain.maxLat-outputDomain.minLat)/outputDomain.dlat;
    
    var data_in = Variable.createVariable(1, in_width, in_height, false);
    var data_proj = Variable.createVariable(1, mercatorProjectionDomain.width, mercatorProjectionDomain.height, false);
    var data_out = Variable.createVariable(1, out_width, out_height, false);
    var i = 0;
    
    for (var lat=latLonDomain1.minLat;lat<=latLonDomain1.maxLat;lat+=latLonDomain1.dlat)
    {
        for (var lon=latLonDomain1.minLon;lon<=latLonDomain1.maxLon;lon+=latLonDomain1.dlon,i++)
        {
            data_in[i] = Math.sin(Math.PI*lat/180)+Math.cos(Math.PI*lon/180);
        }
    }
    
    var [dx, dy] = projection.getMeshSize();

    // ***************** TEST PROJECTION LAT/LON VERS DOMAINE *****************

    // *** Premier test sans offset
    projection.interpLatLonGridToDomain(latLonDomain1, data_in, data_proj, 0, 0, false, Variable.NUMBER_TYPE_SCALAR);
    // Validité de la valeur du coin haut gauche
    expect(data_proj[0]).toBeCloseTo(Math.sin(Math.PI*mercatorProjectionDomain.maxLat/180)+Math.cos(Math.PI*mercatorProjectionDomain.minLon/180), 5);   
    // Validité du coin haut droit
    var [x, y] = projection.latLonToXY(mercatorProjectionDomain.maxLat, mercatorProjectionDomain.maxLon);
    [lat, lon] = projection.xyToLatLon(x-dx, y);
    expect(data_proj[mercatorProjectionDomain.width-1]).toBeCloseTo(Math.sin(Math.PI*lat/180)+Math.cos(Math.PI*lon/180), 5);   
    // Validité du coin bas droit
    [x, y] = projection.latLonToXY(mercatorProjectionDomain.minLat, mercatorProjectionDomain.maxLon);
    [lat, lon] = projection.xyToLatLon(x-dx, y+dy);
    expect(data_proj[mercatorProjectionDomain.width*(mercatorProjectionDomain.height-1)+mercatorProjectionDomain.width-1]).toBeCloseTo(Math.sin(Math.PI*lat/180)+Math.cos(Math.PI*lon/180));
    // Validité du coin bas gauche
    [x, y] = projection.latLonToXY(mercatorProjectionDomain.minLat, mercatorProjectionDomain.minLon);
    [lat, lon] = projection.xyToLatLon(x, y+dy);
    expect(data_proj[mercatorProjectionDomain.width*(mercatorProjectionDomain.height-1)]).toBeCloseTo(Math.sin(Math.PI*lat/180)+Math.cos(Math.PI*lon/180));


    // *** Second test avec offset x
    projection.interpLatLonGridToDomain(latLonDomain1, data_in, data_proj, 1, 0, false, Variable.NUMBER_TYPE_SCALAR);
    // Validité de la valeur du coin haut gauche
    [x, y] = projection.latLonToXY(mercatorProjectionDomain.maxLat, mercatorProjectionDomain.minLon);
    [lat, lon] = projection.xyToLatLon(x+dx/2, y);
    expect(data_proj[0]).toBeCloseTo(Math.sin(Math.PI*lat/180)+Math.cos(Math.PI*lon/180), 3);
    // Validité du coin haut droit
    [x, y] = projection.latLonToXY(mercatorProjectionDomain.maxLat, mercatorProjectionDomain.maxLon);
    [lat, lon] = projection.xyToLatLon(x-dx/2, y);
    expect(data_proj[mercatorProjectionDomain.width-1]).toBeCloseTo(Math.sin(Math.PI*lat/180)+Math.cos(Math.PI*lon/180), 3);
    // Validité du coin bas droit
    [x, y] = projection.latLonToXY(mercatorProjectionDomain.minLat, mercatorProjectionDomain.maxLon);
    [lat, lon] = projection.xyToLatLon(x-dx/2, y+dy);
    expect(data_proj[mercatorProjectionDomain.width*(mercatorProjectionDomain.height-1)+mercatorProjectionDomain.width-1]).toBeCloseTo(Math.sin(Math.PI*lat/180)+Math.cos(Math.PI*lon/180));
    // Validité du coin bas gauche
    [x, y] = projection.latLonToXY(mercatorProjectionDomain.minLat, mercatorProjectionDomain.minLon);
    [lat, lon] = projection.xyToLatLon(x+dx/2, y+dy);
    expect(data_proj[mercatorProjectionDomain.width*(mercatorProjectionDomain.height-1)]).toBeCloseTo(Math.sin(Math.PI*lat/180)+Math.cos(Math.PI*lon/180));

    // *** Second test avec offset y
    projection.interpLatLonGridToDomain(latLonDomain1, data_in, data_proj, 0, 1, false, Variable.NUMBER_TYPE_SCALAR);
    // Validité de la valeur du coin haut gauche
    [x, y] = projection.latLonToXY(mercatorProjectionDomain.maxLat, mercatorProjectionDomain.minLon);
    [lat, lon] = projection.xyToLatLon(x, y-dy/2);
    expect(data_proj[0]).toBeCloseTo(Math.sin(Math.PI*lat/180)+Math.cos(Math.PI*lon/180), 3);   
    // Validité du coin haut droit
    [x, y] = projection.latLonToXY(mercatorProjectionDomain.maxLat, mercatorProjectionDomain.maxLon);
    [lat, lon] = projection.xyToLatLon(x-dx, y-dy/2);
    expect(data_proj[mercatorProjectionDomain.width-1]).toBeCloseTo(Math.sin(Math.PI*lat/180)+Math.cos(Math.PI*lon/180), 3);
    // Validité du coin bas droit
    [x, y] = projection.latLonToXY(mercatorProjectionDomain.minLat, mercatorProjectionDomain.maxLon);
    [lat, lon] = projection.xyToLatLon(x-dx, y+dy/2);
    expect(data_proj[mercatorProjectionDomain.width*(mercatorProjectionDomain.height-1)+mercatorProjectionDomain.width-1]).toBeCloseTo(Math.sin(Math.PI*lat/180)+Math.cos(Math.PI*lon/180));
    // Validité du coin bas gauche
    [x, y] = projection.latLonToXY(mercatorProjectionDomain.minLat, mercatorProjectionDomain.minLon);
    [lat, lon] = projection.xyToLatLon(x, y+dy/2);
    expect(data_proj[mercatorProjectionDomain.width*(mercatorProjectionDomain.height-1)]).toBeCloseTo(Math.sin(Math.PI*lat/180)+Math.cos(Math.PI*lon/180));

    // *** Test avec scaling
    projection.interpLatLonGridToDomain(latLonDomain1, data_in, data_proj, 0, 1, true, Variable.NUMBER_TYPE_V_VECTOR);
    [x, y] = projection.latLonToXY(mercatorProjectionDomain.maxLat, mercatorProjectionDomain.minLon);
    [lat, lon] = projection.xyToLatLon(x, y);
    var m = projection.scaleFactor(lat, lon);
    [lat, lon] = projection.xyToLatLon(x, y-dy/2);
    expect(data_proj[0]).toBeCloseTo((Math.sin(Math.PI*lat/180)+Math.cos(Math.PI*lon/180))/m, 5);
    
    
    // ***************** TEST PROJECTION DOMAINE VER LAT/LON *****************
    // Commence par créer une donnée projetée (ce code est validé plus haut)
    projection.interpLatLonGridToDomain(latLonDomain1, data_in, data_proj, 0, 0, false, Variable.NUMBER_TYPE_SCALAR);
    
    // *** Projection sans 
    projection.interpDomainToLatLon(outputDomain, data_proj, data_out, 0, 0, false, Variable.NUMBER_TYPE_SCALAR);
    // Validité du coin haut gauche
    lat = outputDomain.maxLat;
    lon = outputDomain.minLon;
    expect(data_out[0]).toBeCloseTo(Math.sin(Math.PI*lat/180)+Math.cos(Math.PI*lon/180), 5);    
    // Validité du coin haut droit
    lat = outputDomain.maxLat;
    lon = outputDomain.maxLon-outputDomain.dlon; // faudrait faire par rapport à x, y mais sur cette proj ok
    expect(data_out[out_width-1]).toBeCloseTo(Math.sin(Math.PI*lat/180)+Math.cos(Math.PI*lon/180), 3);
    // Validité du coin bas droit - les tableaux doivent correspondre
    expect(data_out[out_width*out_height-1]).toBeCloseTo(data_proj[mercatorProjectionDomain.width*mercatorProjectionDomain.height-1], 3);
    // Validité du coin bas gauche - les tableaux doivent correspondre
    expect(data_out[out_width*(out_height-1)]).toBeCloseTo(data_proj[mercatorProjectionDomain.width*(mercatorProjectionDomain.height-1)], 3);
});

test('projection mercator calcLatitutesLongitudes', () => {
   var projection = new MercatorProjection();   
   Object.assign(projection, mercatorProjectionDomain);
   var latitudes = Variable.createVariable(1, mercatorProjectionDomain.width, mercatorProjectionDomain.height, false);
   var longitudes = Variable.createVariable(1, mercatorProjectionDomain.width, mercatorProjectionDomain.height, false);
   var [dx, dy] = projection.getMeshSize();
   
   projection.calcLatitudesLongitudes(0, 0, latitudes, longitudes);
   // Coin haut gauche
   expect(latitudes[0]).toBeCloseTo(mercatorProjectionDomain.maxLat);
   expect(longitudes[0]).toBeCloseTo(mercatorProjectionDomain.minLon);
   // Coin haut droit
   expect(latitudes[mercatorProjectionDomain.width-1]).toBeCloseTo(mercatorProjectionDomain.maxLat);
   expect(longitudes[mercatorProjectionDomain.width-1]).toBeCloseTo(mercatorProjectionDomain.maxLon-1);
   // Coin bas droit
   var [x, y] = projection.latLonToXY(mercatorProjectionDomain.minLat, mercatorProjectionDomain.maxLon);
   var [lat, lon] = projection.xyToLatLon(x-dx, y+dy);
   expect(latitudes[mercatorProjectionDomain.width*mercatorProjectionDomain.height-1]).toBeCloseTo(lat);
   expect(longitudes[mercatorProjectionDomain.width*mercatorProjectionDomain.height-1]).toBeCloseTo(lon);
});