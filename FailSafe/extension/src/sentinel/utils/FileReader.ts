/**
 * FileReader - Safe file reading utility for Sentinel
 *
 * Reads file content with size limits and atomic file descriptor operations
 * to prevent TOCTOU race conditions.
 */

import * as fs from 'fs';

/** Maximum file size to read (5MB) */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Read file content safely using atomic fd-based operations.
 * Returns the file content as a string, or undefined if the file
 * cannot be read or exceeds the size limit.
 *
 * @param filePath - Absolute path to the file
 * @param maxSize - Maximum allowed file size in bytes (defaults to MAX_FILE_SIZE)
 */
export function readFileContentSafe(
    filePath: string,
    maxSize: number = MAX_FILE_SIZE
): { content: string | undefined; skippedReason?: string } {
    try {
        // Open file descriptor first to lock the file for this operation
        const fd = fs.openSync(filePath, 'r');
        try {
            const stats = fs.fstatSync(fd);
            if (stats.size > maxSize) {
                return { content: undefined, skippedReason: 'file_too_large' };
            }
            // Read from the same file descriptor to ensure consistency
            const buffer = Buffer.alloc(stats.size);
            fs.readSync(fd, buffer, 0, stats.size, 0);
            return { content: buffer.toString('utf-8') };
        } finally {
            fs.closeSync(fd);
        }
    } catch {
        // File doesn't exist or access error
        return { content: undefined, skippedReason: 'read_error' };
    }
}
