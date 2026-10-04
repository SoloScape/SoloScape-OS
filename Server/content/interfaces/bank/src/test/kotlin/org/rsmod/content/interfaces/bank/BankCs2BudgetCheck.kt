package org.rsmod.content.interfaces.bank

import dev.openrune.filesystem.Cache
import java.nio.ByteBuffer
import java.nio.file.Path

private data class Instruction(val opcode: Int, val operand: Int)
private data class ScriptLoop(val start: Int, val end: Int)

private fun decodeScript(bytes: ByteArray): List<Instruction> {
    val buffer = ByteBuffer.wrap(bytes)
    val switchesSize = buffer.getShort(bytes.size - 2).toInt() and 0xffff
    val footer = bytes.size - 2 - switchesSize - 16
    val count = buffer.getInt(footer)
    while (buffer.get().toInt() != 0) {}
    val instructions = List(count) {
        val opcode = buffer.short.toInt() and 0xffff
        val operand = when {
            opcode == 3 -> {
                while (buffer.get().toInt() != 0) {}
                0
            }
            opcode >= 100 || opcode == 21 || opcode == 38 || opcode == 39 ->
                buffer.get().toInt() and 0xff
            else -> buffer.int
        }
        Instruction(opcode, operand)
    }
    check(buffer.position() == footer)
    return instructions
}

private fun loops(script: List<Instruction>): List<ScriptLoop> =
    script.mapIndexedNotNull { index, instruction ->
        if (instruction.opcode == 6 && instruction.operand < 0) {
            ScriptLoop(index + 1 + instruction.operand, index)
        } else null
    }

private fun maxPath(
    script: List<Instruction>,
    start: Int,
    end: Int,
    calls: Map<Int, Int>,
): Int {
    val memo = mutableMapOf<Int, Int>()
    fun visit(index: Int): Int {
        if (index !in start..end) return 0
        memo[index]?.let { return it }
        val instruction = script[index]
        val cost = 1 + if (instruction.opcode == 40) calls[instruction.operand] ?: 0 else 0
        val remaining = when {
            index == end || instruction.opcode == 21 -> 0
            instruction.opcode == 6 -> {
                val next = index + 1 + instruction.operand
                if (next > index) visit(next) else 0
            }
            instruction.opcode in listOf(7, 8, 9, 10, 31, 32) ->
                maxOf(visit(index + 1), visit(index + 1 + instruction.operand))
            else -> visit(index + 1)
        }
        return (cost + remaining).also { memo[index] = it }
    }
    return visit(start)
}

fun main(args: Array<String>) {
    val cache = Cache.load(Path.of(args.firstOrNull() ?: ".data/cache/LIVE"))
    try {
        fun script(id: Int) = decodeScript(checkNotNull(cache.data(12, id)))
        val init = script(274)
        val build = script(277)
        val layout = script(509)
        val render = script(64530)
        val filter = script(279)
        val drawCost = script(278).size + script(669).size + script(2579).size
        val filterCost = maxPath(filter, 0, filter.lastIndex, emptyMap())
        val calls = mapOf(279 to filterCost, 278 to drawCost)
        fun largeLoops(script: List<Instruction>) = loops(script).filter { loop ->
            (loop.start..loop.end).any { script[it] == Instruction(0, 32768) }
        }.map { loop -> maxPath(script, loop.start, loop.end, calls) }
        val initCost = largeLoops(init).single()
        val buildLoops = largeLoops(build).sorted()
        check(buildLoops.size == 2)
        val layoutLoop = loops(layout).single()
        val layoutCost = maxPath(layout, layoutLoop.start, layoutLoop.end, calls)
        val headerAllowance = 100_000
        val initializationBound = initCost * 32768 + headerAllowance
        val mainOpenBound = (buildLoops.first() + layoutCost) * 32768 + headerAllowance
        val tabOpenBound = buildLoops.last() * 32768 + headerAllowance
        val timerLoop = loops(render).single()
        val timerIteration = maxPath(render, timerLoop.start, timerLoop.end, emptyMap())
        val visibleSlots = (2160 / 36 + 2) * 8
        val timerBound = timerIteration * 32768 + visibleSlots * drawCost + headerAllowance
        check(initializationBound < 5_000_000)
        val buildCall = render.indexOf(Instruction(40, 277))
        check(buildCall >= 0 && render.subList(buildCall, timerLoop.start).any { it.opcode == 21 })
        check(mainOpenBound < 5_000_000) { "Main bank open exceeds budget: $mainOpenBound" }
        check(tabOpenBound < 5_000_000) { "Bank tab open exceeds budget: $tabOpenBound" }
        check(timerBound < 5_000_000) { "Visible row refresh exceeds budget: $timerBound" }
        check(loops(layout).all { loop ->
            (loop.start..loop.end).none { layout[it] == Instruction(40, 278) }
        })
        println("PASS: 32,768-slot instruction bounds: init=$initializationBound, layout=$mainOpenBound, tab=$tabOpenBound, refresh=$timerBound.")
    } finally {
        cache.close()
    }
}
