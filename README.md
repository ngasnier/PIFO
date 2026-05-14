# PIFO #

PIFO stands for "Projet Informatique a Formules Ouvertes" in French. 

It is a javascript atmospheric model framework. The project was started initially with the idea to make a web game based on simplified weather physics simulation. It has evolved a lot since then, and has become a project for learning and implementing various modeling techniques, with tools to process input and output data.

The model is developped by Nicolas Gasnier from former web site Meteo Blois (http://www.meteo-blois.fr).

### Licence ###

The project is released under GPL V3.0. See LICENCE. 

It contains some dependency files licensed under MIT licence, conveniently
included in the source code tree under the js/vendor directory.

### Install ###

Install the latest node.js version, then use npm to install module dependencies as needed :

`npm install`

You may need to install the full_icu module globally to provide correct date/time handling e.g :

`npm install full-icu -G`

### How to use ###

It is recommended to create a directory structure to store the data at the various stages of the model.

    res
        run
            2018120612  raw GFS data extracted in txt format with wgrib (named by run date in the default configuration file)
        test
            input   raw input data for the model
            run     processed input data to run the model
            ouput   raw output data from the model
            pub     processed & interpolated data ready to be plotted

I provide some example data : https://github.com/ngasnier/PIFO/blob/master/data/pifo_example_data.zip

Then copy the template file barocline.default.json to barocline.json. The file is ready to follow the example with the provided data. A model run consists of the following steps :

0. Extract GFS data. The PIFO framework can only handle data as text format for now. If you have GFS data or data from any other model as GRIB format, you need to extrat it to text. The tools directory provide the grib_extract.sh script you can use as an example, it is meant to be used like this : `./grib_extract.sh inputdir outputdir`. Please note that a fileinfo.txt must be provided to help the script and PIFO framework describe the metadata of your file set. Please refer to the js/front/WGRIBFormat.js class documentation for this.

1. Preprocessor. `node runpifo.js barocline.json preprocessor`. It extracts and projects the needed data from the GFS run data for the domain defined in the config file. By default, this is for Europe. Note : for this tutorial, to keep the example dataset small, I provide the input data already processed instead of the full GFS data. Therefore, you won't need to run this step.

2. Initialisation. (optional) This runs the model in an init mode to remove some internal wave modes using a digital filter. This may improve the stability of the model, and in some cases the quality of the simulation. It creates new processed input data for the real run. To run : `node runpifo.js barocline.json init`

3. Post-init. (optional) This step is required after an init run of the model. It processes the output data and creates the final run model data. To run : `node runpifo.js barocline.json postinit`

4. Run. This is where the real weather simulation happens. To run :  `node runpifo.js barocline.json run`.

5. Post-processor. The data now needs to be projected down to standard pressure levels, and some diagnostics fields are calculated (e.g mean sea level pressure). To run : `node runpifo.js barocline.json postprocessor`

6. Plot the data. You may plot the data in the res/test/pub directory using your favorite tool. The data is in txt format, there are a few fields to help locate data points (e.g lat, lon). NCL is a great tool to do plots, but there are many others that can be used. The tools directory has all needed NCL scripts to help you as a starting point.

### Documentation ###

Point your brower to the index.html file to get a starting point for things. To generate code documentation use the `npm run doc` command.  Please note that the project was initially written for my own usage and documented in my own native language. Therefore the doc is mostly written in french. I will make some effort in the future to translate it to english. The documentation is available in the repository. 

Additionnal model description is available in french : [https://www.meteo-blois.fr/model/modeles](https://www.meteo-blois.fr/model/modeles).


### The web interface ###

The model is mainly meant to be run in console. But it can also be run interactively step by step in a web browser. Point your browser to the model_epp_gc.html file and hack in the js/mb_meteo_epp_gc_main.js file. It should be configured to run the model in the barocline mode using the config file mentionned in the tutorial. I won't provide more help for this mode as it is a bit messy now, as I use this to run some model features on the fly.

### Other dynamics cores ###

The model has a simple baroclinic core with a simple hydrostatic core and basic rain physics. It uses a leapfrog integration scheme.

There are two other cores that can be used :
* A shallow water core with leap frog scheme. See the barotrope.default.json config file.
* A shallow water core with semi-implicit scheme. Change the timeIntegrator section like this in the barotrope config file :

    "timeIntegrator" : {
        "class": "BarotropicSemiImplicitCore"
    },                 

