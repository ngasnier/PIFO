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

rm -f $2/*.txt

head -n 1 $1/fileinfo.txt > $2

run=$(ls -l $1/gfs* | head -2 | tail -n 1 | awk '{print $9}' | cut -d. -f2)

for valid in 000 003 006 009 012 015 018 021 024 027 030 033 036 039 042 045 048
do
    fichier=$1/gfs.$run.pgrb2.0p50.f$valid
    wgrib2 $fichier -s | grep PRMSL | wgrib2 -i $fichier -text $2/prmsl_$valid.txt
    wgrib2 $fichier -s | grep PRES:surface | wgrib2 -i $fichier -text $2/sfcprs_$valid.txt
    wgrib2 $fichier -s | grep HGT:surface | wgrib2 -i $fichier -text $2/sfchgt_$valid.txt
    wgrib2 $fichier -s | grep TMP:surface | wgrib2 -i $fichier -text $2/sfctmp_$valid.txt

#"1" "2" "3" "5" "7" "10" "20" "30" "50" "70" "100" "150" "200" "250" "300" "350" "400" "450" "500" "550" "600" "650" "700" "750" "800" "850" "900" "925" "950" "975" "1000"
    for hgt in "1" "70" "150" "350" "500" "650" "850" "925" "1000"
    do
	wgrib2 $fichier -s | grep HGT:$hgt | wgrib2 -i $fichier -text $2/hgt_$hgt"_"$valid.txt
	wgrib2 $fichier -s | grep UGRD:$hgt | wgrib2 -i $fichier -text $2/ugrd_$hgt"_"$valid.txt
	wgrib2 $fichier -s | grep VGRD:$hgt | wgrib2 -i $fichier -text $2/vgrd_$hgt"_"$valid.txt
        wgrib2 $fichier -s | grep VVEL:$hgt | wgrib2 -i $fichier -text $2/vvel_$hgt"_"$valid.txt
	wgrib2 $fichier -s | grep TMP:$hgt | wgrib2 -i $fichier -text $2/tmp_$hgt"_"$valid.txt
	wgrib2 $fichier -s | grep RH:$hgt | wgrib2 -i $fichier -text $2/rh_$hgt"_"$valid.txt
	wgrib2 $fichier -s | grep ABSV:$hgt | wgrib2 -i $fichier -text $2/absv_$hgt"_"$valid.txt
        wgrib2 $fichier -s | grep CLWMR:$hgt | wgrib2 -i $fichier -text $2/clwr_$hgt"_"$valid.txt
    done
done


#for valid in "00"
#do
#    fichier=gfs.t00z.pgrb2f$valid
#    wgrib2 $fichier -s | grep PRMSL | wgrib2 -i $fichier -text prmsl_$valid.txt
#    wgrib2 $fichier -s | grep PRES:surface | wgrib2 -i $fichier -text sfcprs_$valid.txt
#    wgrib2 $fichier -s | grep HGT:surface | wgrib2 -i $fichier -text sfchgt_$valid.txt
#    wgrib2 $fichier -s | grep TMP:surface | wgrib2 -i $fichier -text sfctmp_$valid.txt
#
#    for hgt in "1" "2" "3" "5" "7" "10" "20" "30" "50" "70" "100" "150" "200" "250" "300" "350" "400" "450" "500" "550" "600" "650" "700" "750" "800" "850" "900" "925" "950" "975" "1000"
#    do
#	wgrib2 $fichier -s | grep HGT:$hgt | wgrib2 -i $fichier -text hgt_$hgt"_"$valid.txt
#	wgrib2 $fichier -s | grep UGRD:$hgt | wgrib2 -i $fichier -text ugrd_$hgt"_"$valid.txt
#	wgrib2 $fichier -s | grep VGRD:$hgt | wgrib2 -i $fichier -text vgrd_$hgt"_"$valid.txt
#        wgrib2 $fichier -s | grep VVEL:$hgt | wgrib2 -i $fichier -text vvel_$hgt"_"$valid.txt
#	wgrib2 $fichier -s | grep TMP:$hgt | wgrib2 -i $fichier -text tmp_$hgt"_"$valid.txt
#	wgrib2 $fichier -s | grep RH:$hgt | wgrib2 -i $fichier -text rh_$hgt"_"$valid.txt
#	wgrib2 $fichier -s | grep ABSV:$hgt | wgrib2 -i $fichier -text absv_$hgt"_"$valid.txt
#        wgrib2 $fichier -s | grep CLWMR:$hgt | wgrib2 -i $fichier -text clwr_$hgt"_"$valid.txt        
#    done
#done
