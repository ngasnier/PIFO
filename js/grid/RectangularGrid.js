/* 
 * Copyright (C) 2020 Nicolas GASNIER (http://www.meteo-blois.fr/contact/)
 *
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


export class RectangularGrid {
    
    constructor()
    {
        this._width = 0;
        this._height = 0;
        this._haloSize = 0;
        this._cyclic = false;
    }
    
    /**
     * 
     * @returns {Number}
     */
    get width()
    {
        return this._width;
    }
    
    /**
     * 
     * @param {type} w
     * @returns {undefined}
     */
    set width(w)
    {
        this._width = w;
    }
    
    /**
     * 
     * @returns {Number}
     */
    get height()
    {
        return this._height;
    }
    
    /**
     * 
     * @param {type} h
     * @returns {undefined}
     */
    set height(h)
    {
        this._height = h;
    }
        
    /**
     * 
     * @returns {@param;RectangularGrid.set haloSize:h|Number}
     */
    get haloSize()
    {
        return this._haloSize;
    }
    
    /**
     * 
     * @param {type} h
     * @returns {undefined}
     */
    set haloSize(h)
    {
        this._haloSize = h;
    }
    
    /**
     * 
     * @returns {Number}
     */
    get cyclic()
    {
        return this._cyclic;
    }
    
    /**
     * 
     * @param {type} c
     * @returns {undefined}
     */
    set cyclic(c)
    {
        this._cyclic = c;
    }

    /**
     * 
     * @returns {Number}
     */
    get iBegin()
    {
        return 0;
    }
    
    /**
     * 
     * @returns {Number}
     */
    get iBeginHalo()
    {
        return this._haloSize;
    }
    
    /**
     * 
     * @returns {Number}
     */
    get iEndHalo()
    {
        return this._width-this._haloSize;
    }
    
    /**
     * 
     * @returns {Number}
     */
    get iEnd()
    {
        return this._width;
    }
    
    /**
     * 
     * @returns {Number}
     */
    get jBegin()
    {
        return 0;
    }
    
    /**
     * 
     * @returns {Number}
     */
    get jBeginHalo()
    {
        return this._haloSize;
    }
    
    /**
     * 
     * @returns {Number}
     */
    get jEndHalo()
    {
        return this._height-this._haloSize;
    }
    
    /**
     * 
     * @returns {Number}
     */
    get jEnd()
    {
        return this._height;
    }
    
    /**
     * 
     * @returns {RectangularGrid.getNodeIds.ids}
     */
    getNodeIds()
    {
        var ids = new Int32Array(this.width*this.height);
        var id = 0;
        for (var j=0;j<this.width;j++)
        {
            for (var i=0;i<this.width;i++,id++)
            {
                ids[id] = id;
            }
        }
        return ids;
    }
    
    /**
     * 
     * @returns {RectangularGrid.getHaloIds.ids}
     */
    getHaloIds()
    {
        var ids = new Int32Array(this.width*this.haloSize*2 + ((this.height-2*this.haloSize)*this.haloSize*2));
        var id = 0;
        var k = 0;
        
        ids = this.getTopHaloIds(ids, k);
        
        k+=(this.width-this.haloSize)*this.haloSize;
        ids = this.getRightHaloIds(ids, k);
        
        k+=(this.height-this.haloSize)*this.haloSize;
        ids = this.getBottomHaloIds(ids, k);
        
        k+=(this.width-this.haloSize)*this.haloSize;
        ids = this.getLeftHaloIds(ids, k);
        
        return ids;
    }
    
    getTopHaloIds(pIds=null,pStart=0)
    {
        var id = 0;
        var ids = pIds;
        var k = 0;
        if (pIds!=null)
        {
            k = pStart;
        }
        else
        {
            ids = new Int32Array((this.width-this.haloSize)*this.haloSize);
        }
        
        // Top border : from beginning to rigth border halo
        for (var j=0;j<this.haloSize;j++,id+=this.haloSize)
        {
            for (var i=0;i<this.iEndHalo;i++,id++,k++)
            {
                ids[k] = id;
            }
        }
        return ids;
    }
    
    getRightHaloIds(pIds=null,pStart=0)
    {
        var id = this.iEndHalo;
        var ids = pIds;
        var k = 0;
        if (pIds!=null)
        {
            k = pStart;
        }
        else
        {
            ids = new Int32Array((this.height-this.haloSize)*this.haloSize);
        }
        
        // Right border : from after top border halo to bottom halo
        for (var j=0;j<this.jEndHalo;j++,id+=this.width-this.haloSize)
        {
            for (var i=this.iEndHalo;i<this.iEnd;i++,id++,k++)
            {
                ids[k] = id;
            }
        }
        
        return ids;
    }

    getBottomHaloIds(pIds=null,pStart=0)
    {
        var id = this.iBeginHalo+this.jEndHalo*this.width;
        var ids = pIds;
        var k = 0;
        if (pIds!=null)
        {
            k = pStart;
        }
        else
        {
            ids = new Int32Array((this.width-this.haloSize)*this.haloSize);
        }
        
        // Bottom border : from left border halo to end    
        for (var j=this.jEndHalo;j<this.jEnd;j++,id+=this.haloSize)
        {
            for (var i=this.iBeginHalo;i<this.iEnd;i++,id++,k++)
            {
                ids[k] = id;
            }
        }
        
        return ids;
    }

    getLeftHaloIds(pIds=null,pStart=0)
    {
        var id = this.iBegin+this.jBeginHalo*this.width;
        var ids = pIds;
        var k = 0;
        if (pIds!=null)
        {
            k = pStart;
        }
        else
        {
            ids = new Int32Array((this.height-this.haloSize)*this.haloSize);
        }
        
        // Left border : from top border halo to end
        id = this.iBegin+this.jBeginHalo*this.width;
        for (var j=this.jBeginHalo;j<this.jEnd;j++,id+=this.width-this.haloSize)
        {
            for (var i=this.iBegin;i<this.iBeginHalo;i++,id++,k++)
            {
                ids[k] = id;
            }
        }
        
        return ids;
    }

    /**
     * 
     * @returns {RectangularGrid.getInsideIds.ids}
     */
    getAreaIds()
    {
        var ids = new Int32Array(this.width*this.height);
        var id = this.iBeginHalo+this.jBeginHalo*this.width;
        var k = 0;
        for (var j=this.jBeginHalo;j<this.jEndHalo;j++,id+=2*this.haloSize)
        {
            for (var i=this.iBeginHalo;i<this.iEndHalo;i++,id++,k++)
            {
                ids[k] = id;
            }
        }
        return ids;
    }
}