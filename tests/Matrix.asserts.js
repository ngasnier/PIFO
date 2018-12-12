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

import { Matrix } from "../js/math/Matrix.js";


test('addition vecteur', () => {
    var res = [0, 0];
    Matrix.add([1, 2], [3, 4], res);
    expect(res).arrayBeCloseTo([4, 6]);
});

test('addition matrice', () => {
    var res = [[0, 0], [0, 0]];
    Matrix.add([[1, 2], [3, 4]], [[5, 6], [7, 8]], res);
    expect(res).arrayBeCloseTo([[6, 8],[10, 12]]);
});

test('soustraction vecteur', () => {
    var res = [0, 0];
    Matrix.sub([1, 2], [3, 4], res);
    expect(res).arrayBeCloseTo([-2, -2]);
});

test('soustraction matrice', () => {
    var res = [[0, 0], [0, 0]];
    Matrix.sub([[1, 2], [3, 4]], [[5, 6], [7, 8]], res);
    expect(res).arrayBeCloseTo([[-4, -4],[-4, -4]]);
});

test('multiplication matrices carrees', () => {
    var a = [[1, 2], [3, 4]];
    var b = [[5, 6], [7, 8]];
    var res = [[0, 0], [0, 0]];
    Matrix.mul(a, b, res);
    expect(res).arrayBeCloseTo([[23, 34], [31, 46]]);
});

test('multiplication vecteur matrice', () => {
    var a = [[1],[3]];
    var b = [[5, 6], [7, 8]];
    var res = [[0], [0]];
    Matrix.mul(a, b, res);
    expect(res).arrayBeCloseTo([[23], [31]]);
});

test('multiplication matrice vecteur', () => {
    var a = [[1, 2], [3, 4]];
    var b = [[5, 6]];
    var res = [[0], [0]];
    Matrix.mul(a, b, res);
    expect(res).arrayBeCloseTo([[23, 34]]);
});

test('multiplication matrice vecteur 2 ', () => {
    var a = [[1, 2], [3, 4]];
    var b = [5, 6];
    var res = [0, 0];
    Matrix.mul(a, b, res);
    expect(res).arrayBeCloseTo([23, 34]);
});

test('multiplication vecteur vecteur', () => {
    var a = [[1],[3]];
    var b = [[5, 6]];
    var res = [[0], [0]];
    Matrix.mul(a, b, res);
    expect(res).arrayBeCloseTo([[23]]);
});

test('sor (1) w=1 simple a diagonale strictement dominante', () => {
    var a = [[-4, 1, 1],[2,6,-2],[1,2,5]];
    var b = [1,2,3];
    var res = [1, 1, 1];
    var r = [0, 0, 0];
    var conv = Matrix.sor(a, b, 1, res, r);
    expect(conv).toBeLessThan(1000);
    console.log("sor (1) : conv="+conv);
    expect(res).arrayBeCloseTo([-0.026, 0.12, 0.6533]);
});

test('sor (2) w=1 diagonale', () => {
    var a = [[5,0,0,0],[0,6,0,0],[0,0,4,0],[0,0,0,3]];
    var b = [1,2,3,4];
    var res = [1, 1, 1, 1];
    var r = [0, 0, 0, 0];
    var conv = Matrix.sor(a, b, 1, res, r);
    expect(conv).toBeLessThan(1000);
    console.log("sor (2) : conv="+conv);
    expect(res).arrayBeCloseTo([0.2, 0.333, 0.75, 1.333]);
});

test('sor (3) w=1 diagonale strictement dominante', () => {
    var a = [[5,1,0,0],[1,6,1,0],[0,1,4,1],[0,0,1,3]];
    var b = [1,2,3,4];
    var res = [1, 1, 1, 1];
    var r = [0, 0, 0, 0];
    var conv = Matrix.sor(a, b, 1, res, r);
    expect(conv).toBeLessThan(1000);
    console.log("sor (3ù) : conv="+conv);
    expect(res).arrayBeCloseTo([0.1513, 0.2434, 0.3881, 1.2039]);
});
