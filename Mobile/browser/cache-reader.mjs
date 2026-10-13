// Bounds-checked big-endian OSRS cache reader; smart layouts match TSPS ByteBuffer.
export class ByteBuffer {
    constructor(data){
        if(!(data instanceof Uint8Array)&&!(data instanceof Int8Array))throw new TypeError("Invalid cache bytes");
        this.data=data;this._offset=0;
    }
    get length(){return this.data.length;}
    get offset(){return this._offset;}
    set offset(value){
        if(!Number.isInteger(value)||value<0||value>this.length)throw new Error("Cache offset out of bounds");
        this._offset=value;
    }
    getByte(at){
        if(!Number.isInteger(at)||at<0||at>=this.length)throw new Error("Truncated cache data");
        return this.data[at]<<24>>24;
    }
    getUnsignedByte(at){return this.getByte(at)&255;}
    readByte(){const n=this.getByte(this.offset);this._offset++;return n;}
    readUnsignedByte(){return this.readByte()&255;}
    readUnsignedShort(){return this.readUnsignedByte()<<8|this.readUnsignedByte();}
    readShort(){return this.readUnsignedShort()<<16>>16;}
    readFloat(){
        const bits=this.readInt(),data=new DataView(new ArrayBuffer(4));
        data.setInt32(0,bits);return data.getFloat32(0);
    }
    readMedium(){return this.readUnsignedByte()<<16|this.readUnsignedShort();}
    readInt(){return this.readUnsignedByte()<<24|this.readUnsignedByte()<<16|this.readUnsignedShort();}
    readUnsignedSmart(){return this.getUnsignedByte(this.offset)<128?this.readUnsignedByte():this.readUnsignedShort()-32768;}
    readSmart2(){return this.getUnsignedByte(this.offset)<128?this.readUnsignedByte()-64:this.readUnsignedShort()-49152;}
    readSmart3(){
        let total=0,n;
        do{n=this.readUnsignedSmart();total+=n;if(total>0x7fffffff)throw new Error("Cache smart overflow");}while(n===32767);
        return total;
    }
    readString(){
        let text="",n;
        while((n=this.readUnsignedByte())!==0){
            if(text.length>=4096)throw new Error("Cache string exceeds limit");text+=String.fromCharCode(n);
        }
        return text;
    }
}
