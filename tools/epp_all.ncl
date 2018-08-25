; Copyright (C) 2018 Nicolas GASNIER (http://www.meteo-blois.fr/contact/)
;
; This program is free software: you can redistribute it and/or modify
; it under the terms of the GNU General Public License as published by
; the Free Software Foundation, either version 3 of the License, or
; (at your option) any later version.
;
; This program is distributed in the hope that it will be useful,
; but WITHOUT ANY WARRANTY; without even the implied warranty of
; MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
; GNU General Public License for more details.
; 
; You should have received a copy of the GNU General Public License
; along with this program.  If not, see <http://www.gnu.org/licenses/>.
; 

load "$NCARG_ROOT/lib/ncarg/nclscripts/csm/gsn_code.ncl"
load "$NCARG_ROOT/lib/ncarg/nclscripts/csm/gsn_csm.ncl"
load "$NCARG_ROOT/lib/ncarg/nclscripts/csm/contributed.ncl"
load "$NCARG_ROOT/lib/ncarg/nclscripts/csm/shea_util.ncl"
load "$NCARG_ROOT/lib/ncarg/nclscripts/csm/skewt_func.ncl"
load "config.ncl"
load "mb_common.ncl"


function loadField(f)
begin
    data = asciiread(g_prefix+"/scripts/pifo/"+f, -1, "string")
    nblig = dimsizes(data)
    width = stringtoint(str_get_field(data(0), 1, ","))
    height = stringtoint(str_get_field(data(0), 2, ","))
    field = new((/height, width/), double)
    i = 0
    j = 0
    do lig = 1, nblig-1
        n = stringtodouble(data(lig))
        field(j, i) = n
        i = i+1
        if (i .ge. width) then
            i = 0
            j = j+1 
        end if
    end do
    return (field)
end

begin
	days_of_week = (/ "dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"/)
	months = (/"janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"/)

	if (isvar("p_fileinfo") .and. p_fileinfo .ne. "") then
		infos = (/ p_fileinfo /)
		precfile = str_get_field(p_fileinfo, 8, ";")
	else
		infos = asciiread(g_prefix+"/scripts/pifo/fileinfo.txt", -1, "string")
	end if
	dims = dimsizes(infos)

	if (isvar("p_start")) then
		idxstart = p_start
	else
		idxstart = 0
	end if
	if (isvar("p_end")) then
		idxend = p_end
	else
		idxend = dims-1
	end if

	; We generate plots, but what kind do we prefer?
	;device = "x11"
	device = "ps"
	
	; Parcours des previsions
	do filenum = idxstart, idxend
		grfile  = str_get_field(infos(filenum), 1, ";")
		model 	= str_get_field(infos(filenum), 2, ";")
		run	= str_get_field(infos(filenum), 3, ";")
		date	= str_get_field(infos(filenum), 4, ";")
		valid	= str_get_field(infos(filenum), 5, ";")
		dateval	= str_get_field(infos(filenum), 6, ";")
		hourval = str_get_field(infos(filenum), 7, ";")

		day   = str_get_field(dateval, 1, "/")
		month = str_get_field(dateval, 2, "/")
		year  = str_get_field(dateval, 3, "/")
		hour  = str_get_field(hourval, 1, ":")


		; Chargement du fichier de sortie 
		globalRes = True
		globalRes@validDate = dateval+"~C~~Z150~"+hourval+"~Z75~(+"+valid+"h)"
		globalRes@runInfo = "Run "+model+" "+run+"z du "+date

		; ************************************************************************
		; Variables
		; ************************************************************************
		lat2U = loadField("latitudes_"+grfile)	; latitudes pour chaque point de grille
		lon2U = loadField("longitudes_"+grfile)	; longitudes pour chaque point de grille

                lat2d = lat2U(:,0)
                lon2d = lon2U(0,:)

		; Quelques variables utiles partout
		fr_res_black = True
		fr_res_black@mpNationalLineColor = "Black"
		fr_res_black@mpGeophysicalLineColor = "Black"
		fr_res_black@mpDefaultFillColor	 = "White"

		fr_res_white = True
		fr_res_white@mpNationalLineColor = "White"
		fr_res_white@mpGeophysicalLineColor = "White"
		fr_res_white@mpDefaultFillColor	 = "Black"

		fr_res_cape = True
		fr_res_cape@mpNationalLineColor = "Black"
		fr_res_cape@mpGeophysicalLineColor = "Black"
		fr_res_cape@mpDefaultFillColor	 = "White"
               
 		; ************************************************************************
		; Z500 + PRMSL
		; ************************************************************************

                print("    Z500 + PRSML");
		outfile = "pifo/images/epp_prmsl_hgt500_"+valid
    
		wks = gsn_open_wks(device, outfile)
		mb_set_colormap(wks)
 
                gen_res = True
                gen_res@sfXArray = lon2U
                gen_res@sfYArray = lat2U
                gen_res@gsnAddCyclic = False
                gen_res@gsnPaperOrientation = "portrait"

                hgt500 = loadField("Z500_"+grfile)

                plot_hgt500 = mb_geop_z500_fill(wks, hgt500, gen_res)

		eur_res3 = True
		eur_res3@mpNationalLineColor = "Black"
		eur_res3@mpGeophysicalLineColor = "Black"
                mapid = mb_map_europe(wks, "Pression et Geopotentiel 500 hPa", globalRes@validDate, globalRes@runInfo, eur_res3)
		overlay(mapid, plot_hgt500)
                draw(mapid)

                delete(hgt500)

		frame(wks)
	end do        ; END OF TIME LOOP

end


