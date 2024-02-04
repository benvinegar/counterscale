export interface ColumnMappingsType {
    [key: string]: string;
}

/**
 * This maps logical column names to the actual column names in the data store.
 */
export const ColumnMappings: ColumnMappingsType = {
    /**
     * blobs
     */
    host: "blob1",
    userAgent: "blob2",
    path: "blob3",
    country: "blob4",
    referrer: "blob5",
    browserName: "blob6",
    deviceModel: "blob7",
    siteId: "blob8",

    /**
     * doubles
     */

    // this record is a new visitor (every 24h)
    newVisitor: "double1",

    // this record is a new session (resets after 30m inactivity)
    newSession: "double2",
};
