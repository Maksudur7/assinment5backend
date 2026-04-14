"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.secondsToReadable = secondsToReadable;
function secondsToReadable(totalSeconds) {
    const sec = Number(totalSeconds || 0);
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    return `${hours}h ${minutes}m`;
}
