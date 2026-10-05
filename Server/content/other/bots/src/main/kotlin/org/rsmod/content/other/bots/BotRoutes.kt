package org.rsmod.content.other.bots

import kotlin.math.abs
import kotlin.math.max
import org.rsmod.map.CoordGrid

public data class BotTraversal(
    val targets: Set<String>,
    val option: String,
    val item: String? = null,
    val npc: Boolean = false,
)

/** Source world roads and activity segments. Unreachable pairs produce no route:
 * the caller must retry native movement, never teleport across a discontinuity.
 */
public object BotRoutes {
    private val worldRoads: List<List<CoordGrid>> = listOf(
        listOf(CoordGrid(3232, 3230, 0), CoordGrid(3222, 3240, 0), CoordGrid(3222, 3240, 0), CoordGrid(3216, 3254, 0), CoordGrid(3216, 3269, 0), CoordGrid(3214, 3277, 0), CoordGrid(3197, 3280, 0), CoordGrid(3181, 3286, 0), CoordGrid(3160, 3289, 0), CoordGrid(3151, 3295, 0), CoordGrid(3136, 3295, 0), CoordGrid(3121, 3297, 0), CoordGrid(3110, 3294, 0)),
        listOf(CoordGrid(3109, 3281, 0), CoordGrid(3104, 3273, 0), CoordGrid(3102, 3255, 0), CoordGrid(3093, 3247, 0)),
        listOf(CoordGrid(3110, 3300, 0), CoordGrid(3112, 3307, 0), CoordGrid(3122, 3314, 0), CoordGrid(3131, 3324, 0), CoordGrid(3130, 3330, 0), CoordGrid(3129, 3339, 0), CoordGrid(3135, 3342, 0), CoordGrid(3135, 3355, 0), CoordGrid(3137, 3365, 0), CoordGrid(3136, 3373, 0), CoordGrid(3127, 3375, 0), CoordGrid(3118, 3385, 0), CoordGrid(3113, 3390, 0), CoordGrid(3103, 3395, 0), CoordGrid(3099, 3405, 0), CoordGrid(3098, 3419, 0)),
        listOf(CoordGrid(3114, 3420, 0), CoordGrid(3127, 3414, 0), CoordGrid(3140, 3417, 0), CoordGrid(3157, 3419, 0), CoordGrid(3171, 3428, 0), CoordGrid(3182, 3432, 0)),
        listOf(CoordGrid(3100, 3429, 0), CoordGrid(3100, 3434, 0), CoordGrid(3093, 3440, 0), CoordGrid(3090, 3449, 0), CoordGrid(3087, 3463, 0), CoordGrid(3080, 3467, 0), CoordGrid(3081, 3483, 0), CoordGrid(3090, 3490, 0)),
        listOf(CoordGrid(3092, 3420, 0), CoordGrid(3081, 3423, 0), CoordGrid(3072, 3418, 0), CoordGrid(3052, 3417, 0), CoordGrid(3037, 3424, 0), CoordGrid(3022, 3424, 0), CoordGrid(3011, 3429, 0), CoordGrid(2990, 3429, 0), CoordGrid(2978, 3414, 0), CoordGrid(2967, 3401, 0), CoordGrid(2967, 3384, 0)),
        listOf(CoordGrid(2954, 3381, 0), CoordGrid(2946, 3374, 0)),
        listOf(CoordGrid(2971, 3379, 0), CoordGrid(2982, 3376, 0), CoordGrid(2997, 3366, 0), CoordGrid(3006, 3359, 0)),
        listOf(CoordGrid(3105, 3294, 0), CoordGrid(3095, 3294, 0), CoordGrid(3089, 3289, 0), CoordGrid(3081, 3288, 0), CoordGrid(3071, 3278, 0), CoordGrid(3052, 3276, 0), CoordGrid(3039, 3276, 0), CoordGrid(3022, 3275, 0), CoordGrid(3013, 3276, 0), CoordGrid(3006, 3289, 0), CoordGrid(3005, 3304, 0), CoordGrid(3007, 3323, 0), CoordGrid(3007, 3341, 0), CoordGrid(3007, 3359, 0)),
        listOf(CoordGrid(3273, 3167, 0), CoordGrid(3280, 3179, 0), CoordGrid(3282, 3195, 0), CoordGrid(3285, 3206, 0), CoordGrid(3285, 3214, 0), CoordGrid(3277, 3226, 0), CoordGrid(3277, 3243, 0), CoordGrid(3277, 3262, 0), CoordGrid(3276, 3278, 0), CoordGrid(3275, 3292, 0), CoordGrid(3275, 3305, 0), CoordGrid(3275, 3320, 0), CoordGrid(3284, 3329, 0), CoordGrid(3292, 3335, 0), CoordGrid(3303, 3335, 0), CoordGrid(3300, 3347, 0), CoordGrid(3298, 3358, 0), CoordGrid(3298, 3373, 0), CoordGrid(3292, 3388, 0), CoordGrid(3291, 3398, 0), CoordGrid(3288, 3415, 0), CoordGrid(3279, 3424, 0), CoordGrid(3273, 3427, 0), CoordGrid(3254, 3428, 0)),
        listOf(CoordGrid(3221, 3429, 0), CoordGrid(3237, 3430, 0), CoordGrid(3253, 3428, 0)),
        listOf(CoordGrid(3205, 3428, 0), CoordGrid(3190, 3430, 0), CoordGrid(3182, 3432, 0)),
        listOf(CoordGrid(3259, 3230, 0), CoordGrid(3259, 3241, 0), CoordGrid(3251, 3254, 0), CoordGrid(3247, 3270, 0), CoordGrid(3239, 3284, 0), CoordGrid(3239, 3299, 0), CoordGrid(3243, 3309, 0), CoordGrid(3253, 3322, 0), CoordGrid(3268, 3329, 0), CoordGrid(3263, 3332, 0), CoordGrid(3247, 3336, 0), CoordGrid(3228, 3337, 0), CoordGrid(3225, 3351, 0), CoordGrid(3216, 3362, 0), CoordGrid(3214, 3369, 0), CoordGrid(3211, 3376, 0), CoordGrid(3211, 3394, 0), CoordGrid(3211, 3412, 0), CoordGrid(3211, 3424, 0)),
        listOf(CoordGrid(3267, 3228, 0), CoordGrid(3268, 3228, 0), CoordGrid(3269, 3214, 0), CoordGrid(3269, 3203, 0), CoordGrid(3269, 3189, 0), CoordGrid(3270, 3178, 0), CoordGrid(3275, 3176, 0), CoordGrid(3273, 3167, 0)),
        listOf(CoordGrid(3237, 3226, 0), CoordGrid(3254, 3226, 0)),
        listOf(CoordGrid(2965, 3386, 0), CoordGrid(2964, 3402, 0), CoordGrid(2959, 3413, 0), CoordGrid(2949, 3432, 0), CoordGrid(2945, 3447, 0), CoordGrid(2936, 3450, 0), CoordGrid(2935, 3450, 0), CoordGrid(2920, 3455, 0), CoordGrid(2907, 3455, 0), CoordGrid(2897, 3455, 0)),
        listOf(CoordGrid(2890, 3445, 0), CoordGrid(2888, 3430, 0), CoordGrid(2882, 3428, 0), CoordGrid(2873, 3430, 0), CoordGrid(2866, 3442, 0), CoordGrid(2863, 3458, 0), CoordGrid(2855, 3470, 0), CoordGrid(2856, 3482, 0), CoordGrid(2862, 3496, 0), CoordGrid(2856, 3508, 0), CoordGrid(2846, 3508, 0), CoordGrid(2841, 3500, 0), CoordGrid(2850, 3495, 0), CoordGrid(2850, 3488, 0), CoordGrid(2848, 3477, 0), CoordGrid(2844, 3466, 0), CoordGrid(2848, 3453, 0), CoordGrid(2855, 3442, 0), CoordGrid(2853, 3437, 0), CoordGrid(2843, 3435, 0), CoordGrid(2834, 3436, 0), CoordGrid(2825, 3437, 0), CoordGrid(2810, 3435, 0)),
        listOf(CoordGrid(2798, 3433, 0), CoordGrid(2791, 3435, 0), CoordGrid(2779, 3446, 0), CoordGrid(2770, 3458, 0), CoordGrid(2764, 3462, 0), CoordGrid(2757, 3477, 0)),
        listOf(CoordGrid(2745, 3479, 0), CoordGrid(2732, 3485, 0)),
        listOf(CoordGrid(2717, 3485, 0), CoordGrid(2701, 3484, 0), CoordGrid(2684, 3483, 0), CoordGrid(2679, 3478, 0), CoordGrid(2679, 3470, 0), CoordGrid(2673, 3465, 0), CoordGrid(2671, 3457, 0), CoordGrid(2660, 3446, 0), CoordGrid(2648, 3435, 0), CoordGrid(2645, 3418, 0), CoordGrid(2645, 3403, 0), CoordGrid(2645, 3388, 0), CoordGrid(2644, 3375, 0), CoordGrid(2636, 3372, 0), CoordGrid(2636, 3356, 0), CoordGrid(2636, 3338, 0)),
        listOf(CoordGrid(2626, 3336, 0), CoordGrid(2617, 3337, 0)),
        listOf(CoordGrid(2644, 3332, 0), CoordGrid(2647, 3328, 0), CoordGrid(2654, 3314, 0)),
        listOf(CoordGrid(2652, 3306, 0), CoordGrid(2642, 3305, 0), CoordGrid(2638, 3300, 0), CoordGrid(2643, 3294, 0), CoordGrid(2644, 3284, 0), CoordGrid(2650, 3284, 0))
    )

    private val crossings: Map<Pair<CoordGrid, CoordGrid>, BotTraversal> = buildMap {
        put(CoordGrid(3267, 3228, 0) to CoordGrid(3268, 3228, 0), BotTraversal(setOf("gate"), "open"))
        put(CoordGrid(3268, 3228, 0) to CoordGrid(3267, 3228, 0), BotTraversal(setOf("gate"), "open"))
        put(CoordGrid(2936, 3450, 0) to CoordGrid(2935, 3450, 0), BotTraversal(setOf("gate"), "open"))
        put(CoordGrid(2935, 3450, 0) to CoordGrid(2936, 3450, 0), BotTraversal(setOf("gate"), "open"))
        put(CoordGrid(2985, 3296, 0) to CoordGrid(2841, 4829, 0), BotTraversal(setOf("mysterious ruins"), "enter", "air talisman", false))
        put(CoordGrid(2841, 4829, 0) to CoordGrid(2985, 3296, 0), BotTraversal(setOf("portal"), "exit", null, false))
        put(CoordGrid(3278, 3191, 0) to CoordGrid(3277, 3191, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3277, 3191, 0) to CoordGrid(3278, 3191, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3268, 3228, 0) to CoordGrid(3267, 3228, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3267, 3228, 0) to CoordGrid(3268, 3228, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3276, 3180, 0) to CoordGrid(3275, 3180, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3275, 3180, 0) to CoordGrid(3276, 3180, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3280, 3185, 0) to CoordGrid(3279, 3185, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3279, 3185, 0) to CoordGrid(3280, 3185, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3056, 3441, 0) to CoordGrid(2523, 4828, 0), BotTraversal(setOf("mysterious ruins"), "enter", "body talisman", false))
        put(CoordGrid(2523, 4828, 0) to CoordGrid(3056, 3441, 0), BotTraversal(setOf("portal"), "exit", null, false))
        put(CoordGrid(2474, 5168, 0) to CoordGrid(2858, 9571, 0), BotTraversal(setOf("cave entrance", "exit", "tunnel"), "enter", null, false))
        put(CoordGrid(2858, 9571, 0) to CoordGrid(2474, 5168, 0), BotTraversal(setOf("cave entrance", "exit", "tunnel"), "enter", null, false))
        put(CoordGrid(2858, 9571, 0) to CoordGrid(2850, 3164, 0), BotTraversal(setOf("ladder", "trapdoor", "cave entrance"), "climb-up", null, false))
        put(CoordGrid(2850, 3164, 0) to CoordGrid(2858, 9571, 0), BotTraversal(setOf("ladder", "trapdoor", "cave entrance"), "climb-down", null, false))
        put(CoordGrid(2816, 3182, 0) to CoordGrid(2815, 3182, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(2815, 3182, 0) to CoordGrid(2816, 3182, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(2750, 3158, 0) to CoordGrid(2706, 9564, 0), BotTraversal(setOf("ladder", "trapdoor", "cave entrance"), "climb-down", null, false))
        put(CoordGrid(2706, 9564, 0) to CoordGrid(2750, 3158, 0), BotTraversal(setOf("ladder", "trapdoor", "cave entrance"), "climb-up", null, false))
        put(CoordGrid(2691, 9564, 0) to CoordGrid(2689, 9564, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(2689, 9564, 0) to CoordGrid(2691, 9564, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(2683, 9568, 0) to CoordGrid(2683, 9570, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(2683, 9570, 0) to CoordGrid(2683, 9568, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(2652, 9589, 0) to CoordGrid(2634, 9585, 2), BotTraversal(setOf("staircase", "stairs", "ladder"), "climb-up", null, false))
        put(CoordGrid(2634, 9585, 2) to CoordGrid(2652, 9589, 0), BotTraversal(setOf("staircase", "stairs", "ladder"), "climb-down", null, false))
        put(CoordGrid(2672, 9499, 0) to CoordGrid(2674, 9499, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(2674, 9499, 0) to CoordGrid(2672, 9499, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(2816, 3438, 0) to CoordGrid(2816, 3439, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(2816, 3439, 0) to CoordGrid(2816, 3438, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(2933, 3289, 0) to CoordGrid(2933, 3288, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(2933, 3288, 0) to CoordGrid(2933, 3289, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3026, 3287, 0) to CoordGrid(3025, 3287, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3025, 3287, 0) to CoordGrid(3026, 3287, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3024, 3290, 0) to CoordGrid(3024, 3291, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3024, 3291, 0) to CoordGrid(3024, 3290, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3021, 3293, 0) to CoordGrid(3020, 3293, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3020, 3293, 0) to CoordGrid(3021, 3293, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3213, 3261, 0) to CoordGrid(3212, 3261, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3212, 3261, 0) to CoordGrid(3213, 3261, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3061, 3376, 0) to CoordGrid(3051, 9772, 0), BotTraversal(setOf("ladder", "trapdoor", "cave entrance"), "climb-down", null, false))
        put(CoordGrid(3051, 9772, 0) to CoordGrid(3061, 3376, 0), BotTraversal(setOf("ladder", "trapdoor", "cave entrance"), "climb-up", null, false))
        put(CoordGrid(3016, 3455, 0) to CoordGrid(3020, 9839, 0), BotTraversal(setOf("ladder", "trapdoor", "cave entrance"), "climb-down", null, false))
        put(CoordGrid(3020, 9839, 0) to CoordGrid(3016, 3455, 0), BotTraversal(setOf("ladder", "trapdoor", "cave entrance"), "climb-up", null, false))
        put(CoordGrid(3300, 3470, 0) to CoordGrid(2655, 4834, 0), BotTraversal(setOf("mysterious ruins"), "enter", "earth talisman", false))
        put(CoordGrid(2655, 4834, 0) to CoordGrid(3300, 3470, 0), BotTraversal(setOf("portal"), "exit", null, false))
        put(CoordGrid(3096, 3468, 0) to CoordGrid(3096, 9879, 0), BotTraversal(setOf("ladder", "trapdoor", "cave entrance"), "climb-down", null, false))
        put(CoordGrid(3096, 9879, 0) to CoordGrid(3096, 3468, 0), BotTraversal(setOf("ladder", "trapdoor", "cave entrance"), "climb-up", null, false))
        put(CoordGrid(3103, 9909, 0) to CoordGrid(3104, 9909, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3104, 9909, 0) to CoordGrid(3103, 9909, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3146, 9870, 0) to CoordGrid(3145, 9870, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3145, 9870, 0) to CoordGrid(3146, 9870, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3115, 3449, 0) to CoordGrid(3115, 3450, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3115, 3450, 0) to CoordGrid(3115, 3449, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3115, 3450, 0) to CoordGrid(3116, 9843, 0), BotTraversal(setOf("ladder", "trapdoor", "cave entrance"), "climb-down", null, false))
        put(CoordGrid(3116, 9843, 0) to CoordGrid(3115, 3450, 0), BotTraversal(setOf("ladder", "trapdoor", "cave entrance"), "climb-up", null, false))
        put(CoordGrid(3238, 3458, 0) to CoordGrid(3243, 9870, 0), BotTraversal(setOf("ladder", "trapdoor", "cave entrance"), "climb-down", null, false))
        put(CoordGrid(3243, 9870, 0) to CoordGrid(3238, 3458, 0), BotTraversal(setOf("ladder", "trapdoor", "cave entrance"), "climb-up", null, false))
        put(CoordGrid(3246, 9892, 0) to CoordGrid(3247, 9892, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3247, 9892, 0) to CoordGrid(3246, 9892, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3246, 9916, 0) to CoordGrid(3245, 9916, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3245, 9916, 0) to CoordGrid(3246, 9916, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3241, 9911, 0) to CoordGrid(3241, 9910, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3241, 9910, 0) to CoordGrid(3241, 9911, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3210, 9899, 0) to CoordGrid(3210, 9897, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3210, 9897, 0) to CoordGrid(3210, 9899, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3032, 3314, 0) to CoordGrid(3032, 3313, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3032, 3313, 0) to CoordGrid(3032, 3314, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(2971, 3377, 0) to CoordGrid(2971, 3376, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(2971, 3376, 0) to CoordGrid(2971, 3377, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(2941, 3517, 0) to CoordGrid(2940, 3517, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(2940, 3517, 0) to CoordGrid(2941, 3517, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3308, 3248, 0) to CoordGrid(2579, 4843, 0), BotTraversal(setOf("mysterious ruins"), "enter", "fire talisman", false))
        put(CoordGrid(2579, 4843, 0) to CoordGrid(3308, 3248, 0), BotTraversal(setOf("portal"), "exit", null, false))
        put(CoordGrid(2862, 3166, 0) to CoordGrid(2851, 9576, 0), BotTraversal(setOf("ladder", "trapdoor", "cave entrance"), "climb-down", null, false))
        put(CoordGrid(2851, 9576, 0) to CoordGrid(2862, 3166, 0), BotTraversal(setOf("ladder", "trapdoor", "cave entrance"), "climb-up", null, false))
        put(CoordGrid(2836, 9599, 0) to CoordGrid(2836, 9600, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(2836, 9600, 0) to CoordGrid(2836, 9599, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3252, 3267, 0) to CoordGrid(3253, 3267, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3253, 3267, 0) to CoordGrid(3252, 3267, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3237, 3295, 0) to CoordGrid(3236, 3295, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3236, 3295, 0) to CoordGrid(3237, 3295, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3189, 3280, 0) to CoordGrid(3189, 3279, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3189, 3279, 0) to CoordGrid(3189, 3280, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3217, 3218, 0) to CoordGrid(3216, 3218, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3216, 3218, 0) to CoordGrid(3217, 3218, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3215, 3212, 0) to CoordGrid(3215, 3211, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3215, 3211, 0) to CoordGrid(3215, 3212, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3205, 3209, 0) to CoordGrid(3205, 3209, 1), BotTraversal(setOf("staircase", "stairs", "ladder"), "climb-up", null, false))
        put(CoordGrid(3205, 3209, 1) to CoordGrid(3205, 3209, 0), BotTraversal(setOf("staircase", "stairs", "ladder"), "climb-down", null, false))
        put(CoordGrid(3207, 3214, 1) to CoordGrid(3208, 3214, 1), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3208, 3214, 1) to CoordGrid(3207, 3214, 1), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(2979, 3510, 0) to CoordGrid(2790, 4832, 0), BotTraversal(setOf("mysterious ruins"), "enter", "mind talisman", false))
        put(CoordGrid(2790, 4832, 0) to CoordGrid(2979, 3510, 0), BotTraversal(setOf("portal"), "exit", null, false))
        put(CoordGrid(3029, 3337, 0) to CoordGrid(3027, 9738, 0), BotTraversal(setOf("ladder", "trapdoor", "cave entrance"), "climb-down", null, false))
        put(CoordGrid(3027, 9738, 0) to CoordGrid(3029, 3337, 0), BotTraversal(setOf("ladder", "trapdoor", "cave entrance"), "climb-up", null, false))
        put(CoordGrid(2716, 3472, 0) to CoordGrid(2715, 3472, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(2715, 3472, 0) to CoordGrid(2716, 3472, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(2715, 3471, 0) to CoordGrid(2715, 3471, 1), BotTraversal(setOf("staircase", "stairs", "ladder"), "climb-up", null, false))
        put(CoordGrid(2715, 3471, 1) to CoordGrid(2715, 3471, 0), BotTraversal(setOf("staircase", "stairs", "ladder"), "climb-down", null, false))
        put(CoordGrid(2936, 3355, 0) to CoordGrid(2934, 3355, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(2934, 3355, 0) to CoordGrid(2936, 3355, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(2887, 3395, 0) to CoordGrid(2880, 9813, 0), BotTraversal(setOf("ladder", "trapdoor", "cave entrance"), "climb-down", null, false))
        put(CoordGrid(2880, 9813, 0) to CoordGrid(2887, 3395, 0), BotTraversal(setOf("ladder", "trapdoor", "cave entrance"), "climb-up", null, false))
        put(CoordGrid(2880, 9813, 0) to CoordGrid(2878, 9813, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(2878, 9813, 0) to CoordGrid(2880, 9813, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3242, 3412, 0) to CoordGrid(3241, 3412, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3241, 3412, 0) to CoordGrid(3242, 3412, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3253, 3398, 0) to CoordGrid(3253, 3399, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3253, 3399, 0) to CoordGrid(3253, 3398, 0), BotTraversal(setOf("portal"), "exit", null, false))
        put(CoordGrid(3253, 3399, 0) to CoordGrid(2911, 4832, 0), BotTraversal(setOf("aubury"), "teleport", null, true))
        put(CoordGrid(2911, 4832, 0) to CoordGrid(3253, 3399, 0), BotTraversal(setOf("portal"), "exit", null, false))
        put(CoordGrid(3238, 3458, 0) to CoordGrid(3238, 9866, 0), BotTraversal(setOf("ladder", "trapdoor", "cave entrance"), "climb-down", null, false))
        put(CoordGrid(3238, 9866, 0) to CoordGrid(3238, 3458, 0), BotTraversal(setOf("ladder", "trapdoor", "cave entrance"), "climb-up", null, false))
        put(CoordGrid(3191, 3363, 0) to CoordGrid(3191, 3362, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3191, 3362, 0) to CoordGrid(3191, 3363, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3194, 3357, 0) to CoordGrid(3195, 3357, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3195, 3357, 0) to CoordGrid(3194, 3357, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3187, 3428, 0) to CoordGrid(3187, 3427, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3187, 3427, 0) to CoordGrid(3187, 3428, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3178, 3165, 0) to CoordGrid(2722, 4833, 0), BotTraversal(setOf("mysterious ruins"), "enter", "water talisman", false))
        put(CoordGrid(2722, 4833, 0) to CoordGrid(3178, 3165, 0), BotTraversal(setOf("portal"), "exit", null, false))
        put(CoordGrid(3109, 3167, 0) to CoordGrid(3109, 3166, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3109, 3166, 0) to CoordGrid(3109, 3167, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3107, 3163, 0) to CoordGrid(3107, 3161, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3107, 3161, 0) to CoordGrid(3107, 3163, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3105, 3160, 0) to CoordGrid(3104, 3161, 1), BotTraversal(setOf("staircase", "stairs", "ladder"), "climb-up", null, false))
        put(CoordGrid(3104, 3161, 1) to CoordGrid(3105, 3160, 0), BotTraversal(setOf("staircase", "stairs", "ladder"), "climb-down", null, false))
        put(CoordGrid(3105, 3160, 1) to CoordGrid(3104, 3161, 2), BotTraversal(setOf("staircase", "stairs", "ladder"), "climb-up", null, false))
        put(CoordGrid(3104, 3161, 2) to CoordGrid(3105, 3160, 1), BotTraversal(setOf("staircase", "stairs", "ladder"), "climb-down", null, false))
        put(CoordGrid(3107, 3162, 2) to CoordGrid(3108, 3162, 2), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3108, 3162, 2) to CoordGrid(3107, 3162, 2), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3317, 3193, 0) to CoordGrid(3318, 3193, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3318, 3193, 0) to CoordGrid(3317, 3193, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3311, 3183, 0) to CoordGrid(3312, 3183, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3312, 3183, 0) to CoordGrid(3311, 3183, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3313, 3175, 0) to CoordGrid(3314, 3175, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3314, 3175, 0) to CoordGrid(3313, 3175, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3287, 3186, 0) to CoordGrid(3287, 3187, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3287, 3187, 0) to CoordGrid(3287, 3186, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3315, 3166, 0) to CoordGrid(3315, 3165, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3315, 3165, 0) to CoordGrid(3315, 3166, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(2614, 3295, 0) to CoordGrid(2614, 3294, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(2614, 3294, 0) to CoordGrid(2614, 3295, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(2654, 3297, 0) to CoordGrid(2654, 3295, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(2654, 3295, 0) to CoordGrid(2654, 3297, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3076, 3426, 0) to CoordGrid(3076, 3427, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3076, 3427, 0) to CoordGrid(3076, 3426, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(2822, 3440, 0) to CoordGrid(2822, 3441, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(2822, 3441, 0) to CoordGrid(2822, 3440, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3191, 3362, 0) to CoordGrid(3189, 3354, 1), BotTraversal(setOf("staircase", "stairs", "ladder"), "climb-up", null, false))
        put(CoordGrid(3189, 3354, 1) to CoordGrid(3191, 3362, 0), BotTraversal(setOf("staircase", "stairs", "ladder"), "climb-down", null, false))
        put(CoordGrid(3234, 3203, 0) to CoordGrid(3233, 3203, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3233, 3203, 0) to CoordGrid(3234, 3203, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3215, 3245, 0) to CoordGrid(3214, 3245, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3214, 3245, 0) to CoordGrid(3215, 3245, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3080, 3506, 0) to CoordGrid(3080, 3507, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3080, 3507, 0) to CoordGrid(3080, 3506, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3070, 3514, 0) to CoordGrid(3070, 3515, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3070, 3515, 0) to CoordGrid(3070, 3514, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(2972, 3315, 0) to CoordGrid(2972, 3314, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(2972, 3314, 0) to CoordGrid(2972, 3315, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(2958, 3384, 0) to CoordGrid(2958, 3385, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(2958, 3385, 0) to CoordGrid(2958, 3384, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(2950, 3384, 0) to CoordGrid(2950, 3385, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(2950, 3385, 0) to CoordGrid(2950, 3384, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(2971, 3383, 0) to CoordGrid(2972, 3383, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(2972, 3383, 0) to CoordGrid(2971, 3383, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3026, 3244, 0) to CoordGrid(3026, 3245, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3026, 3245, 0) to CoordGrid(3026, 3244, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3014, 3219, 0) to CoordGrid(3014, 3220, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3014, 3220, 0) to CoordGrid(3014, 3219, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3017, 3259, 0) to CoordGrid(3016, 3259, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3016, 3259, 0) to CoordGrid(3017, 3259, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3233, 3428, 0) to CoordGrid(3233, 3427, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3233, 3427, 0) to CoordGrid(3233, 3428, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3231, 3432, 0) to CoordGrid(3231, 3433, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3231, 3433, 0) to CoordGrid(3231, 3432, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3208, 3420, 0) to CoordGrid(3208, 3418, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3208, 3418, 0) to CoordGrid(3208, 3420, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3217, 3420, 0) to CoordGrid(3217, 3419, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3217, 3419, 0) to CoordGrid(3217, 3420, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3205, 3432, 0) to CoordGrid(3204, 3432, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3204, 3432, 0) to CoordGrid(3205, 3432, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3209, 3399, 0) to CoordGrid(3208, 3399, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
        put(CoordGrid(3208, 3399, 0) to CoordGrid(3209, 3399, 0), BotTraversal(setOf("door", "gate"), "open", null, false))
    }

    private fun distance(a: CoordGrid, b: CoordGrid): Int =
        max(abs(a.x - b.x), abs(a.z - b.z))

    public fun traversal(from: CoordGrid, to: CoordGrid): BotTraversal? =
        crossings[from to to]

    private val roads: List<List<CoordGrid>> by lazy {
        worldRoads + SourceBotCatalog.tasks.map { listOf(it.start) + it.route }
    }

    /** Dijkstra over imported road points and short native walking connections. */
    public fun path(from: CoordGrid, to: CoordGrid): List<CoordGrid> {
        if (from == to) return emptyList()
        if (from.level == to.level && distance(from, to) <= 25) return listOf(to)
        val points = (roads.flatten() + from + to).distinct()
        val adjacency = Array(points.size) { mutableListOf<Pair<Int, Int>>() }
        val index = points.withIndex().associate { it.value to it.index }
        fun connect(a: CoordGrid, b: CoordGrid) {
            if (a == b) return
            val crossing = traversal(a, b)
            if (crossing == null && (a.level != b.level || distance(a, b) > 50)) return
            val cost = if (crossing == null) distance(a, b).coerceAtLeast(1) else 20
            adjacency[index.getValue(a)].add(index.getValue(b) to cost)
        }
        for (road in roads) {
            for ((a, b) in road.zipWithNext()) {
                connect(a, b)
                connect(b, a)
            }
        }
        for (i in points.indices) {
            for (j in i + 1 until points.size) {
                if (points[i].level != points[j].level || distance(points[i], points[j]) > 25) continue
                connect(points[i], points[j])
                connect(points[j], points[i])
            }
        }
        val start = index.getValue(from)
        val end = index.getValue(to)
        val costs = IntArray(points.size) { Int.MAX_VALUE }
        val previous = IntArray(points.size) { -1 }
        val visited = BooleanArray(points.size)
        costs[start] = 0
        repeat(points.size) {
            var current = -1
            for (i in points.indices) {
                if (!visited[i] && costs[i] != Int.MAX_VALUE &&
                    (current == -1 || costs[i] < costs[current])) current = i
            }
            if (current == -1) return emptyList()
            if (current == end) {
                val result = mutableListOf<CoordGrid>()
                var cursor = end
                while (cursor != start) {
                    result.add(points[cursor])
                    cursor = previous[cursor]
                    if (cursor < 0) return emptyList()
                }
                return result.asReversed()
            }
            visited[current] = true
            for ((next, distance) in adjacency[current]) {
                val cost = costs[current] + distance
                if (cost < costs[next]) {
                    costs[next] = cost
                    previous[next] = current
                }
            }
        }
        return emptyList()
    }
}
