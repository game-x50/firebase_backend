import * as admin from "firebase-admin";

import * as constants from "./constants";
import * as dto from "./dto";

export function mapSnapshotToUser(snapshot: FirebaseFirestore.DocumentSnapshot): dto.User {
    return new dto.User(
        snapshot.id,
        snapshot.get(constants.FIELD_NICKNAME)
    );
}

export function mapAnyToBaseGameInfo(anyValue: any): dto.BaseGameInfo {
    return new dto.BaseGameInfo(
        anyValue.totalPlayedSeconds,
        anyValue.countRowsAndColumns,
        mapAnyToGameState(anyValue.current),
        anyValue.stack.map((stateAnyValue: any) => mapAnyToGameState(stateAnyValue))
    );
}

export function mapSnapshotToGame(snapshot: FirebaseFirestore.DocumentSnapshot): dto.Game {
    const current = mapUnspecifiedMapToGameState(snapshot.get(constants.FIELD_CURRENT));

    const stackSnapshot = snapshot.get(constants.FIELD_STACK);

    const stack: dto.GameState[] = Object.keys(stackSnapshot)
        .sort()
        .map((key) => {
            const unspecifiedValueMap = stackSnapshot[key];

            return mapUnspecifiedMapToGameState(unspecifiedValueMap);
        });

    return new dto.Game(
        snapshot.get(constants.FIELD_TOTAL_PLAYED_SECONDS),
        snapshot.get(constants.FIELD_COUNT_ROWS_AND_COLUMNS),
        current,
        stack,
        snapshot.id,
        snapshot.get(constants.FIELD_LAST_ACTION_ID),
        mapFromTimestamp(snapshot.get(constants.FIELD_CREATED_TIMESTAMP)),
        mapFromTimestamp(snapshot.get(constants.FIELD_LAST_SYNCED_TIMESTAMP)),
        mapFromTimestamp(snapshot.get(constants.FIELD_LAST_LOCAL_MODIFIED_TIMESTAMP)),
        snapshot.get(constants.FIELD_TOTAL_SUM),
        snapshot.get(constants.FIELD_CREATED_ID),
    );
}

export function mapSnapshotToGamePreview(snapshot: FirebaseFirestore.DocumentSnapshot): dto.GamePreview {
    return new dto.GamePreview(
        snapshot.id,
        snapshot.get(constants.FIELD_TOTAL_PLAYED_SECONDS),
        snapshot.get(constants.FIELD_COUNT_ROWS_AND_COLUMNS),
        mapFromTimestamp(snapshot.get(constants.FIELD_LAST_LOCAL_MODIFIED_TIMESTAMP)),
        snapshot.get(constants.FIELD_TOTAL_SUM)
    );
}

export function mapSnapshotToGamePreviewWithUserId(snapshot: FirebaseFirestore.DocumentSnapshot): dto.GamePreviewWithUserId {
    return new dto.GamePreviewWithUserId(
        mapSnapshotToGamePreview(snapshot),
        (snapshot.ref.parent.parent as FirebaseFirestore.DocumentReference).id
    );
}

export function mapGameToSnapshot(game: dto.Game): any {
    return {
        totalPlayedSeconds: game.totalPlayedSeconds,
        countRowsAndColumns: game.countRowsAndColumns,
        current: mapGameStateToSnapshot(game.current),
        stack: game.stack.reduce((result, item, index) => ({
            ...result,
            [index]: mapGameStateToSnapshot(item),
        }), {}),
        lastActionId: game.lastActionId,
        createdTimestamp: mapToTimestamp(game.createdTimestamp),
        lastSyncedTimestamp: mapToTimestamp(game.lastSyncedTimestamp),
        lastLocalModifiedTimestamp: mapToTimestamp(game.lastLocalModifiedTimestamp),
        totalSum: game.totalSum,
        createdId: game.createdId
    };
}

export function mapFromTimestamp(timestamp: admin.firestore.Timestamp): number {
    return timestamp.toMillis();
}

export function mapToTimestamp(timestamp: number): admin.firestore.Timestamp {
    return admin.firestore.Timestamp.fromMillis(timestamp);
}

function mapAnyToGameState(anyValue: any): dto.GameState {
    return new dto.GameState(
        anyValue.matrix,
        anyValue.newItems
    );
}

function mapUnspecifiedMapToGameState(unspecifiedValueMap: any): dto.GameState {
    return new dto.GameState(unspecifiedValueMap.matrix, unspecifiedValueMap.newItems);
}

function mapGameStateToSnapshot(gameState: dto.GameState): any {
    return {
        matrix: gameState.matrix,
        newItems: gameState.newItems
    };
}