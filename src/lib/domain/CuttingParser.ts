import type { CuttingRow } from '../util/extractCuttingTables';
import { store } from '../store';

interface ICuttingParser {
    parse(): void;
}

export interface ICuttingRow {
    qty: number;
    length: number;
    position: string;
}

export type CuttingRowData = {
    partNumber: string;
    pcs: number;
    lengthPerPcs: number;
    totalLength: number;
    colorInfo: string;
    cuttingRows: ICuttingRow[];
};

export type CuttingData = {
    [key: string]: CuttingRowData;
};

export class CuttingParser implements ICuttingParser {
    private data: CuttingRow;
    private output: CuttingRowData[] = [];

    constructor(data: CuttingRow) {
        this.data = data;
    }

    public getParsedData(): CuttingRowData[] {
        return this.output;
    }

    public parse() {
        if (!this.data) {
            store.update((store) => {
                store.errorMessage = 'Could not parse data';
                store.showSaveButton = false;
                return store;
            });
            return;
        }

        const keys = Object.keys(this.data);

        for (const key of keys) {
            this.splitCuttingDataByCortizo(this.data[key], key);
        }
    }

    private async splitCuttingDataByCortizo(
        data: { [key: string]: string[] },
        key: string
    ) {
        const keys = Object.keys(data);
        let currentPartNumber = '';

        for (let i = 0; i < keys.length; i++) {
            const rowKey = keys[i];
            const row = this.data[key][rowKey];
            const mergedRowContent: string = row.join(' ');

            const isCortizo =
                mergedRowContent.includes('Cortizo') &&
                mergedRowContent !== 'Cortizo';
            const isFrt =
                mergedRowContent.includes('FRT') && mergedRowContent !== 'FRT';

            if (isCortizo || isFrt) {
                // extract part number from mergedRowContent
                const profileInfo =
                    this.extractCuttingProfileInfo(mergedRowContent);
                // extract color from mergedRowContent

                if (!profileInfo) {
                    const errorMessage = `Could not extract profile info for ${mergedRowContent}`;
                    store.update((store) => {
                        store.errorMessage = errorMessage;
                        store.showSaveButton = false;
                        return store;
                    });
                    return;
                }

                currentPartNumber = profileInfo.partNumber;
                const obj: CuttingRowData = {
                    partNumber: profileInfo.partNumber,
                    pcs: profileInfo.pcs,
                    lengthPerPcs: profileInfo.lengthPerPcs,
                    totalLength: profileInfo.pcs * profileInfo.lengthPerPcs,
                    colorInfo:
                        this.getColorCode(profileInfo.color) || 'NO_COLOR',
                    cuttingRows: this.extractCuttingRows(key, keys, i + 1),
                };

                this.output.push(obj);
            }
        }
    }

    /**
     *
     * @param key the data key of the ecurrent cutting in loop
     * @param index the index to start the loop from
     */
    private extractCuttingRows(
        key: string,
        keys: string[],
        index: number
    ): ICuttingRow[] {
        const cuttingRows: ICuttingRow[] = [];

        for (let i = index; i < keys.length; i++) {
            const rowKey = keys[i];
            const row = this.data[key][rowKey];
            const mergedRowContent: string = row.join(' ');

            const cuttingRow = this.extractCuttingDataRows(mergedRowContent);
            const isCortizo =
                mergedRowContent.includes('Cortizo') &&
                mergedRowContent !== 'Cortizo';
            const isFrt =
                mergedRowContent.includes('FRT') && mergedRowContent !== 'FRT';

            if (isCortizo || isFrt) {
                return cuttingRows;
            }

            if (cuttingRow) {
                cuttingRows.push(cuttingRow);
            }
        }

        return cuttingRows;
    }

    private extractCuttingDataRows(input: string): ICuttingRow | null {
        const regex = /^(\d+)\s+(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s+(\d{3})$/;

        // Test the input against the regex and extract matches
        const match = input.match(regex);
        if (match) {
            // If the input matches, parse and return the values
            return {
                qty: parseInt(match[1], 10), // Convert qty to a number
                length: parseFloat(match[2].replace(/,/g, '')), // Convert length to a float, removing commas
                position: match[3], // Keep position as a string
            };
        }

        return null;
    }

    private getColorCode(input: string): string {
        if (input.startsWith('Special 2 Powder Coating')) {
            const match = input.match(/PE(\d+)TD/);
            if (match && match[1]) {
                return `T${match[1]}T${match[1]}`;
            }
        } else if (input.startsWith('Special 3 Powder Coating')) {
            return 'Sublimare';
        }
        return 'NO_COLOR';
    }

    private extractCuttingProfileInfo(input: string): {
        partNumber: string;
        pcs: number;
        lengthPerPcs: number;
        color: string;
    } | null {
        const frtRegex = /^FRT\s+(ZZZCONS\d+)/m;
        const cortizoRegex = /Cortizo (\d+)/;
        const pcsRegex = /(\d+) Pcs/;
        const lengthRegex = /@ ([\d,]+) mm/;
        const colourRegex = /Colour: (.+)/;

        let partNumber = '';

        // Extract Cortizo number
        const cortizoMatch = input.match(cortizoRegex);
        const cortizo = cortizoMatch ? cortizoMatch[1] : null;

        const frtMatch = input.match(frtRegex);
        const frt = frtMatch ? frtMatch[1] : null;

        if (frt) {
            partNumber = frt;
        } else if (cortizo) {
            partNumber = cortizo;
        } else {
            return null;
        }

        // Extract number of pieces
        const pcsMatch = input.match(pcsRegex);
        const pcs = pcsMatch ? parseInt(pcsMatch[1], 10) : null;

        // Extract length per part, removing commas to convert to a valid number format
        const lengthMatch = input.match(lengthRegex);
        const length = lengthMatch
            ? parseFloat(lengthMatch[1].replace(/,/g, ''))
            : null;

        // Extract colour description
        const colourMatch = input.match(colourRegex);
        const colour = colourMatch ? colourMatch[1].trim() : null;

        if (!partNumber || !pcs || !length || !colour) {
            return null;
        }

        return {
            partNumber,
            pcs,
            lengthPerPcs: length,
            color: colour,
        };
    }
}
