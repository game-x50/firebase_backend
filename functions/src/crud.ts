import * as admin from "firebase-admin";

import * as constants from "./constants";
import * as dto from "./dto";
import * as mapping from "./mapping";

export function getGameFor(userUid: string, gameUid: string): Promise<dto.Game | null> {
    return admin.firestore()
        .collection(constants.USERS_COLLECTION)
        .doc(userUid)
        .collection(constants.COLLECTION_GAMES)
        .doc(gameUid)
        .get()
        .then((snapshot) => mapping.mapSnapshotToGame(snapshot))
        .catch((reason) => null);
}

export function getGameWhereCreatedIdEqual(userUid: string, createdId: string): Promise<dto.Game | null> {
    return admin.firestore()
        .collection(constants.USERS_COLLECTION)
        .doc(userUid)
        .collection(constants.COLLECTION_GAMES)
        .where(constants.FIELD_CREATED_ID, constants.EQUALS_STRING, createdId)
        .limit(1)
        .get()
        .then((snapshot) => {
            if (snapshot.empty) {
                return null;
            } else {
                return mapping.mapSnapshotToGame(snapshot.docs[0]);
            }
        })
        .catch((reason) => null);
}

export function getGamesForWhereCreatedEqualOrGraterWithoutIdsOrdered(
    userUid: string,
    lastCreatedTimestamp: number,
    excludedRemoteIds: string[],
    limit: number
): Promise<dto.Game[]> {
    return admin.firestore()
        .collection(constants.USERS_COLLECTION)
        .doc(userUid)
        .collection(constants.COLLECTION_GAMES)
        .where(constants.FIELD_CREATED_TIMESTAMP, constants.GRATER_OR_EQUAL_STRING, mapping.mapToTimestamp(lastCreatedTimestamp))
        .orderBy(constants.FIELD_CREATED_TIMESTAMP)
        .limit(limit + excludedRemoteIds.length)
        .get()
        .then((snapshot) => snapshot.docs
            .filter((doc) => !excludedRemoteIds.includes(doc.id))
            .slice(0, limit)
            .map((doc) => mapping.mapSnapshotToGame(doc))
        );
}

export function addNewGameForUser(userUid: string, game: dto.Game): Promise<string> {
    return admin.firestore()
        .collection(constants.USERS_COLLECTION)
        .doc(userUid)
        .collection(constants.COLLECTION_GAMES)
        .add(mapping.mapGameToSnapshot(game))
        .then((ref) => {
            console.log("Added new game with ID: ", ref.id);
            return ref.id;
        })
        .catch((reason) => {
            console.log("Add new game Error : ", reason);
            throw reason;
        });
}

export function updateGameForUser(userUid: string, game: dto.Game): Promise<void> {
    return admin.firestore()
        .collection(constants.USERS_COLLECTION)
        .doc(userUid)
        .collection(constants.COLLECTION_GAMES)
        .doc(game.uid)
        .set(mapping.mapGameToSnapshot(game))
        .then((writeResult) => {
            console.log("Updated game with ID: ", game.uid);
        })
        .catch((reason) => {
            console.log("Update game Error: ", reason);
        });
}

export function deleteGameForUser(userUid: string, gameUid: string): Promise<void> {
    return admin.firestore()
        .collection(constants.USERS_COLLECTION)
        .doc(userUid)
        .collection(constants.COLLECTION_GAMES)
        .doc(gameUid)
        .delete()
        .then((writeResult) => {
            console.log("Deleted game with ID: ", gameUid);
        })
        .catch((reason) => {
            console.log("Delete game Error: ", reason);
        });
}

export function getBestGamesByTotalSum(limit: number, countRowsAndColumns: number): Promise<dto.GamePreviewWithUserId[]> {
    return admin.firestore()
        .collectionGroup(constants.COLLECTION_GAMES)
        .where(constants.FIELD_COUNT_ROWS_AND_COLUMNS, constants.EQUALS_STRING, countRowsAndColumns)
        .orderBy(constants.FIELD_TOTAL_SUM, "desc")
        .limit(limit)
        .get()
        .then((snapshot) => snapshot.docs.map((doc) => mapping.mapSnapshotToGamePreviewWithUserId(doc)))
        .catch((reason) => {
            console.log("Get best games by total sum error: ", reason);
            throw reason;
        });
}