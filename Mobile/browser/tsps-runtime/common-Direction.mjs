// Generated from pinned RSPSApp/tsps: client/common/Direction.ts
// BSD-2-Clause, see licenses/tsps-BSD-2-Clause.txt. Run: node scripts/adapt-tsps-movement.mjs.
export var MovementDirection = /*#__PURE__*/ function(MovementDirection) {
    MovementDirection[MovementDirection["SouthWest"] = 0] = "SouthWest";
    MovementDirection[MovementDirection["South"] = 1] = "South";
    MovementDirection[MovementDirection["SouthEast"] = 2] = "SouthEast";
    MovementDirection[MovementDirection["West"] = 3] = "West";
    MovementDirection[MovementDirection["East"] = 4] = "East";
    MovementDirection[MovementDirection["NorthWest"] = 5] = "NorthWest";
    MovementDirection[MovementDirection["North"] = 6] = "North";
    MovementDirection[MovementDirection["NorthEast"] = 7] = "NorthEast";
    return MovementDirection;
}({});
export class DirectionFlag {
    static NORTH = 0x1;
    static EAST = 0x2;
    static SOUTH = 0x4;
    static WEST = 0x8;
    static SOUTH_WEST = DirectionFlag.WEST | DirectionFlag.SOUTH;
    static NORTH_WEST = DirectionFlag.WEST | DirectionFlag.NORTH;
    static SOUTH_EAST = DirectionFlag.EAST | DirectionFlag.SOUTH;
    static NORTH_EAST = DirectionFlag.EAST | DirectionFlag.NORTH;
}
const DIR_TO_DELTA = [
    {
        dx: -1,
        dy: -1
    },
    {
        dx: 0,
        dy: -1
    },
    {
        dx: 1,
        dy: -1
    },
    {
        dx: -1,
        dy: 0
    },
    {
        dx: 1,
        dy: 0
    },
    {
        dx: -1,
        dy: 1
    },
    {
        dx: 0,
        dy: 1
    },
    {
        dx: 1,
        dy: 1
    }
];
const DELTA_TO_DIR = new Map([
    [
        "-1,-1",
        0
    ],
    [
        "0,-1",
        1
    ],
    [
        "1,-1",
        2
    ],
    [
        "-1,0",
        3
    ],
    [
        "1,0",
        4
    ],
    [
        "-1,1",
        5
    ],
    [
        "0,1",
        6
    ],
    [
        "1,1",
        7
    ]
]);
const DIR_TO_FLAG = [
    DirectionFlag.SOUTH_WEST,
    DirectionFlag.SOUTH,
    DirectionFlag.SOUTH_EAST,
    DirectionFlag.WEST,
    DirectionFlag.EAST,
    DirectionFlag.NORTH_WEST,
    DirectionFlag.NORTH,
    DirectionFlag.NORTH_EAST
];
const FLAG_TO_DIR = new Map([
    [
        DirectionFlag.SOUTH_WEST,
        0
    ],
    [
        DirectionFlag.SOUTH,
        1
    ],
    [
        DirectionFlag.SOUTH_EAST,
        2
    ],
    [
        DirectionFlag.WEST,
        3
    ],
    [
        DirectionFlag.EAST,
        4
    ],
    [
        DirectionFlag.NORTH_WEST,
        5
    ],
    [
        DirectionFlag.NORTH,
        6
    ],
    [
        DirectionFlag.NORTH_EAST,
        7
    ]
]);
export function directionToDelta(direction) {
    return DIR_TO_DELTA[direction] ?? {
        dx: 0,
        dy: 0
    };
}
export function deltaToDirection(dx, dy) {
    const key = `${dx | 0},${dy | 0}`;
    return DELTA_TO_DIR.get(key);
}
export function directionToFlag(direction) {
    return DIR_TO_FLAG[direction] ?? 0;
}
export function flagToDirection(flag) {
    return FLAG_TO_DIR.get(flag);
}
export function flagToDelta(flag) {
    let dx = 0;
    let dy = 0;
    if ((flag & DirectionFlag.EAST) !== 0) dx = 1;
    else if ((flag & DirectionFlag.WEST) !== 0) dx = -1;
    if ((flag & DirectionFlag.NORTH) !== 0) dy = 1;
    else if ((flag & DirectionFlag.SOUTH) !== 0) dy = -1;
    return {
        dx,
        dy
    };
}
export function deltaToFlag(dx, dy) {
    let flag = 0;
    if (dx > 0) flag |= DirectionFlag.EAST;
    else if (dx < 0) flag |= DirectionFlag.WEST;
    if (dy > 0) flag |= DirectionFlag.NORTH;
    else if (dy < 0) flag |= DirectionFlag.SOUTH;
    return flag;
}
export const DIRECTION_TO_ORIENTATION = [
    256,
    0,
    1792,
    512,
    1536,
    768,
    1024,
    1280
];
export function quarterTurnToDirection(rotation) {
    return DIRECTION_TO_ORIENTATION.indexOf((rotation & 3) * 512);
}
export function directionToOrientation(direction) {
    return DIRECTION_TO_ORIENTATION[direction] ?? 0;
}
export function isDiagonal(direction) {
    switch(direction){
        case 5:
        case 7:
        case 0:
        case 2:
            return true;
        default:
            return false;
    }
}
export function isFlagDiagonal(flag) {
    const hasNS = (flag & (DirectionFlag.NORTH | DirectionFlag.SOUTH)) !== 0;
    const hasEW = (flag & (DirectionFlag.EAST | DirectionFlag.WEST)) !== 0;
    return hasNS && hasEW;
}
const RUN_DELTA_TO_CODE = new Map([
    [
        "-2,-2",
        0
    ],
    [
        "-1,-2",
        1
    ],
    [
        "0,-2",
        2
    ],
    [
        "1,-2",
        3
    ],
    [
        "2,-2",
        4
    ],
    [
        "-2,-1",
        5
    ],
    [
        "2,-1",
        6
    ],
    [
        "-2,0",
        7
    ],
    [
        "2,0",
        8
    ],
    [
        "-2,1",
        9
    ],
    [
        "2,1",
        10
    ],
    [
        "-2,2",
        11
    ],
    [
        "-1,2",
        12
    ],
    [
        "0,2",
        13
    ],
    [
        "1,2",
        14
    ],
    [
        "2,2",
        15
    ]
]);
const RUN_CODE_DATA = [
    {
        dx: -2,
        dy: -2,
        dir1: 0,
        dir2: 0
    },
    {
        dx: -1,
        dy: -2,
        dir1: 0,
        dir2: 1
    },
    {
        dx: 0,
        dy: -2,
        dir1: 1,
        dir2: 1
    },
    {
        dx: 1,
        dy: -2,
        dir1: 1,
        dir2: 2
    },
    {
        dx: 2,
        dy: -2,
        dir1: 2,
        dir2: 2
    },
    {
        dx: -2,
        dy: -1,
        dir1: 0,
        dir2: 3
    },
    {
        dx: 2,
        dy: -1,
        dir1: 2,
        dir2: 4
    },
    {
        dx: -2,
        dy: 0,
        dir1: 3,
        dir2: 3
    },
    {
        dx: 2,
        dy: 0,
        dir1: 4,
        dir2: 4
    },
    {
        dx: -2,
        dy: 1,
        dir1: 3,
        dir2: 5
    },
    {
        dx: 2,
        dy: 1,
        dir1: 4,
        dir2: 7
    },
    {
        dx: -2,
        dy: 2,
        dir1: 5,
        dir2: 5
    },
    {
        dx: -1,
        dy: 2,
        dir1: 6,
        dir2: 5
    },
    {
        dx: 0,
        dy: 2,
        dir1: 6,
        dir2: 6
    },
    {
        dx: 1,
        dy: 2,
        dir1: 6,
        dir2: 7
    },
    {
        dx: 2,
        dy: 2,
        dir1: 7,
        dir2: 7
    }
];
export function deltaToRunDirection(dx, dy) {
    return RUN_DELTA_TO_CODE.get(`${dx | 0},${dy | 0}`) ?? -1;
}
export function runDirectionToDelta(code) {
    const data = RUN_CODE_DATA[code & 0xf];
    return data ? {
        dx: data.dx,
        dy: data.dy
    } : undefined;
}
export function runDirectionToWalkDirections(code) {
    const data = RUN_CODE_DATA[code & 0xf];
    return data ? [
        data.dir1,
        data.dir2
    ] : undefined;
}
