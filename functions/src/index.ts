import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

import * as auth from "./auth";
import * as utils from "./utils";
import * as constants from "./constants";

import * as handleModified from "./handleModified";
import * as handleGetUpdated from "./handleGetUpdated";
import * as handleGetCreatedAfter from "./handleGetCreatedAfter";
import * as handleGetBest from "./handleGetBest";

admin.initializeApp(functions.config().firebase);

export const checkUniqueUserName = functions.https.onRequest((req, res) => utils.defaultRequestHandler(
    constants.HttpMethod.POST,
    req,
    res,
    "checkUniqueUserName",
    (request, response) => {
        const userName = request.body.userName;

        if (!utils.isBlank(userName)) {
            auth.isUserNameUnique(userName)
                .then((isUnique) => {
                    utils.sendDefaultCompressedJson(request, response, constants.SUCCESS_CODE, { unique: isUnique });
                })
                .catch((reason) => utils.defaultFinalCatch(reason, request, response));
        } else {
            utils.sendDefaultCompressedJson(request, response, constants.DEFAULT_ERROR_CODE, { error: "Invalid userName" });
        }
    })
);

export const getTimestamp = functions.https.onRequest((req, res) => utils.defaultRequestHandler(constants.HttpMethod.GET, req, res, "getTimestamp",
    (request, response) => {
        utils.sendDefaultCompressedJson(request, response, constants.SUCCESS_CODE, { nowTimestamp: Date.now() });
    })
);

export const updateModified = functions.https.onRequest((req, res) => utils.defaultRequestHandler(
    constants.HttpMethod.POST,
    req,
    res,
    "updateModified",
    (request, response) => {
        auth.getUserUidFromRequest(request)
            .then((userUid) => handleModified.handle(userUid, request.body))
            .then((responses) => {
                utils.sendDefaultCompressedJson(request, response, constants.SUCCESS_CODE, responses);
            })
            .catch((reason) => utils.defaultFinalCatch(reason, request, response));
    })
);

export const getUpdated = functions.https.onRequest((req, res) => utils.defaultRequestHandler(constants.HttpMethod.POST, req, res, "getUpdated",
    (request, response) => {
        auth.getUserUidFromRequest(request)
            .then((userUid) => handleGetUpdated.handle(userUid, request.body))
            .then((responses) => {
                utils.sendDefaultCompressedJson(request, response, constants.SUCCESS_CODE, responses);
            })
            .catch((reason) => utils.defaultFinalCatch(reason, request, response));
    })
);

export const getCreatedAfter = functions.https.onRequest((req, res) => utils.defaultRequestHandler(
    constants.HttpMethod.POST,
    req,
    res,
    "getCreatedAfter",
    (request, response) => {
        auth.getUserUidFromRequest(request)
            .then((userUid) => handleGetCreatedAfter.handle(userUid, request.body))
            .then((responses) => {
                utils.sendDefaultCompressedJson(request, response, constants.SUCCESS_CODE, responses);
            })
            .catch((reason) => utils.defaultFinalCatch(reason, request, response));
    })
);

export const getBestGames = functions.https.onRequest((req, res) => utils.defaultRequestHandler(constants.HttpMethod.GET, req, res, "getBestGames",
    (request, response) => {
        handleGetBest.handle(request.query)
            .then((responses) => {
                utils.sendDefaultCompressedJson(request, response, constants.SUCCESS_CODE, responses);
            })
            .catch((reason) => utils.defaultFinalCatch(reason, request, response));
    })
);