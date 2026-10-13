import java.util.Arrays;

/**
 * Experimental model projection. Vertex/face data come from revision-240 JS5
 * model archives. The unmodified original rev-240 yw.fn bytecode paints every
 * visible scanline. Perspective, face ordering and edge walking remain port
 * glue, NOT a claim that the original 3D Rasterizer3D is running yet.
 */
final class ModelView {
    private ModelView() {}
    static final int WIDTH = RendererBridge.WIDTH, HEIGHT = RendererBridge.HEIGHT;
    static final int MAX_VERTICES=12000, MAX_FACES=4500;

    static int[] ints(String s,int limit) {
        if(s==null||s.length()<1||s.length()>400000)throw new IllegalArgumentException("Invalid mesh data size");
        int count=1;
        for(int i=0;i<s.length();i++)if(s.charAt(i)==',')count++;
        if(count>limit)throw new IllegalArgumentException("Mesh has too many numbers");
        int[] data=new int[count];
        int at=0,sign=1,value=0,digits=0;
        for(int i=0;i<=s.length();i++){
            char ch=i==s.length()?',':s.charAt(i);
            if(ch==',' ){
                if(digits==0)throw new IllegalArgumentException("Empty mesh number");
                data[at++]=sign*value;sign=1;value=0;digits=0;
            }else if(ch=='-'&&digits==0&&sign==1){sign=-1;}
            else if(ch>='0'&&ch<='9'){
                if(++digits>9)throw new IllegalArgumentException("Oversized mesh number");
                value=value*10+(ch-'0');
            }else throw new IllegalArgumentException("Invalid mesh character");
        }
        return data;
    }

    private static int edge(double x0,double y0,double x1,double y1,double y,double[] cuts,int count) {
        if((y0<=y&&y<y1)||(y1<=y&&y<y0))
            cuts[count++]=x0+(y-y0)*(x1-x0)/(y1-y0);
        return count;
    }

    /** Triangular spans are painted by the original game's yw.fn method. */
    static void triangle(int x0,int y0,int x1,int y1,int x2,int y2,int rgb) {
        int from=Math.max(0,Math.min(y0,Math.min(y1,y2)));
        int to=Math.min(HEIGHT-1,Math.max(y0,Math.max(y1,y2)));
        double[] cuts=new double[3];
        for(int y=from;y<=to;y++){
            int count=0;double center=y+.5;
            count=edge(x0,y0,x1,y1,center,cuts,count);
            count=edge(x1,y1,x2,y2,center,cuts,count);
            count=edge(x2,y2,x0,y0,center,cuts,count);
            if(count<2)continue;
            double left=Math.min(cuts[0],cuts[1]),right=Math.max(cuts[0],cuts[1]);
            int start=Math.max(0,(int)Math.ceil(left-.5));
            int end=Math.min(WIDTH,(int)Math.ceil(right-.5));
            if(end>start)yw.fn(start,y,end-start,1,rgb);
        }
    }

    static int[] render(String packedVertices,String packedFaces,int yaw) {
        int[] verts=ints(packedVertices,MAX_VERTICES*3);
        int[] faces=ints(packedFaces,MAX_FACES*4);
        if(verts.length%3!=0||faces.length%4!=0||verts.length<9||faces.length<4)
            throw new IllegalArgumentException("Invalid model triangle layout");
        int n=verts.length/3,f=faces.length/4;
        long sumX=0,sumY=0,sumZ=0;
        int minX=Integer.MAX_VALUE,minY=Integer.MAX_VALUE,minZ=Integer.MAX_VALUE;
        int maxX=Integer.MIN_VALUE,maxY=Integer.MIN_VALUE,maxZ=Integer.MIN_VALUE;
        for(int i=0;i<verts.length;i+=3){
            int x=verts[i],y=verts[i+1],z=verts[i+2];
            if(Math.abs((long)x)>1_000_000||Math.abs((long)y)>1_000_000||Math.abs((long)z)>1_000_000)
                throw new IllegalArgumentException("Model coordinates out of range");
            sumX+=x;sumY+=y;sumZ+=z;
            minX=Math.min(minX,x);maxX=Math.max(maxX,x);
            minY=Math.min(minY,y);maxY=Math.max(maxY,y);
            minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);
        }
        double cx=(minX+(double)maxX)/2,cy=(minY+(double)maxY)/2,cz=(minZ+(double)maxZ)/2;
        double extent=Math.max(1,Math.max(maxX-minX,Math.max(maxY-minY,maxZ-minZ)));
        double angle=Math.toRadians(Math.floorMod(yaw,360)),s=Math.sin(angle),c=Math.cos(angle);
        double tilt=.28,ct=Math.sqrt(1-tilt*tilt);
        double scale=Math.min(WIDTH-38,HEIGHT-25)*.85/extent;
        int[] sx=new int[n],sy=new int[n],depth=new int[n];
        for(int i=0;i<n;i++){
            double x=verts[i*3]-cx,y=verts[i*3+1]-cy,z=verts[i*3+2]-cz;
            double xx=x*c-z*s,zz=x*s+z*c;
            double yy=y*ct-zz*tilt,dd=y*tilt+zz*ct;
            // Mild perspective matching the browser 3D camera convention.
            double perspective=1.0+dd/extent*.32;
            sx[i]=(int)Math.round(WIDTH/2.0+xx*scale/perspective);
            sy[i]=(int)Math.round(HEIGHT/2.0+yy*scale/perspective);
            depth[i]=(int)Math.round(dd*1000/extent);
        }
        long[] order=new long[f];
        for(int i=0;i<f;i++){
            int pos=i*4,a=faces[pos],b=faces[pos+1],cc=faces[pos+2],color=faces[pos+3];
            if(a<0||a>=n||b<0||b>=n||cc<0||cc>=n||color<0||color>0xffffff)
                throw new IllegalArgumentException("Model face index or color invalid");
            long priority=depth[a]+(long)depth[b]+depth[cc]+100000;
            order[i]=(priority<<16)|i;
        }
        Arrays.sort(order);
        int[] pixels=new int[WIDTH*HEIGHT];
        yw.aj=pixels;yw.ay=WIDTH;yw.aq=HEIGHT;yw.ad=null;
        yw.dn(0,0,WIDTH,HEIGHT);
        yw.fn(0,0,WIDTH,HEIGHT,0x101922);
        for(int i=f-1;i>=0;i--){
            int pos=(int)(order[i]&0xffff)*4;
            int a=faces[pos],b=faces[pos+1],cc=faces[pos+2];
            triangle(sx[a],sy[a],sx[b],sy[b],sx[cc],sy[cc],faces[pos+3]);
        }
        return pixels;
    }
}
