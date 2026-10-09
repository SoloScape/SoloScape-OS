// Column-major Float32 operations used by the pinned skeletal evaluator.
// Keep intermediates in JavaScript numbers, matching gl-matrix's default precision.
export const vec2={fromValues:(x,y)=>Float32Array.of(x,y)};
export const vec3={create:()=>new Float32Array(3),set:(out,x,y,z)=>{out[0]=x;out[1]=y;out[2]=z;return out;}};
const identity=out=>{out.fill(0);out[0]=out[5]=out[10]=out[15]=1;return out;};
function mul(out,a,b){
    // Snapshot each operand because pinned callers multiply in place.
    const av=Array.from(a),bv=Array.from(b);
    for(let c=0;c<4;c++)for(let r=0;r<4;r++)
        out[c*4+r]=av[r]*bv[c*4]+av[4+r]*bv[c*4+1]+av[8+r]*bv[c*4+2]+av[12+r]*bv[c*4+3];
    return out;
}
function invert(out,a){
    const a00=a[0],a01=a[1],a02=a[2],a03=a[3],a10=a[4],a11=a[5],a12=a[6],a13=a[7],
        a20=a[8],a21=a[9],a22=a[10],a23=a[11],a30=a[12],a31=a[13],a32=a[14],a33=a[15];
    const b00=a00*a11-a01*a10,b01=a00*a12-a02*a10,b02=a00*a13-a03*a10,
        b03=a01*a12-a02*a11,b04=a01*a13-a03*a11,b05=a02*a13-a03*a12,
        b06=a20*a31-a21*a30,b07=a20*a32-a22*a30,b08=a20*a33-a23*a30,
        b09=a21*a32-a22*a31,b10=a21*a33-a23*a31,b11=a22*a33-a23*a32;
    let det=b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06;
    if(!det)return null;det=1/det;
    out.set([(a11*b11-a12*b10+a13*b09)*det,(a02*b10-a01*b11-a03*b09)*det,
        (a31*b05-a32*b04+a33*b03)*det,(a22*b04-a21*b05-a23*b03)*det,
        (a12*b08-a10*b11-a13*b07)*det,(a00*b11-a02*b08+a03*b07)*det,
        (a32*b02-a30*b05-a33*b01)*det,(a20*b05-a22*b02+a23*b01)*det,
        (a10*b10-a11*b08+a13*b06)*det,(a01*b08-a00*b10-a03*b06)*det,
        (a30*b04-a31*b02+a33*b00)*det,(a21*b02-a20*b04-a23*b00)*det,
        (a11*b07-a10*b09-a12*b06)*det,(a00*b09-a01*b07+a02*b06)*det,
        (a31*b01-a30*b03-a32*b00)*det,(a20*b03-a21*b01+a22*b00)*det]);return out;
}
export const mat4={create:()=>identity(new Float32Array(16)),identity,copy:(out,a)=>{out.set(a);return out;},mul,invert,
    getTranslation:(out,a)=>vec3.set(out,a[12],a[13],a[14]),
    getScaling:(out,a)=>vec3.set(out,Math.sqrt(a[0]*a[0]+a[1]*a[1]+a[2]*a[2]),Math.sqrt(a[4]*a[4]+a[5]*a[5]+a[6]*a[6]),Math.sqrt(a[8]*a[8]+a[9]*a[9]+a[10]*a[10])),
    fromScaling:(out,v)=>{identity(out);out[0]=v[0];out[5]=v[1];out[10]=v[2];return out;},
    fromQuat:(out,q)=>{
        const x=q[0],y=q[1],z=q[2],w=q[3],x2=x+x,y2=y+y,z2=z+z,
            xx=x*x2,yx=y*x2,yy=y*y2,zx=z*x2,zy=z*y2,zz=z*z2,wx=w*x2,wy=w*y2,wz=w*z2;
        out.set([1-(yy+zz),yx+wz,zx-wy,0,yx-wz,1-(xx+zz),zy+wx,0,zx+wy,zy-wx,1-(xx+yy),0,0,0,0,1]);return out;
    }};
export const quat={create:()=>Float32Array.of(0,0,0,1),identity:out=>{out.set([0,0,0,1]);return out;},
    setAxisAngle:(out,axis,angle)=>{const s=Math.sin(angle/2);out[0]=axis[0]*s;out[1]=axis[1]*s;out[2]=axis[2]*s;out[3]=Math.cos(angle/2);return out;},
    mul:(out,a,b)=>{
        const ax=a[0],ay=a[1],az=a[2],aw=a[3],bx=b[0],by=b[1],bz=b[2],bw=b[3];
        out[0]=ax*bw+aw*bx+ay*bz-az*by;out[1]=ay*bw+aw*by+az*bx-ax*bz;
        out[2]=az*bw+aw*bz+ax*by-ay*bx;out[3]=aw*bw-ax*bx-ay*by-az*bz;return out;
    }};
