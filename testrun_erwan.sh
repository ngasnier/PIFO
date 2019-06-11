#!/bin/sh

rm res/test/input/*
rm res/test/run/*
rm res/test/output/*
rm res/test/pub/*

node runpifo.js barocline.erwan.json preprocessor
mv res/test/input/*.txt res/test/run
#node runpifo.js barocline.erwan.json init
#node runpifo.js barocline.erwan.json postinit
node runpifo.js barocline.erwan.json run
#node runpifo.js barocline.erwan.json postprocessor
#tools/pifo_gen.sh ~/NetBeansProjects/pifo/res/test/pub/ ~/tmp/run ~/tmp/run

