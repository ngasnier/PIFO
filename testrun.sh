#!/bin/sh

#set -o errexit

rm res/run/2018120612/fileinfo.txt
ln -s fileinfo.all.txt res/run/2018120612/fileinfo.txt
#rm res/test/input/*
#rm res/test/run/*
rm res/test/output/*
rm res/test/pub/*

#node runpifo.js barocline.default.json preprocessor
#node runpifo.js barocline.default.json init
#node runpifo.js barocline.default.json postinit
node runpifo.js barocline.default.json run
node runpifo.js barocline.default.json postprocessor
tools/pifo_gen.sh ~/NetBeansProjects/pifo/res/test/pub/ ~/tmp/run ~/tmp/run

