{
    "targets": [{
        "target_name": "nodempi",
        "cflags!": [ "-fno-exceptions" ],
        "cflags_cc!": [ "-fno-exceptions"  ],
        "ldflags": [
            
        ],
        "sources": [
            "src/nodempi.cpp"
        ],
        'include_dirs': [
            "<!@(node -p \"require('node-addon-api').include\")",
            "/usr/lib/x86_64-linux-gnu/openmpi/include"
        ],
        'libraries': ["-lmpi", "-lmpi_cxx"],
        'dependencies': [
            "<!(node -p \"require('node-addon-api').gyp\")"
        ],
        'defines': [ 'NAPI_DISABLE_CPP_EXCEPTIONS' ]
    }]
}
