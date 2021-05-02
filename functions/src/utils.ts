import * as functions from "firebase-functions";
import * as zlib from "zlib";

import * as constants from "./constants";
import * as dto from "./dto";

export function defaultRequestHandler(
    method: constants.HttpMethod,
    request: functions.https.Request,
    response: functions.Response,
    message: string,
    handler: (req: functions.https.Request, resp: functions.Response) => void
): void {
    if (request.method === method) {
        try {
            handler(request, response);
        } catch (error) {
            console.error("Error:  ${message}", error);
            response.status(constants.DEFAULT_ERROR_CODE).json({ error: "Unexpected error" });
        }
    } else {
        response.sendStatus(constants.INVALID_METHOD_CODE);
    }
}

export function defaultFinalCatch(reason: any, request: functions.https.Request, response: functions.Response): void {
    console.log(reason);
    if (reason instanceof dto.ResponseError) {
        sendDefaultCompressedJson(request, response, reason.code, reason.message);
    } else {
        sendDefaultCompressedJson(request, response, constants.DEFAULT_ERROR_CODE, reason);
    }
}

export function sendDefaultCompressedJson(request: functions.https.Request, response: functions.Response, code: number, json: any): void {
    if (request.header("Accept-Encoding") === "gzip") {

        response.setHeader("Content-Encoding", "gzip");
        response.setHeader("Content-Type", "application/json; charset=utf-8");

        zlib.gzip(JSON.stringify(json), (error: Error | null, result: Buffer) => {
            if (error) {
                throw error;
            } else {
                response.status(code).send(result);
            }
        });

    } else {
        response.status(code).json(json);
    }
}

export function isBlank(str: string): boolean {
    return (!str || /^\s*$/.test(str));
}

export function generateUUID(): string {
    let dt = new Date().getTime();
    const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
        const r = (dt + Math.random() * 16) % 16 | 0;
        dt = Math.floor(dt / 16);
        return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
    });
    return uuid;
}