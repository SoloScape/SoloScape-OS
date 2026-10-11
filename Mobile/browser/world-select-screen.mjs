// Revision-240 in-game world selector: render the same fixed 765x503 grid
// and cache sprite families as the original OpenOSRS game client's world list.
// The current SoloScape server only advertises World 255; never invent worlds.
export const WORLD_SELECT_LAYOUT=Object.freeze({
    width:765,height:503,headerHeight:23,titleWidth:125,
    rowX:338,rowY:253,rowWidth:88,rowHeight:19,
    cancelX:708,cancelY:4,cancelWidth:50,cancelHeight:16,
    columns:Object.freeze([
        Object.freeze({x:280,label:"World"}),
        Object.freeze({x:390,label:"Players"}),
        Object.freeze({x:500,label:"Location"}),
        Object.freeze({x:610,label:"Type"}),
    ]),
});
const draw=(font,ctx,text,x,y,color="#ffffff")=>font?.draw(ctx,text,x,y,color,false);
const centered=(font,ctx,text,x,y,color="#ffffff")=>
    draw(font,ctx,text,Math.floor(x-(font?.measure(text)??0)/2),y,color);
function gradient(ctx,x,y,width,height,first,last){
    if(ctx.createLinearGradient){
        const g=ctx.createLinearGradient(x,y,x,y+height);
        g.addColorStop(0,first);g.addColorStop(1,last);ctx.fillStyle=g;
    }else ctx.fillStyle=first;
    ctx.fillRect(x,y,width,height);
}
function arrow(ctx,x,y,pointUp,selected){
    ctx.beginPath();
    if(pointUp){ctx.moveTo(x+6,y);ctx.lineTo(x+12,y+10);ctx.lineTo(x,y+10);}
    else{ctx.moveTo(x,y);ctx.lineTo(x+12,y);ctx.lineTo(x+6,y+10);}
    ctx.closePath();ctx.fillStyle=selected?"#ececec":"#ed3730";ctx.fill();
    ctx.strokeStyle="#520c0a";ctx.lineWidth=1;ctx.stroke();
}
function star(ctx,x,y,gold){
    ctx.fillStyle=gold?"#e3c453":"#c6c6c6";
    ctx.beginPath();
    for(let i=0;i<10;i++){
        const theta=-Math.PI/2+i*Math.PI/5,r=i%2?2.4:5;
        const px=x+5+Math.cos(theta)*r,py=y+5+Math.sin(theta)*r;
        if(!i)ctx.moveTo(px,py);else ctx.lineTo(px,py);
    }
    ctx.closePath();ctx.fill();
}
function ukFlag(ctx,x,y){
    ctx.fillStyle="#234681";ctx.fillRect(x,y,16,11);
    ctx.strokeStyle="#ffffff";ctx.lineWidth=3;ctx.beginPath();
    ctx.moveTo(x,y);ctx.lineTo(x+16,y+11);
    ctx.moveTo(x+16,y);ctx.lineTo(x,y+11);ctx.stroke();
    ctx.strokeStyle="#d12d36";ctx.lineWidth=1;ctx.stroke();
    ctx.fillStyle="#ffffff";ctx.fillRect(x+6,y,4,11);ctx.fillRect(x,y+4,16,3);
    ctx.fillStyle="#d12d36";ctx.fillRect(x+7,y,2,11);ctx.fillRect(x,y+5,16,1);
}
function sprite(ctx,sprites,name,index,x,y){
    const frame=sprites?.get(name)?.[index];
    if(!frame)return false;
    ctx.drawImage(frame,x,y);return true;
}
export function paintWorldSelect(ctx,{sprites,font,small,worldId=255,
        sortOption=0,sortDirection=0,hovered=false}={}){
    const g=WORLD_SELECT_LAYOUT;
    ctx.fillStyle="#000000";ctx.fillRect(0,0,g.width,g.height);
    gradient(ctx,0,0,g.titleWidth,g.headerHeight,"#bda9a9","#8b7a88");
    gradient(ctx,g.titleWidth,0,g.width-g.titleWidth,g.headerHeight,
        "#4f4f4f","#292929");
    centered(font,ctx,"Select a world",g.titleWidth/2,15,"#000000");
    if(!sprite(ctx,sprites,"sl_stars",1,140,1))star(ctx,140,1,true);
    if(!sprite(ctx,sprites,"sl_stars",0,140,12))star(ctx,140,12,false);
    draw(small,ctx,"Members only world",152,10);
    draw(small,ctx,"Free world",152,21);
    for(let i=0;i<g.columns.length;i++){
        const {x,label}=g.columns[i];
        if(!sprite(ctx,sprites,"sl_arrows",sortOption===i&&sortDirection===0?2:0,x,4))
            arrow(ctx,x,4,true,sortOption===i&&sortDirection===0);
        if(!sprite(ctx,sprites,"sl_arrows",sortOption===i&&sortDirection===1?3:1,x+15,4))
            arrow(ctx,x+15,4,false,sortOption===i&&sortDirection===1);
        draw(font,ctx,label,x+32,17);
    }
    ctx.fillStyle="#000000";
    ctx.fillRect(g.cancelX,g.cancelY,g.cancelWidth,g.cancelHeight);
    centered(small,ctx,"Cancel",g.cancelX+g.cancelWidth/2,16);
    const {rowX:x,rowY:y,rowWidth:w,rowHeight:h}=g;
    if(!sprite(ctx,sprites,"sl_back",0,x,y)){
        ctx.fillStyle="#596ba4";ctx.fillRect(x,y,w,h);
        ctx.strokeStyle="#303d70";ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,w-1,h-1);
    }
    if(!sprite(ctx,sprites,"sl_flags",1,x+29,y))ukFlag(ctx,x+29,y+4);
    centered(font,ctx,String(worldId),x+15,y+h/2+5,"#000000");
    centered(small,ctx,"0",x+60,y+h/2+5);
    if(hovered){
        ctx.save();ctx.globalAlpha=.35;ctx.fillStyle="#ffffff";
        ctx.fillRect(x,y,w,h);ctx.restore();
    }
}
