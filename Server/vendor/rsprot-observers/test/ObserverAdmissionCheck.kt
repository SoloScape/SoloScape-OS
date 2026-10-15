@file:Suppress("INVISIBLE_REFERENCE", "INVISIBLE_MEMBER")

package net.rsprot.protocol.game.outgoing.info

import io.netty.buffer.Unpooled
import io.netty.buffer.UnpooledByteBufAllocator
import net.rsprot.compression.HuffmanCodec
import net.rsprot.compression.provider.DefaultHuffmanCodecProvider
import net.rsprot.protocol.common.client.OldSchoolClientType
import net.rsprot.protocol.game.outgoing.codec.npcinfo.DesktopLowResolutionChangeEncoder
import net.rsprot.protocol.game.outgoing.codec.npcinfo.extendedinfo.writer.NpcAvatarExtendedInfoDesktopWriter
import net.rsprot.protocol.game.outgoing.codec.playerinfo.extendedinfo.writer.PlayerAvatarExtendedInfoDesktopWriter
import net.rsprot.protocol.game.outgoing.codec.worldentity.DesktopWorldEntityResolutionChangeEncoder
import net.rsprot.protocol.game.outgoing.codec.worldentity.extendedinfo.WorldEntityAvatarExtendedInfoDesktopWriter
import net.rsprot.protocol.game.outgoing.info.util.getOrThrow
import net.rsprot.protocol.game.outgoing.info.util.safeReleaseOrThrow
import net.rsprot.protocol.game.outgoing.info.filter.DefaultExtendedInfoFilter
import net.rsprot.protocol.game.outgoing.info.npcinfo.DeferredNpcInfoProtocolSupplier
import net.rsprot.protocol.game.outgoing.info.npcinfo.NpcAvatarFactory
import net.rsprot.protocol.game.outgoing.info.npcinfo.NpcInfo
import net.rsprot.protocol.game.outgoing.info.npcinfo.NpcInfoProtocol
import net.rsprot.protocol.game.outgoing.info.playerinfo.PlayerAvatarFactory
import net.rsprot.protocol.game.outgoing.info.playerinfo.PlayerInfoProtocol
import net.rsprot.protocol.game.outgoing.info.worker.DefaultProtocolWorker
import net.rsprot.protocol.game.outgoing.info.worldentityinfo.WorldEntityAvatarFactory
import net.rsprot.protocol.game.outgoing.info.worldentityinfo.WorldEntityProtocol
import net.rsprot.protocol.internal.client.ClientTypeMap
import net.rsprot.protocol.internal.game.outgoing.info.util.ZoneIndexStorage

object ObserverAdmissionCheck {
    @JvmStatic
    fun main(args: Array<String>) {
        val baseline = scenario(false)
        val optimized = scenario(true)
        check(baseline == optimized) {
            "Suppressing the bot observer must preserve every real player's packet byte"
        }
        println("RSProt observer checks passed: identical viewer packets, movement, appearance, " +
            "animation, teleport, removal and index reuse; bot player/NPC/world packets absent.")
    }

    private fun scenario(disabled: Boolean): List<String> {
        val protocols = protocols()
        val viewer = protocols.alloc(500, OldSchoolClientType.DESKTOP)
        viewer.updateRootCoord(0, 3200, 3200)
        viewer.updateRootBuildAreaCenteredOnPlayer(3200, 3200)
        val gpi = Unpooled.buffer(5000)
        viewer.playerInfo.handleAbsolutePlayerPositions(gpi)
        gpi.release()
        var target = protocols.alloc(10, OldSchoolClientType.DESKTOP)
        fun initialize() {
            if (disabled) InfoObserverAdmission.disable(target)
                else target.updateRootBuildAreaCenteredOnPlayer(3200, 3200)
            target.updateRootCoord(0, 3201, 3200)
            target.playerInfo.avatar.extendedInfo.apply {
                setName("Target")
                setCombatLevel(30)
                setSkillLevel(0)
                setHidden(false)
                setBodyType(0)
                setPronoun(0)
                setSkullIcon(-1)
                setOverheadIcon(-1)
            }
        }
        initialize()
        val result = ArrayList<String>()
        fun tick(visible: Boolean? = true) {
            protocols.update()
            if (visible != null) {
                check((10 in viewer.playerInfo.getHighResolutionIndices()) == visible)
            }
            val packets = viewer.getPackets().rootWorldInfoPackets
            val playerPacket = packets.playerInfo.getOrThrow()
            playerPacket.consume()
            val buffer = playerPacket.content()
            val bytes = ByteArray(buffer.readableBytes())
            buffer.getBytes(buffer.readerIndex(), bytes)
            result.add(bytes.joinToString("") { "%02x".format(it) })
            playerPacket.release()
            packets.worldEntityInfo.getOrThrow().safeRelease()
            packets.npcInfo.safeReleaseOrThrow()
            if (disabled) {
                check(target.playerInfo.internalPacketResult().getOrNull() == null)
                check(target.worldEntityInfo.toPacketResult().getOrNull() == null)
                check(target.npcInfo.toPacketResult(NpcInfo.ROOT_WORLD).getOrNull() == null)
            } else {
                val botPackets = target.getPackets().rootWorldInfoPackets
                botPackets.playerInfo.getOrThrow().safeRelease()
                botPackets.worldEntityInfo.getOrThrow().safeRelease()
                botPackets.npcInfo.safeReleaseOrThrow()
            }
        }
        try {
            tick()
            tick()
            target.updateRootCoord(0, 3202, 3200)
            target.playerInfo.avatar.extendedInfo.setSequence(808, 0)
            tick()
            target.playerInfo.avatar.extendedInfo.apply {
                setCombatLevel(31)
                setName("Changed")
                setSay("fixture")
                addHitMark(-1, 0, 0, 0, 2, 0)
            }
            tick()
            target.updateRootCoord(0, 3300, 3300)
            tick(false)
            target.updateRootCoord(0, 3201, 3200)
            tick()
            protocols.dealloc(target)
            InfoObserverAdmission.enable(target)
            target = protocols.alloc(10, OldSchoolClientType.DESKTOP)
            initialize()
            tick(null)
            tick()
        } finally {
            protocols.dealloc(target)
            InfoObserverAdmission.enable(target)
            protocols.dealloc(viewer)
        }
        return result
    }

    private fun protocols(): InfoProtocols {
        val allocator = UnpooledByteBufAllocator.DEFAULT
        val buffer = Unpooled.wrappedBuffer(ByteArray(256) { 8 })
        val huffman = DefaultHuffmanCodecProvider(HuffmanCodec.create(buffer))
        buffer.release()
        val npcStorage = ZoneIndexStorage(ZoneIndexStorage.NPC_CAPACITY)
        val supplier = DeferredNpcInfoProtocolSupplier()
        val npcFactory = NpcAvatarFactory(allocator, DefaultExtendedInfoFilter(),
            listOf(NpcAvatarExtendedInfoDesktopWriter()), huffman, npcStorage, supplier)
        val npc = NpcInfoProtocol(allocator,
            ClientTypeMap.of(listOf(DesktopLowResolutionChangeEncoder()),
                OldSchoolClientType.COUNT) { it.clientType }, npcFactory,
            { _, error -> throw error }, zoneIndexStorage = npcStorage)
        supplier.supply(npc)
        val worldStorage = ZoneIndexStorage(ZoneIndexStorage.WORLDENTITY_CAPACITY)
        val worlds = WorldEntityProtocol(allocator, exceptionHandler = { _, error -> throw error },
            factory = WorldEntityAvatarFactory(allocator, worldStorage,
                listOf(WorldEntityAvatarExtendedInfoDesktopWriter()), huffman),
            resolutionChangeEncoders = ClientTypeMap.of(
                listOf(DesktopWorldEntityResolutionChangeEncoder()),
                OldSchoolClientType.COUNT) { it.clientType }, zoneIndexStorage = worldStorage)
        val players = PlayerInfoProtocol(allocator, DefaultProtocolWorker(),
            PlayerAvatarFactory(allocator, DefaultExtendedInfoFilter(),
                listOf(PlayerAvatarExtendedInfoDesktopWriter()), huffman))
        return InfoProtocols(players, npc, worlds)
    }
}
