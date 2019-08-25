#!/bin/bash

set -o errexit

function clean () {
    if ! [ -z "$(ls -A $1)" ] 
    then
        rm $1/*
    fi
}

function show_help () {
    echo "testrun.sh [args]"
    echo "-s numero     étape de début. Par défaut : 1"
    echo "-e numero     étape de fin. Par défaut : 6"
    echo "-c config     fichier de config à utiliser. "
    echo "              Par défaut : barocline.default.json"
    echo "-d path       dossier de base pour les données. "
    echo "              Par défaut : res/test"
    echo "-o            dossier de sortie des cartes Europe."
    echo "              Par défaut : res/test/maps/europe"
    echo "-p            dossier de sortie des coupes."
    echo "              Par défaut : res/test/maps/coupes"
}

# A POSIX variable
OPTIND=1         # Reset in case getopts has been used previously in the shell.

# Initialize our own variables:
basedir="res/test"
config="barocline.default.json"
start_stage=1
end_stage=6
output_dir_slices=res/test/maps/coupes
output_dir_europe=res/test/maps/europe
output_dir_france=res/test/maps/france
output_dir_skewt=res/test/maps/skewt

while getopts "h?s:e:c:d:o:p:r:f:" opt; do
    case "$opt" in
    h|\?)
        show_help
        exit 0
        ;;
    s)  start_stage=$OPTARG
        ;;
    e)  end_stage=$OPTARG
        ;;
    c) config=$OPTARG
        ;;
    d) basedir=$OPTARG
        ;;
    o) output_dir_europe=$OPTARG
        ;;
    p) output_dir_slices=$OPTARG
        ;;
    r) output_dir_skewt=$OPTARG
        ;;
    f) output_dir_france=$OPTARG
        ;;
    esac
done

shift $((OPTIND-1))

[ "${1:-}" = "--" ] && shift

basedir=$(readlink -f $basedir)
output_dir_slices=$(readlink -f $output_dir_slices)
output_dir_europe=$(readlink -f $output_dir_europe)
output_dir_france=$(readlink -f $output_dir_france)
output_dir_skewt=$(readlink -f $output_dir_skewt)

# reset du scenario apres les autotests. switch le fileinfo pour prendre
# toutes les donnees. Nb : faudrait mieux reorganiser les scenarios pour
# pas avoir a faire ces bricolages
#rm res/run/2018120612/fileinfo.txt
#ln -s fileinfo.all.txt res/run/2018120612/fileinfo.txt

#rm res/test/input/*
#rm res/test/run/*
#rm res/test/output/*
#rm res/test/pub/*

if [ $start_stage -le 1 ] 
then
    clean $basedir/input
    node runpifo.js $config preprocessor
fi

if [ $start_stage -le 2 ] && [ $end_stage -ge 2 ]
then
    clean $basedir/run
    node runpifo.js $config init
fi

if [ $start_stage -le 3 ] && [ $end_stage -ge 3 ]
then
    node runpifo.js $config postinit
fi

if [ $start_stage -le 4 ] && [ $end_stage -ge 4 ]
then
    clean $basedir/output
    node runpifo.js $config run
fi

if [ $start_stage -le 5 ] && [ $end_stage -ge 5 ]
then
    clean $basedir/pub
    node runpifo.js $config postprocessor
fi

if [ $start_stage -le 6 ] && [ $end_stage -ge 6 ]
then
    tools/pifo_gen.sh $basedir/pub/ $output_dir_france $output_dir_europe $output_dir_slices $output_dir_skewt
fi

