import { store } from "$lib/store";

export interface CuttingTable {
    [key: string]: {
        [key: string]: {
            t: string;
            v: string;
            r: string;
        };
    };
}

export interface CuttingRow {
    [key: string]: {
        [key: string]: string[];
    };
}

export enum ExtractionType {
    CUT_OPTIMISATION = 'CutOptimisation',
    ASSEMBLY_LIST = 'AssemblyList',
}

export type PartsQtyData = {
    [key: string]: {
        data: string[];
        quantity: number;
    };
};

export type PartsNumbersData = {
    [key: string]: string[];
};

export function extractPartsQty(data: CuttingTable): PartsQtyData {
    const rows: PartsQtyData = {};
    let foundQuantity = false;
    let quantity = 0;

    for (const pos in data) {
        const inputObject = data[pos];
        for (const key in inputObject) {
            if (inputObject.hasOwnProperty(key)) {
                const obj = inputObject[key];
                if (obj.v.includes('Quantity')) {
                    foundQuantity = true;
                    const qty = extractQuantity(obj.v);
                    if (qty && qty > 0) {
                        quantity = qty;
                        // rows[pos].quantity = qty;
                    }
                } else if (foundQuantity && obj.r === '<t> </t>') {
                    foundQuantity = false;
                } else if (foundQuantity) {
                    const pattern =
                        /^(?:[1-9]\d{0,2}(?:,\d{3})*|\d{1,2})(\.\d+)?$/;
                    const unitPattern = /pc|mm|cm|m/;
                    const multiplicationPattern = /\d{1,3}(,\d{3})*\*\d{1,3}/;

                    const [qty, total, unit] = obj.v.split(' ');

                    if (qty && total && unit) {
                        const qtyPass = pattern.test(qty);
                        let totalPass = pattern.test(
                            total.replace('(', '').replace(')', '')
                        );
                        if (!totalPass) {
                            totalPass = multiplicationPattern.test(
                                total.replace('(', '').replace(')', '')
                            );
                        }
                        const unitPass = unitPattern.test(unit);

                        if (qtyPass && totalPass && unitPass) {
                            const _pos = pos.replace('Position:', '').trim();
                            if (!rows[_pos]) {
                                rows[_pos] = {
                                    data: [],
                                    quantity: 0,
                                };
                                rows[_pos].data = [];
                            }
                            rows[_pos].data.push(obj.v);
                            rows[_pos].quantity = quantity;
                        }
                    }
                }
            }
        }
    }

    return rows;
}

function extractQuantity(input: string): number | null {
    // Regular expression to match the pattern of "Quantity: <number>"
    const regex = /Quantity:\s*([\d,]+(?:\.\d+)?)\s*Pcs/;

    // Attempt to match the regex with the input string
    const match = input.match(regex);

    // Check if a match was found
    if (match && match[1]) {
        // Extract the number, removing any commas
        const quantity = match[1].replace(/,/g, '');
        return parseFloat(quantity);
    } else {
        return null;
    }
}

export const extractPositionAndQty = (
    data: CuttingTable
): {
    [key: string]: number;
} => {
    const rows: {
        [key: string]: number;
    } = {};
    let foundQty = false;
    const keys = Object.keys(data);

    for (const posKey of keys) {
        const inputObject = data[posKey];

        for (const key in inputObject) {
            if (inputObject.hasOwnProperty(key)) {
                const obj = inputObject[key];
                if (obj.v.includes('Quantity')) {
                    foundQty = true;
                    const qty = extractQtyForPosition(obj.v);
                    if (qty && qty > 0) {
                        const outputKey = posKey
                            .replace('Position:', '')
                            .trim();
                        rows[outputKey] = qty;
                    }
                }
            }
        }
    }

    return rows;
};

function extractQtyForPosition(v: string) {
    // Regular expression to match the pattern of "Position: <number>"
    const regex = /Quantity:\s*(\d+)/;

    // Attempt to match the regex with the input string
    const match = v.match(regex);

    // Check if a match was found
    if (match && match[1]) {
        // Extract the number, removing any commas
        const quantity = match[1].replace(/,/g, '');
        return parseInt(quantity, 10);
    } else {
        return null;
    }
}

export const extractPartsNumbers = (data: CuttingTable): PartsNumbersData => {
    const rows: {
        [key: string]: string[];
    } = {};
    let foundNumber = false;

    for (const pos in data) {
        const inputObject = data[pos];
        for (const key in inputObject) {
            if (inputObject.hasOwnProperty(key)) {
                const obj = inputObject[key];
                if (obj.v === 'Number') {
                    foundNumber = true;
                } else if (foundNumber && obj.r === '<t> </t>') {
                    foundNumber = false;
                } else if (foundNumber) {
                    // A regex pattern to test a string that should be a number of any length NOT separated by any character
                    const numberPattern = /^\d{6}$|^[A-Za-z]{7}\d{4}$|[zZ]{1}\d{3}/;

                    if (numberPattern.test(obj.v)) {
                        const _pos = pos.replace('Position:', '').trim();
                        if (!rows[_pos]) {
                            rows[_pos] = [];
                        }
                        rows[_pos].push(obj.v);
                    }
                }
            }
        }
    }
    return rows;
};

export const extractCuttingTables = (
    data: {
        [key: string]: {
            t: string;
            v: string;
            r: string;
        };
    },
    type: ExtractionType
): CuttingTable | CuttingRow => {
    delete data['!margins'];
    delete data['!merges'];
    delete data['!ref'];

    const keys = Object.keys(data);
    const result: CuttingTable | CuttingRow = {};
    let currentCuttingName: string | null = null;

    if (type === 'CutOptimisation') {
        const grpByRows = groupByRows(data);

        result['Cutting 1'] = grpByRows;
    }

    if (type === 'AssemblyList') {
        for (const key of keys) {
            const value = data[key].v;

            const regex = new RegExp(/^Position: \d{3}$/);

            if (regex.test(value)) {
                currentCuttingName = currentCuttingName === null ? value : currentCuttingName;
            }


            if (currentCuttingName) {
                if (!result[currentCuttingName]) {
                    result[currentCuttingName] = {};
                } else {
                    result[currentCuttingName][key] = data[key];
                }
            }
        }

        if (currentCuttingName === null) {
            store.update((store) => {
                store.errorMessage = 'Nu sa gasit pozitie in Assembly List';
                store.showSaveButton = false;
                return store;
            });
        }
    }
    return result;
};

function groupByRows(data: {
    [key: string]: {
        t: string;
        v: string;
        r: string;
    };
}) {
    // This object will store the final groupings
    const grouped: {
        [key: string]: string[];
    } = {};

    // Regular expression to match the column letters and row number
    const regex = /([BDRJ]+)(\d+)/;

    // Iterate over each key in the input object
    for (const key in data) {
        if (data.hasOwnProperty(key)) {
            // Extract the column letters and row number using regex
            const match = key.match(regex);
            if (match) {
                const rowNumber = extractRowNumber(key);

                if (rowNumber) {
                    if (!grouped[rowNumber]) {
                        grouped[rowNumber] = [];
                    }

                    grouped[rowNumber].push(data[key].v);
                }
            }
        }
    }

    return grouped;
}

function extractRowNumber(inputString: string) {
    // This regular expression matches one or more digits at the end of the string
    const regex = /(\d+)$/;

    // Apply the regex to the input string to find matches
    const match = inputString.match(regex);

    // If a match is found, return the first group (the digits)
    if (match) {
        return parseInt(match[1], 10); // Convert the string to an integer
    }

    // If no digits are found, you might want to return something specific
    return null; // Or handle this case as needed
}
