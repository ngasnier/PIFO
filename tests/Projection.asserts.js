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
import { PolarStereographicProjection } from "../js/modeling/PolarStereographicProjection.js";
import { LatLonDomain } from "../js/modeling/LatLonDomain.js";
import { Model } from "../js/modeling/Model.js";
import { Variable } from "../js/modeling/Variable.js";
import { Grid } from "../js/modeling/Grid.js";

var latLonDomain = 
{
    "minLat": -90,
    "maxLat": 90,
    "minLon": 0,
    "maxLon": 359.5,
    "dlat": 0.5,
    "dlon": 0.5,
    "cyclic":true,
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

var polarProjectionDomain = {
            "class": "PolarStereographicProjection",
            "width": 72,
            "height": 111,
            "horizontalStaggering": "C",
            "xmin":0,
            "ymin":-10000000,
            "xmax":11000000,
            "ymax":10000000,
            "regrid":"bilinear"
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
       
    var latLonDomain1 = new LatLonDomain();
    Object.assign(latLonDomain1, latLonDomain);
    var in_width = (latLonDomain1.maxLon-latLonDomain1.minLon)/latLonDomain1.dlon+1;
    var in_height = (latLonDomain1.maxLat-latLonDomain1.minLat)/latLonDomain1.dlat+1;
    
    var out_width = (outputDomain.maxLon-outputDomain.minLon)/outputDomain.dlon;
    var out_height = (outputDomain.maxLat-outputDomain.minLat)/outputDomain.dlat;
    
    var data_in = Variable.createVariable(0, in_width, in_height, false);
    var data_proj = Variable.createVariable(0, mercatorProjectionDomain.width, mercatorProjectionDomain.height, false);
    var data_out = Variable.createVariable(0, out_width, out_height, false);
    var i = 0;
    
    for (var lat=latLonDomain1.minLat;lat<=latLonDomain1.maxLat;lat+=latLonDomain1.dlat)
    {
        for (var lon=latLonDomain1.minLon;lon<=latLonDomain1.maxLon;lon+=latLonDomain1.dlon,i++)
        {
            data_in.data[i] = Math.sin(Math.PI*lat/180)+Math.cos(Math.PI*lon/180);
        }
    }
    
    var [dx, dy] = projection.getMeshSize();

    // ***************** TEST PROJECTION LAT/LON VERS DOMAINE *****************

    // *** Premier test sans offset
    projection.interpLatLonGridToDomain(latLonDomain1, data_in, data_proj, 0, 0, false, Variable.NUMBER_TYPE_SCALAR);
    // Validité de la valeur du coin haut gauche
    expect(data_proj.get2(0, 0)).toBeCloseTo(Math.sin(Math.PI*mercatorProjectionDomain.maxLat/180)+Math.cos(Math.PI*mercatorProjectionDomain.minLon/180), 5);   
    // Validité du coin haut droit
    var [x, y] = projection.latLonToXY(mercatorProjectionDomain.maxLat, mercatorProjectionDomain.maxLon);
    [lat, lon] = projection.xyToLatLon(x-dx, y);
    expect(data_proj.get2(mercatorProjectionDomain.width-1, 0)).toBeCloseTo(Math.sin(Math.PI*lat/180)+Math.cos(Math.PI*lon/180), 5);   
    // Validité du coin bas droit
    [x, y] = projection.latLonToXY(mercatorProjectionDomain.minLat, mercatorProjectionDomain.maxLon);
    [lat, lon] = projection.xyToLatLon(x-dx, y+dy);
    expect(data_proj.get2(mercatorProjectionDomain.width-1, mercatorProjectionDomain.height-1)).toBeCloseTo(Math.sin(Math.PI*lat/180)+Math.cos(Math.PI*lon/180));
    // Validité du coin bas gauche
    [x, y] = projection.latLonToXY(mercatorProjectionDomain.minLat, mercatorProjectionDomain.minLon);
    [lat, lon] = projection.xyToLatLon(x, y+dy);
    expect(data_proj.get2(0, mercatorProjectionDomain.height-1)).toBeCloseTo(Math.sin(Math.PI*lat/180)+Math.cos(Math.PI*lon/180));


    // *** Second test avec offset x
    projection.interpLatLonGridToDomain(latLonDomain1, data_in, data_proj, 1, 0, false, Variable.NUMBER_TYPE_SCALAR);
    // Validité de la valeur du coin haut gauche
    [x, y] = projection.latLonToXY(mercatorProjectionDomain.maxLat, mercatorProjectionDomain.minLon);
    [lat, lon] = projection.xyToLatLon(x+dx/2, y);
    expect(data_proj.get2(0, 0)).toBeCloseTo(Math.sin(Math.PI*lat/180)+Math.cos(Math.PI*lon/180), 3);
    // Validité du coin haut droit
    [x, y] = projection.latLonToXY(mercatorProjectionDomain.maxLat, mercatorProjectionDomain.maxLon);
    [lat, lon] = projection.xyToLatLon(x-dx/2, y);
    expect(data_proj.get2(mercatorProjectionDomain.width-1, 0)).toBeCloseTo(Math.sin(Math.PI*lat/180)+Math.cos(Math.PI*lon/180), 3);
    // Validité du coin bas droit
    [x, y] = projection.latLonToXY(mercatorProjectionDomain.minLat, mercatorProjectionDomain.maxLon);
    [lat, lon] = projection.xyToLatLon(x-dx/2, y+dy);
    expect(data_proj.get2(mercatorProjectionDomain.width-1, mercatorProjectionDomain.height-1)).toBeCloseTo(Math.sin(Math.PI*lat/180)+Math.cos(Math.PI*lon/180));
    // Validité du coin bas gauche
    [x, y] = projection.latLonToXY(mercatorProjectionDomain.minLat, mercatorProjectionDomain.minLon);
    [lat, lon] = projection.xyToLatLon(x+dx/2, y+dy);
    expect(data_proj.get2(0, mercatorProjectionDomain.height-1)).toBeCloseTo(Math.sin(Math.PI*lat/180)+Math.cos(Math.PI*lon/180));

    // *** Second test avec offset y
    projection.interpLatLonGridToDomain(latLonDomain1, data_in, data_proj, 0, 1, false, Variable.NUMBER_TYPE_SCALAR);
    // Validité de la valeur du coin haut gauche
    [x, y] = projection.latLonToXY(mercatorProjectionDomain.maxLat, mercatorProjectionDomain.minLon);
    [lat, lon] = projection.xyToLatLon(x, y-dy/2);
    expect(data_proj.get2(0, 0)).toBeCloseTo(Math.sin(Math.PI*lat/180)+Math.cos(Math.PI*lon/180), 3);   
    // Validité du coin haut droit
    [x, y] = projection.latLonToXY(mercatorProjectionDomain.maxLat, mercatorProjectionDomain.maxLon);
    [lat, lon] = projection.xyToLatLon(x-dx, y-dy/2);
    expect(data_proj.get2(mercatorProjectionDomain.width-1, 0)).toBeCloseTo(Math.sin(Math.PI*lat/180)+Math.cos(Math.PI*lon/180), 3);
    // Validité du coin bas droit
    [x, y] = projection.latLonToXY(mercatorProjectionDomain.minLat, mercatorProjectionDomain.maxLon);
    [lat, lon] = projection.xyToLatLon(x-dx, y+dy/2);
    expect(data_proj.get2(mercatorProjectionDomain.width-1, mercatorProjectionDomain.height-1)).toBeCloseTo(Math.sin(Math.PI*lat/180)+Math.cos(Math.PI*lon/180));
    // Validité du coin bas gauche
    [x, y] = projection.latLonToXY(mercatorProjectionDomain.minLat, mercatorProjectionDomain.minLon);
    [lat, lon] = projection.xyToLatLon(x, y+dy/2);
    expect(data_proj.get2(0, mercatorProjectionDomain.height-1)).toBeCloseTo(Math.sin(Math.PI*lat/180)+Math.cos(Math.PI*lon/180));

    // *** Test avec scaling
    projection.interpLatLonGridToDomain(latLonDomain1, data_in, data_proj, 0, 1, true, Variable.NUMBER_TYPE_V_VECTOR);
    [x, y] = projection.latLonToXY(mercatorProjectionDomain.maxLat, mercatorProjectionDomain.minLon);
    [lat, lon] = projection.xyToLatLon(x, y);
    var m = projection.scaleFactor(lat, lon);
    [lat, lon] = projection.xyToLatLon(x, y-dy/2);
    expect(data_proj.get2(0,0)).toBeCloseTo((Math.sin(Math.PI*lat/180)+Math.cos(Math.PI*lon/180))/m, 5);
    
    
    // ***************** TEST PROJECTION DOMAINE VER LAT/LON *****************
    // Commence par créer une donnée projetée (ce code est validé plus haut)
    projection.interpLatLonGridToDomain(latLonDomain1, data_in, data_proj, 0, 0, false, Variable.NUMBER_TYPE_SCALAR);
    // *** Projection sans 
    var outputDomain1 = new LatLonDomain();
    Object.assign(outputDomain1, outputDomain);
    projection.interpDomainToLatLon(outputDomain1, data_proj, data_out, 0, 0, false, Variable.NUMBER_TYPE_SCALAR);
    // Validité du coin haut gauche
    lat = outputDomain1.maxLat;
    lon = outputDomain1.minLon;
    expect(data_out.get2(0, 0)).toBeCloseTo(Math.sin(Math.PI*lat/180)+Math.cos(Math.PI*lon/180), 5);
    // Validité du coin haut droit
    lat = outputDomain1.maxLat;
    lon = outputDomain1.maxLon-outputDomain1.dlon; // faudrait faire par rapport à x, y mais sur cette proj ok
    expect(data_out.get2(out_width-1,0)).toBeCloseTo(Math.sin(Math.PI*lat/180)+Math.cos(Math.PI*lon/180), 3);
    // Validité du coin bas droit - les tableaux doivent correspondre
    expect(data_out.get2(out_width-1, out_height-1)).toBeCloseTo(data_proj.get2(mercatorProjectionDomain.width-1, mercatorProjectionDomain.height-1), 3);
    // Validité du coin bas gauche - les tableaux doivent correspondre
    expect(data_out.get2(0, out_height-1)).toBeCloseTo(data_proj.get2(0, mercatorProjectionDomain.height-1), 3);
});

test('projection mercator calcLatitutesLongitudes', () => {
    var projection = new MercatorProjection();   
    Object.assign(projection, mercatorProjectionDomain);
    var latitudes = Variable.createVariable(1, mercatorProjectionDomain.width, mercatorProjectionDomain.height, false);
    var longitudes = Variable.createVariable(1, mercatorProjectionDomain.width, mercatorProjectionDomain.height, false);
    var [dx, dy] = projection.getMeshSize();
   
    projection.calcLatitudesLongitudes(0, 0, latitudes, longitudes);
    // Coin haut gauche
    expect(latitudes.get2(0,0)).toBeCloseTo(mercatorProjectionDomain.maxLat);
    expect(longitudes.get2(0,0)).toBeCloseTo(mercatorProjectionDomain.minLon);
    // Coin haut droit
    expect(latitudes.get2(mercatorProjectionDomain.width-1,0)).toBeCloseTo(mercatorProjectionDomain.maxLat);
    expect(longitudes.get2(mercatorProjectionDomain.width-1,0)).toBeCloseTo(mercatorProjectionDomain.maxLon-1);
    // Coin bas droit
    var [x, y] = projection.latLonToXY(mercatorProjectionDomain.minLat, mercatorProjectionDomain.maxLon);
    var [lat, lon] = projection.xyToLatLon(x-dx, y+dy);
    expect(latitudes.get2(mercatorProjectionDomain.width-1, mercatorProjectionDomain.height-1)).toBeCloseTo(lat);
    expect(longitudes.get2(mercatorProjectionDomain.width-1, mercatorProjectionDomain.height-1)).toBeCloseTo(lon);
});

test('projection polaire', () => {
    var projection = new PolarStereographicProjection();
    Object.assign(projection, polarProjectionDomain);
    
    var m = projection.scaleFactor(0, 0);
    expect(m).toBeCloseTo(2);
    
    var xy = projection.latLonToXY(9, 0);
    var latlon = projection.xyToLatLon(xy[0], xy[1]);
    expect(latlon).arrayBeCloseTo([9, 0]);
    
    var latitudes = Variable.createVariable(1, projection.width, projection.height, false);
    var longitudes = Variable.createVariable(1, projection.width, projection.height, false);
    var [dx, dy] = projection.getMeshSize();      
    projection.calcLatitudesLongitudes(0, 0, latitudes, longitudes);
    var declinations = projection.getDeclinations(latitudes, longitudes);
    expect(declinations.containsBadValues()).toBe(false);
});

test('regridding', ()=> {
    var grid = new Grid();    
    var x_in = [0, 0.5, 1, 1.5];
    var x_out = [-0.25, 0.25, 0.75, 1.25, 1.75];
    var tab_i_in1 = [];
    var tab_i_in2 = [];
    var tab_x_adj1 = [];
    var tab_x_adj2 = [];
    
    grid.optimizeGridIndices(x_in, x_out, true, tab_i_in1, tab_i_in2, tab_x_adj1, tab_x_adj2);

    //console.log(x_in, x_out, tab_i_in1, tab_i_in2, tab_x_adj1, tab_x_adj2);
   
    expect(tab_i_in1).arrayBeCloseTo([ 3, 0, 1, 2, 3 ]);
    expect(tab_i_in2).arrayBeCloseTo([ 0, 1, 2, 3, 0 ]);
    expect(tab_x_adj1).arrayBeCloseTo([ -0.5, 0, 0.5, 1, 1.5 ]);
    expect(tab_x_adj2).arrayBeCloseTo([ 0, 0.5, 1, 1.5, 2 ]);
    
    
    x_in = [1.5, 1, 0.5, 0];
    x_out = [1.75, 1.25, 0.75, 0.25, -0.25];
    grid.optimizeGridIndices(x_in, x_out, true, tab_i_in1, tab_i_in2, tab_x_adj1, tab_x_adj2);

    //console.log(x_in, x_out, tab_i_in1, tab_i_in2, tab_x_adj1, tab_x_adj2);
    
    expect(tab_i_in1).arrayBeCloseTo([ 0, 1, 2, 3, 0 ]);
    expect(tab_i_in2).arrayBeCloseTo([ 3, 0, 1, 2, 3 ]);
    expect(tab_x_adj1).arrayBeCloseTo([ 1.5, 1, 0.5, 0, -0.5 ]);
    expect(tab_x_adj2).arrayBeCloseTo([ 2, 1.5, 1, 0.5, 0 ]);
    

    var data_in = [0, 1, 2, 
                   3, 4, 5, 
                   6, 7, 8];

    x_in = [0, 0.5, 1];
    x_out = [-0.25, 0.25, 0.75];
    
    var y_in = [1, 0.5, 0];
    var y_out = [0.25, 0.5, 0.75];
    
    var data_out = [];
    
    grid.bilinearRegrid(x_in, y_in, data_in, true, x_out, y_out, data_out);
    expect(data_out).arrayBeCloseTo([ 5.5, 3.5, 3 ]);
    
    grid.bicubicRegrid(x_in, y_in, data_in, true, x_out, y_out, data_out);
    expect(data_out).arrayBeCloseTo([ 6.25, 3.125, 2.625 ]);
});
