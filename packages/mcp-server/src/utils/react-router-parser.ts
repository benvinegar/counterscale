// Helper function to parse React Router serialized data format
export function parseReactRouterData(rawData: any[]): Record<string, any> {
    // Parse React Router serialized data format
    // Format: [metadata, "route", metadata, "data", metadata, key1, value1, key2, value2, ...]
    const result: Record<string, any> = {};
    const processedIndices = new Set<number>();

    function resolveValue(value: any): any {
        if (
            Array.isArray(value) &&
            value.every((val) => typeof val === "number")
        ) {
            // Array of indices - resolve each index to its value
            return value.map((index: number) => {
                processedIndices.add(index);
                return resolveValue(rawData[index]);
            });
        } else if (Array.isArray(value)) {
            // Regular array - resolve each element
            return value.map((item: any) => resolveValue(item));
        } else {
            // Primitive value
            return value;
        }
    }

    // First pass: identify and resolve array references
    for (let i = 0; i < rawData.length; i++) {
        const item = rawData[i];
        if (typeof item === "string" && i + 1 < rawData.length) {
            const nextItem = rawData[i + 1];
            if (
                Array.isArray(nextItem) &&
                nextItem.every((val) => typeof val === "number")
            ) {
                // This is a key with array indices as value
                result[item] = resolveValue(nextItem);
                processedIndices.add(i);
                processedIndices.add(i + 1);
            }
        }
    }

    // Second pass: handle remaining key-value pairs that weren't part of array resolutions
    for (let i = 0; i < rawData.length; i++) {
        if (processedIndices.has(i)) continue;

        const item = rawData[i];
        if (
            typeof item === "string" &&
            i + 1 < rawData.length &&
            !processedIndices.has(i + 1)
        ) {
            const nextItem = rawData[i + 1];
            result[item] = resolveValue(nextItem);
            processedIndices.add(i);
            processedIndices.add(i + 1);
        }
    }

    return result;
}
