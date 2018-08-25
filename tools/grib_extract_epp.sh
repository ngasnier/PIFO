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

PATH=$PATH":/home/meteo/bin"
dest="/var/www/html/modeles/res/run/1/"

for valid in "00" "03" "06" "09" "12" "15" "18" "21" "24"
do
    for hgt in "500"
    do
	wgrib2 gfs.*.pgrb2f$valid".gr" -s | grep HGT:$hgt | wgrib2 -i gfs.*.pgrb2f$valid".gr" -text $dest"hgt_"$hgt"_0"$valid.txt
	wgrib2 gfs.*.pgrb2f$valid".gr" -s | grep UGRD:$hgt | wgrib2 -i gfs.*.pgrb2f$valid".gr" -text $dest"ugrd_"$hgt"_0"$valid.txt
	wgrib2 gfs.*.pgrb2f$valid".gr" -s | grep VGRD:$hgt | wgrib2 -i gfs.*.pgrb2f$valid".gr" -text $dest"vgrd_"$hgt"_0"$valid.txt
    done
done

run=$(head -n 1 fileinfo.txt | cut -d ";" -f 2)" "$(head -n 1 fileinfo.txt | cut -d ";" -f 4)" "$(head -n 1 fileinfo.txt | cut -d ";" -f 3)"z"
echo $run > $dest"runinfo.txt"