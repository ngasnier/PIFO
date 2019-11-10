/* 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
#include <mpi.h>
#include <iostream>
#include "nodempi.h"

// Pour que ça marche...
//export LD_PRELOAD=/usr/lib/x86_64-linux-gnu/openmpi/lib/libmpi.so

    /*if (info.Length()<1 || !info[0].IsArray()) {
    Napi::TypeError::New(env, "Array expected").ThrowAsJavaScriptException();
    }
    
    Napi::Array jsargv = info[0].As<Napi::Array>();
    int argc = jsargv.Length();  
    char* argv[argc];
    for (int i = 0; i < argc; i++) {
        Napi::String str = jsargv.Get(i).As<Napi::String>();
        argv[i] = (char*)str.operator std::string().c_str();
    }
    int* aaaargh = &argc;
    char** aaaargv = (char**)argv;*/    

void nodempi::mpiInit(const Napi::CallbackInfo& info)
{    
    Napi::Env env = info.Env();
    
    int initialized;
    int ret = MPI_Initialized(&initialized);
    if (ret!=MPI_SUCCESS) Napi::Error::New(env, "MPI error : "+ret).ThrowAsJavaScriptException();
    if (!initialized) {
        ret = MPI_Init(NULL, NULL);
    }
    if (ret!=MPI_SUCCESS) { Napi::Error::New(env, "MPI error : "+ret).ThrowAsJavaScriptException(); return; }
}

void nodempi::mpiFinalize(const Napi::CallbackInfo& info)
{    
    MPI_Finalize();
}

Napi::Number nodempi::CommSize(const Napi::CallbackInfo& info)
{    
    Napi::Env env = info.Env();
    int world_size;
    int ret = MPI_Comm_size(MPI_COMM_WORLD, &world_size);
    if (ret!=MPI_SUCCESS) { Napi::Error::New(env, "MPI error : "+ret).ThrowAsJavaScriptException(); return Napi::Number::New(env, 0); }
    return Napi::Number::New(env, world_size);
}

Napi::Number nodempi::CommRank(const Napi::CallbackInfo& info)
{    
    Napi::Env env = info.Env();
    int world_rank;
    int ret = MPI_Comm_rank(MPI_COMM_WORLD, &world_rank);
    if (ret!=MPI_SUCCESS) { Napi::Error::New(env, "MPI error : "+ret).ThrowAsJavaScriptException(); return Napi::Number::New(env, 0); }
    return Napi::Number::New(env, world_rank);
}

void nodempi::Barrier(const Napi::CallbackInfo& info)
{
     Napi::Env env = info.Env();
     int ret = MPI_Barrier(MPI_COMM_WORLD); 
     if (ret!=MPI_SUCCESS) Napi::Error::New(env, "MPI error : "+ret).ThrowAsJavaScriptException();
}

void nodempi::Send(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 5) { Napi::Error::New(env, "5 parameters expected").ThrowAsJavaScriptException(); return; }
    if (!info[0].IsTypedArray()) { Napi::TypeError::New(env, "Param 1 : typed array expected").ThrowAsJavaScriptException(); return; }
    if (!info[1].IsNumber()) { Napi::TypeError::New(env, "Param 2 : Number expected").ThrowAsJavaScriptException(); return; }
    if (!info[2].IsBuffer()) { Napi::TypeError::New(env, "Param 3 : Buffer expected").ThrowAsJavaScriptException(); return; }
    if (!info[3].IsNumber()) { Napi::TypeError::New(env, "Param 4 : Number expected").ThrowAsJavaScriptException(); return; }
    if (!info[4].IsNumber()) { Napi::TypeError::New(env, "Param 5 : Number expected").ThrowAsJavaScriptException(); return; }
    
    Napi::Float64Array data = info[0].As<Napi::Float64Array>();
    int count = info[1].As<Napi::Number>().Int32Value();
    Napi::Buffer<MPI_Datatype> send_type = info[2].As<Napi::Buffer<MPI_Datatype>>();
    int destination = info[3].As<Napi::Number>().Int32Value();
    int tag = info[4].As<Napi::Number>().Int32Value();
    
    int ret = MPI_Send(
            data.Data(),
            count,
            (MPI_Datatype)send_type.Data(),
            destination,
            tag,
            MPI_COMM_WORLD);
    if (ret!=MPI_SUCCESS) { Napi::Error::New(env, "MPI error : "+ret).ThrowAsJavaScriptException(); return; }
}

void nodempi::Receive(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 5) { Napi::Error::New(env, "5 parameters expected").ThrowAsJavaScriptException(); return; }
    if (!info[0].IsTypedArray()) { Napi::TypeError::New(env, "Param 1 : typed array expected").ThrowAsJavaScriptException(); return; }
    if (!info[1].IsNumber()) { Napi::TypeError::New(env, "Param 2 : Number expected").ThrowAsJavaScriptException(); return; }
    if (!info[2].IsBuffer()) { Napi::TypeError::New(env, "Param 3 : Buffer expected").ThrowAsJavaScriptException(); return; }
    if (!info[3].IsNumber()) { Napi::TypeError::New(env, "Param 4 : Number expected").ThrowAsJavaScriptException(); return; }
    if (!info[4].IsNumber()) { Napi::TypeError::New(env, "Param 5 : Number expected").ThrowAsJavaScriptException(); return; }
    
    Napi::Float64Array data = info[0].As<Napi::Float64Array>();
    int count = info[1].As<Napi::Number>().Int32Value();
    Napi::Buffer<MPI_Datatype> rcv_type = info[2].As<Napi::Buffer<MPI_Datatype>>();
    int source = info[3].As<Napi::Number>().Int32Value();
    int tag = info[4].As<Napi::Number>().Int32Value();
    MPI_Status status;
    
    int ret = MPI_Recv(
            data.Data(),
            count,
            (MPI_Datatype)rcv_type.Data(),
            source,
            tag,
            MPI_COMM_WORLD,
            &status);
    if (ret!=MPI_SUCCESS) { Napi::Error::New(env, "MPI error : "+ret).ThrowAsJavaScriptException(); return; }
}

void nodempi::Scatter(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 5) { Napi::Error::New(env, "7 parameters expected").ThrowAsJavaScriptException(); return; }
    if (!info[0].IsNull() && !info[0].IsTypedArray()) { Napi::TypeError::New(env, "Param 1 : typed array expected").ThrowAsJavaScriptException(); return; }
    if (!info[1].IsNumber()) { Napi::TypeError::New(env, "Param 2 : Number expected").ThrowAsJavaScriptException(); return; }
    if (!info[2].IsBuffer()) { Napi::TypeError::New(env, "Param 3 : Buffer expected").ThrowAsJavaScriptException(); return; }
    if (!info[3].IsTypedArray()) { Napi::TypeError::New(env, "Param 4 : typed array expected").ThrowAsJavaScriptException(); return; }
    if (!info[4].IsNumber()) { Napi::TypeError::New(env, "Param 5 : Number expected").ThrowAsJavaScriptException(); return; }
    if (!info[5].IsBuffer()) { Napi::TypeError::New(env, "Param 6 : Buffer expected").ThrowAsJavaScriptException(); return; }
    if (!info[6].IsNumber()) { Napi::TypeError::New(env, "Param 7 : Number expected").ThrowAsJavaScriptException(); return; }

    
    void* send_data = NULL;
    if (!info[0].IsNull())
    {
        Napi::Float64Array send_data_prm = info[0].As<Napi::Float64Array>();
        send_data = send_data_prm.Data();
    }
    int send_count = info[1].As<Napi::Number>().Int32Value();
    Napi::Buffer<MPI_Datatype> send_type = info[2].As<Napi::Buffer<MPI_Datatype>>();
    Napi::Float64Array rcv_data = info[3].As<Napi::Float64Array>();
    int recv_count = info[4].As<Napi::Number>().Int32Value();
    Napi::Buffer<MPI_Datatype> rcv_type = info[5].As<Napi::Buffer<MPI_Datatype>>();
    int root = info[6].As<Napi::Number>().Int32Value();
    

    int ret = MPI_Scatter(
            send_data,
            send_count,
            (MPI_Datatype)send_type.Data(),
            rcv_data.Data(),
            recv_count,
            (MPI_Datatype)rcv_type.Data(),
            root,
            MPI_COMM_WORLD);
    if (ret!=MPI_SUCCESS) { Napi::Error::New(env, "MPI error : "+ret).ThrowAsJavaScriptException(); return; }
}

void nodempi::Scatterv(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 8) { Napi::Error::New(env, "8 parameters expected").ThrowAsJavaScriptException(); return; }
    if (!info[0].IsNull() && !info[0].IsTypedArray()) { Napi::TypeError::New(env, "Param 1 : typed array expected").ThrowAsJavaScriptException(); return; }
    if (!info[1].IsNull() && !info[1].IsTypedArray()) { Napi::TypeError::New(env, "Param 2 : typed array expected").ThrowAsJavaScriptException(); return; }
    if (!info[2].IsNull() && !info[2].IsTypedArray()) { Napi::TypeError::New(env, "Param 3 : typed array expected").ThrowAsJavaScriptException(); return; }
    if (!info[3].IsBuffer()) { Napi::TypeError::New(env, "Param 4 : Buffer expected").ThrowAsJavaScriptException(); return; }
    if (!info[4].IsTypedArray()) { Napi::TypeError::New(env, "Param 5 : typed array expected").ThrowAsJavaScriptException(); return; }
    if (!info[5].IsNumber()) { Napi::TypeError::New(env, "Param 6 : Number expected").ThrowAsJavaScriptException(); return; }
    if (!info[6].IsBuffer()) { Napi::TypeError::New(env, "Param 7 : Buffer expected").ThrowAsJavaScriptException(); return; }
    if (!info[7].IsNumber()) { Napi::TypeError::New(env, "Param 8 : Number expected").ThrowAsJavaScriptException(); return; }
    
    void* send_data = NULL;
    if (!info[0].IsNull())
    {
        Napi::Float64Array send_data_prm = info[0].As<Napi::Float64Array>();
        send_data = send_data_prm.Data();
    }
    int* send_count = NULL;
    if (!info[1].IsNull())
    {
        Napi::Int32Array send_count_prm = info[1].As<Napi::Int32Array>();
        send_count = send_count_prm.Data();
    }    
    int* displs = NULL;
    if (!info[2].IsNull())
    {
        Napi::Int32Array displs_prm = info[2].As<Napi::Int32Array>();
        displs = displs_prm.Data();
    }    
    Napi::Buffer<MPI_Datatype> send_type = info[3].As<Napi::Buffer<MPI_Datatype>>();
    Napi::Float64Array rcv_data = info[4].As<Napi::Float64Array>();
    int recv_count = info[5].As<Napi::Number>().Int32Value();
    Napi::Buffer<MPI_Datatype> rcv_type = info[6].As<Napi::Buffer<MPI_Datatype>>();
    int root = info[7].As<Napi::Number>().Int32Value();

    int ret = MPI_Scatterv(
            send_data,
            send_count,
            displs,
            (MPI_Datatype)*send_type.Data(),
            rcv_data.Data(),
            recv_count,
            (MPI_Datatype)rcv_type.Data(),
            root,
            MPI_COMM_WORLD);
    if (ret!=MPI_SUCCESS) { Napi::Error::New(env, "MPI error : "+ret).ThrowAsJavaScriptException(); return; }
}

void nodempi::Gather(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 7) { Napi::Error::New(env, "7 parameters expected").ThrowAsJavaScriptException(); return; }
    if (!info[0].IsTypedArray()) { Napi::TypeError::New(env, "Param 1 : typed array expected").ThrowAsJavaScriptException(); return; }
    if (!info[1].IsNumber()) { Napi::TypeError::New(env, "Param 2 : Number expected").ThrowAsJavaScriptException(); return; }
    if (!info[2].IsBuffer()) { Napi::TypeError::New(env, "Param 3 : Buffer expected").ThrowAsJavaScriptException(); return; }
    if (!info[3].IsNull() && !info[3].IsTypedArray()) { Napi::TypeError::New(env, "Param 4 : typed array expected").ThrowAsJavaScriptException(); return; }
    if (!info[4].IsNumber()) { Napi::TypeError::New(env, "Param 5 : Number expected").ThrowAsJavaScriptException(); return; }
    if (!info[5].IsBuffer()) { Napi::TypeError::New(env, "Param 6 : Buffer expected").ThrowAsJavaScriptException(); return; }
    if (!info[6].IsNumber()) { Napi::TypeError::New(env, "Param 7 : Number expected").ThrowAsJavaScriptException(); return; }

    
    Napi::Float64Array send_data = info[0].As<Napi::Float64Array>();
    int send_count = info[1].As<Napi::Number>().Int32Value();
    Napi::Buffer<MPI_Datatype> send_type = info[2].As<Napi::Buffer<MPI_Datatype>>();
    void* recv_data = NULL;
    if (!info[3].IsNull())
    {
        Napi::Float64Array recv_data_prm = info[3].As<Napi::Float64Array>();
        recv_data = recv_data_prm.Data();
    }
    int recv_count = info[4].As<Napi::Number>().Int32Value();
    Napi::Buffer<MPI_Datatype> rcv_type = info[5].As<Napi::Buffer<MPI_Datatype>>();
    int root = info[6].As<Napi::Number>().Int32Value();

    int ret = MPI_Gather(
            send_data.Data(),
            send_count,
            (MPI_Datatype)send_type.Data(),
            recv_data,
            recv_count,
            (MPI_Datatype)rcv_type.Data(),
            root,
            MPI_COMM_WORLD);

    if (ret!=MPI_SUCCESS) { Napi::Error::New(env, "MPI error : "+ret).ThrowAsJavaScriptException(); return; }
}


void nodempi::Gatherv(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 8) { Napi::Error::New(env, "8 parameters expected").ThrowAsJavaScriptException(); return; }
    if (!info[0].IsTypedArray()) { Napi::TypeError::New(env, "Param 1 : typed array expected").ThrowAsJavaScriptException(); return; }
    if (!info[1].IsNumber()) { Napi::TypeError::New(env, "Param 2 : number expected").ThrowAsJavaScriptException(); return; }
    if (!info[2].IsBuffer()) { Napi::TypeError::New(env, "Param 3 : Buffer expected").ThrowAsJavaScriptException(); return; }
    if (!info[3].IsNull() && !info[3].IsTypedArray()) { Napi::TypeError::New(env, "Param 4 : typed array expected").ThrowAsJavaScriptException(); return; }
    if (!info[4].IsNull() && !info[4].IsTypedArray()) { Napi::TypeError::New(env, "Param 5 : typed array expected").ThrowAsJavaScriptException(); return; }
    if (!info[5].IsNull() && !info[5].IsTypedArray()) { Napi::TypeError::New(env, "Param 6 : typed array expected").ThrowAsJavaScriptException(); return; }
    if (!info[6].IsBuffer()) { Napi::TypeError::New(env, "Param 7 : Buffer expected").ThrowAsJavaScriptException(); return; }
    if (!info[7].IsNumber()) { Napi::TypeError::New(env, "Param 8 : number expected").ThrowAsJavaScriptException(); return; }
    
    Napi::Float64Array send_data = info[0].As<Napi::Float64Array>();
    int send_count = info[1].As<Napi::Number>().Int32Value();
    Napi::Buffer<MPI_Datatype> send_type = info[2].As<Napi::Buffer<MPI_Datatype>>();
    void* recv_data = NULL;
    if (!info[3].IsNull())
    {
        Napi::Float64Array recv_data_prm = info[3].As<Napi::Float64Array>();
        recv_data = recv_data_prm.Data();
    }
    int* recv_count = NULL;
    if (!info[4].IsNull())
    {
        Napi::Int32Array recv_count_prm = info[4].As<Napi::Int32Array>();
        recv_count = recv_count_prm.Data();
    }    
    int* displs = NULL;
    if (!info[5].IsNull())
    {
        Napi::Int32Array displs_prm = info[5].As<Napi::Int32Array>();
        displs = displs_prm.Data();
    }    
    Napi::Buffer<MPI_Datatype> rcv_type = info[6].As<Napi::Buffer<MPI_Datatype>>();
    int root = info[7].As<Napi::Number>().Int32Value();

    int ret = MPI_Gatherv(
            send_data.Data(),
            send_count,
            (MPI_Datatype)send_type.Data(),
            recv_data,
            recv_count,
            displs,
            (MPI_Datatype)*rcv_type.Data(),
            root,
            MPI_COMM_WORLD);

    if (ret!=MPI_SUCCESS) { Napi::Error::New(env, "MPI error : "+ret).ThrowAsJavaScriptException(); return; }
}

void MPIDatatypeFinalizer(Napi::Env env, MPI_Datatype* t)
{
    delete t;
}

Napi::Value nodempi::TypeCreateSubarray(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 6) { Napi::Error::New(env, "6 parameters expected").ThrowAsJavaScriptException(); return env.Null(); }
    if (!info[0].IsNumber()) { Napi::TypeError::New(env, "Param 1 : Number expected").ThrowAsJavaScriptException(); return env.Null(); }
    if (!info[1].IsTypedArray()) { Napi::TypeError::New(env, "Param 2 : Typed array expected").ThrowAsJavaScriptException(); return env.Null(); }
    if (!info[2].IsTypedArray()) { Napi::TypeError::New(env, "Param 3 : Typed array expected").ThrowAsJavaScriptException(); return env.Null(); }
    if (!info[2].IsTypedArray()) { Napi::TypeError::New(env, "Param 4 : Typed array expected").ThrowAsJavaScriptException(); return env.Null(); }
    if (!info[4].IsNumber()) { Napi::TypeError::New(env, "Param 5 : Number expected").ThrowAsJavaScriptException(); return env.Null(); }
    if (!info[5].IsBuffer()) { Napi::TypeError::New(env, "Param 6 : Buffer expected").ThrowAsJavaScriptException(); return env.Null(); }
        
    int ndims = info[0].As<Napi::Number>().Int32Value();
    Napi::Int32Array array_of_sizes = info[1].As<Napi::Int32Array>();
    Napi::Int32Array array_of_subsizes = info[2].As<Napi::Int32Array>();
    Napi::Int32Array array_of_starts = info[3].As<Napi::Int32Array>();
    int order = info[4].As<Napi::Number>().Int32Value();
    Napi::Buffer<MPI_Datatype> oldtype = info[5].As<Napi::Buffer<MPI_Datatype>>();
    
    MPI_Datatype* type = new MPI_Datatype;
    int ret = MPI_Type_create_subarray(
            ndims, 
            array_of_sizes.Data(), 
            array_of_subsizes.Data(), 
            array_of_starts.Data(), 
            order, 
            (MPI_Datatype)oldtype.Data(), 
            type);
    if (ret!=MPI_SUCCESS) { Napi::Error::New(env, "MPI error : "+ret).ThrowAsJavaScriptException(); return env.Null(); }
    
    return Napi::Buffer<MPI_Datatype>::New(env, type, 1, MPIDatatypeFinalizer);    
}

Napi::Value nodempi::TypeCreateResized(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 3) { Napi::Error::New(env, "4 parameters expected").ThrowAsJavaScriptException(); return env.Null(); }
    if (!info[0].IsBuffer()) { Napi::TypeError::New(env, "Param 1 : Buffer expected").ThrowAsJavaScriptException(); return env.Null(); }
    if (!info[1].IsNumber()) { Napi::TypeError::New(env, "Param 2 : Number expected").ThrowAsJavaScriptException(); return env.Null(); }
    if (!info[2].IsNumber()) { Napi::TypeError::New(env, "Param 3 : Number expected").ThrowAsJavaScriptException(); return env.Null(); }
    
    
    Napi::Buffer<MPI_Datatype> oldtype = info[0].As<Napi::Buffer<MPI_Datatype>>();
    int lb = info[1].As<Napi::Number>().Int32Value();
    int extent = info[2].As<Napi::Number>().Int32Value();
    
    MPI_Datatype* type = new MPI_Datatype;    
    int ret = MPI_Type_create_resized(
            (MPI_Datatype)*oldtype.Data(), 
            lb,
            extent, 
            type);
    if (ret!=MPI_SUCCESS) { Napi::Error::New(env, "MPI error : "+ret).ThrowAsJavaScriptException(); return env.Null(); }
    
    return Napi::Buffer<MPI_Datatype>::New(env, type, 1, MPIDatatypeFinalizer); 
}

void nodempi::TypeCommit(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 1) { Napi::Error::New(env, "1 parameter expected").ThrowAsJavaScriptException(); return; }
    if (!info[0].IsBuffer()) { Napi::TypeError::New(env, "Param 1 : Buffer expected").ThrowAsJavaScriptException(); return; }
    
    Napi::Buffer<MPI_Datatype> type = info[0].As<Napi::Buffer<MPI_Datatype>>();
    MPI_Datatype* the_type = (MPI_Datatype*)type.Data();
    int ret = MPI_Type_commit(the_type);    
    if (ret!=MPI_SUCCESS) Napi::Error::New(env, "MPI error : "+ret).ThrowAsJavaScriptException();
}


Napi::Object nodempi::Init(Napi::Env env, Napi::Object exports) 
{
    /* FONCTIONS ============================================================ */
    exports.Set("Init", Napi::Function::New(env, nodempi::mpiInit));  
    exports.Set("Finalize", Napi::Function::New(env, nodempi::mpiFinalize));  
    exports.Set("Barrier", Napi::Function::New(env, nodempi::Barrier));
    exports.Set("CommSize", Napi::Function::New(env, nodempi::CommSize));  
    exports.Set("CommRank", Napi::Function::New(env, nodempi::CommRank));  
    exports.Set("Send", Napi::Function::New(env, nodempi::Send));  
    exports.Set("Receive", Napi::Function::New(env, nodempi::Receive));  
    exports.Set("Scatter", Napi::Function::New(env, nodempi::Scatter));  
    exports.Set("Scatterv", Napi::Function::New(env, nodempi::Scatterv));  
    exports.Set("Gather", Napi::Function::New(env, nodempi::Gather));
    exports.Set("Gatherv", Napi::Function::New(env, nodempi::Gatherv));
    exports.Set("TypeCreateSubarray", Napi::Function::New(env, nodempi::TypeCreateSubarray));
    exports.Set("TypeCreateResized", Napi::Function::New(env, nodempi::TypeCreateResized));
    exports.Set("TypeCommit", Napi::Function::New(env, nodempi::TypeCommit));
        
    /* CONSTANTES DE TYPE =================================================== */        
    exports.Set("MPI_DATATYPE_NULL", Napi::Buffer<MPI_Datatype>::New(env, (MPI_Datatype*)MPI_DATATYPE_NULL, 1));
    exports.Set("MPI_BYTE", Napi::Buffer<MPI_Datatype>::New(env, (MPI_Datatype*)MPI_BYTE, 1));
    exports.Set("MPI_CHAR", Napi::Buffer<MPI_Datatype>::New(env, (MPI_Datatype*)MPI_CHAR, 1));    
    exports.Set("MPI_SHORT", Napi::Buffer<MPI_Datatype>::New(env, (MPI_Datatype*)MPI_SHORT, 1));
    exports.Set("MPI_INT", Napi::Buffer<MPI_Datatype>::New(env, (MPI_Datatype*)MPI_INT, 1));
    exports.Set("MPI_LONG", Napi::Buffer<MPI_Datatype>::New(env, (MPI_Datatype*)MPI_LONG, 1));
    exports.Set("MPI_FLOAT", Napi::Buffer<MPI_Datatype>::New(env, (MPI_Datatype*)MPI_FLOAT, 1));
    exports.Set("MPI_DOUBLE", Napi::Buffer<MPI_Datatype>::New(env, (MPI_Datatype*)MPI_DOUBLE, 1));
    exports.Set("MPI_LONG_DOUBLE", Napi::Buffer<MPI_Datatype>::New(env, (MPI_Datatype*)MPI_LONG_DOUBLE, 1));
    exports.Set("MPI_UNSIGNED_CHAR", Napi::Buffer<MPI_Datatype>::New(env, (MPI_Datatype*)MPI_UNSIGNED_CHAR, 1));
    exports.Set("MPI_SIGNED_CHAR", Napi::Buffer<MPI_Datatype>::New(env, (MPI_Datatype*)MPI_SIGNED_CHAR, 1));
    exports.Set("MPI_UNSIGNED_SHORT", Napi::Buffer<MPI_Datatype>::New(env, (MPI_Datatype*)MPI_UNSIGNED_SHORT, 1));
    exports.Set("MPI_UNSIGNED_LONG", Napi::Buffer<MPI_Datatype>::New(env, (MPI_Datatype*)MPI_UNSIGNED_LONG, 1));

    /* CONSTANTES DIVERSES ================================================== */
    exports.Set("MPI_ORDER_C", Napi::Value::From<int>(env, MPI_ORDER_C));
    exports.Set("MPI_ORDER_FORTRAN", Napi::Value::From<int>(env, MPI_ORDER_FORTRAN));
 
    return exports;
}

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  return nodempi::Init(env, exports);
}

NODE_API_MODULE(nodempi, InitAll)