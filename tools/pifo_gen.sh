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

fileinfo=$1
echo $1
#while read fileinfo 
#do
runvalid=$(echo $fileinfo | cut -d ";" -f 5)

cmdline="input_dir=\"/home/nicolas/Meteo/scripts/pifo\" europe_dir=\"/home/nicolas/Meteo/scripts/pifo/images\""
echo $cmdline
# *** Cartes PIFO
ncl pifo_all.ncl $cmdline
for f in $(ls pifo/images/*.ps)
do
	outfile="pifo/images/$(basename $f .ps).png"
	# png256
	# Conversion PS en PNG
	gs -sDEVICE=png16m -dNOPAUSE -dEPSCrop -dTextAlphaBits=4 -dGraphicsAlphaBits=4 -r72 -sOutputFile=$outfile -c "<</Orientation 1>> setpagedevice" --f $f quit 
	# Trim les bandes blanches inutiles
	convert $outfile -trim +repage $outfile
	rm -f $f
done
