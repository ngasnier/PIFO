/* 
 * Copyright (C) 2019 Nicolas Gasnier
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

/** 
 * Résolution de systèmes linéaires creux à 3 diagonales symétriques.
 * 
 * <p>Ce sont des systèmes de la forma AX=B résultant généralement de la 
 * discrétisation d'équations de type Helmholtz ou Poisson.</p>
 * 
 * <p>Cet objet est bien plus performant pour résoudre ce type de systèmes 
 * sur un très grand nombre d'inconnues que d'utiliser des fonctions 
 * matricielles pures. On ne traite en effet que les coefficients non nuls, 
 * ce qui évite de nombreux calculs.</p>.
 * 
 * @type type
 */
export class TridiagonalSystem {
    
}

/**
 * Résolution du système par la méthode de surrelaxation.
 * 
 * @param {type} cx Vecteur des coefficients de la première paire 
 * de diagonales.
 * @param {type} xdist Distance de cx à la diagonale de la matrice
 * @param {type} cy Vecteur des coefficients de la seconde paire de 
 * diagonales.
 * @param {type} ydist Distance de cy à la diagonale de la matrice
 * @param {type} cxy Vecteur des coefficients de la diagonale de la matrice.
 * @param {type} b Vecteur B de l'équation à résoudre
 * @param {type} w Coefficient de relaxation, compris entre 1 et 2
 * @param {type} x Vecteur des inconnues. Les valeurs fournies dans ce
 * vecteur servent de point de départ pour l'itération.
 * @param {type} r Vecteur résidu de même dimension que x.
 * @param {type} epsilon Défaut : 0.000001. Valeur seuil à atteindre pour
 * la convergence.
 * @param {type} maxiter Défaut : 1000. Nombre d'itérations maximum avant
 * d'arrêter l'algorithme. Protection contre les systèmes qui ne
 * convergent pas.
 * @returns {int} nombre d'itérations effectuées pour atteindre la 
 * convergence.
 */
TridiagonalSystem.sor = function(cx, xdist, cy, ydist, cxy, b, w, x, r, epsilon=0.000001, maxiter=1000)
{
    var i, j;
    var s, k;
    var nr;
    var nb = x.length;

    for (i=0;i<nb;i++) r[i] = 1;
    nr = nb;

    k=0;
    while (nr>epsilon && k<maxiter)
    {
        k++;
        nr = 0;
        for (i=0;i<nb;i++)
        {
            s = 0;
            if (i-ydist>=0) s += cy[i]*x[i-ydist];
            if (i-xdist>=0) s += cx[i]*x[i-xdist];
            if (i+xdist<nb) s += cx[i]*x[i+xdist];
            if (i+ydist<nb) s += cy[i]*x[i+ydist];
            x[i] = (1-w)*x[i]+w/cxy[i]*(b[i]-s);

            r[i] = 0;
            if (i-ydist>=0) r[i] += cy[i]*x[i-ydist];
            if (i-xdist>=0) r[i]+= cx[i]*x[i-xdist];
            r[i] += cxy[i]*x[i]
            if (i+xdist<nb) r[i]+= cx[i]*x[i+xdist];
            if (i+ydist<nb) r[i]+= cy[i]*x[i+ydist];
            r[i] -= b[i];
            nr += r[i]*r[i];
        }
        nr = Math.sqrt(nr);
    }
    return k;
}