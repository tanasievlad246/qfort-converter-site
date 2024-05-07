import * as XLSX from 'xlsx';

export function checkFileUploadType(
    data: XLSX.WorkSheet,
    type: 'CutOptimisation' | 'AssemblyList'
) {
    if (!data) {
        return false;
    }

    const keys = Object.keys(data);

    let validFileType = false;

    for (const key of keys) {
        const cell = data[key];

        if (cell && typeof cell.v === 'string') {
            if (data[key].v) {
                const value = data[key].v;

                if (type === 'CutOptimisation' && value.includes('Cut Optimisation')) {
                    validFileType = true;
                } else if (type === 'AssemblyList' && value.includes('Assembly List')) {
                    validFileType = true;
                }
            }
        }
    }

    return validFileType;
}
