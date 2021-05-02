import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

import * as constants from "./constants";
import * as dto from "./dto";
import * as mapping from "./mapping";

export function getUserUidFromRequest(request: functions.https.Request): Promise<string> {
    const headerAuthorizationToken = request.headers.authorization;

    if (headerAuthorizationToken !== undefined) {
        return admin.auth()
            .verifyIdToken(headerAuthorizationToken)
            .then((decodedToken) => decodedToken.uid)
            .catch((reason) => {
                console.log("getUserUidFromRequest: Error: " + reason);
                throw new dto.ResponseError(constants.UNAUTHORIZED_CODE, "Invalid token");
            });
    } else {
        console.log("getUserUidFromRequest: Error: empty string");
        return Promise.reject(new dto.ResponseError(constants.UNAUTHORIZED_CODE, "Invalid token"));
    }
}

export function isUserNameUnique(nameToCheck: string): Promise<boolean> {
    return admin.firestore()
        .collection(constants.USERS_COLLECTION)
        .where(constants.FIELD_NICKNAME, constants.EQUALS_STRING, nameToCheck)
        .limit(1)
        .get()
        .then((snapshot) => snapshot.empty);
}

export function getAllUsersByIds(userIds: string[]): Promise<dto.User[]> {
    const refs = userIds.map((singleUserId) => admin.firestore().collection(constants.USERS_COLLECTION).doc(singleUserId));
    return admin.firestore()
        .getAll(...refs)
        .then((allUsersSnaphots) => allUsersSnaphots.map((snapshot) => mapping.mapSnapshotToUser(snapshot)));
}