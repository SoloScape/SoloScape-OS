// AUTO-GENERATED tuple helpers for db table rows — do not edit.
package org.rsmod.api.table

import kotlin.collections.List

public data class Tuple2<T0, T1>(
  public val t0: T0,
  public val t1: T1,
)

public fun <T0, T1> List<*>.toTuple2(): Tuple2<T0, T1>? {
  if (size < 2) return null
  return Tuple2(this[0] as T0, this[1] as T1)
}

public fun <T0, T1> List<*>.toListOfTuple2(): List<Tuple2<T0, T1>> = chunked(2).mapNotNull { it.toTuple2<T0, T1>() }

public data class Tuple3<T0, T1, T2>(
  public val t0: T0,
  public val t1: T1,
  public val t2: T2,
)

public fun <T0, T1, T2> List<*>.toTuple3(): Tuple3<T0, T1, T2>? {
  if (size < 3) return null
  return Tuple3(this[0] as T0, this[1] as T1, this[2] as T2)
}

public fun <T0, T1, T2> List<*>.toListOfTuple3(): List<Tuple3<T0, T1, T2>> = chunked(3).mapNotNull { it.toTuple3<T0, T1, T2>() }

public data class Tuple7<T0, T1, T2, T3, T4, T5, T6>(
  public val t0: T0,
  public val t1: T1,
  public val t2: T2,
  public val t3: T3,
  public val t4: T4,
  public val t5: T5,
  public val t6: T6,
)

public fun <T0, T1, T2, T3, T4, T5, T6> List<*>.toTuple7(): Tuple7<T0, T1, T2, T3, T4, T5, T6>? {
  if (size < 7) return null
  return Tuple7(this[0] as T0, this[1] as T1, this[2] as T2, this[3] as T3, this[4] as T4, this[5] as T5, this[6] as T6)
}

public fun <T0, T1, T2, T3, T4, T5, T6> List<*>.toListOfTuple7(): List<Tuple7<T0, T1, T2, T3, T4, T5, T6>> = chunked(7).mapNotNull { it.toTuple7<T0, T1, T2, T3, T4, T5, T6>() }

public data class Tuple5<T0, T1, T2, T3, T4>(
  public val t0: T0,
  public val t1: T1,
  public val t2: T2,
  public val t3: T3,
  public val t4: T4,
)

public fun <T0, T1, T2, T3, T4> List<*>.toTuple5(): Tuple5<T0, T1, T2, T3, T4>? {
  if (size < 5) return null
  return Tuple5(this[0] as T0, this[1] as T1, this[2] as T2, this[3] as T3, this[4] as T4)
}

public fun <T0, T1, T2, T3, T4> List<*>.toListOfTuple5(): List<Tuple5<T0, T1, T2, T3, T4>> = chunked(5).mapNotNull { it.toTuple5<T0, T1, T2, T3, T4>() }

public data class Tuple4<T0, T1, T2, T3>(
  public val t0: T0,
  public val t1: T1,
  public val t2: T2,
  public val t3: T3,
)

public fun <T0, T1, T2, T3> List<*>.toTuple4(): Tuple4<T0, T1, T2, T3>? {
  if (size < 4) return null
  return Tuple4(this[0] as T0, this[1] as T1, this[2] as T2, this[3] as T3)
}

public fun <T0, T1, T2, T3> List<*>.toListOfTuple4(): List<Tuple4<T0, T1, T2, T3>> = chunked(4).mapNotNull { it.toTuple4<T0, T1, T2, T3>() }
