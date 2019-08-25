#!/bin/sh

# Copyright (C) 2018 Nicolas GASNIER (http://www.meteo-blois.fr/contact/)
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
# 
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.
# 

METEO_DIR=$( cd "$(dirname "$0")" ; pwd -P )
if [ ! -d "$METEO_DIR" ]; then METEO_DIR="$PWD"; fi

cd $METEO_DIR
echo $METEO_DIR

export NCL_ROOT="/home/nicolas/NetBeansProjects/MbTools/ncl"

cmdline="input_dir=\"$1\" france_dir=\"$2\" europe_dir=\"$3\" coupes_dir=\"$4\""
echo $cmdline
# *** Cartes PIFO
ncl pifo_all.ncl $cmdline


for f in $(ls $2/*.ps)
do
	outfile="$2/$(basename $f .ps).png"
        #outfile="res/test/maps/europe/$(basename $f .ps).png"
	# png256
	# Conversion PS en PNG
        gs -sDEVICE=png16m -dNOPAUSE -dEPSCrop -dTextAlphaBits=4 -dGraphicsAlphaBits=4 -r102 -sOutputFile=$outfile -c "<</Orientation 0>> setpagedevice" --f $f quit    
	# Trim les bandes blanches inutiles
	convert $outfile -trim +repage $outfile
        composite -geometry +1+49 $NCL_ROOT/masque_depts_noir.png $outfile $outfile 
	rm -f $f
done

for f in $(ls $3/*.ps)
do
	outfile="$3/$(basename $f .ps).png"
        #outfile="res/test/maps/europe/$(basename $f .ps).png"
	# png256
	# Conversion PS en PNG
	gs -sDEVICE=png16m -dNOPAUSE -dEPSCrop -dTextAlphaBits=4 -dGraphicsAlphaBits=4 -r72 -sOutputFile=$outfile -c "<</Orientation 1>> setpagedevice" --f $f quit 
	# Trim les bandes blanches inutiles
	convert $outfile -trim +repage $outfile
	rm -f $f
done

for f in $(ls $4/*.ps)
do
	outfile="$4/$(basename $f .ps).png"
        #outfile="res/test/maps/europe/$(basename $f .ps).png"
	# png256
	# Conversion PS en PNG	
        gs -sDEVICE=png16m -dNOPAUSE -dEPSCrop -dTextAlphaBits=4 -dGraphicsAlphaBits=4 -r90 -sOutputFile=$outfile -c "<</Orientation 1>> setpagedevice" --f $f quit 
	# Trim les bandes blanches inutiles
	convert $outfile -trim +repage $outfile
	rm -f $f
done
