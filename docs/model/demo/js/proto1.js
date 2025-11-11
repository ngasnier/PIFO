/* 
 * Copyright (c) 2016 Nicolas Gasnier <ngasnier at orange dot fr>
 * Tous droits réservés
 */

var Game = function() {
    this.canvas = document.getElementById('renderCanvas');
    this.engine = new BABYLON.Engine(this.canvas, true);
    this.scene = new BABYLON.Scene(this.engine);
    this.camera = new BABYLON.FreeCamera('camera1', new BABYLON.Vector3(0, 10, -10), this.scene);
    this.camera.setTarget(BABYLON.Vector3.Zero());
    this.camera.attachControl(this.canvas, false);
    this.level = null;
    this.levelGeometry = []; // Géometrie mesh pour chaque texture
    
    for (var i=0;i<255;i++) this.levelGeometry.push(null);
    
    // Genère les textures de block
    this.textureArray = [];
    var u = 0.0;
    var v = 1-0.0625;
    for (var j=0;j<16;j++) {
        u = 0.0;
        for (var i=0;i<16;i++) {
            var id = i+j*16;
            var texture = new BABYLON.StandardMaterial("block"+id, this.scene);
            texture.diffuseTexture = new BABYLON.Texture("res/terrain.png", this.scene, false, true, BABYLON.Texture.NEAREST_SAMPLINGMODE);
            texture.diffuseTexture.uOffset = u;
            texture.diffuseTexture.vOffset = v;
            texture.diffuseTexture.uScale = 0.0625;
            texture.diffuseTexture.vScale = 0.0625;
            texture.diffuseTexture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
            texture.diffuseTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE
            this.textureArray[id] = texture;
            u+=0.0625;
        }
        v-=0.0625;
    }
    
    this.blockTexture = new BABYLON.StandardMaterial("blockTextyre", this.scene);
    this.blockTexture.diffuseTexture = new BABYLON.Texture("res/terrain.png", this.scene, false, true, BABYLON.Texture.NEAREST_SAMPLINGMODE);
    this.blockTexture.diffuseTexture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
    this.blockTexture.diffuseTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE
    
    var game = this;
  
    this.initLevel = function() {
        // create a basic light, aiming 0,1,0 - meaning, to the sky
        var light = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(-0.5, 0.5,-0.5), this.scene);

        var lev = new Level(32, 10, 32);
        lev.drawFloor(0, 31, 0, 0, 31, 4);
        lev.drawXWall(0, 31, 1, 2, 0, 4);
        lev.drawZWall(0, 1, 9, 0, 31, 1);
        lev.drawXWall(0, 31, 1, 2, 31, 1);
        lev.drawZWall(31, 1, 2, 1, 31, 4);
        this.level = lev;
        this.createLevelGeometry();
        
        this.showAxis(10);
    };    
    
    this.createLevelGeometry = function () {       
        var vertexes = [];
        var indices = [];
        var uv = [];
        var normals = [];
        var len = 0;
        var indice = 0;
        for (var i=0;i<this.level.width;i++) {
            for (var j=0;j<this.level.height;j++) {
                for (var k=0;k<this.level.depth;k++) {
                    var idx = i+j*this.level.width+k*this.level.width*this.level.height;
                    if (this.level.blocks[idx]!=0)
                    {
                        var blockId = this.level.blocks[idx];
                        var frontTexture = blockId-1;
                        var topTexture = blockId-1;
                        var leftTexture = blockId-1;
                        var rightTexture = blockId-1;
                        var bottomTexture = blockId-1;
                        var backTexture = blockId-1;
                        
                        // TODO : paramétrer dans une table
                        if (blockId==4) { topTexture = 40; bottomTexture = 2;}
                        
                            
                        // Front
                        if (k==0 || this.level.isEmptyOrTransparent(i, j, k-1))
                        {
                            len = vertexes.push(i, j, k,
                                i+1, j, k,
                                i+1, j+1, k,
                                i, j+1, k);                            
                            indices.push(indice, indice+1, indice+2,
                                indice+2, indice+3, indice);
                            uv.push(0.0625*(frontTexture%16), 1-0.0625*(1+(frontTexture/16)>>0),
                                0.0625*(frontTexture%16+1)-0.00001, 1-0.0625*(1+(frontTexture/16)>>0),
                                0.0625*(frontTexture%16+1)-0.00001, 1-0.0625*((frontTexture/16)>>0)-0.00001,
                                0.0625*(frontTexture%16), 1-0.0625*((frontTexture/16)>>0)-0.00001);
                            indice = len/3;
                        }

                        // right
                        if (i==this.level.width-1 || this.level.isEmptyOrTransparent(i+1, j, k))
                        {
                            len = vertexes.push(i+1, j, k,
                                i+1, j, k+1,
                                i+1, j+1, k+1,
                                i+1, j+1, k);                            
                            indices.push(indice, indice+1, indice+2,
                                indice+2, indice+3, indice);
                            uv.push(0.0625*(leftTexture%16), 1-0.0625*(1+(leftTexture/16)>>0),
                                0.0625*(leftTexture%16+1)-0.00001, 1-0.0625*(1+(leftTexture/16)>>0),
                                0.0625*(leftTexture%16+1)-0.00001, 1-0.0625*((leftTexture/16)>>0)-0.00001,
                                0.0625*(leftTexture%16), 1-0.0625*((leftTexture/16)>>0)-0.00001);
                            indice = len/3;
                        }
                        
                        // back
                        if (k==this.level.depth-1 || this.level.isEmptyOrTransparent(i, j, k+1))
                        {
                            len = vertexes.push(i+1, j, k+1,
                                i, j, k+1,
                                i, j+1, k+1,
                                i+1, j+1, k+1);
                            indices.push(indice, indice+1, indice+2,
                                indice+2, indice+3, indice);
                            uv.push(0.0625*(backTexture%16), 1-0.0625*(1+(backTexture/16)>>0),
                                0.0625*(backTexture%16+1)-0.00001, 1-0.0625*(1+(backTexture/16)>>0),
                                0.0625*(backTexture%16+1)-0.00001, 1-0.0625*((backTexture/16)>>0)-0.00001,
                                0.0625*(backTexture%16), 1-0.0625*((backTexture/16)>>0)-0.00001);
                            indice = len/3;
                        }
                        
                        // left
                        if (i==0 || this.level.isEmptyOrTransparent(i-1, j, k))
                        {
                            len = vertexes.push(i, j, k+1,
                                i, j, k,
                                i, j+1, k,
                                i, j+1, k+1);
                            indices.push(indice, indice+1, indice+2,
                                indice+2, indice+3, indice);
                            uv.push(0.0625*(rightTexture%16), 1-0.0625*(1+(rightTexture/16)>>0),
                                0.0625*(rightTexture%16+1)-0.00001, 1-0.0625*(1+(rightTexture/16)>>0),
                                0.0625*(rightTexture%16+1)-0.00001, 1-0.0625*((rightTexture/16)>>0)-0.00001,
                                0.0625*(rightTexture%16), 1-0.0625*((rightTexture/16)>>0)-0.00001);
                            indice = len/3;
                        }

                        // top
                        if (j==this.level.height-1 || this.level.isEmptyOrTransparent(i, j+1, k))
                        {
                            len = vertexes.push(i, j+1, k,
                                i+1, j+1, k,
                                i+1, j+1, k+1,
                                i, j+1, k+1);
                            indices.push(indice, indice+1, indice+2,
                                indice+2, indice+3, indice);
                            uv.push(0.0625*(topTexture%16), 1-0.0625*(1+(topTexture/16)>>0),
                                0.0625*(topTexture%16+1)-0.00001, 1-0.0625*(1+(topTexture/16)>>0),
                                0.0625*(topTexture%16+1)-0.00001, 1-0.0625*((topTexture/16)>>0)-0.00001,
                                0.0625*(topTexture%16), 1-0.0625*((topTexture/16)>>0)-0.00001);
                            indice = len/3;
                        }
                        
                        // bottom
                        if (j==0 || this.level.isEmptyOrTransparent(i, j-1, k))
                        {
                            len = vertexes.push(i, j, k+1,
                                i+1, j, k+1,
                                i+1, j, k,
                                i, j, k);
                            indices.push(indice, indice+1, indice+2,
                                indice+2, indice+3, indice);
                            uv.push(0.0625*(bottomTexture%16), 1-0.0625*(1+(bottomTexture/16)>>0),
                                0.0625*(bottomTexture%16+1)-0.00001, 1-0.0625*(1+(bottomTexture/16)>>0),
                                0.0625*(bottomTexture%16+1)-0.00001, 1-0.0625*((bottomTexture/16)>>0)-0.00001,
                                0.0625*(bottomTexture%16), 1-0.0625*((bottomTexture/16)>>0)-0.00001);
                            indice = len/3;
                        }
                    }
                }
            }
        }
        
        BABYLON.VertexData.ComputeNormals(vertexes, indices, normals);
        
        var blockMesh = new BABYLON.Mesh("level", this.scene);
        var vertexData = new BABYLON.VertexData();

        vertexData.positions = vertexes;
        vertexData.normals = normals;
        vertexData.indices = indices;    
        vertexData.uvs = uv;    
        vertexData.applyToMesh(blockMesh);
        
        blockMesh.material = this.blockTexture;
    };


    this.showAxis = function(size) {
            var axisX = BABYLON.Mesh.CreateLines("axisX", [new BABYLON.Vector3.Zero(), new BABYLON.Vector3(size, 0, 0) ], this.scene);
            axisX.color = new BABYLON.Color3(1, 0, 0);
            var axisY = BABYLON.Mesh.CreateLines("axisY", [new BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, size, 0) ], this.scene);
            axisY.color = new BABYLON.Color3(0, 1, 0);
            var axisZ = BABYLON.Mesh.CreateLines("axisZ", [new BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, 0, size) ], this.scene);
            axisZ.color = new BABYLON.Color3(0, 0, 1);
    };

    this.renderLoop = function() {
        game.scene.render();
    };
    
    this.run = function () {
        // run the render loop
        game.engine.runRenderLoop(game.renderLoop);

        // the canvas/window resize event handler
        window.addEventListener('resize', function(){
            game.engine.resize();
        });

    }
};

var Level = function (width, height, depth) {
    this.blocks = [];
    this.width = width;
    this.height = height;
    this.depth = depth;
    
    // De l'air partout
    for (var i=0;i<width*height*depth;i++) {
        this.blocks[i] = 0;
    }
    
    this.isEmptyOrTransparent = function(x, y, z) {
        return this.blocks[x+y*this.width+z*this.width*this.height]==0;
    };
    
    this.drawBlock = function(x, y, z, id) {
        this.blocks[x+y*this.width+z*this.width*this.height]
    }
    
    this.drawFloor = function(x1, x2, y, z1, z2, id) {
        for (var i=x1;i<=x2;i++)
            for (var j=z1;j<=z2;j++)
                this.blocks[i+y*this.width+j*this.width*this.height] = id;
    };
    
    this.drawXRow = function(x1, x2, y, z, id) {
        var start = y*this.width + z * this.width*this.height;
        for (var i=x1;i<=x2;i++) this.blocks[i+start] = id;
    }
    
    this.drawColumn = function(x, y1, y2, z, id) {
        for (var i=y1;i<=y2;i++) this.blocks[x+i*this.width+z*this.width*this.height] = id;
    };
    
    this.drawXWall = function(x1, x2, y1, y2, z, id) {
        var xStart = x1; var xEnd = x2;
        var yStart = y1; var yEnd = y2;
        if (x1>x2) { xStart = x2; xEnd = x1; }        
        if (y1>y2) { yStart = y2; yEnd = y1; }
        for (var i=xStart;i<=xEnd;i++) this.drawColumn(i, yStart, yEnd, z, id); 
    };
    
    this.drawZWall = function(x, y1, y2, z1, z2, id) {
        var yStart = y1; var yEnd = y2;
        var zStart = z1; var zEnd = z2;
        if (y1>y2) { yStart = y2; yEnd = y1; }
        if (z1>z2) { zStart = z2; zEnd = z1; }
        for (var i=zStart;i<=zEnd;i++) this.drawColumn(x, yStart, yEnd, i, id);
    };
};



function initGame()
{
    var game = new Game();
    game.initLevel();
    game.run();
}