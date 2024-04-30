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
        if (data[key].v) {
            const value = data[key].v;

            if (type === 'CutOptimisation') {
                if (value.includes('Cut Optimisation')) {
                    validFileType = true;
                }
            }

            if (type === 'AssemblyList') {
                if (value.includes('Assembly List')) {
                    validFileType = true;
                }
            }
        }
    }

    return validFileType;
}
