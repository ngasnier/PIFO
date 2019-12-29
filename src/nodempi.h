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
#include <napi.h>

namespace nodempi {
    void mpiInit(const Napi::CallbackInfo& info);
    Napi::Number CommSize(const Napi::CallbackInfo& info);
    Napi::Number CommRank(const Napi::CallbackInfo& info);
    Napi::Value CommSplit(const Napi::CallbackInfo& info);
    
    void mpiFinalize(const Napi::CallbackInfo& info);
    void Barrier(const Napi::CallbackInfo& info);
    void Send(const Napi::CallbackInfo& info);
    void Receive(const Napi::CallbackInfo& info);
    void Scatter(const Napi::CallbackInfo& info);
    void Scatterv(const Napi::CallbackInfo& info);
    void Gather(const Napi::CallbackInfo& info);
    void Gatherv(const Napi::CallbackInfo& info);
    void Alltoallw(const Napi::CallbackInfo& info);
    Napi::Value TypeCreateSubarray(const Napi::CallbackInfo& info);
    Napi::Value TypeCreateResized(const Napi::CallbackInfo& info);
    void TypeCommit(const Napi::CallbackInfo& info);
    
    Napi::Object Init(Napi::Env env, Napi::Object exports);
}