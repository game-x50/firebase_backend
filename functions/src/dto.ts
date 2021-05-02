const EMPTY_NUMBER = -1;

const AVAILABLE_COUNT_ROWS_AND_COLUMNS: number[] = [9, 16, 25];

export function isCountRowsAndColumnsValid(count: number): boolean {
    return AVAILABLE_COUNT_ROWS_AND_COLUMNS.includes(count);
}

export class ResponseError {
    constructor(public code: number, public message: string) {
    }
}

export enum Action {
    CREATE = "CREATE", UPDATE = "UPDATE", DELETE = "DELETE"
}

export class User {
    constructor(public uid: string, public nickname: string) {
    }
}

export class GameState {
    constructor(public matrix: number[], public newItems: number[]) {
    }

    public isEqual(otherGameState: GameState): boolean {
        return (this.matrix.length === otherGameState.matrix.length
            && this.newItems.length === otherGameState.newItems.length
            && Array.prototype.every((matrixValue, index) => matrixValue === otherGameState.matrix[index], this.matrix)
            && Array.prototype.every((newItemsValue, index) => newItemsValue === otherGameState.newItems[index], this.newItems)
        );
    }
}

export class BaseGameInfo {

    constructor(
        public totalPlayedSeconds: number,
        public countRowsAndColumns: number,
        public current: GameState,
        public stack: GameState[]
    ) {

        if (!isCountRowsAndColumnsValid(countRowsAndColumns)) {
            throw Error("current countRowsAndColumns = ${countRowsAndColumns} is invalid");
        }

        const totalCountElemetsInMatrix = (countRowsAndColumns * countRowsAndColumns);

        if (current.matrix.length !== totalCountElemetsInMatrix) {
            throw Error("current.matrix.length = ${current.matrix.length}, but countRowsAndColumns = ${countRowsAndColumns}");
        }

        stack.forEach((stackElement) => {
            const stackElementLength = stackElement.matrix.length;
            if (stackElementLength !== totalCountElemetsInMatrix) {
                throw Error("stackElement.matrix.length == ${stackElementLength}, but countRowsAndColumns = ${countRowsAndColumns}");
            }
        });
    }

    public isEqualByBaseGameInfo(otherBaseGameInfo: BaseGameInfo): boolean {
        return (this.totalPlayedSeconds === otherBaseGameInfo.totalPlayedSeconds
            && this.countRowsAndColumns === otherBaseGameInfo.countRowsAndColumns
            && this.current.isEqual(otherBaseGameInfo.current)
            && Array.prototype.every((stackElementValue, index) => stackElementValue.isEqual(otherBaseGameInfo.stack[index]), this.stack));
    }

    public generateGameHash(): string {
        const spliterator = "_";
        return (this.current.matrix.reduce((prev, curr) => prev + curr, 0)
            + spliterator + this.totalPlayedSeconds
            + spliterator + Math.sqrt(this.current.matrix.length)
            + spliterator + this.current.matrix.filter((value) => value !== EMPTY_NUMBER).length
            + spliterator + this.current.newItems.reduce((prev, curr) => prev + curr, 0)
            + spliterator + this.stack.length
        );
    }
}

export class Game extends BaseGameInfo {

    public static fromBaseGameInfo(
        baseGameInfo: BaseGameInfo,
        uid: string,
        lastActionId: string,
        createdTimestamp: number,
        lastSyncedTimestamp: number,
        lastLocalModifiedTimestamp: number,
        createdId: string | null
    ): Game {
        return new Game(
            baseGameInfo.totalPlayedSeconds,
            baseGameInfo.countRowsAndColumns,
            baseGameInfo.current,
            baseGameInfo.stack,
            uid,
            lastActionId,
            createdTimestamp,
            lastSyncedTimestamp,
            lastLocalModifiedTimestamp,
            baseGameInfo.current.matrix.reduce((prev, curr) => prev + curr, 0),
            createdId
        );
    }

    constructor(
        totalPlayedSeconds: number,
        countRowsAndColumns: number,
        current: GameState,
        stack: GameState[],
        public uid: string,
        public lastActionId: string,
        public createdTimestamp: number,
        public lastSyncedTimestamp: number,
        public lastLocalModifiedTimestamp: number,
        public totalSum: number,
        public createdId: string | null
    ) {
        super(totalPlayedSeconds, countRowsAndColumns, current, stack);
    }

    public createCopyWithNowLastSyncedTimestamp(): Game {
        return new Game(
            this.totalPlayedSeconds,
            this.countRowsAndColumns,
            this.current,
            this.stack,
            this.uid,
            this.lastActionId,
            this.createdTimestamp,
            Date.now(),
            this.lastLocalModifiedTimestamp,
            this.totalSum,
            this.createdId
        );
    }
}

export class GamePreview {
    constructor(
        public id: string,
        public totalPlayedSeconds: number,
        public countRowsAndColumns: number,
        public lastLocalModifiedTimestamp: number,
        public totalSum: number
    ) {
    }
}

export class GamePreviewWithUserId {
    constructor(
        public gamePreview: GamePreview,
        public userId: string
    ) {
    }
}

export class GamePreviewWithUserDetails {

    constructor(
        public gamePreview: GamePreview,
        public userNickname: string
    ) {
    }
}