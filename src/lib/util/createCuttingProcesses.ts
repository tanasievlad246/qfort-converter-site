import type { CuttingData, CuttingRowData } from '$lib/domain/CuttingParser';
import { CuttingProcess } from '../domain/CuttingProcess';

export function createCuttingProcesses(
    parsedProfilesCutData: CuttingRowData[]
): CuttingProcess[] {
    const data = Object.values(parsedProfilesCutData);
    const output: CuttingProcess[] = [];

    for (const profileCutData of data) {
        const cuttingProcess = new CuttingProcess({
            color: profileCutData.colorInfo,
            cuttingInstructions: profileCutData.cuttingRows,
            length: profileCutData.lengthPerPcs,
            partNumber: profileCutData.partNumber,
            pcs: profileCutData.pcs,
        });
        cuttingProcess.cut();
        output.push(cuttingProcess);
    }

    return output;
}
