export interface ColumnMappingsType {
    [key: string]: string
}

/**
 * This maps logical column names to the actual column names in the data store.
 */
export const ColumnMappings: ColumnMappingsType = {
    host: "blob1",
    userAgent: "blob2",
    path: "blob3",
    country: "blob4",
    referrer: "blob5",
    browserName: "blob6",
    deviceModel: "blob7",
    siteId: "blob8",

    newVisitor: "double1",
    newSession: "double2",
};