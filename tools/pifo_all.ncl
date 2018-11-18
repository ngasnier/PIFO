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

load "$NCL_ROOT/mb_common.ncl"

function getLevels(fin, lat2U)
begin
	nb = dimsizes(lat2U)
	lev = fin->lv_ISBL3
	nblev = dimsizes(lev)
	levels = new((/nblev, nb(0), nb(1)/), double)
	do i=0,nb(0)-1
		do j=0,nb(1)-1
			levels(:,i,j) = lev(:)
		end do
	end do
	return (levels)
end

function loadField(f)
begin
    data = asciiread(input_dir+"/"+f, -1, "string")
    nblig = dimsizes(data)
    width = stringtoint(str_get_field(data(0), 1, ","))
    height = stringtoint(str_get_field(data(0), 2, ","))
    field = new((/height, width/), float)
    i = 0
    j = 0
    do lig = 1, nblig-1
        ;n = stringtodouble(data(lig))
        n = stringtofloat(data(lig))
        field(j, i) = n
        i = i+1
        if (i .ge. width) then
            i = 0
            j = j+1 
        end if
    end do
    delete(data)
    return (field)
end

function load3DField(f, t, levs, lat, lon)
begin
    nblev = dimsizes(levs)
    i = 0
    j = 0
    data = loadField(f+"_0_"+t)
    dims = dimsizes(data)
    field = new((/1, dims(0), dims(1)/), float)
    field(0,:,:) = data
    delete(data)
    do lev = 1, nblev-1
        data = loadField(f+"_"+lev+"_"+t)
        data_tmp = new((/1, dims(0), dims(1)/), float)
        data_tmp(0,:,:) = data
        delete(data)

        field_tmp = array_append_record(field, data_tmp, 0)
        delete(field)
        delete(data_tmp)

        field = field_tmp

        delete(field_tmp)
    end do

    field!0 = "lev"
    field!1 = "lat"
    field!2 = "lon"
    field&lev = levs
    field&lev@units = "sigma"
    field&lat = lat
    field&lat@units = "degrees-north"
    field&lon = lon
    field&lon@units = "degrees-east"
    
    return (field)
end


function loadSigma()
begin
    data = asciiread(input_dir+"/sigma.txt", -1, "string")
    return (stringtodouble(data))
end

begin
    slice_levels = (/ 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 925, 950, 975, 1000 /)
    days_of_week = (/ "dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"/)
    months = (/"janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"/)

    infos = asciiread(input_dir+"/fileinfo.txt", -1, "string")

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

    ;device = "x11"
    device = "ps"

    sigma = loadSigma()
    sigma_couches = sigma(1::2)
    sigma_surfaces = sigma(0::2)
    hyba_couches = fspan(0.,0.,dimsizes(sigma_couches))
    hyba_surfaces = fspan(0.,0.,dimsizes(sigma_surfaces))

    ; Parcours des previsions
    do filenum = idxstart, idxend
        grfile  = str_get_field(infos(filenum), 1, ";")
        model 	= str_get_field(infos(filenum), 2, ";")
        run	= str_get_field(infos(filenum), 3, ";")
        date	= str_get_field(infos(filenum), 4, ";")
        valid	= sprinti("%0.3i", stringtointeger(str_get_field(infos(filenum), 5, ";")))
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

        print("Z500 + PRSML");
        outfile = europe_dir+"/pifo_prmsl_hgt500_"+valid

        wks = gsn_open_wks(device, outfile)
        mb_set_colormap(wks)

        gen_res = True
        gen_res@sfXArray = lon2U
        gen_res@sfYArray = lat2U
        gen_res@gsnAddCyclic = False
        gen_res@gsnPaperOrientation = "portrait"

        phi = load3DField("phi", grfile, sigma_couches, lat2d, lon2d)/9.81;
        ps = loadField("ps_"+grfile)
        prmsl = ps / 100.0
        hgt500 = vinth2p(phi, hyba_couches, sigma_couches, (/ 500 /), ps, 1 , 1000 , 1 , True)

        plot_hgt500 = mb_geop_z500_fill(wks, hgt500(0,:,:), gen_res)
        prmsl_res = gen_res
        prmsl_res@cnLevelSpacingF = 2.
        prmsl_res@cnLineThicknessF = 2.0
        prmsl_res@cnLowLabelsOn	= False
        prmsl_res@cnHighLabelsOn = False
        plot_prmsl = mb_isobares(wks, prmsl, prmsl_res)

        eur_res3 = True
        eur_res3@mpNationalLineColor = "Black"
        eur_res3@mpGeophysicalLineColor = "Black"
        mapid = mb_map_europe(wks, "Pression et Geopotentiel 500 hPa", globalRes@validDate, globalRes@runInfo, eur_res3)
        overlay(mapid, plot_hgt500)
        overlay(mapid, plot_prmsl)
        draw(mapid)

        delete(hgt500)
        delete(prmsl)
        delete(phi)

        frame(wks)

        ; ************************************************************************
        ; PRECIPITATIONS
        ; ************************************************************************

        apcp = loadField("apcp_"+grfile)
        acsnow = loadField("acsnow_"+grfile)

        apcp = apcp+acsnow

        if (isvar("apcp_prec")) then
            apcp_ech = apcp - apcp_prec
        else 
            apcp_ech = apcp
        end if

        apcp_prec = apcp

        print("Precipitations neige Europe");
        outfile = europe_dir+"/pifo_acsnow_"+valid
        wks = gsn_open_wks(device, outfile)
        mb_set_colormap(wks)

        rain_res = True
        rain_res@sfXArray = lon2U
        rain_res@sfYArray = lat2U
        rain_res@gsnAddCyclic = False
        rain_res@gsnPaperOrientation = "portrait"

        plot_precip = mb_precipitations(wks, acsnow, rain_res)

        eur_res = True
        eur_res@mpFillOn			= False
        eur_res@mpNationalLineColor = "Black"
        eur_res@mpGeophysicalLineColor = "Black"
        mapid = mb_map_europe(wks, "Accumulation neige", globalRes@validDate, globalRes@runInfo, eur_res)
        overlay(mapid, plot_precip)
        draw(mapid)
        frame(wks)


        print("Precipitations cumulées Europe");
        outfile = europe_dir+"/pifo_apcp_acc_"+valid
        wks = gsn_open_wks(device, outfile)
        mb_set_colormap(wks)

        rain_res = True
        rain_res@sfXArray = lon2U
        rain_res@sfYArray = lat2U
        rain_res@gsnAddCyclic = False
        rain_res@gsnPaperOrientation = "portrait"

        plot_precip = mb_precipitations(wks, apcp, rain_res)

        eur_res = True
        eur_res@mpFillOn			= False
        eur_res@mpNationalLineColor = "Black"
        eur_res@mpGeophysicalLineColor = "Black"
        mapid = mb_map_europe(wks, "Precipitations cumulees", globalRes@validDate, globalRes@runInfo, eur_res)
        overlay(mapid, plot_precip)
        draw(mapid)
        frame(wks)

        print("Precipitations Europe");
        outfile = europe_dir+"/pifo_apcp_"+valid
        wks = gsn_open_wks(device, outfile)
        mb_set_colormap(wks)

        rain_res = True
        rain_res@sfXArray = lon2U
        rain_res@sfYArray = lat2U
        rain_res@gsnAddCyclic = False
        rain_res@gsnPaperOrientation = "portrait"

        plot_precip = mb_precipitations(wks, apcp_ech, rain_res)

        eur_res = True
        eur_res@mpFillOn            = False
        eur_res@mpNationalLineColor = "Black"
        eur_res@mpGeophysicalLineColor = "Black"
        mapid = mb_map_europe(wks, "Precipitations", globalRes@validDate, globalRes@runInfo, eur_res)
        overlay(mapid, plot_precip)
        draw(mapid)
        frame(wks)

        delete(plot_precip)
        delete(apcp)
        delete(apcp_ech)

        ; ************************************************************************
        ; Temperature 850 hPa
        ; ************************************************************************

        T = load3DField("T", grfile, sigma_couches, lat2d, lon2d);

        tt850 = vinth2p(T, hyba_couches, sigma_couches, (/ 850 /), ps, 1 , 1000 , 1 , True)
        t850 = tt850(0,:,:) - 273.15
        delete(tt850)

; theta = T*(1000/P)^(Ra/Cp)
;		theta = t850*1.04758 - 273.15
;		copy_VarCoords(t850, theta)

        print("Température 850 hPa Europe");
        outfile = europe_dir+"/pifo_tmp850_"+valid
        wks = gsn_open_wks(device, outfile)
        mb_set_colormap(wks)

        plot_temp = mb_temp850hpa(wks, t850, gen_res)
        eur_res5 = True
        eur_res5@mpNationalLineColor = "Black"
        eur_res5@mpGeophysicalLineColor = "Black"
        mapid = mb_map_europe(wks, "Temperature 850 hPa", globalRes@validDate, globalRes@runInfo, eur_res5)
        delete(eur_res5)
        overlay(mapid, plot_temp)

        draw(mapid)
        frame(wks)

        delete(t850)
        delete(plot_temp)

        ; ************************************************************************
        ; Temperature en coupe
        ; ************************************************************************
        
        print("Temperature coupe");
        T_hpa = vinth2p(T, hyba_couches, sigma_couches, slice_levels, ps, 1 , 1000 , 1 , True)

        ; Coupe lon
        slice = T_hpa(:, {47.5931}, {-7:13})
        slice = slice - 273.15
        slice&lev_p@units = "hpa"
        slice&lon@units = "degrees-east"

	outfile = coupes_dir+"/pifo_lon_t_"+valid
	wks = gsn_open_wks(device, outfile)
	mb_set_colormap(wks)

	plot = mb_temp_coupe(wks, slice, globalRes@validDate, globalRes@runInfo)

	draw(plot)
	frame(wks)

	delete(slice)


        ; ************************************************************************
        ; Jet stream + tropopause
        ; ************************************************************************

        U = load3DField("U", grfile, sigma_couches, lat2d, lon2d);
        V = load3DField("V", grfile, sigma_couches, lat2d, lon2d);

        ; Obtient le vent sur le niveau ~300 hPa
        u_int = vinth2p(U, hyba_couches, sigma_couches, (/ 300 /), ps, 1 , 1000 , 1 , True)
        v_int= vinth2p(V, hyba_couches, sigma_couches, (/ 300 /), ps, 1 , 1000 , 1 , True)
        ustream = u_int(0,:,:)
        vstream = v_int(0,:,:)
        delete(u_int)
        delete(v_int)

        ; Carte europe
        print("Jet Stream 300 hPa");
        outfile = europe_dir+"/pifo_jet_stream_"+valid
        wks = gsn_open_wks(device,outfile)
        mb_set_colormap(wks)

        vec_res = True
        vec_res@gsnAddCyclic = False
        vec_res@vfXArray = lon2d
        vec_res@vfYArray = lat2d
        plot_jet = mb_jet_stream_contour(wks, ustream, vstream, gen_res)
        plot_stream = mb_jet_stream(wks, ustream, vstream, vec_res)

        eur_res4 = True
        eur_res4@mpFillOn   = False
        eur_res4@mpNationalLineColor = "Black"
        eur_res4@mpGeophysicalLineColor = "Black"
        mapid = mb_map_europe(wks, "Jet Stream 300 hPa + altitude tropopause", globalRes@validDate, globalRes@runInfo, eur_res4)
        delete(eur_res4)
        delete(prmsl_res)
        overlay(mapid, plot_jet)
        overlay(mapid, plot_stream)

        draw(mapid)
        frame(wks)

        delete(plot_jet)
        delete(plot_stream)
        delete(ustream)
        delete(vstream)


        ; ************************************************************************
        ; Coupes de vent
        ; ************************************************************************

        print("Vent coupe");
        U_hpa = vinth2p(U, hyba_couches, sigma_couches, slice_levels, ps, 1 , 1000 , 1 , True)
        V_hpa = vinth2p(V, hyba_couches, sigma_couches, slice_levels, ps, 1 , 1000 , 1 , True)

        ; Coupe lon
        u_slice = U_hpa(:, {47.5931}, {-7:13})
        u_slice&lev_p@units = "hpa"
        u_slice&lon@units = "degrees-east"

        v_slice = V_hpa(:, {47.5931}, {-7:13})
        v_slice&lev_p@units = "hpa"
        v_slice&lon@units = "degrees-east"

	outfile = coupes_dir+"/pifo_lon_vent_"+valid
	wks = gsn_open_wks(device, outfile)
	mb_set_colormap(wks)

        plot = mb_vent_coupe(wks, u_slice, v_slice, globalRes@validDate, globalRes@runInfo)

	draw(plot)
	frame(wks)

	delete(u_slice)
        delete(v_slice)

        ; ************************************************************************
        ; Humidite relative
        ; ************************************************************************

        print("RH 700 hpa Europe");
        qv = load3DField("qv", grfile, sigma_couches, lat2d, lon2d);

        qv700 = vinth2p(qv, hyba_couches, sigma_couches, (/ 700 /), ps, 1 , 1000 , 1 , True)
        t700 = vinth2p(T, hyba_couches, sigma_couches, (/ 700 /), ps, 1 , 1000 , 1 , True)
        psat = exp(13.7-5120/t700(0,:,:)) * 101325
        qsat = 0.622*psat/(70000 - 0.378*psat)
        rh700 = qv700(0,:,:)/qsat*100

        outfile = europe_dir+"/pifo_rh700_"+valid
        wks = gsn_open_wks(device,outfile)
        mb_set_colormap(wks)

        plot_rh700 = mb_humidite(wks, rh700, gen_res)

        eur_res2 = True
        eur_res2@mpNationalLineColor = "Black"
        eur_res2@mpGeophysicalLineColor = "Black"
        mapid = mb_map_europe(wks, "Humidite relative 700 hPa", globalRes@validDate, globalRes@runInfo, eur_res2)
        overlay(mapid, plot_rh700)	
        draw(mapid)
        frame(wks)

        delete(psat)
        delete(qsat)
        delete(qv700)
        delete(t700)
        delete(rh700)

        ; ************************************************************************
        ; Humidite coupe
        ; ************************************************************************

        print("RH coupe");
        qv_hpa = vinth2p(qv, hyba_couches, sigma_couches, slice_levels, ps, 1 , 1000 , 1 , True)

        ; Coupe lon
        qv_slice = qv_hpa(:, {47.5931}, {-7:13})
        t_slice = T_hpa(:, {47.5931}, {-7:13})

        plevels = conform_dims(dimsizes(qv_slice), slice_levels * 100, 0)
        psat = exp(13.7-5120/t_slice) * 101325
        qsat = 0.622*psat/(plevels - 0.378*psat)
        rh_slice = qv_slice/qsat*100

        copy_VarCoords(qv_slice, rh_slice)
        rh_slice&lev_p@units = "hpa"
        rh_slice&lon@units = "degrees-east"

	outfile = coupes_dir+"/pifo_lon_rh_"+valid
	wks = gsn_open_wks(device, outfile)
	mb_set_colormap(wks)

	plot = mb_rh_coupe(wks, rh_slice, globalRes@validDate, globalRes@runInfo)

	draw(plot)
	frame(wks)

	delete(qv_slice)
        delete(t_slice)
        delete(rh_slice)
        delete(psat)
        delete(qsat)
        delete(plevels)

        ; ************************************************************************
        ; Vitesse verticale
        ; ************************************************************************

        print("Vent vertical 700 hPa")

        outfile = europe_dir+"/pifo_vv700_"+valid
        wks = gsn_open_wks(device, outfile)
        mb_set_colormap(wks)

        sigmaf = load3DField("sigmaf", grfile, sigma_surfaces, lat2d, lon2d);
        vv700_tmp = vinth2p(sigmaf, hyba_surfaces, sigma_surfaces, (/ 700 /), ps, 1 , 1000 , 1 , True)

        vvel700 = vv700_tmp(0,:,:) * 36
        plot_vv = mb_vent_vertical(wks, vvel700, gen_res)

        mapid = mb_map_europe(wks, "Vent vertical 700 hPa", globalRes@validDate, globalRes@runInfo, eur_res)
        overlay(mapid, plot_vv)
        draw(mapid)
        frame(wks)

        delete(vvel700)
        delete(vv700_tmp)

        ; ************************************************************************
        ; Vitesse verticale coupe
        ; ************************************************************************

        print("Vent vertical coupe");
        sigmaf_hpa = vinth2p(sigmaf, hyba_surfaces, sigma_surfaces, slice_levels, ps, 1 , 1000 , 1 , True)

        ; Coupe lon
        sigmaf_slice = sigmaf_hpa(:, {47.5931}, {-7:13})
        sigmaf_slice = sigmaf_slice * 36
        sigmaf_slice&lev_p@units = "hpa"
        sigmaf_slice&lon@units = "degrees-east"

	outfile = coupes_dir+"/pifo_lon_vv_"+valid
	wks = gsn_open_wks(device, outfile)
	mb_set_colormap(wks)

	plot = mb_vent_vertical_coupe(wks, sigmaf_slice, globalRes@validDate, globalRes@runInfo)

	draw(plot)
	frame(wks)

	delete(sigmaf_slice)

        ; ************************************************************************
        ; Tourbillon absolu
        ; ************************************************************************

        print("Tourbillon absolu 500hPa");
        ta = load3DField("tourbillon", grfile, sigma_couches, lat2d, lon2d);
        ftmp = loadField("f_"+grfile);
        f = conform_dims(dimsizes(ta), ftmp, (/1, 2/))
        pstmp = conform_dims(dimsizes(ta), ps, (/1, 2/))
        ta = (ta*pstmp - f) * 10e5
        delete(ftmp)
        delete(pstmp)

        ta500 = vinth2p(ta, hyba_surfaces, sigma_surfaces, (/ 500 /), ps, 1 , 1000 , 1 , True)

        outfile = europe_dir+"/pifo_ta500_"+valid
        wks = gsn_open_wks(device, outfile)
        mb_set_colormap(wks)		

        plot_ta = mb_ta(wks, ta500(0,:,:), gen_res)

        mapid = mb_map_europe(wks, "Tourbillon Absolu 500 hPa", globalRes@validDate, globalRes@runInfo, fr_res_cape)
        overlay(mapid, plot_ta)
        draw(mapid)
        frame(wks)

        delete(plot_ta)
        delete(ta500)


        ; ************************************************************************
        ; Cleanup
        ; ************************************************************************

        delete(T)
        delete(U)
        delete(V)
        delete(qv)
        delete(sigmaf)
        delete(ps)
        delete(ta)
        delete(f)

        delete(T_hpa)
        delete(U_hpa)
        delete(V_hpa)
        delete(qv_hpa)
        delete(sigmaf_hpa)

    end do        ; END OF TIME LOOP
end


