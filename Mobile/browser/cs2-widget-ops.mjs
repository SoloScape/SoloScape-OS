// Widget/property opcode subset for SoloScape's cache-backed renderer.
// Only operations with an actual representable effect are handled here.
export function executeWidgetCs2(op,widget,ints,strings,pop,take,write){
    if(!widget)return false;
    const set=(key,value)=>write(widget,{[key]:value});
    const value=()=>pop(ints);
    const flag=()=>value()===1;
    switch(op){
        case 1000:{const [x,y,xm,ym]=take(ints,4);write(widget,{rawX:x,rawY:y,xPositionMode:xm,yPositionMode:ym});break;}
        case 1001:{const [w,h,wm,hm]=take(ints,4);write(widget,{rawWidth:w,rawHeight:h,widthMode:wm,heightMode:hm});break;}
        case 1003:set("hidden",flag());break;
        case 1005:set("noClickThrough",flag());break;
        case 1006:set("noScrollThrough",flag());break;
        case 1100:{const [x,y]=take(ints,2);write(widget,{scrollX:Math.max(0,x),scrollY:Math.max(0,y)});break;}
        case 1101:set("color",value());break;
        case 1102:set("filled",flag());break;
        case 1103:set("opacity",value());break;
        case 1104:set("lineWidth",value());break;
        case 1105:set("spriteId",value());break;
        case 1106:set("spriteAngle",value());break;
        case 1107:set("spriteTiling",flag());break;
        case 1108:write(widget,{modelKind:"model",modelId:value()});break;
        case 1109:{const [x,y,z,offsetX,offsetY,zoom]=take(ints,6);
            write(widget,{modelAngleX:x,modelAngleY:y,modelAngleZ:z,modelOffsetX:offsetX,modelOffsetY:offsetY,modelZoom:zoom});break;}
        case 1110:set("sequenceId",value());break;
        case 1111:set("modelOrthographic",flag());break;
        case 1112:set("text",pop(strings));break;
        case 1113:set("fontId",value());break;
        case 1114:{const [x,y,line]=take(ints,3);write(widget,{xTextAlignment:x,yTextAlignment:y,lineHeight:line});break;}
        case 1115:set("textShadowed",flag());break;
        case 1116:set("outline",value());break;
        case 1117:set("spriteShadow",value());break;
        case 1118:set("flippedV",flag());break;
        case 1119:set("flippedH",flag());break;
        case 1120:{const [width,height]=take(ints,2);write(widget,{scrollWidth:width,scrollHeight:height});break;}
        case 1122:set("spriteId2",value());break;
        case 1123:set("color2",value());break;
        case 1124:set("transparencyBot",value());break;
        case 1125:set("fillMode",value());break;
        case 1126:set("lineDirection",flag());break;
        case 1127:set("modelTransparent",flag());break;
        case 1201:write(widget,{modelKind:"npc",modelId:value()});break;
        case 1202:set("modelKind","player");break;
        case 1300:{const index=value()-1,action=pop(strings);
            if(index>=0&&index<10){const actions=[...(widget.actions??[])];actions[index]=action;set("actions",actions);}break;}
        case 1305:set("opBase",pop(strings));break;
        case 1306:set("targetVerb",pop(strings));break;
        case 1307:set("actions",[]);break;
        case 1308:set("prioritizeMenuEntry",flag());break;
        case 1500:case 1501:case 1502:case 1503:{
            const keys=["rawX","rawY","rawWidth","rawHeight"],mode=["xPositionMode","yPositionMode","widthMode","heightMode"][op-1500];
            if((widget[mode]??0)!==0&&widget[["x","y","width","height"][op-1500]]===undefined)
                throw new Error("CS2 resolved widget geometry unavailable");
            ints.push(widget[["x","y","width","height"][op-1500]]??widget[keys[op-1500]]??0);break;}
        case 1504:ints.push(Number(Boolean(widget.hidden)));break;
        case 1505:ints.push(widget.parentUid??-1);break;
        case 1600:ints.push(widget.scrollX??0);break;
        case 1601:ints.push(widget.scrollY??0);break;
        case 1602:strings.push(widget.text??"");break;
        case 1603:ints.push(widget.scrollWidth??0);break;
        case 1604:ints.push(widget.scrollHeight??0);break;
        case 1605:ints.push(widget.modelZoom??0);break;
        case 1606:ints.push(widget.modelAngleX??0);break;
        case 1607:ints.push(widget.modelAngleZ??0);break;
        case 1608:ints.push(widget.modelAngleY??0);break;
        case 1609:ints.push(widget.opacity??0);break;
        case 1611:ints.push(widget.color??0);break;
        case 1612:ints.push(widget.color2??0);break;
        case 1614:ints.push(Number(Boolean(widget.modelTransparent)));break;
        case 1700:ints.push(widget.itemId??-1);break;
        case 1701:ints.push((widget.itemId??-1)<0?0:widget.itemQuantity??0);break;
        case 1702:ints.push(widget.childIndex??-1);break;
        case 1800:ints.push((widget.flags??0)>>11&63);break;
        case 1801:{const index=value()-1;strings.push(index>=0?(widget.actions??[])[index]??"":"");break;}
        case 1802:strings.push(widget.opBase??"");break;
        default:return false;
    }
    return true;
}
