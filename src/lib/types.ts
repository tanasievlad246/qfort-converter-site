import type {
    PartsNumbersData,
    PartsQtyData,
} from './util/extractCuttingTables';

export type ExtractedAssemblyListData = {
    partsQty: PartsQtyData;
    partsNumbers: PartsNumbersData;
    positionQty: { [key: string]: number };
};
