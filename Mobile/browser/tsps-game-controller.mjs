// Revision-240 packet adapter; movement and animation rules come from pinned TSPS.
// Do not duplicate TSPS interpolation, turn, or sequence stepping here.
import {PlayerEcs} from "./tsps-runtime/game-ecs-PlayerEcs.mjs";
import {PlayerMovementSync} from "./tsps-runtime/game-movement-PlayerMovementSync.mjs";
import {PlayerAnimController} from "./tsps-runtime/game-PlayerAnimController.mjs";
import {buildMovementPath} from "./tsps-runtime/game-movement-MovementPath.mjs";

export const CLIENT_TICK_MS=20;

export class NativeTspsPlayerController {
    constructor(animations,now=()=>performance.now()){
        this.animations=animations;this.now=now;
        this.ecs=new PlayerEcs();
        this.loadedSeqs=new Map();this.pendingSeqs=new Map();
        this.sequenceTypes={
            load:id=>this.loadedSeqs.get(id)??{
                // Loading a verified cache sequence must not discard a server action.
                frameIds:[0],frameStep:-1,maxLoops:99,forcedPriority:5,
                precedenceAnimating:2,priority:2,replyMode:2,
                getFrameLength:()=>0x7fffffff,isSkeletalSeq:()=>false,
            },
        };
        this.ecs.setSeqTypeLoader(this.sequenceTypes);
        this.anim=new PlayerAnimController(this.ecs,this.sequenceTypes,null);
        this.movement=new PlayerMovementSync(this.ecs,this.anim);
        this.previous=new Map();
        this.lastTick=now();
    }
    preloadSequence(id){
        if(!Number.isInteger(id)||id<0||id>65535||this.pendingSeqs.has(id)||this.loadedSeqs.has(id))return;
        const pending=this.animations.sequence(id).then(seq=>{
            const typed={
                ...seq,frameStep:seq.frameStep??-1,maxLoops:seq.maxLoops??99,
                looping:!!seq.looping,forcedPriority:seq.forcedPriority??5,
                precedenceAnimating:seq.precedenceAnimating===-1?(seq.hasInterleaveMask?2:0):(seq.precedenceAnimating??0),
                priority:seq.priority===-1?(seq.hasInterleaveMask?2:0):(seq.priority??0),
                replyMode:seq.replyMode??2,
                isSkeletalSeq:()=>seq.skeletalId>=0,
                getSkeletalDuration:()=>Math.max(0,(seq.skeletalEnd??0)-(seq.skeletalStart??0)),
                getFrameLength:(_loader,index)=>Math.max(0,seq.frameLengths[index]??0),
            };
            this.loadedSeqs.set(id,typed);
        }).catch(()=>{}).finally(()=>this.pendingSeqs.delete(id));
        this.pendingSeqs.set(id,pending);
    }
    accept(serverId,player){
        if(!player)return;
        const index=this.ecs.allocatePlayer(serverId);
        const previous=this.previous.get(serverId);
        const first=!this.movement.getState(serverId);
        // Login/cache setup may precede the first GPI by seconds; don't replay that
        // elapsed time against the new player's first authoritative position.
        if(first&&!this.previous.size)this.lastTick=this.now();
        const moved=!!previous&&(player.x!==previous.x||player.y!==previous.y);
        const dx=previous?player.x-previous.x:0,dy=previous?player.y-previous.y:0;
        const distance=Math.max(Math.abs(dx),Math.abs(dy));
        const teleport=first||!!player.teleported||!!previous&&player.plane!==previous.plane||
            !!previous&&distance>2||player.temporaryMoveSpeed===127;
        const running=!!player.runStep||player.temporaryMoveSpeed===2||
            (player.temporaryMoveSpeed==null&&player.moveSpeed===2);
        const traversal=player.temporaryMoveSpeed===0?0:running?2:1;
        // GPI encodes an endpoint, not the ordered route for all run codes.
        // Use the pinned TSPS path builder for ordinary two-tile deltas.
        const path=previous&&!teleport&&moved?
            buildMovementPath({x:previous.x,y:previous.y},{x:player.x,y:player.y},
                {running,maxStepDistance:2}):null;
        const directions=path?.steps.map(step=>step.direction)??[];
        const traversals=directions.map(()=>traversal);
        this.movement.receiveUpdate({
            serverId,ecsIndex:index,x:(player.x<<7)+64,y:(player.y<<7)+64,
            level:player.plane,snap:teleport,
            directions,traversals,running,moved,
            ...(first?{rotation:player.orientation??0}:
                player.facing?.angle!==undefined?{orientation:player.facing.angle&2047}:{}),
        });
        if(first&&player.orientation!==undefined)
            this.ecs.setRotationImmediate(index,player.orientation&2047);
        if(player.appearance&&player.appearance!==previous?.appearance){
            const set=player.appearance.animations??{};
            this.ecs.setAnimSet(index,{...set,turnLeft:set.turn,turnRight:set.turn},
                {mergeWithDefault:false});
            for(const seq of Object.values(player.appearance.animations??{}))this.preloadSequence(seq);
        }
        const seq=player.sequence;
        if(seq&&(player.sequenceUpdated||seq.id!==previous?.sequence?.id||
            seq.delay!==previous?.sequence?.delay)){
            this.preloadSequence(seq.id);
            this.anim.handleServerSequence(serverId,seq.id,{delay:seq.delay??0});
        }
        this.previous.set(serverId,{...player});
    }
    advance(now=this.now()){
        if(!Number.isFinite(now)||now<this.lastTick){this.lastTick=now;return 0;}
        // The simulation steps at 20 ms independently of frame rate and cache awaits.
        // Cap recovery work after a suspended tab; never extrapolate endpoint positions.
        const elapsed=Math.floor((now-this.lastTick)/CLIENT_TICK_MS);
        if(!elapsed)return 0;
        const ticks=Math.min(elapsed,100);
        this.lastTick=elapsed>100?now:this.lastTick+ticks*CLIENT_TICK_MS;
        for(let t=0;t<ticks;t++){
            this.ecs.updateClient(1);
            this.movement.updateInteractionRotations();
            this.anim.tick(1);
        }
        return ticks;
    }
    sample(serverId){
        const index=this.ecs.getIndexForServerId(serverId);
        if(index===undefined)return null;
        const authoritative=this.previous.get(serverId);
        if(!authoritative)return null;
        const action=this.anim.getSequenceState(serverId);
        const movement=this.anim.getMovementSequenceState(serverId);
        return {
            ...authoritative,
            x:this.ecs.getX(index)/128-.5,
            y:this.ecs.getY(index)/128-.5,
            plane:this.ecs.getLevel(index),
            orientation:this.ecs.getRotation(index),
            moving:this.ecs.isMoving(index),
            running:this.ecs.isRunVisual(index),
            locomotionId:this.ecs.getAnimMovementSeqId(index),
            locomotionFrame:movement?.frame??0,
            actionId:action&&action.delay<=0?action.seqId:-1,
            actionFrame:action?.frame??0,
        };
    }
    clear(){
        this.anim.reset();
        this.previous.clear();
    }
}
